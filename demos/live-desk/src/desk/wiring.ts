/**
 * The wiring — the whole seam between the desk and hcifootprint, in one file.
 *
 * It is four subscriptions' worth of "the app reports what actually happened",
 * in the order the library's own layering wants them:
 *
 *   router  → session.sync(page)                 the page cursor, always first
 *   tabs    → session.show('desk.<tab>')         at most one tab is shown
 *   modal   → session.setVisible('desk.compose') mounts cannot see CSS
 *   state   → session.updateState(delta)         the tap that settles a fire
 *
 * Note what is NOT here: nothing calls `registerActions`. Every binding
 * arrives through `fromLiveStore(store)` declared in the graph's `sources`, so
 * `createSession()` attaches the store and `detachSources()` releases it.
 *
 * Note also what fire() does NOT do: a tab-switch fire runs the app's handler,
 * the handler flips the app's tab, and THIS wiring reports the result with
 * show(). The library never writes presence on the strength of a fire — which
 * is why switching tabs leaves the page cursor exactly where it was.
 */
import { fromLiveStore } from 'hcifootprint';
import { DeskStore } from '../app/store.js';
import { createDeskGraph, type DeskGraph } from './graph.js';
import { projectionDelta, projectionOf } from './projection.js';

export type DeskSession = ReturnType<DeskGraph['createSession']>;

/** One `structure` event, as the session reported it. */
export interface StructureBeat {
  readonly at: number;
  readonly version: number;
  readonly structureVersion: number;
}

export interface Desk {
  readonly store: DeskStore;
  readonly graph: DeskGraph;
  readonly session: DeskSession;
  /** Dev warnings the session raised (drift, double registration, handler failure). */
  readonly warnings: readonly string[];
  /** Every `structure` event, verbatim — the served surface moved this many times. */
  readonly structureBeats: readonly StructureBeat[];
  sourcesAttached(): boolean;
  detachSources(): void;
  reattachSources(): void;
  /** Stop the app-side wiring (the session and its sources are untouched). */
  stop(): void;
}

export function createDesk(): Desk {
  const store = new DeskStore();
  const graph = createDeskGraph(store);
  const warnings: string[] = [];
  const structureBeats: StructureBeat[] = [];

  const session = graph.createSession({
    node: 'desk',
    state: projectionOf(store.state),
    onWarn: (message) => warnings.push(message),
  });

  session.on('structure', (payload) => {
    structureBeats.push({ at: Date.now(), version: payload.version, structureVersion: payload.structureVersion });
  });

  // Seed the two signals no mount can infer: which tab is up, and that the
  // compose window is closed. Without them the tab layer would serve the union
  // of both tabs flagged presence:'unknown' — honest, but the app knows better.
  session.show('desk.inbox');
  session.setVisible('desk.compose', false);

  let lastPage = store.state.page;
  let lastTab = store.state.tab;
  let lastComposeOpen = store.state.composeOpen;
  let lastProjection = projectionOf(store.state);

  const report = (): void => {
    const state = store.state;
    if (state.page !== lastPage) {
      lastPage = state.page;
      session.sync(state.page);
    }
    if (state.tab !== lastTab) {
      lastTab = state.tab;
      session.show(`desk.${state.tab}`);
    }
    if (state.composeOpen !== lastComposeOpen) {
      lastComposeOpen = state.composeOpen;
      session.setVisible('desk.compose', state.composeOpen);
    }
    const next = projectionOf(state);
    const delta = projectionDelta(lastProjection, next);
    lastProjection = next;
    // Only real changes are reported. A no-op report would settle whatever fire
    // is pending with a delta that moved nothing — a verified effect that never
    // happened.
    if (Object.keys(delta).length > 0) session.updateState(delta);
  };

  // The library's own reconcile subscribed first (createSession attached the
  // source above), so on every store change the bindings land BEFORE this
  // reports position and state — registrations, then reality.
  const unsubscribe = store.subscribe(report);

  let attached = true;
  let detachDirect: (() => void) | null = null;

  return {
    store,
    graph,
    session,
    warnings,
    structureBeats,
    sourcesAttached: () => attached,
    detachSources: () => {
      if (detachDirect) {
        detachDirect();
        detachDirect = null;
      }
      session.detachSources(); // idempotent — drains the ledger createSession filled
      attached = false;
    },
    reattachSources: () => {
      if (attached) return;
      // The direct door: the same source, attached by hand. detachSources()
      // drained the graph's ledger, so this is the documented way back.
      detachDirect = fromLiveStore(store).attach(session);
      attached = true;
    },
    stop: () => unsubscribe(),
  };
}
