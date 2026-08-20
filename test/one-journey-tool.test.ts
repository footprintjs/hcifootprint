/**
 * ONE generic journey tool instead of one per journey — `serveToAgent(session,
 * { journeyTools: 'single' })`.
 *
 * WHY THE OPTION EXISTS, in the numbers that produced it: measured on a 60-page
 * app declaring 57 journeys, the tool array was 79,199 bytes and **85% of it was
 * two authored constants repeated 57 times** — the step input schema and the
 * usage sentence, byte-identical each time. The per-journey information content
 * is the authored `does`: 21–121 bytes of a ~1,331-byte marginal cost. In this
 * mode the array stops depending on how many journeys the app declares.
 *
 * WHY IT IS OPT-IN. Whether a model SELECTS as well from one generic tool plus a
 * list as it does from N named tools is UNMEASURED. So the default is pinned
 * here byte for byte: the first describe block fails if this feature moved a
 * single character of what an existing caller is served.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

/** The usage sentence a journey tool carries, copied here so a reword reddens this file. */
const USAGE_TAIL =
  ' A high-effect step first returns needs-confirm WITH receipts (what it will do and why): show the' +
  ' human, then call again with confirm: true to proceed — or decline: true if they refuse. Steps' +
  ' arrive as DATA in results — they are never separate tools.';

const PER_JOURNEY_USAGE =
  ' Call with no arguments to open this journey and see its ready steps; call again with' +
  " {step: '<name from readySteps>', input: {...}} to perform a step." +
  USAGE_TAIL;

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
        },
      },
    },
    journeys: {
      purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'go-checkout', 'place-order'] },
      browse: { does: 'Look around the catalog', steps: ['add-to-cart'] },
    },
  });
}

function freshSession() {
  const session = shopMap().createSession({ state: { cart: [] }, onWarn: () => undefined });
  session.registerActions('catalog', {
    handlers: { 'add-to-cart': () => undefined, 'go-checkout': () => undefined },
  });
  session.registerActions('checkout', { handlers: { 'place-order': () => undefined } });
  return session;
}

describe('the default is untouched — byte for byte', () => {
  it('serves the same tool array with the option absent as with the option set to per-journey', () => {
    const withoutOption = JSON.stringify(serveToAgent(freshSession()).tools());
    const withOption = JSON.stringify(serveToAgent(freshSession(), { journeyTools: 'per-journey' }).tools());
    expect(withoutOption).toBe(withOption);
  });

  it('still mints one tool per DECLARED journey, with the sentence it always carried', () => {
    const tools = serveToAgent(freshSession()).tools();
    expect(tools.map((tool) => tool.name)).toEqual([
      'shop.journey.purchase',
      'shop.journey.browse',
      'shop.whats_here',
      'shop.why',
      'shop.do_action',
      'shop.did_it_work',
    ]);
    expect(tools[0].description).toBe('Buy a dress end to end' + PER_JOURNEY_USAGE);
  });
});

describe('one tool, and journey discovery moves to the result channel', () => {
  it('replaces the N journey tools with a single <graph>.journey taking a journey id', () => {
    const tools = serveToAgent(freshSession(), { journeyTools: 'single' }).tools();
    expect(tools.map((tool) => tool.name)).toEqual([
      'shop.journey',
      'shop.whats_here',
      'shop.why',
      'shop.do_action',
      'shop.did_it_work',
    ]);
    const schema = tools[0].inputSchema as { properties: Record<string, unknown>; required: string[] };
    // The journey argument PLUS the five a per-journey tool already took — the
    // same rendered schema, so the two doors cannot teach two confirm protocols.
    expect(Object.keys(schema.properties).sort()).toEqual([
      'confirm',
      'decline',
      'input',
      'instance',
      'journey',
      'step',
    ]);
    expect(schema.required).toEqual(['journey']);
    expect(tools[0].description).toContain('Call whats_here first');
    expect(tools[0].description).toContain(USAGE_TAIL.trim());
  });

  it('does not grow when the app declares more journeys — that is the whole point', () => {
    const wide = buildNavigationGraph('shop', {
      pages: { catalog: { actions: { look: { does: 'Look at a dress' } } } },
      journeys: Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => [`flow${index}`, { does: `Flow ${index}`, steps: ['look'] }]),
      ),
    });
    const session = wide.createSession({ onWarn: () => undefined });
    session.registerActions('catalog', { handlers: { look: () => undefined } });

    const single = serveToAgent(session, { journeyTools: 'single' }).tools();
    const perJourney = serveToAgent(session).tools();
    expect(single.length).toBe(5);
    expect(perJourney.length).toBe(34);
    // The narrow claim, in bytes: 30 journeys cost the tool channel nothing here.
    expect(JSON.stringify(single).length).toBeLessThan(JSON.stringify(perJourney).length / 5);
  });

  it('opens a journey and performs its steps through the one tool', () => {
    const session = freshSession();
    const port = serveToAgent(session, { journeyTools: 'single' });

    const opened = port.call('shop.journey', { journey: 'purchase' });
    expect(opened).toMatchObject({ ok: true, journey: 'purchase', frame: 'open' });
    expect((opened['readySteps'] as Array<{ step: string }>).map((row) => row.step)).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
    ]);

    const fired = port.call('shop.journey', { journey: 'purchase', step: 'add-to-cart' });
    expect(fired).toMatchObject({ ok: true, journey: 'purchase' });
    expect(session.transitions().map((row) => row.cause.affordanceId)).toEqual(['catalog.add-to-cart']);
  });

  it('still asks before a high-effect step, and fires on confirm — the gate is not a property of the tool shape', () => {
    const session = freshSession();
    const port = serveToAgent(session, { journeyTools: 'single' });
    port.call('shop.journey', { journey: 'purchase', step: 'add-to-cart' });
    port.call('shop.journey', { journey: 'purchase', step: 'go-checkout' });
    session.sync('checkout');

    const asked = port.call('shop.journey', { journey: 'purchase', step: 'place-order' });
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm', performed: false });

    const done = port.call('shop.journey', { journey: 'purchase', step: 'place-order', confirm: true });
    expect(done['ok']).toBe(true);
  });
});

describe('what the one tool refuses, and how it says so', () => {
  it('a call with no journey is refused JOURNEY_REQUIRED', () => {
    const port = serveToAgent(freshSession(), { journeyTools: 'single' });
    // DELIBERATELY NOT toEqual ANY MORE (1.12.0). This arm used to be three keys
    // and nothing else, so an exact match was the whole shape; it now teaches by
    // name like every other refusal on this port. The three keys a consumer
    // branches on are unchanged to the byte and are still asserted here — what
    // the loosened matcher allows is the correction and the valid set, which is
    // the point of the change.
    expect(port.call('shop.journey', {})).toMatchObject({
      ok: false,
      judgment: 'error',
      reason: 'JOURNEY_REQUIRED',
    });
    expect(port.call('shop.journey', { journey: '' })).toMatchObject({ reason: 'JOURNEY_REQUIRED' });
  });

  it('a journey this app does not declare is refused by NAME, with the ones you can start here', () => {
    const port = serveToAgent(freshSession(), { journeyTools: 'single' });
    expect(port.call('shop.journey', { journey: 'refund' })).toMatchObject({
      ok: false,
      judgment: 'error',
      reason: 'UNKNOWN_JOURNEY',
      journey: 'refund',
      journeys: ['purchase', 'browse'],
      youAreOn: 'catalog',
    });
  });

  it('the old per-journey names are answered UNKNOWN_TOOL with the list that exists — never routed silently', () => {
    const port = serveToAgent(freshSession(), { journeyTools: 'single' });
    const refused = port.call('shop.journey.purchase', {});
    expect(refused).toMatchObject({ reason: 'UNKNOWN_TOOL' });
    expect(refused['tools']).toEqual([
      'shop.journey',
      'shop.whats_here',
      'shop.why',
      'shop.do_action',
      'shop.did_it_work',
    ]);
  });

  it('and in the default mode the single name is not a tool either — a mode is a whole contract', () => {
    const port = serveToAgent(freshSession());
    expect(port.call('shop.journey', { journey: 'purchase' })).toMatchObject({ reason: 'UNKNOWN_TOOL' });
  });
});
