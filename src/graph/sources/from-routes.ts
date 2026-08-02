/**
 * fromRoutes() — the app's route table becomes page nodes: the spine.
 *
 * Page names are EXPLICIT (the keys of the table). Auto-deriving a name from
 * '/orders/:id' would be a guess, and this library does not guess — the one
 * refusal direction that is always safe is asking the author for the name.
 *
 * A route contributes a PAGE, never an action: the spine is places, not
 * gestures. Reaching a page is actuation-layer work (a url gesture derived
 * from the route) — so by default nothing here emits tools or bindings, and
 * `crossLinks` is the author's EXPLICIT ask for the one action a route table
 * can honestly describe: "go to this address". Places with no way to get to
 * them are not a map; an agent standing on a page whose only offered actions
 * belong to that page will correctly answer "there is no action that takes you
 * to X" and loop. Opt-in, because inventing 28 tools nobody asked for is the
 * other way to be wrong.
 *
 * LEAF MODULE on purpose: value-imports only the shared authoring guards.
 * Importing fromRoutes must never drag session machinery into a bundle.
 */
import { GraphValidationError, checkSegment, isLiteralRoute } from '../guards.js';
import type { PageNodeDef } from '../../tree/types.js';
import type { RoutesSource } from './types.js';

/**
 * Read a route table into a RoutesSource. Two value shapes per page:
 * a bare route string, or `{ route, does }` when the page deserves a label.
 *
 * The `const` type parameter preserves the literal page names, so the compiled
 * graph's session methods accept them as typed node paths.
 *
 * `crossLinks` turns pages into navigation actions offered everywhere else:
 * - `true` — every page in this table whose route is FULLY LITERAL. A blanket
 *   ask meets the literal-address law as a documented FILTER: a ':param' page
 *   is skipped, because the library never guesses what to put in the param and
 *   a half-address is not an address.
 * - a named subset — only those pages, and now every name is answered for: an
 *   unknown name refuses, and a ':param' route refuses. An explicit ask earns
 *   a loud refusal where a blanket one earns a filter.
 *
 * The option is recorded as the REQUEST, not as tools: which pages a link is
 * offered ON is "every page in the effective graph except the target", and the
 * effective graph (this table PLUS the def's hand-authored pages) is a set only
 * mergeSources can see. This factory reads one table and refuses to pretend
 * otherwise.
 */
export function fromRoutes<const R extends Record<string, string | { route: string; does?: string }>>(
  routes: R,
  options?: { crossLinks?: true | readonly (keyof R & string)[] },
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
      throw new GraphValidationError(
        `fromRoutes page '${pageId}': route must be a string (got ${typeof route}).`,
      );
    }
    // A ROUTE TABLE CONTRIBUTES PLACES; ANYTHING ELSE ON A PAGE IS REFUSED,
    // NEVER DROPPED. The type admits `route` and `does` only, so an authored
    // literal cannot carry controls — but this factory's whole reason to exist
    // is the table that DOESN'T come from a literal: a JSON blob, a generated
    // module, a value cast on the way in. Reading two keys and discarding the
    // rest turns "my actions vanished" into a silent, typeless bug found by an
    // agent standing on a page with nothing on it. That is the same failure
    // `authoring-keys.ts` refuses `tools:`/`skills:` to prevent, one door down.
    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        if (key !== 'route' && key !== 'does') {
          throw new GraphValidationError(
            `fromRoutes page '${pageId}': '${key}' is not a key a route table declares — a route ` +
              `contributes a PAGE, never a control. Author actions and journeys on the page in your ` +
              `graph definition (mergeSources composes the two); a route table says only where a page ` +
              `lives ('route') and what to call it ('does').`,
          );
        }
      }
    }
    const does = typeof value === 'object' && value !== null ? value.does : undefined;
    // A fresh object per page: a source is a SNAPSHOT value — the author
    // editing their table after the fact must not change what was read.
    pages[pageId] = Object.freeze(does !== undefined ? { route, does } : { route });
  }
  const crossLinks = options?.crossLinks;
  if (crossLinks !== undefined && crossLinks !== true) {
    // Refused HERE for the same reason page names are: the author is looking
    // at this call, not at a build three files away. Only the NAMED form is
    // answered for — see the option's doc for why `true` filters instead.
    for (const pageId of crossLinks) {
      if (!Object.hasOwn(pages, pageId)) {
        throw new GraphValidationError(
          `fromRoutes crossLinks names '${pageId}', which this route table does not declare. ` +
            `Known pages: ${Object.keys(pages).join(', ')}.`,
        );
      }
      const { route } = pages[pageId];
      if (route !== undefined && !isLiteralRoute(route)) {
        throw new GraphValidationError(
          `fromRoutes crossLinks names '${pageId}', whose route '${route}' has a ':param' segment — ` +
            `a link to it could never be built (the library never guesses params). Drop it from crossLinks, ` +
            `or author a tool that supplies the param.`,
        );
      }
    }
  }
  return Object.freeze({
    kind: 'routes',
    pages: Object.freeze(pages),
    // The REQUEST, snapshotted: a caller's array must not keep steering the
    // graph after it was read (same law as the page table above). Absent when
    // unasked, so a plain fromRoutes() source stays byte-identical.
    ...(crossLinks !== undefined
      ? { crossLinks: crossLinks === true ? true : Object.freeze([...crossLinks]) }
      : {}),
  }) as RoutesSource<keyof R & string>;
}
