/**
 * fromRoutes() — the app's route table becomes page nodes: the spine.
 *
 * Page names are EXPLICIT (the keys of the table). Auto-deriving a name from
 * '/orders/:id' would be a guess, and this library does not guess — the one
 * refusal direction that is always safe is asking the author for the name.
 *
 * A route contributes a PAGE, never an action: the spine is places, not
 * gestures. Reaching a page is actuation-layer work (a url gesture derived
 * from the route), which is why nothing here emits tools or bindings.
 *
 * LEAF MODULE on purpose: value-imports only the shared authoring guards.
 * Importing fromRoutes must never drag session machinery into a bundle.
 */
import { SkillGraphValidationError, checkSegment } from '../guards.js';
import type { PageNodeDef } from '../../tree/types.js';
import type { RoutesSource } from './types.js';

/**
 * Read a route table into a RoutesSource. Two value shapes per page:
 * a bare route string, or `{ route, does }` when the page deserves a label.
 *
 * The `const` type parameter preserves the literal page names, so the compiled
 * graph's session methods accept them as typed node paths.
 */
export function fromRoutes<const R extends Record<string, string | { route: string; does?: string }>>(
  routes: R,
): RoutesSource<keyof R & string> {
  // Null prototype: a page literally named '__proto__' must become a KEY,
  // not a prototype swap — same discipline as the compiler's containers.
  const pages: Record<string, PageNodeDef> = Object.create(null) as Record<string, PageNodeDef>;
  for (const [pageId, value] of Object.entries<string | { route: string; does?: string }>(routes)) {
    // Same segment law as the compiler — refused HERE, at the factory, so the
    // error names fromRoutes (where the author is looking) instead of a build
    // call three files away.
    checkSegment(`fromRoutes page '${pageId}'`, pageId);
    // Name what the author actually passed: a bare 42 is "got number", while
    // { } is "got undefined" (its `route` is what is missing).
    const route =
      typeof value === 'string' ? value : typeof value === 'object' && value !== null ? value.route : value;
    if (typeof route !== 'string') {
      throw new SkillGraphValidationError(
        `fromRoutes page '${pageId}': route must be a string (got ${typeof route}).`,
      );
    }
    const does = typeof value === 'object' && value !== null ? value.does : undefined;
    // A fresh object per page: a source is a SNAPSHOT value — the author
    // editing their table after the fact must not change what was read.
    pages[pageId] = Object.freeze(does !== undefined ? { route, does } : { route });
  }
  return Object.freeze({ kind: 'routes', pages: Object.freeze(pages) }) as RoutesSource<keyof R & string>;
}
