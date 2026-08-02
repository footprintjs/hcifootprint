/**
 * MODE B, when a step is somebody else's — the ready bucket splits three ways.
 *
 * A step listed under `readySteps` IS an instruction to fire it. That is the
 * whole reason this split exists: two kinds of step are not the model's to
 * perform, and leaving them in the ready list is the library telling a model to
 * do something it should not. The precedent is `awaitingState` in the same
 * function — "advertising it would instruct the model to double-fire" — applied
 * to the two holds a person is on the other end of.
 *
 * DISCLOSURE, NOT ENFORCEMENT, and this suite pins the second half as hard as
 * the first: `fire()` still accepts every one of these steps for every
 * principal, no refusal word was minted, and the gap ledger gained nothing. An
 * agent that fills a human's decision is DISCLOSED — in the book, in the
 * transitions log, and on the row it read before it fired.
 *
 * MUTATION PROOFS (each one run, and the counts are what it actually did):
 * - Leave a humanDecides step in `readySteps` → 3 red (the bucket, the judgment,
 *   the means-sentence).
 * - Leave an ask-held step in `readySteps` → 2 red.
 * - Drop a `made: true` row out of `withTheHuman` → 1 red (the resumption cue).
 * - Emit `withTheHumanMeans` unconditionally → 1 red.
 * - Drop the `laterSteps` stamp → 1 red (a blocked decision tells one story).
 * - Re-derive `standing` in the serve layer → 1 red (the two doors).
 * - Refuse an agent fire of a humanDecides control → 2 red (test 28).
 * - Add a tool, or a schema property, for any of it → 1 red (the cache law).
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { GapRecord, Principal } from '../src/index.js';
import {
  ADDRESS,
  CHOOSE,
  PLACE,
  SHIPPING_ABOUT,
  checkout,
  checkoutSession,
  performed,
  seeded,
} from './human-decisions-fixture.js';

/** Address done — so the chooser is the step actually in play. */
function atTheChooser(session: ReturnType<typeof checkoutSession>): void {
  session.commitJourney('buy', { source: 'agent' });
  performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
}

describe('a step whose card is open leaves readySteps', () => {
  it('it moves to awaitingHuman with the card’s id, and comes back when the card closes', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    atTheChooser(session);
    performed(session, CHOOSE, { 'checkout.shipping': 'express' });
    const port = serveToAgent(session);

    // Before any card: the step is fireable and advertised as such.
    expect(steps(port.call('shop.journey.buy')['readySteps'])).toEqual([PLACE]);

    const { askId } = session.confirmAsk(PLACE, { source: 'agent' });
    const held = port.call('shop.journey.buy');
    expect(steps(held['readySteps'])).toEqual([]);
    expect(held['awaitingHuman']).toEqual([{ askId, step: PLACE }]);

    // The default mode's decline closes the card; the step is fireable again.
    session.declineConfirm(PLACE, { principal: 'user' });
    const after = port.call('shop.journey.buy');
    expect(steps(after['readySteps'])).toEqual([PLACE]);
    expect(Object.hasOwn(after, 'awaitingHuman')).toBe(false);
  });
});

describe('a step whose decision is the human’s never enters readySteps', () => {
  it('it is listed under withTheHuman, with the made-state as data', () => {
    const session = checkoutSession();
    atTheChooser(session);
    const port = serveToAgent(session);

    const result = port.call('shop.journey.buy');
    expect(steps(result['readySteps'])).toEqual([]);
    expect(result['withTheHuman']).toEqual([
      { step: CHOOSE, made: false, about: SHIPPING_ABOUT },
    ]);
  });

  it('a made: true row STAYS listed — the row itself is the resumption cue', () => {
    const session = checkoutSession();
    atTheChooser(session);
    // The person answered in the app; nothing fired the step.
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });
    const port = serveToAgent(session);

    expect(port.call('shop.journey.buy')['withTheHuman']).toEqual([
      { step: CHOOSE, made: true, about: SHIPPING_ABOUT },
    ]);
    // The answer unblocked the NEXT step, which is ordinary progress — and the
    // chooser itself is still the person's, so it is still not advertised.
    expect(steps(port.call('shop.journey.buy')['readySteps'])).toEqual([PLACE]);
  });

  it('the human’s own sensed click completes the step and empties the list — no library act', () => {
    const session = checkoutSession();
    atTheChooser(session);
    const port = serveToAgent(session);
    expect(port.call('shop.journey.buy')['withTheHuman']).toHaveLength(1);

    // Exactly what the DOM sensor does: a record-only fire stamped 'user', then
    // the app's own state report naming it.
    performed(session, CHOOSE, { 'checkout.shipping': 'express' });

    const after = port.call('shop.journey.buy');
    expect(Object.hasOwn(after, 'withTheHuman')).toBe(false);
    expect(Object.hasOwn(after, 'withTheHumanMeans')).toBe(false);
    expect(steps(after['readySteps'])).toEqual([PLACE]);
  });

  it('a declaration with no about serves a row without one — the row stays lean', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: {
            'choose-plan': { does: 'Choose a plan', humanDecides: { doneWhen: { plan: { ne: '' } } } },
          },
        },
      },
      journeys: { pick: { does: 'Pick a plan', steps: ['choose-plan'] } },
    });
    const session = graph.createSession({ node: 'checkout', state: { plan: '' }, onWarn: () => undefined });
    session.registerActions('checkout', { handlers: { 'choose-plan': () => undefined } });

    expect(serveToAgent(session).call('shop.journey.pick')['withTheHuman']).toEqual([
      { step: 'checkout.choose-plan', made: false },
    ]);
  });

  it('an inferred completion empties it too — done is done, however it was learned', () => {
    const session = checkoutSession();
    atTheChooser(session);
    session.updateState({ 'checkout.shipping': 'express' }); // matched by signature
    expect(session.journeyPlan('buy').steps[1].status).toBe('inferred-done');

    const port = serveToAgent(session);
    expect(Object.hasOwn(port.call('shop.journey.buy'), 'withTheHuman')).toBe(false);
  });
});

describe('withTheHumanMeans — one authored sentence, exactly when the list is there', () => {
  it('rides with a non-empty list and is absent otherwise', () => {
    const session = checkoutSession();
    atTheChooser(session);
    const port = serveToAgent(session);

    const held = port.call('shop.journey.buy');
    expect(held['withTheHumanMeans']).toContain('the human’s to decide');
    expect(held['withTheHumanMeans']).toContain('made: true');

    performed(session, CHOOSE, { 'checkout.shipping': 'express' });
    expect(Object.hasOwn(port.call('shop.journey.buy'), 'withTheHumanMeans')).toBe(false);
  });

  it('it is authored — it carries no app text and promises no gate', () => {
    const session = checkoutSession();
    atTheChooser(session);
    const means = serveToAgent(session).call('shop.journey.buy')['withTheHumanMeans'] as string;
    expect(means).not.toContain(SHIPPING_ABOUT);
    expect(means).not.toContain('express');
    expect(means).not.toContain('refused');
  });
});

describe('a decision that is not the person’s turn YET stays in laterSteps, stamped', () => {
  it('a blocked decision carries the stamp on the plan row and on the served row', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: {
            'enter-address': { does: 'Enter the delivery address', writes: ['checkout.address'] },
            'choose-shipping-speed': {
              does: 'Choose a shipping speed',
              when: { 'checkout.address': { ne: '' } },
              writes: ['checkout.shipping'],
              humanDecides: { about: SHIPPING_ABOUT, doneWhen: { 'checkout.shipping': { ne: '' } } },
            },
          },
        },
      },
      journeys: { buy: { does: 'Buy', steps: ['enter-address', 'choose-shipping-speed'] } },
    });
    const session = graph.createSession({
      node: 'checkout',
      state: { 'checkout.address': '', 'checkout.shipping': '' },
      onWarn: () => undefined,
    });
    session.registerActions('checkout', {
      handlers: { 'enter-address': () => undefined, 'choose-shipping-speed': () => undefined },
    });
    session.commitJourney('buy', { source: 'agent' });

    // The stamp rides the PLAN row, which is where the serve layer reads it.
    const planned = session.journeyPlan('buy').steps.find((step) => step.affordanceId === CHOOSE);
    expect(planned).toMatchObject({ status: 'blocked', humanDecides: true });

    const later = serveToAgent(session).call('shop.journey.buy')['laterSteps'] as Array<
      Record<string, unknown>
    >;
    expect(later).toEqual([{ step: CHOOSE, status: 'blocked', humanDecides: true }]);
  });

  it('an undeclared later step carries NO key — presence, all the way down', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    const later = serveToAgent(session).call('shop.journey.buy')['laterSteps'] as Array<
      Record<string, unknown>
    >;
    expect(later).toEqual([{ step: PLACE, status: 'blocked' }]);
  });
});

describe('both doors, one derivation', () => {
  it('whats_here rows carry the standing and the stamp, and agree with the journey tool', () => {
    const session = checkoutSession();
    atTheChooser(session);
    const port = serveToAgent(session);

    const here = port.call('shop.whats_here');
    expect(here['journeys']).toEqual([
      { journey: 'buy', does: 'Buy what is in the cart', feasible: true, standing: 'with-the-human' },
    ]);
    const rows = here['actions'] as Array<Record<string, unknown>>;
    expect(rows.find((row) => row['action'] === CHOOSE)).toMatchObject({ humanDecides: true });
    expect(Object.hasOwn(rows.find((row) => row['action'] === ADDRESS)!, 'humanDecides')).toBe(false);

    // ONE word for one chain, in one state — from one call.
    expect(port.call('shop.journey.buy')['standing']).toBe('with-the-human');
    expect(session.journeyStanding('buy').standing).toBe('with-the-human');
  });

  it('judgment and standing coexist: navigate-or-wait beside with-the-human', () => {
    const session = checkoutSession();
    atTheChooser(session);
    const result = serveToAgent(session).call('shop.journey.buy');
    // Two questions, two answers: "what is my move this turn" and "where does
    // this chain stand". Nothing is fireable, and nothing has gone wrong.
    expect(result['judgment']).toBe('navigate-or-wait');
    expect(result['standing']).toBe('with-the-human');
    expect(result['ok']).toBe(true);
  });

  it('a completed journey answers done through both doors', () => {
    const session = checkoutSession();
    atTheChooser(session);
    performed(session, CHOOSE, { 'checkout.shipping': 'express' });
    performed(session, PLACE, { orderId: 'o-1' });
    const port = serveToAgent(session);
    const result = port.call('shop.journey.buy');
    expect(result).toMatchObject({ frame: 'completed', judgment: 'done', standing: 'done' });
  });
});

describe('the tool array is untouched — the Mode B cache law', () => {
  it('byte-identical with and without a single declaration', () => {
    const declared = serveToAgent(checkoutSession()).tools();
    const twin = serveToAgent(checkoutSession({ graph: checkout({ declare: false }) })).tools();
    expect(JSON.stringify(declared)).toBe(JSON.stringify(twin));
    expect(JSON.stringify(declared)).not.toContain('humanDecides');
    expect(JSON.stringify(declared)).not.toContain('with-the-human');
  });
});

describe('v1 is disclosure — every fire still lands, and no refusal word was minted', () => {
  it('a humanDecides control fires for every principal', () => {
    for (const source of ['user', 'agent', 'system'] as Principal[]) {
      const session = checkoutSession();
      const fired = session.fire(CHOOSE, { source });
      expect(fired.ok).toBe(true);
      expect(session.gaps()).toEqual([]);
    }
  });

  it('an AGENT that fills the decision is disclosed, not refused', async () => {
    let session = checkoutSession();
    session = checkoutSession({
      handlers: {
        'enter-address': () => undefined,
        'choose-shipping-speed': () => session.updateState({ 'checkout.shipping': 'express' }),
        'place-order': () => undefined,
      },
    });
    const port = serveToAgent(session);
    const result = port.call('shop.do_action', { action: 'choose-shipping-speed' });
    expect(result['ok']).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The disclosure IS the v1 posture: it happened, and the book names who.
    expect(session.decisions()[0]).toMatchObject({ made: true, madeBy: 'agent' });
    expect(session.transitions().some((row) => row.cause.affordanceId === CHOOSE)).toBe(true);
  });

  it('the gap ledger gains no new rejection word', () => {
    const session = checkoutSession();
    // Everything this control can be refused for is something it was already
    // refused for. Fire it in a position where it is not offered:
    session.sync('checkout');
    const refused = session.fire('checkout.nonesuch', { source: 'agent' });
    expect(refused.ok).toBe(false);
    const words = new Set(session.gaps().map((gap: GapRecord) => gap.rejectionReason));
    expect([...words]).toEqual(['UNKNOWN_AFFORDANCE']);
    // …and nothing anywhere in the ledger speaks this feature's vocabulary.
    expect(JSON.stringify(session.gaps())).not.toContain('humanDecides');
    expect(JSON.stringify(session.gaps())).not.toContain('with-the-human');
  });

  it('an unwired session still refuses in the word it always used', () => {
    const unwired = checkout().createSession({
      node: 'checkout',
      state: { ...seeded },
      onWarn: () => undefined,
    });
    const refused = unwired.fire(CHOOSE, { source: 'agent' });
    expect(refused.ok === false && refused.reason).toBe('NOT_MATERIALIZED');
  });
});

/** The step ids of a readySteps/laterSteps list, whatever else rides them. */
function steps(rows: unknown): string[] {
  return (rows as Array<{ step: string }>).map((row) => row.step);
}
