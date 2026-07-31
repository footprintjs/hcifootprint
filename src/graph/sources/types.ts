/**
 * Growable graph sources — the descriptions an app ALREADY owns (a route
 * table, a set of journeys) become graph input instead of being re-typed by
 * hand into the definition. A source is a plain tagged VALUE: a factory reads
 * the app's truth once, snapshots it, and hands the snapshot to
 * buildNavigationGraph via `def.sources`. The graph reads the owner's truth
 * instead of copying it — the duplication (and its drift) goes to zero.
 *
 * The documented merge order (enforced in graph/sources/merge.ts):
 *
 *   "Pages first (routes then hand-authored, hand-authored wins), journeys
 *    overlay second and may only add, live actions attach last and only bind —
 *    nothing later in the order may remove anything earlier. Routes may also
 *    contribute link tools; hand-authored tools win."
 *
 * This module is types only (erased at build). Static sources (routes,
 * journeys) contribute at BUILD time; the live source contributes at ATTACH
 * time — createSession attaches it to each new session, exactly where the
 * order sentence reserved its place (last, bind-only).
 */
import type { ReportGapOptions } from '../../atom/types.js';
import type { JourneyDef, PageNodeDef } from '../../tree/types.js';
// Type-only imports from the session layer (erased at build): a source module
// or a consumer importing these types never drags session machinery.
import type { RegisteredToolDef, RegisterToolGroupOptions, ToolGroupHandle } from '../../traverse/nav-session.js';

/**
 * A route table read as pages — the spine. `PageIds` carries the page names
 * through `const` inference so a source-contributed page is a REAL typed node
 * path on the compiled graph (registerToolGroup/show/setVisible accept it;
 * a typo stays a compile error).
 */
export interface RoutesSource<PageIds extends string = string> {
  readonly kind: 'routes';
  readonly pages: Record<PageIds, PageNodeDef>;
  /**
   * The crossLinks REQUEST this table was read with — `true` (every page whose
   * route is fully literal) or the named subset. Snapshot DATA, not tools: the
   * factory sees one route table, while the link's `on` list is "every page in
   * the effective graph except the target". Only mergeSources knows that set,
   * so it is the one place the request materialises.
   */
  readonly crossLinks?: true | readonly PageIds[];
}

/** A journey list read as skills — overlaid on the spine; may only add. */
export interface JourneysSource {
  readonly kind: 'journeys';
  readonly skills: Record<string, JourneyDef>;
}

/**
 * A runtime source: the app's live action store, attached per session. It
 * contributes NOTHING at build (last in the merge order, bind-only — it can
 * never remove or reshape what the static sources laid down); createSession
 * calls `attach` on each new session, and `detachSources()` (or the returned
 * detach) releases everything it registered.
 */
export interface LiveSource {
  readonly kind: 'live';
  /**
   * Wire the store's actions onto a session; returns detach (idempotent).
   * `warn` is the session's dev-warning sink (createSession passes it) so a
   * post-attach reconcile failure can be reported WITHOUT throwing inside the
   * app's own store-notify loop; a source without one falls back to the
   * console. Optional and additive: a one-parameter implementation still
   * satisfies this shape.
   */
  attach(session: LiveBindingPort, warn?: (message: string) => void): () => void;
}

/** Everything `def.sources` accepts. */
export type GraphSource = RoutesSource | JourneysSource | LiveSource;

/**
 * One action a live store publishes: WHERE it lives (node, plus instance for a
 * repeats card), WHAT it is (the RegisteredToolDef vocabulary mounts already
 * speak — does/handler/when/writes/goTo/…), and whether it is currently
 * clickable. `${node}.${name}` (+instance) is the action's IDENTITY across
 * snapshots — same key means same action.
 */
export interface LiveAction extends RegisteredToolDef {
  /** Node path the action lives on (a page or declared container). */
  node: string;
  /** Leaf tool name (same segment law as every authored name). */
  name: string;
  /** Instance key when the action belongs to one card of a repeats container. */
  instance?: string;
  /** False = on screen but greyed out (flows to TOOL_DISABLED). Default true. */
  enabled?: boolean;
  /**
   * The store's own label for "this one is working right now" ('Saving…') — the
   * served row's `busy`, on the wire your app already has. Absent says NOTHING
   * about the control, never "idle", and there is no boolean form.
   */
  busy?: string;
}

/**
 * The smallest respectable store contract — subscribe + read-current, the
 * shape React itself blesses (useSyncExternalStore). Any app store that can
 * say "here are my actions now" and "something changed" satisfies it.
 */
export interface LiveActionStore {
  subscribe(onChange: () => void): () => void;
  actions(): LiveAction[];
}

/**
 * What a live source needs from a session — structural and type-only, so
 * fromLiveStore stays a zero-value-import leaf. InteractionSession satisfies
 * it as-is: the declare-then-bind wire (registerToolGroup) plus the visibility
 * wire (show/setVisible) an app may drive after its own handler flips tabs.
 */
export interface LiveBindingPort {
  registerToolGroup(path: string, opts?: RegisterToolGroupOptions): ToolGroupHandle;
  show(path: string): void;
  setVisible(path: string, visible: boolean): void;
  /**
   * Run something each time the app REPORTS that it is on a different page —
   * the INVALIDATION half of the contract, and the half an app cannot supply.
   *
   * Your store must emit whenever the action surface changes; NAVIGATION is
   * covered by this re-read, because a store whose actions are derived from the
   * router has no change of its own to announce when the page changes. It fires
   * on an observed page change (`sync()`), never on a navigation the app merely
   * CLAIMED — reading a store at that moment describes the page the app has not
   * left yet. A source that does not subscribe (or a port that does not offer
   * this) keeps exactly today's behaviour: store emissions and nothing else.
   *
   * Optional and severable — a hand-rolled port without it degrades rather than
   * breaks. InteractionSession satisfies it as-is.
   */
  whenPageChanges?(listener: () => void): () => void;
  /**
   * File a row in the session's gap ledger — the AGENT-VISIBLE half of a dev
   * warning. A live source uses it for one thing: saying out loud that a read
   * failed and the bindings being served are from before the failure. A warning
   * alone reaches the developer's console and nothing else, so the surface
   * would still be served as current fact.
   *
   * AGENT-VISIBLE is earned by the mark, not by the row: a read-failure report
   * passes {@link ReportGapOptions.actionsMayBeStale}, which is what puts an
   * authored line in the facts block. Without it the row reaches the app's
   * triage ledger only.
   *
   * Optional and severable, like the hook above; InteractionSession satisfies it
   * as-is. Not a general side channel — a source that files anything else is
   * writing into a ledger whose whole meaning is unmet demand.
   */
  reportGap?(opts: ReportGapOptions): unknown;
}
