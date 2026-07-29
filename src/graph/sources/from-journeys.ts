/**
 * fromJourneys() — the app's journey definitions become skills, overlaid on
 * the spine. The app's list is read as-is: a JourneyDef is exactly what the
 * def's own `skills:` block accepts (does/steps/when), so there is one
 * authoring vocabulary and nothing to translate.
 *
 * Deliberately thin: a journey's MEANING is judged where every skill is
 * judged — the compiler's existing skills pass (missing does, empty steps,
 * unknown or ambiguous step names all die there, in the builder's existing
 * voice). The factory checks only what it must touch to take a snapshot.
 *
 * LEAF MODULE on purpose: value-imports only the shared authoring guards.
 * Importing fromJourneys must never drag session machinery into a bundle.
 */
import { SkillGraphValidationError, checkSegment } from '../guards.js';
import type { JourneyDef } from '../../tree/types.js';
import type { JourneysSource } from './types.js';

/** Read a journey list into a JourneysSource — a frozen snapshot of the app's truth. */
export function fromJourneys(journeys: Record<string, JourneyDef>): JourneysSource {
  // Null prototype: a journey literally named '__proto__' must become a KEY,
  // not a prototype swap — same discipline as the compiler's containers.
  const skills: Record<string, JourneyDef> = Object.create(null) as Record<string, JourneyDef>;
  for (const [skillId, journey] of Object.entries(journeys)) {
    // Skill ids feed MCP tool names — same segment law as the compiler,
    // refused at the factory where the author is looking.
    checkSegment(`fromJourneys journey '${skillId}'`, skillId);
    if (!Array.isArray(journey?.steps)) {
      // The one shape the SNAPSHOT itself must touch — copying a non-array
      // would crash with a bare TypeError instead of an owned refusal.
      throw new SkillGraphValidationError(
        `fromJourneys journey '${skillId}': steps must be an array of step names.`,
      );
    }
    // A fresh object per journey: a source is a SNAPSHOT value — the author
    // editing their journeys after the fact must not change what was read.
    skills[skillId] = Object.freeze({
      does: journey.does,
      steps: Object.freeze([...journey.steps]) as string[],
      ...(journey.when !== undefined ? { when: structuredClone(journey.when) } : {}),
    });
  }
  return Object.freeze({ kind: 'journeys', skills: Object.freeze(skills) });
}
