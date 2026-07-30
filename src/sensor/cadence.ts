/**
 * WHEN A VALUE-BEARING CONTROL COMMITS — a library policy, decided here, so no
 * consumer has to rediscover it.
 *
 * A click has one moment and there is nothing to decide. Typing does not: a
 * human types thirty characters and means ONE act, and every row the sensor
 * writes bumps the session's version. Left unstated, every integration picks a
 * different answer and the ones that pick `input` flood their own ledger. So the
 * three answers are named, the default is the conservative one, and each is
 * chosen per control rather than per app:
 *
 * - `'commit'` — THE DEFAULT. Commit-on-blur, and it needs exactly ONE listener:
 *   `change`. For a text input the browser fires `change` precisely when the
 *   human finishes — on blur, and on Enter. For a `<select>` it fires on pick.
 *   Adding a `blur` listener alongside would BE the double-row bug (one act, one
 *   row), so there is no second listener here.
 * - `{ debounceMs }` — `input`, coalesced, LAST VALUE WINS. Named because a
 *   live-search field genuinely wants intermediate values on the ledger.
 * - `'per-keystroke'` — every `input`. Opt-in, and the cost is the point: one
 *   session version bump per keystroke.
 *
 * WHY THE TIMER IS INJECTED. `setTimeout` is not in `lib: ["ES2022"]`, so naming
 * it in src/ is `error TS2304` — the compiler enforces the house law that the
 * app hands the environment in. A debounced cadence therefore borrows the clock
 * from the root's own view (dom-port.ts `timersOf`), with `WatchOptions.timers`
 * as the explicit override for a test or a non-browser host. And when there is
 * no clock at all the cadence is REFUSED (`cadence-unavailable`), never silently
 * downgraded to per-keystroke: quietly turning "one row when they stop typing"
 * into "thirty rows" is the kind of surprise a library must not spring.
 */
import type { Actuation } from '../atom/types.js';
import type { SensorTimers } from './dom-port.js';

/** How often a value-bearing control writes a row. See the module header. */
export type Cadence = 'commit' | 'per-keystroke' | { readonly debounceMs: number };

/** The DOM event classes the sensor listens for — one per recognisable moment. */
export type SensorEventType = 'click' | 'keydown' | 'change' | 'input';

/**
 * The roles whose committed moment is a VALUE CHANGE rather than a click.
 *
 * Checkbox and radio are deliberately absent: ticking one IS the click, and both
 * events fire, so treating them as value controls would only pick the later of
 * two moments for the same act.
 */
const COMMITS_ON_VALUE_CHANGE: ReadonlySet<string> = new Set([
  'textbox',
  'searchbox',
  'spinbutton',
  'slider',
  'combobox',
  'listbox',
]);

/** Which event class carries a value under this cadence. The whole cadence knob, in one line. */
function valueEvent(cadence: Cadence): SensorEventType {
  return cadence === 'commit' ? 'change' : 'input';
}

/** Does this cadence need a clock? Only the debounced one does. */
export function needsTimer(cadence: Cadence): boolean {
  return typeof cadence === 'object';
}

/** The debounce window in milliseconds, or `undefined` for the two undebounced cadences. */
export function debounceMsOf(cadence: Cadence): number | undefined {
  return typeof cadence === 'object' ? cadence.debounceMs : undefined;
}

/**
 * RECOGNISED: which event class commits this DECLARED GESTURE.
 *
 * The actuation is the app's own statement about how the control is worked
 * (atom/types.ts:77), so it decides — and it is the only evidence that can tell
 * a keyboard-activated control from a clicked one, which no role can.
 *
 * `undefined` = this library has no honest way to recognise the gesture yet:
 * `hover` and `drag` have no committed moment a listener can point at.
 */
export function commitsOnGesture(actuation: Actuation, cadence: Cadence): SensorEventType | undefined {
  if (actuation === 'click') return 'click';
  if (actuation === 'press') return 'keydown';
  if (actuation === 'type' || actuation === 'select') return valueEvent(cadence);
  return undefined; // hover, drag
}

/**
 * DECLARED: which event class commits this HANDED-OVER CONTROL.
 *
 * A declaration names an edge and an element, not a gesture — it may point at an
 * edge with no binding at all — so the moment comes from the element's ROLE
 * instead. A role the sensor does not recognise still commits on `click`: the
 * app declared the control, so the declaration is trusted; the role only picks
 * which moment to watch, and a click is the moment for everything that is not a
 * value.
 */
export function commitsOnControl(role: string, cadence: Cadence): SensorEventType {
  return COMMITS_ON_VALUE_CHANGE.has(role) ? valueEvent(cadence) : 'click';
}

/** A coalescing scheduler over the environment's own clock. */
export interface Debouncer {
  /** Run `commit` once `ms` have passed with no further call for `key`. */
  schedule(key: string, ms: number, commit: () => void): void;
  /** Drop every pending commit — teardown, and nothing else calls it. */
  cancelAll(): void;
}

/**
 * The debounce scheduler. LAST CALL WINS, and it wins by construction: each
 * `schedule` cancels the pending handle for that key before arming a new one.
 *
 * Nothing about the VALUE is buffered here, deliberately. A declared value is
 * read at report time, so the value the coalesced row carries is the value the
 * control holds when the window closes — which is exactly "last value wins",
 * with no second copy of the app's state to go stale.
 */
export function createDebouncer(timers: SensorTimers): Debouncer {
  const pending = new Map<string, unknown>();
  return {
    schedule(key, ms, commit): void {
      const existing = pending.get(key);
      if (existing !== undefined) timers.clearTimeout(existing);
      pending.set(
        key,
        timers.setTimeout(() => {
          pending.delete(key);
          commit();
        }, ms),
      );
    },
    cancelAll(): void {
      for (const handle of pending.values()) timers.clearTimeout(handle);
      pending.clear();
    },
  };
}
