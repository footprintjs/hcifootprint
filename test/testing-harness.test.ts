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

const resolvers: Record<string, Resolver<ShopState>> = {
  'add-to-cart': (_payload, { state }) => ({ patch: { cartCount: state.cartCount + 1 } }),
  'place-order': () => ({ patch: { cartCount: 0 }, produced: { orderId: 'ord-1' } }),
};

describe('testApp — user facade (human click)', () => {
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

describe('testApp — effectVerified drift (the differentiator)', () => {
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

describe('testApp — agent facade (Mode B)', () => {
  it('drives a skill to completion through the real serving port', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });

    const opened = await app.agent.skill('purchase');
    expect(opened.ok).toBe(true);

    await app.agent.skill('purchase', { step: 'add-to-cart' });
    app.expectState({ cartCount: 1 });
    await app.agent.skill('purchase', { step: 'go-to-cart' });
    app.expectOn('cart');
    await app.agent.skill('purchase', { step: 'checkout' });
    app.expectOn('checkout');

    const needsConfirm = await app.agent.skill('purchase', { step: 'place-order' });
    expect(needsConfirm['judgment']).toBe('needs-confirm');

    const done = await app.agent.skill('purchase', { step: 'place-order', confirm: true });
    expect(done['data']).toEqual({ orderId: 'ord-1' });

    // A final re-entry lets the port observe every step done and close the frame.
    await app.agent.skill('purchase');
    app.expectSkillCompleted('purchase');
    expect(app.report().ok).toBe(true);
  });

  it('performs a single action via do_action', async () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    await app.agent.do('add-to-cart');
    app.expectState({ cartCount: 1 });
  });

  it('exposes a FIXED tool array (one per skill + whats_here/do_action)', () => {
    const app = testApp<ShopState>(shopGraph(), { initialState: shopInitial, resolvers });
    const names = app.agent.tools().map((t) => t.name);
    expect(names).toContain('shop.skill.purchase');
    expect(names).toContain('shop.whats_here');
    expect(names).toContain('shop.do_action');
  });
});

describe('testApp — world stimuli', () => {
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
    app.back('catalog'); // cursor moved; catalog tools not yet mounted
    // Firing a catalog tool must re-mount first, not hang on a missing handler.
    await app.user.fire('add-to-cart');
    app.expectState({ cartCount: 3 });
    expect(app.report().ok).toBe(true);
  });
});

describe('testApp — no-writes action that changes state', () => {
  it('records the change as a stimulus + warns, never misattributing it to another action', async () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
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

describe('testApp — bring-your-own session (integration fidelity)', () => {
  it('wraps a session the consumer wired themselves', async () => {
    const graph = shopGraph();
    const session = graph.createSession({ node: 'catalog', state: { cartCount: 0 } });
    session.registerToolGroup('catalog', {
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
});

describe('testApp — pending window', () => {
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

describe('testApp — modal open()', () => {
  it('mounts + shows a modal node that is not auto-mounted', async () => {
    const graph = buildNavigationGraph('m', {
      pages: {
        checkout: {
          modals: {
            confirm: { tools: { 'place-order': { does: 'Place the order', writes: ['placed'] } } },
          },
          tools: { 'open-confirm': { does: 'Open confirmation' } },
        },
      },
    });
    const app = testApp<{ placed?: boolean }>(graph, {
      initialState: {},
      resolvers: { 'place-order': () => ({ patch: { placed: true } }) },
    });
    // The modal's tool is not available until it is opened.
    expect(app.session.available().edges.map((e) => e.affordanceId)).not.toContain(
      'checkout.confirm.place-order',
    );
    app.open('checkout.confirm');
    await app.settled();
    app.expectAvailable('checkout.confirm.place-order');
    await app.user.fire('checkout.confirm.place-order');
    app.expectState({ placed: true });
  });

  it('open() twice then close() fully releases (no orphaned mount)', async () => {
    const graph = buildNavigationGraph('m', {
      pages: {
        checkout: {
          modals: { confirm: { tools: { 'place-order': { does: 'Place the order' } } } },
          tools: { 'open-confirm': { does: 'Open confirmation' } },
        },
      },
    });
    const app = testApp(graph, { initialState: {} });
    app.open('checkout.confirm');
    app.open('checkout.confirm'); // re-open must not orphan the first mount
    await app.settled();
    app.close('checkout.confirm');
    await app.settled();
    // Fully released: the modal's tool is gone (an orphaned presence handle would keep it).
    expect(app.session.available().edges.map((e) => e.affordanceId)).not.toContain(
      'checkout.confirm.place-order',
    );
  });
});
