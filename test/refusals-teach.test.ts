/**
 * A WRONG INPUT FAILS BY NAME, WITH THE CORRECTION ATTACHED — including the
 * four refusals that never got it.
 *
 * `TRANSITION_ID_REQUIRED`, `ACTION_REQUIRED`, `KEY_REQUIRED` and
 * `JOURNEY_REQUIRED` were raised as a bare code and nothing else: no `why`, no
 * correction, no valid set, not even the position every other result on this
 * port carries. A consumer integration reported the consequence — it had to
 * hand-write three sentences of its own prose around one of them before a model
 * could act on it, which is exactly the knowledge this library exists to carry.
 *
 * ADDITIVE, AND PROVEN SO. The three keys a consumer branches on — `ok`,
 * `judgment`, `reason` — are asserted unchanged on every one of the four, and
 * none of them grows a singular `transitionId` (the consent invariant sweeps
 * for that separately).
 *
 * RED PROOF: delete the `why` from any arm and its "teaches" case goes red;
 * delete the valid-value list and the "carries the valid set" case goes red;
 * delete `positionData()` and the position case goes red for that arm.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession, ServeResult } from '../src/index.js';

function shop(): InteractionSession {
  const graph = buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          'add-to-cart': { does: 'Add the open dress to the cart', writes: ['cart.count'] },
          'open-cart': { does: 'Open the cart', goTo: 'cart' },
        },
      },
      cart: { actions: { checkout: { does: 'Check out' } } },
      // A high-effect action, so a card can be open when a refusal is raised.
      settle: { actions: { 'place-order': { does: 'Place the order', confirm: true } } },
    },
    journeys: {
      purchase: { does: 'Buy a dress end to end', steps: ['catalog.add-to-cart'] },
      browse: { does: 'Look around the catalog', steps: ['catalog.add-to-cart'] },
    },
  });
  const session = graph.createSession({ node: 'catalog', onWarn: () => undefined });
  session.registerHandlers({
    group: 'catalog',
    handlers: {
      'catalog.add-to-cart': () => session.updateState({ 'cart.count': 1 }),
      'catalog.open-cart': () => undefined,
    },
  });
  return session;
}

const single = (): ReturnType<typeof serveToAgent> =>
  serveToAgent(shop(), { journeyTools: 'single', source: 'agent' });

describe('the four missing-argument refusals now teach', () => {
  const arms: Array<{ reason: string; call: () => ServeResult }> = [
    { reason: 'JOURNEY_REQUIRED', call: () => single().call('shop.journey', {}) },
    { reason: 'KEY_REQUIRED', call: () => single().call('shop.why', {}) },
    { reason: 'TRANSITION_ID_REQUIRED', call: () => single().call('shop.did_it_work', {}) },
    { reason: 'ACTION_REQUIRED', call: () => single().call('shop.do_action', {}) },
  ];

  it('every one keeps ok:false, judgment:error and its own reason word, byte for byte', () => {
    for (const arm of arms) {
      expect(arm.call()).toMatchObject({ ok: false, judgment: 'error', reason: arm.reason });
    }
  });

  it('every one now carries a why that names the argument and the correction', () => {
    for (const arm of arms) {
      const why = arm.call()['why'];
      expect(typeof why, `${arm.reason} has no why`).toBe('string');
      expect(why as string).toContain('needs to know WHICH');
      expect(why as string).toContain('Nothing was performed');
    }
  });

  it('every one now says where the reader is standing', () => {
    for (const arm of arms) {
      expect(arm.call(), arm.reason).toMatchObject({ youAreOn: 'catalog', version: 0 });
    }
  });

  it('none of them grows a transitionId — nothing ran, so no id was minted', () => {
    for (const arm of arms) expect('transitionId' in arm.call(), arm.reason).toBe(false);
  });

  it('an empty-string argument is refused identically to a missing one', () => {
    expect(single().call('shop.do_action', { action: '' })).toMatchObject({
      reason: 'ACTION_REQUIRED',
      actions: ['catalog.add-to-cart', 'catalog.open-cart'],
    });
    expect(single().call('shop.why', { key: '' })).toMatchObject({ reason: 'KEY_REQUIRED' });
  });
});

describe('and each carries the valid set where one exists', () => {
  it('ACTION_REQUIRED lists what is fireable from here — the same list UNKNOWN_ACTION serves', () => {
    const port = serveToAgent(shop(), { source: 'agent' });
    const bare = port.call('shop.do_action', {});
    const wrong = port.call('shop.do_action', { action: 'refund' });
    expect(bare['actions']).toEqual(['catalog.add-to-cart', 'catalog.open-cart']);
    expect(bare['actions']).toEqual(wrong['actions']);
  });

  it('JOURNEY_REQUIRED lists the journeys startable here — the same list UNKNOWN_JOURNEY serves', () => {
    const port = single();
    const bare = port.call('shop.journey', {});
    const wrong = port.call('shop.journey', { journey: 'refund' });
    expect(bare['journeys']).toEqual(['purchase', 'browse']);
    expect(bare['journeys']).toEqual(wrong['journeys']);
  });

  it('TRANSITION_ID_REQUIRED hands back the open fires — an agent that lost its id recovers', async () => {
    const session = shop();
    const port = serveToAgent(session, { source: 'agent' });
    const done = port.call('shop.do_action', { action: 'add-to-cart' });
    const bare = port.call('shop.did_it_work', {});
    // THE SAME THREE NAMES the wrong-id arm serves. No fourth word was minted
    // for a fact that already has one.
    expect(bare['awaitingSettlement']).toEqual([done['transitionId']]);
    expect(bare['pending']).toEqual([done['transitionId']]);
    expect(bare['awaitingHuman']).toEqual([]);
    const wrong = port.call('shop.did_it_work', { transitionId: 'nope#9' });
    expect(Object.keys(bare).filter((k) => k in wrong)).toEqual(
      expect.arrayContaining(['pending', 'awaitingSettlement', 'awaitingHuman']),
    );
    // …and the id it hands back begins with the action that made it, which is
    // why no action join is served beside it.
    expect(String(bare['awaitingSettlement']).startsWith('catalog.add-to-cart')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('…and the cards a person has not answered, when there are any', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { settle: { actions: { 'place-order': { does: 'Place the order', confirm: true } } } },
    });
    const session = graph.createSession({ node: 'settle', onWarn: () => undefined });
    session.registerHandlers({ group: 'settle', handlers: { 'settle.place-order': () => undefined } });
    const port = serveToAgent(session, { source: 'agent' });
    const asked = port.call('shop.do_action', { action: 'place-order' });
    expect(asked['judgment']).toBe('needs-confirm');
    expect(port.call('shop.did_it_work', {})['awaitingHuman']).toEqual([
      { askId: asked['askId'], action: 'settle.place-order' },
    ]);
  });

  it('KEY_REQUIRED serves NO list, and says out loud that there is none to serve', () => {
    const bare = single().call('shop.why', {});
    expect(bare['keys']).toBeUndefined();
    expect(bare['why']).toContain('No list of valid keys is served here');
    expect(bare['why']).toContain('there is no wrong one');
  });
});

describe('the correction each one names is a move the port will actually accept', () => {
  it('JOURNEY_REQUIRED → the journey it named opens', () => {
    const port = single();
    const listed = (port.call('shop.journey', {})['journeys'] as string[])[0]!;
    expect(port.call('shop.journey', { journey: listed })['ok']).toBe(true);
  });

  it('ACTION_REQUIRED → the action it named fires', () => {
    const port = serveToAgent(shop(), { source: 'agent' });
    const listed = (port.call('shop.do_action', {})['actions'] as string[])[0]!;
    expect(port.call('shop.do_action', { action: listed })['ok']).toBe(true);
  });

  it('TRANSITION_ID_REQUIRED → the id it named answers', () => {
    const port = serveToAgent(shop(), { source: 'agent' });
    port.call('shop.do_action', { action: 'add-to-cart' });
    const listed = (port.call('shop.did_it_work', {})['awaitingSettlement'] as string[])[0]!;
    expect(port.call('shop.did_it_work', { transitionId: listed })['ok']).toBe(true);
  });
});
