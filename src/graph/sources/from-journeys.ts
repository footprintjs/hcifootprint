/**
 * fromJourneys() — the app's journey definitions become journeys, overlaid on
 * the spine. The app's list is read as-is: a JourneyDef is exactly what the
 * def's own `journeys:` block accepts (does/steps/when), so there is one
 * authoring vocabulary and nothing to translate.
 *
 * Deliberately thin: a journey's MEANING is judged where every journey is
 * judged — the compiler's existing journeys pass (missing does, empty steps,
 * unknown or ambiguous step names all die there, in the compiler's existing
 * voice). The factory checks only what it must touch to take a snapshot.
 *
 * LEAF MODULE on purpose: value-imports only the shared authoring guards.
 * Importing fromJourneys must never drag session machinery into a bundle.
 */
import { GraphValidationError, checkSegment } from '../guards.js';
import type { JourneyDef } from '../../tree/types.js';
import type { JourneysSource } from './types.js';

/** Read a journey list into a JourneysSource — a frozen snapshot of the app's truth. */
export function fromJourneys(journeys: Record<string, JourneyDef>): JourneysSource {
  // Null prototype: a journey literally named '__proto__' must become a KEY,
  // not a prototype swap — same discipline as the compiler's containers.
  const snapshot: Record<string, JourneyDef> = Object.create(null) as Record<string, JourneyDef>;
  for (const [journeyId, journey] of Object.entries(journeys)) {
    // Journey ids feed MCP tool names — same segment law as the compiler,
    // refused at the factory where the author is looking.
    checkSegment(`fromJourneys journey '${journeyId}'`, journeyId);
    if (!Array.isArray(journey?.steps)) {
      // The one shape the SNAPSHOT itself must touch — copying a non-array
      // would crash with a bare TypeError instead of an owned refusal.
      throw new GraphValidationError(
        `fromJourneys journey '${journeyId}': steps must be an array of step names.`,
      );
    }
    // A fresh object per journey: a source is a SNAPSHOT value — the author
    // editing their journeys after the fact must not change what was read.
    snapshot[journeyId] = Object.freeze({
      does: journey.does,
      // A step is a name or the object element `{ step }` — and an OBJECT is a
      // reference, so copying the array alone would leave the author holding a
      // handle into the snapshot. Copied element by element for the reason the
      // fresh object above exists: a snapshot is a value. What the element MEANS
      // is still the compiler's to judge, in its own voice.
      steps: Object.freeze(
        journey.steps.map((step) => (typeof step === 'string' ? step : { ...step })),
      ) as JourneyDef['steps'],
      ...(journey.when !== undefined ? { when: structuredClone(journey.when) } : {}),
    });
  }
  return Object.freeze({ kind: 'journeys', journeys: Object.freeze(snapshot) });
}
