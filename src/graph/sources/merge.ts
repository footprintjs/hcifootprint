/**
 * mergeSources() — fold a def's declared sources into ONE plain def, BEFORE
 * the compiler's walk. Every existing pass (checkSegment, compileTool,
 * resolveStep, freeze) then runs unchanged on merged input; a def without
 * sources never reaches this module at all.
 *
 * THE DOCUMENTED MERGE ORDER (this module is where it is enforced):
 *
 *   "Pages first (routes then hand-authored, hand-authored wins), journeys
 *    overlay second and may only add, live actions attach last and only bind —
 *    nothing later in the order may remove anything earlier. Routes may also
 *    contribute link tools; hand-authored tools win."
 *
 * (A live source is validated here but contributes NOTHING to the static fold
 * — its whole meaning is attach-time binding, last in the order; the compiler
 * holds it and createSession attaches it per session.)
 *
 * The refusal stances, and why each direction is what it is:
 * - Hand-authored wins per page id, with ONE courtesy: a hand page missing
 *   `route` inherits the source's route — reading the route table so you do
 *   not re-type the address IS the use case. Both declaring DIFFERENT routes
 *   refuses loudly: the same page cannot live at two addresses; that is drift
 *   the merge exists to make visible, not to resolve by picking one.
 * - Route equality is judged by matchRoute's OWN segment reading (segmentsOf /
 *   isParam), never by string bytes — '/cart' and 'cart/' are one place, and a
 *   param's NAME is never read, so '/orders/:id' and '/orders/:orderId' agree.
 *   Routing and matching can never disagree because they share one law.
 * - A hand-authored skill wins over a same-id journey SILENTLY — deterministic
 *   and documented (the same stable-and-documented stance matchRoute takes on
 *   ambiguity), because the def author overriding one journey is ordinary use,
 *   not drift. A hand-authored TOOL beats a same-id crossLinks link for the
 *   same reason: overriding one generated link is ordinary use.
 * - Two sources of the SAME kind colliding on an id refuse loudly — that is
 *   ambiguous AUTHORSHIP, and the library never guesses which owner is right.
 * - Sources contribute pages, skills, and (only when crossLinks asked for them)
 *   root-level link tools; a def without crossLinks passes its tools through
 *   untouched, so "overlay may only add" is structural, not policed.
 *
 * Nothing here mutates the def or any source: the effective def is new at the
 * top level; untouched nested definitions ride through by reference, exactly
 * as safe as handing them to the compiler directly (it clones what it keeps).
 */
import { SkillGraphValidationError, isLiteralRoute } from '../guards.js';
import { isParam, segmentsOf } from '../route-match.js';
import type { JourneyDef, NavigationGraphDef, PageNodeDef, ToolDef } from '../../tree/types.js';

/** One `crossLinks:` ask, held until the effective page set exists (phase 2.5). */
interface CrossLinkRequest {
  /** Which source asked — the refusals below name it the way every other one does. */
  index: number;
  /** `true` = every literal-route page of that table; an array = exactly these. */
  request: true | readonly string[];
  /** The page ids THAT source contributed — the only pages it may link to. */
  pageIds: string[];
}

/**
 * A payload the merge can read as id → definition: a plain non-array object.
 * Unreachable from TypeScript (GraphSource requires the field) and from the
 * factories (they always build a record) — but a JS caller hand-crafting a
 * KNOWN kind must get the library's refusal, not a bare TypeError from
 * Object.entries, and never a primitive's or an array's index keys laundered
 * into ids ({kind:'routes', pages:'x'} would otherwise become a page named
 * '0'). Same fail-closed direction as the unknown-kind arm below.
 */
function isRecordPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Two route strings that mean one place under the matcher's segment law. */
function sameRoute(a: string, b: string): boolean {
  const sa = segmentsOf(a);
  const sb = segmentsOf(b);
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i++) {
    // A param matches a param regardless of name — matchRoute never reads it.
    if (isParam(sa[i]) && isParam(sb[i])) continue;
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

/** Fold `def.sources` into a plain NavigationGraphDef. Consumed only by buildNavigationGraph. */
export function mergeSources(def: NavigationGraphDef): NavigationGraphDef {
  // Null-prototype accumulators, same reason as the compiler's containers:
  // a page/skill literally named '__proto__' must be a key, not a swap.
  // Insertion order is load-bearing — page key order feeds matchRoute's
  // stable tie-break and the compiled node order — so the phases below run
  // in the documented order and overrides reuse the FIRST appearance's slot
  // (JS keeps an existing key's position on reassignment).
  const pages: Record<string, PageNodeDef> = Object.create(null) as Record<string, PageNodeDef>;
  const skills: Record<string, JourneyDef> = Object.create(null) as Record<string, JourneyDef>;
  const crossLinkRequests: CrossLinkRequest[] = [];
  let journeysContributed = false;

  // -- phase 1: sources, in declaration order ---------------------------------
  for (const [index, source] of (def.sources ?? []).entries()) {
    if (!source || typeof source !== 'object') {
      throw new SkillGraphValidationError(`sources[${index}] is not a source object.`);
    }
    if (source.kind === 'routes') {
      if (!isRecordPayload(source.pages)) {
        throw new SkillGraphValidationError(
          `sources[${index}] has kind 'routes' but its pages payload is missing or not a plain object — ` +
            `build it with fromRoutes().`,
        );
      }
      for (const [pageId, page] of Object.entries<PageNodeDef>(source.pages)) {
        if (Object.hasOwn(pages, pageId)) {
          throw new SkillGraphValidationError(
            `sources: page '${pageId}' is declared by two routes sources — ambiguous authorship; keep one owner.`,
          );
        }
        pages[pageId] = page;
      }
      if (source.crossLinks !== undefined) {
        // Same fail-closed door as the payload check above: fromRoutes always
        // hands over `true` or an array, but a hand-crafted source must meet
        // the library's refusal, never a TypeError from the loop in phase 2.5.
        if (source.crossLinks !== true && !Array.isArray(source.crossLinks)) {
          throw new SkillGraphValidationError(
            `sources[${index}] has kind 'routes' but its crossLinks is neither true nor an array of page ` +
              `names — build it with fromRoutes(routes, { crossLinks }).`,
          );
        }
        crossLinkRequests.push({
          index,
          request: source.crossLinks,
          pageIds: Object.keys(source.pages),
        });
      }
    } else if (source.kind === 'journeys') {
      if (!isRecordPayload(source.skills)) {
        throw new SkillGraphValidationError(
          `sources[${index}] has kind 'journeys' but its skills payload is missing or not a plain object — ` +
            `build it with fromJourneys().`,
        );
      }
      journeysContributed = true;
      for (const [skillId, skill] of Object.entries<JourneyDef>(source.skills)) {
        if (Object.hasOwn(skills, skillId)) {
          throw new SkillGraphValidationError(
            `sources: skill '${skillId}' is declared by two journeys sources — ambiguous authorship; keep one owner.`,
          );
        }
        skills[skillId] = skill;
      }
    } else if (source.kind === 'live') {
      // Bind-only and attach-time: nothing to fold. Validated here anyway —
      // the same fail-closed door every source passes — so a hand-crafted
      // {kind:'live'} without attach() dies at build, not at createSession.
      if (typeof source.attach !== 'function') {
        throw new SkillGraphValidationError(
          `sources[${index}] has kind 'live' but no attach() function — build it with fromLiveStore().`,
        );
      }
    } else {
      // Fail closed on a kind this build does not understand (a JS caller, or
      // a source object from a newer release) — silently dropping it would be
      // a graph quietly missing what the author declared.
      throw new SkillGraphValidationError(
        `sources[${index}] has unknown kind '${String((source as { kind?: unknown }).kind)}' — ` +
          `this build understands 'routes', 'journeys' and 'live'.`,
      );
    }
  }

  // -- phase 2: hand-authored pages overlay (hand wins; the one courtesy) -----
  for (const [pageId, handPage] of Object.entries(def.pages ?? {})) {
    const sourced = Object.hasOwn(pages, pageId) ? pages[pageId] : undefined;
    if (!sourced) {
      pages[pageId] = handPage;
      continue;
    }
    if (
      handPage.route !== undefined &&
      sourced.route !== undefined &&
      !sameRoute(handPage.route, sourced.route)
    ) {
      throw new SkillGraphValidationError(
        `page '${pageId}' declares route '${handPage.route}' by hand and '${sourced.route}' from a ` +
          `routes source — one page cannot live at two routes. Drift made visible: fix it at the owner.`,
      );
    }
    pages[pageId] =
      handPage.route === undefined && sourced.route !== undefined
        ? { ...handPage, route: sourced.route } // the courtesy: the address stays owned by the route table
        : handPage;
  }

  // -- phase 2.5: crossLinks — a route table may also contribute LINK TOOLS ---
  // AFTER the page fold, deliberately: a link is offered on "every effective
  // page except the target", and the effective set (sourced pages + the def's
  // hand-authored ones) exists only here. That is the whole reason the source
  // carries the REQUEST instead of finished tools.
  //
  // Nothing new is invented for the link: it is a root-level multi-attach tool
  // exactly as an author would have written it, so every downstream layer —
  // compileTool, the url gesture, handlerFor's navigate synthesis, the gap
  // ledger — sees an ordinary tool and needed no change to serve it.
  const linkTools: Record<string, ToolDef & { on: string | string[] }> = Object.create(null) as Record<
    string,
    ToolDef & { on: string | string[] }
  >;
  for (const { index, request, pageIds } of crossLinkRequests) {
    const named = request !== true;
    for (const pageId of named ? request : pageIds) {
      if (named && !pageIds.includes(pageId)) {
        throw new SkillGraphValidationError(
          `sources[${index}]: crossLinks names '${pageId}', which that routes source does not declare.`,
        );
      }
      const page = pages[pageId];
      const route = page?.route;
      if (typeof route !== 'string' || !isLiteralRoute(route)) {
        // The two stances, one law: an EXPLICIT ask earns a loud refusal (the
        // author named a page that cannot be linked to), a blanket `true` earns
        // a documented filter (it asked for whatever is linkable). fromRoutes
        // already refuses the named case at the factory, where the author is
        // looking; this is the same door for a hand-crafted source.
        if (named) {
          throw new SkillGraphValidationError(
            `sources[${index}]: crossLinks names '${pageId}', whose effective route ` +
              `${typeof route === 'string' ? `'${route}' has a ':param' segment` : 'is missing'} — ` +
              `a link to it could never be built (the library never guesses params).`,
          );
        }
        continue;
      }
      const on = Object.keys(pages).filter((candidate) => candidate !== pageId);
      // The target is the only page there is: nowhere to offer the link. An
      // `on: []` tool would die in the compiler naming a tool the author never
      // wrote, so the link simply does not exist — nothing is hidden, because
      // there was never a page it could have appeared on.
      if (on.length === 0) continue;
      linkTools[`go-to-${pageId}`] = {
        // The agent-facing string stays the AUTHORED class: a source-code
        // constant frame around the table's own `does` (else the page id, also
        // authored). No runtime text ever reaches a description.
        does: `Go to ${page.does ?? pageId}`,
        on,
        // goTo makes the claim (and derives role 'next'); the url binding makes
        // the address exist as BYTES rather than as something to re-derive.
        goTo: pageId,
        binding: { kind: 'url', href: route },
      };
    }
  }
  const contributedLinks = Object.keys(linkTools).length > 0;
  if (contributedLinks) {
    // Hand-authored tools overlay the links and WIN, silently — the journeys
    // precedent: a def that already declares 'go-to-projects' keeps its own.
    for (const [name, tool] of Object.entries(def.tools ?? {})) linkTools[name] = tool;
  }

  // -- phase 3: hand-authored skills overlay (hand wins, silently) ------------
  for (const [skillId, skill] of Object.entries(def.skills ?? {})) {
    skills[skillId] = skill;
  }

  // The effective def drops `sources` (fully consumed here — nothing
  // downstream may be tempted to read them twice) and keeps everything else.
  const { sources: _consumed, ...rest } = def;
  return {
    ...rest,
    pages,
    // Untouched unless crossLinks actually produced something: a def that never
    // asked keeps its own `tools` object, key order and all.
    ...(contributedLinks ? { tools: linkTools } : {}),
    // Preserve "no skills key" when neither the def nor any source spoke —
    // the effective def should look like one the author could have written.
    ...(journeysContributed || def.skills !== undefined ? { skills } : {}),
  };
}
