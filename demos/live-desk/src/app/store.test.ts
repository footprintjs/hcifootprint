/**
 * The store's own contract, tested without a session: it is an ordinary app
 * store, and everything hcifootprint needs from it must already be true here.
 */
import { describe, expect, it } from 'vitest';
import { identityOf } from './actions.js';
import { DeskStore } from './store.js';
import { NAMED_TICKET_ID } from './tickets.js';
import { openTickets } from './state.js';

describe('the store as an app store', () => {
  it('publishes an action only while its control is on screen', () => {
    const store = new DeskStore();
    const before = store.actions().map(identityOf);
    expect(before).not.toContain('desk.open-compose');

    store.mountControl('compose-button');
    expect(store.actions().map(identityOf)).toContain('desk.open-compose');

    store.unmountControl('compose-button');
    expect(store.actions().map(identityOf)).not.toContain('desk.open-compose');
  });

  it('is chatty on purpose: every read is a fresh array of fresh objects', () => {
    const store = new DeskStore();
    const first = store.actions();
    const second = store.actions();
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
    // Same content, different objects — which is why the library reconciles by
    // identity KEY and never by object identity.
    expect(second.map(identityOf)).toEqual(first.map(identityOf));
  });

  it('names an instance action the way the library keys it', () => {
    expect(identityOf({ node: 'desk', name: 'open-compose' })).toBe('desk.open-compose');
    expect(identityOf({ node: 'desk.inbox.tickets', name: 'reply-to-ticket', instance: 't-51' })).toBe(
      'desk.inbox.tickets.reply-to-ticket[t-51]',
    );
  });

  it('publishes one row action per OPEN ticket — including the one past the render cap', () => {
    const store = new DeskStore();
    store.mountControl('inbox-list');
    const ids = store.actions().map(identityOf);
    const open = openTickets(store.state);
    expect(open.length).toBe(60);
    expect(ids).toContain(`desk.inbox.tickets.reply-to-ticket[${NAMED_TICKET_ID}]`);
    // Every open ticket, not just the ones a list would render.
    for (const ticket of open) {
      expect(ids).toContain(`desk.inbox.tickets.reply-to-ticket[${ticket.id}]`);
    }
  });

  it('greys archive-ticket per row until that row has been answered', () => {
    const store = new DeskStore();
    store.mountControl('inbox-list');
    const archiveOf = (id: string) =>
      store.actions().find((action) => identityOf(action) === `desk.inbox.tickets.archive-ticket[${id}]`);

    expect(archiveOf(NAMED_TICKET_ID)?.enabled).toBe(false);
    store.commands.reply(NAMED_TICKET_ID, { message: 'On its way.' });
    expect(archiveOf(NAMED_TICKET_ID)?.enabled).toBe(true);
  });
});

describe('the rebind protocol', () => {
  it('wiring an action publishes TWO snapshots: gone, then back', () => {
    const store = new DeskStore();
    const seen: string[][] = [];
    store.subscribe(() => seen.push(store.actions().map(identityOf)));

    store.commands.setTabSwitcherWired(true);

    // Emit once instead and the library — which never re-registers an unchanged
    // identity — would go on serving the unwired binding.
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toContain('desk.switch-to-archive');
    expect(seen[1]).toContain('desk.switch-to-archive');
    expect(store.actions().find((a) => a.name === 'switch-to-archive')?.handler).toBeTypeOf('function');
  });

  it('withholds nothing outside the rebind window', () => {
    const store = new DeskStore();
    store.commands.setTabSwitcherWired(true);
    expect(store.actions().map(identityOf)).toContain('desk.switch-to-inbox');
  });
});

describe('handlers read live state, never the snapshot they were built from', () => {
  it('a handler captured before a change still acts on the desk as it is now', () => {
    const store = new DeskStore();
    store.mountControl('inbox-list');
    // Captured from an EARLY snapshot — the library binds at first sight and
    // keeps that function forever, so it had better not close over state.
    const reply = store.actions().find((a) => identityOf(a) === 'desk.inbox.tickets.reply-to-ticket[t-2]')?.handler;
    expect(reply).toBeTypeOf('function');

    store.commands.reply('t-1', { message: 'first' });
    store.commands.archive('t-1');

    const produced = reply?.({ message: 'second' }) as { ticketId: string; to: string };
    expect(produced.ticketId).toBe('t-2');
    // The desk it acted on is the current one: t-1 is already gone from the inbox.
    expect(openTickets(store.state).some((ticket) => ticket.id === 't-1')).toBe(false);
    expect(store.state.lastRepliedTo).toBe('t-2');
  });
});
