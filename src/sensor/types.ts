/**
 * The sensor's public vocabulary: the session port it drives, the options it
 * takes, the handle it returns, and — the load-bearing one — the typed report
 * for everything it declined to record.
 *
 * THE PORT IS TYPE-ONLY. `SensorSession` is a structural subset of the real
 * {@link InteractionSession}, declared with `import type` so src/sensor stays a
 * ZERO-VALUE-IMPORT leaf: importing the sensor drags no session machinery and no
 * footprintjs. Same construction, same reason, as the LiveBindingPort at
 * graph/sources/types.ts:108-112 and its leaf at from-live-store.ts:25-28.
 */
import type {
  Actuation,
  AvailableSlice,
  FireOptions,
  FireResult,
  Principal,
  SessionEventName,
  SessionEvents,
  StimulusKind,
  SyncResult,
} from '../atom/types.js';
import type { BindingCoverage } from './binding-index.js';
import type { SensorEvent, SensorRoot } from './dom-port.js';

/**
 * ONE CANONICAL DOOR, STATED IN THE TYPE SYSTEM.
 *
 * There are two shapes an integration can take, and mixing them double-executes
 * a human's action: either fire() invokes the app's function and the app never
 * calls it directly, or the report path is record-only and the app's own code
 * does the performing. THE SENSOR IS FIRMLY THE SECOND. The browser has already
 * run the app's onClick by the time anything here records it; a fire that also
 * invoked would run it twice (atom/types.ts:604-609, session.ts:1074-1075).
 *
 * So the port does not merely pass `invoke: false` as a habit somebody could
 * forget — it makes the executing fire INEXPRESSIBLE. `invoke` is required and
 * pinned to `false`, so there is no shape of this call that performs anything.
 * A real Session still satisfies the port (its `invoke?: boolean` accepts it);
 * the narrowing binds the CALLER, which is the side that could get it wrong.
 */
export type RecordOnlyFire = Omit<FireOptions, 'invoke'> & { readonly invoke: false };

/**
 * What the sensor needs from a session — and nothing more.
 *
 * A real `InteractionSession` satisfies it structurally (proved in
 * test/sensor-boundary.test.ts by assigning one to this type), so a consumer
 * passes their session straight in; a test can pass a hand-built stand-in.
 */
export interface SensorSession {
  /** The live action space: the served edges ARE the sensor's watch-list. */
  available(): AvailableSlice;
  /**
   * The record-only tier — and the port DEMANDS it, so the sensor is
   * structurally incapable of executing anything. See {@link RecordOnlyFire}.
   */
  fire(affordanceId: string, opts: RecordOnlyFire): FireResult;
  /** The passive observer surface — how the sensor learns the surface moved. */
  on<N extends SessionEventName>(event: N, listener: (payload: SessionEvents[N]) => void): () => void;
  /** Observed navigation: the existing hop-recording path (atom/types.ts:438-442). */
  sync(observedNode: string, opts?: { stimulus?: StimulusKind; principal?: Principal }): SyncResult;
}

export interface WatchOptions {
  /**
   * The event-delegation root. REQUIRED, and required in the core on purpose:
   * the house law is that the app hands the environment in and the library never
   * reaches for a global. A framework skin supplies the browser default; the
   * core never invents one.
   */
  root: SensorRoot;
  /** Every non-fire, and every fire, as a typed row. See {@link SensorReport}. */
  onReport?: (report: SensorReport) => void;
  /**
   * "Was a human really here?" Defaults to reading `event.isTrusted`, which only
   * a real user gesture sets. Injectable because a test harness can never mint a
   * trusted event — the same injectable-with-production-default seam as
   * `now?: () => number` at nav-session.ts:65.
   */
  trust?: (event: SensorEvent) => boolean;
  /** The clock coverage() reports its window with. Defaults to Date.now. */
  now?: () => number;
  /**
   * "Does the app already report this edge itself?" — ONE ACT, ONE ROW.
   *
   * An app that is mid-migration still has hand-wired report calls for some
   * controls (a humanFire wrapper in its own onClick). Both doors firing means
   * two ledger rows for one human act. Name those edges here and the sensor
   * stands down for them, saying so in coverage() with `blocked: 'door'` rather
   * than going quiet.
   *
   * This is the ONE per-edge option the sensor accepts, and it is not
   * instrumentation: it tells the sensor nothing about how to find anything. It
   * draws a boundary between two reporters. Delete the app's own door and delete
   * this with it.
   */
  reportedElsewhere?: readonly string[];
  /**
   * Watch the view for location motion and report it with `sync()`. **Default
   * false**, and the default is the honest one.
   *
   * `sync()` takes a PAGE ID, and page ids are author-chosen names, not URL paths
   * (from-routes.ts:54 — "Page names are EXPLICIT... auto-deriving a name from
   * '/orders/:id' would be a guess"). A watcher that handed `location.pathname`
   * to `sync()` unasked would, in every app whose pages are named rather than
   * pathed, move the cursor to a node that does not exist — and `sync()` moves it
   * unconditionally (session.ts:1661-1692). From there `available()` honestly
   * serves nothing, so the sensor AND the app's whole agent surface go quiet,
   * silently, because a convenience was on by default.
   *
   * Turn it on when your page ids ARE your paths. Otherwise own the mapping the
   * way route-match.ts:16 already shows, which is one line:
   *
   * ```ts
   * session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
   * ```
   */
  watchLocation?: boolean;
}

/**
 * Everything the sensor did and everything it refused to do — one union, no
 * silent arms.
 *
 * The rule this encodes: a human action the sensor cannot attribute confidently
 * is REPORTED, never invented. There is no arm here that writes a guessed
 * session row, and there is no path in the sensor that writes a row without
 * passing through `reported`.
 */
export type SensorReport =
  /** A gesture was recognized and recorded. `result` is the session's own answer, refusals included. */
  | { readonly kind: 'reported'; readonly edge: string; readonly result: FireResult }
  /**
   * Real human motion on a real control that the graph does not declare. The
   * sensor does NOT fabricate a stimulus row for it: world-motion attribution
   * belongs to updateState() (atom/types.ts:738-752), not to a DOM listener.
   */
  | { readonly kind: 'off-graph'; readonly role: string; readonly name: string; readonly actuation: Actuation }
  /** Two or more live edges answer to one role+name+gesture. The sensor refuses to pick. */
  | { readonly kind: 'ambiguous'; readonly candidates: readonly string[] }
  /** `isTrusted` was false — code did this, not a person, and `source: 'user'` would be a lie. */
  | { readonly kind: 'synthetic-event' }
  /**
   * THE BIG ONE: this edge takes a VALUE, and the sensor never reads one off the
   * DOM (payload.ts). Kept apart from `unwatched` because the fix is different —
   * not "the sensor cannot see this gesture" but "report this one from where the
   * value is declared". Announced once per edge; always in coverage() with
   * `blocked: 'payload'`.
   */
  | { readonly kind: 'payload-opaque'; readonly edge: string; readonly reason: string }
  /**
   * A live binding whose GESTURE the sensor does not watch (hover, a keychord, a
   * url hop), or one the app has already spoken for via `reportedElsewhere`.
   * Announced once per edge; always in coverage().
   */
  | { readonly kind: 'unwatched'; readonly edge: string; readonly reason: string }
  /** The sensor itself threw. Isolated exactly like a session listener — the app's dispatch is never broken. */
  | { readonly kind: 'sensor-error'; readonly error: unknown };

/** What the sensor is watching right now, and what it has said since it started. */
export interface SensorCoverage {
  /** One row per LIVE binding: watching, or unwatched with the sentence saying why. */
  readonly bindings: readonly BindingCoverage[];
  /** How many reports of each kind this watcher has emitted. */
  readonly reports: Readonly<Record<SensorReport['kind'], number>>;
  /** The clock reading when the watcher started — the tally's window opens here. */
  readonly since: number;
  /** The clock reading when coverage() was asked. */
  readonly at: number;
}

/**
 * The handle `watchPage` returns.
 *
 * `stop()` is idempotent, the same contract a PresenceHandle keeps
 * (presence.ts:10-13): setup → cleanup → setup nets to one live watcher, so a
 * React StrictMode double-invoke leaves exactly one listener set behind.
 */
export interface PageWatcher {
  stop(): void;
  coverage(): SensorCoverage;
}
