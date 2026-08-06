/**
 * HOW WOULD ANYONE SEE THAT THIS HAPPENED — the app's own answer, and the
 * policy that can require one before a high-effect action is allowed to run.
 *
 * THE HONEST BLIND SPOT THIS IS BUILT AROUND, stated first because nothing here
 * may quietly close it: `TransitionRecord.effectVerified` checks that the
 * declared write KEYS appeared in the settled delta. Key presence is NOT value
 * correctness. A handler that wrote `orderId: null` satisfies it exactly as one
 * that wrote a real order does, and a fire whose keys all landed still says
 * nothing about whether the amount was right. That is why `verify` exists (the
 * app's own postcondition, traverse/verify.ts) and why the strongest word this
 * module can require is a postcondition — not a bigger claim about the keys.
 *
 * WHAT THE DECLARATION IS FOR. `observability` is the app saying which channel
 * an effect can be seen through, once, next to the action. It is meaning, so it
 * is the app's to declare and never the library's to infer: nothing here reads a
 * handler, watches the DOM or promotes a `writes` list into an answer. An app
 * that declares nothing serves and behaves byte-identically.
 *
 * WHAT THE POLICY IS FOR. `effectPolicy: { highEffectRequiresVerify: true }`
 * refuses a high-effect fire whose effect nobody could check — before it runs,
 * with a word that says which half is missing. Opt-in, like every enforcement in
 * this release: absent, this module answers `ok` to everything.
 */
import type { Observability } from '../atom/types.js';

/**
 * The words that SATISFY `highEffectRequiresVerify`, and the two that do not.
 *
 * - `'postcondition'` — the app declared a `verify` contract. A real check.
 * - `'navigation'`    — the effect IS page motion, and the app declared where
 *   to. The library corroborates arrival (`TransitionRecord.arrival`), which is
 *   corroboration and not causal proof — said here so nobody reads this set as
 *   a proof set.
 * - `'external'`      — the effect happens somewhere the client cannot see, and
 *   the app will report it through {@link Session.observeEffect}. The policy
 *   accepts the DECLARATION; it cannot make the report arrive, and the
 *   settlement stays honestly open until one does.
 *
 * `'state-delta'` is refused by the policy because key presence is not value
 * correctness (above), and `'unobservable'` because a high-effect action nobody
 * can check is exactly what the policy exists to stop. Both are perfectly legal
 * declarations — they are simply not answers to "how would you verify it".
 */
export const VERIFIABLE_OBSERVABILITY: ReadonlySet<Observability> = new Set<Observability>([
  'postcondition',
  'navigation',
  'external',
]);

/**
 * The authored sentence an EXTERNALLY REFUSED fire comes to rest with — the
 * `VERIFY_FAILED_EXPLANATION` shape (traverse/verify.ts), for its reason: it
 * crosses to a model through `errorText`, so it says who answered and what that
 * is worth, in words this library wrote.
 *
 * It names the CLASS and never the source's own text. The app's label rides the
 * observation row as data; splicing it into a sentence would put app text into
 * the one channel that may only carry words we wrote.
 */
export const EXTERNAL_REFUSAL_EXPLANATION =
  'A source outside this client reported that this action did NOT happen. The app named that source ' +
  'and supplied whatever reference it has; this library did not observe the effect itself and cannot ' +
  'check it.';

/**
 * The longest an app string may be when it crosses onto a record — the same cap
 * every other one crosses under (a `busy` label, a work row, an error text).
 * An observation's `source` and `evidenceRef` are app data, and app data is
 * bounded wherever it lands.
 */
export const OBSERVATION_TEXT_MAX = 200;

/** Cap without dropping: a marker beats silence, exactly as errorText does it. */
export function capObservationText(text: string): string {
  return text.length > OBSERVATION_TEXT_MAX ? `${text.slice(0, OBSERVATION_TEXT_MAX)}…` : text;
}

/**
 * WHAT IS WRONG WITH THIS REPORT, in the app's own terms — or nothing, if it is
 * usable.
 *
 * A refusal rather than a coercion, and deliberately: this door records
 * something no one else can see, so a report the library cannot read is the one
 * case where guessing would put an unfalsifiable sentence in the log. Both
 * required fields are checked, because a nameless source and an unknown verdict
 * are each enough to make the row meaningless.
 */
export function observationFault(report: {
  source?: unknown;
  status?: unknown;
  evidenceRef?: unknown;
}): string | undefined {
  if (typeof report.source !== 'string' || report.source.trim() === '') {
    return "observeEffect needs a 'source' — who reported this, in your own words ('stripe-webhook'). An observation nobody is named for is a claim with no author.";
  }
  if (report.status !== 'performed' && report.status !== 'refused') {
    return "observeEffect needs a 'status' of 'performed' or 'refused' — the two answers a settlement has. There is no third word, because there is no third answer.";
  }
  if (report.evidenceRef !== undefined && typeof report.evidenceRef !== 'string') {
    return "observeEffect's 'evidenceRef' must be a string — a pointer at evidence (a receipt id, a URL, a log key). It is recorded verbatim and never followed.";
  }
  return undefined;
}

export type EffectVerdict =
  | { ok: true }
  | {
      ok: false;
      reason: 'EFFECT_NOT_VERIFIABLE';
      /**
       * WHICH HALF IS MISSING — `'observability'` means the app never said how
       * this effect can be seen; `'postcondition'` means it did, and the word it
       * chose is not a check (`'state-delta'` is key presence, `'unobservable'`
       * is the app saying nobody can tell).
       */
      needs: 'observability' | 'postcondition';
      /** What the app DID declare, when it declared something. Absent is the whole fact otherwise. */
      observability?: Observability;
    };

export interface EffectQuestion {
  highEffect: boolean;
  observability: Observability | undefined;
  /** Is this session running `effectPolicy: { highEffectRequiresVerify: true }`? */
  requiresVerify: boolean;
}

/**
 * May this fire run under the session's effect policy?
 *
 * Only high-effect actions are asked, and only while the policy is on. Every
 * other fire passes untouched — the same shape as the approval gate, which is
 * also keyed on `highEffect` and also silent by default.
 */
export function checkEffectPolicy(question: EffectQuestion): EffectVerdict {
  const { highEffect, observability, requiresVerify } = question;
  if (!requiresVerify || !highEffect) return { ok: true };
  if (observability === undefined) {
    return { ok: false, reason: 'EFFECT_NOT_VERIFIABLE', needs: 'observability' };
  }
  if (VERIFIABLE_OBSERVABILITY.has(observability)) return { ok: true };
  return { ok: false, reason: 'EFFECT_NOT_VERIFIABLE', needs: 'postcondition', observability };
}
