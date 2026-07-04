/**
 * The intra-skill dependency rule, in ONE place.
 *
 * Step B depends on step A when A's declared `effect.writes` overlap B's guard
 * keys — the guard×effect atoms already encode the ordering, so the dependency
 * DAG is DERIVED, never authored, and cannot drift from the graph.
 *
 * This is shared on purpose: Session.skillPlan() computes the live DAG from it,
 * and the testing linter (hcifootprint/testing) reasons about skill
 * completability from the SAME rule. If they used two copies, the linter could
 * green-light a skill the runtime then reports as blocked (or vice versa) — the
 * exact drift this library exists to catch. One function, no disagreement.
 */
import type { Affordance, DependencyEdge } from '../atom/types.js';

/**
 * The steps that must run before `stepId` for its guard to be satisfiable by
 * in-skill writes — each with the specific keys that create the dependency.
 */
export function stepDependencies(
  affordances: Record<string, Affordance>,
  steps: readonly string[],
  stepId: string,
): DependencyEdge[] {
  const guardKeys = Object.keys(affordances[stepId]?.guard ?? {});
  return steps
    .filter((otherId) => otherId !== stepId)
    .map((otherId) => {
      const viaKeys = (affordances[otherId]?.effect?.writes ?? []).filter((key) =>
        guardKeys.includes(key),
      );
      return { affordanceId: otherId, viaKeys };
    })
    .filter((dep) => dep.viaKeys.length > 0);
}
