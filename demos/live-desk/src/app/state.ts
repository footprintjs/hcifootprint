/**
 * The app's own state and command vocabulary — plain TypeScript, zero
 * hcifootprint imports. This file is the "app that already exists" half of the
 * demo: a support desk that knows its pages, its tabs, its tickets and what its
 * buttons do, and has never heard of a navigation graph.
 */
import { seedTickets, type Ticket } from './tickets.js';

export type PageId = 'desk' | 'settings';
export type TabId = 'inbox' | 'archive';

/**
 * A control the app actually RENDERS. Components report their own mount/unmount
 * (see ui/hooks.ts `useRenderedControl`), and the action store publishes an
 * action only while the control that performs it is on screen — which is what
 * makes a gesture's materialisation follow the real UI instead of a
 * hand-maintained list.
 */
export type ControlId = 'compose-button' | 'compose-modal' | 'inbox-list' | 'archive-panel' | 'settings-panel';

export interface DeskState {
  readonly page: PageId;
  readonly tab: TabId;
  readonly composeOpen: boolean;
  readonly composeDraft: string;
  readonly tickets: readonly Ticket[];
  readonly sentCount: number;
  /** Who the last reply went to — a declared write, so settlement can verify it. */
  readonly lastRepliedTo: string | null;
  /** Settings preference: whether the desk renders its Compose button at all. */
  readonly showComposeButton: boolean;
  /**
   * Whether the app has wired a real handler behind the tab-switch gesture.
   * Off at first run on purpose: the tab switch is DECLARED (the desk has tabs)
   * long before anybody wires the function that flips them — which is the exact
   * shape of a missing binding this demo is about.
   */
  readonly tabSwitcherWired: boolean;
}

export function initialState(): DeskState {
  return {
    page: 'desk',
    tab: 'inbox',
    composeOpen: false,
    composeDraft: '',
    tickets: seedTickets(),
    sentCount: 0,
    lastRepliedTo: null,
    showComposeButton: true,
    tabSwitcherWired: false,
  };
}

export function openTickets(state: DeskState): readonly Ticket[] {
  return state.tickets.filter((ticket) => ticket.status === 'open');
}

export function archivedTickets(state: DeskState): readonly Ticket[] {
  return state.tickets.filter((ticket) => ticket.status === 'archived');
}

export function ticketById(state: DeskState, id: string): Ticket | undefined {
  return state.tickets.find((ticket) => ticket.id === id);
}

/** What `list-tickets` hands back — the "act, and get data back" channel. */
export interface TicketSummary {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly replied: boolean;
}

/**
 * A listing says how many matched and how many it is showing, because the desk
 * caps its own answer. Being told "20 of 60" is a fact; being handed 20 and
 * left to assume that is all of them is not. (The library caps a produced value
 * at 30 array items too — a desk that never approaches the cap never has to
 * wonder which cap it hit.)
 */
export interface TicketListing {
  readonly matched: number;
  readonly showing: number;
  readonly tickets: TicketSummary[];
}

/**
 * Everything the desk can DO. The store owns one stable instance of this and
 * every published handler closes over IT, never over a state snapshot — see the
 * WHY note on `buildActions`.
 */
export interface DeskCommands {
  /** Open tickets, optionally narrowed to a sender the caller names. */
  listTickets(payload?: unknown): TicketListing;
  reply(ticketId: string, payload?: unknown): { ticketId: string; to: string; subject: string; message: string };
  archive(ticketId: string): { ticketId: string; archived: number };
  clearArchive(): { cleared: number };
  openCompose(): void;
  closeCompose(): void;
  setDraft(text: string): void;
  sendMessage(payload?: unknown): { sent: number; text: string };
  switchTab(tab: TabId): void;
  goToPage(page: PageId): void;
  toggleComposeButton(): { showComposeButton: boolean };
  setTabSwitcherWired(wired: boolean): { tabSwitcherWired: boolean };
}
