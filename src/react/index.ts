/**
 * hcifootprint/react — lifecycle skins over the framework-neutral protocols.
 *
 * The core is framework-free and stays that way: `hcifootprint/sensor` decides
 * what is recognisable, what may carry a payload, when a value-bearing control
 * commits, and what one human act is worth on the ledger. The action-binding
 * protocol separately owns exact callable execution. This subpath adds only
 * what React scheduling requires: committed readers, callback refs, listener
 * composition, and exact cleanup.
 *
 * ```ts
 * import { watchPage } from 'hcifootprint/sensor';
 * import { ControlSurfaceProvider, useControl } from 'hcifootprint/react';
 *
 * // once, where the app already builds its session:
 * const watch = watchPage(session, { root: document.body });
 *
 * // <ControlSurfaceProvider watch={watch}>…</ControlSurfaceProvider>
 *
 * // and in any component below it:
 * const ref = useControl({ edge: 'desk.compose.send-message', value: () => draft });
 * // <button ref={ref} onClick={send}>Send</button>
 * ```
 *
 * `useControl` remains record-only: the button runs your function and the sensor
 * records the human. `useActionBinding` is the higher-level alternative: its
 * composed listener enters the connection's continuation door, which executes
 * that existing function once while associating the exact live binding. An
 * optional physical-root projector makes a colocated sensor stand down for that
 * element, so these two ownership modes do not produce two rows.
 *
 * THE FOURTH HOOK IS THE SAME SHAPE FOR THE ASYNC HALF. `useWorking` takes the
 * busy flag a component already renders its own spinner from and turns its two
 * edges into the two calls the core has always had:
 *
 * ```ts
 * useWorking({ busy: save.isPending, label: 'Saving your draft…', error: save.error, actions: saveAction, session });
 * ```
 *
 * The core underneath is plain promises and callbacks — `beginWork` in the
 * `try`, `done()` in the `finally`, `setBusy` around the work — so this hook is
 * a lifecycle wrapper and nothing else, and an Angular or Vue skin is the same
 * five lines in that framework's own lifecycle. It drives the work ledger and
 * the busy label ONLY: neither door settles a transition, so no arrangement of
 * it can report that something worked.
 *
 * A SEPARATE SUBPATH SO THE PEER IS GENUINELY OPTIONAL. The package declares
 * the optional peer as `*` so consumers who never import this subpath are not
 * version-gated; this subpath itself has a real React 18 floor because it uses
 * `useInsertionEffect`. This is the only folder in the package that names
 * React, and its ordinary static import stays visible to bundlers
 * (test/react-boundary.test.ts pins the whole property).
 *
 * WHAT IS DELIBERATELY ABSENT:
 * - A `createControlSurface` wrapper. The one job such a factory could do — hand
 *   the browser default root to `watchPage` — is impossible in this package: the
 *   library compiles with `lib: ["ES2022"]`, so naming `document` in `src/` is a
 *   compile error. That is the point of `WatchOptions.root` being required, and a
 *   wrapper that only renamed `watchPage` would be a second name for one thing.
 * - Implicit handler registration in `useControl`. Its declared sensor surface
 *   remains compatible and record-only. Applications wanting an executable live
 *   binding opt into `useActionBinding` with an explicit runtime and definition.
 *
 * REDACTION, SAID OUT LOUD BECAUSE IT CROSSES A BOUNDARY: `redactedKeys` governs
 * STATE keys, never payloads. A value declared here rides into `payload`, which is
 * outside its reach — aim `redactedFields.payload` at it if it must not travel.
 */
export { ControlSurfaceProvider, useControlSurface } from './context.js';
export type { ControlSurfaceProviderProps } from './context.js';
export { useControl } from './use-control.js';
export type { ControlRef, ControlSpec } from './use-control.js';
export { useActionBinding } from './use-action-binding.js';
export type {
  ActionBindingProjection,
  ActionBindingProjector,
  ActionBindingRefCallback,
  UseActionBindingOptions,
  UseActionBindingResult,
} from './use-action-binding.js';
export type { ActionSettlementCapability } from '../action/types.js';
export { useWorking } from './use-working.js';
export type { BusyControl, WorkingSession, WorkingSpec } from './use-working.js';
