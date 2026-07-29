/**
 * The panel derivations, fed by a REAL session — because the one thing they
 * must never do is describe a field the API did not send.
 */
import { describe, expect, it } from 'vitest';
import { NAMED_TICKET_ID } from '../app/tickets.js';
import { bootDesk, flush } from '../desk/fixture.js';
import { backlogOf } from './backlog.js';
import { rackOf } from './rack.js';
import { confirmLinesOf, receiptsOf } from './receipts.js';

describe('the tool rack renders what came back, and only that', () => {
  it('omits a marker whose field the session did not return', async () => {
    const desk = await bootDesk();
    const rack = rackOf(desk.session.available());
    expect(rack.from).toBe('available()');

    const compose = rack.rows.find((row) => row.id === 'desk.open-compose');
    expect(compose?.markers).toContainEqual({ label: 'materialized', value: 'true', wanting: false });
    // Nothing said this edge is disabled, so no `enabled` chip exists at all —
    // printing `enabled: true` would be the app inventing a fact.
    expect(compose?.markers.some((marker) => marker.label === 'enabled')).toBe(false);
    expect(compose?.markers.some((marker) => marker.label === 'guardUnevaluated')).toBe(false);
  });

  it('names the gesture, the instance count and where the count came from', async () => {
    const desk = await bootDesk();
    const rows = rackOf(desk.session.available()).rows;
    const archive = rows.find((row) => row.id === 'desk.inbox.tickets.archive-ticket');
    expect(archive?.markers).toContainEqual({ label: 'gesture', value: 'element' });
    expect(archive?.markers).toContainEqual({ label: 'instances', value: '50' });
    expect(archive?.markers).toContainEqual({ label: 'enumeration', value: 'selector', wanting: false });
    expect(archive?.node).toBe('desk.inbox.tickets');
  });

  it('answers about the ACTION, not the row — and the app prints that unimproved', async () => {
    const desk = await bootDesk();
    const rows = rackOf(desk.session.available()).rows;
    const archive = rows.find((row) => row.id === 'desk.inbox.tickets.archive-ticket');
    // Every row IS wired — under its own instance key ('…archive-ticket[t-51]').
    // available() answers about the affordance id, which has no bare
    // registration, so it says materialized:false and offers no `enabled`
    // marker at all. The rack prints that as it came: dressing it up would be
    // the app asserting something the session never returned. Per-row truth
    // arrives where it is actually known — in the fire receipt (TOOL_DISABLED
    // for an unanswered ticket, performed once it has been answered).
    expect(archive?.markers).toContainEqual({ label: 'materialized', value: 'false', wanting: true });
    expect(archive?.markers.some((marker) => marker.label === 'enabled')).toBe(false);
    const perRow = desk.session.fire('desk.inbox.tickets.archive-ticket', {
      source: 'agent',
      instance: NAMED_TICKET_ID,
    });
    expect(perRow.ok).toBe(false);
    if (perRow.ok) return;
    expect(perRow.reason).toBe('TOOL_DISABLED');
  });

  it('carries the tab gesture on the switch nobody wired', async () => {
    const desk = await bootDesk();
    const rows = rackOf(desk.session.available()).rows;
    const tab = rows.find((row) => row.id === 'desk.switch-to-archive');
    expect(tab?.markers).toContainEqual({ label: 'gesture', value: 'tab' });
    expect(tab?.markers).toContainEqual({ label: 'materialized', value: 'false', wanting: true });
  });
});

describe('the backlog says WHICH wiring is missing', () => {
  it('clusters refusals by gesture and reason, biggest first', async () => {
    const desk = await bootDesk();
    desk.session.fire('desk.switch-to-archive', { source: 'agent' });
    desk.session.fire('desk.switch-to-archive', { source: 'agent' });
    desk.session.fire('desk.switch-to-inbox', { source: 'agent' });
    desk.session.fire('desk.inbox.tickets.archive-ticket', { source: 'agent', instance: NAMED_TICKET_ID });

    const backlog = backlogOf(desk.session.gaps());
    expect(backlog.from).toBe('gaps()');
    expect(backlog.total).toBe(4);

    const missingTabHandler = backlog.clusters[0];
    expect(missingTabHandler?.gesture).toBe('tab');
    expect(missingTabHandler?.reason).toBe('NOT_MATERIALIZED');
    expect(missingTabHandler?.count).toBe(3);
    expect(missingTabHandler?.actions).toEqual(['desk.switch-to-archive', 'desk.switch-to-inbox']);

    // The greyed row is a different cluster, and it carries NO gesture: the
    // library stamps gestureKind on the wiring-shaped refusals only, so
    // 'none' reads as "this refusal is not about missing wiring" — which is
    // exactly right, the desk simply said not yet.
    expect(backlog.clusters).toContainEqual(
      expect.objectContaining({ gesture: 'none', reason: 'TOOL_DISABLED', count: 1 }),
    );
  });

  it('is empty when nothing has been refused', async () => {
    const desk = await bootDesk();
    expect(backlogOf(desk.session.gaps())).toEqual({ from: 'gaps()', total: 0, clusters: [] });
  });
});

describe('receipts quote the log', () => {
  it('flags the verified effect and carries what the handler produced', async () => {
    const desk = await bootDesk();
    const fired = desk.session.fire('desk.inbox.tickets.reply-to-ticket', {
      source: 'agent',
      instance: NAMED_TICKET_ID,
      payload: { message: 'Refund is on the way.' },
    });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    await flush();

    const receipt = receiptsOf(desk.session.transitions()).find((row) => row.id === fired.transition.id);
    expect(receipt?.kind).toBe('fired');
    expect(receipt?.who).toBe('agent');
    expect(receipt?.what).toBe('desk.inbox.tickets.reply-to-ticket');
    expect(receipt?.outcome).toBe('committed');
    expect(receipt?.flags).toContain('effectVerified');
    expect(receipt?.produced).toMatchObject({ ticketId: NAMED_TICKET_ID, to: 'Priya Raman' });
  });

  it('names a world-motion row as the stimulus it was, never as an action', async () => {
    const desk = await bootDesk();
    const structural = receiptsOf(desk.session.transitions()).find((row) => row.kind === 'stimulus');
    expect(structural?.what).toBe('stimulus:structure-swap');
    expect(structural?.who).toBe('system');
  });

  it('quotes a high-effect ask instead of paraphrasing it', async () => {
    const desk = await bootDesk();
    desk.store.mountControl('archive-panel');
    desk.store.commands.setTabSwitcherWired(true);
    await flush();
    desk.store.commands.switchTab('archive');
    await flush();

    desk.session.confirmAsk('desk.archive.clear-archive', { source: 'agent' });
    const lines = confirmLinesOf(desk.session.confirms());
    expect(lines).toHaveLength(1);
    expect(lines[0]?.kind).toBe('ask');
    expect(lines[0]?.affordanceId).toBe('desk.archive.clear-archive');
    expect(lines[0]?.willDo).toEqual([
      'Permanently delete every archived ticket',
      'claims to write: archivedCount',
    ]);
  });
});
