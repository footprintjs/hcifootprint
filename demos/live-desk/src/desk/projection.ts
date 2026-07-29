/**
 * The PROJECTION — the lean snapshot of app state the session reads.
 *
 * Two readers, both inside hcifootprint: guards (`when`) evaluate against it,
 * and the repeats container's `instances` selector enumerates from it. It is
 * deliberately NOT the whole desk: no ticket bodies, no draft text, nothing a
 * planner has no business reading. Every key here is either a guard key, an
 * instance source, or a key some published action DECLARES it writes — that
 * last set is what lets settlement check the claim instead of taking it
 * (projection.test.ts pins the coverage by walking the real action catalogue,
 * so adding an action with an unprojected write fails the suite).
 */
import { archivedTickets, openTickets, type DeskState } from '../app/state.js';

export function projectionOf(state: DeskState): Record<string, unknown> {
  const open = openTickets(state);
  return {
    // the repeats container's existence source — the COMPLETE set, not the
    // window the list happens to render
    inboxTicketIds: open.map((ticket) => ticket.id),
    openCount: open.length,
    archivedCount: archivedTickets(state).length,
    repliedCount: state.tickets.filter((ticket) => ticket.replied).length,
    lastRepliedTo: state.lastRepliedTo,
    composeOpen: state.composeOpen,
    // the send-message guard reads the LENGTH, never the draft: an empty draft
    // is a fact about the desk; its text is the user's.
    composeDraftLength: state.composeDraft.length,
    sentCount: state.sentCount,
    composeButtonShown: state.showComposeButton,
    tabSwitcherWired: state.tabSwitcherWired,
    tab: state.tab,
    page: state.page,
  };
}

/** The keys that changed between two projections (the store tap's delta). */
export function projectionDelta(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    // JSON compare: every projected value is a primitive or an array of them,
    // and a fresh array of the same ids must not read as a change (it would
    // settle a pending transition that nothing actually moved).
    if (JSON.stringify(previous[key]) !== JSON.stringify(value)) delta[key] = value;
  }
  return delta;
}
