/**
 * The BEFORE/AFTER of growable sources, on the dress shop (Convention 2:
 * examples are mandatory integration tests).
 *
 * BEFORE — the friend's glue: the router's route table RE-TYPED into every
 * page, the journeys RE-TYPED as skills, hand-written subscribe-and-register
 * bookkeeping against the action store, and FAKE do-nothing handlers
 * registered purely to get pure navigations past NOT_MATERIALIZED.
 *
 * AFTER — the app's three descriptions stay with their single owners and the
 * graph READS them: fromRoutes(router.routes) + fromJourneys(app.journeys) +
 * fromLiveStore(app.actionStore), plus the session's `navigate` option. The
 * two builds produce equivalent pages/skills/available() surfaces — and the
 * fake no-op handler CATEGORY is gone: navigations perform through the app's
 * own router.
 *
 * Mutation proof: against pre-change src this file fails at the import
 * (fromLiveStore did not exist) and on every navigate-performed assertion.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromJourneys, fromLiveStore, fromRoutes } from '../../src/index.js';
import type { LiveAction, LiveActionStore, ToolDef } from '../../src/index.js';

// ─── the app's OWN three descriptions (each with exactly one owner) ─────────

/** The ROUTER's table — the single owner of every address. */
const ROUTES = {
  catalog: '/dresses',
  cart: '/cart',
  checkout: '/checkout',
} as const;

/** The app's JOURNEYS — the single owner of "how a purchase goes". */
const JOURNEYS = {
  purchase: {
    does: 'Buy the open dress end to end',
    steps: ['add-to-cart', 'proceed-to-checkout', 'place-order'],
  },
};

/** The app's ACTION STORE — the single owner of live handlers. */
function actionStore(log: string[]): LiveActionStore {
  const actions: LiveAction[] = [
    { node: 'catalog', name: 'add-to-cart', does: 'Add the open dress to the cart', handler: () => void log.push('add-to-cart') },
    { node: 'checkout', name: 'place-order', does: 'Place the order', handler: () => void log.push('place-order') },
  ];
  return { subscribe: () => () => undefined, actions: () => actions.map((a) => ({ ...a })) };
}

// ─── the declared action vocabulary (the graph's own semantic layer) ────────

const PAGE_TOOLS: Record<string, Record<string, ToolDef>> = {
  catalog: {
    'add-to-cart': { does: 'Add the open dress to the cart' },
    'go-to-cart': { does: 'Open the shopping cart', goTo: 'cart' },
  },
  cart: {
    'proceed-to-checkout': { does: 'Proceed to checkout', goTo: 'checkout' },
  },
  checkout: {
    'place-order': { does: 'Place the order' },
  },
};

// ─── BEFORE: everything re-typed + the fake-handler glue ────────────────────

function beforeBuild(log: string[]) {
  const graph = buildNavigationGraph('dress-shop', {
    pages: {
      // Routes RE-TYPED from the router — the drift the merge exists to kill.
      catalog: { route: '/dresses', tools: PAGE_TOOLS.catalog },
      cart: { route: '/cart', tools: PAGE_TOOLS.cart },
      checkout: { route: '/checkout', tools: PAGE_TOOLS.checkout },
    },
    // Journeys RE-TYPED as skills — the second copy of "how a purchase goes".
    skills: {
      purchase: {
        does: 'Buy the open dress end to end',
        steps: ['add-to-cart', 'proceed-to-checkout', 'place-order'],
      },
    },
  });
  const session = graph.createSession({ node: 'catalog' });
  // Hand-written subscribe-and-register bookkeeping…
  session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => void log.push('add-to-cart') } });
  session.registerToolGroup('checkout', { handlers: { 'place-order': () => void log.push('place-order') } });
  // …plus the FAKE no-op handlers, registered ONLY so agent navigations pass
  // NOT_MATERIALIZED — the category this whole packet deletes.
  session.registerToolGroup('catalog', { handlers: { 'go-to-cart': () => undefined } });
  session.registerToolGroup('cart', { handlers: { 'proceed-to-checkout': () => undefined } });
  return { graph, session };
}

// ─── AFTER: a dozen-line build; owners keep their truth ─────────────────────

function afterBuild(log: string[], router: string[]) {
  const graph = buildNavigationGraph('dress-shop', {
    pages: {
      // No routes here — the courtesy inherits each from the route table.
      catalog: { tools: PAGE_TOOLS.catalog },
      cart: { tools: PAGE_TOOLS.cart },
      checkout: { tools: PAGE_TOOLS.checkout },
    },
    sources: [fromRoutes(ROUTES), fromJourneys(JOURNEYS), fromLiveStore(actionStore(log))],
  });
  const session = graph.createSession({
    node: 'catalog',
    navigate: (href) => void router.push(href), // the app's OWN router navigation
  });
  return { graph, session };
}

// ─── the equivalence + the deleted glue ─────────────────────────────────────

describe('dress-shop grown from sources — the before/after', () => {
  it('both builds expose the SAME pages, routes, skills and action surface', () => {
    const before = beforeBuild([]);
    const after = afterBuild([], []);

    expect(Object.keys(after.graph.spec.pages).sort()).toEqual(Object.keys(before.graph.spec.pages).sort());
    for (const id of Object.keys(before.graph.spec.pages)) {
      expect(after.graph.spec.pages[id].route).toBe(before.graph.spec.pages[id].route);
    }
    expect(Object.keys(after.graph.spec.skills)).toEqual(Object.keys(before.graph.spec.skills));
    expect(after.graph.spec.skills.purchase.steps).toEqual(before.graph.spec.skills.purchase.steps);
    expect(after.session.available().edges.map((e) => e.affordanceId).sort()).toEqual(
      before.session.available().edges.map((e) => e.affordanceId).sort(),
    );
  });

  it('the fake no-op nav handlers are GONE — navigations perform through the real router', async () => {
    const log: string[] = [];
    const router: string[] = [];
    const { session } = afterBuild(log, router);

    const fired = session.fire('catalog.go-to-cart', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    const settled = await fired.whenSettled;
    expect(settled.effectStatus).toBe('performed'); // something REAL ran — no laundered no-op
    expect(router).toEqual(['/cart']); // the router's own table supplied the address
    expect(session.node).toBe('cart');
  });

  it('…while WITHOUT navigate the same fire refuses honestly, naming the gesture-shaped gap', () => {
    const graph = buildNavigationGraph('dress-shop', {
      pages: { catalog: { tools: PAGE_TOOLS.catalog }, cart: {} },
      sources: [fromRoutes(ROUTES)],
    });
    const session = graph.createSession({ node: 'catalog' });
    expect(session.fire('catalog.go-to-cart', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED', // exactly what forced the friend's fake handlers
    });
  });

  it('the whole journey runs on the after build: commit → steps → completed, zero fake handlers', async () => {
    const log: string[] = [];
    const router: string[] = [];
    const { session } = afterBuild(log, router);

    // Entry is live-store-bound → the never-trap commit gate passes.
    expect(session.commitSkill('purchase', { source: 'agent' })).toMatchObject({ ok: true });

    const fireAndSettle = async (id: string) => {
      const fired = session.fire(id, { source: 'agent' });
      expect(fired.ok, id).toBe(true);
      if (fired.ok) await fired.whenSettled;
    };
    await fireAndSettle('catalog.add-to-cart'); // real store handler
    await fireAndSettle('catalog.go-to-cart'); // url gesture via navigate
    await fireAndSettle('cart.proceed-to-checkout'); // url gesture via navigate
    await fireAndSettle('checkout.place-order'); // real store handler

    expect(log).toEqual(['add-to-cart', 'place-order']); // the app's handlers, by reference
    expect(router).toEqual(['/cart', '/checkout']); // the router did the navigating
    expect(session.leaveSkill()!.status).toBe('completed');
  });
});
