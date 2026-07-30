/**
 * hcifootprint/react — a SKIN over the human sensor, not a second brain.
 *
 * The core is framework-free and stays that way: `hcifootprint/sensor` decides
 * what is recognisable, what may carry a payload, when a value-bearing control
 * commits, and what one human act is worth on the ledger. This subpath adds
 * exactly what React's own scheduling requires and nothing else — a context to
 * find the watcher, and a ref callback whose identity is stable across renders.
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
 * WHAT YOU DELETE BY ADOPTING IT — the report call in every onClick. The button
 * still runs your function; the sensor still records the human. Nothing here can
 * perform anything, because the port it drives makes an executing fire
 * inexpressible (`RecordOnlyFire`), so one click can never become two acts.
 *
 * A SEPARATE SUBPATH SO THE PEER IS GENUINELY OPTIONAL. `react` is an optional
 * peer with a real floor (`>=18`); this is the only folder in the package that
 * names it, and a consumer who never writes `from 'hcifootprint/react'` never
 * resolves it. No dynamic-specifier hatch is needed for that, because the import
 * here is an ordinary static one that a bundler can see straight through
 * (test/react-boundary.test.ts pins the whole property).
 *
 * WHAT IS DELIBERATELY ABSENT:
 * - A `createControlSurface` wrapper. The one job such a factory could do — hand
 *   the browser default root to `watchPage` — is impossible in this package: the
 *   library compiles with `lib: ["ES2022"]`, so naming `document` in `src/` is a
 *   compile error. That is the point of `WatchOptions.root` being required, and a
 *   wrapper that only renamed `watchPage` would be a second name for one thing.
 * - Handler registration. See the note on `useControl`: `registerToolGroup` is
 *   already the library's one mount door, and the edge id a declaration needs is
 *   the engine's to resolve rather than a skin's to reconstruct.
 *
 * REDACTION, SAID OUT LOUD BECAUSE IT CROSSES A BOUNDARY: `redactedKeys` governs
 * STATE keys, never payloads. A value declared here rides into `payload`, which is
 * outside its reach — aim `redactedFields.payload` at it if it must not travel.
 */
export { ControlSurfaceProvider, useControlSurface } from './context.js';
export type { ControlSurfaceProviderProps } from './context.js';
export { useControl } from './use-control.js';
export type { ControlRef, ControlSpec } from './use-control.js';
