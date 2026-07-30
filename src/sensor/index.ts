/**
 * hcifootprint/sensor — the human sensor. RECORD-ONLY, BY CONSTRUCTION.
 *
 * One attach function, and it reads as a sentence: watch the page, and every
 * human action the graph already declares lands on the ledger by itself.
 *
 * ```ts
 * import { watchPage } from 'hcifootprint/sensor';
 *
 * const watch = watchPage(session, { root: document.body });
 * // …the human clicks a declared button; the session gains a transition with
 * // cause { kind: 'fired', principal: 'user' } and nothing else was wired.
 *
 * // And for a control that holds a value, hand the element over:
 * const control = watch.attach({ edge: 'compose.send', element: inputEl, value: () => draft });
 * control.detach();
 * watch.stop();
 * ```
 *
 * ONE BRAIN, TWO EVIDENCE LEVELS, N SKINS. No framework is required to use this;
 * a framework binding is a skin over exactly four fields and one method
 * ({@link ControlDeclaration} and `attach`). Recognition asks two questions, in
 * this order:
 * - DECLARED — the app handed the element over. Identity is OBJECT identity, so
 *   nothing is computed and nothing can be ambiguous, and the declaration may
 *   carry a value getter, so a payload is legal here.
 * - RECOGNISED — nothing declared. Walk the ancestors, compute role and
 *   accessible name from documented subsets, look up the graph's own edge
 *   bindings. Unique → report. Two or more → refuse. A payload is NEVER legal
 *   here.
 *
 * THE SINGLE SOURCE OF TRUTH: no selector map, no id registry, no instrumentation
 * config, ever. The watch-list IS `session.available().edges` and the `binding`
 * each one carries. The only thing an app may add is DOM truth (ARIA roles,
 * accessible names) — which improves the page for every user and configures
 * nothing. The one list a caller may hand in, `reportedElsewhere`, does not say
 * what to watch either: it names the edges the app already reports through its own
 * door, so one human act still writes one row.
 *
 * RECORD-ONLY IS IN THE TYPE SYSTEM: {@link RecordOnlyFire} pins `invoke` to
 * `false`, so an executing fire is INEXPRESSIBLE rather than discouraged, and
 * `#invokeHandler` returns on its first line for `invoke === false`. The sensor
 * cannot run the app's code even by mistake.
 *
 * THE HONESTY STANCE: a human action the sensor cannot attribute confidently is
 * REPORTED on `onReport` and tallied in `coverage()`, never invented as a session
 * row. Zero candidates, two candidates, a programmatic event, an action whose
 * value only the app can declare — each has its own typed arm in
 * {@link SensorReport}, and none of them writes a ledger row.
 *
 * ZERO-VALUE-IMPORT LEAF: everything here reaches the engine through `import type`
 * only, so importing the sensor drags no session machinery and no footprintjs
 * (test/sensor-boundary.test.ts and test/treeshake.test.ts prove it, the same way
 * from-live-store.ts is proved).
 */
export { watchPage } from './watch-page.js';
export type {
  ControlAttachment,
  Coverage,
  PageWatch,
  RecordOnlyFire,
  SensorReport,
  SensorSession,
  WatchOptions,
} from './types.js';
export type { BlockedBy, EdgeCoverage } from './binding-index.js';
export type { Cadence } from './cadence.js';
export type { ControlDeclaration } from './control-index.js';
// The duck-typed DOM surface. Exported WHOLE: these interfaces appear in the
// signatures above, and a type a consumer can be handed but cannot name is a type
// they cannot write a wrapper around.
export type {
  SensorDocument,
  SensorElement,
  SensorEvent,
  SensorEventTarget,
  SensorListener,
  SensorListenerOptions,
  SensorRoot,
  SensorTimers,
  SensorWindow,
} from './dom-port.js';
