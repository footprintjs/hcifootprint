/**
 * ONE OCCURRENCE AT A TIME — the mechanism the campaign's repeated-payment row
 * demanded, and the one refusal in this library that is about TIME rather than
 * about authority or capability.
 *
 * The measured failure: a high-effect fire went out, its settlement had not come
 * back, and the next turn served the control looking exactly like a fresh one.
 * `priorFireUnsettled` (serve/modes.ts) already puts the fact on the row and
 * deliberately refuses nothing — "there are legitimate retries, and the caller is
 * the only one who can tell". That is true, and it is also the disclosure
 * ceiling: the stamp was on the row and the second fire landed anyway. So the
 * app gets to say, per action, that a repeat is not something it wants decided
 * turn by turn.
 *
 * WHAT "UNRESOLVED" MEANS, and it means exactly one thing: this session is still
 * holding that fire's settlement question open. Not a timer — a clock is not
 * evidence, and "it has been a while" is evidence neither of done nor of failed.
 * Not another look. Not the caller reporting the first one finished; a caller's
 * word about somebody else's handler is the assertion this whole library exists
 * to stop laundering. It clears when the fire SETTLES, through any of four
 * doors: the handler resolves or throws, the app's state report lands,
 * `reject()` says it failed, or the app hands in a report from a source this
 * client cannot see (`observeEffect`). All four are things the session watched
 * happen — the fourth is the app performing a protocol step at our door, not a
 * caller asserting somebody else's handler finished.
 *
 * WHY NOT A GENERAL LOCK. It refuses only a fire that WOULD EXECUTE through this
 * session. The app self-reporting its own motion (`invoke: false`, the DOM
 * sensor's record-only fire) is reality arriving, and refusing reality would be
 * the library denying something that already happened.
 */
import { renderInput } from './same-input.js';
import { GraphValidationError } from '../graph/guards.js';
import type { ConcurrencyPolicy } from '../atom/types.js';

/**
 * The doors that can settle a fire — named on the refusal, so "how" is
 * answerable.
 *
 * ALL FOUR OF THEM, and the fourth is the one this release exists for: an action
 * declared `observability: 'external'` settles when the app hands in a report
 * from somewhere this client cannot see ({@link Session.observeEffect}), which
 * reaches the same `#resolveEffect` every other door does. A sentence that named
 * three doors would send an integrator holding a webhook looking for a handler
 * that was never going to resolve — and the whole argument for a required
 * protocol step over a warning is that the sentence telling you how to satisfy
 * it is true.
 */
export const HOW_TO_SETTLE =
  'It clears when that fire settles — your handler resolving or throwing, the app reporting the ' +
  'state delta (updateState with transitionId), session.reject(transitionId), or (for an effect ' +
  'this client cannot see) session.observeEffect(transitionId, { source, status }). Ask ' +
  'session.settlementOf(transitionId) for the answer. No timeout clears it: this library does not ' +
  'treat elapsed time as evidence that an action finished.';

/** One fire this session is still holding a settlement question open for. */
export interface Flight {
  actionId: string;
  /** The repeats-container card this fire named, or undefined for a plain control. */
  instance: string | undefined;
  /**
   * The canonical rendering of the payload, or `undefined` when this library
   * cannot render it faithfully — which is a fact about our own reach, and is
   * treated as such below.
   */
  render: string | undefined;
}

/** What a fire is asking about. */
export interface FlightQuestion {
  actionId: string;
  scope: NonNullable<ConcurrencyPolicy['scope']>;
  instance: string | undefined;
  render: string | undefined;
}

/** The payload as this module compares it — one renderer, shared with the approval gate. */
export function flightRender(payload: unknown): string | undefined {
  return renderInput(payload);
}

/**
 * WHAT COUNTS AS THE SAME FIRE AGAIN, defaulted in ONE place.
 *
 * `'action'` is the default because it is the answer that can never be too weak:
 * a control the app called single-flight allows one occurrence at a time, and an
 * author who wants the narrower rule says which dimension it is narrowed on.
 */
export function scopeOf(
  policy: ConcurrencyPolicy | undefined,
): NonNullable<ConcurrencyPolicy['scope']> {
  return policy?.scope ?? 'action';
}

/**
 * The transition id of a prior occurrence this fire would duplicate, or nothing.
 *
 * SCANNED, NOT KEYED. The set of open settlements is a handful of entries, and a
 * scan lets the payload rule below be one readable line instead of a hash the
 * rule has to be smuggled into.
 *
 * THE PAYLOAD RULE DECLINES TOWARD REFUSE. Under `scope: 'payload'` a second
 * fire is let through only when the two payloads are PROVABLY different. If
 * either side is a value this library cannot render faithfully — a Map, a Date,
 * a cycle, anything past the caps — it cannot prove a difference, so it does not
 * claim one. Same stance as `same-input.ts` and for the same reason: which
 * mistake is unrecoverable. A false block costs a caller one settlement wait; a
 * false pass is the second payment.
 */
export function priorFlight(
  open: Iterable<readonly [string, Flight]>,
  q: FlightQuestion,
): string | undefined {
  for (const [transitionId, flight] of open) {
    if (flight.actionId !== q.actionId) continue;
    if (q.scope !== 'action' && flight.instance !== q.instance) continue;
    if (
      q.scope === 'payload' &&
      flight.render !== undefined &&
      q.render !== undefined &&
      flight.render !== q.render
    ) {
      continue;
    }
    return transitionId;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// The authoring door — one law, and both doors throw through it
// ---------------------------------------------------------------------------

const CONCURRENCY_MODES = ['parallel', 'single-flight'] as const;
const CONCURRENCY_SCOPES = ['action', 'instance', 'payload'] as const;

/**
 * A concurrency declaration, judged at the same door and for the same reason:
 * a misspelled `mode` that was ignored would leave repeat-suppression switched
 * off in an app that believes it is on.
 *
 * A `scope` under `'parallel'` is refused rather than ignored, because it is the
 * shape of the mistake this pair invites: an author writes `{ scope: 'payload' }`
 * meaning "one payment per invoice", leaves `mode` at its default, and gets no
 * suppression at all. Refusing names the missing half instead of running a
 * policy the author did not declare.
 */
export function validateConcurrency(owner: string, policy: ConcurrencyPolicy): void {
  if (!(CONCURRENCY_MODES as readonly string[]).includes(policy?.mode)) {
    throw new GraphValidationError(
      `${owner} declares concurrency mode '${String(policy?.mode)}'. ` +
        `Known modes: ${CONCURRENCY_MODES.join(', ')}.`,
    );
  }
  if (policy.scope !== undefined && !(CONCURRENCY_SCOPES as readonly string[]).includes(policy.scope)) {
    throw new GraphValidationError(
      `${owner} declares concurrency scope '${String(policy.scope)}'. ` +
        `Known scopes: ${CONCURRENCY_SCOPES.join(', ')}.`,
    );
  }
  if (policy.scope !== undefined && policy.mode === 'parallel') {
    throw new GraphValidationError(
      `${owner} declares a concurrency scope '${policy.scope}' with mode 'parallel', which scopes nothing — ` +
        `parallel fires never wait for each other. Set mode: 'single-flight' to suppress repeats, or drop the scope.`,
    );
  }
}
