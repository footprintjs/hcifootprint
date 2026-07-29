/**
 * The navigation graph — PLACES only.
 *
 * There is not one `tools:` key in this file. The desk's pages, its two tabs,
 * its blocking compose modal and its repeating ticket row are authored here
 * because they are the app's SHAPE, and shape is stable. Every ACTION arrives
 * at runtime from the app's own store through `fromLiveStore` — last in the
 * documented merge order, bind-only, so it can add bindings but can never
 * reshape or remove any of this.
 *
 * The one runtime hook the shape carries is the repeats container's `instances`
 * selector: it reads the COMPLETE set of open ticket ids out of projected state,
 * which is why a served instance list is stamped `enumeration: 'selector'`
 * (complete) rather than 'mounted-window' (only what is rendered).
 */
import { buildNavigationGraph, fromLiveStore } from 'hcifootprint';
import type { LiveActionStore } from 'hcifootprint';

export function createDeskGraph(store: LiveActionStore) {
  return buildNavigationGraph('desk', {
    does: 'A support desk: open tickets in the inbox, an archive, and a compose window.',
    pages: {
      desk: {
        does: 'The support desk',
        route: '/desk',
        tabs: {
          inbox: {
            does: 'Open tickets waiting for a reply',
            areas: {
              tickets: {
                does: 'One ticket row',
                repeats: true,
                instances: (state: Record<string, unknown>): string[] => {
                  const ids = state['inboxTicketIds'];
                  return Array.isArray(ids) ? ids.map(String) : [];
                },
              },
            },
          },
          archive: { does: 'Tickets already dealt with' },
        },
        modals: {
          // blocks defaults to true: while the compose window is open it masks
          // the desk behind it, and firing a masked tool is refused
          // BLOCKED_BY_OVERLAY rather than silently doing nothing.
          compose: { does: 'Write a new message' },
        },
      },
      settings: { does: 'Desk settings', route: '/settings' },
    },
    sources: [fromLiveStore(store)],
  });
}

export type DeskGraph = ReturnType<typeof createDeskGraph>;
