import { matchRoute } from 'hcifootprint';

import { normalizePath } from '../app/router.js';

/**
 * THE ONE SEGMENT LAW, round-tripped live.
 *
 * fromRoutes reads the route table into pages; matchRoute reads a URL back to a
 * page id. Both judge a route string with the SAME segment reading — query and
 * hash cut first, empty segments dropped, ':param' matching any one segment
 * without ever reading its name — which is why '/plan', 'plan' and '/plan/'
 * are one place and why the router and the matcher can never disagree about
 * what an address means.
 *
 * The panel lets a visitor type any path and shows precisely what the app would
 * do with it, including the `??` arm: a path matchRoute cannot place is handed
 * to sync() RAW and recorded off-graph. Never the nearest-looking page — a
 * confident wrong cursor poisons every guard and every served edge after it.
 */
export interface UrlProbeReading {
  from: string;
  typed: string;
  /** What this app's router would store it as. */
  normalized: string;
  /** The page matchRoute placed it on, or null. */
  page: string | null;
  /** Exactly what `session.sync(matchRoute(pages, path) ?? path)` would receive. */
  handedToSync: string;
  /** True when the path fell through to the raw arm (recorded off-graph). */
  offGraph: boolean;
}

export function probeUrl(pages: Record<string, { route?: string }>, typed: string): UrlProbeReading {
  const normalized = normalizePath(typed);
  const page = matchRoute(pages, normalized);
  return {
    from: 'matchRoute(graph.spec.pages, path) ?? path',
    typed,
    normalized,
    page: page ?? null,
    handedToSync: page ?? normalized,
    offGraph: page === undefined,
  };
}
