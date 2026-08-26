/**
 * transition-ledger — one composed unit owning every stored transition.
 *
 * The runtime composes this as a field. It owns the rows, the id sequence,
 * settlement (first terminal wins, the loser KEPT as a quoted late
 * settlement), and the snapshot/forget queries — so the law "a connection
 * never holds the current transition" has exactly one place to be true.
 * @internal
 */
import type {
  ActionAbandonmentAuthority,
  ActionEffectSettlement,
  ActionEffectSettlementInput,
  ActionTransitionRef,
  ActionTransitionSnapshot,
} from './types.js';
import type { ActionLateSettlement } from './types.js';
import type { StoredTransition } from './stored.js';
import {
  snapshotAbandonmentAuthority,
  snapshotTransition,
} from './settlement.js';
import { snapshotDeclaration } from './declarations.js';

export class TransitionLedger {
  readonly #rows = new Map<string, StoredTransition>();
  #sequence = 0;

  nextId(): string {
    this.#sequence += 1;
    return `transition#${String(this.#sequence)}`;
  }

  store(id: string, stored: StoredTransition): void {
    this.#rows.set(id, stored);
  }

  rowFor(transition: ActionTransitionRef): StoredTransition | undefined {
    const stored = this.#rows.get(transition.transitionId);
    return stored === undefined || stored.ref !== transition
      ? undefined
      : stored;
  }

  snapshotFor(
    transition: ActionTransitionRef,
  ): ActionTransitionSnapshot | undefined {
    const stored = this.#rows.get(transition.transitionId);
    if (stored === undefined || stored.ref !== transition) {
      return undefined;
    }
    return snapshotTransition(stored);
  }

  forget(transition: ActionTransitionRef): boolean {
    const stored = this.#rows.get(transition.transitionId);
    if (stored === undefined || stored.ref !== transition) return false;
    if (
      stored.invocationStatus === 'pending' ||
      stored.effectStatus === 'unverified'
    ) {
      throw new Error(
        `hcifootprint: transition '${transition.transitionId}' is still pending and cannot be forgotten.`,
      );
    }
    this.#rows.delete(transition.transitionId);
    return true;
  }

  settle<Id extends string>(
    transition: ActionTransitionRef<Id>,
    input: ActionEffectSettlementInput,
  ): ActionEffectSettlement<Id> {
    const stored = this.#rows.get(transition.transitionId);
    if (stored === undefined || stored.ref !== transition) {
      throw new Error(
        `hcifootprint: transition '${transition.transitionId}' is unknown or forged.`,
      );
    }
    if (stored.effectSettlement !== undefined) {
      // FIRST TERMINAL WINS, AND THE TERMINAL NEVER REOPENS — but the losing
      // settlement is KEPT AND MARKED LATE, never silently dropped. Before
      // this block recorded anything, a `verified` arriving after an
      // `abandoned` vanished into a return of the first settlement, and the
      // caller could not even tell its evidence went nowhere. The claim is
      // recorded as a QUOTATION (`claimed` is whatever status the caller
      // said, stringified, unvalidated): validating it as if it were being
      // accepted would be pretending it settled something, and adopting it
      // would reopen a terminal — both are the failure this exists to refuse.
      if (input !== null && typeof input === 'object') {
        const claimed = (input as { readonly status?: unknown }).status;
        const payload =
          claimed === 'verified'
            ? (input as { readonly evidence?: unknown }).evidence
            : claimed === 'refused'
              ? (input as { readonly reason?: unknown }).reason
              : undefined;
        (stored.late ??= []).push(
          Object.freeze({
            claimed: String(claimed),
            ...(payload !== undefined
              ? { payload: snapshotDeclaration(payload) }
              : {}),
          }),
        );
      }
      return stored.effectSettlement as ActionEffectSettlement<Id>;
    }
    if (stored.effectSettling === true) {
      throw new Error(
        `hcifootprint: transition '${transition.transitionId}' is already being settled.`,
      );
    }
    // Claim the rail before reading any application-owned property. Evidence
    // getters can re-enter; they must never publish a second, contradictory
    // answer while the first snapshot is in progress.
    stored.effectSettling = true;
    try {
      if (input === null || typeof input !== 'object') {
        throw new TypeError(
          'hcifootprint: settle() needs a settlement record.',
        );
      }
      const status = (input as { readonly status?: unknown }).status;
      if (
        status !== 'verified' &&
        status !== 'refused' &&
        status !== 'abandoned'
      ) {
        throw new TypeError(
          `hcifootprint: invalid effect settlement status '${String(status)}'.`,
        );
      }
      const payload =
        status === 'verified'
          ? (input as { readonly evidence?: unknown }).evidence
          : status === 'refused'
            ? (input as { readonly reason?: unknown }).reason
            : undefined;
      if (status !== 'abandoned' && payload === undefined) {
        throw new TypeError(
          status === 'verified'
            ? 'hcifootprint: a verified effect settlement needs evidence.'
            : 'hcifootprint: a refused effect settlement needs a reason.',
        );
      }
      const authority =
        status === 'abandoned'
          ? snapshotAbandonmentAuthority(
              (input as { readonly authority?: unknown }).authority,
            )
          : undefined;
      if (status === 'verified' && !stored.verificationDeclared) {
        throw new Error(
          `hcifootprint: transition '${transition.transitionId}' cannot be verified because its action definition declares no evidence-bearing settle contract. Declare writes, goTo, verify, or an observable evidence channel before reporting verified.`,
        );
      }
      if (status === 'verified' && stored.coverage !== 'verifiable') {
        throw new Error(
          `hcifootprint: transition '${transition.transitionId}' cannot be verified from ${stored.coverage} coverage; invoke under verifiable coverage first.`,
        );
      }
      const transitionRef = stored.ref as ActionTransitionRef<Id>;
      const settlement: ActionEffectSettlement<Id> =
        status === 'verified'
          ? Object.freeze({
              status: 'verified',
              transition: transitionRef,
              evidence: snapshotDeclaration(payload),
            })
          : status === 'refused'
            ? Object.freeze({
                status: 'refused',
                transition: transitionRef,
                reason: snapshotDeclaration(payload),
              })
            : Object.freeze({
                status: 'abandoned',
                transition: transitionRef,
                authority: authority as ActionAbandonmentAuthority,
              });
      stored.effectSettlement = settlement;
      stored.effectStatus = status;
      if (settlement.status === 'verified') {
        stored.evidence = settlement.evidence;
      } else if (settlement.status === 'refused') {
        stored.reason = settlement.reason;
      } else {
        stored.authority = settlement.authority;
      }
      const resolveEffect = stored.resolveEffect;
      stored.resolveEffect = undefined;
      resolveEffect?.(settlement);
      return settlement;
    } finally {
      stored.effectSettling = false;
    }
  }
}
