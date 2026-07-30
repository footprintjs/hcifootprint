/**
 * WHERE A PAYLOAD MAY COME FROM — one law, two halves, and the second half is
 * the one a production integration lost money on.
 *
 * THE LAW: **the app DECLARES the value; the sensor never reads one.** It may
 * recognise THAT a human acted on a control. What the value WAS comes from
 * `ControlDeclaration.value()` — the component that already holds it in a
 * variable — or it does not come at all. Never from `.value`, never from
 * `.textContent`, never from a heuristic.
 *
 * WHY THIS IS A LAW AND NOT A LIMITATION. A production integration built the
 * other version of this first: it read control values back out of the DOM, and
 * its longest-lived bugs all came from there — a composed combobox that reads as
 * empty because its real value lives in component state, a button reported as
 * "currently empty" because the node it interrogated was never the one holding
 * the answer. The DOM is a RENDERING of the app's state, not the state. Reading
 * a value back out of it fails silently, fails differently per component
 * library, and fails as a PLAUSIBLE-LOOKING VALUE rather than as an error —
 * which is the worst failure this library can ship, because a wrong payload in
 * the ledger is indistinguishable from a right one.
 *
 * SO ABSENCE IS A KEY THAT IS NOT THERE, not an empty one. `{}`, `''` and
 * `payload: undefined` are all refused shapes of the same mistake, and the
 * library has the bug on the record: a uniform relay contract forced `value: ''`
 * into a click-only control and that empty string "OVERRODE the app's own
 * authored default — selecting nothing" (session.ts:1006-1019). An OMITTED KEY
 * can never re-create that. An empty-object habit could.
 *
 * WHO CHECKS IT. Not this file — the session does, and it does it for the
 * record-only sensor too: the schema gate is source-blind on purpose ("EVERY
 * source answers for the payload, deliberately — including the record-only
 * sensor", session.ts:1030-1035), and `aff.noInput` refuses a real payload with
 * PAYLOAD_INVALID (session.ts:1021-1024). So a declared value is validated
 * against the app's own schema AT THE DOOR, which is the correct place for it: a
 * framework binding cannot launder a wrong value onto the ledger either.
 */

/**
 * The author's "this control takes NO input" sentinel, restated as a literal.
 *
 * NOT imported from expects.ts on purpose: that module value-imports footprintjs
 * (`detectSchema`, `normalizeSchema`), and src/sensor is a zero-value-import
 * leaf — importing the constant would drag the engine into every consumer that
 * only wanted a DOM listener. The duplication is one four-character word, and it
 * is PINNED: test/sensor-payload.test.ts imports the real `NO_INPUT` and asserts
 * the two are the same string, so a rename cannot drift them apart in silence.
 */
const NO_INPUT = 'none';

/**
 * The fields a payload contributes to a fire — either the one key or NO KEY.
 *
 * Typed as an optional property rather than `unknown | undefined` so the call
 * site spreads it and the absent case cannot become `payload: undefined`.
 */
export interface PayloadFields {
  readonly payload?: unknown;
}

/**
 * Does this action have a real input contract to satisfy?
 *
 * ABSENCE is treated as "no contract", never as "send nothing" — the library's
 * own reading of it (expects.ts:19-21: absence "is not 'no input': it is the
 * library not knowing"). The distinction costs the sensor nothing, because the
 * payload gate only runs where a schema exists, so staying silent bypasses no
 * check.
 */
export function takesAValue(expects: unknown): boolean {
  return expects !== undefined && expects !== NO_INPUT;
}

/**
 * Does this action REFUSE a value? Only the author's explicit `'none'` does.
 *
 * The mirror of {@link takesAValue} rather than its negation, and the gap between
 * them is deliberate: an ABSENT contract neither demands a value nor refuses one,
 * so a declared value still rides (the app said what it is; dropping it would
 * lose what the app deliberately handed over) while `'none'` never does.
 */
export function refusesAValue(expects: unknown): boolean {
  return expects === NO_INPUT;
}

/**
 * The payload a DECLARED control contributes — the whole declared-value door.
 *
 * Four answers, and three of them are "no key at all":
 * - no getter → nothing. The app did not declare a value, so there is none to
 *   report, and inventing one is the bug class above.
 * - the author's `'none'` → nothing, even WITH a getter. A real payload on a
 *   no-input action is refused as PAYLOAD_INVALID, and the empty-string bug is
 *   on the record; a control-level getter must not be able to re-open it.
 * - a getter that answers `undefined` → nothing. `undefined` is how this whole
 *   library spells absence — `isBlankPayload` counts it as blank
 *   (payload-shape.ts:208-212) and the field redaction leaves it alone rather
 *   than marking it — so building the key here would be the one shape this
 *   module promises never to produce, for no gain: `opts.payload` reads the same
 *   either way.
 * - otherwise → the getter's answer, read HERE, at report time. Reading late is
 *   what makes a debounced row carry the last value without buffering a second
 *   copy of the app's state.
 */
export function declaredPayload(value: (() => unknown) | undefined, expects: unknown): PayloadFields {
  if (value === undefined) return {};
  if (refusesAValue(expects)) return {};
  const declared = value();
  if (declared === undefined) return {};
  return { payload: declared };
}

/** The sentence a RECOGNISED edge gets when its action takes a value nobody declared. */
export const VALUE_NOT_RECOGNISABLE =
  'this action takes a value, and the sensor never reads one off the DOM — hand the element over with a ' +
  'value getter (the component that already holds it), so the ledger records what the app meant rather ' +
  'than what a rendered node happened to say';

/** The sentence a DECLARED control gets when the app handed the element over but not the value. */
export const VALUE_NOT_DECLARED =
  'this control is declared for an action that takes a value, but the declaration carries no value getter — ' +
  "add value: () => yourState so the payload comes from the app's own variable, never from the DOM";
