/**
 * A JOURNEY THE APP IS NOT READY FOR — refused, or served with the doubt shown.
 *
 * A journey carries a `when`: the app's own statement of what must be true
 * before this flow makes sense at all. Three different things can be true of it
 * at the moment a model reaches for the journey, and a port that collapses them
 * into one word teaches a model to guess:
 *
 * IT IS FALSE — the flow is refused before a frame opens, with the conditions
 * that failed attached. `judgment: 'blocked'` and not `'error'`: nothing is
 * broken, the app simply is not there yet.
 *
 * IT CANNOT BE JUDGED — a precondition key this session's state projection never
 * carried. The journey is still offered (a condition taken on faith is not a
 * condition that failed), and the keys nobody could evaluate ride along by name.
 * A reader can then go seed them, which is a fix; "not feasible" would have been
 * a lie, and silence would have been worse.
 *
 * IT HOLDS, BUT A STEP'S OWN GUARD CANNOT BE JUDGED — the same honesty one level
 * down. The step is offered as ready, carrying the keys that were assumed rather
 * than checked, on the plan AND on the receipt of the fire that follows. Both
 * readers of one edge see the same doubt.
 *
 * The limit: none of this is a promise. `guardUnevaluated` says a condition was
 * taken on faith, never that it would have passed.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

/** A storefront whose purchase journey wants a signed-in shopper. */
function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          'add-to-cart': { does: 'Add the dress to the cart', when: { inStock: { eq: true } }, writes: ['cart'] },
        },
      },
    },
    journeys: {
      purchase: { does: 'Buy the dress', steps: ['catalog.add-to-cart'], when: { signedIn: { eq: true } } },
    },
  });
}

function portFor(state: Record<string, unknown>) {
  const session = shopMap().createSession({ state, onWarn: () => undefined });
  session.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });
  return { session, port: serveToAgent(session) };
}

describe('reaching for a journey whose precondition does not hold', () => {
  it('is blocked rather than errored, with the conditions that failed, and opens no frame', () => {
    const { session, port } = portFor({ signedIn: false, inStock: true, cart: [] });
    const blocked = port.call('shop.journey.purchase', {});

    expect(blocked).toMatchObject({ ok: false, judgment: 'blocked', journey: 'purchase' });
    expect(String(blocked['why'])).toContain('precondition does not hold');
    expect(blocked['evidence']).toEqual([
      expect.objectContaining({ key: 'signedIn', result: false }),
    ]);
    expect(session.journeyFrame()).toBeNull(); // nothing was opened to be left later
    expect(blocked['youAreOn']).toBe('catalog'); // the position rides every answer

    // …and when the app says the shopper signed in, the same call opens the frame.
    session.updateState({ signedIn: true }, { stimulus: 'push' });
    expect(port.call('shop.journey.purchase', {})).toMatchObject({ ok: true, frame: 'open' });
  });
});

describe('a precondition nothing in this session could evaluate', () => {
  it('is still offered — and names the keys it had to take on faith', () => {
    const { port } = portFor({ inStock: true, cart: [] }); // signedIn never projected
    const here = port.call('shop.whats_here', {});

    expect(here['journeys']).toEqual([
      expect.objectContaining({
        journey: 'purchase',
        feasible: true, // taken on faith is not the same as proven false
        feasibilityUnknownFor: ['signedIn'],
      }),
    ]);
  });
});

describe('a step offered while its own condition is unevaluated', () => {
  it('says so on the plan and again on the receipt of the fire — one doubt, both readers', () => {
    const { port } = portFor({ signedIn: true, cart: [] }); // inStock never projected
    const opened = port.call('shop.journey.purchase', {});

    expect(opened['readySteps']).toEqual([
      expect.objectContaining({ step: 'catalog.add-to-cart', guardUnevaluated: ['inStock'] }),
    ]);

    const fired = port.call('shop.journey.purchase', { step: 'add-to-cart' });
    expect(fired).toMatchObject({ ok: true, did: 'catalog.add-to-cart', guardUnevaluated: ['inStock'] });
  });
});
