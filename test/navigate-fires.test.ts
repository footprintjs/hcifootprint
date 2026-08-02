/**
 * The `navigate` session option — materialisation stops being handler-or-
 * nothing and becomes a computed answer from the edge's actual gesture.
 *
 * Resolution order (ONE question, answered in handlerFor):
 *   (a) a registry handler wins, byte-identical to before;
 *   (b) else with `navigate` present, an edge whose gesture yields a literal
 *       href — an explicit url binding, else the fully-literal route of the
 *       page it claims to navigate to — synthesizes `() => navigate(href)`;
 *   (c) else undefined → agent fires refuse NOT_MATERIALIZED as always.
 *
 * Mutation proofs: before this change the option did not exist — every agent
 * fire below refused NOT_MATERIALIZED, available() never stamped these edges,
 * and the NOT_MATERIALIZED refusal carried no gesture words.
 */
import { describe, expect, it } from 'vitest';
import { Session, buildNavigationGraph } from '../src/index.js';
import type { NavigationGraphSpec } from '../src/index.js';

function shopDef() {
  return {
    pages: {
      home: {
        actions: {
          // Explicit url gesture.
          'open-cart': { does: 'Open the cart', binding: { kind: 'url', href: '/cart' }, goTo: 'cart' },
          // No binding — the gesture derives from the target page's route.
          'open-checkout': { does: 'Open checkout', goTo: 'checkout' },
          // No binding, but the target's route is paramful — nothing to hand a router.
          'open-order': { does: 'Open an order', goTo: 'order' },
          // A click gesture that also claims navigation — a click is NOT an address.
          'click-away': {
            does: 'Click through to cart',
            binding: { kind: 'element', locator: { role: 'link', name: 'Cart' }, actuation: 'click' },
            goTo: 'cart',
          },
        },
      },
      cart: { route: '/cart' },
      checkout: { route: '/checkout' },
      order: { route: '/orders/:id' },
    },
  } as const;
}

describe('url materialisation through navigate', () => {
  it('an explicit url binding fires for an agent — navigate gets the href, settlement says performed', async () => {
    const seen: string[] = [];
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: (href) => void seen.push(href),
    });
    const fired = session.fire('home.open-cart', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    const settled = await fired.whenSettled;
    expect(settled.effectStatus).toBe('performed');
    expect(seen).toEqual(['/cart']);
    // toNode stays a CLAIM stamped by settlement until sync() confirms.
    expect(settled.transition.toNodeClaimed).toBe(true);
    expect(session.node).toBe('cart');
  });

  it("a binding-less goTo edge derives its gesture from the target page's LITERAL route", async () => {
    const seen: string[] = [];
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: (href) => void seen.push(href),
    });
    const fired = session.fire('home.open-checkout', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(seen).toEqual(['/checkout']); // the route table's own bytes — never re-typed
  });

  it('a paramful target route synthesizes NOTHING — the library never guesses params', () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: () => undefined,
    });
    expect(session.fire('home.open-order', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
    });
  });

  it('click gestures NEVER synthesize — navigate changes only the WORDS of the refusal', () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: () => undefined,
    });
    const refused = session.fire('home.click-away', { source: 'agent' });
    expect(refused).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
      // "This is a click on the Cart link", not "nothing is bound".
      gesture: { kind: 'element', locator: { role: 'link', name: 'Cart' }, actuation: 'click' },
    });
  });

  it('a registered handler WINS over synthesis — resolution order (a) is byte-identical', async () => {
    const calls: string[] = [];
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: (href) => void calls.push(`navigate:${href}`),
    });
    session.registerActions('home', {
      handlers: { 'open-cart': () => void calls.push('handler') },
    });
    const fired = session.fire('home.open-cart', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(calls).toEqual(['handler']); // navigate untouched
  });

  it('a throwing navigate rides the EXISTING failure path — refused, rolled back, cursor walked back', async () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: () => {
        throw new Error('router said no');
      },
      onWarn: () => undefined, // the handler-threw warning is expected here
    });
    const fired = session.fire('home.open-cart', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    const settled = await fired.whenSettled;
    expect(settled.effectStatus).toBe('refused');
    expect(settled.transition.outcome).toBe('rolled-back');
    expect(session.node).toBe('home'); // the claimed hop was honestly walked back
  });

  it('without navigate, bytes are identical to before: the url edge refuses NOT_MATERIALIZED', () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({ node: 'home' });
    expect(session.fire('home.open-cart', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
      gesture: { kind: 'url', href: '/cart' },
    });
  });

  it("user fires are never gated — the app self-reporting its own motion passes untouched", () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({ node: 'home' });
    expect(session.fire('home.click-away', { source: 'user' }).ok).toBe(true);
  });
});

describe("available()'s honesty stamp mirrors the widened question", () => {
  it('navigate arms the flag; url-materialisable edges stamp true, a bare click stamps false', () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      navigate: () => undefined,
    });
    const byId = Object.fromEntries(session.available().edges.map((e) => [e.affordanceId, e]));
    expect(byId['home.open-cart'].materialized).toBe(true); // explicit url gesture
    expect(byId['home.open-checkout'].materialized).toBe(true); // derived literal route
    expect(byId['home.open-order'].materialized).toBe(false); // paramful — cannot
    expect(byId['home.click-away'].materialized).toBe(false); // a click needs a handler
  });

  it('without navigate and without registrations the flag stays dark — pre-change bytes', () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({ node: 'home' });
    for (const edge of session.available().edges) {
      expect(edge.materialized).toBeUndefined();
    }
  });
});

describe('the gap ledger says WHICH wiring is missing', () => {
  it('a NOT_MATERIALIZED refusal rows gestureKind (the kind string, never the object)', () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({ node: 'home' });
    session.fire('home.click-away', { source: 'agent' });
    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'NOT_MATERIALIZED',
      affordanceId: 'home.click-away',
      gestureKind: 'element',
    });
  });

  it("an allowed tour no-op rows gestureKind too — the Phase-1 backlog's wiring hint", () => {
    const session = buildNavigationGraph('shop', shopDef()).createSession({
      node: 'home',
      allowUnmaterializedFires: true,
    });
    session.fire('home.open-cart', { source: 'agent' });
    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'unmaterialized-fire',
      affordanceId: 'home.open-cart',
      gestureKind: 'url',
    });
  });
});

describe('the raw-spec door — the belt behind the three authoring doors', () => {
  it('a hand-built spec cannot smuggle a paramful url binding past materialisation', () => {
    // Session is public and a compiled spec is plain data, so a spec can reach
    // materialisation without EVER passing checkLiteralHref — the compiler,
    // the mount door and the fluent door all gate it, but nothing forces a
    // hand-built spec through any of them. gestureHref re-runs the literal
    // law for exactly this door; this test is the mutation proof that the
    // re-check is load-bearing: without it, the synthesized handler would
    // hand the router '/orders/:id' VERBATIM — a guessed-param navigation
    // laundered as ok:true / performed.
    const spec: NavigationGraphSpec = {
      id: 'raw',
      pages: { home: { id: 'home' } },
      affordances: {
        'open-order': {
          id: 'open-order',
          on: ['home'],
          description: 'Open one order',
          binding: { kind: 'url', href: '/orders/:id' },
          highEffect: false,
          role: 'action',
        },
      },
      journeys: {},
    };
    const seen: string[] = [];
    const session = new Session(spec, { node: 'home', navigate: (href) => void seen.push(href) });

    expect(session.fire('open-order', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
      gesture: { kind: 'url', href: '/orders/:id' },
    });
    expect(seen).toEqual([]); // the router was never handed a guess

    // available() asks the SAME question through the same belt.
    const edge = session.available().edges.find((e) => e.affordanceId === 'open-order');
    expect(edge?.materialized).toBe(false);
  });
});

describe('tab semantics — its own gesture, descriptive in v1', () => {
  function tabbedGraph() {
    return buildNavigationGraph('shop', {
      pages: {
        orders: {
          tabs: {
            open: { actions: { refresh: { does: 'Refresh open orders' } } },
            history: { actions: { export: { does: 'Export order history' } } },
          },
          actions: {
            'show-history': { does: 'Switch to the history tab', binding: { kind: 'tab', target: 'orders.history' } },
          },
        },
      },
    });
  }

  it('a tab gesture materialises ONLY via a registered handler — navigate never synthesizes it', () => {
    const session = tabbedGraph().createSession({ node: 'orders', navigate: () => undefined });
    expect(session.fire('orders.show-history', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
      gesture: { kind: 'tab', target: 'orders.history' },
    });
  });

  it("fire() never writes the PresenceIndex — the app's handler flips tabs, then reports via show()", async () => {
    const session = tabbedGraph().createSession({ node: 'orders' });
    session.show('orders.open'); // the app says: the open tab is the visible one
    // A handler that flips tabs but FORGETS the visibility wire: firing it must
    // not move presence — fire() records, it does not see the screen.
    session.registerActions('orders', { handlers: { 'show-history': () => undefined } });
    const fired = session.fire('orders.show-history', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(session.fire('orders.history.export', { source: 'user', invoke: false })).toMatchObject({
      ok: false,
      reason: 'NODE_NOT_VISIBLE', // still hidden: the fire wrote no visibility
    });
    // …and the honest way: the app's side calls the existing wire afterwards.
    session.show('orders.history');
    expect(session.fire('orders.history.export', { source: 'user', invoke: false }).ok).toBe(true);
  });
});
