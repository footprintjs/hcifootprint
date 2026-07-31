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
   * A tab switch to a sibling node path. Its own gesture, DESCRIPTIVE in v1: it
   * materialises only via a registered handler, and the GESTURE never moves the
   * page cursor — flipping a tab is not, by itself, changing the page you are on.
   * After the app's handler flips tabs, the existing visibility wire
   * (show/setVisible) reports the result; fire() itself never writes the
   * PresenceIndex.
   *
   * What DOES move the cursor is the app declaring `effect.navigatesTo` on the
   * edge, and that is true of every gesture including this one — a graph that
   * models a tab as a page is saying the page changes, and the library takes the
   * declaration rather than second-guessing it by gesture. Such a fire claims its
   * destination ({@link TransitionRecord.arrival}) exactly like a link would.
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

/**
 * WHICH FIELDS TO HIDE INSIDE THE DATA A TRANSITION CARRIES — the redaction
 * `redactedKeys` never did.
 *
 * `redactedKeys` governs STATE keys. These govern the values that ride the
 * record and the receipts: a fire's payload and a handler's return. Dot paths,
 * exactly footprintjs's `RedactionPolicy.fields` grammar (`'payment.token'`), and
 * a named field that is present is replaced by the literal `'[REDACTED]'` — a
 * marker, never a drop, so a reader can tell hidden from empty.
 *
 * OPT-IN, AND YOU AIM IT. Two lists rather than one, because the two channels
 * have opposite duties. `produced` is data the app hands back and no human
 * decision rests on it. `payload` is what a person APPROVES — and this library
 * cannot tell the human from the model at that boundary (see below), so hiding a
 * field there hides it from the approval card too. Naming a field must therefore
 * be a separate, deliberate act per channel; one list would let "hide the token
 * the API returned" quietly blank the amount on somebody's confirm card.
 *
 * THE AUDIENCES ARE NOT SEPARABLE HERE, said plainly. `confirmAsk()` returns ONE
 * receipts pack to ONE caller, and over Mode B / MCP that caller is the model,
 * which the library then instructs to show the human. There is no second channel
 * this library could send an unredacted card down, so there is no per-audience
 * redaction to offer: redact a field and it is gone for the model, for the person
 * reading the model's rendering, and for the journal export alike. An app that
 * draws its own approval card is unaffected — it passed the input in, so it still
 * holds it — which is the honest place to show a value the model must not see.
 *
 * WHAT STAYS UNREDACTED, ON PURPOSE. The approval gate's own comparison. The ask
 * binds to a faithful detached copy the caller cannot reach (`bound-input.ts`) and
 * the gate compares the fire's payload against THAT — never against the rendered
 * receipts. So the enforced-consent gate keeps proving the real values while the
 * rendered copies carry markers, and hiding a field can never turn a mismatch
 * into a match. One consequence worth stating: an auditor holding an exported
 * journal can still recompute the comparison for every field they can see, and
 * for a hidden one the marker tells them exactly which field they cannot judge.
 */
export interface RedactedFields {
  /**
   * Paths inside the value a fire CARRIES. Governs every rendering of it at once
   * — `TransitionRecord.payload`, `ConfirmWillUse.input`, and
   * {@link AvailableEdge.holds}, which is that same value one turn EARLY —
   * because a field hidden from the log that still rides the approval card (or
   * the action row the model reads before it fires) is not hidden.
   */
  payload?: string[];
  /**
   * Paths inside the value a handler RETURNS
   * ({@link TransitionRecord.produced}): the act → get-data-back channel, which
   * reaches the model through `producedFor()`, the settlement, and any export.
   * `captureProduced: false` remains the switch for "capture none of it".
   */
  produced?: string[];
}

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
  /**
   * Fields to hide INSIDE the data a transition carries — a fire's payload, a
   * handler's return. The sibling of `redactedKeys` (which governs state keys and
   * never touched a payload), aimed per channel and opt-in: absent, nothing
   * changes. See {@link RedactedFields}.
   */
  redactedFields?: RedactedFields;
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
  /**
   * REQUIRE A RECORDED HUMAN APPROVAL before an agent may fire a high-effect
   * action. Off by default; with it on, a high-effect agent fire is refused
   * unless it carries {@link FireOptions.askId} — a pointer to a confirm-journal
   * row a person's own Approve control recorded ({@link Session.approveAsk}),
   * or a standing ALWAYS ALLOW ({@link Session.alwaysApprove}).
   *
   * WHAT IT FIXES. `confirm: true` was the AGENT asserting that a human
   * approved: a boolean in the model's own tool arguments, tied to nothing. A
   * model that never asked was indistinguishable from one that got a yes. With
   * this option the proof is a POINTER to a decision a person recorded, so "the
   * model asked politely" stops being part of the security model.
   *
   * WHAT IT DOES NOT PROVE. That a particular person authenticated — `by` is a
   * string your host supplies — and not that your own wiring keeps the approval
   * door out of the model's reach. It proves that a row of the right kind, from
   * the right principal, for this action and this input, exists and has not
   * already been spent.
   *
   * Pass `true` for the plain policy, or a {@link HumanApprovalPolicy} to also
   * refuse a yes that has gone stale. Without this option nothing changes —
   * fail-closed, byte-identical.
   */
  requireHumanApproval?: boolean | HumanApprovalPolicy;
  /**
   * The clock the confirm chain reads (epoch ms). Defaults to `Date.now`. Inject
   * a controllable clock to test an expiring approval without real waits — the
   * same option name and default the tree layer already uses for its grace
   * timers (traverse/nav-session.ts), so the two never disagree.
   */
  now?: () => number;
}

/**
 * How strict {@link SessionOptions.requireHumanApproval} is about a yes given a
 * while ago, or in a world that has since moved on.
 *
 * BOTH RULES DEFAULT OFF, and that is a deliberate honesty position rather than
 * laziness. The library records the stamps ALWAYS — every enforced row carries
 * its timestamp and the state version the human decided at — but whether a stamp
 * is DISQUALIFYING is a product decision it cannot make for you: approving a
 * refund may legitimately take four minutes, and in a live-tapped app the state
 * version moves on almost every report. Recording a fact you can act on, while
 * refusing to guess the threshold, is the same stance the guard evidence takes.
 */
export interface HumanApprovalPolicy {
  /** Refuse an approval the human gave longer ago than this. Default: no time limit. */
  expiresAfterMs?: number;
  /**
   * Refuse an approval given before the app's state moved on. Compares
   * `stateVersion` — not `version`, which also bumps on served-structure changes
   * and on the fire itself. Default false.
   */
  refuseWhenWorldMoved?: boolean;
}

// ---------------------------------------------------------------------------
// Events — a PASSIVE observer surface (the footprintjs recorder category, at
// the session's grain). Listeners are notified after the fact; they never
// change what the session does, and a throwing listener is isolated (caught +
// warned), never aborting the session. This is telemetry/reaction, NOT logic.
// ---------------------------------------------------------------------------

export interface SessionEvents {
  /**
   * A new, newly-settled, or newly-corroborated occurrence (a snapshot of the
   * record). The third case is {@link TransitionRecord.arrival} turning
   * 'observed': the record did not change otherwise and the version did not move,
   * so a consumer counting events per fire sees one more than it did before 0.9.0
   * for a fire whose edge declares `navigatesTo`.
   */
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
  /**
   * Say that one tool in this group is WORKING RIGHT NOW, in your own words —
   * or hand `undefined` to stop saying it. See {@link AvailableEdge.busy}: the
   * label is yours, presence is the whole claim, and there is no boolean form.
   *
   * Required, exactly like `setEnabled` beside it: this handle is MINTED by the
   * library and never implemented by a consumer, so every handle in existence
   * can say the third state rather than some of them.
   */
  setBusy(toolId: string, busy: string | undefined): void;
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
  /** Say this tool is working right now, in your own words — `undefined` stops saying it. */
  setBusy(busy: string | undefined): void;
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
   * WHERE THE CLAIM AND THE OBSERVATION MEET — present only on a fire whose edge
   * declared `effect.navigatesTo`, whichever gesture carries it, and absent
   * everywhere else.
   *
   * Exactly two values, ever:
   * - `'claimed'` — stamped when the navigation claim is written, beside
   *   `toNodeClaimed`. It means the app SAID this action navigates and nothing
   *   has observed the app arrive. A fire under
   *   {@link SessionOptions.allowUnmaterializedFires} that nothing executed says
   *   this and can never say more: there is no action for an observation to
   *   corroborate, and the record's `materialized: false` is the other half.
   * - `'observed'` — a later {@link Session.sync} landed on the page this fire
   *   claimed. It means A MATCHING OBSERVATION LANDED. It is corroboration, not
   *   causal proof: the sync row that produced it still carries
   *   `unverifiedEdge: true`, because the cursor moved without passing a guard
   *   and nothing here can see the app's router.
   *
   * WHAT IT NEVER SAYS. There is no third value for "did not arrive": a sync
   * somewhere else, or no sync at all, leaves `'claimed'` standing forever. A
   * later legitimate hop and a failed navigation are indistinguishable from
   * here, a session with no sync channel observes nothing by construction, and a
   * clock is not evidence — so silence is the honest answer and the field simply
   * stops moving. `toNodeClaimed` is never retroactively flipped, and the
   * settlement receipt taken at rest is never rewritten (the upgrade lands on the
   * live record and rides ALONGSIDE the receipt — see docs/design/answer-grammar.md).
   */
  arrival?: 'claimed' | 'observed';
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
  /**
   * The page this edge CLAIMS it will move you to (from `effect.navigatesTo`),
   * BEFORE anything is fired. Absent when the app declared none — never a
   * guessed destination.
   *
   * A CLAIM about the app's handler, exactly as {@link ConfirmWillDo.navigatesTo}
   * is on the receipt a human reads. The human already had this fact at decision
   * time and the agent did not, which left the agent unable to know that this
   * edge's success evidence is PAGE MOTION rather than an element surviving:
   * a navigation declares no writes, so "nothing changed here" is what success
   * looks like from the element's side.
   */
  navigatesTo?: string;
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
  /**
   * WHAT THIS CONTROL HOLDS RIGHT NOW — the draft in the box, the option
   * currently selected — read at the moment the row is assembled.
   *
   * A READING, NEVER A BINDING. The fire still reads its own payload at act
   * time: `holds` says what the control had when the row was served, and a human
   * typing between the two makes the row stale by design. So it is a fact about
   * the app's state one turn early, and firing does not send it.
   *
   * TWO WIRES land here, and only where the app already holds the value in a
   * variable: `holds:` at registration ({@link RegisterToolGroupOptions}), and
   * the sensor forwarding a declared control's `value()` getter. The sensor's
   * per-element declaration wins when both exist — most specific, the same
   * declaration-outranks rule the sensor's own two evidence levels follow.
   *
   * ABSENCE IS THE DEFAULT AND IT IS HONEST. No reader declared, a reader that
   * answers `undefined`, a reader that throws, an action whose contract is the
   * author's `'none'`, a row standing for many rows of a repeats container: each
   * one serves NO KEY rather than a guess. Nothing is ever read off the DOM —
   * that is the sensor's law (`sensor/payload.ts`), and it holds here for the
   * same reason: a plausible-looking wrong value is the worst thing this library
   * can ship.
   *
   * REDACTED like the payload it will become, through `redactedFields.payload`
   * — what a control holds IS the future fire's payload one turn early, and a
   * field hidden from the log that still rides the card is not hidden. Same dot
   * paths, same `'[REDACTED]'` marker, same honest limit: a path names a field
   * inside a value, so a control holding a bare string is named the same way it
   * is on the record, which is to say it cannot be.
   */
  holds?: unknown;
  /**
   * THE THIRD STATE — the app says this control is WORKING RIGHT NOW, and the
   * value is the app's own label for it ('Saving…', 'Placing your order').
   *
   * A control has three states a person can see and an agent could not: it is
   * clickable, it is switched off, or it is mid-flight — the spinner in the
   * button. Only the first two had a wire, so working looked exactly like broken
   * from here, and the two moves an agent makes about broken (re-fire it, or tell
   * the human it failed) are the two worst moves about working.
   *
   * PRESENCE IS THE WHOLE CLAIM, like every other stamp on this row. A key means
   * the app said so. NO KEY MEANS THE LIBRARY DOES NOT KNOW — never "not busy":
   * an app that never wired this says nothing about any of its controls, and a
   * cheerful `busy: false` on all of them would be a claim about every session
   * that was never asked.
   *
   * A STRING, AND ONLY A STRING. There is deliberately no boolean form: a flag
   * would leave the meaning to whoever renders it, and the serving layer would
   * have to author a sentence about a state only the app can describe — which is
   * the exact conflation this field exists to end. The label is the app's word,
   * carried as DATA, and it never enters an authored sentence, the facts block,
   * or `groundTruth()`.
   *
   * THREE WIRES, mirroring `enabled`'s, so an app says it wherever it already
   * knows it: `busy:` at registration, `handle.setBusy(toolId, label)`, and a
   * live store's `LiveAction.busy`. There is deliberately NO declarative
   * `busyWhen` — a condition can prove a state, but it cannot author a label, and
   * a library-written label is a library-written meaning. Nothing is read off the
   * DOM either: no `aria-busy`, no spinner-hunting, the same sensor law `holds`
   * keeps for the same reason.
   *
   * IT DOES NOT GATE THE FIRE. Busy is what the app SAID, not a door the app
   * shut: a control that is busy and not disabled still fires, because the
   * library never invents a gate an app did not declare. An app that means "and
   * do not let anyone press it" already has the wire that says so — disable it,
   * and the fire is refused as `TOOL_DISABLED` exactly as before.
   *
   * THERE IS NO TIMER ON IT, EVER. Nothing in this library expires a busy label,
   * because a clock is not evidence (docs/design/answer-grammar.md, rule 2): a
   * long wait proves that waiting happened and nothing whatever about the work.
   * A busy that outlives anyone's patience is answered by the row still saying
   * busy and `did_it_work` still saying still-pending — and that pair is the
   * truth. THE CEILING BELONGS TO THE CALLER: stop waiting whenever you like, and
   * report UNFINISHED. Never done, never failed.
   *
   * CAPPED, NOT REDACTED, and that is a stance rather than an oversight. The
   * label is authored-style app text, so it crosses under the same 200-character
   * law an app's error text crosses under (`src/serve/error-text.ts`) — but it is
   * a bare string, and a redaction path names a field INSIDE a value, so there is
   * nothing here for `redactedFields` to name (the same honest limit `holds`
   * already documents above). Write labels a stranger may read: never interpolate
   * a secret, a customer's name, or the payload into one.
   */
  busy?: string;
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
  /**
   * The confirm-journal row that authorizes this fire — read only when the
   * session was created with {@link SessionOptions.requireHumanApproval}. Pass
   * the `askId` your Approve control approved (the one that came back from
   * `confirmAsk`, or rode the needs-confirm result).
   *
   * A POINTER, NEVER A SECRET. Ask ids are a per-session counter ('ask#1') and
   * are already handed to the model — guessing one is worthless, because the gate
   * requires a row for that id written by a door the model cannot write. Do not
   * treat it as a capability token; treat it as a citation.
   *
   * AND NEVER A BOOLEAN. There is deliberately no `confirm` field here, and there
   * will not be one: a boolean the caller controls is not evidence, so the door
   * has no slot for one. `confirm: true` survives at the served boundary as what
   * it honestly always was — the agent asking to proceed now.
   */
  askId?: string;
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

/**
 * What became of one fire — the success arm, or one typed refusal.
 *
 * The REFUSAL SET GROWS, and a consumer should be written for that. 0.6.0 added
 * `NOT_MATERIALIZED`; this release adds the five `APPROVAL_*` words, because the
 * library can now refuse a high-effect fire no human approved. What never
 * happens is a reason CHANGING meaning: every value keeps exactly what it had,
 * and a new one is always a new fact, never an old one relabelled. So read the
 * reasons you know (`if (!fired.ok && fired.reason === 'GUARD_FAILED') …`) and
 * let the rest fall through as "refused, and here is the word" — an exhaustive
 * `never` check over today's set is the one consumer shape a future reason will
 * stop compiling, and adding the case is the whole fix.
 */
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
    }
  // --- requireHumanApproval refusals (opt-in; see SessionOptions) -----------
  /** No recorded human approval authorizes this high-effect fire. `askId` echoes
   *  the pointer that was presented, when one was and it named nothing usable. */
  | { ok: false; reason: 'APPROVAL_REQUIRED'; affordanceId: string; askId?: string }
  /** That approval was already spent by an earlier fire. One yes, one action. */
  | { ok: false; reason: 'APPROVAL_SPENT'; affordanceId: string; askId: string }
  /** The human approved something else — `differs` names which join failed. */
  | {
      ok: false;
      reason: 'APPROVAL_MISMATCH';
      affordanceId: string;
      askId: string;
      differs: 'action' | 'input' | 'instance' | 'both' | 'cannot-judge';
    }
  /** The yes is older than this session's rules allow, or predates a state change. */
  | { ok: false; reason: 'APPROVAL_STALE'; affordanceId: string; askId: string }
  /** The human said no to this ask. Terminal for that askId, for the session's life. */
  | { ok: false; reason: 'APPROVAL_DECLINED'; affordanceId: string; askId: string };

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
// The work ledger — work the app SAID it started and has not closed
// ---------------------------------------------------------------------------

/**
 * A handle on one piece of work the app said it started — what
 * {@link Session.beginWork} hands back, and the only way to close the row it
 * opened.
 *
 * PAIR IT LIKE A LOCK: open in the `try`, close in the `finally`, so a throw on
 * the way through cannot leave the row open.
 *
 * ```ts
 * const work = session.beginWork('Saving your draft');
 * try {
 *   await saveToServer();
 * } finally {
 *   work.done();
 * }
 * ```
 *
 * A handle nobody closes is never cleaned up. No timer expires it, because a
 * clock is not evidence (`docs/design/answer-grammar.md`, rule 2) and there is
 * no state it could honestly decay into — *it has been a while* is not evidence
 * of done and not evidence of failed. So a leaked handle keeps answering "still
 * working" and stays visible in {@link Session.openWork} for the session's life,
 * by design: the row says what the app last told it, and nothing here invents an
 * ending it was never given.
 */
export interface WorkHandle {
  /** This row's id — the same string {@link WorkRow.workId} carries. */
  readonly workId: string;
  /**
   * Close the row. FIRST CLOSE WINS; a second call does nothing.
   *
   * `error` is the app's own object for work that ended badly, and it is
   * recorded on the WORK ROW ONLY. It settles nothing, rejects nothing and
   * rewords no transition: closing a row is bookkeeping about WORK, never a
   * verdict about a FIRE. The doors that settle one are exactly the doors that
   * always did — throw from the handler, return `{ ok: false }`
   * ({@link FireResult}), or call {@link Session.reject}. A `done()` that
   * resolved a settlement latch would fork first-settlement-wins and launder an
   * app's claim about its own bookkeeping into the receipt for an action.
   */
  done(error?: unknown): void;
}

/**
 * Where a {@link Session.beginWork} call made OUTSIDE a handler belongs.
 *
 * The mirror of {@link UpdateOptions.transitionId}, for the same reason:
 * identity has to travel with the report. Correlation is by CALL PATH, never by
 * recency — "the newest fire" is right exactly when nothing is racing and
 * silently wrong whenever the timing is interesting
 * (`docs/design/answer-grammar.md`, "How completion is correlated"). So a call
 * with nothing to bind to lands UNBOUND rather than guessing.
 */
export interface BeginWorkOptions {
  /**
   * The fire this work belongs to — a `transitionId` from a {@link FireResult}.
   *
   * EXPLICIT WINS, exactly as it does in {@link Session.updateState}: pass this
   * from inside a handler and the row binds to the id you named, not to the
   * handler you happen to be in. An id this session does not know AS A FIRE
   * binds to nothing — the row lands unbound with one dev warning naming what is
   * live, because a row pointing at a fire that does not exist would claim a
   * relationship nothing can check.
   */
  transitionId?: string;
}

/**
 * One piece of work the app has open RIGHT NOW ({@link Session.openWork}) — the
 * sibling of {@link PendingInfo} (fires awaiting the app's state report) and
 * {@link AskStatus} (cards awaiting a person).
 *
 * THE HOLE IT FILLS. A fire can come to rest while the app is still working: an
 * upload that reports its delta and keeps uploading, a handler that hands off to
 * a background job, a save whose spinner outlives its receipt. Every list this
 * library had answered "nothing is live" about that — `pending()` had settled it,
 * `awaitingSettlement()` had dropped the latch — and a confident emptiness is
 * the one answer this library keeps closing. This row is the app saying so, in
 * the imperative voice it already has around its own async work.
 *
 * IT IS THE APP'S CLAIM, and it is served as one. Nothing here verifies that
 * work is really running, nothing measures it, and nothing ends it: the row is
 * open until the app closes it.
 */
export interface WorkRow {
  workId: string;
  /**
   * The app's own words for this work, when it gave any — DATA, and only data.
   * It is never rendered into an authored sentence, into `groundTruth()`, or
   * into the facts block: a runtime string in the one block a model is told to
   * trust above its own account is an instruction carrying the app's authority.
   * Capped like every other app string that crosses (200 characters).
   */
  label?: string;
  /**
   * The fire this work is bound to. ABSENT MEANS UNBOUND — nothing said which
   * fire it belongs to, and nothing guessed one.
   */
  transitionId?: string;
  /** The action that fire was about, when the row is bound. */
  affordanceId?: string;
  /**
   * When the app opened the row, on the session's clock — DATA, for a caller
   * that wants to sort or render it. NOTHING IN THIS LIBRARY RENDERS A DURATION
   * FROM IT, and nothing expires a row because of it: a clock is never evidence,
   * and how long something has taken is neither done nor failed.
   */
  startedAt: number;
  /**
   * Who the bound fire was charged to. `'system'` on an UNBOUND row — not a
   * guess about who is working, but the honest floor: nobody said, and work
   * never runs silently.
   */
  principal: Principal;
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
 * `kind` GROWS, and a consumer should be written for that. 0.3.0 added
 * 'unmaterialized-fire' and this release adds 'dead-end', because the ledger's
 * whole job is recording what nobody could serve — the day the library can see a
 * new shape of that, it says so rather than filing it under an old word. What never
 * happens is a kind CHANGING meaning: every value keeps exactly what it had,
 * and a new one is always a new fact, never an old one relabelled. So read a row
 * by the kind you know (`if (gap.kind === 'fire-rejected') …`) and let the rest
 * fall through as informational — an exhaustive `never` check over today's four
 * is the one consumer shape a future kind will stop compiling.
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
 * The five 'APPROVAL_*' reasons are SECURITY rows, not demand: the capability
 * exists and was refused because no recorded human approval authorized it
 * (SessionOptions.requireHumanApproval). Route them to your audit sink, never to
 * a "what to build next" query — a triage model that reads a blocked forgery as
 * a feature request will propose building the hole back in.
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
  /**
   * WHY the fire was refused — the same word {@link FireResult} returned.
   *
   * This list GROWS with the refusals the gate can make (this release adds the
   * five `APPROVAL_*` words), and never re-points an existing one at a new
   * meaning. Read the reasons you know; treat the rest as "refused, reason
   * recorded". See the triage notes above for which of them are security rows
   * rather than missing capability.
   */
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
    | 'ENTRY_NOT_MATERIALIZED'
    // requireHumanApproval refusals — SECURITY rows, not missing capability.
    | 'APPROVAL_REQUIRED'
    | 'APPROVAL_SPENT'
    | 'APPROVAL_MISMATCH'
    | 'APPROVAL_STALE'
    | 'APPROVAL_DECLINED';
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
  /** See {@link ReportGapOptions.actionsMayBeStale} — copied from the report. */
  actionsMayBeStale?: boolean;
}

export interface ReportGapOptions {
  /** The ask that could not be served (length-capped to stay token-lean). */
  request: string;
  reason?: GapReason;
  note?: string;
  principal?: Principal;
  /**
   * This row also says the ACTIONS ON OFFER may be out of date — the source they
   * come from could not be re-read, so what is being served is from before that.
   *
   * The one 'reported' row that reaches the model. Every other one is triage for
   * the app (unmet demand, read from {@link Session.gaps} / {@link Session.onGap});
   * this one is a fact about the surface a model is looking at while it looks,
   * so `groundTruth()`'s facts block prints an AUTHORED line for it — never this
   * row's `request`, which is runtime text. Without it, a broken read reached the
   * developer's console and nothing else, and the session went on serving the
   * pre-failure list as current fact.
   *
   * Use it for exactly that. It is not a general "tell the model" flag: a row that
   * marks itself this way while the served list is fine spends the one channel the
   * library keeps for saying the room may have moved.
   */
  actionsMayBeStale?: boolean;
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

/**
 * WHAT THIS FIRE WILL SEND — the input on the ask card, so the human approves an
 * object and not just a verb.
 *
 * The one RUNTIME value in the receipts pack, and it is here because sharpening
 * the gate required it: a human approved the affordance AND the input they were
 * shown, so the input has to be in the pack the serving layer relays to the
 * person. Allowed by the serve layer's own two-string-class rule — runtime values
 * ride structured DATA fields (serve/modes.ts), never authored prose.
 *
 * NOT a digest. The gate recomputes the comparison from these values at fire
 * time, so there is one source of truth and nothing that can fall out of sync —
 * and an auditor holding an exported journal can recompute the same comparison.
 *
 * A NEW EXPOSURE SURFACE, said plainly: the input now rides the receipts to the
 * model, to the human, and into the journal export. That is the point of it — a
 * receipt that hides the amount is worse than useless. An input carrying a secret
 * is therefore in the receipts pack by default: `redactedKeys` governs state keys
 * and never governed a payload, here or on `TransitionRecord.payload`.
 *
 * WHAT TO DO ABOUT IT: {@link RedactedFields}, through
 * `SessionOptions.redactedFields.payload` — name the paths and they arrive as the
 * `'[REDACTED]'` marker here AND on the record, one list for every rendering of
 * the one value. Off unless asked, because the field a person must see to approve
 * is exactly the field a default could not be trusted to pick. The gate's own
 * comparison is untouched: it binds to the detached copy in `bound-input.ts`, not
 * to what is rendered here.
 *
 * Bounded like every other captured value (depth/breadth/length caps). An input
 * too large to hold faithfully is still shown truncated — and the gate then
 * refuses to judge a match against it rather than comparing two truncations.
 */
export interface ConfirmWillUse {
  /** The payload the confirmed fire will carry. Absent for an input-less action. */
  input?: unknown;
  /** The row/instance the card is about (an order id), when the action takes one. */
  instance?: string;
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
  /**
   * What this fire will SEND — the input and instance on the card. Present when
   * the ask was told them (the serving layer passes them; a bare `confirmAsk`
   * with no input has nothing to show). Under
   * {@link SessionOptions.requireHumanApproval} this is what the approval BINDS
   * to: a later fire carrying anything else is refused.
   */
  willUse?: ConfirmWillUse;
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
 * `note`, is length-capped, and `receipts` carries authored strings plus one
 * structured runtime DATA field, `willUse` — the input the human is shown).
 *
 * `kind` GROWS, and a consumer should be written for that. Three words shipped in
 * 0.6.0; {@link SessionOptions.requireHumanApproval} adds four, because the
 * library can now record facts it previously could not have: a human's ALLOW
 * standing on its own BEFORE any fire, a durable ALWAYS ALLOW, the moment an
 * approval was spent, and a crossing attempt that had no valid yes. What never
 * happens is a kind CHANGING meaning: every value keeps exactly what it had, and
 * a new one is always a new fact, never an old one relabelled.
 *
 * WHY FOUR NEW KINDS AND NOT A `scope: 'once' | 'always'` FIELD. A new field is
 * silently ignored by a consumer that does not know it exists, so a DURABLE grant
 * would be counted as a one-time yes by every 0.6-era filter — and here being
 * missed is a security misreading, not a cosmetic one. A new kind is unmissable.
 * So read a row by the kind you know and let the rest fall through; an exhaustive
 * `never` check over the old three is the one consumer shape this stops
 * compiling.
 */
export interface ConfirmRecord {
  /**
   * - `'ask'`              — a high-effect gate opened; carries the receipts.
   * - `'approved'`         — a human's ALLOW. Single-use: one yes, one fire.
   * - `'always-approved'`  — a human's ALWAYS ALLOW: a scoped standing policy,
   *   never consumed, and deliberately NOT bound to an input (see `scopeInstance`).
   * - `'declined'`         — a no. From the human's own door ({@link Session.declineAsk})
   *   it is terminal for that askId; any other decline under enforcement is a
   *   report that closes nothing, and says so with `relayed`.
   * - `'used'`             — an approval was SPENT by a fire (`transitionId`).
   * - `'refused'`          — a crossing attempt with no valid yes (`rejectionReason`).
   * - `'revoked'`          — a standing grant was withdrawn.
   */
  kind: 'ask' | 'approved' | 'always-approved' | 'declined' | 'used' | 'refused' | 'revoked';
  /**
   * Links the ask → decision → fire rows of one high-effect gate. On an
   * `'always-approved'` row it is that policy's own id ('grant#1'), carried by
   * every `'used'` row the grant authorizes — so the journal shows how many times
   * a standing yes was exercised.
   */
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
  // 'approved' / 'used' rows -----------------------------------------------
  /**
   * The TransitionRecord.id of the fire this row is about. Present on `'used'`
   * rows, and on a `'approved'` row written by the pre-enforcement default path
   * (where the fire IS what closed the ask). Deliberately ABSENT on an
   * `approveAsk` row: no fire has happened yet — that is the whole change.
   */
  transitionId?: string;
  // 'approved' / 'declined' rows -------------------------------------------
  /** Who answered — an operator id, an email, your host's label. Optional. */
  by?: string;
  /** Free-text note (length-capped). On a decline, typically why. */
  note?: string;
  // enforced rows (requireHumanApproval) -----------------------------------
  /**
   * Present (true) on every row the enforcement path wrote — so an auditor can
   * separate rows the gate will honour from the pre-enforcement journal's rows,
   * without inferring it from a kind.
   */
  enforced?: true;
  /**
   * Present (true) on a `'declined'` row that RELAYS a refusal instead of
   * recording the human's own decision — an agent's report, or any
   * {@link Session.declineConfirm} under enforcement. The ask it names is still
   * OPEN: nothing was closed, and `groundTruth()` keeps saying the person is
   * deciding. Without it an auditor would have to infer the difference from
   * `principal`, which on this row is the caller's claim rather than a fact — and
   * a fabricated no that reads like a real one is the same forgery as a
   * fabricated yes. A human's no (`declineAsk`) never carries this.
   */
  relayed?: true;
  /** An ALWAYS ALLOW scoped to one row of a list (an order id). Absent = any instance. */
  scopeInstance?: string;
  /** When a standing grant stops authorizing (epoch ms). Absent = no time limit. */
  expiresAt?: number;
  /**
   * The STATE version when the decision was recorded — the anchor for
   * {@link HumanApprovalPolicy.refuseWhenWorldMoved}. Stamped always; enforced
   * only when asked.
   */
  stateVersion?: number;
  /** Why a crossing attempt was refused (`'refused'` rows) — joins the gap ledger. */
  rejectionReason?: 'APPROVAL_REQUIRED' | 'APPROVAL_SPENT' | 'APPROVAL_MISMATCH' | 'APPROVAL_STALE' | 'APPROVAL_DECLINED';
}

/**
 * One high-effect ask and what became of it — the rows {@link Session.asks}
 * serves, read at the moment you ask.
 *
 * The READ side of the confirm journal, and it exists because deriving these
 * three fates from {@link ConfirmRecord} rows means re-implementing library law
 * outside the library (which rows close which, what a `relayed` decline does
 * NOT close, when a yes is spent). A serving layer that re-derived it could
 * disagree with the gate about the same card, and a disagreement here reads to a
 * model as "the human already answered".
 *
 * Structural facts only: no receipts, no input, no `by`. This is the answer to
 * "is anything waiting on a person?", not a second channel for the card.
 */
export interface AskStatus {
  askId: string;
  /** The action the card is about. */
  affordanceId: string;
  /** Which row/instance the card is about, when the action takes one. */
  instance?: string;
  /**
   * Absent means STILL OPEN — nobody has answered. An agent's relayed decline
   * under {@link SessionOptions.requireHumanApproval} leaves it absent, because
   * that report closes nothing.
   */
  answer?: 'approved' | 'declined';
  /** True once a fire has spent this approval. One yes authorizes one fire. */
  spent?: boolean;
  /**
   * The human's yes is recorded and unspent, and the app's own
   * {@link HumanApprovalPolicy} will no longer let a fire cross on it — it ran
   * out, or the state moved since they looked. READ AT ANSWER TIME, from the same
   * function the gate uses, so this row and the refusal can never disagree.
   *
   * Absent means nothing is known against the approval — including on every
   * session that declares no policy, where a yes never goes stale. The cure is a
   * fresh ask, and it is the only one: a decision is never overwritten.
   */
  stale?: true;
}

/**
 * What one of the human-side approval doors did — {@link Session.approveAsk},
 * {@link Session.declineAsk}, {@link Session.alwaysApprove},
 * {@link Session.revokeAlwaysApprove}.
 *
 * A typed REFUSAL rather than a throw, because these run inside click handlers: a
 * button that throws takes the page down, while a button that reports gets to
 * show the person what went wrong.
 */
export type ApprovalResult =
  | { ok: true; record: ConfirmRecord }
  | {
      ok: false;
      /**
       * - `'UNKNOWN_ASK'`          — no such ask (or no such standing grant).
       * - `'ASK_ALREADY_ANSWERED'` — a decision is already recorded; nothing here
       *   ever overwrites one.
       * - `'NEEDS_DECIDER'`        — `by` is required: an approval whose decider is
       *   unknown is the very claim-as-fact this closes.
       * - `'NOT_ENFORCED'`         — the session was not created with
       *   requireHumanApproval, so this row would authorize nothing.
       */
      reason: 'UNKNOWN_ASK' | 'ASK_ALREADY_ANSWERED' | 'NEEDS_DECIDER' | 'NOT_ENFORCED';
      /** One authored sentence naming the cure. */
      explanation: string;
    };

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
  /**
   * Cap on rendered attempts (default 20); older ones collapse into an omitted
   * count. The same number bounds the "awaiting the human" cards listed below
   * them — the other line an agent can mint at will — so one dial says how long
   * this block may get.
   */
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
