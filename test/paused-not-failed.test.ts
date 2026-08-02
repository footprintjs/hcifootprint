/**
 * A PAUSE IS NOT A FAILURE — the ask book, said out loud.
 *
 * THE FINDING, from a production integration: an agent hit `needs-confirm`, read
 * `ok: false` as an error, told the human the app had failed, and went looking
 * for another route. Nothing in the payload said the two things that would have
 * stopped it — that NOTHING had been done, and that the missing piece was a
 * person rather than a fix. Then it asked `did_it_work` about the paused action
 * and got `UNKNOWN_TRANSITION` beside two lists that structurally could not
 * contain it: an ask is not a fire, so it never joins `pending()` and never opens
 * a settlement latch. The one question with an available answer got the one word
 * that says there isn't one.
 *
 * Both halves are closed here:
 *  1. every needs-confirm arm carries `performed: false` and an authored sentence
 *     naming the pause;
 *  2. `did_it_work` reads the ASK BOOK — the same three fates `groundTruth()`
 *     prints — and forwards a SPENT ask to the fire that spent it.
 *
 * MUTATION PROOFS:
 * - 'nothing has been done' — drop `performed: false` from the needs-confirm arms
 *   and a wire consumer is back to inferring "did anything happen?" from `ok`,
 *   which is about the CALL and not about the app.
 * - 'the human is still holding it' — delete the ask-book lookup and the paused
 *   id answers UNKNOWN_TRANSITION again: the reported failure, reproduced.
 * - 'answers the fate at ANSWER TIME' — cache the ask list when the port is
 *   built and this goes red: the tool reports "the human has not decided" about
 *   a card they approved three calls ago.
 * - 'an askId is matched EXACTLY' — accept a prefix/suffix match and the tool
 *   answers about a different person's card.
 * - 'the authored sentences carry no runtime payload' — interpolate the action
 *   or the input into any of them and the refusal leaks the value it was
 *   protecting (the two-string-class invariant, serve/modes.ts).
 * - 'a spent ask forwards to the fire it authorized' — drop the forward and the
 *   model that held the askId can never learn the outcome it authorized.
 * - 'an approval the app will no longer honour' — answer it 'approved-not-yet-done'
 *   and the arm orders a fire the gate refuses, identically, forever.
 * - 'one id, two objects' — answer from either book and the tool reports a
 *   settled fire as the fate of a human's open card, or the reverse.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { NavigationGraph, ServeResult, Session } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      checkout: {
        actions: {
          'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] },
          'add-note': { does: 'Add a gift note', writes: ['note'] },
        },
      },
    },
    journeys: { purchase: { does: 'Buy it', steps: ['place-order'] } },
  });
}

/**
 * A wired shop. `enforced` = the session requires a recorded human approval;
 * `policy` is that gate's optional staleness rules.
 */
function shop(
  enforced = false,
  policy?: { refuseWhenWorldMoved?: boolean; expiresAfterMs?: number },
): { session: Session; port: ReturnType<typeof serveToAgent> } {
  const session = shopMap().createSession({
    node: 'checkout',
    state: {},
    ...(enforced ? { requireHumanApproval: policy ?? (true as const) } : {}),
    onWarn: () => undefined,
  });
  session.registerActions('checkout', {
    handlers: { 'place-order': () => undefined, 'add-note': () => undefined },
  });
  return { session, port: serveToAgent(session) };
}

/** Land an ask through the port and hand back its id (and the result). */
function ask(
  port: ReturnType<typeof serveToAgent>,
  args: Record<string, unknown> = {},
): { asked: ServeResult; askId: string } {
  const asked = port.call('shop.do_action', { action: 'place-order', ...args });
  expect(asked['judgment']).toBe('needs-confirm');
  return { asked, askId: asked['askId'] as string };
}

// ---------------------------------------------------------------------------
// 1. The needs-confirm results: nothing happened, and it is a person's turn
// ---------------------------------------------------------------------------

describe('needs-confirm says that nothing has been done', () => {
  it('nothing has been done — the do_action arm', () => {
    const { port } = shop();
    const { asked } = ask(port);
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm', performed: false });
    expect(String(asked['why'])).toContain('Nothing has been done');
    expect(String(asked['why'])).toContain('not a failure');
  });

  it('nothing has been done — the journey-step arm', () => {
    const { port } = shop();
    port.call('shop.journey.purchase', {});
    const stopped = port.call('shop.journey.purchase', { step: 'place-order' });
    expect(stopped).toMatchObject({
      ok: false,
      judgment: 'needs-confirm',
      step: 'checkout.place-order',
      performed: false,
    });
    expect(String(stopped['why'])).toContain('Nothing has been done');
  });

  it('nothing has been done — the enforced APPROVAL_REQUIRED arm keeps its own sentence', async () => {
    // The third arm: a bare confirm:true under enforcement. Its `why` is the
    // enforcement sentence (it already says both halves and adds the one thing
    // only this arm knows), and the marker rides beside it like everywhere else.
    const { session, port } = shop(true);
    const refused = port.call('shop.do_action', { action: 'place-order', confirm: true });
    await tick();
    expect(refused).toMatchObject({
      ok: false,
      judgment: 'needs-confirm',
      reason: 'APPROVAL_REQUIRED',
      performed: false,
    });
    expect(String(refused['why'])).toContain('requireHumanApproval');
    expect(session.state()['orders']).toBeUndefined(); // and the marker is true
  });

  it('a low-effect action is untouched — this is the PAUSE marker, not a new field on everything', () => {
    const { port } = shop();
    const fired = port.call('shop.do_action', { action: 'add-note' });
    expect(fired['ok']).toBe(true);
    expect(fired).not.toHaveProperty('performed');
  });
});

// ---------------------------------------------------------------------------
// 2. did_it_work reads the ask book
// ---------------------------------------------------------------------------

describe('did_it_work — the three fates of an ask', () => {
  it('the human is still holding it: awaiting-human, naming the action', () => {
    const { port } = shop();
    const { askId } = ask(port);

    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).toMatchObject({
      ok: true,
      settled: false,
      performed: false,
      judgment: 'awaiting-human',
      askId,
      did: 'checkout.place-order',
      youAreOn: 'checkout',
    });
    expect(String(answer['howToAct'])).toContain('Paused, not failed');
    expect(String(answer['howToAct'])).toContain('The human has not decided');
  });

  it('approved and not yet done — the window groundTruth already prints', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port, { input: { total: 42 } });
    expect(session.approveAsk(askId, { by: 'ops@example.com' }).ok).toBe(true);

    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).toMatchObject({
      ok: true,
      settled: false,
      performed: false,
      judgment: 'approved-not-yet-done',
      askId,
      did: 'checkout.place-order',
    });
    expect(String(answer['howToAct'])).toContain('approved this and nothing has fired yet');
    // The session's own facts block says the same thing in its own words — one
    // truth, two renderings, and neither invented for this arm.
    expect(session.groundTruth().text).toContain('Approved by the human, not yet done');
  });

  it('declined — the human said no, honestly, with no outcome to report', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port);
    expect(session.declineAsk(askId, { by: 'ops@example.com' }).ok).toBe(true);

    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).toMatchObject({
      ok: true,
      settled: false,
      performed: false,
      judgment: 'declined',
      askId,
      did: 'checkout.place-order',
    });
    expect(String(answer['howToAct'])).toContain('said no');
  });

  it('an agent-relayed decline leaves it AWAITING under enforcement — the card is still live', () => {
    // The relayed no closes nothing (session.declineConfirm under enforcement),
    // so the tool must not report the question as answered. Saying 'declined'
    // here would let an agent bury a card the person has not seen.
    const { session, port } = shop(true);
    const { askId } = ask(port);
    const declined = port.call('shop.do_action', { action: 'place-order', decline: true });
    expect(declined).toMatchObject({ judgment: 'declined', recordedAs: 'your-report' });

    expect(port.call('shop.did_it_work', { transitionId: askId })).toMatchObject({
      judgment: 'awaiting-human',
      askId,
    });
    expect(session.groundTruth().text).toContain("Awaiting the human's decision");
  });

  it('a spent ask forwards to the fire it authorized — the outcome, not a lecture about ids', async () => {
    const { session, port } = shop(true);
    const { askId } = ask(port, { input: { total: 42 } });
    session.approveAsk(askId, { by: 'ops@example.com' });
    const fired = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    expect(fired['ok']).toBe(true);
    session.updateState({ orders: 1 }); // the app reports reality
    await tick();

    // Asked with the ASK id, answered with the FIRE's settlement.
    expect(port.call('shop.did_it_work', { transitionId: askId })).toMatchObject({
      ok: true,
      settled: true,
      did: 'checkout.place-order',
      effectStatus: 'performed',
      outcome: 'committed',
      effectVerified: true,
    });
  });

  it('…and in the DEFAULT mode too, where the fire drops the ask from the book', async () => {
    // Nothing is left in the book to match: the transition's own askId is the
    // only remaining link, which is exactly what the chain is for.
    const { session, port } = shop();
    const { askId } = ask(port);
    port.call('shop.do_action', { action: 'place-order', confirm: true });
    session.updateState({ orders: 1 });
    await tick();

    expect(session.asks()).toHaveLength(0);
    expect(port.call('shop.did_it_work', { transitionId: askId })).toMatchObject({
      settled: true,
      did: 'checkout.place-order',
      effectStatus: 'performed',
    });
  });

  it('an approval the app will no longer honour says SO — never "go and do it", forever', async () => {
    // The loop this closes: under refuseWhenWorldMoved the gate refuses a fire on
    // a yes given before the state moved (APPROVAL_STALE) and changes nothing
    // about the card, so an arm that said "perform the action" said it again on
    // the next call, and the next. The instruction and the gate now read the same
    // law: this yes is spent-proof, and the only move left is a fresh ask.
    const { session, port } = shop(true, { refuseWhenWorldMoved: true });
    const { askId } = ask(port, { input: { total: 42 } });
    expect(session.approveAsk(askId, { by: 'ops@example.com' }).ok).toBe(true);
    session.updateState({ orders: 0 }); // the app reports: the world moved

    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).toMatchObject({
      ok: true,
      settled: false,
      performed: false,
      judgment: 'approval-no-longer-valid',
      askId,
    });
    expect(String(answer['howToAct'])).toContain('get a fresh answer');
    expect(String(answer['howToAct'])).not.toContain('Perform the action');
    // …and the instruction is TRUE: the fire it would have ordered is refused.
    const fired = session.fire('checkout.place-order', {
      source: 'agent',
      payload: { total: 42 },
      askId,
    });
    expect(fired).toMatchObject({ ok: false, reason: 'APPROVAL_STALE' });
    // The ask book carries the same reading, for any consumer that asks directly.
    expect(session.asks()[0]).toMatchObject({ answer: 'approved', stale: true });
  });

  it('a live approval is NOT marked stale — the mark is a policy reading, not a mood', () => {
    const { session, port } = shop(true, { refuseWhenWorldMoved: true });
    const { askId } = ask(port, { input: { total: 42 } });
    session.approveAsk(askId, { by: 'ops@example.com' });
    expect(session.asks()[0]).not.toHaveProperty('stale');
    expect(port.call('shop.did_it_work', { transitionId: askId })).toMatchObject({
      judgment: 'approved-not-yet-done',
    });
    // …and a session with no policy at all can never produce the mark.
    const plain = shop(true);
    const other = ask(plain.port, { input: { total: 1 } });
    plain.session.approveAsk(other.askId, { by: 'ops@example.com' });
    plain.session.updateState({ orders: 9 });
    expect(plain.session.asks()[0]).not.toHaveProperty('stale');
  });

  it('one id, two objects: an action named "ask" is refused BY NAME, not answered about either', async () => {
    // The id spaces really can meet: transition ids are `<action>#<n>` and
    // approval cards are `ask#<n>` from a different counter, so a graph with an
    // action called 'ask' can mint the same string for both. Answering from
    // either book would be a confident answer about the OTHER object — a settled
    // fire reported as the fate of a human's open card, or the reverse.
    const graph = buildNavigationGraph('desk', {
      does: 'A desk',
      pages: {
        home: {},
      },
      actions: {
        ask: {
          on: 'home',
          does: 'Ask the assistant something',
          binding: { kind: 'element', locator: { role: 'button', name: 'Ask' }, actuation: 'click' },
        },
        wipe: {
          on: 'home',
          does: 'Wipe everything',
          confirm: true,
          binding: { kind: 'element', locator: { role: 'button', name: 'Wipe' }, actuation: 'click' },
        },
      },
    });
    const warnings: string[] = [];
    const session = graph.createSession({
      node: 'home',
      state: {},
      requireHumanApproval: true,
      onWarn: (message) => warnings.push(message),
    });
    session.registerHandlers({
      group: 'app',
      handlers: { ask: () => undefined, wipe: () => undefined },
    });
    const port = serveToAgent(session);

    // Two fires of 'ask' mint transitions ask#0 and ask#1…
    session.fire('ask', { source: 'agent' });
    session.fire('ask', { source: 'agent' });
    await tick();
    // …and the first high-effect ask mints the CARD ask#1.
    const asked = port.call('desk.do_action', { action: 'wipe' });
    const askId = asked['askId'] as string;
    expect(session.transitions().some((row) => row.id === askId)).toBe(true);

    const answer = port.call('desk.did_it_work', { transitionId: askId });
    expect(answer).toMatchObject({ ok: false, judgment: 'error', reason: 'AMBIGUOUS_ID', askId });
    expect(String(answer['why'])).toContain('names two different things');
    // Neither object's fate is reported as if it were the answer.
    expect(answer).not.toHaveProperty('settled');
    expect(answer).not.toHaveProperty('outcome');
    // …and the person who can end it — the app team — was told at mint time.
    expect(warnings.some((w) => w.includes("action named 'ask'"))).toBe(true);
  });

  it('never re-serves the receipts — the action name and nothing more', () => {
    const { port } = shop(true);
    const { asked, askId } = ask(port, { input: { total: 42, card: '4242' } });
    expect(asked['receipts']).toBeDefined(); // the ask has them…

    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).not.toHaveProperty('receipts'); // …and this tool does not
    expect(JSON.stringify(answer)).not.toContain('4242');
  });

  it('a paused arm borrows NO settlement vocabulary — nothing fired, so there is no outcome', () => {
    // The category error this deliberately does not make: a paused ask has no
    // transition, so it gets no effectStatus and no outcome. 'awaiting-human' is
    // a result-level judgment, never a new word in a published union.
    const { port } = shop();
    const { askId } = ask(port);
    const answer = port.call('shop.did_it_work', { transitionId: askId });
    expect(answer).not.toHaveProperty('effectStatus');
    expect(answer).not.toHaveProperty('outcome');
    expect(answer).not.toHaveProperty('effectVerified');
  });
});

// ---------------------------------------------------------------------------
// 3. The refusal arm still refuses — and now names what a person is holding
// ---------------------------------------------------------------------------

describe('did_it_work — UNKNOWN_TRANSITION names all three kinds of open question', () => {
  it('lists awaitingHuman beside pending and awaitingSettlement', () => {
    const { port } = shop();
    const fired = port.call('shop.do_action', { action: 'add-note' });
    const { askId } = ask(port);

    const refused = port.call('shop.did_it_work', { transitionId: 'checkout.place-order#99' });
    expect(refused).toMatchObject({ ok: false, judgment: 'error', reason: 'UNKNOWN_TRANSITION' });
    expect(refused['pending']).toEqual([fired['transitionId']]);
    expect(refused['awaitingSettlement']).toEqual([fired['transitionId']]);
    expect(refused['awaitingHuman']).toEqual([{ askId, action: 'checkout.place-order' }]);
  });

  it('an ANSWERED ask is not awaiting anybody — the list stays honest', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port);
    session.approveAsk(askId, { by: 'ops@example.com' });

    const refused = port.call('shop.did_it_work', { transitionId: 'nope#1' });
    expect(refused['awaitingHuman']).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. The dishonest implementations — each one is a test that fails against it
// ---------------------------------------------------------------------------

describe('the dishonest implementations this refuses', () => {
  it('answers the fate at ANSWER TIME — a stale read would report a decision that is over', () => {
    // THE ATTACK: read the ask book once (at build, or at the first call) and
    // keep answering from it. The same port, the same id, three fates.
    const { session, port } = shop(true);
    const { askId } = ask(port, { input: { total: 42 } });

    expect(port.call('shop.did_it_work', { transitionId: askId })['judgment']).toBe('awaiting-human');

    session.approveAsk(askId, { by: 'ops@example.com' });
    expect(port.call('shop.did_it_work', { transitionId: askId })['judgment']).toBe('approved-not-yet-done');

    port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    const afterFiring = port.call('shop.did_it_work', { transitionId: askId });
    expect(afterFiring['judgment']).not.toBe('awaiting-human');
    expect(afterFiring['settled']).toBe(false); // fired, not yet reported…
    expect(afterFiring['judgment']).toBe('still-pending'); // …and that is what it says
  });

  it('a DECLINED card never reads as awaiting either', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port);
    expect(port.call('shop.did_it_work', { transitionId: askId })['judgment']).toBe('awaiting-human');
    session.declineAsk(askId, { by: 'ops@example.com' });
    expect(port.call('shop.did_it_work', { transitionId: askId })['judgment']).toBe('declined');
  });

  it('an askId is matched EXACTLY — no prefix, no suffix, no near miss', () => {
    // THE ATTACK: `resolveStep`-style fuzzy matching, applied to ask ids. A
    // near-miss match answers about a DIFFERENT card, which is the one wrong
    // answer this tool must never give.
    const { port } = shop(true);
    const { askId } = ask(port, { input: { total: 1 } });
    expect(askId).toBe('ask#1');

    for (const near of ['ask', 'ask#', 'sk#1', 'ask#11', 'ASK#1', ' ask#1']) {
      const answer = port.call('shop.did_it_work', { transitionId: near });
      expect(answer['judgment'], near).toBe('error');
      expect(answer['reason'], near).toBe('UNKNOWN_TRANSITION');
    }
  });

  it('the authored sentences carry no runtime payload — not the input, not the id', () => {
    // THE ATTACK: interpolate what was refused into the sentence that refuses
    // it. Every string below is a fixed constant of this port, so a payload with
    // a card number in it cannot ride out through the prose channel.
    const { port } = shop(true);
    const secret = 'pan-4242-4242-4242';
    const { asked, askId } = ask(port, { input: { card: secret, note: 'ship-to-alice' } });

    const paused = port.call('shop.did_it_work', { transitionId: askId });
    for (const sentence of [asked['why'], asked['howToAct'], paused['howToAct']]) {
      expect(String(sentence)).not.toContain(secret);
      expect(String(sentence)).not.toContain('ship-to-alice');
      expect(String(sentence)).not.toContain('place-order');
      expect(String(sentence)).not.toContain(askId);
    }
    // The value is still disclosed where it belongs — the DATA channel, on the
    // card the human reads. Absence in the prose is not absence.
    expect(JSON.stringify(asked['receipts'])).toContain(secret);
  });

  it('two calls, two identical sentences — byte-stable, whatever the payload was', () => {
    const { port: a } = shop();
    const { port: b } = shop();
    const first = a.call('shop.do_action', { action: 'place-order', input: { total: 1 } });
    const second = b.call('shop.do_action', { action: 'place-order', input: { total: 999_999 } });
    expect(first['why']).toBe(second['why']);
    expect(first['howToAct']).toBe(second['howToAct']);
  });
});

// ---------------------------------------------------------------------------
// 5. Wire safety — every new arm is data, and asking is never acting
// ---------------------------------------------------------------------------

describe('the ask-book arms are wire-safe reads', () => {
  it('every arm survives structuredClone', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port);
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: askId }))).not.toThrow();
    session.approveAsk(askId, { by: 'ops@example.com' });
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: askId }))).not.toThrow();
    expect(() => structuredClone(port.call('shop.did_it_work', { transitionId: 'nope#1' }))).not.toThrow();
  });

  it('asking how it went never moves the world it asks about', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port);
    const rows = session.confirms().length;
    const version = session.version;

    port.call('shop.did_it_work', { transitionId: askId });
    port.call('shop.did_it_work', { transitionId: 'nope#1' });

    expect(session.confirms()).toHaveLength(rows);
    expect(session.version).toBe(version);
    expect(session.asks().every((row) => row.answer === undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Session.asks() — the minimal read the arm needed
// ---------------------------------------------------------------------------

describe('Session.asks — the ask book, read-only', () => {
  it('serves the fate of each card and nothing the card was carrying', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port, { input: { card: 'pan-4242' } });

    // `does` is the action's AUTHORED sentence, captured when the card was
    // assembled — spec text, never anything the card was carrying.
    expect(session.asks()).toEqual([
      { askId, affordanceId: 'checkout.place-order', does: 'Place the order' },
    ]);
    session.approveAsk(askId, { by: 'ops@example.com' });
    expect(session.asks()).toEqual([
      { askId, affordanceId: 'checkout.place-order', does: 'Place the order', answer: 'approved' },
    ]);
    expect(JSON.stringify(session.asks())).not.toContain('pan-4242');
  });

  it('marks a yes as SPENT once its fire has used it — one yes, one action', async () => {
    const { session, port } = shop(true);
    const { askId } = ask(port, { input: { total: 42 } });
    session.approveAsk(askId, { by: 'ops@example.com' });
    port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    await tick();

    expect(session.asks()).toEqual([
      {
        askId,
        affordanceId: 'checkout.place-order',
        does: 'Place the order',
        answer: 'approved',
        spent: true,
      },
    ]);
  });

  it('hands out copies — a caller editing the row cannot edit the gate', () => {
    const { session, port } = shop(true);
    const { askId } = ask(port);
    const rows = session.asks();
    rows[0]!.answer = 'approved';
    expect(session.asks()[0]).toEqual({
      askId,
      affordanceId: 'checkout.place-order',
      does: 'Place the order',
    });
    // …and the gate still refuses the fire the edited copy claimed was approved.
    expect(session.fire('checkout.place-order', { source: 'agent', askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_REQUIRED',
    });
  });
});
