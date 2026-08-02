/**
 * The step-dependency rule, in ONE place.
 *
 * Step B depends on step A when A's declared `effect.writes` overlap B's guard
 * keys — the guard×effect atoms already encode the ordering, so the dependency
 * DAG is DERIVED, never authored, and cannot drift from the graph.
 *
 * This is shared on purpose: Session.journeyPlan() computes the live DAG from it,
 * and the testing linter (hcifootprint/testing) reasons about journey
 * completability from the SAME rule. If they used two copies, the linter could
 * green-light a journey the runtime then reports as blocked (or vice versa) —
 * the exact drift this library exists to catch. One function, no disagreement.
 */
import type { Affordance, DependencyEdge } from '../atom/types.js';

/**
 * The steps that must run before `stepId` for its guard to be satisfiable by
 * in-journey writes — each with the specific keys that create the dependency.
 */
export function stepDependencies(
  affordances: Record<string, Affordance>,
  steps: readonly string[],
  stepId: string,
): DependencyEdge[] {
  return dependenciesOver(affordances, steps, stepId, blockingKeysOf(affordances[stepId]?.guard));
}

/**
 * The keys a declared condition reads, flattened.
 *
 * A `WhereFilter` is a conjunction of key → condition, so its own keys ARE the
 * keys it reads. Kept as one function because two readers of "what does this
 * condition depend on" would be two things to keep true.
 */
function blockingKeysOf(filter: Affordance['guard']): string[] {
  return Object.keys(filter ?? {});
}

/**
 * THE SAME RULE, WIDENED — but over the keys that are HOLDING `subjectId` BACK
 * RIGHT NOW, which the caller evaluates and passes in (`blockingKeys`).
 *
 * WHY LIVE KEYS AND NOT DECLARED ONES. `stepDependencies` above may read a
 * step's whole guard because it answers a question about the DECLARED graph:
 * "for this step's guard to be satisfiable by in-journey writes, what must run
 * first". This function answers a question about the LIVE session — "what would
 * free this control" — and there the two are not the same set. A control is
 * only ever offered at all when its guard already HOLDS, so a version that read
 * declared guard keys would, on every served row, name actions that write a key
 * whose condition is currently TRUE: firing one of those does not free the
 * control, it destroys the condition the control is standing on and the action
 * disappears from `available()` entirely. The answer would be exactly inverted,
 * and inverted toward high-effect actions ("log out", "discard the draft")
 * precisely because those are the ones that write the keys a guard rests on.
 *
 * So the caller evaluates both declared conditions against state and passes the
 * conjuncts that DID NOT HOLD. A key the library could not read is not among
 * them: unknowable is absence here as everywhere, never a guess in either
 * direction.
 *
 * DERIVED, NEVER AUTHORED — the same overlap law, applied to any set of actions
 * rather than one journey's steps. Both halves already exist for other reasons
 * (`writes` powers verification, the conditions power availability), so there is
 * nothing new to declare and nothing that can drift.
 *
 * A CLAIM, NOT A PROMISE: `writes` is the app's claim that an action changes a
 * key. This reports that claim; it never promises that firing the other action
 * WILL free this one. And where nobody claims to write a key, the answer is
 * silence — absence, never a guess.
 */
export function unblockingDependencies(
  affordances: Record<string, Affordance>,
  candidates: readonly string[],
  subjectId: string,
  blockingKeys: readonly string[],
): DependencyEdge[] {
  return dependenciesOver(affordances, candidates, subjectId, blockingKeys);
}

/** The shared walk: who among `candidates` writes any of `waitingOn`. */
function dependenciesOver(
  affordances: Record<string, Affordance>,
  candidates: readonly string[],
  subjectId: string,
  waitingOn: readonly string[],
): DependencyEdge[] {
  if (waitingOn.length === 0) return [];
  return candidates
    .filter((otherId) => otherId !== subjectId)
    .map((otherId) => {
      const viaKeys = (affordances[otherId]?.effect?.writes ?? []).filter((key) =>
        waitingOn.includes(key),
      );
      return { affordanceId: otherId, viaKeys };
    })
    .filter((dep) => dep.viaKeys.length > 0);
}
