/**
 * A URL path → the page id that declared it.
 *
 * `route` has been an authored, WRITE-ONLY field since v1: PageDef.route is
 * copied into the compiled page (builder.ts, appmap.ts) and nothing in the
 * library ever reads it back. sync() takes a PAGE ID and looks it up exactly
 * (session.ts sync), so an app whose router speaks '/orders/123' had to write
 * the URL→page mapping a second time, by hand, beside a declaration that
 * already said it — and the two drift the moment someone edits one.
 *
 * This closes that gap WITHOUT touching sync(). The caller composes:
 *
 *   session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
 *
 * The `??` is the point, and the reason this is a function the caller calls
 * rather than a behaviour hidden inside sync(). A path this cannot place
 * returns `undefined` — never a guess, never the nearest page — and the caller
 * hands sync() the raw path, which records it off-graph exactly as it does
 * today. Wired into sync(), that same non-answer would have to be resolved
 * silently, and the one thing worse than an unmapped location is a confident
 * wrong one: every guard, every served edge and every plan downstream is
 * evaluated against the page the cursor believes it is on.
 *
 * SCOPE: the two syntaxes every router agrees on — literal segments and
 * `:param`. Richer vocabularies are not implemented, and the way they fail is
 * the point: `/files/*` is read as the literal segment '*' and therefore
 * matches nothing real, and `/docs/:id?` is read as an ordinary parameter, so
 * it matches '/docs/7' and misses '/docs'. Both MISS where they are not
 * understood. Neither can return a page a literal reading would not have
 * given, which is the only failure direction that is safe here.
 */

/**
 * The least this needs from a page: the route it declared. `SkillGraphSpec['pages']`
 * satisfies it structurally, and so does a hand-built map — reading the whole
 * compiled Page would force a caller to build one just to ask a question about
 * strings.
 */
export type RoutedPages = Record<string, { route?: string }>;

/**
 * A route or path split into comparable segments. Query and hash are cut first
 * — '/cart?coupon=X' and '/cart' are the same place — and empty segments are
 * dropped, which is what makes leading and trailing slashes irrelevant on BOTH
 * sides: '/cart', 'cart' and '/cart/' all normalize to ['cart'].
 *
 * Both sides go through this one function on purpose. A route authored with a
 * trailing slash and a path served without one are the single most common way
 * a hand-written mapping fails, and normalizing only the path would reproduce
 * it here.
 */
function segmentsOf(pathOrRoute: string): string[] {
  const cut = pathOrRoute.search(/[?#]/);
  const bare = cut === -1 ? pathOrRoute : pathOrRoute.slice(0, cut);
  return bare.split('/').filter((segment) => segment.length > 0);
}

/** A `:param` segment matches any ONE segment; its name is never read. */
function isParam(segment: string): boolean {
  return segment.startsWith(':');
}

/**
 * How specifically a route matched, or null when it did not. The count of
 * LITERAL segments is the whole ranking story: two routes only ever compete
 * when they have the same number of segments, so the one that spelled more of
 * them out is the one that describes this path more exactly.
 */
function staticSegmentsMatched(routeSegments: string[], pathSegments: string[]): number | null {
  if (routeSegments.length !== pathSegments.length) return null;
  let literals = 0;
  for (let i = 0; i < routeSegments.length; i++) {
    const segment = routeSegments[i];
    if (isParam(segment)) continue;
    // Case-sensitive, like the routers this mirrors: '/Orders' is not '/orders'.
    if (segment !== pathSegments[i]) return null;
    literals++;
  }
  return literals;
}

/**
 * Find the page whose declared route best describes `urlPath`, or `undefined`.
 *
 * `urlPath` is a PATHNAME ('/orders/123'), not a full URL — an origin would
 * become two leading segments and match nothing, which is the honest outcome
 * for an input this cannot read.
 *
 * Precedence, in order, all three deterministic:
 *   1. most literal segments — '/orders/new' beats '/orders/:id' for '/orders/new';
 *   2. then the longer route string;
 *   3. then the first page declared.
 *
 * Rules 2 and 3 exist to make the answer STABLE, not because a longer pattern
 * or an earlier declaration means more: two routes that reach this point are
 * genuinely ambiguous, and an app that hits it has authored two names for one
 * URL. Stable-and-documented beats correct-looking-and-arbitrary — the same
 * path must resolve to the same page on every call and in every process, or a
 * session's cursor depends on iteration order. (Rule 3 reads the pages object's
 * own key order, which for ordinary page ids is the order they were written.)
 */
export function matchRoute(pages: RoutedPages, urlPath: string): string | undefined {
  const pathSegments = segmentsOf(urlPath);
  let bestId: string | undefined;
  let bestLiterals = -1;
  let bestLength = -1;

  for (const [pageId, page] of Object.entries(pages)) {
    const route = page.route;
    if (typeof route !== 'string') continue; // a page may simply not declare one
    const literals = staticSegmentsMatched(segmentsOf(route), pathSegments);
    if (literals === null) continue;
    if (literals > bestLiterals || (literals === bestLiterals && route.length > bestLength)) {
      bestId = pageId;
      bestLiterals = literals;
      bestLength = route.length;
    }
  }
  return bestId;
}
