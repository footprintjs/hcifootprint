/**
 * THE TWO AUTHORING KEYS, read in one place: `actions:` and `journeys:`.
 *
 * A definition declares controls under `actions:` and named multi-step flows
 * under `journeys:`. Those are the only two spellings this library reads, and
 * this module is the one door that reads them — the compiler's walk, the source
 * merge, and mount-time declaration all come through here, so all three answer
 * a definition the same way.
 *
 * THE RENAMED KEYS ARE REFUSED, NOT IGNORED. `tools:` and `skills:` are gone at
 * 1.0. The types no longer carry them, so a definition written in the old words
 * fails to COMPILE; a definition that reaches the runtime anyway (plain JS, a
 * JSON blob, a cast) is refused by name with a sentence that says which key to
 * write instead. The alternative — reading only the new key — would compile a
 * silently EMPTY graph out of a definition full of controls, and hand a planner
 * an app with nothing in it. A rename a reader can act on beats a graph that
 * quietly lost half its meaning.
 *
 * The refusals are AUTHORED CONSTANTS carrying no runtime text: no id, no path,
 * no count. Nothing a definition contains can reach a message through here.
 */
import { GraphValidationError } from '../graph/guards.js';

/** Refusal for a definition that still spells its controls `tools:`. */
export const TOOLS_KEY_RENAMED =
  '`tools:` is not a key this library reads — declare controls under `actions:`. You author ACTIONS; ' +
  '"tool" is reserved for what is SERVED to a model (toMCPTools, edgesToMCPTools). Rename the key; ' +
  'nothing inside it changes.';

/** Refusal for a definition that still spells its flows `skills:`. */
export const SKILLS_KEY_RENAMED =
  '`skills:` is not a key this library reads — declare named multi-step flows under `journeys:`. One word, ' +
  'and the word is "journey" ("skill" now collides with the whole agent ecosystem\'s meaning of it). ' +
  'Rename the key; nothing inside it changes.';

/** Anything that may declare controls. */
interface HasActions<T> {
  actions?: Record<string, T>;
}

/** Anything that may declare journeys. */
interface HasJourneys<T> {
  journeys?: Record<string, T>;
}

/**
 * The controls declared on a definition. Refuses the renamed `tools:` key by
 * name before answering, so the old spelling can never read as "no controls".
 */
export function actionsOf<T>(def: HasActions<T> | undefined): Record<string, T> | undefined {
  if (!def) return undefined;
  refuseRenamedKey(def, 'tools', TOOLS_KEY_RENAMED);
  return def.actions;
}

/**
 * The journeys declared on a definition. Refuses the renamed `skills:` key by
 * name before answering, for the same reason.
 */
export function journeysOf<T>(def: HasJourneys<T> | undefined): Record<string, T> | undefined {
  if (!def) return undefined;
  refuseRenamedKey(def, 'skills', SKILLS_KEY_RENAMED);
  return def.journeys;
}

/**
 * "Did this definition declare journeys at all?" — the presence question, which
 * the source merge needs to decide whether the effective definition should carry
 * the key. Asked after {@link journeysOf} has already refused the old spelling.
 */
export function hasJourneysKey(def: HasJourneys<unknown> | undefined): boolean {
  return def?.journeys !== undefined;
}

/** One refusal, one sentence — the key's presence is the whole test. */
function refuseRenamedKey(def: object, key: string, sentence: string): void {
  if (Object.hasOwn(def, key)) throw new GraphValidationError(sentence);
}
