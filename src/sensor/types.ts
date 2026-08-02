/**
 * The sensor's public vocabulary: the session port it drives, the options it
 * takes, the handles it returns, and — the load-bearing one — the typed report
 * for everything it declined to record.
 *
 * THE PORT IS TYPE-ONLY. `SensorSession` is a structural subset of the real
 * {@link InteractionSession}, declared with `import type` so src/sensor stays a
 * ZERO-VALUE-IMPORT leaf: importing the sensor drags no session machinery and no
 * footprintjs. Same construction, same reason, as the LiveBindingPort leaf at
 * graph/sources/from-live-store.ts:25-28.
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
import type { BlockedBy, EdgeCoverage } from './binding-index.js';
import type { Cadence } from './cadence.js';
import type { ControlDeclaration } from './control-index.js';
import type { SensorEvent, SensorRoot, SensorTimers } from './dom-port.js';

/**
 * ONE CANONICAL DOOR, STATED IN THE TYPE SYSTEM.
 *
 * There are two shapes an integration can take, and mixing them double-executes
 * a human's action: either fire() invokes the app's function and the app never
 * calls it directly, or the report path is record-only and the app's own code
 * does the performing. THE SENSOR IS FIRMLY THE SECOND. The browser has already
 * run the app's onClick by the time anything here records it; a fire that also
 * invoked would run it twice (atom/types.ts:717-722, session.ts:1064-1066).
 *
 * So the port does not merely pass `invoke: false` as a habit somebody could
 * forget — it makes the executing fire INEXPRESSIBLE. `invoke` is required and
 * pinned to `false`, so there is no shape of this call that performs anything.
 * A real Session still satisfies the port (its `invoke?: boolean` accepts it);
 * the narrowing binds the CALLER, which is the side that could get it wrong. And
 * downstream, `#invokeHandler` returns on its first line for `invoke === false`
 * (session.ts:1319), so record-only is structurally incapable of executing.
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
  /** Observed navigation: the existing hop-recording path (atom/types.ts:495 `unverifiedEdge`). */
  sync(observedNode: string, opts?: { stimulus?: StimulusKind; principal?: Principal }): SyncResult;
  /**
   * The session's value door: hand over a declared control's `value()` so the
   * SERVED ROW can say what the control holds, one turn before anything fires.
   *
   * The coupling runs one way, sensor → session, and only for the getter the app
   * already handed over. Nothing about the sensor crosses: no element, no
   * instance, no report kind — so the session imports nothing from here and this
   * subpath stays the zero-value-import leaf it is.
   *
   * Optional and severable, like `LiveBindingPort`'s two hooks: a hand-built port
   * without it keeps exactly today's behaviour (the getter still answers for the
   * payload of a reported gesture, and the row simply stays silent). A real
   * `InteractionSession` satisfies it as-is.
   */
  declareHolds?(affordanceId: string, read: () => unknown): () => void;
}

export interface WatchOptions {
  /**
   * The event-delegation root. REQUIRED, and required in the core on purpose:
   * the house law is that the app hands the environment in and the library never
   * reaches for a global. A framework skin supplies the browser default; the
   * core never invents one.
   *
   * ONE WATCHER PER SHADOW ROOT, and this is the honest limit of a single root.
   * The DOM RETARGETS a composed event that crosses a shadow boundary: a listener
   * on `document.body` reads `event.target` as the HOST element, never the control
   * inside it, so the sensor computes the host's role and name and recognises
   * nothing. (`change` does not compose at all, so it never crosses.) Nothing is
   * mis-attributed — a host that presents no role is silence, exactly as clicking
   * prose is — but nothing is reported either, and coverage() cannot see that
   * wall to name it: it speaks about the graph, and a locator is never claimed to
   * resolve to a real element. So hand the shadow root itself in. The port takes
   * one (dom-port.ts:123-127) and resolves ids against it (`documentOf`), and
   * inside its own tree there is no retargeting to lose.
   */
  root: SensorRoot;
  /** Every fire, and every non-fire, as a typed row. See {@link SensorReport}. */
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
   * The clock a `{ debounceMs }` cadence runs on. Defaults to the root's own view
   * (dom-port.ts `timersOf`); pass it explicitly for a test or a non-browser
   * host. With no clock reachable, a debounced cadence is REFUSED
   * (`cadence-unavailable`), never quietly downgraded to per-keystroke.
   */
  timers?: SensorTimers;
  /**
   * "Does the app already report these edges itself?" — ONE ACT, ONE ROW.
   *
   * An app mid-migration still has hand-wired report calls for some controls (a
   * humanFire wrapper in its own onClick). Both doors firing means two ledger
   * rows for one human act. Name those edges here and the sensor stands down for
   * them, saying so in coverage() with `blocked: 'door'` rather than going quiet.
   *
   * Read ONCE, at watchPage: a list that changed under a live watcher would
   * silently re-open edges the app is still reporting for itself, which is the
   * double-row bug this option exists to prevent.
   *
   * It is the ONE per-edge option the sensor accepts, it applies to BOTH evidence
   * levels, and it is not instrumentation: it tells the sensor nothing about how
   * to find anything. It draws a boundary between two reporters. Delete the app's
   * own door and delete this with it. (It is also exactly the stand-down list a
   * future one-door control would register itself on.)
   */
  reportedElsewhere?: readonly string[];
  /**
   * Watch the view for location motion and report it with `sync()`. **Default
   * false**, and the default is the honest one.
   *
   * `sync()` takes a PAGE ID, and page ids are author-chosen names, not URL paths
   * (from-routes.ts:4 — "Page names are EXPLICIT (the keys of the table)"). A
   * watcher that handed `location.pathname` to `sync()` unasked would, in every
   * app whose pages are named rather than pathed, move the cursor to a node that
   * does not exist — and `sync()` moves it unconditionally. From there
   * `available()` honestly serves nothing, so the sensor AND the app's whole
   * agent surface go quiet, silently, because a convenience was on by default.
   *
   * Turn it on when your page ids ARE your paths. Otherwise own the mapping the
   * way route-match.ts:13 already shows, which is one line:
   *
   * ```ts
   * session.sync(matchRoute(graph.spec.pages, location.pathname) ?? location.pathname);
   * ```
   */
  watchLocation?: boolean;
  /**
   * The watcher's default cadence for value-bearing controls. Default `'commit'`
   * — commit-on-blur. A declaration may override it per control. See
   * {@link Cadence}.
   */
  cadence?: Cadence;
}

/**
 * Everything the sensor did and everything it refused to do — one union, no
 * silent arms.
 *
 * The rule this encodes: a human action the sensor cannot attribute confidently
 * is REPORTED, never invented. There is no arm here that writes a guessed session
 * row, and there is no path in the sensor that writes a row without passing
 * through `reported`.
 */
export type SensorReport =
  /** A gesture was recognised and recorded. `result` is the session's own answer, refusals included. */
  | {
      readonly kind: 'reported';
      readonly edge: string;
      readonly instance?: string;
      readonly result: FireResult;
    }
  /**
   * Real human motion on a real control the graph does not declare. The sensor
   * does NOT fabricate a stimulus row for it: world-motion attribution belongs to
   * updateState(), not to a DOM listener.
   */
  | { readonly kind: 'off-graph'; readonly role: string; readonly name: string; readonly actuation: Actuation }
  /** Two or more live edges answer to one role+name+moment. The sensor refuses to pick. */
  | { readonly kind: 'ambiguous'; readonly candidates: readonly string[] }
  /**
   * Code did this, not a person, so `source: 'user'` would be a lie — and the arm
   * NAMES what it declined, because a team deleting their own isTrusted filter
   * needs to see that the sensor caught the same events theirs did. Reported only
   * when the gesture WOULD have been attributed: a programmatic click on prose is
   * as unreportable as a human one.
   */
  | {
      readonly kind: 'synthetic-event';
      readonly edge: string;
      readonly instance?: string;
      readonly actuation: Actuation;
    }
  /**
   * A control was handed over for an action that takes a VALUE, and the
   * declaration carries no `value()`. The sensor stands down for it rather than
   * scraping the DOM. Said once per edge; always in coverage() with
   * `blocked: 'payload'`.
   */
  | { readonly kind: 'value-not-declared'; readonly edge: string; readonly reason: string }
  /**
   * A live edge the sensor is not watching, with the wall it hit — `'gesture'`
   * (no moment to recognise), `'payload'` (takes a value nobody declared), or
   * `'door'` (the app reports it itself). Said once per edge; always in coverage().
   */
  | { readonly kind: 'unwatched'; readonly edge: string; readonly reason: string; readonly blocked: BlockedBy }
  /**
   * A `{ debounceMs }` cadence was asked for and this watcher has no clock to run
   * it on. REFUSED, never downgraded: turning "one row when they stop typing"
   * into "one row per keystroke" behind the app's back is its own bug.
   */
  | { readonly kind: 'cadence-unavailable'; readonly edge: string; readonly reason: string }
  /**
   * AN ADVISORY WITHDRAWN: an edge this watcher advised about is watched now,
   * because the app lifted the wall — usually by handing the control over.
   *
   * It exists because `attach()` lives on the handle `watchPage` RETURNS. At the
   * moment the first advisories are given, a declaration is IMPOSSIBLE, so every
   * value-taking edge is advised about before the app has had its chance; the
   * advice is honest when it is said and stale a moment later. Without this arm
   * the report stream would leave a consumer believing a wall that no longer
   * exists, while coverage() said the opposite.
   *
   * Emitted only for an edge that WAS advised about, and named after the coverage
   * status it announces — one vocabulary, so the two surfaces cannot describe the
   * same edge with two different words.
   */
  | { readonly kind: 'watching'; readonly edge: string }
  /** The sensor itself threw. Isolated exactly like a session listener — the app's dispatch is never broken. */
  | { readonly kind: 'sensor-error'; readonly error: unknown };

/** What the sensor is watching right now, and what it has said since it started. */
export interface Coverage {
  /** One row per LIVE edge: watching, or unwatched with the sentence saying why. */
  readonly edges: readonly EdgeCoverage[];
  /** How many reports of each kind this watcher has emitted. */
  readonly reports: Readonly<Record<SensorReport['kind'], number>>;
  /** How many controls are declared through attach() right now. */
  readonly declared: number;
  /** The clock reading when the watcher started — the tally's window opens here. */
  readonly since: number;
  /** The clock reading when coverage() was asked. */
  readonly at: number;
}

/**
 * One declared control's registration. `attach`/`detach` are a true pair.
 *
 * `detach()` is idempotent and TOKEN-IDENTITY: it releases the declaration it was
 * handed and nothing else, so attach → detach → attach nets to one entry the way
 * a PresenceHandle does (presence.ts:10-13) and a React StrictMode double-invoke
 * leaves exactly one control declared.
 */
export interface ControlAttachment {
  detach(): void;
}

/**
 * The handle `watchPage` returns.
 *
 * A named method rather than a bare closure because a framework binding stores it
 * across renders, and `registerActions`'s handle already sets that idiom
 * (nav-session.ts:238-257).
 *
 * `stop()` is idempotent, the same contract a PresenceHandle keeps: watch → stop
 * → watch nets to one live listener set.
 */
export interface PageWatch {
  /** Hand a control over. THE declared level — see {@link ControlDeclaration}. */
  attach(control: ControlDeclaration): ControlAttachment;
  coverage(): Coverage;
  stop(): void;
}
