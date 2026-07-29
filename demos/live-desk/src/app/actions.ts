/**
 * The app's ACTION CATALOGUE — a pure function of "what is on screen right now".
 *
 * This is the only place the desk describes what it can do, and it is the app's
 * own module: it names its nodes, its gestures and its handlers, and hands the
 * list to `fromLiveStore` (hcifootprint src/graph/sources/from-live-store.ts:85)
 * which turns it into per-node bindings. Nothing here is duplicated into a graph
 * definition — the graph declares PLACES (pages, tabs, the modal, the repeats
 * container); every ACTION arrives from here, at runtime, and leaves again when
 * its control does.
 *
 * Two rules this file exists to keep:
 *
 * 1. A HANDLER IS BOUND AT FIRST SIGHT AND STAYS BOUND. fromLiveStore
 *    reconciles by identity and never re-registers an unchanged one ("to
 *    replace an action's behaviour, remove it and add it back" —
 *    from-live-store.ts:16). So every handler below closes over the STABLE
 *    `commands` object and reads live state through it; a handler that closed
 *    over the state snapshot it was built from would keep executing against a
 *    desk that no longer exists. `ticketId` is safe to close over precisely
 *    because it is the row's identity, not its state.
 *
 * 2. AN ACTION EXISTS ONLY WHILE ITS CONTROL DOES. `open-compose` is published
 *    while the Compose button is mounted, the modal's actions while the modal
 *    is mounted, the row actions while the list is. That is what makes
 *    `available().materialized` follow the real UI: nothing is described here
 *    that the app is not, at that moment, able to perform.
 */
import type { LiveAction } from 'hcifootprint';
import type { ControlId, DeskCommands, DeskState } from './state.js';
import { openTickets } from './state.js';

/**
 * An action's identity across snapshots, in the SAME shape fromLiveStore uses
 * (from-live-store.ts:74-78). The store needs it to withhold one action for a
 * single emission (the rebind protocol in store.ts) — so it has to agree with
 * the library's key exactly, and a test pins the format.
 */
export function identityOf(action: Pick<LiveAction, 'node' | 'name' | 'instance'>): string {
  return action.instance === undefined
    ? `${action.node}.${action.name}`
    : `${action.node}.${action.name}[${action.instance}]`;
}

export function buildActions(
  state: DeskState,
  mounted: ReadonlySet<ControlId>,
  commands: DeskCommands,
): LiveAction[] {
  const actions: LiveAction[] = [];

  if (state.page === 'desk') {
    // --- the tab switch: DECLARED always, WIRED only when the app wired it ---
    // The desk has two tabs whether or not a function exists to flip them, so
    // the gesture is published either way. Without a handler an agent fire is
    // refused NOT_MATERIALIZED carrying this very binding — "a tab switch to
    // desk.archive", not "nothing is bound".
    actions.push({
      node: 'desk',
      name: 'switch-to-archive',
      does: 'Switch the desk to the Archive tab',
      binding: { kind: 'tab', target: 'desk.archive' },
      ...(state.tabSwitcherWired ? { handler: () => commands.switchTab('archive') } : {}),
    });
    actions.push({
      node: 'desk',
      name: 'switch-to-inbox',
      does: 'Switch the desk back to the Inbox tab',
      binding: { kind: 'tab', target: 'desk.inbox' },
      ...(state.tabSwitcherWired ? { handler: () => commands.switchTab('inbox') } : {}),
    });

    if (mounted.has('compose-button')) {
      actions.push({
        node: 'desk',
        name: 'open-compose',
        does: 'Open the compose window to write a new message',
        binding: { kind: 'element', locator: { role: 'button', name: 'Compose' }, actuation: 'click' },
        writes: ['composeOpen'],
        handler: () => commands.openCompose(),
      });
    }

    if (mounted.has('compose-modal')) {
      actions.push({
        node: 'desk.compose',
        name: 'send-message',
        does: 'Send the message that is written in the compose window',
        binding: { kind: 'element', locator: { role: 'button', name: 'Send' }, actuation: 'click' },
        // A guard over PROJECTED state, not per-row state: an empty draft
        // cannot be sent, and the refusal carries the evidence that says so.
        when: { composeDraftLength: { gt: 0 } },
        writes: ['sentCount', 'composeOpen'],
        handler: (payload?: unknown) => commands.sendMessage(payload),
      });
      actions.push({
        node: 'desk.compose',
        name: 'close-compose',
        does: 'Close the compose window without sending',
        binding: { kind: 'element', locator: { role: 'button', name: 'Close' }, actuation: 'click' },
        writes: ['composeOpen'],
        handler: () => commands.closeCompose(),
      });
    }

    // Gated on the CONTROL, never on `state.tab`: which tab is up is a
    // visibility fact, and the app reports it with show() (wiring.ts). A panel
    // that stays mounted behind a hidden tab still publishes its actions — and
    // the session still refuses to serve them, because the visibility signal
    // says the tab is not up. Two independent truths, neither guessing.
    if (mounted.has('inbox-list')) {
      actions.push({
        node: 'desk.inbox',
        name: 'list-tickets',
        does: 'List the open tickets — who each one is from and what it is about, optionally narrowed to a sender',
        // The input contract travels WITH the action, so a caller learns the
        // shape before firing rather than by getting it wrong once.
        input: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Narrow to tickets whose sender this text names.' },
          },
          additionalProperties: false,
        },
        handler: (payload?: unknown) => commands.listTickets(payload),
      });
      // One action PER OPEN TICKET, not per rendered row: the list virtualizes,
      // the desk does not. That gap is the point — available() caps the
      // instance list it renders at 50 while every one of them stays fireable.
      for (const ticket of openTickets(state)) {
        actions.push({
          node: 'desk.inbox.tickets',
          name: 'reply-to-ticket',
          instance: ticket.id,
          does: 'Send a reply to one open ticket',
          binding: { kind: 'element', locator: { role: 'button', name: 'Reply' }, actuation: 'click' },
          writes: ['repliedCount', 'lastRepliedTo'],
          handler: (payload?: unknown) => commands.reply(ticket.id, payload),
        });
        actions.push({
          node: 'desk.inbox.tickets',
          name: 'archive-ticket',
          instance: ticket.id,
          does: 'Archive one open ticket',
          binding: { kind: 'element', locator: { role: 'button', name: 'Archive' }, actuation: 'click' },
          writes: ['archivedCount', 'inboxTicketIds'],
          // The desk's rule, per ROW: you may only archive a ticket you have
          // answered. Per-row truth has no home in projected state, so it rides
          // the channel built for it — `enabled`, which serves the button
          // greyed-out-but-visible and refuses a fire as TOOL_DISABLED.
          enabled: ticket.replied,
          handler: () => commands.archive(ticket.id),
        });
      }
    }

    if (mounted.has('archive-panel')) {
      actions.push({
        node: 'desk.archive',
        name: 'clear-archive',
        does: 'Permanently delete every archived ticket',
        binding: { kind: 'element', locator: { role: 'button', name: 'Clear archive' }, actuation: 'click' },
        confirm: true,
        writes: ['archivedCount'],
        handler: () => commands.clearArchive(),
      });
    }
  }

  if (state.page === 'settings' && mounted.has('settings-panel')) {
    actions.push({
      node: 'settings',
      name: 'wire-tab-switch',
      does: 'Wire the desk’s tab switch to a real handler',
      binding: { kind: 'element', locator: { role: 'switch', name: 'Tab switch wired' }, actuation: 'click' },
      writes: ['tabSwitcherWired'],
      handler: () => commands.setTabSwitcherWired(true),
    });
    actions.push({
      node: 'settings',
      name: 'toggle-compose-button',
      does: 'Show or hide the desk’s Compose button',
      binding: { kind: 'element', locator: { role: 'switch', name: 'Compose button' }, actuation: 'click' },
      writes: ['composeButtonShown'],
      handler: () => commands.toggleComposeButton(),
    });
  }

  return actions;
}
