/**
 * MAY THE SENSOR ANSWER FOR THIS ACTION'S PAYLOAD? — one law, and the answer is
 * almost always "only the app can".
 *
 * THE LAW: **the sensor never sends a payload.** It recognizes THAT a human
 * acted on a declared control; it does not scrape what the value was. An action
 * that takes a value is reported from where the value is DECLARED — the
 * component that already holds it in a variable — never from `.value` or
 * `.textContent`.
 *
 * WHY THIS IS A LAW AND NOT A LIMITATION. A production integration built the
 * other version of this first: it read control values back out of the DOM, and
 * its longest-lived bugs all came from there — a composed combobox that reads as
 * empty because its real value lives in component state, a button reported as
 * "currently empty" because the node it interrogated was never the one holding
 * the answer. The DOM is a RENDERING of the app's state, not the state. Reading
 * a value back out of it fails silently, fails differently per component
 * library, and fails as a plausible-looking value rather than as an error —
 * which is the worst failure this library can ship, because a wrong payload in
 * the ledger is indistinguishable from a right one.
 *
 * So an edge whose contract demands a value is not half-reported with a guess.
 * It is declared UNWATCHED, with the sentence saying where the value has to come
 * from. Honest absence, which is this library's standard answer everywhere else
 * too (presence.ts:17-20 takes the same stance about CSS it cannot see).
 *
 * WHERE THE SEAM IS. A declared-value door — a framework binding that hands the
 * component's own `value` over, or a single invocation door on a live action
 * used by app and agent alike — slots in ABOVE this file, by supplying the
 * payload its own fire carries. Nothing here has to change: this module answers
 * "can the sensor ALONE answer for it", and a caller that holds the value is
 * asking a different question at a different door.
 *
 * WHAT IS STILL RECOGNIZED, and it is most controls: an action that takes NO
 * input. Two contracts qualify, for two different reasons worth keeping apart —
 * the author's explicit `'none'` sentinel (expects.ts:39), where a payload would
 * be refused as PAYLOAD_INVALID; and ABSENCE, where the author declared no input
 * contract at all and the library serves nothing rather than inventing an empty
 * one (atom/types.ts, `expects`). Sending no payload is not a claim about a
 * shape — it is the absence of one — and fire()'s payload gate only runs where a
 * schema exists (session.ts:882-895), so nothing is bypassed by staying silent.
 */

/**
 * The author's "this control takes NO input" sentinel, restated as a literal.
 *
 * NOT imported from expects.ts on purpose: that module value-imports footprintjs
 * (`detectSchema`, `normalizeSchema`), and src/sensor is a zero-value-import
 * leaf — importing the constant would drag the engine into every consumer that
 * only wanted a DOM listener. The duplication is one five-character word, and it
 * is pinned: test/sensor-payload.test.ts imports the real `NO_INPUT` and asserts
 * the two are the same string, so a rename cannot drift them apart in silence.
 */
const NO_INPUT = 'none';

export type PayloadVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Can the sensor report this action at all, given what it says it expects?
 *
 * One function, asked once per edge when the watch-list is built — so the
 * coverage report and the watch-list can never disagree about which controls the
 * sensor answers for.
 */
export function payloadVerdict(expects: unknown): PayloadVerdict {
  if (expects === undefined || expects === NO_INPUT) return { ok: true };
  return {
    ok: false,
    reason:
      'this action takes a value, and the sensor never reads one off the DOM — report it from where the ' +
      'value is declared (the component that holds it), so the ledger records what the app meant rather ' +
      'than what a rendered node happened to say',
  };
}
