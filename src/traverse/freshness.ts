/**
 * DID THE WORLD MOVE UNDER THE ROW YOU PLANNED AGAINST — the comparison, and
 * what this session's policy does about it.
 *
 * WHY THERE IS AN ENFORCING TIER AT ALL. A preregistered campaign measured what
 * disclosure alone is worth: in 20 of 33 residual-harm rows the decisive warning
 * was on the exact control, at the exact turn, and the model fired anyway. That
 * is the ceiling a stamp has. A warning can be ignored; a required protocol step
 * cannot be skipped silently. So the same fact this library already served as
 * `staleReads` / `staleWrites` can now, WHEN AN INTEGRATOR ASKS FOR IT, cost the
 * fire something.
 *
 * OPT-IN, AXIS BY AXIS, AND SILENT BY DEFAULT. Every axis unanswered is
 * `'disclose'`, which is byte-for-byte what every release before this one did.
 * Enforcement that arrives unrequested is a breaking change dressed as a safety
 * feature, so nothing here fires unless somebody declared it.
 *
 * WHAT IT COMPARES, AND WHAT IT REFUSES TO COMPARE. Key NAMES and VERSION
 * NUMBERS. Never a value: this module holds none, reads none and compares none.
 * "A key you depend on moved" is mechanism; "and therefore your plan is wrong"
 * is meaning, and meaning stays on the app's side of the seam — which is exactly
 * why the RESPONSE is something an integrator declares rather than something the
 * library picks.
 *
 * WHY A PURE MODULE. The verdict has four axes, three responses and a
 * precedence rule between them, and every combination is something somebody will
 * try. Testing it without a session is what makes each mutation proof three
 * lines — the same reason `approval-gate.ts` next door is a pure function.
 */
import { GraphValidationError } from '../graph/guards.js';
import type {
  FreshnessMovement,
  FreshnessPolicy,
  FreshnessResponse,
  OfferRecord,
  StaleAcknowledgement,
} from '../atom/types.js';

/** Every axis answered — what {@link resolveFreshness} hands the judge. */
export interface ResolvedFreshness {
  guardChanges: FreshnessResponse;
  readChanges: FreshnessResponse;
  writeChanges: FreshnessResponse;
  positionChanges: FreshnessResponse;
}

/** Today's behaviour, named once so "the default" is a thing you can point at. */
export const DISCLOSE_EVERYTHING: ResolvedFreshness = {
  guardChanges: 'disclose',
  readChanges: 'disclose',
  writeChanges: 'disclose',
  positionChanges: 'disclose',
};

/**
 * The action's own answer wins AXIS BY AXIS over the session default, and an
 * axis nobody answered is `'disclose'`.
 *
 * Per-axis rather than per-object, because the alternative — an action's policy
 * REPLACING the session's — makes `{ writeChanges: 'disclose' }` on one control
 * silently switch its other three axes off, and an integrator who wrote a
 * session default would have to restate it on every action that adjusts one
 * line of it.
 */
export function resolveFreshness(
  sessionDefault: FreshnessPolicy | undefined,
  action: FreshnessPolicy | undefined,
): ResolvedFreshness {
  const axis = (name: keyof FreshnessPolicy): FreshnessResponse =>
    action?.[name] ?? sessionDefault?.[name] ?? 'disclose';
  return {
    guardChanges: axis('guardChanges'),
    readChanges: axis('readChanges'),
    writeChanges: axis('writeChanges'),
    positionChanges: axis('positionChanges'),
  };
}

/**
 * Does this policy ever refuse anything?
 *
 * The gate reads it FIRST and returns immediately when it is false, which is
 * what keeps the default path byte-identical: no offer is looked up, no window
 * is computed, no citation is demanded, and a fire that carries an `offerId`
 * anyway is affected in exactly one way — the id is recorded on its transition.
 */
export function enforcesAnything(policy: ResolvedFreshness): boolean {
  return (
    policy.guardChanges !== 'disclose' ||
    policy.readChanges !== 'disclose' ||
    policy.writeChanges !== 'disclose' ||
    policy.positionChanges !== 'disclose'
  );
}

/** Everything the judge needs, all of it already known to the session. */
export interface FreshnessQuestion {
  policy: ResolvedFreshness;
  offer: OfferRecord;
  /** Where the cursor is and what the served surface looks like RIGHT NOW. */
  now: { node: string; structureVersion: number };
  /** State keys committed since the offer's anchor — the session's one derivation. */
  changedSinceOffer: readonly string[];
  /** The app's declared read set for this action, as authored. */
  declaredReads: readonly string[];
  /** The app's declared write set for this action, as authored. */
  declaredWrites: readonly string[];
}

/**
 * WHAT MOVED, on the axes this policy actually enforces — in a fixed order, so
 * two refusals about the same motion read the same way.
 *
 * An axis set to `'disclose'` is absent even when it moved: the row already said
 * so, and naming it inside a refusal would tell a reader that a fact they were
 * merely shown is part of why they were turned away.
 *
 * The guard axis reads the offer's OWN key lists rather than re-deriving them
 * from the spec. That is the point of a record: the question is what this row
 * was judged on WHEN IT WAS SERVED, and a guard whose shape has since changed
 * must not be able to rewrite what the caller was told.
 */
export function whatMoved(q: FreshnessQuestion): FreshnessMovement[] {
  const changed = new Set(q.changedSinceOffer);
  const moved: FreshnessMovement[] = [];
  const named = (
    axis: 'guard' | 'reads' | 'writes',
    response: FreshnessResponse,
    declared: readonly string[],
  ): void => {
    if (response === 'disclose') return;
    const keys = declared.filter((key) => changed.has(key));
    if (keys.length === 0) return;
    moved.push({ axis, response, keys });
  };
  named('guard', q.policy.guardChanges, [
    ...q.offer.guardEvaluated,
    ...q.offer.guardUnevaluated,
  ]);
  named('reads', q.policy.readChanges, q.declaredReads);
  named('writes', q.policy.writeChanges, q.declaredWrites);
  if (
    q.policy.positionChanges !== 'disclose' &&
    (q.now.node !== q.offer.node || q.now.structureVersion !== q.offer.structureVersion)
  ) {
    // No keys: position is not a state key and inventing one would put a name on
    // this row that no app ever declared. `from`/`to` are page ids the graph
    // already publishes — authored strings, never app data.
    moved.push({ axis: 'position', response: q.policy.positionChanges, from: q.offer.node, to: q.now.node });
  }
  return moved;
}

/**
 * The STRICTEST response among the things that moved — `'refuse'` beats
 * `'require-ack'`, and nothing moving is no demand at all.
 *
 * Strictest rather than first-listed, because an acknowledgement is a door and a
 * refusal is a wall: if any axis says wall, letting the caller through the door
 * would answer the wall by answering something else.
 */
export function demandOf(moved: readonly FreshnessMovement[]): 'refuse' | 'require-ack' | undefined {
  if (moved.some((m) => m.response === 'refuse')) return 'refuse';
  return moved.length > 0 ? 'require-ack' : undefined;
}

/** Every key named across the movements, each once, in the order they were named. */
export function keysOf(moved: readonly FreshnessMovement[]): string[] {
  const keys: string[] = [];
  for (const movement of moved) {
    for (const key of movement.keys ?? []) if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

/**
 * What a cited acknowledgement is worth right now.
 *
 * - `'unusable'` — no such row, or it is about a different action, a different
 *   offer, or does not cover what moved. One word rather than four, and the
 *   refusal echoes the pointer that was presented: the same shape
 *   `APPROVAL_REQUIRED` takes, for the same reason (a caller holding a wrong
 *   pointer needs to be told the pointer was wrong, not given a taxonomy of how).
 * - `'stale'` — a real, matching row, made in a world that has since moved on. A
 *   step performed against different facts is not a step performed against
 *   these, and it gets its own word because the fix is different: acknowledge
 *   again, rather than go and find the right id.
 * - `'covers'` — it holds.
 *
 * THE COVERAGE RULE. A row that named NO keys covers everything for its action:
 * the caller said "I have dealt with this control's staleness", full stop, and
 * that is a bigger statement than naming three keys, not a smaller one. A row
 * that named keys covers exactly those names — every key that moved must appear,
 * or the caller answered a different question than the one being asked.
 */
export type AcknowledgementVerdict = 'covers' | 'stale' | 'unusable';

export function judgeAcknowledgement(
  row: StaleAcknowledgement | undefined,
  q: { actionId: string; offerId: string; keys: readonly string[]; stateVersion: number },
): AcknowledgementVerdict {
  if (row === undefined) return 'unusable';
  if (row.actionId !== q.actionId) return 'unusable';
  // An acknowledgement that named an offer answers THAT offer. One that named
  // none is a statement about the control, and answers whichever row is refused.
  if (row.offerId !== undefined && row.offerId !== q.offerId) return 'unusable';
  if (row.keys.length > 0 && !q.keys.every((key) => row.keys.includes(key))) return 'unusable';
  // LAST, so a caller holding the wrong pointer is told so rather than being sent
  // to re-acknowledge with an id that would never have worked.
  return row.acknowledgedAtStateVersion === q.stateVersion ? 'covers' : 'stale';
}

// ---------------------------------------------------------------------------
// The authoring door — one law, and both doors throw through it
// ---------------------------------------------------------------------------

/** The four axes and the three answers — the whole vocabulary, in one place. */
const FRESHNESS_AXES = ['guardChanges', 'readChanges', 'writeChanges', 'positionChanges'] as const;
const FRESHNESS_RESPONSES = ['disclose', 'require-ack', 'refuse'] as const;

/**
 * A freshness declaration, judged at the authoring door.
 *
 * WHY THIS REFUSES RATHER THAN IGNORES. Every other declaration in this file
 * describes; this one ENFORCES. A misspelled axis (`readsChanged`) or a
 * misspelled answer (`'require-ack '`) that was quietly dropped would leave an
 * app believing a control is protected while every fire sails through — the one
 * failure mode a safety feature must not have. So an unknown word dies here,
 * naming the vocabulary, whether or not any session ever enforces anything.
 *
 * An EMPTY object is refused for `rejectEmptyFilter`'s reason: it answers no
 * axis, so it can never do anything, and a reader is better served by being told
 * to omit it than by a field that looks like a policy and is not one.
 */
export function validateFreshness(owner: string, policy: FreshnessPolicy): void {
  const entries = Object.entries(policy as Record<string, unknown>);
  if (entries.length === 0) {
    throw new GraphValidationError(
      `${owner} has an empty freshness {} — it answers no axis, so it can never do anything. ` +
        `Omit 'freshness' entirely, or answer one of: ${FRESHNESS_AXES.join(', ')}.`,
    );
  }
  for (const [axis, response] of entries) {
    if (!(FRESHNESS_AXES as readonly string[]).includes(axis)) {
      throw new GraphValidationError(
        `${owner} declares an unknown freshness axis '${axis}'. Known axes: ${FRESHNESS_AXES.join(', ')}.`,
      );
    }
    if (!(FRESHNESS_RESPONSES as readonly string[]).includes(response as string)) {
      throw new GraphValidationError(
        `${owner} answers freshness '${axis}' with '${String(response)}'. ` +
          `Known answers: ${FRESHNESS_RESPONSES.join(', ')}.`,
      );
    }
  }
}
