/**
 * The live half, end to end: a real store, a real session, real fires.
 *
 * Every expectation below is a value the SESSION returned. Where a test pins a
 * refusal it pins the typed reason and the gesture that came with it, because
 * that pair is what the demo's panels print.
 */
import { describe, expect, it } from 'vitest';
import { NAMED_TICKET_ID } from '../app/tickets.js';
import { bootDesk, flush, offeredIds } from './fixture.js';
import { createDesk } from './wiring.js';

const REPLY = 'desk.inbox.tickets.reply-to-ticket';
const ARCHIVE = 'desk.inbox.tickets.archive-ticket';

describe('t1 — a chatty store moves nothing', () => {
  it('re-emitting without changing anything registers nothing, warns nothing, bumps nothing', async () => {
    const desk = await bootDesk();
    const beats = desk.structureBeats.length;
    const structureVersion = desk.session.structureVersion;
    const offered = offeredIds(desk).sort();

    // Five emissions that change no action: exactly what a React store does
    // when an unrelated slice of state moves.
    for (let index = 0; index < 5; index += 1) desk.store.commands.setDraft('');
    await flush();

    expect(desk.warnings).toEqual([]); // the registry's last-wins warning never spammed
    expect(desk.structureBeats.length).toBe(beats); // no phantom world motion
    expect(desk.session.structureVersion).toBe(structureVersion);
    expect(offeredIds(desk).sort()).toEqual(offered);
  });

  it('a REAL change moves the structure axis exactly once', async () => {
    const desk = await bootDesk();
    const beats = desk.structureBeats.length;

    desk.store.unmountControl('compose-button');
    await flush();

    expect(desk.structureBeats.length).toBe(beats + 1);
    expect(offeredIds(desk)).not.toContain('desk.open-compose');

    desk.store.mountControl('compose-button');
    await flush();
    expect(desk.structureBeats.length).toBe(beats + 2);
    expect(offeredIds(desk)).toContain('desk.open-compose');
  });

  it('an action materialises only while its control is on screen', async () => {
    const desk = await bootDesk();
    const wired = desk.session.available().edges.find((edge) => edge.affordanceId === 'desk.open-compose');
    expect(wired?.materialized).toBe(true);
    expect(wired?.binding).toEqual({
      kind: 'element',
      locator: { role: 'button', name: 'Compose' },
      actuation: 'click',
    });

    desk.store.unmountControl('compose-button');
    await flush();
    const fired = desk.session.fire('desk.open-compose', { source: 'agent' });
    expect(fired.ok).toBe(false);
    if (fired.ok) return;
    expect(fired.reason).toBe('UNKNOWN_AFFORDANCE');
  });
});

describe('t2 — enabled is a per-row truth', () => {
  it('greyed out refuses TOOL_DISABLED; answering the ticket makes the same fire perform', async () => {
    const desk = await bootDesk();

    const refused = desk.session.fire(ARCHIVE, { source: 'agent', instance: NAMED_TICKET_ID });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.reason).toBe('TOOL_DISABLED');

    const replied = desk.session.fire(REPLY, {
      source: 'agent',
      instance: NAMED_TICKET_ID,
      payload: { message: 'Refund is on the way.' },
    });
    expect(replied.ok).toBe(true);
    if (!replied.ok) return;
    expect(replied.settlement).toBe('awaiting-state');
    const settled = await replied.whenSettled;
    expect(settled.effectStatus).toBe('performed');
    await flush();

    // The store's tap reported the delta the reply DECLARED, so the claim is checked.
    const record = desk.session.transitions().find((row) => row.id === replied.transition.id);
    expect(record?.outcome).toBe('committed');
    expect(record?.effectVerified).toBe(true);

    const performed = desk.session.fire(ARCHIVE, { source: 'agent', instance: NAMED_TICKET_ID });
    expect(performed.ok).toBe(true);
    if (!performed.ok) return;
    expect((await performed.whenSettled).effectStatus).toBe('performed');
    await flush();
    expect(desk.store.state.tickets.find((row) => row.id === NAMED_TICKET_ID)?.status).toBe('archived');
  });
});

describe('t3 — the tab gesture is its own gesture', () => {
  it('unwired: the refusal names the gesture, and the backlog row names the missing wiring', async () => {
    const desk = await bootDesk();

    const refused = desk.session.fire('desk.switch-to-archive', { source: 'agent' });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.reason).toBe('NOT_MATERIALIZED');
    if (refused.reason !== 'NOT_MATERIALIZED') return;
    expect(refused.gesture).toEqual({ kind: 'tab', target: 'desk.archive' });

    const row = desk.session.gaps().at(-1);
    expect(row?.kind).toBe('fire-rejected');
    expect(row?.rejectionReason).toBe('NOT_MATERIALIZED');
    expect(row?.affordanceId).toBe('desk.switch-to-archive');
    expect(row?.gestureKind).toBe('tab');
  });

  it('wired: it performs, the tab really flips, and the page cursor does not move', async () => {
    const desk = await bootDesk();
    desk.store.mountControl('archive-panel');
    desk.store.commands.setTabSwitcherWired(true);
    await flush();

    const nodeBefore = desk.session.node;
    const fired = desk.session.fire('desk.switch-to-archive', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect((await fired.whenSettled).effectStatus).toBe('performed');
    await flush();

    expect(desk.store.state.tab).toBe('archive');
    expect(desk.session.node).toBe(nodeBefore); // flipping a tab is not going somewhere

    // The visibility flip the app reported with show(): the archive's tool is
    // served, and the inbox's are not — even though the inbox list is STILL
    // mounted and its actions are still published by the store.
    const offered = offeredIds(desk);
    expect(offered).toContain('desk.archive.clear-archive');
    expect(offered).not.toContain('desk.inbox.list-tickets');
    expect(desk.store.actions().some((action) => action.node === 'desk.inbox')).toBe(true);

    const masked = desk.session.fire('desk.inbox.list-tickets', { source: 'agent' });
    expect(masked.ok).toBe(false);
    if (masked.ok) return;
    expect(masked.reason).toBe('NODE_NOT_VISIBLE');
  });
});

describe('t4 — the render cap caps what is shown, never what can be done', () => {
  it('fires the ticket that is past the cap', async () => {
    const desk = await bootDesk();
    const edge = desk.session.available().edges.find((row) => row.affordanceId === REPLY);
    expect(edge?.instances).toHaveLength(50);
    expect(edge?.enumeration).toBe('selector');
    expect(edge?.instances).not.toContain(NAMED_TICKET_ID);

    const fired = desk.session.fire(REPLY, {
      source: 'agent',
      instance: NAMED_TICKET_ID,
      payload: { message: 'Refund is on the way.' },
    });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    expect((await fired.whenSettled).effectStatus).toBe('performed');
    await flush();
    expect(desk.session.producedFor(fired.transition.id)).toMatchObject({
      ticketId: NAMED_TICKET_ID,
      to: 'Priya Raman',
    });
  });

  it('an instance that does not exist is refused with the keys that do', async () => {
    const desk = await bootDesk();
    const fired = desk.session.fire(REPLY, { source: 'agent', instance: 't-999' });
    expect(fired.ok).toBe(false);
    if (fired.ok) return;
    expect(fired.reason).toBe('INSTANCE_UNKNOWN');
  });
});

describe('t5 — detach, re-attach, and the door back', () => {
  it('detach releases everything, is idempotent, and the direct door restores it cleanly', async () => {
    const desk = await bootDesk();
    expect(offeredIds(desk).length).toBeGreaterThan(0);

    desk.detachSources();
    expect(offeredIds(desk)).toEqual([]);
    desk.detachSources(); // idempotent
    expect(desk.sourcesAttached()).toBe(false);

    desk.reattachSources();
    await flush();
    expect(offeredIds(desk)).toContain('desk.open-compose');
    desk.reattachSources(); // already attached: a second call attaches nothing twice
    await flush();
    expect(desk.warnings).toEqual([]);

    // And the restored bindings really execute.
    const fired = desk.session.fire('desk.open-compose', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(desk.store.state.composeOpen).toBe(true);
  });

  it('a store change AFTER detach resurrects nothing', async () => {
    const desk = await bootDesk();
    desk.detachSources();
    desk.store.mountControl('archive-panel');
    await flush();
    expect(offeredIds(desk)).toEqual([]);
  });
});

describe('the modal really masks, and a guard really refuses', () => {
  it('an open compose window blocks the desk behind it', async () => {
    const desk = await bootDesk();
    desk.store.commands.openCompose();
    desk.store.mountControl('compose-modal');
    await flush();

    const blocked = desk.session.fire('desk.open-compose', { source: 'agent' });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.reason).toBe('BLOCKED_BY_OVERLAY');
  });

  it('an empty draft cannot be sent, and the refusal carries the evidence', async () => {
    const desk = await bootDesk();
    desk.store.commands.openCompose();
    desk.store.mountControl('compose-modal');
    await flush();

    expect(offeredIds(desk)).not.toContain('desk.compose.send-message');
    const refused = desk.session.fire('desk.compose.send-message', { source: 'agent' });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.reason).toBe('GUARD_FAILED');
    if (refused.reason !== 'GUARD_FAILED') return;
    expect(refused.evidence).toMatchObject([
      { key: 'composeDraftLength', op: 'gt', threshold: 0, actualSummary: '0', result: false },
    ]);

    desk.store.commands.setDraft('Hello');
    await flush();
    expect(offeredIds(desk)).toContain('desk.compose.send-message');
  });
});

describe('stopping the wiring', () => {
  it('stops the app REPORTING while the source keeps binding — two seams, separately', async () => {
    const desk = await bootDesk();
    desk.stop();

    desk.store.mountControl('archive-panel');
    desk.store.commands.switchTab('archive');
    await flush();

    // The live source is still attached, so the archive's action registered…
    expect(desk.store.actions().some((action) => action.name === 'clear-archive')).toBe(true);
    // …but nobody told the session the tab moved, so the session still shows
    // the inbox. An app that stops reporting goes stale — visibly, not silently.
    expect(offeredIds(desk)).toContain('desk.inbox.list-tickets');
    expect(offeredIds(desk)).not.toContain('desk.archive.clear-archive');
  });
});

describe('the desk boots honest', () => {
  it('offers nothing before a single control has reported itself', () => {
    const desk = createDesk();
    // Only the tab switchers, which the desk declares whether or not anything
    // is wired to perform them.
    expect(offeredIds(desk).sort()).toEqual(['desk.switch-to-archive', 'desk.switch-to-inbox']);
    // And the materialisation marker is ABSENT, not false: with nothing
    // registered anywhere the session does not claim to know, and the demo's
    // tool rack must print a marker only when one was actually returned.
    for (const edge of desk.session.available().edges) expect(edge.materialized).toBeUndefined();
  });
});
