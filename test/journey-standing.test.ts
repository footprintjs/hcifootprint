/**
 * `journeyStanding()` — one settled word for a whole chain, and the facts
 * behind it.
 *
 * The question a reader has between turns is not "what may I fire next" — the
 * plan answers that — but "whose turn is it, and is this thing moving". Deriving
 * that from plan rows means re-implementing library law outside the library:
 * which rows close which card, what a relayed decline does NOT close, when a
 * refusal is a failure and when it is nothing of the kind. Two surfaces that
 * re-derive it can disagree about one chain, and a disagreement of that shape
 * reads to a model as "the human already answered".
 *
 * THE WORD THIS SUITE DEFENDS HARDEST IS `'failed'`. A refusal is not an
 * execution: nothing ran, so nothing failed. Every pause this library can
 * produce is driven through the fold below and asserted NOT to mint it — and the
 * one thing that does mint it, a fire that came to rest badly, carries a pointer
 * to the fire rather than the receipt.
 *
 * MUTATION PROOFS (each one run, and the counts are what it actually did):
 * - Mint `'failed'` from a needs-confirm ask → 1 red (T-A6).
 * - Mint it from any APPROVAL_* refusal → 1 red (T-A6's table).
 * - Read the OLDEST ask instead of the latest → 2 red (the newer card, the
 *   decline).
 * - Honour a RELAYED decline as the human's → 1 red.
 * - Let ownership outrank an open card → 1 red (ask-wins).
 * - Answer `'done'` off a cancelled or demoted frame → 2 red.
 * - Treat an unevaluable-only guard as blocked → 1 red (the asymmetry).
 * - Cache the fold, or let it write anything → 1 red (the purity test).
 * - Put the receipts pack on the standing → 1 red (T-A9).
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import {
  ADDRESS,
  CHOOSE,
  PLACE,
  SHIPPING_ABOUT,
  checkout,
  checkoutSession,
  hasKeyDeep,
  performed,
  seeded,
} from './human-decisions-fixture.js';

/** Address done, shipping decided — the two steps before the last one. */
function throughShipping(session: ReturnType<typeof checkoutSession>): void {
  session.commitJourney('buy', { source: 'agent' });
  performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
  performed(session, CHOOSE, { 'checkout.shipping': 'express' });
}

describe('the fold is pure — it reads, and that is all it does', () => {
  it('two calls in a row change nothing and agree with each other', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    const version = session.version;
    const transitions = session.transitions().length;
    const confirms = session.confirms().length;

    const first = session.journeyStanding('buy');
    const second = session.journeyStanding('buy');

    expect(first).toEqual(second);
    expect(session.version).toBe(version);
    expect(session.transitions().length).toBe(transitions);
    expect(session.confirms().length).toBe(confirms);
    expect(session.asks()).toEqual([]);
  });
});

describe('the governing step — the first one not done, in chain order', () => {
  it('counts steps done and total, with inferred-done counted as done', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    expect(session.journeyStanding('buy').evidence).toMatchObject({
      step: ADDRESS,
      stepsDone: 0,
      stepsTotal: 3,
    });

    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    expect(session.journeyStanding('buy').evidence).toMatchObject({ step: CHOOSE, stepsDone: 1 });

    // An unattributed delta the library MATCHED to the chooser: a guess, and the
    // plan says so with 'inferred-done'. It still counts as done.
    session.updateState({ 'checkout.shipping': 'express' });
    expect(session.journeyPlan('buy').steps[1].status).toBe('inferred-done');
    expect(session.journeyStanding('buy').evidence).toMatchObject({ step: PLACE, stepsDone: 2 });
  });

  it('a journey nobody has started is in progress, and the counts say so', () => {
    const session = checkoutSession();
    expect(session.journeyStanding('buy')).toEqual({
      journeyId: 'buy',
      standing: 'in-progress',
      evidence: { step: ADDRESS, stepsDone: 0, stepsTotal: 3 },
    });
  });

  it('every step done → done', () => {
    const session = checkoutSession();
    throughShipping(session);
    performed(session, PLACE, { orderId: 'o-1' });
    expect(session.journeyStanding('buy')).toEqual({
      journeyId: 'buy',
      standing: 'done',
      evidence: { stepsDone: 3, stepsTotal: 3 },
    });
  });
});

describe('a card is the sharper referent — awaiting-human, and the human’s own no', () => {
  it('an open ask on the governing step names the card', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    throughShipping(session);
    const { askId } = session.confirmAsk(PLACE, { source: 'agent' });

    expect(session.journeyStanding('buy')).toEqual({
      journeyId: 'buy',
      standing: 'awaiting-human',
      evidence: { step: PLACE, askId, stepsDone: 2, stepsTotal: 3 },
    });
  });

  it('the human’s own no says declined; a NEWER card wins awaiting-human back', () => {
    const session = checkoutSession({
      graph: checkout({ confirmPlaceOrder: true }),
      approval: true,
    });
    throughShipping(session);
    const first = session.confirmAsk(PLACE, { source: 'agent', input: { gift: false } });
    const answered = session.declineAsk(first.askId, { by: 'ops@example.test' });
    expect(answered.ok).toBe(true);

    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'declined',
      evidence: { step: PLACE, askId: first.askId },
    });

    // Asking again after a no mints a NEW card — a decision is never overwritten
    // — and the newest one is where the chain now stands.
    const second = session.confirmAsk(PLACE, { source: 'agent', input: { gift: true } });
    expect(second.askId).not.toBe(first.askId);
    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'awaiting-human',
      evidence: { askId: second.askId },
    });
  });

  it('a RELAYED decline closes nothing, so the card still governs', () => {
    const session = checkoutSession({
      graph: checkout({ confirmPlaceOrder: true }),
      approval: true,
    });
    throughShipping(session);
    const { askId } = session.confirmAsk(PLACE, { source: 'agent' });
    const relayed = session.declineConfirm(PLACE, { principal: 'agent' });
    expect(relayed.relayed).toBe(true);

    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'awaiting-human',
      evidence: { askId },
    });
  });
});

describe('with-the-human — the decision is theirs, and made: true is a cue not a move', () => {
  it('the governing step’s ownership names the standing, with its data', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });

    expect(session.journeyStanding('buy')).toEqual({
      journeyId: 'buy',
      standing: 'with-the-human',
      evidence: {
        step: CHOOSE,
        about: SHIPPING_ABOUT,
        made: false,
        stepsDone: 1,
        stepsTotal: 3,
      },
    });
  });

  it('made: true stays with-the-human, and carries the maker when one is known', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    // The person answered through the app's own control, and nothing fired the
    // step: the decision is made and the step is still theirs.
    session.updateState({ 'checkout.shipping': 'express' }, { principal: 'user' });

    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'with-the-human',
      evidence: { step: CHOOSE, made: true, madeBy: 'user' },
    });
  });

  it('a declaration with no about carries none — absence, not an empty string', () => {
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

    const { evidence } = session.journeyStanding('pick');
    expect(evidence.made).toBe(false);
    expect(Object.hasOwn(evidence, 'about')).toBe(false);
  });

  it('an unattributed flip leaves the maker off the evidence', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    session.updateState({ 'checkout.shipping': 'express' }, { stimulus: 'push' });

    const { evidence } = session.journeyStanding('buy');
    expect(evidence.made).toBe(true);
    expect(Object.hasOwn(evidence, 'madeBy')).toBe(false);
  });

  it('AN OPEN CARD WINS while it is open, and ownership governs again once it closes', () => {
    // One control carrying BOTH declarations — independent facts, both served.
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: {
            'choose-plan': {
              does: 'Choose a plan',
              confirm: true,
              writes: ['plan'],
              humanDecides: { about: 'which plan', doneWhen: { plan: { ne: '' } } },
            },
          },
        },
      },
      journeys: { pick: { does: 'Pick a plan', steps: ['choose-plan'] } },
    });
    const session = graph.createSession({ node: 'checkout', state: { plan: '' }, onWarn: () => undefined });
    session.registerActions('checkout', { handlers: { 'choose-plan': () => undefined } });
    session.commitJourney('pick', { source: 'agent' });

    expect(session.journeyStanding('pick').standing).toBe('with-the-human');
    const { askId } = session.confirmAsk('checkout.choose-plan', { source: 'agent' });
    expect(session.journeyStanding('pick')).toMatchObject({
      standing: 'awaiting-human',
      evidence: { askId },
    });
    // The default mode's decline closes the card outright; ownership answers again.
    session.declineConfirm('checkout.choose-plan', { principal: 'user' });
    expect(session.journeyStanding('pick').standing).toBe('with-the-human');
  });

  it('a decision that is blocked or off-page is not with the human YET', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        cart: { actions: { review: { does: 'Review the cart' } } },
        checkout: {
          actions: {
            'choose-plan': {
              does: 'Choose a plan',
              when: { 'checkout.address': { ne: '' } },
              humanDecides: { doneWhen: { plan: { ne: '' } } },
            },
          },
        },
      },
      journeys: { pick: { does: 'Pick a plan', steps: ['choose-plan'] } },
    });
    const session = graph.createSession({
      node: 'checkout',
      state: { 'checkout.address': '', plan: '' },
      onWarn: () => undefined,
    });
    // Guard fails → blocked, and blocked outranks nothing: it is simply not the
    // person's turn yet.
    expect(session.journeyStanding('pick').standing).toBe('blocked');

    session.updateState({ 'checkout.address': '12 Elm Row' }, { principal: 'user' });
    session.sync('cart');
    expect(session.journeyStanding('pick').standing).toBe('in-progress'); // off-node
  });
});

describe('frames: what closes a journey and what only contributes history', () => {
  it('a completed frame answers done from history', () => {
    const session = checkoutSession();
    throughShipping(session);
    performed(session, PLACE, { orderId: 'o-1' });
    const closed = session.leaveJourney();
    expect(closed?.status).toBe('completed');

    expect(session.journeyStanding('buy')).toEqual({
      journeyId: 'buy',
      standing: 'done',
      evidence: { stepsDone: 3, stepsTotal: 3 },
    });
  });

  it('a completed frame counts its GUESSED steps too — done is done, however it was learned', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    // Nobody said who: the library matched the delta to the chooser's signature
    // and the plan says 'inferred-done'.
    session.updateState({ 'checkout.shipping': 'express' });
    performed(session, PLACE, { orderId: 'o-1' });
    const closed = session.leaveJourney();
    expect(closed?.inferredSteps).toEqual([CHOOSE]);

    expect(session.journeyStanding('buy')).toEqual({
      journeyId: 'buy',
      standing: 'done',
      evidence: { stepsDone: 3, stepsTotal: 3 },
    });
  });

  it('a CANCELLED frame contributes history and never a verdict', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    session.leaveJourney({ reason: 'cancelled' });

    // Abandonment is not completion and not failure. The live walk answers, and
    // done-ness lived in the frame that was abandoned — so the chain reads as
    // open with nothing behind it, which is exactly what a cancelled pass is.
    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'in-progress',
      evidence: { step: ADDRESS, stepsDone: 0 },
    });
    expect(session.frames().at(-1)?.status).toBe('cancelled');
  });

  it('a DEMOTED frame falls through to the live walk too', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { checkout: { actions: { pay: { does: 'Pay' } } } },
      journeys: { buy: { does: 'Buy', steps: ['pay'], when: { signedIn: { eq: true } } } },
    });
    const session = graph.createSession({
      node: 'checkout',
      state: { signedIn: true },
      onWarn: () => undefined,
    });
    session.registerActions('checkout', { handlers: { pay: () => undefined } });
    session.commitJourney('buy', { source: 'agent' });
    session.updateState({ signedIn: false }, { principal: 'system' });
    expect(session.frames().at(-1)?.status).toBe('demoted');

    expect(session.journeyStanding('buy').standing).toBe('in-progress');
  });
});

describe('blocked, and the asymmetry that keeps taken-on-faith out of it', () => {
  it('an EVALUATED failing guard is blocked, and the failing conditions ride', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    performed(session, CHOOSE, { 'checkout.shipping': 'express' });
    // …and now break it again, from the outside.
    session.updateState({ 'checkout.shipping': '' }, { principal: 'system' });

    const standing = session.journeyStanding('buy');
    expect(standing.standing).toBe('blocked');
    expect(standing.evidence.blockedOn).toEqual([
      expect.objectContaining({ key: 'checkout.shipping', result: false }),
    ]);
  });

  it('a guard nobody could evaluate is IN PROGRESS, carrying the marker', () => {
    const session = checkoutSession({ state: { 'checkout.address': '' } }); // no shipping key at all
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    performed(session, CHOOSE, { 'checkout.shipping': 'express' });

    const standing = session.journeyStanding('buy');
    expect(standing.standing).toBe('in-progress');
    expect(standing.evidence.guardUnevaluated).toBeUndefined();
  });

  it('…and the marker is carried where the plan has one', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        checkout: {
          actions: { pay: { does: 'Pay', when: { balanceCleared: { eq: true } } } },
        },
      },
      journeys: { buy: { does: 'Buy', steps: ['pay'] } },
    });
    const session = graph.createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'in-progress',
      evidence: { guardUnevaluated: ['balanceCleared'] },
    });
  });
});

describe('T-A6 no-failed-from-any-pause', () => {
  /** The five approval refusals, a guard, a switched-off control, and unwired wiring. */
  it('a needs-confirm ask outstanding is not a failure', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    throughShipping(session);
    session.confirmAsk(PLACE, { source: 'agent' });
    expect(session.journeyStanding('buy').standing).not.toBe('failed');
  });

  it('every APPROVAL_* refusal leaves the standing un-failed', () => {
    let clock = 1_000;
    const session = checkoutSession({
      graph: checkout({ confirmPlaceOrder: true }),
      approval: { expiresAfterMs: 60_000 },
      now: () => clock,
    });
    throughShipping(session);

    // APPROVAL_REQUIRED — a crossing with no yes at all.
    const required = session.fire(PLACE, { source: 'agent' });
    expect(required.ok).toBe(false);
    expect(session.journeyStanding('buy').standing).not.toBe('failed');

    // APPROVAL_DECLINED — the human said no, and a fire quoting that card is refused.
    const no = session.confirmAsk(PLACE, { source: 'agent' });
    session.declineAsk(no.askId, { by: 'ops@example.test' });
    const declined = session.fire(PLACE, { source: 'agent', askId: no.askId });
    expect(declined.ok === false && declined.reason).toBe('APPROVAL_DECLINED');
    expect(session.journeyStanding('buy').standing).not.toBe('failed');

    // APPROVAL_MISMATCH — the yes covered a different input.
    const bound = session.confirmAsk(PLACE, { source: 'agent', input: { gift: false } });
    session.approveAsk(bound.askId, { by: 'ops@example.test' });
    const mismatched = session.fire(PLACE, {
      source: 'agent',
      askId: bound.askId,
      payload: { gift: true },
    });
    expect(mismatched.ok === false && mismatched.reason).toBe('APPROVAL_MISMATCH');
    expect(session.journeyStanding('buy').standing).not.toBe('failed');

    // APPROVAL_STALE — the same yes, after this app's own freshness rule ran out.
    clock += 120_000;
    const stale = session.fire(PLACE, {
      source: 'agent',
      askId: bound.askId,
      payload: { gift: false },
    });
    expect(stale.ok === false && stale.reason).toBe('APPROVAL_STALE');
    expect(session.journeyStanding('buy').standing).not.toBe('failed');

    // APPROVAL_SPENT — one yes, one action.
    const fresh = session.confirmAsk(PLACE, { source: 'agent', input: { gift: false } });
    session.approveAsk(fresh.askId, { by: 'ops@example.test' });
    const spentOn = session.fire(PLACE, {
      source: 'agent',
      askId: fresh.askId,
      payload: { gift: false },
    });
    expect(spentOn.ok).toBe(true);
    const spent = session.fire(PLACE, {
      source: 'agent',
      askId: fresh.askId,
      payload: { gift: false },
    });
    expect(spent.ok === false && spent.reason).toBe('APPROVAL_SPENT');
    expect(session.journeyStanding('buy').standing).not.toBe('failed');

    // …and none of the five ever entered the ledger as anything but themselves.
    const reasons = session.gaps().map((gap) => gap.rejectionReason);
    expect(reasons).toEqual(
      expect.arrayContaining([
        'APPROVAL_REQUIRED',
        'APPROVAL_DECLINED',
        'APPROVAL_MISMATCH',
        'APPROVAL_STALE',
        'APPROVAL_SPENT',
      ]),
    );
  });

  it('GUARD_FAILED, TOOL_DISABLED and NOT_MATERIALIZED are refusals, not failures', () => {
    const guarded = checkoutSession();
    guarded.commitJourney('buy', { source: 'agent' });
    expect((guarded.fire(PLACE, { source: 'agent' }) as { reason?: string }).reason).toBe('GUARD_FAILED');
    expect(guarded.journeyStanding('buy').standing).not.toBe('failed');

    const disabled = checkoutSession();
    const handle = disabled.registerActions('checkout', { handlers: {} });
    handle.setEnabled('enter-address', false);
    disabled.commitJourney('buy', { source: 'agent' });
    expect((disabled.fire(ADDRESS, { source: 'agent' }) as { reason?: string }).reason).toBe(
      'TOOL_DISABLED',
    );
    expect(disabled.journeyStanding('buy').standing).not.toBe('failed');

    // Nothing registered at all: an agent fire executes NOTHING and says so.
    const unwired = checkout().createSession({
      node: 'checkout',
      state: { ...seeded },
      onWarn: () => undefined,
    });
    expect((unwired.fire(ADDRESS, { source: 'agent' }) as { reason?: string }).reason).toBe(
      'NOT_MATERIALIZED',
    );
    expect(unwired.journeyStanding('buy').standing).not.toBe('failed');
  });

  it('what DOES mint it: a fire that came to rest badly, and a pointer to it', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    const fired = session.fire(ADDRESS, { source: 'agent' });
    if (!fired.ok) throw new Error('the address step should have been fireable');
    session.reject(fired.transition.id);

    expect(session.journeyStanding('buy')).toMatchObject({
      standing: 'failed',
      evidence: { step: ADDRESS, transitionId: fired.transition.id },
    });
  });

  it('…and a later success on the same step clears it', () => {
    const session = checkoutSession();
    session.commitJourney('buy', { source: 'agent' });
    const fired = session.fire(ADDRESS, { source: 'agent' });
    if (!fired.ok) throw new Error('the address step should have been fireable');
    session.reject(fired.transition.id);
    expect(session.journeyStanding('buy').standing).toBe('failed');

    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    expect(session.journeyStanding('buy').standing).toBe('with-the-human');
  });
});

describe('T-A9 receipts-never-re-served', () => {
  it('the receipts pack appears exactly once — on the ask that minted it', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    throughShipping(session);
    const port = serveToAgent(session);

    // The ONE place a pack legitimately rides.
    const asked = port.call('shop.journey.buy', { step: 'place-order' });
    expect(asked['judgment']).toBe('needs-confirm');
    expect(hasKeyDeep(asked, 'receipts')).toBe(true);

    // …and nowhere else, on any path.
    expect(hasKeyDeep(session.journeyStanding('buy'), 'receipts')).toBe(false);
    expect(hasKeyDeep(session.decisions(), 'receipts')).toBe(false);
    expect(hasKeyDeep(port.call('shop.journey.buy'), 'receipts')).toBe(false);
    expect(hasKeyDeep(port.call('shop.whats_here'), 'receipts')).toBe(false);
  });

  it('the standing carries POINTERS — an askId and a transitionId, never a pack', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    throughShipping(session);
    const { askId } = session.confirmAsk(PLACE, { source: 'agent' });
    const standing = session.journeyStanding('buy');
    expect(standing.evidence.askId).toBe(askId);
    expect(Object.keys(standing.evidence).sort()).toEqual(['askId', 'step', 'stepsDone', 'stepsTotal']);
  });

  it('the held rows carry their own keys and nothing else', () => {
    const session = checkoutSession({ graph: checkout({ confirmPlaceOrder: true }) });
    session.commitJourney('buy', { source: 'agent' });
    performed(session, ADDRESS, { 'checkout.address': '12 Elm Row' });
    const port = serveToAgent(session);

    const withTheHuman = port.call('shop.journey.buy')['withTheHuman'] as Array<Record<string, unknown>>;
    expect(withTheHuman.map((row) => Object.keys(row).sort())).toEqual([['about', 'made', 'step']]);
  });
});

describe('an id this graph does not have', () => {
  it('throws, exactly as journeyPlan does — one refusal, not two', () => {
    const session = checkoutSession();
    let planError: unknown;
    let standingError: unknown;
    try {
      session.journeyPlan('nope');
    } catch (error) {
      planError = error;
    }
    try {
      session.journeyStanding('nope');
    } catch (error) {
      standingError = error;
    }
    expect(String(planError)).toContain("unknown journey 'nope'");
    expect(String(standingError)).toBe(String(planError));
  });

  it('Mode B never routes an unresolved name into it', () => {
    const port = serveToAgent(checkoutSession());
    // A name that is not a tool is answered, never thrown.
    expect(port.call('shop.journey.nope')).toMatchObject({ reason: 'UNKNOWN_TOOL' });
    // …and every journey the port DOES speak for came off the session's own list.
    const rows = port.call('shop.whats_here')['journeys'] as Array<{ journey: string }>;
    expect(rows.map((row) => row.journey)).toEqual(['buy']);
  });
});
