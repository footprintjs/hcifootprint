/**
 * kind-governor — one composed unit owning kind governance state.
 *
 * The runtime COMPOSES this as a field (the ecosystem rule: compose a store
 * as a field, no base classes). It owns the memo (a mounted catalog is
 * immutable, so an answer is a fact forever — consulted once per kind,
 * EVER), the seen set, and the ungoverned remainder that keeps "no catalog
 * mounted" from reading like "every kind checked".
 * @internal
 */
import type { KindCatalog, KindGovernanceReport } from './kinds.js';

export class KindGovernor {
  readonly #catalog: KindCatalog | undefined;
  readonly #memo = new Map<string, boolean>();
  readonly #seen = new Set<string>();
  readonly #ungoverned = new Set<string>();

  constructor(catalog: KindCatalog | undefined) {
    this.#catalog = catalog;
  }

  /** One kind through governance: seen always; refused when a mounted
   *  catalog does not hold it; recorded ungoverned when nothing is mounted. */
  govern(kind: string, owner: string): void {
    this.#seen.add(kind);
    if (this.#catalog === undefined) {
      this.#ungoverned.add(kind);
      return;
    }
    let known = this.#memo.get(kind);
    if (known === undefined) {
      known = this.#catalog.has(kind) === true;
      this.#memo.set(kind, known);
    }
    if (!known) {
      throw new Error(
        `hcifootprint: ${owner} kind '${kind}', which the mounted catalog does not govern. Declare it in the catalog, or use a kind the catalog holds — matching is exact identity, and an unknown kind would make every future match a guess.`,
      );
    }
  }

  report(): KindGovernanceReport {
    return Object.freeze({
      mounted: this.#catalog !== undefined,
      ...(this.#catalog?.fingerprint !== undefined
        ? { fingerprint: this.#catalog.fingerprint }
        : {}),
      kindsSeen: Object.freeze([...this.#seen].sort()),
      ungoverned: Object.freeze([...this.#ungoverned].sort()),
    });
  }
}
