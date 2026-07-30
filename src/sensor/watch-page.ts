/**
 * watchPage() — the assembly. Read it as the sentence it is: watch the page, and
 * every human action the graph already declares lands on the ledger by itself.
 *
 * WHY CAPTURE PHASE. Every listener is registered with `capture: true`, and that
 * is a correctness requirement rather than a preference. Capture runs BEFORE the
 * app's own handlers, so recognition and fire()'s truth gates evaluate against
 * the cursor as it was WHEN THE HUMAN ACTED. Let the app's onClick navigate
 * first and the same click would be judged against the page it landed on —
 * inventing STALE_CURSOR and NOT_ON_NODE refusals for actions that were
 * perfectly legal when they happened. It is the same refuse-before-perform
 * ordering live-desk's hand-written shim already relies on
 * (demos/live-desk/src/ui/act.ts:1-12).
 *
 * WHY invoke:false, AND WHY THE TYPE MAKES IT THE ONLY OPTION. The browser has
 * already run the app's own handler; this fire's job is to RECORD, not to
 * perform (atom/types.ts:604-609, session.ts:1074-1075). A fire that also
 * invoked would run one human click twice. The port types that shut
 * ({@link RecordOnlyFire}), so it is not a habit anyone can forget. Every truth
 * gate still runs, and the arms that only make sense for an executing caller —
 * TOOL_DISABLED (session.ts:896-903) and NOT_MATERIALIZED (atom/types.ts:722-724)
 * — are skipped by the session's own design, because a greyed button a human
 * really clicked is still something that really happened.
 *
 * WHAT THIS MODULE DOES NOT DO:
 * - It does not debounce. Two clicks are two ledger rows. Smoothing repeated
 *   motion is interpretation, and interpretation is the caller's business — the
 *   ledger's business is what happened.
 * - It does not read values. Only edges that take no input are watched at all
 *   (payload.ts), so there is never a payload here to get wrong.
 * - It does not listen to `input`. The cadence decision lives in
 *   binding-index.ts:eventTypeFor and it is `change` — one act, one row, never
 *   one row per keystroke.
 */
import type { Actuation } from '../atom/types.js';
import type { SensorElement, SensorEvent, SensorListener, SensorListenerOptions } from './dom-port.js';
import type { BindingIndex, SensorEventType } from './binding-index.js';
import type { PageWatcher, SensorCoverage, SensorReport, SensorSession, WatchOptions } from './types.js';
import { documentOf, viewOf } from './dom-port.js';
import { buildBindingIndex } from './binding-index.js';
import { matchElement } from './match.js';
import { watchLocation } from './watch-location.js';

/**
 * One shared options object for add AND remove: removeEventListener only cancels
 * a registration whose capture flag matches, so these two must be the same
 * reading — a mismatched literal is the classic listener leak.
 */
const CAPTURE: SensorListenerOptions = Object.freeze({ capture: true });

/** The keys that stand in for a click. Enter and Space, and nothing else. */
function isPressKey(key: string | undefined): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

/**
 * Only a real user gesture sets `isTrusted`, and an absent flag is not a human
 * either.
 *
 * THIS IS THE MIS-ATTRIBUTION GUARD. An agent driving the page through
 * `element.click()` produces an event that is identical to a person's in every
 * way except this bit — and a production integration shipped without checking it
 * and recorded the agent's own synthetic clicks as human acts. `source: 'user'`
 * on machine motion is a lie in the one field the whole provenance model rests
 * on. It is workaround-grade and named as such: a single invocation door, where
 * the caller states who it is, makes the entire class unreachable rather than
 * merely detectable. Until then, this is the line.
 */
function defaultTrust(event: SensorEvent): boolean {
  return event.isTrusted === true;
}

/**
 * The gesture an off-graph report names. Two actuations share the `change`
 * event, and the element itself settles which: a `<select>` is selected from,
 * anything else is typed into. That is DOM truth, not a preference.
 */
function actuationOf(eventType: SensorEventType, element: SensorElement | null): Actuation {
  if (eventType === 'click') return 'click';
  if (eventType === 'keydown') return 'press';
  return element !== null && element.tagName.toLowerCase() === 'select' ? 'select' : 'type';
}

const EMPTY_TALLY = (): Record<SensorReport['kind'], number> => ({
  reported: 0,
  'off-graph': 0,
  ambiguous: 0,
  'synthetic-event': 0,
  'payload-opaque': 0,
  unwatched: 0,
  'sensor-error': 0,
});

/**
 * Attach the sensor to a page. The session is the single source of truth for
 * what to watch; `options.root` is the only thing about the environment the
 * library is told.
 */
export function watchPage(session: SensorSession, options: WatchOptions): PageWatcher {
  const root = options.root;
  const ownerDocument = documentOf(root);
  const now = options.now ?? Date.now;
  const trust = options.trust ?? defaultTrust;
  const since = now();

  // Read ONCE, at attach, into a set: a stand-down list that changed under a
  // live watcher would silently re-open edges the app is still reporting for
  // itself, which is the double-row bug this option exists to prevent.
  const standsDownFor = new Set(options.reportedElsewhere ?? []);
  const standsDown = (edgeId: string): boolean => standsDownFor.has(edgeId);

  let stopped = false;
  let index: BindingIndex = buildBindingIndex([], standsDown);
  const tally = EMPTY_TALLY();
  /** Edges already announced as unwatched — advisory, so said once, not per rebuild. */
  const announced = new Set<string>();
  const attached = new Map<SensorEventType, SensorListener>();
  const unsubscribes: Array<() => void> = [];
  /** A broken onReport is warned about ONCE: an every-click console flood is its own bug. */
  let reportSinkWarned = false;

  function report(entry: SensorReport): void {
    tally[entry.kind] += 1;
    const sink = options.onReport;
    if (sink === undefined) return;
    try {
      sink(entry);
    } catch (error) {
      // The observer rule, both ways: the app's callback must never break the
      // app's own event dispatch (session.ts:359-364 takes the same stance for
      // session listeners).
      if (!reportSinkWarned) {
        reportSinkWarned = true;
        console.warn(
          `hcifootprint: a watchPage onReport listener threw: ${String(error)} — reports keep flowing, ` +
            `further failures from this watcher are silent.`,
        );
      }
    }
  }

  /**
   * Say once, per edge, what is declared here that the sensor is not watching.
   *
   * ONCE, not per rebuild: this is an advisory about a static property of the
   * edge, and repeating it on every mount would drown the reports that describe
   * something that actually just happened. coverage() always carries the full
   * live list, so nothing is lost by saying it once.
   *
   * An edge blocked by its VALUE contract gets the more precise arm. "I do not
   * watch this gesture" and "I watch this gesture but will not invent its value"
   * are different problems with different fixes, and a consumer should not have
   * to read the sentence to tell them apart.
   */
  function announceUnwatched(): void {
    for (const row of index.coverage) {
      if (row.status !== 'unwatched' || announced.has(row.edge)) continue;
      announced.add(row.edge);
      const reason = row.reason ?? '';
      report(
        row.blocked === 'payload'
          ? { kind: 'payload-opaque', edge: row.edge, reason }
          : { kind: 'unwatched', edge: row.edge, reason },
      );
    }
  }

  /**
   * Listen for exactly the event classes the live watch-list needs — no more
   * listeners than there are gestures. Adding and removing during a dispatch is
   * safe by the DOM's own rule: a listener added while an event is being
   * dispatched is not invoked for that event, and a removed one is not called
   * again.
   */
  function syncListeners(): void {
    const needed = new Set(index.eventTypes);
    for (const [type, listener] of [...attached]) {
      if (needed.has(type)) continue;
      root.removeEventListener(type, listener, CAPTURE);
      attached.delete(type);
    }
    for (const type of needed) {
      if (attached.has(type)) continue;
      const listener: SensorListener = (event) => handle(type, event);
      root.addEventListener(type, listener, CAPTURE);
      attached.set(type, listener);
    }
  }

  /**
   * Re-derive the watch-list from the session. Deliberately total: a mount, an
   * unmount, an enable flip, a cursor hop or a state delta can each change which
   * edges are live, and an index that survived any of them would be stale exactly
   * where staleness attributes a click to a control that is no longer there.
   */
  function refreshIndex(): void {
    index = buildBindingIndex(session.available().edges, standsDown);
  }

  /** The full refresh the session's own events trigger: index, advisories, listeners. */
  function refresh(): void {
    if (stopped) return;
    refreshIndex();
    announceUnwatched();
    syncListeners();
  }

  function handle(eventType: SensorEventType, event: SensorEvent): void {
    if (stopped) return;
    try {
      // A keydown that is not Enter or Space is not a press gesture at all —
      // there is nothing here to trust or to refuse, so it is not a report.
      if (eventType === 'keydown' && !isPressKey(event.key)) return;

      if (!trust(event)) {
        report({ kind: 'synthetic-event' });
        return;
      }

      // THE WATCH-LIST IS RE-DERIVED HERE, not merely inherited from the last
      // event the session announced — and that is a correctness fix, not a
      // belt-and-braces refresh. Structure events are COALESCED to a microtask
      // (session.ts:2408-2412), deliberately, so that a StrictMode double-mount
      // cannot pollute the trace. The consequence for a listener is that a tool
      // group registered a moment ago is real in available() but has not been
      // ANNOUNCED yet — and a sensor recognizing against the announcement would
      // attribute this very click to the surface as it was one tick ago. Asking
      // available() is what the library itself does on every refused fire
      // (expects.ts:24-27 calls that path hot and pays it), and it is the only
      // source that is never behind.
      //
      // The subscriptions still matter: they keep the LISTENER SET current, and
      // an event class nobody is listening for never reaches this function to
      // refresh anything.
      refreshIndex();

      const outcome = matchElement(index, eventType, event.target, root, ownerDocument);

      if (outcome.kind === 'none') {
        // Nothing in the chain even presented as a control. Clicking a paragraph
        // is not an interaction the graph failed to declare, and reporting it
        // would bury the ones that matter.
        if (outcome.role === '') return;
        report({
          kind: 'off-graph',
          role: outcome.role,
          name: outcome.name,
          actuation: actuationOf(eventType, event.target),
        });
        return;
      }

      if (outcome.kind === 'many') {
        report({ kind: 'ambiguous', candidates: outcome.candidates });
        return;
      }

      const { binding, instance } = outcome.candidate;
      const result = session.fire(binding.edge, {
        source: 'user',
        // Record-only: the browser already ran the app's handler.
        invoke: false,
        // NO PAYLOAD, ever. Only edges that take no input are watched at all
        // (payload.ts, asked once at index-build time), so there is nothing here
        // to send and nothing to guess.
        ...(instance !== undefined ? { instance } : {}),
      });
      report({ kind: 'reported', edge: binding.edge, result });
    } catch (error) {
      // Sensor exceptions are isolated exactly like session listeners: they
      // never propagate into the app's event dispatch.
      report({ kind: 'sensor-error', error });
    }
  }

  function subscribe(event: 'structure' | 'transition' | 'state'): void {
    unsubscribes.push(session.on(event, () => refresh()));
  }

  // First build, then the subscriptions that keep the listener set true.
  refresh();
  // 'structure' is mount/enable motion; 'transition' moves the cursor; 'state'
  // opens and closes guards. All three change which edges are live.
  subscribe('structure');
  subscribe('transition');
  subscribe('state');

  // OPT-IN, not opt-out: see WatchOptions.watchLocation for why a default-on
  // location watcher would silently strand the cursor off-graph.
  if (options.watchLocation === true) {
    unsubscribes.push(
      watchLocation(session, viewOf(ownerDocument), (error) => report({ kind: 'sensor-error', error })),
    );
  }

  return {
    stop(): void {
      // Idempotent: a stopped watcher is inert, and a second stop finds nothing
      // to release (the presence-handle contract, presence.ts:10-13).
      if (stopped) return;
      stopped = true;
      for (const [type, listener] of attached) root.removeEventListener(type, listener, CAPTURE);
      attached.clear();
      // Every release is attempted even if one throws: a teardown that gives up
      // half way leaves a live listener behind, which is the leak stop() exists
      // to prevent.
      for (const off of unsubscribes) {
        try {
          off();
        } catch (error) {
          report({ kind: 'sensor-error', error });
        }
      }
      unsubscribes.length = 0;
    },
    coverage(): SensorCoverage {
      return {
        bindings: index.coverage,
        reports: { ...tally },
        since,
        at: now(),
      };
    },
  };
}
