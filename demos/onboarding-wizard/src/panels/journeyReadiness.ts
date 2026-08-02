import type { AvailableJourney, AvailableSlice } from 'hcifootprint';

/**
 * CAN THIS JOURNEY BE STARTED? — asked without starting it.
 *
 * commitJourney() has consequences: it opens a frame, or lands a gap row. So a
 * panel that renders on every keystroke must never call it. The read-only way
 * to ask the same question is the pair the session already serves:
 *
 *   availableJourneys()  → precondition + entryAvailable (position and guards)
 *   available()        → the entry edge's `materialized` stamp (wiring)
 *
 * `materialized` is the SAME widened question the commit gate asks — registered
 * handler, or a gesture that yields a literal address the session's `navigate`
 * can perform — so this row predicts the gate without triggering it. When the
 * entry step is not on the current page there is no edge to read, and the row
 * says exactly that instead of guessing.
 */
export type EntryWiring = 'wired' | 'not-wired' | 'not-on-this-page';

export interface JourneyRow {
  journeyId: string;
  does: string;
  steps: string[];
  entryStep: string;
  preconditionPassed: boolean;
  preconditionUnevaluable?: string[];
  entryAvailable: boolean;
  entryWiring: EntryWiring;
  /** The entry step's declared gesture kind, when the edge is readable here. */
  entryGestureKind?: string;
}

export interface JourneyReading {
  from: string;
  node: string;
  rows: JourneyRow[];
}

export function readJourneys(journeys: AvailableJourney[], slice: AvailableSlice): JourneyReading {
  const edges = new Map(slice.edges.map((edge) => [edge.affordanceId, edge]));
  return {
    from: 'session.availableJourneys() + session.available()',
    node: slice.node,
    rows: journeys.map((journey) => {
      // A journey always has at least one step — the compiler refuses an empty
      // one — but `noUncheckedIndexedAccess` is right to make us say so.
      const entryStep = journey.steps[0] ?? '';
      const edge = edges.get(entryStep);
      const entryWiring: EntryWiring =
        edge === undefined
          ? 'not-on-this-page'
          : edge.materialized === true
            ? 'wired'
            : 'not-wired';
      return {
        journeyId: journey.id,
        does: journey.description,
        steps: [...journey.steps],
        entryStep,
        preconditionPassed: journey.preconditionPassed,
        ...(journey.preconditionUnevaluable !== undefined
          ? { preconditionUnevaluable: [...journey.preconditionUnevaluable] }
          : {}),
        entryAvailable: journey.entryAvailable,
        entryWiring,
        ...(edge?.binding !== undefined ? { entryGestureKind: edge.binding.kind } : {}),
      };
    }),
  };
}
