/**
 * The settlement latch — the machinery behind `FireResult.whenSettled`.
 *
 * fire() is synchronous by contract, but the handler it invokes is ALWAYS
 * deferred (see Session's #invokeHandler). So at the instant fire() returns,
 * "did the app's side actually run?" is genuinely not yet known — and 0.3.0's
 * result had nowhere to say so, which let `settlement: 'settled'` (meaning
 * only "a commit bundle exists") be read as "the app performed it". This latch
 * is that missing place: one promise per fired record, resolved later with
 * what actually happened.
 *
 * Two invariants live here, and both are load-bearing:
 *
 * 1. FIRST SETTLEMENT WINS. A record can still move after it comes to rest (a
 *    compensating delta, a later reject()); those remain visible through
 *    transitions() and the 'transition' event. This promise answers exactly
 *    one question — "how did this fire come to rest?" — and a second answer
 *    would rewrite history a caller has already consumed.
 *
 * 2. IT NEVER REJECTS. Fire-and-forget is the dominant call pattern (Mode B's
 *    fireData reads named fields off the FireResult and drops it), so a
 *    rejecting promise nobody awaits would spray unhandledrejection noise into
 *    consumers that never opted in. A refusal is DATA here (effectStatus
 *    'refused' + error), not an exception — which is why the executor's
 *    `reject` below is deliberately never captured: the latch is structurally
 *    incapable of rejecting, not merely careful about it.
 */
import type { FireSettlement } from '../atom/types.js';

export interface SettlementLatch {
  /** Resolves ONCE with the fire's final truth. Never rejects. */
  readonly promise: Promise<FireSettlement>;
  /** Deliver that truth. Every call after the first is a silent no-op. */
  settle(settlement: FireSettlement): void;
}

/** A latch whose truth a later event will decide (a handler, a state report). */
export function createSettlementLatch(): SettlementLatch {
  let deliver!: (settlement: FireSettlement) => void;
  const promise = new Promise<FireSettlement>((resolve) => {
    deliver = resolve; // `reject` is not taken — see invariant 2 above
  });
  let settled = false;
  return {
    promise,
    settle(settlement) {
      // Guarded here rather than leaning on Promise's own resolve-once
      // semantics: first-settlement-wins is THIS library's rule, so it is
      // stated where a reader can find it instead of inherited silently.
      if (settled) return;
      settled = true;
      deliver(settlement);
    },
  };
}

/**
 * A latch that is already at rest — for the fire arms whose truth is known
 * synchronously (nothing is bound to run, so nothing can ever perform it).
 * The caller still awaits a promise; it simply never has to wait.
 */
export function settledNow(settlement: FireSettlement): SettlementLatch {
  const latch = createSettlementLatch();
  latch.settle(settlement);
  return latch;
}
