/**
 * `whats_here` lists the journeys you can START from here — and says how many it
 * left out.
 *
 * THE MEASUREMENT THAT PRODUCED THIS. On a 60-page app declaring 57 journeys,
 * the `journeys` array in every `whats_here` reply grew 382 → 8,651 bytes while
 * the rest of the position block did not move a byte: 100% of the growth, served
 * every turn, describing flows that cannot be started from where the model is.
 *
 * THE SIGNAL IS `entryAvailable`, which the session already computes. NOT
 * `preconditionPassed`: at that same cursor 56 of the 57 journeys passed their
 * precondition (a journey declaring none passes trivially) and 2 had an
 * available entry.
 *
 * AND THE OMISSION IS DISCLOSED. A silently shortened list is a worse failure
 * than a long one — a model that cannot see a journey and is not told one exists
 * concludes the app cannot do it. So the reply carries a count and the way
 * through.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          'add-to-cart': { does: 'Add the selected dress to the cart', writes: ['cart'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: {
        actions: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
          'edit-address': { does: 'Edit the delivery address', writes: ['address'] },
        },
      },
      account: {
        actions: { 'change-password': { does: 'Change the password', writes: ['password'] } },
      },
    },
    journeys: {
      purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'go-checkout', 'place-order'] },
      // Starts on checkout — declared, and not startable from the catalog.
      amend: { does: 'Fix the delivery address', steps: ['edit-address'] },
      // Starts on account — same.
      security: { does: 'Change the password', steps: ['change-password'] },
    },
  });
}

function freshPort() {
  const session = shopMap().createSession({ state: { cart: [] }, onWarn: () => undefined });
  session.registerActions('catalog', {
    handlers: { 'add-to-cart': () => undefined, 'go-checkout': () => undefined },
  });
  session.registerActions('checkout', {
    handlers: { 'place-order': () => undefined, 'edit-address': () => undefined },
  });
  session.registerActions('account', { handlers: { 'change-password': () => undefined } });
  return { session, port: serveToAgent(session) };
}

const journeyIds = (result: Record<string, unknown>): string[] =>
  (result['journeys'] as Array<{ journey: string }>).map((row) => row.journey);

describe('the list is scoped to the position', () => {
  it('lists only the journeys whose first step is available here', () => {
    const { port } = freshPort();
    expect(journeyIds(port.call('shop.whats_here'))).toEqual(['purchase']);
  });

  it('and the list MOVES with the cursor — the same app, a different page, a different list', () => {
    const { session, port } = freshPort();
    session.sync('checkout');
    expect(journeyIds(port.call('shop.whats_here'))).toEqual(['amend']);
    session.sync('account');
    expect(journeyIds(port.call('shop.whats_here'))).toEqual(['security']);
  });

  it('drops a journey whose entry is here but guard-closed — offered means offered', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        catalog: {
          actions: { 'add-to-cart': { does: 'Add to cart', when: { inStock: { eq: true } } } },
        },
      },
      journeys: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
    });
    const session = graph.createSession({ state: { inStock: false }, onWarn: () => undefined });
    session.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });
    const port = serveToAgent(session);
    expect(journeyIds(port.call('shop.whats_here'))).toEqual([]);

    session.updateState({ inStock: true }, { stimulus: 'push' });
    expect(journeyIds(port.call('shop.whats_here'))).toEqual(['purchase']);
  });
});

describe('what it omits, it says', () => {
  it('carries a count of the journeys declared elsewhere, and one sentence naming the way through', () => {
    const { port } = freshPort();
    const here = port.call('shop.whats_here');
    expect(here['journeysElsewhere']).toBe(2);
    expect(here['journeysElsewhereMeans']).toContain('scoped to where you are');
    expect(here['journeysElsewhereMeans']).toContain('routeTo');
  });

  it('says nothing at all when nothing was left out — no empty disclosure on a complete list', () => {
    const { session, port } = freshPort();
    session.sync('account'); // 'security' starts here; the other two do not
    const here = port.call('shop.whats_here');
    expect(here['journeysElsewhere']).toBe(2);

    const narrow = buildNavigationGraph('shop', {
      pages: { catalog: { actions: { look: { does: 'Look at a dress' } } } },
      journeys: { browse: { does: 'Look around', steps: ['look'] } },
    });
    const only = narrow.createSession({ onWarn: () => undefined });
    only.registerActions('catalog', { handlers: { look: () => undefined } });
    const complete = serveToAgent(only).call('shop.whats_here');
    expect(Object.hasOwn(complete, 'journeysElsewhere')).toBe(false);
    expect(Object.hasOwn(complete, 'journeysElsewhereMeans')).toBe(false);
  });

  it('the route it points at actually answers — the hop to a page a journey starts on', () => {
    const { port } = freshPort();
    const routed = port.call('shop.whats_here', { routeTo: 'checkout' });
    expect((routed['routeTo'] as { hops: Array<{ via: string }> }).hops.length).toBeGreaterThan(0);
  });
});

describe('the journey you are INSIDE is always listed', () => {
  it('stays on the list after its entry step is behind you — a flow that vanishes reads as a flow that ended', () => {
    const { session, port } = freshPort();
    port.call('shop.journey.purchase', {}); // open the frame
    port.call('shop.journey.purchase', { step: 'add-to-cart' });
    port.call('shop.journey.purchase', { step: 'go-checkout' });
    session.sync('checkout');

    // 'purchase' starts on catalog and the cursor is on checkout — entry gone,
    // frame open. It is listed, with the standing that says where it stands.
    const here = port.call('shop.whats_here');
    expect(journeyIds(here)).toEqual(['purchase', 'amend']);
    expect(here['journeysElsewhere']).toBe(1);
  });
});

describe('what stays whole', () => {
  it('the app still sees every declared journey — this scopes what the MODEL is served', () => {
    const { session } = freshPort();
    expect(session.availableJourneys().journeys.map((row) => row.id)).toEqual([
      'purchase',
      'amend',
      'security',
    ]);
  });

  it('a listed row is unchanged: journey, does, feasible, standing', () => {
    const { port } = freshPort();
    const rows = port.call('shop.whats_here')['journeys'] as Array<Record<string, unknown>>;
    expect(Object.keys(rows[0]).sort()).toEqual(['does', 'feasible', 'journey', 'standing']);
  });
});
