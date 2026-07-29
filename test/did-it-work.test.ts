/**
 * Mode B — `did_it_work`, the settled truth over the wire.
 *
 * A REMOTE agent holds a transitionId and nothing else: `whenSettled` is a live
 * promise and cannot cross a tool boundary. Until now the wire carried only the
 * word fire() knew at return time ('pending'), so the final truth — did the app
 * actually do it? — never arrived. The integration that reported this rebuilt
 * it by hand: a transition listener keyed by transitionId, a four-second
 * ceiling, and a rewrite on the relay's send path. A mistyped key waited out
 * the ceiling and then reported a guess.
 *
 * The answer here is a POLL, not a wait: `SkillToolsPort.call` stays
 * synchronous, so an unfinished action is told it is unfinished and a wrong id
 * is refused BY NAME — immediately, in the vocabulary the library already uses.
 *
 * MUTATION PROOFS:
 * - 'a mistyped id is refused BY NAME' — swallow the session's refusal and
 *   answer still-pending instead, and this test fails: that swallow IS the
 *   reported failure mode, reproduced inside the library.
 * - 'the pointer rides ONLY the pending arm' — emit howToSettle unconditionally
 *   and the tour fire (already at rest) sends the model to poll for nothing.
 * - 'no boolean verified when the write was never observed' — emit `verified`
 *   for the 'unobservable' case and a model reading it gets a verified write
 *   nobody ever saw.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type { NavigationGraph, ServeResult, SkillToolsPort } from '../src/index.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: { tools: { 'place-order': { does: 'Place the order', writes: ['orders'] } } },
    },
    skills: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
  });
}

/** A wired app whose handlers do nothing on their own — the tap reports later. */
function wiredPort(handlers?: Record<string, (input?: unknown) => unknown>) {
  const session = shopMap().createSession({
    node: 'catalog',
    state: { cart: [], orders: [] },
    onWarn: () => undefined,
  });
  session.registerToolGroup('catalog', {
    handlers: {
      'add-to-cart': handlers?.['add-to-cart'] ?? (() => undefined),
      'go-checkout': handlers?.['go-checkout'] ?? (() => undefined),
    },
  });
  return { session, port: skillsAsTools(session) };
}

/** Fire through the wire and hand back the id the model would hold. */
function fireThroughWire(port: SkillToolsPort, action: string): { result: ServeResult; id: string } {
  const result = port.call('shop.do_action', { action });
  expect(result['ok']).toBe(true);
  return { result, id: result['transitionId'] as string };
}

// ---------------------------------------------------------------------------
// The tool itself
// ---------------------------------------------------------------------------

describe('did_it_work — the fixed settlement tool', () => {
  it('is in the static array with a single required transitionId', () => {
    const { port } = wiredPort();
    const tool = port.tools().find((candidate) => candidate.name === 'shop.did_it_work')!;
    expect(tool).toBeDefined();
    const schema = tool.inputSchema as {
      properties: Record<string, unknown>;
      required: string[];
      additionalProperties: boolean;
    };
    expect(Object.keys(schema.properties)).toEqual(['transitionId']);
    expect(schema.required).toEqual(['transitionId']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('a blank call is a typed error, never a crash', () => {
    const { port } = wiredPort();
    expect(port.call('shop.did_it_work', {})).toMatchObject({
      ok: false,
      judgment: 'error',
      reason: 'TRANSITION_ID_REQUIRED',
    });
  });
});

// ---------------------------------------------------------------------------
// The three arms
// ---------------------------------------------------------------------------

describe('did_it_work — still running, then settled', () => {
  it('the fire result POINTS at the tool while the answer is pending', () => {
    const { port } = wiredPort();
    const { result } = fireThroughWire(port, 'add-to-cart');
    expect(result['effectStatus']).toBe('pending');
    expect(result['howToSettle']).toContain('shop.did_it_work');
  });

  it('answers still-pending IMMEDIATELY, and names the action so the model can wait on the right thing', () => {
    const { port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({
      ok: true,
      settled: false,
      judgment: 'still-pending',
      did: 'catalog.add-to-cart',
      youAreOn: 'catalog',
    });
    // The honest instruction: this is the ONE moment a model would otherwise
    // re-fire and buy the app a duplicate order.
    expect(String(poll['howToAct'])).toContain('Do NOT perform the action again');
  });

  it('then carries the settled truth: both axes, the produced data, and where you are', async () => {
    const { session, port } = wiredPort({
      'add-to-cart': () => [{ id: 'd6', name: 'Scarlet Cocktail Dress' }],
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    session.updateState({ cart: ['d6'] }); // the app's tap reports reality
    await flush();

    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      ok: true,
      settled: true,
      did: 'catalog.add-to-cart',
      effectStatus: 'performed', // the INVOCATION axis
      outcome: 'committed',
      effectVerified: true, // the STATE axis
      verified: true,
      data: [{ id: 'd6', name: 'Scarlet Cocktail Dress' }],
      youAreOn: 'catalog',
    });
  });

  it('carries the claimed destination of a navigation', async () => {
    const { port } = wiredPort();
    const { id } = fireThroughWire(port, 'go-checkout');
    await flush();
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      settled: true,
      effectStatus: 'performed',
      toNode: 'checkout',
    });
  });

  it('a refusal comes back as the refusal it was, with its reason as CAPPED TEXT', async () => {
    const { port } = wiredPort({
      'add-to-cart': () => {
        throw new Error(`card declined ${'x'.repeat(500)}`);
      },
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    await flush();

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({ settled: true, effectStatus: 'refused', outcome: 'rejected' });
    expect(String(poll['error'])).toContain('card declined');
    expect(String(poll['error']).length).toBeLessThanOrEqual(201); // 200 + the ellipsis
    expect(poll['data']).toBeUndefined(); // a refusal is never planner-visible data
  });

  it('no boolean `verified` when the declared write was never observed', () => {
    // A tour session: nothing is bound, so nothing ran and nothing reported.
    const session = shopMap().createSession({
      node: 'catalog',
      state: { cart: [] },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const port = skillsAsTools(session);
    const { result, id } = fireThroughWire(port, 'add-to-cart');
    // Already at rest — so no pointer to a poll that has nothing new to say.
    expect(result['effectStatus']).toBe('unobservable');
    expect(result['howToSettle']).toBeUndefined();

    const poll = port.call('shop.did_it_work', { transitionId: id });
    expect(poll).toMatchObject({ settled: true, effectStatus: 'unobservable' });
    expect(poll['effectVerified']).toBe('unobservable'); // the honest word survives
    expect(poll).not.toHaveProperty('verified'); // …and nothing truthy stands in for it
  });
});

describe('did_it_work — a wrong id is refused, never soothed', () => {
  it('a mistyped id is refused BY NAME, listing the fires that ARE live', () => {
    const { port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');

    const poll = port.call('shop.did_it_work', { transitionId: 'catalog.add-to-cart#99' });
    expect(poll).toMatchObject({
      ok: false,
      judgment: 'error',
      reason: 'UNKNOWN_TRANSITION',
      youAreOn: 'catalog',
    });
    expect(poll['pending']).toEqual([id]);
  });

  it('a stimulus row is refused too — and the session’s throw never escapes call()', () => {
    const { session, port } = wiredPort();
    const update = session.updateState({ cart: ['pushed'] }, { stimulus: 'push' });
    const id = update.ok ? update.transition.id : '';
    expect(() => port.call('shop.did_it_work', { transitionId: id })).not.toThrow();
    expect(port.call('shop.did_it_work', { transitionId: id })).toMatchObject({
      ok: false,
      reason: 'UNKNOWN_TRANSITION',
    });
  });
});

describe('did_it_work — wire safety', () => {
  it('every arm survives structuredClone: no promise, no live error object', async () => {
    const { session, port } = wiredPort({
      'add-to-cart': () => {
        throw new Error('boom');
      },
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: id }))).not.toThrow();
    await flush();

    const rowsBefore = session.transitions().length;
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: id }))).not.toThrow();
    expect(() =>
      structuredClone(port.call('shop.did_it_work', { transitionId: 'nope#1' })),
    ).not.toThrow();
    // A poll is a READ: asking how it went never moves the world it asks about.
    expect(session.transitions()).toHaveLength(rowsBefore);
  });
});

// ---------------------------------------------------------------------------
// The port's own async door — for a relay holding the port and nothing else
// ---------------------------------------------------------------------------

describe('SkillToolsPort.whenSettled — the hole the field report named', () => {
  it('delegates to the session: the same settlement, with the same laws', async () => {
    const { session, port } = wiredPort();
    const { id } = fireThroughWire(port, 'add-to-cart');
    const viaPort = port.whenSettled(id);

    session.updateState({ cart: ['d6'] });
    expect(await viaPort).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expect(await viaPort).toEqual(await session.settlementOf(id));
  });

  it('never rejects — a refusal arrives as data on the resolved value', async () => {
    const { port } = wiredPort({
      'add-to-cart': () => ({ ok: false, error: 'card declined' }),
    });
    const { id } = fireThroughWire(port, 'add-to-cart');
    const settled = await port.whenSettled(id); // would throw here if it rejected
    expect(settled).toMatchObject({ effectStatus: 'refused', error: 'card declined' });
  });

  it('throws synchronously on an id that can never settle', () => {
    const { port } = wiredPort();
    expect(() => port.whenSettled('nope#1')).toThrow(/no transition 'nope#1'/);
  });
});
