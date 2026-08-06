/**
 * HOW THIS MOTION CAME TO BE FILED UNDER THAT PRINCIPAL — the basis, and how
 * strong it is.
 *
 * `updateState()` associates a committed state delta with a fire through a
 * ladder: an explicit `transitionId`, a report from inside the handler's own
 * call, the app's own wrapped function running, a unique effect signature, the
 * oldest pending fire, an explicit stimulus, and a floor that names nobody.
 * Every rung wrote the same shape of row, so a reader holding the log could not
 * tell the rungs apart — and two of them are GUESSES. FIFO settles by ARRIVAL
 * ORDER, which is not evidence of anything; a signature match proves the delta
 * looks like what an action declared, which is a shape, not an identity.
 *
 * THE FIX IS A STAMP, NOT A REFUSAL. Every transition now carries
 * {@link Attribution}: who it is filed under, WHICH rung filed it, and whether
 * that rung OBSERVED the association or INFERRED it. Nothing about today's
 * ladder changes — the same delta settles the same fire — because a stamp is a
 * disclosure and disclosure is never a behaviour change. What the enforcement
 * half does is {@link AttributionPolicy}'s job, and an integrator turns it on.
 *
 * WHAT `certainty` GRADES, said plainly because the word invites a bigger claim
 * than it can keep: it grades THE ASSOCIATION between this record and the
 * motion — never an identity, and never a value. `'caller-asserted'` is
 * 'observed' because this library watched the call come through its own door;
 * WHO was on the other side of that door is the caller's word, which is exactly
 * what the word ASSERTED is doing in the name. Provenance here is accountability
 * for cooperating agents, not a security boundary (atom/types.ts) — and no stamp
 * in this file moves that line.
 *
 * WHY A PURE MODULE. The table below is a LAW: ten bases, one certainty each,
 * total and closed. Kept out of the session so it can be read (and tested)
 * without a graph, a clock or a fire — the same reason approval-gate.ts is a
 * pure function with the world passed in.
 */
import type {
  Attribution,
  AttributionBasis,
  AttributionCertainty,
  Principal,
} from '../atom/types.js';

/**
 * THE CLOSED TABLE: what each basis is worth. Total by construction — a
 * `Record` over the union, so a new basis added to the type without a certainty
 * here stops the build rather than defaulting to the flattering answer.
 *
 * 'observed' — a door that carries identity said so, or this library was in the
 *   call when it happened. 'inferred' — the library MATCHED it (a shape, an
 *   order) and nobody watched. 'unknown' — nothing said anything and nothing
 *   matched; the row exists because state never moves silently.
 */
export const CERTAINTY_OF: Record<AttributionBasis, AttributionCertainty> = {
  // A fire came through fire(); the principal riding it is the caller's word.
  'caller-asserted': 'observed',
  // The app's report NAMED this transition (updateState({ transitionId })).
  'named-by-report': 'observed',
  // The report arrived from inside that fire's own handler call — nothing was
  // matched, so nothing could be mismatched.
  'handler-window': 'observed',
  // The app called its OWN wrapped function (a contextful action): the library
  // was in the call, so the act is an observation rather than a match.
  'direct-call': 'observed',
  // The caller said the world moved (a stimulus and/or a principal). The app is
  // the only one who can know that, and it said it.
  'declared-stimulus': 'observed',
  // `observeEffect(transitionId, …)` — the app handed in a report from a source
  // outside this client and NAMED the fire it closes. 'observed' grades the
  // ASSOCIATION and only the association: the id was given, nothing was matched,
  // and this library was in the call. It says nothing whatever about whether the
  // reported effect happened — that claim is the source's, it is recorded as a
  // report (`TransitionRecord.observations`), and no word in this table is
  // allowed to launder it into a verdict. Grading it 'inferred' would be the
  // same conflation from the other side: it would use the association axis to
  // express a doubt about the EFFECT, which this axis does not measure.
  'external-report': 'observed',
  // An anchor saw a trusted click. That is evidence a PERSON acted; which
  // action they performed is the library's guess (the `Cause.inferred` law).
  'sensed-click': 'inferred',
  // The delta looks like what exactly one action declared it writes. A shape,
  // never an identity.
  'signature-match': 'inferred',
  // The oldest pending fire, in arrival order. Order is not evidence.
  'queue-order': 'inferred',
  // Nobody named anything, nothing matched. State still never moves silently.
  unknown: 'unknown',
};

/**
 * One stamp. The certainty is READ FROM THE TABLE and never passed in, so a
 * caller cannot mint 'observed' for a rung that guessed — the whole point of
 * having a table.
 */
export function attributionOf(basis: AttributionBasis, principal: Principal): Attribution {
  return { principal, basis, certainty: CERTAINTY_OF[basis] };
}

/**
 * THE ORDER OF THE THREE ANSWERS, so that "weaker" is a comparison and not an
 * opinion.
 *
 * It exists for one rule, and the rule is the whole reason a fire's stamp is
 * allowed to move at all: a fire is stamped when it happens
 * (`'caller-asserted'`) and settled later by a report, and the row's honest
 * claim afterwards is THE WEAKEST LINK IN THAT CHAIN. A fire closed by FIFO is
 * an inferred row whatever its door was; a fire whose ACTION was guessed by an
 * anchor stays inferred however precisely the app then named it. Certainty only
 * ever goes down — an upgrade path is a laundering path.
 */
export const CERTAINTY_RANK: Record<AttributionCertainty, number> = {
  observed: 2,
  inferred: 1,
  unknown: 0,
};

/**
 * WHAT STRICT MODE ACTUALLY TURNS OFF, in one place, because it is exactly two
 * things and both live at a call site rather than in a table here:
 *
 * 1. `'queue-order'` — never used. The FIFO rung in `Session.updateState` is
 *    skipped whole; arrival order is not evidence of anything.
 * 2. `'signature-match'` — used only when UNAMBIGUOUS, by the rule below.
 *
 * Nothing else moves. The observed rungs are observations, and `'sensed-click'`
 * is a FIRE's stamp rather than a way of closing one — strict governs how a
 * REPORT is associated with a fire, so an anchor that saw a click still records
 * the fire it inferred, flagged exactly as it always was.
 */

/** One candidate for a signature match: a pending fire and the keys it claims to write. */
export interface SignatureCandidate<T> {
  candidate: T;
  writes: readonly string[];
}

/**
 * THE SIGNATURE RULE — the one pending fire this delta could have come from, or
 * nothing.
 *
 * DEFAULT (today's law, byte for byte): exactly one candidate whose DECLARED
 * WRITES are all present in the delta. A candidate declaring nothing never
 * matches — an empty signature would match every delta ever reported.
 *
 * STRICT: the same, and then a second question the default never asks — could
 * anything ELSE have produced this delta? A second pending fire whose writes
 * merely OVERLAP the delta is a plausible source too (an app is entitled to
 * report its writes in pieces), and settling the first while the second is live
 * is a guess wearing a match's clothes. So strict requires the delta to touch
 * exactly ONE candidate at all.
 *
 * Neither mode ever settles two fires from one report, and neither invents a
 * candidate: the caller hands in the pendings it holds, which is why this
 * function needs no session to be tested.
 */
export function soleSignatureMatch<T>(
  candidates: ReadonlyArray<SignatureCandidate<T>>,
  deltaKeys: readonly string[],
  strict: boolean,
): T | undefined {
  const covered = candidates.filter(
    (row) => row.writes.length > 0 && row.writes.every((key) => deltaKeys.includes(key)),
  );
  if (covered.length !== 1) return undefined;
  if (!strict) return covered[0].candidate;
  // `touching` always contains `covered[0]`, so "exactly one" means "nothing
  // else even partly explains this report".
  const touching = candidates.filter((row) => row.writes.some((key) => deltaKeys.includes(key)));
  return touching.length === 1 ? covered[0].candidate : undefined;
}
