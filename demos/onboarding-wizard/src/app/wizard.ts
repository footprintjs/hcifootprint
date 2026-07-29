import { matchRoute } from 'hcifootprint';

import { buildOnboardingGraph, type OnboardingGraph, type OnboardingSession } from './graph.js';
import { createMountController, type MountController } from './mounts.js';
import { createRouter, type Router } from './router.js';
import { PAGE_ORDER, ROUTES, type WizardPageId } from './routes.js';
import { createWizardStore, type WizardStore } from './store.js';

/**
 * THE WHOLE APP, headless.
 *
 * Everything with behaviour lives here; React is a view over it. That split is
 * why the suite runs in plain node and why a browser can never disagree with a
 * test — both drive the same object.
 *
 * The wiring is four connections, and each one is a sentence:
 *   1. navigate  — the session may perform url gestures through OUR router.
 *   2. store tap — every real state change is reported, so declared writes are
 *                  verified rather than believed.
 *   3. route tap — the router decides which page's handlers are mounted, then
 *                  the cursor is confirmed against the same table.
 *   4. mounts    — one page's handlers at a time (see app/mounts.ts).
 */
export interface WizardApp {
  graph: OnboardingGraph;
  session: OnboardingSession;
  store: WizardStore;
  router: Router;
  mounts: MountController;
  /** Every dev warning the session produced, newest last (the panels render them). */
  warnings(): string[];
  /** Unsubscribe everything and release the mounted group. Idempotent. */
  destroy(): void;
}

export interface WizardAppOptions {
  /** Start somewhere other than '/' (a deep link, a test). */
  initialPath?: string;
  /** Also forward warnings here (the browser console, a test spy). */
  onWarn?: (message: string) => void;
}

/**
 * matchRoute answers with a page id or nothing. Membership against the app's
 * own page list turns that `string | undefined` into a page id this app can
 * actually mount — a real check, not a cast dressed up as one: a route table
 * edited to name a page the app has no component for should fall to the
 * off-graph arm, not throw inside a router callback.
 */
function asPageId(id: string | undefined): WizardPageId | null {
  return id !== undefined && (PAGE_ORDER as string[]).includes(id) ? (id as WizardPageId) : null;
}

export function createWizardApp(opts?: WizardAppOptions): WizardApp {
  const graph = buildOnboardingGraph();
  const store = createWizardStore();
  const router = createRouter(opts?.initialPath ?? ROUTES.welcome.route);
  const warnings: string[] = [];

  const startPage = asPageId(matchRoute(graph.spec.pages, router.path())) ?? 'welcome';

  const session = graph.createSession({
    node: startPage,
    state: store.projected(),
    /**
     * THE OPT-IN, and the reason this app has no fake handlers. Presence of
     * this option is what lets an edge whose gesture yields a literal address
     * — an explicit url binding, else the fully-literal route of the page it
     * claims to navigate to — materialise through the app's own router.
     * Without it, every navigation below would be refused NOT_MATERIALIZED,
     * which is the correct fail-closed answer when nothing can perform them.
     */
    navigate: (href) => {
      router.push(href);
    },
    onWarn: (message) => {
      warnings.push(message);
      opts?.onWarn?.(message);
    },
  });

  const mounts = createMountController(session, store, router);
  mounts.showPage(startPage);

  // 2. The store tap. A full projected snapshot each time: updateState commits
  //    NET changes, so re-reporting unchanged keys costs nothing, while
  //    hand-diffing here would be a second place for the delta to go wrong.
  const offStore = store.subscribe(() => {
    session.updateState(store.projected());
  });

  // 3. The route tap — the composition the library documents, verbatim:
  //    `session.sync(matchRoute(pages, path) ?? path)`. The `??` is the point:
  //    a path this cannot place is handed over RAW and recorded off-graph,
  //    never resolved to the nearest-looking page. A confident wrong cursor is
  //    worse than an unplaced one — every guard and every served edge after it
  //    is evaluated against a page the session only believes it is on.
  const offRouter = router.subscribe((path) => {
    const pageId = asPageId(matchRoute(graph.spec.pages, path));
    // Mounts follow the router first, so the moment the cursor is confirmed
    // the page's own handlers are already the ones standing behind it.
    if (pageId) mounts.showPage(pageId);
    else mounts.clear();
    session.sync(pageId ?? path);
  });

  let destroyed = false;
  return {
    graph,
    session,
    store,
    router,
    mounts,
    warnings: () => [...warnings],
    destroy() {
      if (destroyed) return;
      destroyed = true;
      offStore();
      offRouter();
      mounts.clear();
    },
  };
}
