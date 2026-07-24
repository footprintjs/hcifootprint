/**
 * hcifootprint — the domain atom and its supporting types.
 *
 * The atom (adjudicated against 8 real-world UI pattern families before any
 * code was written — see the project's RESEARCH_STATE, hypothesis H1'):
 *
 *   Affordance  = binding × guard × effect × schema     (the static capability)
 *   Transition  = cause × payload × outcome             (each occurrence)
 *
 * Design commitments this file encodes:
 * - `guard` is a serializable footprintjs WhereFilter, evaluated OUTSIDE any
 *   engine run by the pure `evaluateFilter` — it filters what is OFFERED
 *   (footprint's decide() chooses one branch; hcifootprint's available()
 *   exposes every passing edge and waits for the world to pick).
 * - `effect` is a CLAIM about the app's handler, not a truth. Every settled
 *   transition carries `effectVerified` — the honesty-marker pattern
 *   footprintjs uses for untracked reads, applied to writes.
 * - `cause` replaces a bare user/agent enum: system-initiated motion
 *   (redirects, server pushes, timeouts) is recorded first-class as a
 *   `stimulus`, never silently patched over.
 * - Provenance is accountability for COOPERATING agents, not a security
 *   boundary. An uncooperative driver is indistinguishable from a human at
 *   the DOM; enforcement belongs server-side.
 */
import type { WhereFilter } from 'footprintjs';
import type { FilterCondition } from 'footprintjs/advanced';

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/** Who initiated a transition. Open beyond user/agent by design. */
export type Principal = 'user' | 'agent' | 'system' | 'unknown';

/** What kind of world-initiated motion a stimulus transition records. */
export type StimulusKind = 'navigation' | 'timeout' | 'push' | 'structure-swap' | 'unknown';

/**
 * Why a transition exists.
 * - `fired`   — an affordance was fired through the driver (guard-checked).
 * - `stimulus`— the world moved without an offered edge (back button, server
 *               push, session expiry). Recorded, never silent.
 */
export interface Cause {
  kind: 'fired' | 'stimulus';
  principal: Principal;
  /** Set when kind === 'fired'. */
  affordanceId?: string;
  /** Set when kind === 'stimulus'. */
  stimulus?: StimulusKind;
  /**
   * True when the attribution was GUESSED by effect-signature inference (an
   * unattributed delta matched exactly one registered affordance's declared
   * writes) rather than observed. Honesty marker — never laundered as fact.
   */
  inferred?: boolean;
}

/**
 * Settlement of a transition's declared effect.
 * fire() → 'pending' when the affordance declares writes; the app reports the
 * real state delta via updateState() which settles to 'committed'. Async and
 * optimistic UI reject/rollback/supersede instead of lying in the record.
 */
export type Settlement = 'pending' | 'committed' | 'rejected' | 'rolled-back' | 'superseded';

// ---------------------------------------------------------------------------
// Binding — the ONLY layer that knows how to reach the app's surface
// ---------------------------------------------------------------------------

/** ARIA-first element locator: role + accessible name, never CSS classes. */
export interface ElementLocator {
  role: string;
  name: string;
}

export type Actuation = 'click' | 'type' | 'select' | 'hover' | 'drag' | 'press';

/**
 * Activation descriptor. Generalized past "element selector" because keyboard
 * shortcuts have no element and canvas surfaces have no ARIA — those bind via
 * `keychord` and `programmatic` (the component publishes its own affordance).
 */
export type Binding =
  | { kind: 'element'; locator: ElementLocator; actuation?: Actuation }
  | { kind: 'keychord'; chord: string }
  | { kind: 'programmatic'; provider: string };

// ---------------------------------------------------------------------------
// Effect — a checkable claim, never a truth
// ---------------------------------------------------------------------------

export interface Effect {
  /** State keys this affordance claims to change. Verified at settlement. */
  writes?: string[];
  /** Page this affordance claims to move to. Reconciled by sync(). */
  navigatesTo?: string;
}

// ---------------------------------------------------------------------------
// Authoring definitions (what skillGraph() accepts)
// ---------------------------------------------------------------------------

/** Derived when omitted: effect.navigatesTo → 'next', otherwise 'action'. */
export type CanonicalRole =
  | 'next'
  | 'prev'
  | 'submit'
  | 'cancel'
  | 'back'
  | 'open'
  | 'close'
  | 'action';

export interface PageDef {
  route?: string;
  description?: string;
}

export interface AffordanceDef {
  /** Page id(s) where this affordance is offered. */
  on: string | string[];
  /**
   * AUTHORED planner-facing text — the only string class ever served to an
   * LLM as instruction/description. Runtime-resolved strings (labels, user
   * content) are data, never description (prompt-injection firewall).
   */
  description: string;
  binding: Binding;
  /**
   * Serializable availability predicate over projected state. Omit for an
   * always-offered affordance — `{}` is rejected at build() because
   * footprint's evaluator deliberately never matches an empty filter.
   */
  guard?: WhereFilter;
  effect?: Effect;
  /** Payload contract: Zod, JSON Schema, or any .safeParse/.parse validator. */
  schema?: unknown;
  /** Marks edges that need server-side step-up/confirmation. Advisory client-side. */
  highEffect?: boolean;
  role?: CanonicalRole;
}

export interface SkillDef {
  /** AUTHORED planner-facing text (same string class as affordance descriptions). */
  description: string;
  /** Affordance ids, in canonical order. v0: linear; step-DAG is roadmap. */
  steps: string[];
  precondition?: WhereFilter;
}

// ---------------------------------------------------------------------------
// Compiled graph (build() output — plain frozen data, worker-transferable)
// ---------------------------------------------------------------------------

export interface Page extends PageDef {
  id: string;
}

export interface Affordance {
  id: string;
  on: string[];
  description: string;
  /**
   * Optional since D18: a spine tool may exist with only its description
   * (plannable/tour-able) and gain a binding or handler at mount time.
   * The v1 fluent builder still requires it at authoring.
   */
  binding?: Binding;
  guard?: WhereFilter;
  effect?: Effect;
  schema?: unknown;
  highEffect: boolean;
  role: CanonicalRole;
  /**
   * Where the planner-facing description came from. Both classes are
   * developer-AUTHORED source-code literals (the firewall holds either way);
   * the marker keeps the origin auditable. Default 'declared'.
   */
  descriptionSource?: 'declared' | 'registration';
}

/**
 * How much evidence backs "this node is active" for a served edge (D18).
 * 'synced'     — the router confirmed this page (page-level tools).
 * 'assumed'    — declared subtree of the routed page, nothing registered there.
 * 'registered' — a live mount handle exists on the node.
 * 'shown'      — an explicit visibility signal says it is visible.
 * 'hidden'     — an explicit visibility signal says it is NOT visible.
 */
export type ActivationLevel = 'synced' | 'assumed' | 'registered' | 'shown' | 'hidden';

export interface Skill extends SkillDef {
  id: string;
}

export interface SkillGraphSpec {
  id: string;
  description?: string;
  pages: Record<string, Page>;
  affordances: Record<string, Affordance>;
  skills: Record<string, Skill>;
}

// ---------------------------------------------------------------------------
// Traversal (session) types
// ---------------------------------------------------------------------------

export interface SessionOptions {
  /** Starting page id. */
  node: string;
  /** Initial projected state (the lean snapshot guards read — not the whole app). */
  state?: Record<string, unknown>;
  /**
   * Whether this session receives updateState() reports (a router/store tap).
   * Default: true when `state` was provided, false otherwise. Without a tap,
   * declared-writes fires settle on handler completion (or immediately when
   * nothing executes) with effectVerified 'unobservable' — instead of staying
   * pending forever (the D18 rung-killer fix).
   */
  stateTap?: boolean;
  /** Keys stored as 'REDACTED' in the commit log while live state keeps raw values. */
  redactedKeys?: string[];
  /** Commit-log value encoding (footprintjs dial). Default 'delta'. */
  commitValues?: 'full' | 'delta';
  /** Dev-warning sink (StrictMode re-registrations, handler errors). Default console.warn. */
  onWarn?: (message: string) => void;
  /**
   * Capture each handler's RETURN value onto its transition (sanitized+capped)
   * as the "act → get data back" channel — TransitionRecord.produced. Default
   * true. Set false to opt a session out entirely (handlers whose returns are
   * internal and should never reach the agent).
   */
  captureProduced?: boolean;
}

// ---------------------------------------------------------------------------
// Events — a PASSIVE observer surface (the footprintjs recorder category, at
// the session's grain). Listeners are notified after the fact; they never
// change what the session does, and a throwing listener is isolated (caught +
// warned), never aborting the session. This is telemetry/reaction, NOT logic.
// ---------------------------------------------------------------------------

export interface SessionEvents {
  /** A new or newly-settled occurrence (a snapshot of the record). */
  transition: TransitionRecord;
  /** A committed state delta landed (the `state` version moved). */
  state: { version: number; stateVersion: number };
  /** The served tool-surface changed — frame open/close, or a mount/enable flip. */
  structure: { version: number; structureVersion: number };
  /** A new unmet-demand row was recorded (a deep copy). */
  gap: GapRecord;
  /** A confirm-journal row landed — an ask, an approval, or a decline (a deep copy). */
  confirm: ConfirmRecord;
}

export type SessionEventName = keyof SessionEvents;

/**
 * The handle returned by registerToolGroup — the group's IDENTITY. You never
 * name a group with a string (two components would collide and you'd have to
 * invent unique names); registration hands you this handle and you act through
 * it. `id` is a generated opaque token, exposed only for telemetry/warnings.
 */
export interface ToolGroup {
  /** Generated identity of this registration (for telemetry/debug — not caller-supplied). */
  readonly id: string;
  /** The node path this group is registered on (tree API); undefined for the flat API. */
  readonly node?: string;
  /** Grey out / re-enable one tool in this group (a disabled button). */
  setEnabled(toolId: string, enabled: boolean): void;
  /** Remove this group's registrations (call on unmount). Idempotent. */
  unregister(): void;
}

/** The handle returned by registerTool — a single-tool ToolGroup. */
export interface ToolHandle {
  readonly id: string;
  readonly node?: string;
  readonly toolId: string;
  /** Grey out / re-enable this tool. */
  setEnabled(enabled: boolean): void;
  unregister(): void;
}

/**
 * One occurrence: a row in the interaction log. SETTLED (and stimulus/sync)
 * transitions join 1:1 to a CommitBundle by `id`; pending and
 * rejected/rolled-back rows exist only here — that asymmetry is deliberate
 * (a rejected effect never touched state, so it has no commit).
 */
export interface TransitionRecord {
  /** runtimeStageId — the join key into the footprintjs commit log. */
  id: string;
  cause: Cause;
  /** Epoch milliseconds when the transition was created. */
  timestamp: number;
  payload?: unknown;
  outcome: Settlement;
  /**
   * Whether every DECLARED write key was present in the settled delta.
   * 'unobservable' when the affordance declared no writes. This checks key
   * presence only — not values, extra writes, or navigation claims.
   */
  effectVerified?: boolean | 'unobservable';
  /** Guard evidence captured at fire time (why this edge was passable). */
  evidence?: FilterCondition[];
  fromNode: string;
  toNode?: string;
  /**
   * True when toNode came from the affordance's declared navigatesTo — a
   * CLAIM about the app, not an observation. sync() records observations.
   */
  toNodeClaimed?: boolean;
  /**
   * True on sync()-recorded hops: the cursor moved without passing any guard.
   * Backward slices must treat the hop as inferred, not authorized.
   */
  unverifiedEdge?: boolean;
  /**
   * Guard keys that could NOT be evaluated at fire time because the session's
   * state view never contained them (L0/L1 — no state tap for those keys).
   * The fire proceeded — the app remains the enforcer — but the record says
   * honestly which conditions were taken on faith (D18 rung-killer fix).
   */
  guardUnevaluated?: string[];
  /**
   * Data the fired handler RETURNED (search results, a looked-up record) —
   * sanitized + capped. This is the "act → get data back" channel: an action
   * that produces something the agent needs to pick from (a list of ids to
   * open next) hands it back here. It rides the DATA channel, so untrusted
   * content (user-generated names) is safe — it is never planner instructions.
   * Populated once the handler resolves (await the settlement to read it).
   */
  produced?: unknown;
  /** Cursor version when the transition was created. */
  cursorVersion: number;
  /**
   * Set when this fire was authorized by a high-effect confirm ask — the
   * {@link ConfirmRecord} `askId` it closes. Makes the ask → decision → fire
   * chain auditable from the transition log alone (a committed high-effect
   * action can be traced back to the receipts a human approved). Absent on a
   * fire that never went through a confirm gate (e.g. a low-effect action, or
   * a human clicking the button directly with no ask outstanding).
   */
  askId?: string;
}

export interface AvailableEdge {
  affordanceId: string;
  description: string;
  role: CanonicalRole;
  /**
   * Present only when the session has live registrations: true = a handler is
   * mounted right now (fireable-with-execution), false = declared here but
   * nothing registered it (plannable; firing records but nothing executes —
   * on the current page this doubles as live binding-drift telemetry).
   */
  materialized?: boolean;
  /** Per-condition guard evidence (key/op/threshold/actual) — why it is passable. */
  evidence: FilterCondition[];
  /**
   * Guard keys absent from the session's state view (or holding undefined —
   * a value guard like `ne ''` would match undefined, so an unset value is
   * unevaluable, not passable) — the edge is served anyway, WITH this
   * marker, instead of being silently hidden (D18 fix).
   */
  guardUnevaluated?: string[];
  schema?: unknown;
  highEffect: boolean;
  binding?: Binding;
  /** See Affordance.descriptionSource. */
  descriptionSource?: 'declared' | 'registration';
  // --- D18 tree stamps (NavSession only) ---------------------------------
  /** Owning node path in the navigation tree (e.g. 'catalog.filter-rail'). */
  node?: string;
  /** Evidence level behind "this node is active" (see ActivationLevel). */
  activation?: ActivationLevel;
  /**
   * 'unknown' when several exclusive-tab siblings are mounted and no
   * visibility wire exists — a flagged union, never a guessed winner.
   */
  presence?: 'unknown';
  /**
   * False when the registration site said the control is currently DISABLED
   * (a grey button: on screen, not clickable). Served honestly with the
   * marker — like a human seeing it — and firing it is a typed TOOL_DISABLED
   * rejection. Set via ToolGroup.setEnabled / the `enabled` registration field.
   */
  enabled?: boolean;
  /** Live instance keys for a repeats-container tool (runtime DATA, never schema). */
  instances?: string[];
  /**
   * Where `instances` came from: 'selector' = the declared existence source
   * (complete), 'mounted-window' = only what is mounted right now (partial —
   * stated, not silently presented as complete).
   */
  enumeration?: 'selector' | 'mounted-window';
}

export interface AvailableSlice {
  version: number;
  node: string;
  edges: AvailableEdge[];
}

export interface AvailableSkill {
  id: string;
  description: string;
  steps: string[];
  preconditionPassed: boolean;
  evidence: FilterCondition[];
  /** Precondition keys absent from the state view — feasibility unknown, said so. */
  preconditionUnevaluable?: string[];
  /** Whether the skill's first step is available right now (on-node + guard). */
  entryAvailable: boolean;
}

export interface Explanation {
  affordanceId: string;
  node: string;
  offeredOnThisNode: boolean;
  guardPassed: boolean;
  available: boolean;
  evidence: FilterCondition[];
  /** Guard keys that could not be evaluated (absent from the state view, or holding undefined). */
  guardUnevaluated?: string[];
}

export interface FireOptions {
  source: Principal;
  /**
   * Optimistic-concurrency token from available().version. If supplied and
   * stale, fire() rejects with STALE_CURSOR — the agent must replan on a
   * fresh slice. Guards are ALSO re-evaluated at fire time regardless.
   */
  expectedVersion?: number;
  payload?: unknown;
  /** Instance key for a tool on a repeats container (e.g. an order-card id). */
  instance?: string;
  /**
   * Invoke the registered handler (default true when one exists). The DOM
   * sensor passes false: the browser already runs the app's own onClick, so
   * the sensor's fire() is record-only.
   */
  invoke?: boolean;
}

export type FireResult =
  | { ok: true; transition: TransitionRecord; version: number; settlement: 'settled' | 'awaiting-state' }
  | { ok: false; reason: 'UNKNOWN_AFFORDANCE'; available: string[] }
  | { ok: false; reason: 'STALE_CURSOR'; version: number }
  | { ok: false; reason: 'NOT_ON_NODE'; node: string }
  | { ok: false; reason: 'GUARD_FAILED'; evidence: FilterCondition[] }
  | { ok: false; reason: 'PAYLOAD_INVALID'; issues: string }
  // --- D18 tree rejections (NavSession) — all typed, all gap-ledger rows ---
  /** A shown blocking modal masks this tool's node. Close the modal first. */
  | { ok: false; reason: 'BLOCKED_BY_OVERLAY'; overlay: string }
  /** The tool's node carries an explicit not-visible signal (hidden tab, closed modal). */
  | { ok: false; reason: 'NODE_NOT_VISIBLE'; node: string }
  /** RETRIABLE: the node's mounts have not arrived yet (mid-navigation / deep link). */
  | { ok: false; reason: 'STILL_MOUNTING'; node: string }
  | { ok: false; reason: 'INSTANCE_REQUIRED'; instances: string[] }
  | { ok: false; reason: 'INSTANCE_UNKNOWN'; instances: string[] }
  /** RETRIABLE: the control is registered but currently greyed out (disabled). */
  | { ok: false; reason: 'TOOL_DISABLED'; affordanceId: string };

export interface UpdateOptions {
  /** Settle THIS pending transition (precise attribution — preferred over FIFO). */
  transitionId?: string;
  /**
   * Mark the delta as world-initiated. When set, the delta is NEVER
   * attributed to a pending fired transition — explicit attribution wins.
   */
  stimulus?: StimulusKind;
  principal?: Principal;
}

export type UpdateResult =
  | { ok: true; attributed: boolean; transition: TransitionRecord; version: number }
  | { ok: false; reason: 'UNCLONEABLE_DELTA'; issues: string }
  | { ok: false; reason: 'UNKNOWN_TRANSITION'; pending: string[] };

export type SyncResult =
  | { changed: false; node: string; version: number }
  | {
      changed: true;
      transition: TransitionRecord;
      node: string;
      version: number;
      /**
       * True when the observed node is not an authored page. The cursor
       * follows reality anyway (available() honestly serves zero edges there)
       * — external motion is recorded, never dropped.
       */
      offGraph?: boolean;
    };

/** A fired transition still awaiting its state report. */
export interface PendingInfo {
  id: string;
  affordanceId: string;
  firedAt: number;
}

// ---------------------------------------------------------------------------
// Gap ledger — unmet demand (what was asked for that nothing could serve)
// ---------------------------------------------------------------------------

export type GapReason =
  | 'no-skill-matched'
  | 'guard-blocked'
  | 'needs-backend-data'
  /** Sensor-health drift: e.g. a registration outside the router-confirmed page persisted past the grace window. */
  | 'sensor-drift'
  | 'other';

/**
 * One row of unmet demand. Two kinds:
 * - 'fire-rejected' — an attempted action the session refused (unknown id,
 *   failed guard, wrong page, stale plan, bad payload). Recorded automatically.
 * - 'reported'      — an ask no available action or skill could serve,
 *   reported explicitly (typically by the agent's report_gap tool).
 *
 * Rows are deliberately TOKEN-LEAN and structured — the ask plus NAME lists,
 * never descriptions or transcripts — so a consumer's batch triage LLM can
 * cluster thousands of them cheaply to discover which skills/tools to build
 * next. `request` is runtime data (user text): export it as data, never feed
 * it to a planner as instructions.
 *
 * Triage notes: rows with rejectionReason 'STALE_CURSOR' are usually
 * optimistic-concurrency retries that SUCCEEDED on replan — filter or
 * down-weight them; they are cursor-protocol events, not missing capability.
 * `availableActions` lists full capability at that position (not narrowed by
 * any open skill frame). The ledger grows unbounded for the session's life —
 * export via onGap and drain, like the transition log.
 */
export interface GapRecord {
  kind: 'fire-rejected' | 'reported';
  timestamp: number;
  node: string;
  version: number;
  /** Names only — what existed at that moment (token-lean, injection-safe). */
  availableActions: string[];
  availableSkills: string[];
  // fire-rejected rows:
  /** The id the caller ASKED for — kept even when unknown (that is the signal). */
  affordanceId?: string;
  rejectionReason?:
    | 'UNKNOWN_AFFORDANCE'
    | 'STALE_CURSOR'
    | 'NOT_ON_NODE'
    | 'GUARD_FAILED'
    | 'PAYLOAD_INVALID'
    | 'BLOCKED_BY_OVERLAY'
    | 'NODE_NOT_VISIBLE'
    | 'STILL_MOUNTING'
    | 'INSTANCE_REQUIRED'
    | 'INSTANCE_UNKNOWN'
    | 'TOOL_DISABLED';
  principal?: Principal;
  evidence?: FilterCondition[];
  // reported rows:
  /** The user's ask (runtime data; length-capped). */
  request?: string;
  reason?: GapReason;
  note?: string;
}

export interface ReportGapOptions {
  /** The ask that could not be served (length-capped to stay token-lean). */
  request: string;
  reason?: GapReason;
  note?: string;
  principal?: Principal;
}

// ---------------------------------------------------------------------------
// Confirm journal — receipts on high-effect asks + the ask→decision→fire chain
// ---------------------------------------------------------------------------

/**
 * The plain-words "what firing will do" claim that leads a receipt: the
 * authored edge description plus its declared, honesty-tagged effect. `writes`
 * and `navigatesTo` are CLAIMS about the app's handler (verified at settlement
 * / reconciled by sync), never observed truths — the same honesty stance the
 * atom takes everywhere.
 */
export interface ConfirmWillDo {
  /** The authored affordance description (planner-facing string class). */
  does: string;
  /** State keys this edge CLAIMS to write (from effect.writes). Omitted when none. */
  writes?: string[];
  /** Page this edge CLAIMS to navigate to (from effect.navigatesTo). Omitted when none. */
  navigatesTo?: string;
  /**
   * True when the edge declares writes but the session has no state tap, so the
   * effect can never be verified (settlement would be effectVerified:
   * 'unobservable'). Stated up front so the human is not shown a claim the
   * library itself cannot check.
   */
  effectUnverifiable?: boolean;
}

/** One compact row of the run-so-far trail — authored/structural facts only. */
export interface ConfirmTrailStep {
  /** The affordance id (fired rows) or a `stimulus:<kind>` label — never runtime text. */
  what: string;
  /** Who did it. */
  principal: Principal;
  /** Its settlement outcome. */
  outcome: Settlement;
}

/**
 * The "receipts" that ride a needs-confirm ask: everything the library ALREADY
 * knows about a high-effect edge, assembled so the agent can SHOW the human
 * what they are approving — no new capture, no extra work.
 *
 * Field kinship with agentfootprint's checkIn evidence is deliberate
 * (`willDo` ≙ willDo, `because` ≙ read/drivers, `recentSteps` ≙ trail) so a
 * consumer wiring both libraries sees ONE mental model — but nothing is
 * imported across, and the substance differs on purpose: an AGENT's evidence
 * SCORES which context probably drove a guessed tool choice; a UI SESSION KNOWS
 * why an edge is fireable — the guard is the literal precondition — so
 * `because` is structural guard evidence, never a ranked guess.
 */
export interface ConfirmReceipts {
  /** What firing will do: authored words + declared, honesty-tagged effect. */
  willDo: ConfirmWillDo;
  /**
   * Why this edge is fireable right now — the guard conditions that passed,
   * one per condition (key/op/threshold/actual). Structural and KNOWN, not
   * scored. Empty for an unguarded (always-offered) edge.
   */
  because: FilterCondition[];
  /**
   * Guard keys taken on faith because the state view never held them — the
   * same honesty marker the edge itself carries. Present only when non-empty.
   */
  becauseUnevaluated?: string[];
  /** Where the human is, folded in so the receipt is a self-contained pack. */
  youAreOn: string;
  /** The cursor version the receipt was assembled at (a stale-plan check anchor). */
  version: number;
  /** A compact tail of the session's fire journal — the trail that led here. */
  recentSteps: ConfirmTrailStep[];
}

/**
 * One row of the confirm journal: the auditable trail of high-effect asks and
 * how they were answered. A needs-confirm ask lands an `'ask'` row (carrying
 * its receipts); the human's answer lands `'approved'` (the confirmed fire,
 * linked by `transitionId`) or `'declined'`. The three rows of one gate share
 * an `askId`.
 *
 * Kept SEPARATE from the gap ledger by design: a gated action is not unmet
 * demand — the capability exists, it awaited consent — so mixing the two would
 * poison the "what to build next" triage signal the gap ledger feeds. Rows are
 * token-lean and injection-safe (ids + structural facts; the only free text,
 * `note`, is length-capped, and `receipts` carries authored strings only).
 */
export interface ConfirmRecord {
  kind: 'ask' | 'approved' | 'declined';
  /** Links the ask → decision → fire rows of one high-effect gate. */
  askId: string;
  affordanceId: string;
  /** Epoch milliseconds when the row was recorded. */
  timestamp: number;
  node: string;
  version: number;
  /** Who asked ('ask'), or the principal that recorded the decision. */
  principal: Principal;
  // 'ask' rows -------------------------------------------------------------
  /** The receipts that rode this ask (present on 'ask' rows). */
  receipts?: ConfirmReceipts;
  // 'approved' rows --------------------------------------------------------
  /** The TransitionRecord.id of the fire this approval authorized. */
  transitionId?: string;
  // 'approved' / 'declined' rows -------------------------------------------
  /** Who answered — an operator id, an email, your host's label. Optional. */
  by?: string;
  /** Free-text note (length-capped). On a decline, typically why. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Skill frames — on-demand disclosure (serve skills; expand tools on commit)
// ---------------------------------------------------------------------------

export type StepStatus = 'done' | 'inferred-done' | 'ready' | 'blocked' | 'off-node';

/** B depends on A when A's declared writes overlap B's guard keys — DERIVED, never authored. */
export interface DependencyEdge {
  affordanceId: string;
  viaKeys: string[];
}

export interface SkillPlanStep {
  affordanceId: string;
  description: string;
  /**
   * 'done' = committed while the current frame was open; 'blocked' = guard
   * fails (see blockedOn); 'ready' = fireable here and now; 'off-node' =
   * guard passes but the step lives on another page (navigate first).
   */
  status: StepStatus;
  dependsOn: DependencyEdge[];
  onNodes: string[];
  blockedOn?: FilterCondition[];
  /** Guard keys absent from the state view — the step shows 'ready', taken on faith. */
  guardUnevaluated?: string[];
}

/** The derived intra-skill dependency DAG with live status. */
export interface SkillPlan {
  skillId: string;
  description: string;
  steps: SkillPlanStep[];
}

export type FrameStatus = 'open' | 'completed' | 'cancelled' | 'demoted';

/** One committed pass at a skill. 'demoted' = the skill's precondition broke mid-flow. */
export interface SkillFrame {
  skillId: string;
  status: FrameStatus;
  principal: Principal;
  openedAt: number;
  openedAtVersion: number;
  /** Steps committed while this frame was open (observed fires). */
  firedSteps: string[];
  /**
   * Steps attributed by effect-signature INFERENCE while this frame was open
   * — guesses, kept separate from observed fires. skillPlan shows them as
   * 'inferred-done' so an agent re-executes only as a visible choice.
   */
  inferredSteps: string[];
  closedAtVersion?: number;
}

export type CommitSkillResult =
  | { ok: true; frame: SkillFrame; plan: SkillPlan; version: number }
  | { ok: false; reason: 'UNKNOWN_SKILL'; known: string[] }
  | { ok: false; reason: 'STALE_CURSOR'; version: number }
  | { ok: false; reason: 'PRECONDITION_FAILED'; evidence: FilterCondition[] }
  | { ok: false; reason: 'FRAME_ALREADY_OPEN'; skillId: string };

// ---------------------------------------------------------------------------
// Context brief — the traverse-path delta served to the LLM each chat turn
// ---------------------------------------------------------------------------

export interface ContextBriefOptions {
  /** Only include transitions created at or after this cursor version (the "since your last turn" cursor). */
  sinceVersion?: number;
  /** Cap on rendered transitions (default 20); older ones collapse into an omitted count. */
  maxTransitions?: number;
}

/**
 * Token-lean, prompt-ready session context. `text` is built from AUTHORED
 * strings and structural facts only — state values and payloads never enter
 * it (the two-string-class invariant extends to history).
 */
export interface ContextBrief {
  node: string;
  version: number;
  frame: SkillFrame | null;
  text: string;
}
