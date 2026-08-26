/**
 * KIND GOVERNANCE — the vocabulary the channel layer will match on.
 *
 * `needs` and `produces` name KINDS: 'array', 'finding', 'analysis.summary'.
 * Two teams declaring 'array' to mean different things is the stringly-typed
 * failure rebuilt one level above ids — and it is not hypothetical: the
 * reference application contains two live worlds whose 'array' are entirely
 * different objects. Retrofitting a namespace onto strings in the wild is
 * the migration that never completes, so governance exists BEFORE matching
 * does.
 *
 * The split is the family's standing pattern — the library owns the LAW,
 * the adapter owns the WORLD:
 *
 *   law (here, non-negotiable)      world (the mounted catalog's)
 *   ────────────────────────────    ─────────────────────────────
 *   kinds are opaque strings        which kinds exist
 *   matching is exact identity      what each one means
 *   unknown kind = refusal          its schema, docs, revision
 *   one catalog per runtime
 *
 * The interface is deliberately TWO METHODS. Every method on a governance
 * interface is a permanent commitment, and the obvious tempting third —
 * `assignable(from, to)`, subtyping — is refused until a real consumer
 * produces the failure that justifies it. Enumeration lives on the concrete
 * default catalog rather than the interface, so tooling can depend on the
 * default while matching depends only on the contract — and a future remote
 * adapter is never forced to promise a listing it cannot give synchronously.
 *
 * A MOUNTED CATALOG IS IMMUTABLE. Connect-time checks are only sound if a
 * kind cannot vanish after the check passed, and immutability is also what
 * makes answers memoizable — the runtime consults a catalog once per kind,
 * EVER, so an adapter's cost cannot reach the offer-serving path. Honesty
 * and performance are the same argument here.
 */

/** What a catalog knows about one kind. Frozen; returned by identity. */
export interface KindRecord {
  readonly kind: string;
  /**
   * The vocabulary's own version of this MEANING. Kind names are forever;
   * their shapes evolve — and mutable meaning under a stable name is the
   * stale-picture disease at the vocabulary level. The revision rides the
   * catalog fingerprint, so two sides holding different meanings of the
   * same name refuse loudly instead of matching silently.
   */
  readonly revision?: number;
  /** Optional payload shape, in whatever schema convention the app uses. */
  readonly schema?: unknown;
  readonly docs?: string;
}

/**
 * The governance contract a runtime mounts. Query-shaped, deliberately: the
 * runtime asks questions, the catalog never reaches into matching — one
 * direction of authority, the same reason a host adapter resolves targets
 * but never listens.
 *
 * INVARIANT: `describe(k)` returns a record exactly when `has(k)` is true.
 * A catalog that answers has=true, describe=undefined has drifted, and the
 * default enforces the invariant by construction.
 */
export interface KindCatalog {
  has(kind: string): boolean;
  describe(kind: string): KindRecord | undefined;
  /**
   * A stable content hash of the vocabulary — sorted names with revisions.
   * Optional DATA rather than a third method: a transport carries it so a
   * match between sides governed by DIFFERENT catalogs can refuse naming
   * both fingerprints, converting drift into a loud refusal instead of a
   * silent mis-match. Enforcement at the seam arrives with the channel
   * layer; the fingerprint exists now so wires can start carrying it.
   */
  readonly fingerprint?: string;
}

/** One contribution's declaration of one kind. */
export interface KindDeclaration {
  readonly revision?: number;
  readonly schema?: unknown;
  readonly docs?: string;
}

/** The concrete default — enumerable, frozen, fingerprinted. */
export interface DeclaredKindCatalog extends KindCatalog {
  readonly fingerprint: string;
  /** Every kind, sorted — for tooling, docs, and the degradation record.
   *  On the CONCRETE catalog only, never the interface: a remote adapter
   *  must not be forced to promise a listing it cannot give synchronously. */
  list(): readonly KindRecord[];
}

/** FNV-1a over the sorted vocabulary — stable across insertion order. */
function fingerprintOf(records: ReadonlyMap<string, KindRecord>): string {
  const text = [...records.keys()]
    .sort()
    .map((kind) => `${kind}@${String(records.get(kind)!.revision ?? 0)}`)
    .join(';');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Build the default catalog from one or more CONTRIBUTIONS — separate
 * objects so teams own their files and the runtime owns the merge. One
 * kind declared twice is a REFUSAL naming both contributions, never a
 * silent last-writer-wins: one catalog, one meaning per name, and the
 * second declaration is exactly the collision governance exists to catch.
 */
export function declareKinds(
  ...contributions: ReadonlyArray<Readonly<Record<string, KindDeclaration>>>
): DeclaredKindCatalog {
  if (contributions.length === 0) {
    throw new TypeError(
      'hcifootprint: declareKinds() needs at least one contribution — an empty catalog governs nothing, which is a choice to make loudly by not mounting one.',
    );
  }
  const records = new Map<string, KindRecord>();
  const ownerOf = new Map<string, number>();
  contributions.forEach((contribution, index) => {
    if (
      contribution === null ||
      typeof contribution !== 'object' ||
      Array.isArray(contribution)
    ) {
      throw new TypeError(
        `hcifootprint: declareKinds() contribution ${String(index)} must be a record of kind declarations.`,
      );
    }
    for (const [kind, declaration] of Object.entries(contribution)) {
      if (kind.trim().length === 0) {
        throw new TypeError(
          `hcifootprint: declareKinds() contribution ${String(index)} declares an empty kind name.`,
        );
      }
      const previous = ownerOf.get(kind);
      if (previous !== undefined) {
        throw new Error(
          `hcifootprint: kind '${kind}' is declared twice — by contribution ${String(previous)} and again by contribution ${String(index)}. One catalog holds one meaning per name; if these are genuinely different things, they need different names, and if they are the same thing, one team owns the declaration.`,
        );
      }
      ownerOf.set(kind, index);
      records.set(
        kind,
        Object.freeze({
          kind,
          ...(declaration.revision !== undefined
            ? { revision: declaration.revision }
            : {}),
          ...(declaration.schema !== undefined
            ? { schema: declaration.schema }
            : {}),
          ...(declaration.docs !== undefined ? { docs: declaration.docs } : {}),
        }),
      );
    }
  });
  const fingerprint = fingerprintOf(records);
  const listed = Object.freeze(
    [...records.keys()].sort().map((kind) => records.get(kind)!),
  );
  return Object.freeze({
    fingerprint,
    has: (kind: string) => records.has(kind),
    describe: (kind: string) => records.get(kind),
    list: () => listed,
  });
}

/**
 * What a runtime can say about its own kind governance — the visible row
 * that keeps "no catalog mounted" from reading like "every kind checked".
 * An unarmed check indistinguishable from a passing one is the disease this
 * family keeps curing; this report is the cure applied to itself.
 */
export interface KindGovernanceReport {
  readonly mounted: boolean;
  readonly fingerprint?: string;
  /** Every kind the connected definitions declared, sorted. */
  readonly kindsSeen: readonly string[];
  /** The kinds seen while NO catalog was mounted — declared, and governed by
   *  nobody. Empty when a catalog is mounted, because an unknown kind is
   *  then a connect-time refusal rather than a quiet passenger. */
  readonly ungoverned: readonly string[];
}
