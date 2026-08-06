/**
 * WHO MAY PERFORM THIS ACTION — the gate, and the three concepts it refuses to
 * collapse.
 *
 * `humanDecides` says a CHOICE is a person's to make and enforces nothing, on
 * purpose (atom/types.ts, DISCLOSURE, NOT ENFORCEMENT). A preregistered campaign
 * then measured what disclosure alone is worth: in 20 of 33 residual-harm rows
 * the decisive warning was on the exact control at the exact turn and the model
 * fired anyway. A warning can be ignored; a required protocol step cannot be
 * skipped silently. So this module is the enforceable half — still opt-in, still
 * the app's call, and it does not touch the default behaviour of anything.
 *
 * THREE CONCEPTS, THREE FIELDS, NEVER ONE UNION:
 *
 * 1. ACTOR IDENTITY — who is performing the act. `mayInvoke` is a list of
 *    {@link ActorKind}, and it is the only half this file GATES.
 * 2. DECISION OWNERSHIP — whose call the choice is. `decisionOwner` is
 *    disclosure and is deliberately absent from every verdict below: an owner
 *    is not a permission, and an app that wants ownership enforced says so with
 *    `mayInvoke: ['human']`. Collapsing the two would make "this is the
 *    customer's choice" silently mean "the agent is forbidden", which is a
 *    refusal nobody wrote.
 * 3. CONSENT STATUS — whether a recorded human yes exists for THIS attempt.
 *    That is the confirm journal's question and the approval gate's answer
 *    (approval-gate.ts); `requiresHumanApproval` only says the question must be
 *    asked for this action, and mints no new refusal word.
 *
 * TWO VOCABULARIES, ON PURPOSE. A record files an act under a
 * {@link Principal} — `'user'` is how a person's action is FILED. A policy
 * names a KIND OF ACTOR — `'human'` is who may act. They are different
 * questions (one is a row's provenance, one is a rule about the world), so they
 * keep different words, and {@link actorKindOf} is the one bridge. Writing
 * `mayInvoke: ['user']` is refused loudly at the authoring door rather than
 * silently locking a person out of their own control.
 */
import type { ActorKind, Principal, PrincipalPolicy } from '../atom/types.js';

/**
 * The actor kind a recorded principal belongs to — or NOTHING for `'unknown'`.
 *
 * `'unknown'` has no kind because you cannot grant a permission to nobody: a
 * fire whose principal this library never learned is not a human, an agent or
 * the system, and answering "which of the three is it?" would be the guess the
 * whole attribution layer exists to refuse. The consequence is stated where it
 * bites — a declared `mayInvoke` list never contains 'unknown', so an
 * unattributed fire is refused by any list at all, which is the fail-closed
 * direction.
 */
export function actorKindOf(principal: Principal): ActorKind | undefined {
  if (principal === 'user') return 'human';
  if (principal === 'agent') return 'agent';
  if (principal === 'system') return 'system';
  return undefined;
}

/** The principal an actor kind's acts are FILED under — the other direction of the bridge. */
export function principalOfActor(kind: ActorKind): Principal {
  return kind === 'human' ? 'user' : kind;
}

export type PrincipalVerdict =
  | { ok: true }
  | {
      ok: false;
      reason: 'PRINCIPAL_NOT_ALLOWED';
      /** The kinds the app said may invoke this — the refusal names the requirement, never a guess. */
      required: ActorKind[];
      /** The principal that tried. Echoed so a log reader is not left joining two rows. */
      attempted: Principal;
    };

export interface PrincipalQuestion {
  /** The action's declaration, if it made one. */
  policy: PrincipalPolicy | undefined;
  /** Who is firing, as the fire door read it. */
  principal: Principal;
  /** Is this session enforcing? Absent enforcement, every declaration is disclosure. */
  enforcing: boolean;
}

/**
 * May this principal invoke this action?
 *
 * FOUR WAYS TO PASS AND ONE TO FAIL, and every pass is a case of "the app did
 * not say otherwise": no enforcement, no policy, no `mayInvoke` list, or a list
 * this actor is on. The single refusal names the required kinds so a caller can
 * act on it — an agent told only "no" tries again, an agent told "a human must
 * do this" asks the person.
 *
 * AN EMPTY LIST IS NOT A REFUSAL OF EVERYTHING — it is refused at the authoring
 * door instead (`mayInvoke: []` would mean an action nobody may ever perform,
 * which is an action that should not be declared). Read this file's guard
 * together with graph/guards.ts: whatever the compiler refuses, this never has
 * to judge.
 */
export function checkPrincipalPolicy(question: PrincipalQuestion): PrincipalVerdict {
  const { policy, principal, enforcing } = question;
  if (!enforcing) return { ok: true };
  const required = policy?.mayInvoke;
  if (required === undefined) return { ok: true };
  const kind = actorKindOf(principal);
  if (kind !== undefined && required.includes(kind)) return { ok: true };
  // A COPY: the declaration is frozen spec data, and a refusal a consumer can
  // sort in place must not reach the graph.
  return { ok: false, reason: 'PRINCIPAL_NOT_ALLOWED', required: [...required], attempted: principal };
}

/**
 * Does this action need a RECORDED human approval of its own?
 *
 * The per-action half of {@link SessionOptions.requireHumanApproval}, which asks
 * the same question of every high-effect action. Read only while enforcing, so
 * an app that declares it and never turns enforcement on sees byte-identical
 * behaviour — the law every policy in this release lives under.
 */
export function needsRecordedApproval(
  policy: PrincipalPolicy | undefined,
  enforcing: boolean,
): boolean {
  return enforcing && policy?.requiresHumanApproval === true;
}
