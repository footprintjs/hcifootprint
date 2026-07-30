/**
 * hcifootprint/sensor — the human sensor.
 *
 * One attach function, and it reads as a sentence: watch the page, and every
 * human action the graph already declares lands on the ledger by itself.
 *
 * ```ts
 * import { watchPage } from 'hcifootprint/sensor';
 *
 * const watcher = watchPage(session, { root: document.body });
 * // …the human clicks a declared button; the session gains a transition with
 * // cause { kind: 'fired', principal: 'user' } and nothing else was wired.
 * watcher.stop();
 * ```
 *
 * THE SINGLE SOURCE OF TRUTH: the sensor takes no selector map and no id
 * registry. Its entire watch-list is derived from `session.available()`, so the
 * graph the app already declared IS the instrumentation manifest. The only thing
 * an app may add is DOM truth (ARIA roles, accessible names) — which improves the
 * page for every user, and configures nothing. The one list a caller may hand in,
 * `reportedElsewhere`, does not say what to watch either: it names the edges the
 * app already reports through its own door, so one human act still writes one row.
 *
 * THE HONESTY STANCE: a human action the sensor cannot attribute confidently is
 * REPORTED on `onReport` and tallied in `coverage()`, never invented as a
 * session row. Zero candidates, two candidates, an untrusted event, an action
 * that takes a value the sensor refuses to scrape out of the DOM — each has its
 * own typed arm in {@link SensorReport}, and none of them writes a ledger row.
 *
 * ZERO-VALUE-IMPORT LEAF: everything here reaches the engine through `import
 * type` only, so importing the sensor drags no session machinery and no
 * footprintjs (test/sensor-boundary.test.ts and test/treeshake.test.ts prove it,
 * the same way from-live-store.ts is proved).
 */
export { watchPage } from './watch-page.js';
export type {
  PageWatcher,
  RecordOnlyFire,
  SensorCoverage,
  SensorReport,
  SensorSession,
  WatchOptions,
} from './types.js';
export type { BindingCoverage, BlockedBy } from './binding-index.js';
// The duck-typed DOM surface. Exported WHOLE: these interfaces appear in the
// signatures above, and a type a consumer can be handed but cannot name is a
// type they cannot write a wrapper around.
export type {
  SensorDocument,
  SensorElement,
  SensorEvent,
  SensorEventTarget,
  SensorListener,
  SensorListenerOptions,
  SensorRoot,
  SensorWindow,
} from './dom-port.js';
