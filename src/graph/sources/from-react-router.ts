/**
 * fromReactRouter() — the route TREE the app already declared becomes pages.
 *
 * `fromRoutes` reads a FLAT table whose keys are the page names. A router's own
 * configuration is neither: it is nested, its addresses are composed through
 * children, and it carries no names at all. Re-typing it as a flat table is the
 * exact duplication sources exist to delete — and the copy drifts the first time
 * somebody adds a route.
 *
 * NEVER GUESS A NAME — and the line this draws is narrower than it looks.
 * `fromRoutes`' header states the law ("Auto-deriving a name from '/orders/:id'
 * would be a guess, and this library does not guess"), and nothing here softens
 * it. What a fully-static path gets is not a guess but a TRANSCRIPTION: every
 * byte of '/projects/new' → 'projects-new' came out of the app's own route, in
 * order, with one authored separator between segments. Nothing is inferred,
 * nothing is prettified, and the same input always transcribes to the same name.
 * The moment there is nothing to transcribe — a ':param', a '*', an optional
 * '?', or the root's zero segments — the derivation STOPS and the two doors open
 * (see {@link TWO_DOORS}). A name nobody wrote is never invented.
 *
 * PAGES ONLY, like every route reading in this library: a route contributes a
 * PAGE, never a control. The four keys read here are `path`, `index`, `children`
 * and `handle.hcifootprint.{name,does}` — an action-shaped key inside that
 * namespace is REFUSED BY NAME rather than read-and-discarded, the same law
 * `fromRoutes` and `tree/authoring-keys.ts` state at their own doors.
 *
 * DUCK-TYPED ON PURPOSE — {@link RouteObjectLike} is declared HERE, structurally,
 * and this module imports nothing from any router. So a v6-shaped table and a
 * v7-shaped one both walk, a hand-rolled config walks, and the package gains no
 * dependency and needs no `./react-router` subpath for isolation (the `./react`
 * subpath exists because React is a real peer import; this is not).
 * `element`/`Component`/`lazy`/`loader`/`errorElement` are NEVER READ — not
 * ignored after reading: never touched, so a route table whose framework fields
 * are getters is walked without firing one.
 *
 * WHAT IT COSTS: page ids are derived at RUNTIME, so a graph whose spine comes
 * from here has `string` node paths rather than a literal union — there is no
 * literal in the call to read names from, and inventing one at the type level
 * would encode the derivation twice and drift. `fromRoutes` remains the door for
 * a spine you want typed.
 *
 * LEAF MODULE on purpose: value-imports only the shared authoring guards and the
 * matcher's segment law. Importing fromReactRouter must never drag session
 * machinery into a bundle.
 */
import { GraphValidationError, checkCrossLinks, checkSegment, segmentFault } from '../guards.js';
import { isParam } from '../route-match.js';
import type { PageNodeDef } from '../../tree/types.js';
import type { RoutesSource } from './types.js';

/**
 * A route as every React-Router-shaped config writes one — structural, so the
 * real `RouteObject` of v6 and of v7 both satisfy it and neither is imported.
 *
 * Only these four keys are ever read. A router puts much more on a route
 * (`element`, `Component`, `lazy`, `loader`, `action`, `errorElement`, …) and
 * every one of them is about RENDERING, which the graph does not describe; they
 * are left off this type rather than accepted-and-dropped, so what the library
 * reads is legible from the type alone.
 */
export interface RouteObjectLike {
  /** The route's own path — relative to its parent, or absolute if it starts with '/'. */
  path?: string;
  /** True for the route that renders at its parent's address. Folds into the parent's page. */
  index?: boolean;
  /** Nested routes. Their addresses compose through this one's. */
  children?: readonly RouteObjectLike[];
  /**
   * The router's own free-form slot. This library reads exactly one key inside
   * it — `hcifootprint` — and inside THAT, exactly `name` and `does`. Typed
   * `unknown` because it is somebody else's field: every app puts its own things
   * there, and a narrower type would refuse a route table that is perfectly fine.
   */
  handle?: unknown;
}

/** What `handle.hcifootprint` may declare. Anything else is refused BY NAME. */
interface RouteDeclaration {
  /** The page name, when the derivation cannot mint one (or should not). */
  name?: string;
  /** The page's label, exactly as a route table's `does` is. */
  does?: string;
}

/**
 * THE ONE SENTENCE EVERY REFUSAL ENDS WITH. Whatever the reason a name could not
 * be transcribed, the move is the same two doors, in the same words: name it at
 * the call, or declare it on the route the app owns. A reader who learned the
 * refusal once has learned all of them.
 */
const TWO_DOORS =
  `Name it at the call — fromReactRouter(routes, { nameOf: (route, path) => … }) — or declare it on the ` +
  `route your app already owns: handle: { hcifootprint: { name: 'order-detail' } }.`;

/** Why a dynamic address has nothing to transcribe. */
const NO_BYTES_DYNAMIC =
  `a dynamic segment (':param', '*', an optional '?') is not bytes — the address is not known until a URL ` +
  `supplies it, and a page name that changes per URL is not a name`;

/** Why the root has nothing to transcribe. */
const NO_BYTES_ROOT =
  `the root address has no segments at all, so any name for it would be a word this library chose rather ` +
  `than one your app wrote`;

/**
 * The one authored byte the transcription adds. '-' is not on the segment law's
 * reserved list (`. [ ] # / |` — graph/guards.ts), so a joined name is a legal
 * path identity by construction; the derivation still ASKS ({@link segmentFault})
 * rather than assuming, because the reserved characters can also arrive inside a
 * segment the app wrote.
 */
const NAME_JOIN = '-';

/**
 * The keys `handle.hcifootprint` declares — an allowlist, so an action-shaped
 * key ('actions', and the renamed 'tools'/'skills' one door down) is refused BY
 * NAME instead of silently dropped.
 */
const DECLARED_KEYS = new Set(['name', 'does']);

/** One route's address, as composed through the tree, plus whatever it declared. */
interface Candidate {
  /** The canonical absolute address ('/projects/new'), composed through the tree. */
  route: string;
  /** That address's segments, kept from the composition so nothing is re-split. */
  segments: string[];
  /** The name this route DECLARED (nameOf, then handle) — absent means "transcribe it". */
  declared?: string;
  /** The label this route declared, if any. */
  does?: string;
}

export interface ReactRouterOptions {
  /**
   * Name a route the transcription cannot — or override one it can.
   *
   * Called once per route that contributes an ADDRESS (never for a layout route,
   * which is not a place), with the route object itself and the absolute path
   * composed for it. Return a name to use it; return `undefined` to fall through
   * to `handle.hcifootprint.name`, then to the transcription, then to a refusal.
   */
  nameOf?: (route: RouteObjectLike, absolutePath: string) => string | undefined;
  /**
   * Turn these pages into navigation actions offered everywhere else — the same
   * option, the same two stances and the same refusals as
   * {@link fromRoutes}: `true` takes every page of THIS tree whose route is
   * fully literal (a documented FILTER — a ':param' page is skipped, because a
   * half-address is not an address), while a named subset answers for every name
   * (an unknown name refuses, and so does a ':param' route).
   *
   * Names here are PAGE ids — the ones this factory derived or the route
   * declared — not paths, because the graph's own vocabulary is page ids.
   */
  crossLinks?: true | readonly string[];
}

/**
 * Read a router's own route tree into a RoutesSource — a frozen snapshot of the
 * app's truth, pages only.
 *
 * THE DERIVATION, exactly (and it is the whole contract):
 *
 * 1. ADDRESSES COMPOSE THROUGH CHILDREN. A child's `path` extends its parent's
 *    address, unless it starts with '/' — which every router reads as absolute,
 *    so it REPLACES the inherited prefix rather than doubling it. The composed
 *    address is stored canonically ('/projects/new'), which is what `matchRoute`
 *    and the merge read it back as.
 * 2. A LAYOUT ROUTE IS NOT A PLACE. A route with no `path` of its own (and not
 *    an index route) contributes NO page; it only passes its parent's address
 *    down to its children. Declaring `handle.hcifootprint` on one is refused —
 *    a page is an address, and a layout has none of its own.
 * 3. INDEX ROUTES FOLD INTO THEIR PARENT. `index: true` means "renders at my
 *    parent's address", so it contributes that same address — and two routes at
 *    ONE address are ONE page (`path: ''` folds identically, the other spelling
 *    of the same idea). The fold combines their declarations; two folded routes
 *    declaring DIFFERENT names refuse, because that is one place with two names.
 * 4. THE NAME. `nameOf` first (it is the call-site override), then
 *    `handle.hcifootprint.name` (a literal on the route the app owns), then the
 *    TRANSCRIPTION — the address's segments joined with '-', so '/' + no
 *    segments and any dynamic segment are exactly the cases that cannot be
 *    transcribed and refuse instead, naming the path and both doors.
 * 5. NAMES ARE UNIQUE. Two different addresses arriving at one page id refuse,
 *    naming both paths. Never last-wins: a silently-swallowed page is a place an
 *    agent can never be told about.
 *
 * @example
 * ```ts
 * const source = fromReactRouter(app.routes, {
 *   nameOf: (route, path) => (path === '/' ? 'home' : undefined),
 * });
 * ```
 */
export function fromReactRouter(
  routes: readonly RouteObjectLike[],
  opts?: ReactRouterOptions,
): RoutesSource {
  if (!Array.isArray(routes)) {
    throw new GraphValidationError(
      `fromReactRouter: routes must be an array of route objects (got ${typeof routes}) — hand it the same ` +
        `array your router is created with.`,
    );
  }
  const candidates: Candidate[] = [];
  walk(routes, [], candidates, opts?.nameOf);

  // -- fold: two routes at ONE address are ONE page --------------------------
  // A Map, so first-appearance ORDER is kept: page order feeds matchRoute's
  // stable tie-break and the compiled node order, and the honest order for a
  // route tree is the order the app declared it in.
  const folded = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const existing = folded.get(candidate.route);
    if (existing === undefined) {
      folded.set(candidate.route, candidate);
      continue;
    }
    if (candidate.declared !== undefined) {
      if (existing.declared !== undefined && existing.declared !== candidate.declared) {
        throw new GraphValidationError(
          `fromReactRouter: two routes at '${candidate.route}' declare different page names ` +
            `('${existing.declared}' and '${candidate.declared}') — one address is one place, and one place ` +
            `has one name. Keep the name on one of them.`,
        );
      }
      existing.declared = candidate.declared;
    }
    // The label is prose about a place, not its identity: the OUTERMOST
    // declaration wins, deterministic and documented — the same stance the merge
    // takes when a hand-authored journey overrides a sourced one.
    if (existing.does === undefined) existing.does = candidate.does;
  }

  // -- name: declared, else transcribed, else refused ------------------------
  // Null prototype: a page literally named '__proto__' must become a KEY, not a
  // prototype swap — same discipline as the compiler's containers.
  const pages: Record<string, PageNodeDef> = Object.create(null) as Record<string, PageNodeDef>;
  const claimedBy = new Map<string, string>();
  for (const candidate of folded.values()) {
    const pageId = candidate.declared ?? transcribe(candidate.route, candidate.segments);
    const owner = claimedBy.get(pageId);
    if (owner !== undefined) {
      throw new GraphValidationError(
        `fromReactRouter: routes '${owner}' and '${candidate.route}' both name the page '${pageId}' — two ` +
          `places cannot share one name (the second would silently replace the first). ${TWO_DOORS}`,
      );
    }
    claimedBy.set(pageId, candidate.route);
    // A fresh, frozen object per page: a source is a SNAPSHOT value — the app
    // editing its route tree after the read must not change what was read.
    pages[pageId] = Object.freeze(
      candidate.does !== undefined ? { route: candidate.route, does: candidate.does } : { route: candidate.route },
    );
  }

  const crossLinks = opts?.crossLinks;
  checkCrossLinks('fromReactRouter', pages, crossLinks);
  return Object.freeze({
    kind: 'routes',
    pages: Object.freeze(pages),
    // The REQUEST, snapshotted, exactly as fromRoutes records it: a caller's
    // array must not keep steering the graph after it was read. Absent when
    // unasked, so a plain fromReactRouter() source stays byte-identical.
    ...(crossLinks !== undefined
      ? { crossLinks: crossLinks === true ? true : Object.freeze([...crossLinks]) }
      : {}),
  }) as RoutesSource;
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

/**
 * Depth-first, in declaration order, composing addresses down and collecting one
 * candidate per route that contributes an address.
 *
 * The four keys are read by DESTRUCTURING and nothing else is touched — that is
 * what makes "element/lazy/loader are never read" a property rather than a
 * promise.
 */
function walk(
  routes: readonly unknown[],
  parentSegments: string[],
  out: Candidate[],
  nameOf: ReactRouterOptions['nameOf'],
): void {
  for (const [index, entry] of routes.entries()) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new GraphValidationError(
        `fromReactRouter: routes[${index}] is not a route object (got ${entry === null ? 'null' : typeof entry}).`,
      );
    }
    const route = entry as RouteObjectLike;
    // Read as `unknown` and narrowed below: the whole point of a duck-typed door
    // is that nothing typechecked the value on its way in, so the four keys are
    // judged rather than trusted.
    const { path, index: isIndex, children, handle } = route as {
      path?: unknown;
      index?: unknown;
      children?: unknown;
      handle?: unknown;
    };
    if (path !== undefined && typeof path !== 'string') {
      throw new GraphValidationError(
        `fromReactRouter: a route's path must be a string (got ${typeof path}) — a path is an address, not a guess.`,
      );
    }
    if (isIndex !== undefined && typeof isIndex !== 'boolean') {
      throw new GraphValidationError(
        `fromReactRouter: a route's index must be true or false (got ${typeof isIndex}).`,
      );
    }
    if (children !== undefined && !Array.isArray(children)) {
      throw new GraphValidationError(
        `fromReactRouter: a route's children must be an array of route objects (got ${typeof children}).`,
      );
    }
    // Cast, not trust: each of these is the guard directly above, restated for
    // the compiler — which cannot follow a narrowing out of a compound throw.
    const ownPath = path as string | undefined;
    const childRoutes = children as readonly unknown[] | undefined;
    const indexRoute = isIndex === true;
    if (indexRoute && (ownPath !== undefined || childRoutes !== undefined)) {
      throw new GraphValidationError(
        `fromReactRouter: an index route renders at its PARENT's address, so it can carry neither a path nor ` +
          `children — this one carries ${ownPath !== undefined ? `path '${ownPath}'` : 'children'}. Every ` +
          `router refuses the same shape; the graph would have to guess which address it meant.`,
      );
    }
    // ADDRESS COMPOSITION, all three cases in one line: an absolute path
    // REPLACES the inherited prefix (every router reads a leading '/' that way),
    // a relative one extends it, and no path at all — index route or layout —
    // inherits the parent's address unchanged.
    const own = ownPath === undefined ? [] : segmentsOfPattern(ownPath);
    const segments = ownPath !== undefined && ownPath.startsWith('/') ? own : [...parentSegments, ...own];
    // A LAYOUT ROUTE IS NOT A PLACE: no path of its own, not an index route.
    const contributes = indexRoute || ownPath !== undefined;
    const canonical = `/${segments.join('/')}`;
    if (contributes) {
      const declaration = readDeclaration(canonical, handle);
      // `nameOf` is asked about PLACES only, and it is asked FIRST: it is the
      // call-site override, and overriding a name the transcription could have
      // minted is the option's stated second job.
      const named = nameOf?.(route, canonical);
      if (named !== undefined) {
        if (typeof named !== 'string') {
          throw new GraphValidationError(
            `fromReactRouter: nameOf returned a ${typeof named} for route '${canonical}' — return a page name, ` +
              `or undefined to let the route name itself.`,
          );
        }
        checkSegment(`fromReactRouter nameOf for route '${canonical}'`, named);
      }
      const declared = named ?? declaration.name;
      out.push({
        route: canonical,
        segments,
        ...(declared !== undefined ? { declared } : {}),
        ...(declaration.does !== undefined ? { does: declaration.does } : {}),
      });
    } else if (hasDeclaration(handle)) {
      // REFUSED, NEVER DROPPED. A layout route has no address, so a name on it
      // would describe a page that cannot exist — and quietly skipping it is how
      // an author ends up certain they named a page the graph has never heard of.
      throw new GraphValidationError(
        `fromReactRouter: a route with no path of its own is a LAYOUT, not a place — it contributes no page, ` +
          `so the handle.hcifootprint declared on it (at '${canonical}') could never be read. Declare it on the ` +
          `route that has the address, or on that layout's index route.`,
      );
    }
    if (childRoutes !== undefined) walk(childRoutes, segments, out, nameOf);
  }
}

// ---------------------------------------------------------------------------
// Reading one route's declaration
// ---------------------------------------------------------------------------

/** The `hcifootprint` slot of a route's handle, if it declared one at all. */
function slotOf(handle: unknown): unknown {
  if (typeof handle !== 'object' || handle === null || !Object.hasOwn(handle, 'hcifootprint')) return undefined;
  return (handle as { hcifootprint?: unknown }).hcifootprint;
}

/** Presence, not shape — the question a layout route's refusal asks. */
function hasDeclaration(handle: unknown): boolean {
  return slotOf(handle) !== undefined;
}

/**
 * What one route declared about its page, refusing anything else BY NAME.
 *
 * The allowlist stance is `fromRoutes`', for its reason: reading two keys and
 * discarding the rest turns "my actions vanished" into a silent, typeless bug
 * whose first symptom is an agent standing on a page with nothing on it. A route
 * handle is exactly the free-form slot where that would happen — nothing
 * typechecks it, so the refusal is the only thing that can.
 */
function readDeclaration(canonical: string, handle: unknown): RouteDeclaration {
  const slot = slotOf(handle);
  if (slot === undefined) return {};
  if (typeof slot !== 'object' || slot === null || Array.isArray(slot)) {
    throw new GraphValidationError(
      `fromReactRouter: route '${canonical}' declares handle.hcifootprint as a ${
        Array.isArray(slot) ? 'array' : typeof slot
      } — it is an object naming the page: { name, does }.`,
    );
  }
  for (const key of Object.keys(slot)) {
    if (!DECLARED_KEYS.has(key)) {
      throw new GraphValidationError(
        `fromReactRouter: route '${canonical}' declares handle.hcifootprint.${key}, which is not a key a route ` +
          `declares — a route contributes a PAGE, never a control. Author actions and journeys on the page in ` +
          `your graph definition (mergeSources composes the two); a route says only what to call its page ` +
          `('name') and what it does ('does').`,
      );
    }
  }
  const { name, does } = slot as RouteDeclaration;
  if (name !== undefined) {
    if (typeof name !== 'string') {
      throw new GraphValidationError(
        `fromReactRouter: route '${canonical}' declares handle.hcifootprint.name as a ${typeof name} — a page ` +
          `name is a string.`,
      );
    }
    // The compiler's own words, at the factory where the author is looking.
    checkSegment(`fromReactRouter route '${canonical}'`, name);
  }
  if (does !== undefined && typeof does !== 'string') {
    throw new GraphValidationError(
      `fromReactRouter: route '${canonical}' declares handle.hcifootprint.does as a ${typeof does} — a page's ` +
        `label is a string.`,
    );
  }
  return { ...(name !== undefined ? { name } : {}), ...(does !== undefined ? { does } : {}) };
}

// ---------------------------------------------------------------------------
// The transcription
// ---------------------------------------------------------------------------

/**
 * A route PATTERN split into segments.
 *
 * Deliberately NOT `segmentsOf` (route-match.ts): that one reads URLs as well as
 * routes, so it cuts everything from the first '?' — which is a query string in a
 * URL and an OPTIONAL SEGMENT MARKER in a route pattern. Cutting it here would
 * turn '/docs/:id?' into a path this thinks is static and transcribe a name for
 * an address that is not one. A pattern has no query to cut.
 */
function segmentsOfPattern(pattern: string): string[] {
  return pattern.split('/').filter((segment) => segment.length > 0);
}

/**
 * "Every byte of this segment is spelled out." ':param' is judged by the
 * MATCHER's own law ({@link isParam}), so authoring and routing can never
 * disagree about it; '*' (splat) and '?' (optional) are judged here because the
 * matcher does not implement them at all — it reads both as literal bytes that
 * match nothing real, and transcribing a name from bytes no URL will ever carry
 * is precisely the guess this factory refuses.
 */
function isStaticSegment(segment: string): boolean {
  return !isParam(segment) && !segment.includes('*') && !segment.includes('?');
}

/** Transcribe an address into a page name, or refuse naming the path and both doors. */
function transcribe(canonical: string, segments: string[]): string {
  if (segments.length === 0) refuse(canonical, NO_BYTES_ROOT);
  if (!segments.every(isStaticSegment)) refuse(canonical, NO_BYTES_DYNAMIC);
  const name = segments.join(NAME_JOIN);
  if (segmentFault(name) !== undefined) {
    refuse(
      canonical,
      `transcribing its segments gives '${name}', which is not a name this library can use (a name becomes a ` +
        `path identity: it cannot be blank, and '. [ ] # / |' are reserved)`,
    );
  }
  return name;
}

/** One refusal shape, whatever the reason — the doors sentence is byte-identical every time. */
function refuse(canonical: string, because: string): never {
  throw new GraphValidationError(
    `fromReactRouter cannot name the page at route '${canonical}': ${because}. This library does not guess. ` +
      TWO_DOORS,
  );
}
