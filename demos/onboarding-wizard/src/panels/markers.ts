import type { ActivationLevel, AvailableSlice, Binding } from 'hcifootprint';

/**
 * THE HONESTY MARKERS, verbatim.
 *
 * Every field below is copied off an `AvailableEdge` the session just returned.
 * Nothing is computed, defaulted, or filled in: an absent `materialized` stays
 * absent, because "the session did not stamp this" and "the session stamped
 * false" are different facts and the panel must not merge them.
 *
 * `from` travels with the reading so the chip on screen can name the call it
 * came from. A panel that cannot say which call produced it is a panel that
 * might be describing something else.
 */
export interface MarkerRow {
  affordanceId: string;
  does: string;
  role: string;
  highEffect: boolean;
  /** Node path the edge lives on (tree stamp). */
  node?: string;
  /** true = something can execute this now; false = declared, nothing bound. */
  materialized?: boolean;
  /** Guard keys the state view could not evaluate — offered anyway, flagged. */
  guardUnevaluated?: string[];
  /** Evidence level behind "this node is active". */
  activation?: ActivationLevel;
  /** false = on screen, greyed out. */
  enabled?: boolean;
  /** The declared gesture's kind — which wiring this edge would need. */
  gestureKind?: Binding['kind'];
  /** Whether the edge carries a schema (the planner's `expects`). */
  declaresInput: boolean;
}

export interface MarkerReading {
  from: string;
  version: number;
  node: string;
  rows: MarkerRow[];
}

/** Project one live `available()` slice. Copies only; invents nothing. */
export function readMarkers(slice: AvailableSlice): MarkerReading {
  return {
    from: 'session.available()',
    version: slice.version,
    node: slice.node,
    rows: slice.edges.map((edge) => ({
      affordanceId: edge.affordanceId,
      does: edge.description,
      role: edge.role,
      highEffect: edge.highEffect,
      ...(edge.node !== undefined ? { node: edge.node } : {}),
      ...(edge.materialized !== undefined ? { materialized: edge.materialized } : {}),
      ...(edge.guardUnevaluated !== undefined ? { guardUnevaluated: [...edge.guardUnevaluated] } : {}),
      ...(edge.activation !== undefined ? { activation: edge.activation } : {}),
      ...(edge.enabled !== undefined ? { enabled: edge.enabled } : {}),
      ...(edge.binding !== undefined ? { gestureKind: edge.binding.kind } : {}),
      declaresInput: edge.schema !== undefined,
    })),
  };
}

/**
 * The state keys every guard in the graph reads, split by whether the app's
 * projection actually seeds them. An unseeded key is not a bug to hide — it is
 * exactly why `guardUnevaluated` appears on an edge, and saying so next to the
 * marker is the difference between an explanation and a mystery.
 */
export interface GuardKeyReading {
  from: string;
  seeded: string[];
  unseeded: string[];
}

export function readGuardKeys(requiredKeys: string[], projected: Record<string, unknown>): GuardKeyReading {
  // `undefined` counts as unseeded, matching how the session judges it: a value
  // guard like `ne ''` would MATCH undefined, so an unset value is unevaluable
  // rather than passable.
  const isSeeded = (key: string): boolean => projected[key] !== undefined;
  return {
    from: 'graph.requiredStateKeys() vs the app’s projected state',
    seeded: requiredKeys.filter(isSeeded),
    unseeded: requiredKeys.filter((key) => !isSeeded(key)),
  };
}
