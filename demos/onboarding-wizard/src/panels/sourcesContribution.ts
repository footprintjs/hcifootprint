import { buildNavigationGraph, fromRoutes } from 'hcifootprint';
import type { JourneyDef, PageNodeDef } from 'hcifootprint';

/**
 * WHAT THE SOURCES ACTUALLY CONTRIBUTED — computed, never counted by hand.
 *
 * The temptation in a demo like this is to write "2 pages and 2 skills came
 * from the sources" into the page copy. That sentence is a fact about a build,
 * and a fact about a build belongs to the build. Everything below is a set
 * difference over the compiled graph and the literal objects this app owns, so
 * editing routes.ts or pages.ts moves the numbers on screen and nothing else
 * has to be remembered.
 *
 * Two of the fields are LIVE PROBES rather than diffs — small graphs compiled
 * on the spot so the panel can print the library's own refusal instead of the
 * demo's paraphrase of it:
 *   • `withoutSources` compiles the same hand-authored blocks with no sources
 *     at all. It does not compile, and the reason is the point: `done` is a
 *     page only the route table knows about.
 *   • `routeContradiction` asks for one page at two addresses. Drift the merge
 *     exists to make visible, in the library's words.
 */
export interface RouteFact {
  page: string;
  route: string;
}

export type BuildProbe = { compiled: true; pages: string[] } | { compiled: false; refusal: string };

export interface SourcesContribution {
  /** Named on the panel so a reader can check the claim against the code. */
  from: string;
  /** Pages in the compiled graph that no hand-authored block declares. */
  pagesFromSources: string[];
  pagesHandAuthored: string[];
  /** Hand-authored pages that declared no route and inherited one (the courtesy). */
  routesBackfilled: RouteFact[];
  /** Hand-authored pages that spelled their own address out (hand-authored wins). */
  routesDeclaredByHand: RouteFact[];
  /** Journeys in the compiled graph that no hand-authored journey declares. */
  journeysFromSources: string[];
  journeysHandAuthored: string[];
  /** The same hand-authored blocks, compiled with no sources. */
  withoutSources: BuildProbe;
  /** One page declared at two addresses, compiled live. */
  routeContradiction: BuildProbe;
}

/** A page-ish shape: all this needs from a compiled page is the route it carries. */
interface CompiledPages {
  [pageId: string]: { route?: string };
}

function refusalOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Compile something and report which way it went. A probe never throws at the
 * caller: a refusal IS the result it is asking for.
 */
function probe(build: () => { spec: { pages: CompiledPages } }): BuildProbe {
  try {
    return { compiled: true, pages: Object.keys(build().spec.pages) };
  } catch (error) {
    return { compiled: false, refusal: refusalOf(error) };
  }
}

export function describeSourcesContribution(input: {
  /** The graph the app is actually running on. */
  compiled: { spec: { pages: CompiledPages; journeys: Record<string, unknown> } };
  /** The page blocks this app spells out by hand. */
  handPages: Record<string, PageNodeDef>;
  /** Skills this app spells out by hand — none, in this demo. */
  handJourneys?: Record<string, JourneyDef>;
}): SourcesContribution {
  const { compiled, handPages } = input;
  const handJourneys = input.handJourneys ?? {};
  const handPageIds = Object.keys(handPages);
  const handJourneyIds = Object.keys(handJourneys);

  const routesBackfilled: RouteFact[] = [];
  const routesDeclaredByHand: RouteFact[] = [];
  for (const [pageId, handPage] of Object.entries(handPages)) {
    const compiledRoute = compiled.spec.pages[pageId]?.route;
    if (compiledRoute === undefined) continue; // a hand page with no address anywhere
    if (handPage.route === undefined) routesBackfilled.push({ page: pageId, route: compiledRoute });
    else routesDeclaredByHand.push({ page: pageId, route: compiledRoute });
  }

  return {
    from: 'graph.spec.pages / graph.spec.journeys, diffed against pages.ts and journeys.ts',
    pagesFromSources: Object.keys(compiled.spec.pages).filter((id) => !handPageIds.includes(id)),
    pagesHandAuthored: handPageIds,
    routesBackfilled,
    routesDeclaredByHand,
    journeysFromSources: Object.keys(compiled.spec.journeys).filter((id) => !handJourneyIds.includes(id)),
    journeysHandAuthored: handJourneyIds,

    // The load-bearing proof. Same blocks, no sources — and the compiler says
    // why in its own words.
    withoutSources: probe(() =>
      buildNavigationGraph('onboarding-without-sources', { pages: handPages }),
    ),

    // One page, two addresses. Deliberately a tiny throwaway graph: the point
    // is the refusal, and a probe should not need the real app to make it.
    routeContradiction: probe(() =>
      buildNavigationGraph('route-contradiction-probe', {
        sources: [fromRoutes({ review: '/summary' })],
        pages: { review: { route: '/review' } },
      }),
    ),
  };
}
