/**
 * testApp — the headless driver over the real session. Covers both facades
 * (user click / agent Mode B), auto-mount + navigation, the effectVerified drift
 * report (the differentiator), produced data, strict mode, assertions, and the
 * bring-your-own-session mode.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { testApp } from '../src/testing/index.js';
import type { Resolver } from '../src/testing/index.js';
import { shopGraph, shopInitial } from './testing-fixture.js';
import type { ShopState } from './testing-fixture.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const resolvers: Record<string, Resolver<ShopState>> = {
  'add-to-cart': (_payload, { state }) => ({ patch: { cartCount: state.cartCount + 1 } }),
  'place-order': () => ({ patch: { cartCount: 0 }, produced: { orderId: 'ord-1' } }),
};

describe('driving the app the way the human does', () => {
  it('fires, settles, and moves state + cursor through a purchase', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    app.expectOn('catalog');

    await app.user.fire('add-to-cart');
    app.expectState({ cartCount: 1 });
    app.expectAvailable('go-to-cart');

    await app.user.fire('go-to-cart');
    app.expectOn('cart');

    await app.user.fire('checkout');
    app.expectOn('checkout');

    const record = await app.user.fire('place-order');
    app.expectOn('checkout');
    app.expectState({ cartCount: 0 });
    expect(app.report().ok).toBe(true);
    expect(app.session.producedFor(record.id)).toEqual({ orderId: 'ord-1' });
  });

  it('throws on a refused fire, but tryFire surfaces the typed rejection', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    // go-to-cart is guarded on cartCount > 0, which is still 0.
    const result = await app.user.tryFire('go-to-cart');
    app.expectRejected(result, 'GUARD_FAILED');
    await expect(app.user.fire('go-to-cart')).rejects.toThrow(/refused/);
    // the refused fire is recorded as a gap
    expect(app.report().gaps.length).toBeGreaterThan(0);
  });
});

describe('a handler that ran but changed nothing it claimed to — caught in a test', () => {
  it('flags a mock whose delta does not cover the declared writes', async () => {
    const app = testApp<ShopState>(shopGraph(), {
      initialState: shopInitial,
      // add-to-cart DECLARES it writes cartCount, but this mock changes nothing.
      resolvers: { 'add-to-cart': () => ({ patch: { unrelated: 1 } }) },
    });
    await app.user.fire('add-to-cart');
    const report = app.report();
    expect(report.ok).toBe(false);
    expect(report.effectDrift[0].affordanceId).toBe('catalog.add-to-cart');
    expect(report.effectDrift[0].declaredWrites).toContain('cartCount');
    expect(() => app.expectClean()).toThrow(/drift/);
  });

  it('strict mode fails the fire the instant drift appears', async () => {
    const app = testApp<ShopState>(shopGraph(), {
      initialState: shopInitial,
      strict: true,
      resolvers: {}, // no resolver for add-to-cart → empty delta → drift
    });
    await expect(app.user.fire('add-to-cart')).rejects.toThrow(/drift/);
  });
});

describe('driving the app the way the agent does', () => {
  it('drives a journey to completion through the real serving port', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });

    const opened = await app.agent.journey('purchase');
    expect(opened.ok).toBe(true);

    await app.agent.journey('purchase', { step: 'add-to-cart' });
    app.expectState({ cartCount: 1 });
    await app.agent.journey('purchase', { step: 'go-to-cart' });
    app.expectOn('cart');
    await app.agent.journey('purchase', { step: 'checkout' });
    app.expectOn('checkout');

    const needsConfirm = await app.agent.journey('purchase', { step: 'place-order' });
    expect(needsConfirm['judgment']).toBe('needs-confirm');

    const done = await app.agent.journey('purchase', { step: 'place-order', confirm: true });
    expect(done['data']).toEqual({ orderId: 'ord-1' });

    // A final re-entry lets the port observe every step done and close the frame.
    await app.agent.journey('purchase');
    app.expectJourneyCompleted('purchase');
    expect(app.report().ok).toBe(true);
  });

  it('performs a single action via do_action', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    await app.agent.do('add-to-cart');
    app.expectState({ cartCount: 1 });
  });

  it('exposes a FIXED tool array (one per journey + whats_here/do_action)', () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    const names = app.agent.tools().map((t) => t.name);
    expect(names).toContain('shop.journey.purchase');
    expect(names).toContain('shop.whats_here');
    expect(names).toContain('shop.do_action');
  });
});

describe('the world moving under a test, with nobody acting', () => {
  it('records a server push as a stimulus, never blamed on a fire', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    app.stimulus({ cartCount: 3 });
    app.expectState({ cartCount: 3 });
    app.expectAvailable('go-to-cart'); // now unlocked by the pushed state
  });

  it('follows the back button via sync', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: { cartCount: 2 }, resolvers });
    await app.user.fire('go-to-cart');
    app.expectOn('cart');
    app.back('catalog');
    app.expectOn('catalog');
  });

  it('re-mounts before firing after a back() (no stale-mount hang)', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: { cartCount: 2 }, resolvers });
    await app.user.fire('go-to-cart'); // catalog -> cart (mount = cart)
    app.expectOn('cart');
    app.back('catalog'); // cursor moved; catalog actions not yet mounted
    // Firing a catalog action must re-mount first, not hang on a missing handler.
    await app.user.fire('add-to-cart');
    app.expectState({ cartCount: 3 });
    expect(app.report().ok).toBe(true);
  });
});

describe('an action claiming nothing that changes something anyway', () => {
  it('records the change as a stimulus + warns, never misattributing it to another action', async () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            ping: { does: 'Ping — no declared writes' },
            other: { does: 'Other', writes: ['flag'] },
          },
        },
      },
    });
    const app = testApp<{ flag?: boolean }>(graph, {
      initialState: {},
      resolvers: { ping: () => ({ patch: { flag: true } }) },
    });
    await app.user.fire('ping');
    app.expectState({ flag: true });
    expect(app.warnings().some((w) => /declares no writes/.test(w))).toBe(true);
    // 'other' declares writes:['flag'] — it must NOT be credited by inference.
    expect(app.session.transitions().some((t) => t.cause.inferred)).toBe(false);
  });
});

describe('testing the session the app really runs, not a stand-in for it', () => {
  it('wraps a session the consumer wired themselves', async () => {
    const graph = shopGraph();
    const session = graph.createSession({ node: 'catalog', state: { cartCount: 0 } });
    session.registerActions('catalog', {
      handlers: {
        'add-to-cart': () => {
          session.updateState({ cartCount: 1 });
        },
      },
    });
    const app = testApp<ShopState>({ session });
    // BYO mode uses qualified ids (no graph to resolve bare names).
    const result = await app.user.tryFire('catalog.add-to-cart');
    expect(result.ok).toBe(true);
    app.expectState({ cartCount: 1 });
  });

  it('open() on a wrapped session shows the node without inventing handlers for it', async () => {
    const graph = buildNavigationGraph('m', {
      pages: {
        checkout: {
          modals: { confirm: { actions: { 'place-order': { does: 'Place the order' } } } },
          actions: { 'open-confirm': { does: 'Open confirmation' } },
        },
      },
    });
    const session = graph.createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    session.registerActions('checkout.confirm', {
      handlers: { 'place-order': () => undefined },
    });
    const app = testApp({ session });
    // There is no compiled graph on hand here, so open() has no declarations to
    // wire — it makes the node VISIBLE and leaves the wiring to the consumer,
    // which in this mode they have already done themselves.
    app.open('checkout.confirm');
    await app.settled();
    app.expectAvailable('checkout.confirm.place-order');
  });

  it('a BYO session with nothing bound: the agent facade surfaces NOT_MATERIALIZED, the user facade still works', async () => {
    const graph = shopGraph();
    const session = graph.createSession({ node: 'catalog', state: { cartCount: 0 } });
    const app = testApp<ShopState>({ session }); // no registerActions: nothing is wired

    const acted = await app.agent.do('catalog.add-to-cart');
    expect(acted).toMatchObject({ ok: false, judgment: 'rejected', reason: 'NOT_MATERIALIZED' });
    app.expectState({ cartCount: 0 }); // the app never moved

    // The user facade reports the app's OWN motion — never gated. (fireRaw: with
    // nothing bound, the app's own tap is what would settle it.)
    const clicked = app.user.fireRaw('catalog.add-to-cart');
    expect(clicked.ok).toBe(true);
  });
});

describe('the window where a fire is out and its answer has not come back', () => {
  it('fireRaw does not auto-settle, so the pending window is observable', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    const result = app.user.fireRaw('add-to-cart');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settlement).toBe('awaiting-state');
    expect(app.session.pending().length).toBe(1);
    await app.settled();
    expect(app.session.pending().length).toBe(0);
    app.expectState({ cartCount: 1 });
  });
});

describe('a modal opening and releasing, driven from a test', () => {
  it('mounts + shows a modal node that is not auto-mounted', async () => {
    const graph = buildNavigationGraph('m', {
      pages: {
        checkout: {
          modals: {
            confirm: { actions: { 'place-order': { does: 'Place the order', writes: ['placed'] } } },
          },
          actions: { 'open-confirm': { does: 'Open confirmation' } },
        },
      },
    });
    const app = testApp<{ placed?: boolean }>(graph, {
      initialState: {},
      resolvers: { 'place-order': () => ({ patch: { placed: true } }) },
    });
    // The modal's action is not available until it is opened.
    expect(app.session.available().edges.map((e) => e.affordanceId)).not.toContain(
      'checkout.confirm.place-order',
    );
    app.open('checkout.confirm');
    await app.settled();
    app.expectAvailable('checkout.confirm.place-order');
    await app.user.fire('checkout.confirm.place-order');
    app.expectState({ placed: true });
  });

  it('mounts a repeated node under the instance key the app would give it', async () => {
    const graph = buildNavigationGraph('m', {
      pages: {
        orders: {
          modals: {
            row: { repeats: true, actions: { cancel: { does: 'Cancel this order', writes: ['cancelled'] } } },
          },
          actions: { list: { does: 'List orders' } },
        },
      },
    });
    const app = testApp<{ cancelled?: string }>(graph, {
      initialState: {},
      resolvers: { cancel: () => ({ patch: { cancelled: 'ord-57' } }) },
    });
    app.open('orders.row', { instance: 'ord-57' });
    await app.settled();
    // The instance travels with the fire — one parameterized action, N cards.
    await app.user.fire('orders.row.cancel', { instance: 'ord-57' });
    app.expectState({ cancelled: 'ord-57' });
  });

  it('close() on a node that was never opened is a no-op, not a crash', async () => {
    const app = testApp(shopGraph(), { initialState: shopInitial });
    expect(() => app.close('catalog')).not.toThrow();
  });

  it('open() twice then close() fully releases (no orphaned mount)', async () => {
    const graph = buildNavigationGraph('m', {
      pages: {
        checkout: {
          modals: { confirm: { actions: { 'place-order': { does: 'Place the order' } } } },
          actions: { 'open-confirm': { does: 'Open confirmation' } },
        },
      },
    });
    const app = testApp(graph, { initialState: {} });
    app.open('checkout.confirm');
    app.open('checkout.confirm'); // re-open must not orphan the first mount
    await app.settled();
    app.close('checkout.confirm');
    await app.settled();
    // Fully released: the modal's action is gone (an orphaned presence handle would keep it).
    expect(app.session.available().edges.map((e) => e.affordanceId)).not.toContain(
      'checkout.confirm.place-order',
    );
  });
});

describe('what the harness hands back about where the app is right now', () => {
  it('reports the page, the cursor version and a detached copy of the state', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    expect(app.node).toBe('catalog');
    const before = app.version;
    const snapshot = app.state();
    expect(snapshot).toEqual({ cartCount: 0 });

    await app.user.fire('add-to-cart');
    expect(app.state()).toEqual({ cartCount: 1 });
    // DETACHED: the copy taken earlier did not move under the caller's feet.
    expect(snapshot).toEqual({ cartCount: 0 });
    expect(app.version).toBeGreaterThan(before);

    await app.user.fire('go-to-cart');
    expect(app.node).toBe('cart');
  });

  it('runs with no options at all — a graph on its own is a driveable app', async () => {
    const app = testApp(shopGraph());
    expect(app.node).toBe('catalog');
    expect(app.state()).toEqual({});
    const fired = await app.user.tryFire('add-to-cart');
    expect(fired.ok).toBe(true);
  });
});

describe('time under the test writer’s control', () => {
  it('can be set to an instant as well as nudged forward', () => {
    const app = testApp(shopGraph(), { initialState: shopInitial });
    expect(app.clock.now()).toBe(0); // deterministic from the first line
    app.clock.set(1_700_000_000_000);
    expect(app.clock.now()).toBe(1_700_000_000_000);
    app.clock.advance(500);
    expect(app.clock.now()).toBe(1_700_000_000_500);
    app.clock.set(0); // and back, because it is a value, not a ratchet
    expect(app.clock.now()).toBe(0);
  });
});

describe('a secret the test drives with but the record must not keep', () => {
  it('passes redactedKeys through to the session that stores the evidence', () => {
    const app = testApp<ShopState>(shopGraph(), {
      initialState: { cartCount: 2 },
      redactedKeys: ['cartCount'],
    });
    const edge = app.session.available().edges.find((e) => e.affordanceId === 'catalog.go-to-cart');
    // The gate still resolves — the VALUE is what is withheld, never the verdict.
    expect(edge?.evidence?.[0]).toMatchObject({ key: 'cartCount', result: true, redacted: true });
    expect(edge?.evidence?.[0].actualSummary).not.toBe('2');
  });
});

describe('naming a control the way a test writer would say it out loud', () => {
  it('resolves a bare leaf name to the one action that ends with it', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    const fired = await app.user.tryFire('add-to-cart');
    expect(fired.ok && fired.transition.cause.affordanceId).toBe('catalog.add-to-cart');
  });

  it('refuses to GUESS when a bare name would fit two different actions', async () => {
    const graph = buildNavigationGraph('two', {
      pages: {
        draft: { actions: { save: { does: 'Save the draft' } } },
        settings: { actions: { save: { does: 'Save the settings' } } },
      },
    });
    const app = testApp(graph, { initialState: {} });
    // Ambiguous: the harness hands the name through untouched and the session
    // refuses it, rather than picking whichever one it happened to see first.
    const fired = await app.user.tryFire('save');
    expect(fired).toMatchObject({ ok: false, reason: 'UNKNOWN_AFFORDANCE' });
  });

  it('hands a name that matches nothing straight to the session’s refusal', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    const fired = await app.user.tryFire('no-such-control');
    expect(fired).toMatchObject({ ok: false, reason: 'UNKNOWN_AFFORDANCE' });
  });

  it('takes a fully qualified id for an action that declares no writes', () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: { cartCount: 1 }, resolvers });
    expect(() => app.expectAvailable('catalog.go-to-cart')).not.toThrow();
  });
});

describe('the input a control is fired with, and which card it belongs to', () => {
  it('carries payload and instance through all three user doors', async () => {
    const graph = buildNavigationGraph('rows', {
      pages: {
        orders: {
          areas: {
            row: { repeats: true, actions: { rename: { does: 'Rename this order', writes: ['name'] } } },
          },
        },
      },
    });
    const seen: Array<{ payload: unknown; state: unknown }> = [];
    const app = testApp<{ name?: string }>(graph, {
      initialState: {},
      resolvers: {
        rename: (payload, ctx) => {
          seen.push({ payload, state: ctx.state });
          return { patch: { name: (payload as { to: string }).to } };
        },
      },
    });
    app.open('orders.row', { instance: 'ord-1' });
    await app.settled();

    await app.user.fire('rename', { payload: { to: 'first' }, instance: 'ord-1' });
    await app.user.tryFire('rename', { payload: { to: 'second' }, instance: 'ord-1' });
    app.user.fireRaw('rename', { payload: { to: 'third' }, instance: 'ord-1' });
    await app.settled();

    expect(seen.map((s) => (s.payload as { to: string }).to)).toEqual(['first', 'second', 'third']);
    app.expectState({ name: 'third' });
  });
});

describe('the agent asking where it is before it does anything', () => {
  it('answers whats_here through the real serving port', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    const here = await app.agent.whatsHere();
    expect(here.ok).toBe(true);
    expect(JSON.stringify(here)).toContain('add-to-cart');
  });
});

describe('a mock that moves the app somewhere the graph did not say it would', () => {
  it('follows the resolver’s own goTo, the way a router confirming a route does', async () => {
    const graph = buildNavigationGraph('detour', {
      pages: {
        form: { actions: { submit: { does: 'Submit the form', writes: ['sent'] } } },
        thanks: { actions: { done: { does: 'Finish' } } },
      },
    });
    const app = testApp<{ sent?: boolean }>(graph, {
      initialState: {},
      // The graph declares no destination for `submit`; the app's router does.
      resolvers: { submit: () => ({ patch: { sent: true }, goTo: 'thanks' }) },
    });
    await app.user.fire('submit');
    app.expectOn('thanks');
    app.expectAvailable('done');
  });
});

describe('what auto-mounts, and what a test has to open for itself', () => {
  it('mounts pages and areas, skips anything behind a modal, and skips what has no controls', async () => {
    const graph = buildNavigationGraph('nest', {
      pages: {
        home: {
          areas: {
            rail: { actions: { filter: { does: 'Filter the list' } } },
            spacer: {}, //                        an area with no controls at all
          },
          modals: {
            confirm: { areas: { inner: { actions: { yes: { does: 'Yes, do it' } } } } },
          },
          actions: { open: { does: 'Open the confirmation' } },
        },
      },
      actions: { help: { does: 'Open help', on: ['home'] } },
    });
    const app = testApp(graph, { initialState: {} });
    const here = app.session.available().edges.map((e) => e.affordanceId).sort();
    // The page's own action, an action nested in an area, and a root action
    // offered on this page — all live without a line of test setup.
    expect(here).toEqual(['help', 'home.open', 'home.rail.filter']);
    // An area INSIDE a modal is not on screen until the modal is, so it is not
    // mounted: a test that wants it says so, which is the point.
    expect(here).not.toContain('home.confirm.inner.yes');
  });

  it('fires a root action offered on several pages by its own bare name', async () => {
    const graph = buildNavigationGraph('global', {
      pages: {
        home: { actions: { go: { does: 'Go to settings', goTo: 'settings' } } },
        settings: { actions: { back: { does: 'Back home', goTo: 'home' } } },
      },
      actions: {
        help: { does: 'Open help', on: ['home', 'settings'], writes: ['helpOpen'] },
        about: { does: 'Open the about box', on: ['home', 'settings'] },
      },
    });
    const app = testApp<{ helpOpen?: boolean }>(graph, {
      initialState: {},
      resolvers: { help: () => ({ patch: { helpOpen: true } }) },
    });
    await app.user.fire('help');
    app.expectState({ helpOpen: true });
    await app.user.fire('go');
    // Still offered on the second page, and still the same one action.
    await app.user.fire('help');
    expect(app.report().ok).toBe(true);
  });

  it('routes a root action nobody wrote a mock for — a bare name is a whole id here', async () => {
    const graph = buildNavigationGraph('global', {
      pages: { home: { actions: { stay: { does: 'Stay put' } } } },
      // A root action's id has no page prefix, so its id and its short name are
      // the same string — the lookup must not go hunting for a suffix.
      actions: { about: { does: 'Open the about box', on: ['home'] } },
    });
    const app = testApp(graph, { initialState: {} });
    const fired = await app.user.tryFire('about');
    expect(fired.ok).toBe(true);
    expect(app.report().ok).toBe(true); // it declares no writes, so nothing drifted
  });
});

describe('a run that never comes to rest', () => {
  it('gives up with a sentence naming the two ways to cause it, instead of hanging', async () => {
    const graph = buildNavigationGraph('busy', {
      pages: { home: { actions: { poke: { does: 'Poke', writes: ['n'] } } } },
    });
    const session = graph.createSession({ node: 'home', state: { n: 0 }, onWarn: () => undefined });
    const app = testApp({ session });
    let stop = false;
    let n = 0;
    const churn = (): void => {
      if (stop) return;
      session.updateState({ n: ++n }, { stimulus: 'push' });
      void Promise.resolve().then(churn);
    };
    churn();
    try {
      await expect(app.settled()).rejects.toThrow(/did not settle after 60 rounds/);
    } finally {
      stop = true;
      await tick();
    }
  });
});

describe('strict mode on a run where nothing drifted', () => {
  it('lets every fire through — strict fails on drift, not on being strict', async () => {
    const app = testApp<ShopState>(shopGraph(), {
      initialState: shopInitial,
      strict: true,
      resolvers,
    });
    await app.user.fire('add-to-cart');
    await app.user.fire('go-to-cart');
    expect(app.report().ok).toBe(true);
  });
});

describe('the drift report over a session the consumer wired themselves', () => {
  it('names the drifting action even with no graph on hand to read its declaration from', async () => {
    const graph = shopGraph();
    const session = graph.createSession({ node: 'catalog', state: { cartCount: 0 }, onWarn: () => undefined });
    // add-to-cart DECLARES cartCount; this handler moves something else.
    session.registerActions('catalog', {
      handlers: { 'add-to-cart': () => session.updateState({ unrelated: 1 }) },
    });
    const app = testApp<ShopState>({ session });
    await app.user.tryFire('catalog.add-to-cart');

    const report = app.report();
    expect(report.ok).toBe(false);
    expect(report.effectDrift[0].affordanceId).toBe('catalog.add-to-cart');
    // In bring-your-own mode there is no compiled graph to quote the declared
    // writes from, so the list is honestly EMPTY rather than invented.
    expect(report.effectDrift[0].declaredWrites).toEqual([]);
  });
});

describe('a guard the app could not evaluate, reported rather than assumed', () => {
  it('lists the keys a fire was allowed on faith, per transition', async () => {
    const graph = buildNavigationGraph('faith', {
      pages: {
        home: { actions: { act: { does: 'Act', when: { ready: { eq: true } }, writes: ['done'] } } },
      },
    });
    // `ready` is nowhere in the state view — the guard cannot be evaluated, and
    // the library refuses to read that silence as either yes or no.
    const app = testApp<{ done?: number }>(graph, {
      initialState: {},
      resolvers: { act: () => ({ patch: { done: 1 } }) },
    });
    await app.user.fire('act');

    const unevaluated = app.report().unevaluatedGuards;
    expect(unevaluated).toHaveLength(1);
    expect(unevaluated[0]).toMatchObject({ affordanceId: 'home.act', keys: ['ready'] });
    expect(unevaluated[0].transitionId).toMatch(/^home\.act/);
  });
});
