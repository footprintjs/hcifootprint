/**
 * DeskStore — the app's own live action store, and the app's own state.
 *
 * It satisfies `LiveActionStore` (hcifootprint src/graph/sources/types.ts:88)
 * with nothing added for the library's benefit: subscribe + read-current, the
 * shape React itself blesses. The same store drives the UI through
 * `useSyncExternalStore`, so there is exactly ONE truth about what the desk can
 * do right now and both the screen and the graph read it.
 *
 * Deliberately CHATTY: `actions()` builds a fresh array of fresh objects on
 * every read, because that is what a real store does and object identity there
 * carries no information. fromLiveStore reconciles by identity key, so a chatty
 * store must produce zero re-registrations, zero last-wins warnings and zero
 * phantom structure bumps — which is exactly what store.test.ts pins.
 */
import type { LiveAction } from 'hcifootprint';
import { buildActions, identityOf } from './actions.js';
import {
  archivedTickets,
  initialState,
  openTickets,
  ticketById,
  type ControlId,
  type DeskCommands,
  type DeskState,
  type PageId,
  type TabId,
  type TicketListing,
} from './state.js';
import type { Ticket } from './tickets.js';

export interface DeskSnapshot {
  readonly state: DeskState;
  readonly mounted: ReadonlySet<ControlId>;
  /** Bumped on every mutation — the identity React's useSyncExternalStore compares. */
  readonly version: number;
}

export class DeskStore {
  #state: DeskState = initialState();
  #mounted = new Set<ControlId>();
  #version = 0;
  #snapshot: DeskSnapshot = { state: this.#state, mounted: new Set(), version: 0 };
  readonly #listeners = new Set<() => void>();
  /** Identities withheld for exactly one emission — see `#rebind`. */
  #withheld: ReadonlySet<string> = new Set();

  // -- the LiveActionStore contract -----------------------------------------

  subscribe = (onChange: () => void): (() => void) => {
    this.#listeners.add(onChange);
    return () => {
      this.#listeners.delete(onChange);
    };
  };

  actions = (): LiveAction[] => {
    const all = buildActions(this.#state, this.#mounted, this.commands);
    return this.#withheld.size === 0 ? all : all.filter((action) => !this.#withheld.has(identityOf(action)));
  };

  // -- the UI's view ---------------------------------------------------------

  /** Stable per mutation: safe as a useSyncExternalStore snapshot. */
  getSnapshot = (): DeskSnapshot => this.#snapshot;

  get state(): DeskState {
    return this.#state;
  }

  /** A component reporting that its control is on screen. Idempotent. */
  mountControl(control: ControlId): void {
    if (this.#mounted.has(control)) return;
    this.#mounted = new Set(this.#mounted).add(control);
    this.#commit(this.#state);
  }

  unmountControl(control: ControlId): void {
    if (!this.#mounted.has(control)) return;
    const next = new Set(this.#mounted);
    next.delete(control);
    this.#mounted = next;
    this.#commit(this.#state);
  }

  // -- the desk's behaviour (the stable object every handler closes over) ----

  readonly commands: DeskCommands = {
    listTickets: (payload?: unknown): TicketListing => {
      // The desk does its own matching, because the desk is what knows its
      // senders. The caller may pass a whole sentence: any word of three
      // letters or more that appears in a sender's name narrows the list.
      const words = searchWordsOf(payload);
      const open = openTickets(this.#state);
      const matched =
        words.length === 0
          ? open
          : open.filter((ticket) => words.some((word) => ticket.from.toLowerCase().includes(word)));
      const tickets = matched.slice(0, 20).map((ticket) => ({
        id: ticket.id,
        from: ticket.from,
        subject: ticket.subject,
        replied: ticket.replied,
      }));
      return { matched: matched.length, showing: tickets.length, tickets };
    },

    reply: (ticketId, payload) => {
      const ticket = ticketById(this.#state, ticketId);
      if (!ticket) throw new Error(`live-desk: no ticket '${ticketId}'`);
      const message = messageOf(payload);
      this.#commit({
        ...this.#state,
        lastRepliedTo: ticketId,
        tickets: this.#state.tickets.map((row) => (row.id === ticketId ? { ...row, replied: true } : row)),
      });
      return { ticketId, to: ticket.from, subject: ticket.subject, message };
    },

    archive: (ticketId) => {
      const ticket = ticketById(this.#state, ticketId);
      if (!ticket) throw new Error(`live-desk: no ticket '${ticketId}'`);
      const tickets: Ticket[] = this.#state.tickets.map((row) =>
        row.id === ticketId ? { ...row, status: 'archived' as const } : row,
      );
      this.#commit({ ...this.#state, tickets });
      return { ticketId, archived: tickets.filter((row) => row.status === 'archived').length };
    },

    clearArchive: () => {
      const cleared = archivedTickets(this.#state).length;
      this.#commit({ ...this.#state, tickets: this.#state.tickets.filter((row) => row.status !== 'archived') });
      return { cleared };
    },

    openCompose: () => this.#commit({ ...this.#state, composeOpen: true }),
    closeCompose: () => this.#commit({ ...this.#state, composeOpen: false, composeDraft: '' }),
    setDraft: (text) => this.#commit({ ...this.#state, composeDraft: text }),

    sendMessage: (payload) => {
      const text = messageOf(payload) || this.#state.composeDraft;
      const sent = this.#state.sentCount + 1;
      this.#commit({ ...this.#state, sentCount: sent, composeOpen: false, composeDraft: '' });
      return { sent, text };
    },

    switchTab: (tab: TabId) => this.#commit({ ...this.#state, tab }),
    goToPage: (page: PageId) => this.#commit({ ...this.#state, page, composeOpen: false }),

    toggleComposeButton: () => {
      const showComposeButton = !this.#state.showComposeButton;
      this.#commit({ ...this.#state, showComposeButton });
      return { showComposeButton };
    },

    /**
     * Wiring (or unwiring) the tab switch changes an action's HANDLER while its
     * identity stays the same — and fromLiveStore never re-registers an
     * unchanged identity ("to replace an action's behaviour, remove it and add
     * it back" — from-live-store.ts:16). So the store publishes the removal and
     * the re-add as TWO snapshots. Emit once instead and the library keeps
     * serving the old binding: the panel would print a wiring that is not
     * there, which is the one thing this demo may not do.
     */
    setTabSwitcherWired: (wired: boolean) => {
      this.#rebind(['desk.switch-to-archive', 'desk.switch-to-inbox'], () =>
        this.#commit({ ...this.#state, tabSwitcherWired: wired }),
      );
      return { tabSwitcherWired: wired };
    },
  };

  // -- internals -------------------------------------------------------------

  #rebind(identities: string[], mutate: () => void): void {
    this.#withheld = new Set(identities);
    this.#emit(); // snapshot 1: the action is GONE — the library releases its handle
    this.#withheld = new Set();
    mutate(); // snapshot 2 (via #commit): it is back, with its new handler
  }

  #commit(next: DeskState): void {
    this.#state = next;
    this.#version += 1;
    this.#snapshot = { state: next, mounted: this.#mounted, version: this.#version };
    this.#emit();
  }

  #emit(): void {
    // A copy: a listener that unsubscribes during notification (React does)
    // must not make us skip the next one.
    for (const listener of [...this.#listeners]) listener();
  }
}

/** The words a `list-tickets` caller offered to narrow by. */
function searchWordsOf(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null || !('search' in payload)) return [];
  const search = (payload as { search: unknown }).search;
  if (typeof search !== 'string') return [];
  return search
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

/** The reply/send payload an agent supplies. Anything else is an empty message. */
function messageOf(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}
