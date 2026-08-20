/**
 * ONCE — the receipt that survives settlement, and the one door that reopens it.
 *
 * `single-flight` (next door) suppresses a repeat while the first occurrence is
 * UNRESOLVED; its window closes the moment the fire settles, by design. The
 * measured duplicate-execution failure happened entirely OUTSIDE that window:
 * the first fire had settled, a later turn planned from a context that still
 * showed the button, and the second press executed. `mode: 'once'` is the
 * declaration for that action: one EXECUTED occurrence per scope, and the
 * window survives settlement.
 *
 * WHAT REOPENS IT — a person acting on the screen, and nothing else. Not a
 * timeout (a clock is not evidence the world wants it again), not another look,
 * not the caller asserting it is fine. The rule comes from the consumer's
 * hand-rolled version of this check, which learned it in the field: when a
 * PERSON acted between two identical presses, the second press is legitimately
 * theirs — so it is let through carrying a REPORT (`FireResult.repeated`),
 * never refused. Refusing reality the person asked for would be the library
 * overruling the human; firing it silently would hide that it is a knowing
 * second occurrence. The report is the honest middle.
 *
 * STRICTLY AFTER, NEVER AT. The person's own press of the control is the
 * occurrence itself, not evidence licensing the next one — a receipt reopens
 * only on user-attributed motion at a LATER ledger position.
 *
 * WHAT COUNTS AS EXECUTED, declined toward refuse: 'performed' counts, and so
 * does 'unobservable' — on a repeat-suppression boundary an unprovable
 * non-execution is not a non-execution (same stance as the payload rule in
 * single-flight.ts, same reason: a false block costs one report, a false pass
 * is the second payment). Only a REFUSED settlement provably did not execute,
 * and it erases the receipt.
 *
 * ATTRIBUTION IS RECORDED, NOT VERIFIED — here as everywhere. The reopening
 * evidence carries the motion row's `basis` (`'sensed-click'` vs
 * `'caller-asserted'`), so a consumer can weigh a person the library saw
 * against a person a caller merely claimed.
 */
import type { AttributionBasis, TransitionRecord } from '../atom/types.js';
import { sameFire } from './single-flight.js';
import type { Flight, FlightQuestion } from './single-flight.js';

/** One executed occurrence of a `mode: 'once'` action, kept past settlement. */
export interface PerformedReceipt extends Flight {
  transitionId: string;
  /**
   * The transition-ledger position at which this occurrence was on the record —
   * the first index whose rows are AFTER it. Person-acted evidence must sit at
   * or past this index; the occurrence's own row sits just before it.
   */
  asOfIndex: number;
}

/** The reopening evidence a legitimate repeat carries on its result. */
export interface PersonActedSince {
  transitionId: string;
  basis: AttributionBasis;
}

/** The authored sentence the DUPLICATE_EXECUTION refusal teaches with. */
export const HOW_TO_REPEAT =
  "This action declares concurrency mode 'once': it has already been performed in this session, " +
  'and the receipt names the transition. It reopens only when a person acts on the screen — a ' +
  'user-attributed transition after that receipt — and the repeat then fires carrying a ' +
  "`repeated` report instead of being refused. No timeout reopens it, and no caller's word does: " +
  'ask session.settlementOf(priorTransitionId) for what the first occurrence did.';

/**
 * The settled occurrences of every `mode: 'once'` action in one session.
 * Scanned, not keyed, for single-flight.ts's stated reason: the matcher stays
 * one readable predicate (`sameFire` — shared, so the two suppressions can
 * never disagree about identity), and the population is one receipt per
 * executed once-action, which real sessions can count on one hand.
 */
export class OnceLedger {
  readonly #receipts = new Map<string, PerformedReceipt>();

  /** File the occurrence. Minted at fire time; a refusal erases it later. */
  note(receipt: PerformedReceipt): void {
    this.#receipts.set(receipt.transitionId, receipt);
  }

  /** A REFUSED settlement provably did not execute — the only erasing fact. */
  erase(transitionId: string): void {
    this.#receipts.delete(transitionId);
  }

  /**
   * The receipt a fire in this scope would duplicate, or nothing — the LATEST
   * matching one, because the window is "since the last occurrence": after a
   * person-reopened repeat, ITS receipt governs the next press, and answering
   * with the first occurrence would reopen the action for ever off one motion.
   * (Map iteration is insertion order, and receipts are filed in fire order.)
   */
  prior(q: FlightQuestion): PerformedReceipt | undefined {
    let latest: PerformedReceipt | undefined;
    for (const receipt of this.#receipts.values()) {
      if (sameFire(receipt, q)) latest = receipt;
    }
    return latest;
  }
}

/**
 * The first user-attributed transition at or past `fromIndex`, or nothing.
 * Reads the session's own ledger rather than a second counter, so the fact it
 * answers from is the fact every other door answers from (the one-ledger law
 * stated at `#openEffectLatch`).
 */
export function personActedSince(
  transitions: readonly TransitionRecord[],
  fromIndex: number,
): PersonActedSince | undefined {
  for (let i = fromIndex; i < transitions.length; i++) {
    const row = transitions[i];
    if (row.attribution.principal === 'user') {
      return { transitionId: row.id, basis: row.attribution.basis };
    }
  }
  return undefined;
}
