/**
 * watchPage() — the assembly. Read it as the sentence it is: watch the page, and
 * every human action the graph already declares lands on the ledger by itself.
 *
 * WHY CAPTURE PHASE. Every listener is registered with `capture: true`, and that
 * is a correctness requirement rather than a preference. Capture runs BEFORE the
 * app's own handlers, so recognition and fire()'s truth gates evaluate against the
 * cursor as it was WHEN THE HUMAN ACTED. Let the app's onClick navigate first and
 * the same click would be judged against the page it LANDED on — inventing
 * STALE_CURSOR and NOT_ON_NODE refusals for actions that were perfectly legal
 * when they happened. It is the same refuse-before-perform ordering live-desk's
 * hand-written shim already relies on (demos/live-desk/src/ui/act.ts:1-12).
 *
 * WHY invoke:false, AND WHY THE TYPE MAKES IT THE ONLY OPTION. The browser has
 * already run the app's own handler; this fire's job is to RECORD, not to perform
 * (atom/types.ts:717-722). A fire that also invoked would run one human click
 * twice. The port types that shut ({@link RecordOnlyFire}), so it is not a habit
 * anyone can forget. Every truth gate still runs, and the arms that only make
 * sense for an executing caller — TOOL_DISABLED (session.ts:1048) and
 * NOT_MATERIALIZED (session.ts:1062) — are skipped by the session's own design,
 * because a greyed button a human really clicked is still something that really
 * happened.
 *
 * WHAT THIS MODULE DOES NOT DO:
 * - It does not read values. A payload comes from `ControlDeclaration.value()` or
 *   not at all (payload.ts), and the port has no member a scraper could use
 *   (dom-port.ts).
 * - It does not decide cadence. That is cadence.ts, one policy, three named
 *   settings, chosen per control.
 * - It does not smooth repeated motion. Two clicks are two ledger rows; the turn
 *   window (dedupe.ts) removes DUPLICATE DELIVERIES of one act, never a second
 *   act, and no cadence setting can reach a click — a window belongs to the value
 *   stream and to nothing else (cadence.ts `coalesceWindow`).
 */
import type { Actuation } from '../atom/types.js';
import type { SensorElement, SensorEvent, SensorListener, SensorListenerOptions } from './dom-port.js';
import type { BindingIndex } from './binding-index.js';
import type { Cadence, SensorEventType } from './cadence.js';
import type { ControlDeclaration } from './control-index.js';
import type { MatchCandidate } from './match.js';
import type { Coverage, ControlAttachment, PageWatch, SensorReport, SensorSession, WatchOptions } from './types.js';
import { documentOf, timersOf, viewOf } from './dom-port.js';
import { CADENCE_NEEDS_A_CLOCK, buildBindingIndex } from './binding-index.js';
import { coalesceWindow, commitsOnControl, createDebouncer, needsTimer } from './cadence.js';
import { createControlIndex } from './control-index.js';
import { createTurnWindow } from './dedupe.js';
import { candidateLabel, matchElement } from './match.js';
import { computeRole } from './role.js';
import { declaredPayload } from './payload.js';
import { watchLocation } from './watch-location.js';

/**
 * One shared options object for add AND remove: removeEventListener only cancels
 * a registration whose capture flag matches, so these two must be the same
 * reading — a mismatched literal is the classic listener leak.
 */
const CAPTURE: SensorListenerOptions = Object.freeze({ capture: true });

/** What `attach()` hands back when there is nothing to release. */
const NOTHING_ATTACHED: ControlAttachment = Object.freeze({ detach(): void {} });

/** The keys that stand in for a click. Enter and Space, and nothing else. */
function isPressKey(key: string | undefined): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

/**
 * Only a real user gesture sets `isTrusted`, and an absent flag is not a human
 * either.
 *
 * THIS IS THE MIS-ATTRIBUTION GUARD. An agent driving the page through
 * `element.click()` produces an event identical to a person's in every way except
 * this bit — and a production integration shipped without checking it and
 * recorded the agent's own synthetic clicks as human acts. `source: 'user'` on
 * machine motion is a lie in the one field the whole provenance model rests on.
 *
 * IT IS WORKAROUND-GRADE AND NAMED AS SUCH, AND THIS IS THE SEAM. `fire()` is
 * already the ONE invocation chokepoint (session.ts:1054-1060), with all four
 * handler call sites below the gates and `handlerFor`/`couldMaterialise`
 * protected. A one-door `perform()` over that same chokepoint — one invocation
 * function on a live action, used by app and agent alike, where the CALLER states
 * who it is — makes this entire class UNREACHABLE rather than merely detectable,
 * because attribution becomes structural instead of isTrusted-shaped. Until then
 * this is the line, and `reportedElsewhere` is exactly the stand-down list such a
 * control would register itself on, so nothing in this surface has to change when
 * it lands.
 */
function defaultTrust(event: SensorEvent): boolean {
  return event.isTrusted === true;
}

/**
 * The gesture an off-graph or declined report names. Two actuations share the
 * value events, and the element itself settles which: a `<select>` is selected
 * from, anything else is typed into. That is DOM truth about the KIND of control,
 * not a value.
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
  'value-not-declared': 0,
  unwatched: 0,
  'cadence-unavailable': 0,
  watching: 0,
  'sensor-error': 0,
});

/**
 * Attach the sensor to a page. The session is the single source of truth for what
 * to watch; `options.root` is the only thing about the environment the library is
 * told.
 */
export function watchPage(session: SensorSession, options: WatchOptions): PageWatch {
  const root = options.root;
  const ownerDocument = documentOf(root);
  const view = viewOf(ownerDocument);
  const timers = options.timers ?? timersOf(view);
  const now = options.now ?? Date.now;
  const trust = options.trust ?? defaultTrust;
  const watcherCadence: Cadence = options.cadence ?? 'commit';
  const since = now();

  // Read ONCE, at watchPage, into a set: a stand-down list that changed under a
  // live watcher would silently re-open edges the app is still reporting for
  // itself, which is the double-row bug this option exists to prevent.
  const standsDownFor = new Set(options.reportedElsewhere ?? []);
  const standsDown = (edge: string): boolean => standsDownFor.has(edge);

  const controls = createControlIndex();
  const turn = createTurnWindow();
  const debouncer = timers === undefined ? undefined : createDebouncer(timers);

  let stopped = false;
  let index: BindingIndex = buildBindingIndex({
    edges: [],
    standsDown,
    declarations: controls,
    cadence: watcherCadence,
    canDebounce: debouncer !== undefined,
  });
  /** What each SERVED edge expects — the declared-value door's only input besides the getter. */
  let expectsByEdge = new Map<string, unknown>();
  /** The edges the SENSOR has its own reason to stand down for — one derivation, from coverage. */
  let sensorStandsDown = new Set<string>();
  const tally = EMPTY_TALLY();
  /**
   * The last thing said about each edge — the advisory's memory, and the thing
   * that makes it retractable.
   *
   * THE SENTENCE IS THE VALUE, not half of a composite key, and that is
   * load-bearing: an edge's situation CHANGES. A value-taking action starts out
   * unwatched because nothing declared it; the moment the app hands the control
   * over it earns the more precise `value-not-declared` — or it earns `watching`,
   * and then the advisory is WITHDRAWN rather than left standing. Each of those is
   * one report; a repeat of the same sentence on the next rebuild is none. And a
   * consumer who holds only the last thing said about an edge is holding what
   * coverage() would tell them, which is the whole point of the channel.
   */
  const lastAdvice = new Map<string, string>();
  const attached = new Map<SensorEventType, SensorListener>();
  const unsubscribes: Array<() => void> = [];
  /**
   * The session-side releases for the value getters this watcher forwarded.
   * Held here as well as in each attachment because `stop()` releases everything
   * a watcher put into the world: a reader left behind by a stopped watcher would
   * keep answering a served row from a page nobody is watching any more.
   */
  const holdsReleases = new Set<() => void>();
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
      // app's own event dispatch (session.ts:519-527 takes the same stance for
      // session listeners, through the same default sink).
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
   * Re-derive everything the session is the truth for.
   *
   * ONE `available()` CALL feeds all three derivations, so the manifest, the
   * value contracts and the stand-down set can never describe different moments.
   * Deliberately total: a mount, an unmount, an enable flip, a cursor hop or a
   * state delta can each change which edges are live, and an index that survived
   * any of them would be stale exactly where staleness attributes a click to a
   * control that is no longer there.
   */
  function refreshIndex(): void {
    const edges = session.available().edges;
    index = buildBindingIndex({
      edges,
      standsDown,
      declarations: controls,
      cadence: watcherCadence,
      canDebounce: debouncer !== undefined,
    });
    expectsByEdge = new Map(edges.map((edge) => [edge.affordanceId, edge.expects]));
    sensorStandsDown = new Set(
      index.coverage.filter((row) => row.status === 'unwatched').map((row) => row.edge),
    );
  }

  /**
   * Say what is declared here that the sensor is not watching — and take it back
   * when it stops being true.
   *
   * ONCE PER SENTENCE, not per rebuild: an advisory repeated on every mount would
   * drown the reports that describe something that actually just happened.
   *
   * AND WITHDRAWN, because the first pass runs before the app can possibly have
   * answered it: `attach()` lives on the handle `watchPage` has not returned yet,
   * so every value-taking edge is advised about at the one instant a declaration
   * is IMPOSSIBLE. That advisory is honest when it is said and stale a moment
   * later, and a report stream that cannot take it back leaves a consumer
   * believing a wall the app has already torn down — the one thing this channel
   * exists not to do. coverage() was always right; now the stream agrees with it.
   *
   * THE ARM IS PICKED FROM THE SENTENCE, by identity against the constant that
   * wrote it. That keeps one derivation: a consumer's arm can never disagree with
   * the reason coverage shows, and a new wall cannot grow a report arm by accident.
   */
  function announce(): void {
    for (const row of index.coverage) {
      if (row.status === 'watching') {
        // Only an edge that was ADVISED about has anything to withdraw.
        if (lastAdvice.delete(row.edge)) report({ kind: 'watching', edge: row.edge });
        continue;
      }
      const reason = row.reason ?? '';
      if (lastAdvice.get(row.edge) === reason) continue;
      lastAdvice.set(row.edge, reason);
      if (reason === CADENCE_NEEDS_A_CLOCK) {
        report({ kind: 'cadence-unavailable', edge: row.edge, reason });
      } else if (row.blocked === 'payload' && controls.forEdge(row.edge) !== undefined) {
        report({ kind: 'value-not-declared', edge: row.edge, reason });
      } else {
        report({ kind: 'unwatched', edge: row.edge, reason, blocked: row.blocked ?? 'gesture' });
      }
    }
  }

  /**
   * Listen for exactly the event classes the live watch-list needs — no more
   * listeners than there are moments. Adding and removing during a dispatch is
   * safe by the DOM's own rule: a listener added while an event is being
   * dispatched is not invoked for that event, and a removed one is not called
   * again.
   */
  function syncListeners(): void {
    const needed = new Set<SensorEventType>(index.eventTypes);
    for (const declaration of controls.declarations) {
      if (sensorStandsDown.has(declaration.edge)) continue;
      needed.add(commitsOnControl(computeRole(declaration.element), declaration.cadence ?? watcherCadence));
    }
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

  /** The full refresh: derivations, advisories, listeners. */
  function refresh(): void {
    if (stopped) return;
    refreshIndex();
    announce();
    syncListeners();
  }

  /** Record one recognised act. The ONLY place in this module that writes a row. */
  function fire(candidate: MatchCandidate, declaration: ControlDeclaration | undefined): void {
    // ONE ACT, ONE ROW: a repeat of this (edge, instance) inside this task is a
    // duplicate delivery, not a second act (dedupe.ts).
    if (!turn.claim(candidate.edge, candidate.instance)) return;
    const result = session.fire(candidate.edge, {
      source: 'user',
      // Record-only: the browser already ran the app's handler.
      invoke: false,
      ...(candidate.instance !== undefined ? { instance: candidate.instance } : {}),
      // The declared-value door, and the only one. A recognised match carries no
      // declaration, so it can never contribute a payload key at all.
      ...declaredPayload(declaration?.value, expectsByEdge.get(candidate.edge)),
    });
    report({
      kind: 'reported',
      edge: candidate.edge,
      ...(candidate.instance !== undefined ? { instance: candidate.instance } : {}),
      result,
    });
  }

  /**
   * Now, or when the human stops — the cadence decision, applied.
   *
   * THE MOMENT DECIDES, NOT THE CADENCE ALONE. `moment` is the event class that
   * committed this act, which both evidence levels have already agreed on
   * (match.ts returns `one` only for an element's own moment), so it is the one
   * honest answer to "does this act coalesce" — and cadence.ts owns the policy.
   */
  function commit(
    moment: SensorEventType,
    candidate: MatchCandidate,
    declaration: ControlDeclaration | undefined,
  ): void {
    const ms = coalesceWindow(moment, declaration?.cadence ?? watcherCadence);
    // No window — or no clock to run one on, which the stand-down check above and
    // attach() both refuse before any act can reach here (binding-index.ts:211-216
    // is where coverage writes that wall). Either way the act is recorded NOW: a
    // recognised gesture must never leave this function unrecorded AND unreported,
    // which is exactly what the silent `return` this replaced did to every click
    // under a debounced watcher with no clock.
    if (ms === undefined || debouncer === undefined) {
      fire(candidate, declaration);
      return;
    }
    debouncer.schedule(candidateLabel(candidate), ms, () => {
      if (!stopped) fire(candidate, declaration);
    });
  }

  function handle(eventType: SensorEventType, event: SensorEvent): void {
    if (stopped) return;
    try {
      // A keydown that is not Enter or Space is not a press gesture at all —
      // there is nothing here to trust or to refuse, so it is not a report.
      if (eventType === 'keydown' && !isPressKey(event.key)) return;

      // THE WATCH-LIST IS RE-DERIVED HERE, per event, and the reason is in
      // binding-index.ts's header: a version-keyed memo goes stale exactly when a
      // guard flips, and the session's own structure announcements lag the truth
      // by a microtask. available() is the only source that is never behind.
      //
      // The subscriptions still matter, and this is the honest limit of the
      // per-event rebuild: they keep the LISTENER SET current, and an event class
      // nobody is listening for never reaches this function to refresh anything.
      refreshIndex();

      // MATCH FIRST, THEN DECIDE THE ARM. The trust check cannot come earlier: a
      // report that says "declined a synthetic event" without naming the edge is
      // the diagnostic a team needs in order to delete their own isTrusted filter,
      // and checking trust before matching would also tally every programmatic
      // click on prose while the trusted path stays silent for it.
      const outcome = matchElement(
        index,
        controls,
        watcherCadence,
        eventType,
        event.target,
        root,
        ownerDocument,
      );
      if (outcome.kind === 'silent') return;

      // STANDING DOWN OUTRANKS EVERY ARM BELOW IT — door, payload, or a cadence
      // with no clock. announce() already said why, once, so an edge the sensor
      // will not record is one it does not comment on either: a decline naming an
      // edge that was never going to be recorded is a second, contradicting
      // answer to the same question ("the sensor stands down for them",
      // types.ts:96-113). Asked HERE rather than at the moment of recording, so
      // the trusted and untrusted paths cannot disagree about it.
      if (outcome.kind === 'one' && sensorStandsDown.has(outcome.candidate.edge)) return;

      if (!trust(event)) {
        // Only when the gesture WOULD have been attributed. A programmatic click
        // on an ambiguous or undeclared control is as unreportable as a human one.
        if (outcome.kind === 'one') {
          report({
            kind: 'synthetic-event',
            edge: outcome.candidate.edge,
            ...(outcome.candidate.instance !== undefined ? { instance: outcome.candidate.instance } : {}),
            actuation: actuationOf(eventType, event.target),
          });
        }
        return;
      }

      if (outcome.kind === 'many') {
        report({ kind: 'ambiguous', candidates: outcome.candidates });
        return;
      }
      if (outcome.kind === 'off-graph') {
        report({
          kind: 'off-graph',
          role: outcome.role,
          name: outcome.name,
          actuation: actuationOf(eventType, event.target),
        });
        return;
      }
      commit(eventType, outcome.candidate, outcome.declaration);
    } catch (error) {
      // Sensor exceptions are isolated exactly like session listeners: they never
      // propagate into the app's event dispatch.
      report({ kind: 'sensor-error', error });
    }
  }

  // First build, then the subscriptions that keep the listener set true.
  refresh();
  // 'structure' is mount/enable motion; 'transition' moves the cursor; 'state'
  // opens and closes guards. All three change which edges are live.
  for (const event of ['structure', 'transition', 'state'] as const) {
    unsubscribes.push(session.on(event, () => refresh()));
  }

  // OPT-IN, not opt-out: see WatchOptions.watchLocation for why a default-on
  // location watcher would silently strand the cursor off-graph.
  if (options.watchLocation === true) {
    unsubscribes.push(watchLocation(session, view, (error) => report({ kind: 'sensor-error', error })));
  }

  return {
    attach(control): ControlAttachment {
      if (stopped) return NOTHING_ATTACHED;
      // Refused HERE as well as in coverage, because an app can declare a control
      // for an edge this page never serves — and a cadence nobody can run is worth
      // saying out loud the moment it is asked for, not only if the edge shows up.
      if (needsTimer(control.cadence ?? watcherCadence) && debouncer === undefined) {
        if (lastAdvice.get(control.edge) !== CADENCE_NEEDS_A_CLOCK) {
          lastAdvice.set(control.edge, CADENCE_NEEDS_A_CLOCK);
          report({ kind: 'cadence-unavailable', edge: control.edge, reason: CADENCE_NEEDS_A_CLOCK });
        }
        return NOTHING_ATTACHED;
      }
      const release = controls.attach(control);
      // The SAME getter, forwarded to the session's value door so the served row
      // can say what this control holds before anything fires. One declaration,
      // two readers of it — the payload of a gesture that happened, and the row
      // describing the control that has not been used yet — and neither invents
      // anything the app did not hand over.
      //
      // A per-INSTANCE declaration is not forwarded: the door files one reader
      // per action, a repeats row stands for every mounted card at once, and a
      // reader that answered for one of them would be a guessed row. The value
      // still rides the fire, which carries the instance key.
      const releaseHolds =
        control.value !== undefined && control.instance === undefined
          ? session.declareHolds?.(control.edge, control.value)
          : undefined;
      if (releaseHolds) holdsReleases.add(releaseHolds);
      refresh();
      return {
        detach(): void {
          release();
          if (releaseHolds) {
            holdsReleases.delete(releaseHolds);
            releaseHolds();
          }
          refresh();
        },
      };
    },
    stop(): void {
      // Idempotent: a stopped watcher is inert, and a second stop finds nothing to
      // release (the presence-handle contract, presence.ts:10-13).
      if (stopped) return;
      stopped = true;
      for (const [type, listener] of attached) root.removeEventListener(type, listener, CAPTURE);
      attached.clear();
      debouncer?.cancelAll();
      turn.forget();
      controls.clear();
      for (const off of holdsReleases) off();
      holdsReleases.clear();
      // Every release is attempted even if one throws: a teardown that gives up
      // half way leaves a live listener behind, which is the leak stop() exists to
      // prevent.
      for (const off of unsubscribes) {
        try {
          off();
        } catch (error) {
          report({ kind: 'sensor-error', error });
        }
      }
      unsubscribes.length = 0;
    },
    coverage(): Coverage {
      return {
        edges: index.coverage,
        reports: { ...tally },
        declared: controls.size,
        since,
        at: now(),
      };
    },
  };
}
