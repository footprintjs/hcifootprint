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
 * With `url` and `tab` the set covers the four gestures a routed web app
 * actually performs: url | click (element) | tab | programmatic.
 */
export type Binding =
  | { kind: 'element'; locator: ElementLocator; actuation?: Actuation }
  | { kind: 'keychord'; chord: string }
  | { kind: 'programmatic'; provider: string }
  /**
   * A literal address the app's OWN router can be handed (see
   * `SessionOptions.navigate`). `href` must be FULLY literal — a ':param'
   * segment is refused loudly at authoring, because the library never guesses
   * params: an address either exists as bytes or the gesture does not exist.
   */
  | { kind: 'url'; href: string }
  /**
   * A tab switch to a sibling node path. Its own gesture, DESCRIPTIVE in v1:
   * it materialises only via a registered handler, and it NEVER moves the page
   * cursor — flipping a tab does not change the page you are on. After the
   * app's handler flips tabs, the existing visibility wire (show/setVisible)
   * reports the result; fire() itself never writes the PresenceIndex.
   */
  | { kind: 'tab'; target: string };

// ---------------------------------------------------------------------------
// Effect — a checkable claim, never a truth
// ---------------------------------------------------------------------------

export interface Effect {
  /** State keys this affordance claims to change. Verified at settlement. */
  writes?: string[];
  /** Page this affordance claims to move to. Reconciled by sync(). */
  navigatesTo?: string;
}

/**
 * The app's OWN check that an action actually happened — declared once, next to
 * the action, and evaluated at settlement.
 *
 * The library can observe that a handler ran to completion; it cannot observe
 * that a radio got selected or that the button it clicked was live. Reported
 * from the field: a fire returned `effectStatus: 'performed'` while nothing had
 * been selected, and the agent looped — correctly, on what it was told. This is
 * the one line that closes that gap.
 *
 * Two forms, one meaning ("this must hold once the action has settled"):
 * - a serializable `WhereFilter` over projected state — evaluated by the
 *   same evaluator (and the same honesty split) as every guard;
 * - a synchronous predicate handed a DETACHED state snapshot, whose closure may
 *   read whatever the app itself can see, the DOM included.
 *
 * A contract that does not hold turns the settlement's `effectStatus` into
 * 'refused' (an existing word — nothing was renamed). A contract that cannot be
 * evaluated — an unknown state key, a predicate that threw — never refuses:
 * a wrong rejection blocks an action the app would have accepted, and the
 * caller has no appeal.
 */
export type VerifyContract = WhereFilter | ((state: Record<string, unknown>) => boolean);

/**
 * Why a settlement said 'refused' when the app's own verify contract found
 * nothing had happened. Rides {@link FireSettlement.error} — the same field a
 * thrown handler's error rides, because to a caller both mean "the app did not
 * do the thing", and one branch should read both.
 */
export interface VerifyFailure {
  reason: 'VERIFY_FAILED';
  /** An authored constant naming the contract — safe to show a model verbatim. */
  explanation: string;
  /**
   * The conditions that did NOT hold (declarative form only). Absent for a
   * predicate: it answers yes or no and hands over no conditions, so naming one
   * would be a guess about code the library cannot see.
   */
  evidence?: FilterCondition[];
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
  /**
   * Payload contract: Zod, JSON Schema, any `.safeParse`/`.parse` validator —
   * or the literal `'none'`, the author's explicit "this action takes NO
   * input". OMITTING it is a different statement: absence means the library
   * does not know the shape, so it never guesses one.
   */
  schema?: unknown;
  /** The app's own post-settlement check that the action really happened. */
  verify?: VerifyContract;
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
  /**
   * True when the author declared `'none'`: this action takes NO input, and a
   * caller sending one is refused. Compiled as a FLAG with `schema` left
   * undefined — deliberately not a synthetic empty schema, so every surface
   * that branches on "no schema declared" (MCP's no-params arm, the fire-time
   * shape gate) stays byte-identical to what it was.
   */
  noInput?: true;
  /** The app's own post-settlement check that this action really happened. */
  verify?: VerifyContract;
  /**
   * Declarative DISABLEDNESS — distinct from `guard`, which decides whether the
   * edge exists here at all. A failed guard HIDES the edge; a false
   * `enabledWhen` SERVES it carrying `enabled: false` (a greyed button an agent
   * can see) and refuses an execution fire as TOOL_DISABLED. Authored via
   * `ToolDef.enabledWhen`, ideally from the same expression that renders
   * `<button disabled={…}>`. Keys it cannot evaluate never disable anything:
   * the library does not guess a control greyed out.
   */
  enabledWhen?: WhereFilter;
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
  /**
   * Let AGENT fires of declared-but-unbound tools proceed as honest no-ops
   * (executed: false, materialized: false on the result) instead of the
   * default NOT_MATERIALIZED rejection. For guide/tour/plan flows — the
   * Phase-0 rung walking the graph without touching the app. Navigation
   * claims still move the cursor (that is the tour); re-sync() before
   * trusting position. Default false (fail-closed).
   */
  allowUnmaterializedFires?: boolean;
  /**
   * Check a plain JSON-Schema declaration against the payload at fire time.
   * STRUCTURAL only — required keys, declared primitive types, closed objects —
   * and never a full JSON-Schema validator: anything it cannot judge it passes
   * (the name says exactly what it does, because claiming more would be a lie
   * a caller only discovers in production).
   *
   * Default true. Declaring a schema is already the author's opt-in signal, and
   * Mode B's published contract has always promised that "a wrong input returns
   * a structured error RESULT carrying what was expected" (serve/modes.ts) — a
   * promise a plain JSON Schema could not keep while nothing enforced it. Set
   * false for the 0.3.0 pass-through. Zod and other parseable validators run
   * either way; this flag governs only the plain-JSON-Schema branch.
   */
  checkPayloadShape?: boolean;
  /**
   * The caller's OWN router navigation (e.g. `(href) => router.push(href)`).
   * PRESENCE of this option is the opt-in: with it, an edge whose gesture
   * yields a literal href — an explicit `url` binding, else the fully-literal
   * route of the page it claims to navigate to — materialises through this
   * function, so a pure URL navigation no longer needs a fake do-nothing
   * handler to get past NOT_MATERIALIZED. Registered handlers still win, and
   * the synthesized navigation rides the SAME invocation machinery: resolve →
   * effectStatus 'performed'; throw → 'refused' with the honest rollback.
   * Without this option nothing changes — fail-closed, byte-identical.
   */
  navigate?: (href: string) => void | Promise<void>;
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
  /**
   * Present (false) only on an allowed unmaterialized fire (the
   * `allowUnmaterializedFires` tour): the fire invoked NOTHING — nothing was
   * bound to execute it — so every effect on this record is a claim, including
   * any navigation. The same honesty stance as `toNodeClaimed` and
   * `guardUnevaluated`: absence means normal, a stamped false means the
   * library is telling you what it could not do.
   */
  materialized?: false;
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
  /**
   * The LIVE validator, exactly as authored — an in-process convenience, and
   * the reason `expects` exists beside it. Absent when nothing was declared.
   */
  schema?: unknown;
  /**
   * What a caller must SEND, wire-shaped: zod normalized, a plain JSON Schema
   * detached, a non-serializable validator named in one authored sentence, and
   * the literal `'none'` for an action that takes no input. Absent means the
   * library does not know the shape — never "send nothing".
   *
   * Identical to what Mode B's results have always served as `expects`, from
   * one shared derivation, because a consumer reading available() directly was
   * otherwise made to re-derive library law (which kinds serialize, which
   * decline) by hand. The residual asymmetry is deliberate and stated: this
   * surface carries BOTH the live validator and the wire contract; a served
   * result carries only the wire contract. A live validator never crosses the
   * wire — that is the firewall.
   *
   * Shared and deep-frozen: one rendered contract reaches every caller, the
   * same stance `binding` takes above.
   */
  expects?: unknown;
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
   * False when the app says the control is currently DISABLED (a grey button:
   * on screen, not clickable). Served honestly with the marker — like a human
   * seeing it — and firing it is a typed TOOL_DISABLED rejection.
   *
   * FOUR wires land here, so an app can say it wherever it already knows it:
   * `enabled:` at registration, `handle.setEnabled(…)`, a live store's
   * `LiveAction.enabled`, and the declarative `ToolDef.enabledWhen`.
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
  /**
   * Who is acting. Required here on purpose — a typed caller should never
   * leave provenance to an assumption. It is only ever assumed for a caller
   * the types never reached (plain JS): an omitted source reads as 'agent',
   * the same assumption `commitSkill()` and `confirmAsk()` publish, never as
   * 'user' — a machine action must not enter the ledger as a human one.
   */
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

/**
 * What became of a fire's effect — the INVOCATION axis, deliberately separate
 * from `TransitionRecord.effectVerified` (the STATE axis: were the declared
 * writes actually observed?). The two disagree honestly all the time: a
 * handler can run to completion in a session with no state tap ('performed'
 * with effectVerified 'unobservable'), and a handler can fail AFTER its real
 * state report already landed ('refused' with effectVerified true). Both
 * truths are carried; neither is averaged into the other.
 *
 * - `pending`      — deferred, not yet decided. Only ever seen on the
 *                    synchronous FireResult: fire() returns before the handler
 *                    runs, so at that instant this is the honest answer.
 * - `performed`    — our side ran to completion, or the app's state report
 *                    settled the record.
 * - `refused`      — the handler threw, returned a failure, the app called
 *                    reject(), OR the action's declared `verify` contract found
 *                    that nothing happened. Four routes, one word: to a caller
 *                    they all mean "the app did not do the thing".
 * - `unobservable` — nothing was bound to run, or tracking stopped
 *                    ('superseded'). The library cannot know, so it says so
 *                    rather than guessing 'performed'.
 */
export type EffectStatus = 'pending' | 'performed' | 'refused' | 'unobservable';

/** The final truth about one fire, delivered once through `FireResult.whenSettled`. */
export interface FireSettlement {
  /** 'pending' is excluded by construction — a final answer is never "not yet". */
  effectStatus: Exclude<EffectStatus, 'pending'>;
  /** The record's outcome at the moment it came to rest. */
  outcome: Settlement;
  /** A snapshot — never the live record, which may keep moving afterwards. */
  transition: TransitionRecord;
  /**
   * Why it was refused, when a handler failure caused the refusal: the thrown
   * error, or the returned failure's `error` (else the returned object
   * itself) — or a {@link VerifyFailure} when the action's declared verify
   * contract is what refused it. Absent when the app itself declared the
   * refusal via reject() — there is no error object there and inventing one
   * would be a guess.
   */
  error?: unknown;
  /**
   * What the action's declared {@link VerifyContract} said, once the fire came
   * to rest: `true` it held, `false` it did not (and this settlement is
   * 'refused' because of it), `'unevaluable'` the check could not be run —
   * an unknown state key, or a predicate that threw. ABSENT when the action
   * declares no verify at all: silence, never a passing grade.
   *
   * A THIRD axis, and deliberately not folded into either of the other two:
   * `effectStatus` asks whether anyone performed it, `transition.effectVerified`
   * asks whether the declared write KEYS appeared, and this asks whether the
   * app's own condition holds. All three can disagree honestly.
   *
   * NAMED FOR THE DECLARATION THAT PRODUCED IT, not for the bare word
   * "verified" — which is the ambiguity that let two of these three axes share
   * one name on the wire and print opposite values in a single payload
   * (`verified: true` beside "the app was asked whether this happened, and
   * answered no"). A status a reader can attribute to the wrong question is a
   * status this library treats as unreported, so no axis here is called
   * `verified` alone: this one says which contract held, and the state axis
   * crosses the wire as `writesObserved`.
   */
  verifyHeld?: boolean | 'unevaluable';
  /** The handler's return value, sanitized (parity with `Session.producedFor()`). */
  produced?: unknown;
}

export type FireResult =
  | {
      ok: true;
      transition: TransitionRecord;
      version: number;
      settlement: 'settled' | 'awaiting-state';
      /**
       * Whether the app's side has run — the truth AT RETURN TIME. The handler
       * is always deferred, so this can never be 'performed' here: a fire with
       * something bound to run returns 'pending', and `whenSettled` carries the
       * answer. `settlement` answers a different question (does a commit bundle
       * exist yet?) — reading it as "the app did it" was the reported bug.
       */
      effectStatus: EffectStatus;
      /**
       * Resolves ONCE with what actually happened. NEVER rejects: a refusal
       * arrives as data (`effectStatus: 'refused'`), because most callers drop
       * this result unread and an orphaned rejecting promise would be noise
       * they never opted into.
       */
      whenSettled: Promise<FireSettlement>;
      /** Present (false) only on an allowed unmaterialized agent fire: nothing ran. */
      executed?: false;
      /** Present (false) only on an allowed unmaterialized agent fire: nothing is bound. */
      materialized?: false;
    }
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
  | { ok: false; reason: 'TOOL_DISABLED'; affordanceId: string }
  /** Declared but nothing is bound: an agent fire would execute NOTHING (register
   *  a tool group, or opt the session into read-only touring via
   *  allowUnmaterializedFires). The app-self-report tier (source 'user'/'system'
   *  or invoke:false) is never gated — that motion really happened. */
  | {
      ok: false;
      reason: 'NOT_MATERIALIZED';
      affordanceId: string;
      /**
       * The DECLARED gesture nothing is wired to perform — so the refusal says
       * "this is a click on the checkout button", not "nothing is bound".
       * Absent when the edge declared no binding (there the old words were
       * already the whole truth).
       */
      gesture?: Binding;
    };

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
 * One row of unmet demand. Four kinds:
 * - 'fire-rejected'      — an attempted action the session refused (unknown id,
 *   failed guard, wrong page, stale plan, bad payload). Recorded automatically.
 * - 'reported'           — an ask no available action or skill could serve,
 *   reported explicitly (typically by the agent's report_gap tool).
 * - 'unmaterialized-fire' — an ALLOWED no-op agent fire: the session runs with
 *   `allowUnmaterializedFires` (a guide/tour flow) and the tool it fired has no
 *   binding, so nothing executed. Nothing was refused and nobody reported it —
 *   it is the binding still to build. Tour rows are the demand backlog for
 *   Phase-1 wiring: cluster them to see which handlers agents keep reaching for.
 * - 'dead-end'           — THE PAGE-LEVEL NEVER-TRAP: the cursor came to rest
 *   on a page where NOTHING the graph puts there could act — no action at all,
 *   or none of them registered, url-materialisable or instance-wired. Nobody
 *   has to fire to earn this row: the trap is a property of the POSITION, and
 *   an agent that lands there will loop on a true-but-useless "here is what is
 *   available". Recorded as an observation, not a verdict — at most one row per
 *   (page, served structure), so a mount that fixes the page ends the rows and
 *   a page still dead after the next WIRING change is one NEW fact worth one
 *   new row. A guard-closed action does NOT earn a row: it is wired, its
 *   refusal is GUARD_FAILED, and the next state report may open it — the same
 *   retriable stance the gate takes on a registered-but-disabled action.
 *   `offGraph: true` marks the other shape of trap (see below).
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
  kind: 'fire-rejected' | 'reported' | 'unmaterialized-fire' | 'dead-end';
  timestamp: number;
  node: string;
  version: number;
  /**
   * Names only — what existed at that moment (token-lean, injection-safe).
   * On a 'dead-end' row this is the whole payload and the whole point: these
   * are the actions the page OFFERS while none of them can act.
   */
  availableActions: string[];
  availableSkills: string[];
  // dead-end rows:
  /**
   * The cursor is resting on a node the graph has never heard of — the same
   * fact {@link SyncResult}.offGraph reports, kept on the row so triage can
   * separate the two traps without re-deriving it. It is the PERMANENT one: no
   * mount can add a door to an unauthored page (registerToolGroup throws on an
   * unknown node), so it is recorded ONCE per node for the session's life
   * rather than re-asked on every structure change. Cure: author the page, or
   * sync() the id the graph actually uses for that screen.
   */
  offGraph?: true;
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
    | 'TOOL_DISABLED'
    | 'NOT_MATERIALIZED'
    /** commitSkill refused: the skill's ENTRY step could not materialise (never-trap gate). */
    | 'ENTRY_NOT_MATERIALIZED';
  principal?: Principal;
  evidence?: FilterCondition[];
  /**
   * The refused edge's declared gesture KIND ('fire-rejected' and
   * 'unmaterialized-fire' rows) — the demand backlog now says WHICH wiring is
   * missing (a click handler vs a navigate fn). Token-lean by design: the kind
   * string only, never the binding object.
   */
  gestureKind?: Binding['kind'];
  /**
   * The skill whose commit was refused (ENTRY_NOT_MATERIALIZED rows) —
   * `affordanceId` on those rows is the entry STEP; this names the skill the
   * planner actually asked for.
   */
  skillId?: string;
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

/**
 * trySkillPlan()'s answer: the plan, or the unknown-id refusal as a VALUE.
 *
 * Its failure arm is CommitSkillResult's UNKNOWN_SKILL arm, field for field —
 * same reason string, same `known` list. Two methods that answer the same
 * question ("is this a skill?") must not teach a caller two shapes for the
 * answer, or handling one of them is no preparation for the other.
 */
export type TrySkillPlanResult =
  | { ok: true; plan: SkillPlan }
  | { ok: false; reason: 'UNKNOWN_SKILL'; known: string[] };

export type CommitSkillResult =
  | { ok: true; frame: SkillFrame; plan: SkillPlan; version: number }
  | { ok: false; reason: 'UNKNOWN_SKILL'; known: string[] }
  | { ok: false; reason: 'STALE_CURSOR'; version: number }
  | { ok: false; reason: 'PRECONDITION_FAILED'; evidence: FilterCondition[] }
  | { ok: false; reason: 'FRAME_ALREADY_OPEN'; skillId: string }
  /**
   * The never-trap commit gate: the skill's ENTRY step would answer an agent
   * fire NOT_MATERIALIZED right now, so the frame that could never act is
   * never opened (an agent standing in a room where nothing it was promised
   * works is a planning trap, even with the leave-skill escape). Fires only
   * for agent commits outside a tour (allowUnmaterializedFires). `gesture`
   * carries the entry step's declared binding, when it has one — the refusal
   * names the wiring that is missing.
   */
  | { ok: false; reason: 'ENTRY_NOT_MATERIALIZED'; affordanceId: string; gesture?: Binding };

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

// ---------------------------------------------------------------------------
// Ground truth — the authoritative FACTS block (what HAPPENED, nothing else)
// ---------------------------------------------------------------------------

export interface GroundTruthOptions {
  /** Only include attempts made at or after this cursor version ("since your last turn"). */
  sinceVersion?: number;
  /** Cap on rendered attempts (default 20); older ones collapse into an omitted count. */
  maxAttempts?: number;
}

/**
 * The authoritative record of what this session ACTUALLY did — position plus
 * every attempt and how it came to rest, in words a model is told outrank the
 * conversation.
 *
 * Deliberately separate from {@link ContextBrief}, which serves position +
 * options + narrative. The field exposed a structural hole in that brief: a
 * REFUSED fire is a gap-ledger row, not a transition, so failed attempts were
 * invisible in it — and with nothing grounding the model, one integration
 * watched it narrate an entire flow ("name set, recipe selected") having called
 * ZERO tools. Its own prose had become its context. This block is the counter:
 * every attempt, including the refused ones, in one authored channel.
 *
 * `text` carries AUTHORED constants and authored ids only. What it excludes is
 * as deliberate as what it holds: no state values or payloads (the
 * two-string-class invariant, extended to history), no produced data (that is
 * the data channel), no available actions or skills (options are whats_here's
 * job — facts are what happened, and the two stay non-overlapping so both stay
 * lean), no runtime free text, and no interpretation — one line per occurrence.
 */
export interface GroundTruth {
  node: string;
  version: number;
  text: string;
}
