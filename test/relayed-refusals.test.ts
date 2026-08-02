/**
 * WHAT THE PORT SAYS BACK WHEN THE FIRE DID NOT HAPPEN.
 *
 * A refused fire is the moment a model is most likely to invent a story, so
 * every refusal this port relays has to carry the one fact that makes the next
 * move obvious — and never more than the session actually knows.
 *
 * FOUR SHAPES OF "NOT YET", each with its own carried fact:
 * - the caller named a control this position has more than one of  → every id,
 *   and NO guessed explanation, because an ambiguous short name is not a claim
 *   about any one action;
 * - a control that stands for many rows → the instance keys, so the caller can
 *   name the card it meant;
 * - a control whose component has not arrived → the node AND `retriable: true`,
 *   the difference between "wait" and "broken";
 * - a control the app says it is WORKING on → the app's own label, and the
 *   authored sentence that says working is neither broken nor done. It is
 *   ADDITIVE: a refusal that already had a sentence keeps it and gains this one.
 *
 * AND THE APPROVALS THAT ARE NOT A YES. Under `requireHumanApproval` the gate
 * answers with a reason, and each reason gets its own authored teaching line —
 * "they said no" and "their yes is too old" lead to opposite next moves, and a
 * single "not approved" would have collapsed them. The approval is bound to what
 * the human SAW: approve one card of a list and the same action on another card
 * asks again rather than borrowing the yes.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { NavigationGraph, InteractionSession } from '../src/index.js';

/** An order desk: two saves in different areas, a repeats row, a high-effect wipe. */
function deskMap(): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: {
      orders: {
        areas: {
          row: {
            repeats: true,
            instances: (state) => (state['orderIds'] as string[]) ?? [],
            actions: { cancel: { does: 'Cancel this order', confirm: true } },
          },
          rail: { actions: { save: { does: 'Save the filter rail' } } },
          panel: { actions: { save: { does: 'Save the detail panel' } } },
        },
        actions: {
          wipe: { does: 'Wipe every order', confirm: true },
          rename: {
            does: 'Rename the order',
            writes: ['name'],
            input: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          },
        },
      },
    },
  });
}

function desk(opts?: Record<string, unknown>): InteractionSession {
  return deskMap().createSession({
    node: 'orders',
    state: { orderIds: ['o-1', 'o-2'] },
    onWarn: () => undefined,
    ...(opts ?? {}),
  });
}

describe('a name that matches more than one control here', () => {
  it('is refused as ambiguous with every id listed, and no invented explanation', () => {
    const session = desk();
    session.registerActions('orders.rail', { handlers: { save: () => undefined } });
    session.registerActions('orders.panel', { handlers: { save: () => undefined } });
    const refused = serveToAgent(session).call('desk.do_action', { action: 'save' });

    expect(refused).toMatchObject({ ok: false, judgment: 'error', reason: 'AMBIGUOUS_ACTION' });
    expect(refused['actions']).toEqual(
      expect.arrayContaining(['orders.rail.save', 'orders.panel.save']),
    );
    // The no-match arm explains; this one does not — a short name nobody was
    // served is not a claim about any single action.
    expect(refused).not.toHaveProperty('why');
  });
});

describe('a control that stands for many rows, reached without naming one', () => {
  it('is refused with the instance keys, so the caller can say which card it meant', () => {
    const session = desk();
    session.registerActions('orders.row', { instance: 'o-1', handlers: { cancel: () => undefined } });
    const refused = serveToAgent(session).call('desk.do_action', { action: 'cancel', confirm: true });

    expect(refused).toMatchObject({
      ok: false,
      judgment: 'rejected',
      reason: 'INSTANCE_REQUIRED',
      instances: ['o-1', 'o-2'],
    });
  });
});

describe('a control whose component has not arrived yet', () => {
  it('is refused with the node AND retriable — the difference between "wait" and "broken"', () => {
    const session = desk();
    session.registerActions('orders'); // the page shell is up; the rail is still mounting
    const refused = serveToAgent(session).call('desk.do_action', { action: 'orders.rail.save' });

    expect(refused).toMatchObject({
      ok: false,
      judgment: 'rejected',
      reason: 'STILL_MOUNTING',
      node: 'orders.rail',
      retriable: true,
    });
  });
});

describe('a control the app says it is working on, refused for some other reason', () => {
  it('keeps the refusal and gains the working label — the busy sentence stands alone when nothing else spoke', () => {
    const session = desk();
    session.registerActions('orders', {
      handlers: { rename: () => undefined },
      busy: { rename: 'Renaming…' },
    });
    // PAYLOAD_INVALID carries no sentence of its own, so this is the arm where
    // the busy line IS the whole `why`.
    const refused = serveToAgent(session).call('desk.do_action', { action: 'rename', input: {} });

    expect(refused).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID', busy: 'Renaming…' });
    expect(String(refused['why'])).toContain('The app also says it is working on this control');
    expect(String(refused['why'])).not.toContain('undefined');
  });
});

describe('approvals that are not a yes', () => {
  it('a human’s no is relayed as its own refusal, and tells the agent to stop asking', () => {
    const session = desk({ requireHumanApproval: true });
    session.registerActions('orders', { handlers: { wipe: () => undefined } });
    const port = serveToAgent(session);

    const asked = port.call('desk.do_action', { action: 'wipe' });
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm', performed: false });
    session.declineAsk(asked['askId'] as string, { by: 'ada@ops' }); // the app's own Decline control

    const refused = port.call('desk.do_action', { action: 'wipe', confirm: true });
    expect(refused).toMatchObject({ ok: false, judgment: 'rejected', reason: 'APPROVAL_DECLINED' });
    expect(String(refused['why'])).toContain('The human said no to this');
    expect(session.transitions()).toHaveLength(0); // nothing was wiped
  });

  it('a yes that has gone stale is refused as stale, and asks for a fresh one', () => {
    let clock = 5_000;
    const session = desk({ requireHumanApproval: { expiresAfterMs: 10 }, now: () => clock });
    session.registerActions('orders', { handlers: { wipe: () => undefined } });
    const port = serveToAgent(session);

    const asked = port.call('desk.do_action', { action: 'wipe' });
    session.approveAsk(asked['askId'] as string, { by: 'ada@ops' });
    clock = 5_100; // the human's yes is now older than this session's rule

    const refused = port.call('desk.do_action', { action: 'wipe', confirm: true });
    expect(refused).toMatchObject({ ok: false, judgment: 'rejected', reason: 'APPROVAL_STALE' });
    expect(String(refused['why'])).toContain('too old for this session’s rules');
    expect(session.transitions()).toHaveLength(0);
  });

  it('binds the yes to the row the human saw: the same action on another card asks again', () => {
    const session = desk({ requireHumanApproval: true });
    session.registerActions('orders.row', { instance: 'o-1', handlers: { cancel: () => undefined } });
    session.registerActions('orders.row', { instance: 'o-2', handlers: { cancel: () => undefined } });
    const port = serveToAgent(session);

    const asked = port.call('desk.do_action', { action: 'cancel', instance: 'o-1' });
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm' });
    const approvedCard = asked['askId'] as string;
    session.approveAsk(approvedCard, { by: 'ada@ops' });

    // The approved card fires.
    expect(port.call('desk.do_action', { action: 'cancel', instance: 'o-1', confirm: true })).toMatchObject({
      ok: true,
      did: 'orders.row.cancel',
    });

    // The other card does not borrow that yes — it gets its own question.
    const other = port.call('desk.do_action', { action: 'cancel', instance: 'o-2', confirm: true });
    expect(other).toMatchObject({ ok: false, judgment: 'needs-confirm', reason: 'APPROVAL_REQUIRED' });
    expect(other['askId']).not.toBe(approvedCard);
    expect(session.transitions().map((row) => row.cause.affordanceId)).toEqual(['orders.row.cancel']);
  });
});
