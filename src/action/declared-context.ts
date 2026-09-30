/**
 * declared-context — "what the person set with a control, still standing",
 * folded by the library instead of by every app.
 *
 * A context is DECLARED (one live context per id, the `declareSurface`
 * precedent): which actions feed it (`from` — each must prove its effect by a
 * governed value, `settle.evidence`, all of ONE kind), how a value names its
 * slot (`key`) and itself (`identity`), the fold (`latest-per-key`), and
 * which action releases an entry (`releasedBy`). The fold runs ONCE over the
 * retained history at declaration, then on every verified settlement as it
 * lands — collect during the run, never post-process — so eviction of old
 * transitions can never change an entry.
 *
 * The fold is a pure function of the verified transitions it has seen:
 *   entry(key) = the NEWEST-INVOKED verified transition for that key,
 *                unless a verified release naming its identity was invoked
 *                after it — then the key is empty (never an older entry).
 * "Latest" is invocation order (the person's order of intent), never
 * settlement order, so an older refetch settling late cannot displace a
 * newer one.
 * @internal
 */
import type { Attribution } from '../atom/types.js';
import type {
  ActionBindingRef,
  ActionDefinitionRef,
  ActionTransitionRef,
  DefinedAction,
} from './types.js';
import type { StoredTransition } from './stored.js';
import type { TransitionLedger } from './transition-ledger.js';
import { actionDefinitionOf } from './definition.js';
import { hasEvidenceBearingSettlement } from './authoring.js';

/** The one fold shipped. `fold` is a string so others arrive additively. */
export type DeclaredContextFold = 'latest-per-key';

/** What one declared context folds, and how. */
export interface DeclaredContextDeclaration {
  /** The context's own id — refused while a live context holds it. */
  readonly id: string;
  /** The actions whose VERIFIED evidence enters the context. Each must
   *  declare `settle.evidence`, all of the same kind. */
  readonly from: readonly DefinedAction[];
  /** Which slot a value fills — one entry per key. App code, isolated. */
  readonly key: (value: unknown) => string;
  /** Which value this is — what a release names. App code, isolated. */
  readonly identity: (value: unknown) => string;
  readonly fold: DeclaredContextFold;
  /** An action whose verified evidence names an identity to release. */
  readonly releasedBy?: {
    readonly action: DefinedAction;
    readonly identity: (evidence: unknown) => string;
  };
}

/** One standing entry — data, frozen, structured-clone-safe, shaped to go
 *  straight into the next turn. The library never writes the prose. */
export interface DeclaredContextEntry {
  readonly context: string;
  /** The governed kind every value of this context is. */
  readonly kind: string;
  readonly key: string;
  readonly identity: string;
  /** The verified evidence, exactly as recorded. */
  readonly value: unknown;
  /** Identity, not a promise of retention: `transitionFor` may later answer
   *  undefined once history releases the row. */
  readonly transition: ActionTransitionRef;
  /** The control that set it. */
  readonly binding: ActionBindingRef;
  /** Who set it — the transition's attribution. */
  readonly attribution: Attribution;
}

/** A verified transition the fold could not read — counted, never dropped
 *  silently (the `channelGaps()` law). The settlement itself is untouched. */
export interface DeclaredContextSkip {
  readonly transition: ActionTransitionRef;
  readonly reader: 'key' | 'identity' | 'releasedBy.identity';
  readonly reason: string;
}

export interface DeclaredContextHandle {
  /** The declaration as captured (frozen; readers keep their identity). */
  readonly declaration: DeclaredContextDeclaration;
  /** Every standing entry, oldest invocation first. Empty once retired. */
  entries(): readonly DeclaredContextEntry[];
  /** Every verified transition a reader threw on or answered a non-string. */
  skipped(): readonly DeclaredContextSkip[];
  /** Idempotent and final: stops the fold and frees the id. Returns whether
   *  this call was the one that retired it. */
  retire(): boolean;
}

interface Candidate {
  readonly sequence: number;
  readonly entry: DeclaredContextEntry;
}

/** The composed unit the runtime owns as a field: live contexts by id. */
export class DeclaredContexts {
  readonly #ledger: TransitionLedger;
  readonly #canonical: (definitionId: string) => DefinedAction | undefined;
  readonly #live = new Set<string>();

  constructor(
    ledger: TransitionLedger,
    canonical: (definitionId: string) => DefinedAction | undefined,
  ) {
    this.#ledger = ledger;
    this.#canonical = canonical;
  }

  declare(declaration: DeclaredContextDeclaration): DeclaredContextHandle {
    const plan = this.#plan(declaration);
    if (this.#live.has(plan.declaration.id)) {
      throw new Error(
        `hcifootprint: context '${plan.declaration.id}' is already declared and live — one id, one context. Retire the live one first, or name this one for what it actually holds.`,
      );
    }
    this.#live.add(plan.declaration.id);
    return this.#open(plan);
  }

  #plan(raw: DeclaredContextDeclaration): Plan {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError(
        'hcifootprint: declareContext() needs a declaration record.',
      );
    }
    const { id, from, key, identity, fold, releasedBy } = raw;
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('hcifootprint: declareContext() needs a non-empty id.');
    }
    const owner = `context '${id}'`;
    if (fold !== 'latest-per-key') {
      throw new TypeError(
        `hcifootprint: ${owner} declares fold '${String(fold)}'; the one fold is 'latest-per-key' (the newest invoked value per key).`,
      );
    }
    if (typeof key !== 'function' || typeof identity !== 'function') {
      throw new TypeError(
        `hcifootprint: ${owner} needs key and identity readers — functions from a value to a string.`,
      );
    }
    if (!Array.isArray(from) || from.length === 0) {
      throw new TypeError(
        `hcifootprint: ${owner} needs a non-empty from — the actions whose verified evidence it folds.`,
      );
    }
    const fromIds = new Set<string>();
    // The fold admits a row by the IDENTITY of the declared definition ref
    // (`binding.definition` is `record.ref`), never by its id string: a
    // declaration may precede the connect, and a later callable reusing the
    // id must not feed a context it was never declared into.
    const fromRefs = new Set<ActionDefinitionRef>();
    let kind: string | undefined;
    for (const definition of from) {
      const record = this.#definitionOf(definition, owner, 'from');
      const evidenceKind = record.contract.settle?.evidence?.kind;
      if (evidenceKind === undefined) {
        throw new Error(
          `hcifootprint: ${owner}: a context folds governed evidence; declare settle.evidence on action '${record.ref.definitionId}' so its verified value has a kind the key and identity readers can be written against.`,
        );
      }
      if (kind !== undefined && evidenceKind !== kind) {
        throw new Error(
          `hcifootprint: ${owner} folds one kind, but action '${record.ref.definitionId}' proves its effect with '${evidenceKind}' while an earlier from action proves it with '${kind}'. Declare one context per kind.`,
        );
      }
      if (fromIds.has(record.ref.definitionId)) {
        throw new Error(
          `hcifootprint: ${owner} lists action '${record.ref.definitionId}' twice in from.`,
        );
      }
      kind = evidenceKind;
      fromIds.add(record.ref.definitionId);
      fromRefs.add(record.ref);
    }
    let release: Plan['release'];
    if (releasedBy !== undefined) {
      if (
        releasedBy === null ||
        typeof releasedBy !== 'object' ||
        typeof releasedBy.identity !== 'function'
      ) {
        throw new TypeError(
          `hcifootprint: ${owner} releasedBy needs { action, identity } — identity reads the released value's identity from the release's evidence.`,
        );
      }
      const record = this.#definitionOf(releasedBy.action, owner, 'releasedBy.action');
      if (fromIds.has(record.ref.definitionId)) {
        throw new Error(
          `hcifootprint: ${owner}: action '${record.ref.definitionId}' cannot both feed and release the context.`,
        );
      }
      if (!hasEvidenceBearingSettlement(record.contract.settle)) {
        throw new Error(
          `hcifootprint: ${owner}: release action '${record.ref.definitionId}' declares no evidence-bearing settle contract, so it can never verify — and only a verified release releases. Declare writes, goTo, verify, settle.evidence, or an observable evidence channel on it.`,
        );
      }
      release = {
        ref: record.ref,
        identity: releasedBy.identity,
      };
    }
    const declaration: DeclaredContextDeclaration = Object.freeze({
      id,
      from: Object.freeze([...from]),
      key,
      identity,
      fold,
      ...(releasedBy !== undefined
        ? {
            releasedBy: Object.freeze({
              action: releasedBy.action,
              identity: releasedBy.identity,
            }),
          }
        : {}),
    });
    return { declaration, kind: kind!, fromRefs, release };
  }

  #definitionOf(value: unknown, owner: string, field: string) {
    const record = actionDefinitionOf(value);
    if (record === undefined) {
      throw new TypeError(
        `hcifootprint: ${owner} ${field} must name a callable created by defineAction().`,
      );
    }
    const canonical = this.#canonical(record.ref.definitionId);
    if (canonical !== undefined && canonical !== value) {
      throw new TypeError(
        `hcifootprint: ${owner} ${field}: definition '${record.ref.definitionId}' belongs to another callable in this runtime. Pass the exact defineAction() result that was connected.`,
      );
    }
    return record;
  }

  #open(plan: Plan): DeclaredContextHandle {
    const { declaration, kind, fromRefs, release } = plan;
    const newest = new Map<string, Candidate>();
    const releasedAt = new Map<string, number>();
    const skipped: DeclaredContextSkip[] = [];
    let retired = false;

    const read = (
      reader: (value: unknown) => string,
      value: unknown,
      stored: StoredTransition,
      name: DeclaredContextSkip['reader'],
    ): string | undefined => {
      let answer: unknown;
      try {
        answer = reader(value);
      } catch (error) {
        skipped.push(
          Object.freeze({
            transition: stored.ref,
            reader: name,
            reason: `${name} reader threw: ${String(error)}`,
          }),
        );
        return undefined;
      }
      if (typeof answer !== 'string') {
        skipped.push(
          Object.freeze({
            transition: stored.ref,
            reader: name,
            reason: `${name} reader answered ${typeof answer}, not a string`,
          }),
        );
        return undefined;
      }
      return answer;
    };

    const fold = (stored: StoredTransition): void => {
      const definition = stored.ref.binding.definition;
      if (release !== undefined && definition === release.ref) {
        const named = read(release.identity, stored.evidence, stored, 'releasedBy.identity');
        if (named === undefined) return;
        releasedAt.set(named, Math.max(releasedAt.get(named) ?? 0, stored.sequence));
        return;
      }
      if (!fromRefs.has(definition)) return;
      const slot = read(declaration.key, stored.evidence, stored, 'key');
      if (slot === undefined) return;
      const named = read(declaration.identity, stored.evidence, stored, 'identity');
      if (named === undefined) return;
      const current = newest.get(slot);
      // LATEST INVOKED wins — a late settlement of an older invocation
      // never displaces a newer one.
      if (current !== undefined && current.sequence > stored.sequence) return;
      newest.set(slot, {
        sequence: stored.sequence,
        entry: Object.freeze({
          context: declaration.id,
          kind,
          key: slot,
          identity: named,
          value: stored.evidence,
          transition: stored.ref,
          binding: stored.ref.binding,
          attribution: stored.attribution,
        }),
      });
    };

    for (const stored of this.#ledger.verifiedRows()) fold(stored);
    const unsubscribe = this.#ledger.onVerified(fold);

    return Object.freeze({
      declaration,
      entries: (): readonly DeclaredContextEntry[] => {
        if (retired) return Object.freeze([]);
        const standing = [...newest.values()]
          .filter(
            (candidate) =>
              (releasedAt.get(candidate.entry.identity) ?? 0) < candidate.sequence,
          )
          .sort((a, b) => a.sequence - b.sequence)
          .map((candidate) => candidate.entry);
        return Object.freeze(standing);
      },
      skipped: (): readonly DeclaredContextSkip[] => Object.freeze([...skipped]),
      retire: (): boolean => {
        if (retired) return false;
        retired = true;
        unsubscribe();
        this.#live.delete(declaration.id);
        return true;
      },
    });
  }
}

interface Plan {
  readonly declaration: DeclaredContextDeclaration;
  readonly kind: string;
  readonly fromRefs: ReadonlySet<ActionDefinitionRef>;
  readonly release:
    | {
        readonly ref: ActionDefinitionRef;
        readonly identity: (evidence: unknown) => string;
      }
    | undefined;
}
