/**
 * THE ANCHOR WATCHER — the sensing half of a contextful action.
 *
 * One declared anchor, two directions: the agent ACTUATES the control the
 * locator names, and this listens at the same element while the action runs.
 * Everything it produces is name-class only — an event TYPE, a tag, an explicit
 * role — because the port it reads through cannot see content at all
 * (anchor-port.ts).
 *
 * THE CORRELATION RULE, in one sentence and written onto every record it
 * touches: an event or change delivered between the fire and the end of the task
 * it came to rest in is ASSOCIATED with that action; anything else is STIMULUS.
 *
 * WHY A TASK AND NOT A CLOCK. Both edges of the window are turn-shaped rather
 * than millisecond-shaped, and a clock would be a guess at both:
 * - AT THE START: the anchor listens in the CAPTURE phase, so the click that
 *   causes an action is delivered BEFORE the app's own `onClick` calls the
 *   handler that opens the window. An event that arrived earlier in the same
 *   task is therefore part of the act, and a window that only counted forward
 *   would miss the very gesture that caused it.
 * - AT THE END: a DOM change is delivered at the microtask checkpoint, so a
 *   window that shut exactly at settlement would see nothing an action did.
 * A change delivered later still lands as stimulus, and the record says
 * `association: 'inferred'` about all of it — this is evidence, not proof
 * (law 3), and the honest limit is stated rather than papered over.
 *
 * ONE WATCHER PER (action, element), REFCOUNTED. React StrictMode mounts twice
 * before it unmounts once; a second attach must not double the listeners and
 * the first release must not silence the survivor. Same contract as
 * PresenceIndex (presence.ts:10-13) — the refcount lives in the session's
 * anchor table, and `stop()` here is called exactly once, by the last release.
 */
import type {
  AnchorChangeRecord,
  AnchorElement,
  AnchorEvent,
  AnchorListener,
  AnchorListenerOptions,
  AnchorObserver,
} from './anchor-port.js';
import { nameOf, observerCtorOf } from './anchor-port.js';
import type { ActionExpectation, SensedChange, SensedEvent, SensedSummary } from './types.js';

/** The correlation rule, recorded on every summary this module produces (law 3). */
export const CORRELATION_RULE =
  'an event or change delivered between the fire and the end of the task it came to rest in';

/** The event classes an anchor listens for. Fixed: these are the moments an action HAS. */
export const ANCHOR_EVENTS = ['click', 'input', 'change'] as const;

/**
 * Changes examined per invocation window. Past it, changes are DROPPED and
 * counted — a virtualized list re-rendering under an anchor can produce
 * thousands, and a record that carried them all would be a memory leak with a
 * timestamp. Honest degradation: the count says how many were not looked at.
 */
export const CHANGE_BUDGET = 50;

/** Events retained per window, on the same terms and for the same reason. */
export const EVENT_BUDGET = 200;

/** Events carried INLINE on the record; past this the trail rides by reference. */
export const INLINE_EVENTS = 20;

/** One shared options object for add AND remove — a mismatched flag is the classic listener leak. */
const CAPTURE: AnchorListenerOptions = Object.freeze({ capture: true });

/** What the session hands the watcher. */
export interface AnchorWatchOptions {
  /** The app's declared expectation — the ONLY door to `effect: 'observed'`. */
  expect?: ActionExpectation;
  /** An anchor event no invocation claimed. */
  onStimulus?: (event: SensedEvent) => void;
  /**
   * A TRUSTED click landed while no invocation was open — the sense-only door.
   * Absent for a wrapped handler: there, the wrapper is the door, and firing
   * here as well would write two rows for one human act.
   */
  onHumanClick?: () => void;
  now: () => number;
  /** Dev-warning sink — a throwing app callback is isolated, never propagated. */
  warn: (message: string) => void;
}

export interface AnchorWatch {
  /** Open the correlation window for one fire. Any window still open is finalized first. */
  open(): void;
  /**
   * Close it — the summary arrives at the end of THIS task (see the header).
   *
   * The whole event list rides alongside the summary because the summary itself
   * may only carry a COUNT (an oversized trail goes by reference), and the
   * session is the side that decides what to retain.
   */
  close(deliver: (summary: SensedSummary, events: readonly SensedEvent[]) => void): void;
  /** Release every listener and the observer. Idempotent. */
  stop(): void;
}

interface OpenWindow {
  events: SensedEvent[];
  eventsDropped: number;
  changes: number;
  changesDropped: number;
  effect?: SensedSummary['effect'];
  deliver?: (summary: SensedSummary, events: readonly SensedEvent[]) => void;
  closing: boolean;
}

/** Attach to one anchor. Nothing here reads a global — the element came from the app. */
export function watchAnchor(anchor: AnchorElement, options: AnchorWatchOptions): AnchorWatch {
  const listeners = new Map<string, AnchorListener>();
  /** Events seen in THIS task that no window has claimed yet (see the header). */
  let turn: SensedEvent[] = [];
  let turnScheduled = false;
  let open: OpenWindow | null = null;
  let stopped = false;

  const observer = connectObserver(anchor, (records) => {
    if (open === null) return; // page churn outside every action: not this action's evidence
    for (const record of records) recordChange(record);
  });

  function recordChange(record: AnchorChangeRecord): void {
    /* v8 ignore next -- unreachable: the callback above returns on a closed window and nothing else calls this. The guard is what keeps a future caller from counting a change into no window at all. */
    if (open === null) return;
    if (open.changes >= CHANGE_BUDGET) {
      open.changesDropped += 1;
      return;
    }
    open.changes += 1;
    const change = describeChange(record, options.now());
    if (open.effect !== undefined || options.expect === undefined) return;
    if (safely(() => options.expect?.matches(change) === true, 'expectation', options.warn)) {
      // LAW 4, and the only line that can write it: the app's own declared
      // expectation matched a change the library actually observed. Nothing here
      // checks that the value is RIGHT — that blind spot stays open and reported.
      open.effect = { status: 'observed', expectation: options.expect.name, at: change.at };
    }
  }

  function handle(event: AnchorEvent): void {
    if (stopped) return;
    const sensed: SensedEvent = { type: event.type, ...nameOf(event.target), at: options.now() };
    if (open !== null && !open.closing) {
      if (open.events.length >= EVENT_BUDGET) open.eventsDropped += 1;
      else open.events.push(sensed);
      return;
    }
    // Unclaimed — for now. A fire opening later in THIS task adopts it; the
    // drain below turns whatever is left into stimulus.
    turn.push(sensed);
    scheduleDrain();
    if (event.type === 'click' && event.isTrusted === true) options.onHumanClick?.();
  }

  function scheduleDrain(): void {
    if (turnScheduled) return;
    turnScheduled = true;
    // A promise continuation IS a microtask, and `Promise` is in `lib:
    // ["ES2022"]` while `queueMicrotask` is not — dedupe.ts's own note, and the
    // same reason the sensor's turn window is written this way.
    void Promise.resolve().then(() => {
      turnScheduled = false;
      const unclaimed = turn;
      turn = [];
      for (const event of unclaimed) {
        safely(() => options.onStimulus?.(event), 'onStimulus', options.warn);
      }
    });
  }

  function finalize(claim: OpenWindow): void {
    const trail =
      claim.events.length > INLINE_EVENTS
        ? ({ shape: 'by-reference', count: claim.events.length } as const)
        : ({ shape: 'inline', events: claim.events } as const);
    claim.deliver?.(
      {
        association: 'inferred',
        rule: CORRELATION_RULE,
        trail,
        changes: observer === undefined ? 'unobservable' : claim.changes,
        ...(claim.changesDropped > 0 ? { changesDropped: claim.changesDropped } : {}),
        ...(claim.eventsDropped > 0 ? { eventsDropped: claim.eventsDropped } : {}),
        ...(claim.effect !== undefined ? { effect: claim.effect } : {}),
      },
      claim.events,
    );
  }

  for (const type of ANCHOR_EVENTS) {
    const listener: AnchorListener = (event) => handle(event);
    // CAPTURE PHASE, for the reason watch-page.ts states: it runs before the
    // app's own handlers, so the gesture is seen as it was when the human made
    // it rather than after the app has already moved the world.
    anchor.addEventListener(type, listener, CAPTURE);
    listeners.set(type, listener);
  }

  return {
    open(): void {
      if (stopped) return;
      if (open !== null) finalize(open); // one window at a time: a new act ends the old one
      const claimed = turn;
      turn = [];
      open = {
        events: claimed.slice(0, EVENT_BUDGET),
        eventsDropped: Math.max(0, claimed.length - EVENT_BUDGET),
        changes: 0,
        changesDropped: 0,
        closing: false,
      };
    },
    close(deliver): void {
      const claim = open;
      if (claim === null || claim.closing) return;
      claim.closing = true;
      claim.deliver = deliver;
      // THE END OF THE TASK IT CAME TO REST IN — see the header. One hop, so a
      // change delivered by the observer's own microtask still lands inside.
      void Promise.resolve().then(() => {
        if (open === claim) open = null;
        finalize(claim);
      });
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      for (const [type, listener] of listeners) anchor.removeEventListener(type, listener, CAPTURE);
      listeners.clear();
      observer?.disconnect();
      open = null;
      turn = [];
    },
  };
}

/** Observe the anchor's subtree, or answer absence when the host has no observer. */
function connectObserver(
  anchor: AnchorElement,
  onRecords: (records: readonly AnchorChangeRecord[]) => void,
): AnchorObserver | undefined {
  const ctor = observerCtorOf(anchor);
  if (ctor === undefined) return undefined;
  const observer = new ctor(onRecords);
  observer.observe(anchor, { childList: true, subtree: true, attributes: true, characterData: true });
  return observer;
}

/** One observer record, reduced to its name-class. Values never enter this function's output. */
function describeChange(record: AnchorChangeRecord, at: number): SensedChange {
  const names = nameOf(record.target);
  if (record.type === 'attributes') {
    return {
      kind: 'attribute',
      ...(typeof record.attributeName === 'string' ? { attribute: record.attributeName } : {}),
      ...names,
      at,
    };
  }
  if (record.type === 'characterData') return { kind: 'text', ...names, at };
  // childList: what actually happened to the subtree, said as the two facts a
  // name-only capture has — something appeared, or something left.
  const removed = (record.removedNodes?.length ?? 0) > 0 && (record.addedNodes?.length ?? 0) === 0;
  return { kind: removed ? 'removed' : 'added', ...names, at };
}

/**
 * Run an app-supplied callback the way every other consumer callback in this
 * library runs: isolated. A predicate or a listener that throws costs itself and
 * nothing else — it never reaches the app's own event dispatch.
 */
function safely(run: () => boolean | void, what: string, warn: (message: string) => void): boolean {
  try {
    return run() === true;
  } catch (error) {
    warn(`hcifootprint: a contextful ${what} callback threw: ${String(error)} — ignored.`);
    return false;
  }
}
