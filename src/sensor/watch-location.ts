/**
 * URL motion → the session's EXISTING observed-navigation path.
 *
 * The sensor does not re-implement route matching, and it must not: a path this
 * library cannot place has exactly one safe answer, and route-match.ts:13-22
 * already wrote it down —
 *
 *     session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
 *
 * the caller hands sync() the raw path, which records it off-graph exactly as it
 * does today. That is what happens here. `sync()` records the hop with
 * `unverifiedEdge: true` (atom/types.ts:495) — the cursor moved without passing a
 * guard, and the ledger says so instead of inferring an authorised edge nobody
 * fired.
 *
 * THIS IS WHY IT IS OPT-IN (`watchLocation: true`), not on by default. Page ids
 * are author-chosen NAMES, not paths (from-routes.ts:4), so in most apps the raw
 * pathname is not a page at all: every hop would land off-graph, the cursor would
 * follow it anyway, and available() would honestly serve nothing from then on.
 * Correct, and catastrophic as a default — the sensor would quietly switch itself
 * and the app's agent surface off. An app that owns a route→page mapping keeps
 * calling `sync(matchRoute(...))` itself. The sensor will not guess your route
 * table, and it will not silently move your cursor to a page you never wrote.
 *
 * WHAT IS WATCHED: `popstate` and `hashchange` — the two motions the browser
 * actually announces. A `history.pushState()` fires no event, and the sensor does
 * not monkey-patch History to manufacture one: reaching into a host global to
 * overwrite its methods is exactly the reach this library forbids itself, and an
 * app that calls pushState is already the one calling its own router.
 */
import type { SensorWindow } from './dom-port.js';
import type { SensorSession } from './types.js';

/**
 * Listen for location motion and report it to the session. Returns the
 * unsubscribe — a no-op when there is no view to listen to, which is the honest
 * answer for a detached document or a non-browser host.
 */
export function watchLocation(
  session: SensorSession,
  view: SensorWindow | undefined,
  onError: (error: unknown) => void,
): () => void {
  if (view === undefined) return () => {};

  const pathOf = (): string | undefined => {
    const path = view.location?.pathname;
    return typeof path === 'string' ? path : undefined;
  };

  // Remember where we started, so the first hop is a CHANGE and not a
  // re-announcement of the page the session was created on.
  let last = pathOf();

  const listener = (): void => {
    try {
      const path = pathOf();
      if (path === undefined || path === last) return;
      last = path;
      session.sync(path);
    } catch (error) {
      // The sensor is a guest inside the app's own event dispatch: a throw here
      // would abort whatever else the page does on popstate.
      onError(error);
    }
  };

  view.addEventListener('popstate', listener);
  view.addEventListener('hashchange', listener);
  return () => {
    view.removeEventListener('popstate', listener);
    view.removeEventListener('hashchange', listener);
  };
}
