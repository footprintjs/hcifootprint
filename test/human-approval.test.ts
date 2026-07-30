/**
 * requireHumanApproval — an approval the library cannot PROVE is not an approval.
 *
 * THE FINDING, in one sentence: `fire('place-order', { confirm: true })` executed
 * even when nothing had ever been asked. `confirm: true` was the AGENT asserting
 * that a human approved — a boolean in the model's own tool arguments, tied to no
 * recorded decision — so a model that skipped the ask was indistinguishable from
 * one that got a yes. An audit trail existed; enforcement did not. Worse, on the
 * FIRST served call the journal did not even fill in: `confirmAsk` is reached
 * only on the `confirm !== true` arm, so the high-effect action ran and
 * `confirms()` stayed EMPTY.
 *
 * Every attack below is named after itself, and each one proves the forgery is
 * REFUSED. The reproduction of the finding lives here too — the same call with
 * the option absent still executes, which is what a 0.6 consumer signed up for
 * and why the flag is opt-in.
 *
 * THE MUTATION PROOF THAT MATTERS. With the flag ON, delete the gate block in
 * fire() (the `#humanApproval !== undefined && aff.highEffect && …` arm) and
 * `the forged fire is refused` goes green-as-executed: ok:true, an 'orders'
 * write, and an empty confirm journal. That is the finding, reproduced against
 * this file. Deleting only the `'used'` row instead turns the replay test red;
 * deleting only the gap row turns the ground-truth test red. Verified by running
 * each deletion.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type { ConfirmRecord, NavigationGraph, Session } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      checkout: {
        tools: {
          'place-order': {
            does: 'Place the order',
            confirm: true,
            writes: ['orders'],
            expects: {
              type: 'object',
              properties: { total: { type: 'number' } },
              required: ['total'],
            },
          },
          'add-note': { does: 'Add a gift note', writes: ['note'] },
          subscribe: { does: 'Start the subscription', confirm: true, input: 'none', writes: ['sub'] },
        },
      },
    },
  });
}

/** A repeats container, for the instance-laundering attack. */
function ordersMap(): NavigationGraph {
  return buildNavigationGraph('orders', {
    pages: {
      list: {
        areas: {
          row: {
            repeats: true,
            instances: (s) => (s['ids'] as string[]) ?? [],
            tools: { refund: { does: 'Refund this order', confirm: true, writes: ['refunds'] } },
          },
        },
      },
    },
  });
}

/** An enforcing session with its buttons wired — the shape a real app ships. */
function enforcedShop(policy: true | { expiresAfterMs?: number; refuseWhenWorldMoved?: boolean } = true, now?: () => number) {
  const session = shopMap().createSession({
    node: 'checkout',
    state: {},
    requireHumanApproval: policy,
    ...(now ? { now } : {}),
    onWarn: () => undefined,
  });
  session.registerToolGroup('checkout', {
    handlers: {
      'place-order': () => undefined,
      'add-note': () => undefined,
      subscribe: () => undefined,
    },
  });
  return session;
}

/** The rows of the confirm journal, in order — the auditor's view. */
const kinds = (session: Session): string[] => session.confirms().map((row) => row.kind);

const row = (session: Session, kind: ConfirmRecord['kind']): ConfirmRecord | undefined =>
  session.confirms().find((r) => r.kind === kind);

// ---------------------------------------------------------------------------
// THE FINDING — reproduced, then refused
// ---------------------------------------------------------------------------

describe('the reported forgery', () => {
  it('is REPRODUCED with the option absent: confirm:true on the FIRST call executes and the journal stays empty', async () => {
    const session = shopMap().createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
    const port = skillsAsTools(session);

    const fired = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    await tick();

    expect(fired).toMatchObject({ ok: true, did: 'checkout.place-order' });
    expect(session.confirms()).toHaveLength(0); // no ask, no approval, no trace
    expect(session.transitions().filter((t) => t.cause.affordanceId === 'checkout.place-order')).toHaveLength(1);
  });

  it('the forged fire is refused: bare confirm on the first call, no ask ever landed', async () => {
    const session = enforcedShop();
    const port = skillsAsTools(session);

    const answer = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    await tick();

    // Nothing executed, and the model is handed the card instead of a wall.
    expect(answer).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED', judgment: 'needs-confirm' });
    expect(answer['why']).toContain('requireHumanApproval');
    expect(session.transitions().some((t) => t.cause.affordanceId === 'checkout.place-order')).toBe(false);
    expect(session.state()['orders']).toBeUndefined();
  });

  it('the same forgery through a DIRECT session.fire() is refused too — this is not a served-boundary gate', () => {
    const session = enforcedShop();
    const fired = session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 } });
    expect(fired).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED', affordanceId: 'checkout.place-order' });
  });

  it('confirm smuggled into an assembled options bag authorizes nothing — FireOptions has no such field', () => {
    const session = enforcedShop();
    // The relay shape: an options object built from a wire payload. `confirm` is
    // silently dropped (it is not a FireOptions field and never will be), so this
    // is the plain unapproved fire it always was.
    const wire = { source: 'agent' as const, payload: { total: 42 }, confirm: true };
    expect(session.fire('checkout.place-order', wire)).toMatchObject({ reason: 'APPROVAL_REQUIRED' });
  });

  it('confirm:true AFTER an ask landed still refuses, and the human’s card stays live', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });

    const fired = session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId });
    expect(fired).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED', askId });
    // The ask is NOT closed — a refused crossing must never bury the question.
    expect(session.groundTruth().text).toContain("Awaiting the human's decision");
    expect(session.openAskFor('checkout.place-order', { input: { total: 42 } })).toBe(askId);
  });

  it('an agent forging the ASK’s principal proves nothing — only an approving row from the door counts', () => {
    const session = enforcedShop();
    // confirmAsk is public and takes a principal, so an agent with in-process
    // reach can already stamp 'user' on an 'ask' row. It is not an approval.
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'user', input: { total: 42 } });
    expect(row(session, 'ask')!.principal).toBe('user');

    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
  });
});

// ---------------------------------------------------------------------------
// The approval that DOES work — and works exactly once
// ---------------------------------------------------------------------------

describe('a recorded human approval', () => {
  it('crosses the gate, stamps the transition, and lands a used row beside the approval', async () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    const approved = session.approveAsk(askId, { by: 'alice@ops', note: 'checked the totals' });
    expect(approved).toMatchObject({ ok: true });

    const fired = session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId });
    await tick();

    expect(fired.ok).toBe(true);
    if (!fired.ok) throw new Error('unreachable');
    expect(fired.transition.askId).toBe(askId);
    expect(kinds(session)).toEqual(['ask', 'approved', 'used']);
    // The approval stands ALONE, before any fire — that is the whole change, and
    // the absent transitionId is how the row says so.
    expect(row(session, 'approved')).toMatchObject({ principal: 'user', by: 'alice@ops', enforced: true });
    expect('transitionId' in row(session, 'approved')!).toBe(false);
    expect(row(session, 'used')).toMatchObject({ askId, transitionId: fired.transition.id, principal: 'agent' });
  });

  it('replay: a second fire under one approved askId refuses APPROVAL_SPENT', async () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    const first = session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId });
    const second = session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId });
    await tick();

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, reason: 'APPROVAL_SPENT', askId });
    // One approval, one execution, and the attempt to double-spend is a row.
    expect(kinds(session)).toEqual(['ask', 'approved', 'used', 'refused']);
    expect(session.transitions().filter((t) => t.cause.affordanceId === 'checkout.place-order')).toHaveLength(1);
  });

  it('an input-less action asked with input:"" and fired with nothing still matches (no false refusal)', async () => {
    const session = enforcedShop();
    // A uniform relay contract makes a model send `value: ''` to a click-only
    // control; fire() erases it. Both sides normalize through one helper.
    const { askId } = session.confirmAsk('checkout.subscribe', { source: 'agent', input: '' });
    session.approveAsk(askId, { by: 'alice@ops' });
    const fired = session.fire('checkout.subscribe', { source: 'agent', askId });
    await tick();
    expect(fired.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Laundering — an approval covers what was on the card and nothing else
// ---------------------------------------------------------------------------

describe('what the approval binds to', () => {
  it('payload laundering: approve total 42, fire total 9999 → APPROVAL_MISMATCH differs input', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 9_999 }, askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_MISMATCH',
      differs: 'input',
    });
  });

  it('the receipts carry what will be sent, so the human can see it', () => {
    const session = enforcedShop();
    const { receipts } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    expect(receipts.willUse).toEqual({ input: { total: 42 } });
  });

  it('instance laundering: approve the card for row o-1, fire o-999 → differs instance', () => {
    const session = ordersMap().createSession({
      node: 'list',
      state: { ids: ['o-1', 'o-999'] },
      requireHumanApproval: true,
      onWarn: () => undefined,
    });
    session.registerToolGroup('list.row', { instance: 'o-1', handlers: { refund: () => undefined } });
    session.registerToolGroup('list.row', { instance: 'o-999', handlers: { refund: () => undefined } });

    const { askId, receipts } = session.confirmAsk('list.row.refund', { source: 'agent', instance: 'o-1' });
    expect(receipts.willUse).toEqual({ instance: 'o-1' });
    session.approveAsk(askId, { by: 'alice@ops' });

    expect(session.fire('list.row.refund', { source: 'agent', instance: 'o-999', askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_MISMATCH',
      differs: 'instance',
    });
    // and the row the human WAS looking at still goes through
    expect(session.fire('list.row.refund', { source: 'agent', instance: 'o-1', askId }).ok).toBe(true);
  });

  it('supersede laundering: a re-ask with a DIFFERENT input mints a new askId', () => {
    const session = enforcedShop();
    const first = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } }).askId;
    // The agent re-asks under what used to be the same open ask. If the id were
    // reused, the card on screen showing 42 would authorize 9999 the moment the
    // human clicked Approve.
    const second = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 9_999 } }).askId;
    expect(second).not.toBe(first);

    // The human approves THE CARD THEY ARE LOOKING AT.
    session.approveAsk(first, { by: 'alice@ops' });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 9_999 }, askId: second })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId: first }).ok).toBe(true);
  });

  it('an IDENTICAL re-ask reuses the id — a re-rendered card is not a new question', () => {
    const session = enforcedShop();
    const first = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } }).askId;
    const again = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } }).askId;
    expect(again).toBe(first);
  });

  it('cross-affordance substitution: an approval for add-note presented on place-order', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.add-note', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_MISMATCH',
      differs: 'action',
    });
  });

  it('cross-session presentation: ask#1 from session A never resolves in session B', () => {
    const a = enforcedShop();
    const b = enforcedShop();
    const { askId } = a.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    a.approveAsk(askId, { by: 'alice@ops' });
    // Both sessions mint 'ask#1' — the id is a per-session counter, so B holds no
    // such ask and the pointer proves nothing there.
    expect(b.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } }).askId).toBe(askId);
    expect(b.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
  });

  it('uncomparable input REFUSES rather than approximating a match', () => {
    const session = enforcedShop();
    const payload = { when: new Date(0), amount: 1n === 1n ? 1 : 2 };
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: payload });
    session.approveAsk(askId, { by: 'alice@ops' });

    expect(session.fire('checkout.place-order', { source: 'agent', payload, askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_MISMATCH',
      differs: 'cannot-judge',
    });
  });
});

// ---------------------------------------------------------------------------
// A no must be as unforgeable as a yes
// ---------------------------------------------------------------------------

describe('the decline path', () => {
  it('decline burial: an agent-relayed decline closes NOTHING and the card stays live', () => {
    const session = enforcedShop();
    const port = skillsAsTools(session);
    port.call('shop.do_action', { action: 'place-order', input: { total: 42 } }); // the ask

    const declined = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, decline: true });

    expect(declined).toMatchObject({ ok: false, judgment: 'declined', recordedAs: 'your-report' });
    expect(declined['why']).toContain('still open');
    // groundTruth still says the question is live — the human's card did not vanish.
    expect(session.groundTruth().text).toContain("Awaiting the human's decision");
    expect(row(session, 'declined')!.principal).toBe('agent');
  });

  it('manufactured human no: an agent-sourced decline never substitutes for the human door', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.declineConfirm('checkout.place-order', { principal: 'agent', by: 'the model' });

    // The ask is still answerable by the person, which it would not be if the
    // relay had counted as their decision.
    expect(session.approveAsk(askId, { by: 'alice@ops' })).toMatchObject({ ok: true });
  });

  it('decline finality: a human no is terminal for that askId, for the session’s life', async () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    expect(session.declineAsk(askId, { by: 'alice@ops', note: 'over budget' })).toMatchObject({ ok: true });

    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_DECLINED',
    });
    expect(session.approveAsk(askId, { by: 'alice@ops' })).toMatchObject({ reason: 'ASK_ALREADY_ANSWERED' });
    // The decline row is still there, un-erasable, after the refused crossing.
    await tick();
    expect(kinds(session)).toEqual(['ask', 'declined', 'refused']);
  });

  it('nagging after a no is countable: the re-ask mints a NEW id and the FACTS block carries the decline', () => {
    const session = enforcedShop();
    const first = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } }).askId;
    session.declineAsk(first, { by: 'alice@ops' });

    const second = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } }).askId;
    expect(second).not.toBe(first);
    expect(kinds(session)).toEqual(['ask', 'declined', 'ask']);

    const facts = session.groundTruth().text;
    expect(facts).toContain(`The human declined: checkout.place-order (${first}).`);
    expect(facts).toContain(`Awaiting the human's decision: checkout.place-order (${second}).`);
  });

  it('the human’s own decline closes the one open card (the ordinary UI case)', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    const declined = session.declineConfirm('checkout.place-order', { by: 'alice@ops' });
    expect(declined).toMatchObject({ kind: 'declined', askId, principal: 'user', enforced: true });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      reason: 'APPROVAL_DECLINED',
    });
  });
});

// ---------------------------------------------------------------------------
// Staleness — recorded always, enforced only when asked
// ---------------------------------------------------------------------------

describe('a yes from a world that moved on', () => {
  it('expired approval: the yes was given longer ago than the rules allow', () => {
    let clock = 1_000;
    const session = enforcedShop({ expiresAfterMs: 5_000 }, () => clock);
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    clock = 1_000 + 5_001;
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_STALE',
    });
  });

  it('world moved: a committed state report between the yes and the fire', () => {
    const session = enforcedShop({ refuseWhenWorldMoved: true });
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    session.updateState({ cart: ['something else'] }, { stimulus: 'push' });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_STALE',
    });
  });

  it('and with both rules off, the same old yes still stands (the stamps are recorded, not enforced)', () => {
    let clock = 1_000;
    const session = enforcedShop(true, () => clock);
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });
    expect(row(session, 'approved')!.stateVersion).toBe(session.stateVersion);

    clock = 9_999_999;
    session.updateState({ cart: ['moved'] }, { stimulus: 'push' });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ALWAYS ALLOW — a policy row, scoped, revocable, and visibly exercised
// ---------------------------------------------------------------------------

describe('a durable grant', () => {
  it('authorizes every fire, and every one lands a used row so the count is visible', async () => {
    const session = enforcedShop();
    const grant = session.alwaysApprove('checkout.place-order', { by: 'alice@ops', note: 'any total, this session' });
    expect(grant).toMatchObject({ ok: true });
    if (!grant.ok) throw new Error('unreachable');
    expect(grant.record).toMatchObject({ kind: 'always-approved', principal: 'user', by: 'alice@ops' });
    expect(grant.record.askId).toMatch(/^grant#/);

    for (const total of [1, 2, 3]) {
      expect(session.fire('checkout.place-order', { source: 'agent', payload: { total } }).ok).toBe(true);
    }
    await tick();

    const used = session.confirms().filter((r) => r.kind === 'used');
    expect(used).toHaveLength(3);
    expect(used.every((r) => r.askId === grant.record.askId)).toBe(true);
  });

  it('revocation closes it immediately, and the next fire refuses', async () => {
    const session = enforcedShop();
    session.alwaysApprove('checkout.place-order', { by: 'alice@ops' });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 } }).ok).toBe(true);

    expect(session.revokeAlwaysApprove('checkout.place-order', { by: 'alice@ops' })).toMatchObject({ ok: true });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 } })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_REQUIRED',
    });
    await tick();
    expect(kinds(session)).toEqual(['always-approved', 'used', 'revoked', 'refused']);
  });

  it('scope escape: a grant for one action does not reach another', () => {
    const session = enforcedShop();
    session.alwaysApprove('checkout.add-note', { by: 'alice@ops' });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 } })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
  });

  it('scope escape: a grant scoped to one row does not reach another row', () => {
    const session = ordersMap().createSession({
      node: 'list',
      state: { ids: ['o-1', 'o-2'] },
      requireHumanApproval: true,
      onWarn: () => undefined,
    });
    session.registerToolGroup('list.row', { instance: 'o-1', handlers: { refund: () => undefined } });
    session.registerToolGroup('list.row', { instance: 'o-2', handlers: { refund: () => undefined } });
    session.alwaysApprove('list.row.refund', { by: 'alice@ops', instance: 'o-1' });

    expect(session.fire('list.row.refund', { source: 'agent', instance: 'o-1' }).ok).toBe(true);
    expect(session.fire('list.row.refund', { source: 'agent', instance: 'o-2' })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
  });

  it('an expiring grant refuses as STALE once its window closes', () => {
    let clock = 1_000;
    const session = enforcedShop(true, () => clock);
    session.alwaysApprove('checkout.place-order', { by: 'alice@ops', expiresInMs: 1_000 });
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 } }).ok).toBe(true);

    clock = 1_000 + 1_001;
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 } })).toMatchObject({
      reason: 'APPROVAL_STALE',
    });
  });
});

// ---------------------------------------------------------------------------
// The doors themselves
// ---------------------------------------------------------------------------

describe('the human-side doors', () => {
  it('refuse NOT_ENFORCED without the option — a row nothing reads would authorize nothing', () => {
    const session = shopMap().createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent' });
    for (const result of [
      session.approveAsk(askId, { by: 'alice@ops' }),
      session.declineAsk(askId, { by: 'alice@ops' }),
      session.alwaysApprove('checkout.place-order', { by: 'alice@ops' }),
      session.revokeAlwaysApprove('checkout.place-order', { by: 'alice@ops' }),
    ]) {
      expect(result).toMatchObject({ ok: false, reason: 'NOT_ENFORCED' });
      if (result.ok) throw new Error('unreachable');
      expect(result.explanation).toContain('requireHumanApproval');
    }
    expect(session.confirms()).toHaveLength(1); // the ask, and nothing else
  });

  it('require a decider — an approval whose decider is unknown is the claim-as-fact this closes', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent' });
    // A plain-JS caller who omitted it gets a typed refusal, not a throw: these
    // run inside click handlers.
    const missing = session.approveAsk(askId, {} as { by: string });
    expect(missing).toMatchObject({ ok: false, reason: 'NEEDS_DECIDER' });
    expect(session.approveAsk(askId, { by: '   ' })).toMatchObject({ reason: 'NEEDS_DECIDER' });
    expect(session.confirms()).toHaveLength(1);
  });

  it('refuse an unknown ask and never overwrite a decision', () => {
    const session = enforcedShop();
    expect(session.approveAsk('ask#404', { by: 'alice@ops' })).toMatchObject({ reason: 'UNKNOWN_ASK' });
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent' });
    session.approveAsk(askId, { by: 'alice@ops' });
    expect(session.approveAsk(askId, { by: 'mallory' })).toMatchObject({ reason: 'ASK_ALREADY_ANSWERED' });
    expect(session.declineAsk(askId, { by: 'mallory' })).toMatchObject({ reason: 'ASK_ALREADY_ANSWERED' });
  });

  it('revoking nothing says so instead of reporting a success', () => {
    const session = enforcedShop();
    expect(session.revokeAlwaysApprove('checkout.place-order', { by: 'alice@ops' })).toMatchObject({
      reason: 'UNKNOWN_ASK',
    });
  });

  it('an approval is stamped user WHATEVER the caller does — the door has no principal to lie with', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent' });
    const approved = session.approveAsk(askId, { by: 'alice@ops' } as { by: string; principal?: string });
    if (!approved.ok) throw new Error('unreachable');
    expect(approved.record.principal).toBe('user');
  });
});

// ---------------------------------------------------------------------------
// Nothing is silent, and nothing else changes
// ---------------------------------------------------------------------------

describe('a refused crossing is visible in BOTH ledgers', () => {
  it('a gap row so groundTruth says it did NOT happen, and a confirm row so the journal tells the whole story', () => {
    const session = enforcedShop();
    session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 } });

    const gaps = session.gaps().filter((g) => g.kind === 'fire-rejected');
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ rejectionReason: 'APPROVAL_REQUIRED', principal: 'agent' });
    expect(session.groundTruth().text).toContain('did NOT happen');
    expect(session.groundTruth().text).toContain('APPROVAL_REQUIRED');

    const refused = row(session, 'refused')!;
    expect(refused).toMatchObject({ rejectionReason: 'APPROVAL_REQUIRED', principal: 'agent', enforced: true });
    // No pointer was presented, so the row gets its own id rather than borrowing
    // an innocent ask's.
    expect(refused.askId).toMatch(/^refusal#/);
  });

  it('rows are NEVER deduped — a repeated forgery is new information — while the warning is', () => {
    const warnings: string[] = [];
    const session = shopMap().createSession({
      node: 'checkout',
      state: {},
      requireHumanApproval: true,
      onWarn: (m) => warnings.push(m),
    });
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });

    for (let i = 0; i < 3; i++) session.fire('checkout.place-order', { source: 'agent', payload: { total: 1 } });

    expect(session.confirms().filter((r) => r.kind === 'refused')).toHaveLength(3);
    expect(session.gaps().filter((g) => g.rejectionReason === 'APPROVAL_REQUIRED')).toHaveLength(3);
    expect(warnings.filter((w) => w.includes('APPROVAL_REQUIRED'))).toHaveLength(1);
  });

  it('journal tampering: a listener mutating its handed row cannot change the journal', () => {
    const session = enforcedShop();
    const seen: ConfirmRecord[] = [];
    session.onConfirm((r) => seen.push(r));
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    seen[1].principal = 'agent';
    seen[1].kind = 'ask';
    (seen[1] as { by?: string }).by = 'mallory';
    expect(row(session, 'approved')).toMatchObject({ principal: 'user', by: 'alice@ops' });
    // And the tampered copy cannot buy a crossing either.
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId }).ok).toBe(true);
  });

  it('tour escape: allowUnmaterializedFires cannot walk an unapproved high-effect door', () => {
    const session = shopMap().createSession({
      node: 'checkout',
      state: {},
      requireHumanApproval: true,
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    // Nothing is registered: without the gate this would be the success-shaped
    // no-op (ok:true, executed:false) an agent could use to enumerate the
    // high-effect doors by firing them.
    const fired = session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 } });
    expect(fired).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
    expect(session.gaps().some((g) => g.kind === 'unmaterialized-fire')).toBe(false);
  });

  it('under enforcement NOTHING but the door writes an approving row — not even the app’s own click', async () => {
    // The forgery shape 0.6 shipped: a fire minting the row named 'approved' and
    // stamping it with its OWN principal. Under enforcement a source:'user' fire
    // is exempt from the GATE (real motion really happened) but must still not
    // mint an approval — a 'user'-principal 'approved' row nobody approved is a
    // lie an auditor reading confirms() would believe, and it names the exact
    // askId a later agent fire would present.
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });

    expect(session.fire('checkout.place-order', { source: 'user', payload: { total: 42 } }).ok).toBe(true);
    await tick();

    expect(kinds(session)).toEqual(['ask']);
    expect(session.confirms().some((r) => r.kind === 'approved')).toBe(false);
    // The card is still live, because nobody answered it.
    expect(session.groundTruth().text).toContain("Awaiting the human's decision");
    // And the agent still cannot cross on the back of that click.
    expect(session.fire('checkout.place-order', { source: 'agent', payload: { total: 42 }, askId })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
  });

  it('a LOW-effect action is untouched — enforcement covers what the author marked', async () => {
    const session = enforcedShop();
    expect(session.fire('checkout.add-note', { source: 'agent', payload: { text: 'hi' } }).ok).toBe(true);
    await tick();
    expect(session.confirms()).toHaveLength(0);
  });

  it('incoherent config: confirmHighEffect:false plus enforcement still ASKS, and still refuses', async () => {
    const session = enforcedShop();
    const port = skillsAsTools(session, { confirmHighEffect: false });

    const asked = port.call('shop.do_action', { action: 'place-order', input: { total: 42 } });
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm' });
    const forced = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    await tick();
    expect(forced).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
    expect(session.state()['orders']).toBeUndefined();
  });

  it('the served confirm argument tells the truth about the session it belongs to', () => {
    const plain = skillsAsTools(shopMap().createSession({ node: 'checkout', state: {} }));
    const strict = skillsAsTools(enforcedShop());
    const confirmDoc = (port: ReturnType<typeof skillsAsTools>): string => {
      const tool = port.tools().find((t) => t.name === 'shop.do_action')!;
      const schema = tool.inputSchema as { properties: { confirm: { description: string } } };
      return schema.properties.confirm.description;
    };
    expect(confirmDoc(plain)).toContain('Required true to proceed');
    expect(confirmDoc(strict)).toContain('does not by itself authorize');
    // Still frozen: the mode cannot change mid-conversation, so the bytes cannot.
    expect(JSON.stringify(strict.tools())).toBe(JSON.stringify(strict.tools()));
  });
});

// ---------------------------------------------------------------------------
// The whole flow, over Mode B, the way an app actually runs it
// ---------------------------------------------------------------------------

describe('end to end over the serving layer', () => {
  it('ask → the app records the human’s ALLOW → the agent’s confirm crosses, once', async () => {
    const session = enforcedShop();
    const port = skillsAsTools(session);

    const asked = port.call('shop.do_action', { action: 'place-order', input: { total: 42 } });
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm' });
    expect(asked['howToAct']).toContain('approve it in the app');
    const askId = asked['askId'] as string;

    // The app's own Approve button — a channel the model does not write.
    expect(session.approveAsk(askId, { by: 'alice@ops' })).toMatchObject({ ok: true });

    const fired = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    await tick();
    expect(fired).toMatchObject({ ok: true, did: 'checkout.place-order' });

    const again = port.call('shop.do_action', { action: 'place-order', input: { total: 42 }, confirm: true });
    await tick();
    expect(again).toMatchObject({ ok: false, reason: 'APPROVAL_SPENT' });
    expect(again['why']).toContain('One yes authorizes one action');
    expect(kinds(session)).toEqual(['ask', 'approved', 'used', 'refused']);
  });

  it('an approved-but-unfired action has its own FACTS line — the block never goes silent', () => {
    const session = enforcedShop();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent', input: { total: 42 } });
    session.approveAsk(askId, { by: 'alice@ops' });

    const facts = session.groundTruth().text;
    expect(facts).toContain(`Approved by the human, not yet done: checkout.place-order (${askId}).`);
    // by/note are runtime free text and deliberately stay out of the block.
    expect(facts).not.toContain('alice@ops');
  });

  it('a mismatched fire over the port teaches which join failed', async () => {
    const session = enforcedShop();
    const port = skillsAsTools(session);
    const asked = port.call('shop.do_action', { action: 'place-order', input: { total: 42 } });
    session.approveAsk(asked['askId'] as string, { by: 'alice@ops' });

    const laundered = port.call('shop.do_action', { action: 'place-order', input: { total: 9_999 }, confirm: true });
    await tick();
    // The port presents the ask matching THIS input, and there is none approved
    // for 9999 — so the crossing is refused and the model is handed a fresh card
    // for the new input rather than the earlier approval being re-pointed at it.
    expect(laundered).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED', judgment: 'needs-confirm' });
    expect((laundered['receipts'] as { willUse?: unknown }).willUse).toEqual({ input: { total: 9_999 } });
    expect(session.state()['orders']).toBeUndefined();
  });
});
