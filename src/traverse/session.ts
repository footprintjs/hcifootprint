/**
 * Session — the traverse() driver: available / fire / sync.
 *
 * footprint's executor drives a chart to completion and its decide() picks one
 * branch. A live UI is inverted: the user/agent drives edge-by-edge, and from
 * any node the driver exposes all guard-passing edges and waits for the world
 * to pick one. So this driver never touches footprint's engine. It reuses the
 * transactional memory/commit/trace stack instead:
 *
 *   one fired-or-stimulus transition
 *     → one fresh StageContext (runId '' = root namespace)
 *     → tracked reads (guard keys) + tracked writes (the settled delta)
 *     → commit() → one CommitBundle in the EventLog
 *
 * which makes footprint's whole post-hoc toolchain (causalChain, sliceForKey,
 * arrayProvenance, commitValueAt) work on UI sessions unchanged. Guard
 * evaluation itself is footprint's pure `evaluateFilter` — no scope, no
 * commit, evidence-emitting, worker-safe.
 *
 * Longevity rules honored (from the footprint execution-model adjudication):
 * fresh context per transition (never createNext — it retains every context),
 * runId stays '' (non-empty runIds namespace writes and break slice matching),
 * runtimeStageId uniqueness via a monotonic counter.
 */
import {
  EventLog,
  ScopeFacade,
  SharedMemory,
  StageContext,
  buildRuntimeStageId,
  createExecutionCounter,
  evaluateFilter,
} from 'footprintjs/advanced';
import type { CommitBundle, ExecutionCounter, FilterCondition } from 'footprintjs/advanced';
import { detectSchema } from 'footprintjs';
import type { MCPToolDescription, ScopeRecorder, WhereFilter } from 'footprintjs';
import { formatSlice, keysReadFromMap, sliceForKey } from 'footprintjs/trace';
import { isParam, segmentsOf } from '../graph/route-match.js';
import type {
  Affordance,
  ApprovalResult,
  AvailableEdge,
  AvailableSkill,
  AvailableSlice,
  Binding,
  CommitSkillResult,
  ConfirmReceipts,
  ConfirmRecord,
  ConfirmTrailStep,
  ConfirmWillDo,
  ConfirmWillUse,
  ContextBrief,
  ContextBriefOptions,
  Explanation,
  FireOptions,
  FireResult,
  FireSettlement,
  GapRecord,
  GroundTruth,
  GroundTruthOptions,
  HumanApprovalPolicy,
  PendingInfo,
  Principal,
  ReportGapOptions,
  SessionEventName,
  SessionEvents,
  SessionOptions,
  SkillFrame,
  SkillGraphSpec,
  SkillPlan,
  SkillPlanStep,
  StimulusKind,
  SyncResult,
  ToolGroup,
  TransitionRecord,
  TrySkillPlanResult,
  UpdateOptions,
  UpdateResult,
} from '../atom/types.js';
import { edgesToMCPTools, leaveSkillTool } from '../serve/mcp.js';
import { createSettlementLatch, settledNow } from './settlement.js';
import type { SettlementLatch } from './settlement.js';
import { checkApproval } from './approval-gate.js';
import type { ApprovalVerdict, OpenAsk } from './approval-gate.js';
import { normalizeInput, sameInput } from './same-input.js';
import { UNCOPYABLE_INPUT, boundInput } from './bound-input.js';
import { failureReason, isReturnedFailure } from './handler-result.js';
import { checkJsonShape, checkNoInput } from './payload-shape.js';
import { expectsOf } from './expects.js';
import { checkVerify, filterVerdict } from './verify.js';
import { stepDependencies } from '../graph/skill-deps.js';
import { ToolRegistry } from '../registry/registry.js';
import type { ToolHandler } from '../registry/registry.js';

/**
 * Who an UNATTRIBUTED action is charged to.
 *
 * `FireOptions.source` is required in the types, so this only ever answers for
 * a caller the types never reached — plain JS, or an options object built at
 * runtime. It is not a new policy: `commitSkill()`, `confirmAsk()` and
 * `skillsAsTools()` already publish exactly this assumption, and the session is
 * documented as an agent's actuator — the app self-reporting its OWN motion is
 * the side that says so ('user' / 'system').
 *
 * 'user' would be the unsafe direction and is deliberately NOT the default: it
 * would write a human principal into the gap ledger and the commit log for a
 * fire nobody attributed, AND it would disarm the never-trap gate in fire(),
 * which refuses agent fires that could execute nothing. Guessing 'agent' can
 * only over-apply that gate — a loud, typed, retriable refusal — never launder
 * a machine action as a human one.
 */
const DEFAULT_PRINCIPAL: Principal = 'agent';

/** What `fire(id)` with no options at all is read as — shared, frozen, read-only. */
export const UNATTRIBUTED_FIRE: FireOptions = Object.freeze({ source: DEFAULT_PRINCIPAL });

/**
 * The one sentence that makes the facts block a FLOOR rather than another
 * opinion. A model weighs everything in its context; without being told which
 * source wins, its own earlier prose competes with the app's record — and the
 * field watched that competition be lost.
 */
const FACTS_HEADER =
  'FACTS FROM THE APP (authoritative). Every line below is the app’s own record of what happened. ' +
  'Where anything said in this conversation disagrees with it — including anything you or the user ' +
  'stated was done — these lines are what actually happened; the conversation is a claim about them.';

/** Said outright, because a silence here is exactly what a model fills with invention. */
const NOTHING_ATTEMPTED = 'No actions have been performed in this app this session.';

/** An id the graph does not have — caller-supplied text, kept out of the authored channel. */
const UNKNOWN_ACTION = '(an action this app does not have)';

/** The principal of a fire, tolerating a caller who omitted `source` entirely. */
export function principalOf(opts: FireOptions): Principal {
  // The cast is the honest part: JS callers are not held to FireOptions, so
  // `source` really can be missing here even though the type says otherwise.
  return (opts as Partial<FireOptions>).source ?? DEFAULT_PRINCIPAL;
}

/**
 * The two facts a settlement can carry BESIDE its status: why it was refused,
 * and what the declared verify contract said. Both optional, both absent by
 * default — a settlement never carries a field it did not earn.
 */
interface SettlementExtra {
  error?: unknown;
  verifyHeld?: boolean | 'unevaluable';
}

/**
 * One attempt, as a REFERENCE into whichever ledger holds it — a refused fire
 * or a recorded one. Kept unrendered so the facts block can order and slice
 * before it spends a single string.
 */
type AttemptRow =
  | { at: number; rank: 0; gap: GapRecord }
  | { at: number; rank: 1; fired: TransitionRecord };

interface PendingTransition {
  record: TransitionRecord;
  affordance: Affordance;
  /**
   * True while this fire's registered handler is still executing (or has
   * failed). Bare-FIFO attribution skips such entries: the handler has first
   * claim on its own record — another fire's report must never steal it.
   */
  handlerInFlight?: boolean;
  /**
   * Tapless-session mode (stateTap false): nothing will ever call
   * updateState(), so the handler's successful completion settles this record
   * with an empty delta and effectVerified 'unobservable' — instead of the v1
   * behavior of pending-forever (the D18 rung-killer fix).
   */
  settleOnCompletion?: boolean;
}

/** registerTools() input: one group per component/section, existing handlers by reference. */
export interface RegisterToolsOptions {
  group: string;
  tools: Record<string, ToolHandler>;
}

/** registerTools() output: optional exact-provenance triggers + the group's cleanup. */
export interface RegisteredTools {
  /**
   * Wrapped manual triggers (same signature as the app's handlers): calling
   * one records the action as source 'user' AND invokes the handler — the
   * opt-in precision tier. Wire a trigger IN PLACE OF the handler at the call
   * site (the trigger invokes it for you); keeping both wired executes the
   * handler twice. If you cannot replace the call site, rely on the zero-touch
   * tiers instead (DOM sensor / effect-signature inference).
   */
  triggers: Record<string, (payload?: unknown) => FireResult>;
  /** Unregister everything this call registered (call on unmount). */
  unregister: () => void;
}

export class Session {
  readonly #spec: SkillGraphSpec;
  #node: string;
  #version = 0;
  /** Committed state deltas only (settle / stimulus / inference). */
  #stateVersion = 0;
  /** Served-structure changes only (frames + coalesced registration/presence swaps). */
  #structureVersion = 0;
  /** Whether updateState() reports are expected (see SessionOptions.stateTap). */
  readonly #stateTap: boolean;
  /** Whether handler return values are captured onto records (act → data back). */
  readonly #captureProduced: boolean;
  /**
   * Whether an AGENT may fire a declared-but-unbound tool as an honest no-op
   * (guide/tour flows) instead of being refused NOT_MATERIALIZED. Default false
   * — fail closed, so a success-shaped no-op can never read as "it worked".
   */
  readonly #allowUnmaterialized: boolean;
  /** Whether a plain JSON-Schema declaration is shape-checked at fire time. */
  readonly #checkPayloadShape: boolean;
  /**
   * The caller's OWN router navigation, when provided (the opt-in that lets a
   * url gesture materialise without a fake handler — see SessionOptions).
   */
  readonly #navigate?: (href: string) => void | Promise<void>;
  /**
   * The enforcement rules, when the session opted in — PRESENCE is the switch
   * (SessionOptions.requireHumanApproval). Undefined means every gate below is
   * skipped and the 0.6 path runs byte-identically.
   */
  readonly #humanApproval?: HumanApprovalPolicy;
  /** The confirm chain's clock (injectable, so an expiring approval is testable). */
  readonly #now: () => number;
  /** Fingerprint of the served structure at the last coalesced flush. */
  #structureFingerprint = '';
  #structureFlushScheduled = false;
  readonly #heap: SharedMemory;
  readonly #log: EventLog;
  readonly #counter: ExecutionCounter;
  readonly #redacted: Set<string>;
  readonly #commitValues: 'full' | 'delta';
  readonly #transitions: TransitionRecord[] = [];
  readonly #pending: PendingTransition[] = [];
  /**
   * Open settlement latches by record id — the promises fire() handed out that
   * nothing has answered yet. An entry lives exactly as long as the question
   * does: it is deleted the moment the fire comes to rest, and a fire whose
   * app report never arrives keeps its latch for the same reason its #pending
   * entry stays (the honest mirror of a record that is still 'pending').
   */
  readonly #effectLatches = new Map<string, SettlementLatch>();
  /**
   * Every settlement this session has DELIVERED, by record id — the answer
   * kept after the question closed, so `settlementOf()` can still be asked long
   * after the fire came to rest (by a relay, a poll, a tool call three turns
   * later). Written by #resolveEffect BEFORE the latch is dropped, and by the
   * fire arms that are born at rest, so the waiting door and the asking door
   * can never give different answers.
   *
   * Grows for the session's life — the same policy as #transitions and the gap
   * ledger, and for the same reason: one small snapshot per fire, and pruning
   * would turn a legitimate late question into a fabricated "unknown".
   */
  readonly #settlements = new Map<string, FireSettlement>();
  /** runtimeStageId → keys tracked-read, collected live via the scope channel. */
  readonly #readsByStep = new Map<string, string[]>();
  readonly #recorder: ScopeRecorder;
  /** The one open skill frame (v0: one at a time). */
  #frame: SkillFrame | null = null;
  /**
   * Record id whose handler is executing its SYNCHRONOUS portion right now.
   * updateState() called from inside that portion attributes directly to this
   * record (like transitionId targeting) — the fix for the burst-fire race
   * where another handler's report would FIFO-steal an earlier record.
   */
  #invokingRecordId: string | null = null;
  /** Closed frames (completed / cancelled / demoted), oldest first. */
  readonly #frames: SkillFrame[] = [];
  readonly #registry: ToolRegistry;
  readonly #warn: (message: string) => void;
  /** Unmet demand: rejected fires + explicitly reported unserved asks. */
  readonly #gaps: GapRecord[] = [];
  /**
   * Dead-end rows already written, keyed `node@structureFingerprint` — the row
   * is an observation of one position at one served structure, so re-observing
   * the same pair says nothing new. New WIRING re-arms it: a mount may have
   * fixed the page, and a page still dead afterwards is a new fact. The
   * fingerprint, not `structureVersion`, is the axis: that counter also bumps
   * for skill-frame open/close/demote, which cannot wire anything. Off-graph
   * nodes are keyed `off-graph:<node>` and never re-arm — nothing on screen can
   * author a page. Grows one entry per emitted row, the ledger's own class.
   */
  readonly #deadEndSeen = new Set<string>();
  /** Nodes already warned about (the #warnedOnce discipline): one per node, for the session's life. */
  readonly #deadEndWarned = new Set<string>();
  /** The confirm journal: high-effect ask → decision → fire rows, oldest first. */
  readonly #confirms: ConfirmRecord[] = [];
  /**
   * Every ask this session has minted, by askId — open, approved or declined.
   *
   * ONE STRUCTURE, TWO POLICIES. In the default mode entries are deleted the
   * moment they are answered (so at most one lives per affordance, exactly as
   * before); under enforcement they STAY, because an approval must be spendable
   * once and a decline must stay refusable for the session's life. A second map
   * for the enforced mode would be a second path through the gate, and a second
   * path is an escape.
   *
   * So under enforcement it GROWS — one entry per distinct ask, for the session's
   * life, like every other ledger here. Deleting a decision to save memory is the
   * one economy this file will not make. What is bounded instead is the RENDERING:
   * groundTruth() caps the "awaiting" lines an agent can mint, because that block
   * is read by a model, while this map is read only by the gate. Each entry holds
   * a detached copy of its input (bound-input.ts), never the caller's object.
   */
  readonly #openAsks = new Map<string, OpenAsk>();
  /**
   * The row that RECORDED each decision, by askId (and by grant id for a standing
   * ALWAYS ALLOW). The gate reads the row rather than trusting the entry above:
   * the entry is our bookkeeping, the row is what an auditor exports, and the
   * principal that has to be 'user' lives on the row.
   */
  readonly #approvalRows = new Map<string, ConfirmRecord>();
  /** Standing ALWAYS ALLOW grants that have not been revoked, oldest first. */
  readonly #standingGrants: ConfirmRecord[] = [];
  /** Refusals already warned about, keyed `affordanceId@reason` (the #warnedOnce discipline). */
  readonly #approvalWarned = new Set<string>();
  /** Monotonic counter behind every generated confirm id (never caller-supplied). */
  #askSeq = 0;
  /** Passive observer listeners, by event name (the recorder category, session grain). */
  readonly #listeners = new Map<SessionEventName, Set<(payload: unknown) => void>>();
  /** Monotonic counter for generated tool-group ids (never caller-supplied). */
  #groupSeq = 0;

  constructor(spec: SkillGraphSpec, opts: SessionOptions) {
    // `opts?.` where the type says the argument is required: a JS caller who
    // wrote `createSession()` deserves this library's own sentence naming the
    // pages it could have started on, not a TypeError from reading `.node` off
    // undefined. There is no default to invent here — a flat graph's starting
    // page is a real decision, so the refusal stays; only its voice changes.
    if (!spec.pages[opts?.node]) {
      throw new Error(
        `hcifootprint: unknown starting node '${opts?.node}'. Known pages: ${Object.keys(spec.pages).join(', ')}.`,
      );
    }
    this.#spec = spec;
    this.#node = opts.node;
    this.#stateTap = opts.stateTap ?? opts.state !== undefined;
    this.#captureProduced = opts.captureProduced ?? true;
    this.#allowUnmaterialized = opts.allowUnmaterializedFires ?? false;
    this.#checkPayloadShape = opts.checkPayloadShape ?? true;
    this.#navigate = opts.navigate;
    // `true` is the plain policy (no staleness rules); an object is the policy
    // itself. Absent stays absent — the presence of the field is the opt-in.
    this.#humanApproval =
      opts.requireHumanApproval === undefined || opts.requireHumanApproval === false
        ? undefined
        : opts.requireHumanApproval === true
          ? {}
          : opts.requireHumanApproval;
    this.#now = opts.now ?? Date.now;
    const initial = structuredClone(opts.state ?? {});
    this.#log = new EventLog(initial);
    this.#heap = new SharedMemory(undefined, initial);
    this.#counter = createExecutionCounter();
    this.#redacted = new Set(opts.redactedKeys ?? []);
    this.#commitValues = opts.commitValues ?? 'delta';
    this.#warn = opts.onWarn ?? ((message) => console.warn(message));
    this.#registry = new ToolRegistry(this.#warn);
    this.#recorder = {
      id: 'hcifootprint-session',
      onRead: (event) => {
        if (!event.key || !event.runtimeStageId) return;
        const reads = this.#readsByStep.get(event.runtimeStageId) ?? [];
        reads.push(event.key);
        this.#readsByStep.set(event.runtimeStageId, reads);
      },
    };
  }

  get node(): string {
    return this.#node;
  }

  /** The compiled graph's id (namespaces MCP tool names). */
  get graphId(): string {
    return this.spec.id;
  }

  /** The one CAS/sinceVersion cursor: total order over ALL world motion. */
  get version(): number {
    return this.#version;
  }

  /**
   * Whether this session ENFORCES human approval on high-effect agent fires
   * (SessionOptions.requireHumanApproval). Read by the serving layer so the
   * instruction text it hands a model says what is actually true of this session
   * — a tool description promising a gate that is off would be the same class of
   * lie this option exists to remove.
   */
  get requiresHumanApproval(): boolean {
    return this.#humanApproval !== undefined;
  }

  /**
   * Whether a high-effect fire STAMPED WITH THIS PRINCIPAL has to present a
   * recorded human approval — the question a serving layer must actually ask
   * before it promises a model that this app enforces one.
   *
   * The gate keys on the principal, not the door (fire(), THE APPROVAL GATE): the
   * app-self-report tier — `'user'`, `'system'`, and the record-only sensor —
   * passes, because that motion really happened. So `requiresHumanApproval` alone
   * is the wrong question for a PORT: a port that stamps `'user'` serves a model
   * whose fires this session never gates, and a tool description promising the
   * gate would be a lie told in the library's own voice.
   *
   * Here rather than re-derived at the port, so the rule lives in one place: the
   * thing that answers "is this fire gated?" is the thing that gates it.
   */
  requiresHumanApprovalFrom(principal: Principal): boolean {
    return this.#holdsFiresFrom(principal);
  }

  /**
   * THE PRINCIPAL RULE, and the gate reads it from HERE rather than from the
   * public method above.
   *
   * Both answer the same question, and they must never be able to disagree — a
   * port that is told "gated" while `fire` lets the call through is the lie this
   * whole option removes. Private, so a subclass overriding the public method
   * changes what the app is TOLD and can never change what the gate DOES.
   */
  #holdsFiresFrom(principal: Principal): boolean {
    return this.#humanApproval !== undefined && principal === 'agent';
  }

  /**
   * D18 version split — `version` stays the single total-order cursor; these
   * two say WHAT moved. A scrolling list must never staleness-fail a plan the
   * way a closing modal must; consumers watching for re-render/replan can
   * subscribe to the axis they care about.
   */
  get stateVersion(): number {
    return this.#stateVersion;
  }

  get structureVersion(): number {
    return this.#structureVersion;
  }

  /** The compiled spec every lookup goes through — NavSession overlays mount-declared tools here. */
  protected get spec(): SkillGraphSpec {
    return this.#spec;
  }

  /** The live-binding registry (protected seam for NavSession's per-instance handlers). */
  protected get registry(): ToolRegistry {
    return this.#registry;
  }

  /**
   * The session's dev-warning sink (SessionOptions.onWarn, console.warn by
   * default) — the seam subclass layers already warn through.
   *
   * PUBLIC because the serving layer is a separate module by design: it consumes
   * only this surface, and a warning it could not route through the host's own
   * sink is a warning a host that captures `onWarn` would never see. It says
   * nothing about state, so nothing can be forged with it.
   */
  warn(message: string): void {
    this.#warn(message);
  }

  // -------------------------------------------------------------------------
  // Events — a PASSIVE observer surface (recorder category, session grain).
  // Listeners never change what the session does; a throwing listener is
  // isolated (caught + warned), never aborting the session.
  // -------------------------------------------------------------------------

  /** Subscribe to a session event. Returns an unsubscribe function. */
  on<N extends SessionEventName>(event: N, listener: (payload: SessionEvents[N]) => void): () => void {
    const set = this.#listeners.get(event) ?? new Set<(payload: unknown) => void>();
    set.add(listener as (payload: unknown) => void);
    this.#listeners.set(event, set);
    return () => {
      this.#listeners.get(event)?.delete(listener as (payload: unknown) => void);
    };
  }

  #emit<N extends SessionEventName>(event: N, payload: SessionEvents[N]): void {
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(payload);
      } catch (error) {
        // Observer rule (inherited from footprintjs recorders): a listener
        // error never aborts the session.
        this.#warn(`hcifootprint: '${event}' listener threw: ${String(error)}`);
      }
    }
  }

  /**
   * Copy a live record so a 'transition' listener (or a transitions() caller)
   * can never mutate the log — INCLUDING the object-valued data channels
   * (payload, produced), which are cloned defensively (fall back to the ref if
   * a payload is not structured-cloneable).
   */
  #copyRecord(t: TransitionRecord): TransitionRecord {
    return {
      ...t,
      cause: { ...t.cause },
      evidence: t.evidence ? t.evidence.map((c) => ({ ...c })) : undefined,
      ...(t.guardUnevaluated ? { guardUnevaluated: [...t.guardUnevaluated] } : {}),
      ...(t.askId !== undefined ? { askId: t.askId } : {}),
      ...(t.payload !== undefined ? { payload: cloneSafe(t.payload) } : {}),
      ...(t.produced !== undefined ? { produced: cloneSafe(t.produced) } : {}),
    };
  }

  #emitTransition(record: TransitionRecord): void {
    this.#emit('transition', this.#copyRecord(record));
  }

  /** Increment the state axis and notify observers. (`+= 1` so global bump-replaces skip this.) */
  #bumpState(): void {
    this.#stateVersion += 1;
    this.#emit('state', { version: this.#version, stateVersion: this.#stateVersion });
  }

  /** Increment the structure axis and notify observers. */
  #bumpStructure(): void {
    this.#structureVersion += 1;
    this.#emit('structure', { version: this.#version, structureVersion: this.#structureVersion });
  }

  /** Generate an opaque group identity (never caller-supplied — see ToolGroup). */
  protected nextGroupId(prefix = 'group'): string {
    return `${prefix}#${(this.#groupSeq += 1)}`;
  }

  /**
   * Flip a registered tool between clickable and greyed-out (used by the
   * ToolGroup handle). A real change is world motion — it bumps the structure
   * axis so a stale plan is caught and the surface re-serves.
   */
  protected setToolEnabled(affordanceId: string, enabled: boolean): void {
    if (this.#registry.setEnabled(affordanceId, enabled)) this.noteStructureChange();
  }

  /**
   * Whether firing this tool should be refused as TOOL_DISABLED. Protected seam
   * so InteractionSession can consult the INSTANCE-keyed registration first —
   * a per-row disabled button ('id[instance]') must block, not just the base id.
   *
   * ANY wire saying "disabled" lands here: an app that greys a button knows it
   * in one place, and whichever place that is — a registration field, a handle
   * flip, a live store row, or the authored `enabledWhen` — should reach the
   * agent as the same retriable refusal.
   */
  protected isToolDisabled(affordanceId: string, _opts: FireOptions): boolean {
    return this.declaredDisabled(affordanceId) || this.#registry.isEnabled(affordanceId) === false;
  }

  /**
   * The DECLARATIVE half of disabledness: does the authored `enabledWhen` prove
   * this control is currently greyed out? Protected because the tree layer's
   * instance-aware override still has to ask it — a declaration disables every
   * row of a repeats container at once.
   */
  protected declaredDisabled(affordanceId: string): boolean {
    return this.#disabledByDeclaration(this.spec.affordances[affordanceId]);
  }

  /**
   * `enabledWhen` under the same asymmetry `verify` uses: DISABLED needs proof
   * (one false conjunct proves the conjunction false, whatever the unknown keys
   * hold), and everything else serves the edge unmarked. A key missing from the
   * state view can only ever weaken the answer toward enabled — the library
   * refuses an action because the app said so, never because it could not look.
   */
  #disabledByDeclaration(aff: Affordance | undefined): boolean {
    if (!aff?.enabledWhen) return false;
    return filterVerdict(this.#evalGuard(aff.enabledWhen)) === 'failed';
  }

  /**
   * Re-baseline the coalesced structure fingerprint. A subclass whose
   * structureFingerprint() override reads its OWN fields must call this once
   * at the end of its constructor (the base constructor cannot: a virtual
   * call there would touch subclass fields before they initialize).
   */
  protected resetStructureBaseline(): void {
    this.#structureFingerprint = this.structureFingerprint();
  }

  /** Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references). */
  state(): Record<string, unknown> {
    return structuredClone(this.#stateView());
  }

  // -------------------------------------------------------------------------
  // available — the LLM's action space
  // -------------------------------------------------------------------------

  available(): AvailableSlice {
    // A touring session (allowUnmaterializedFires) stamps the marker even with
    // an empty registry: every edge honestly says "nothing is bound here"
    // BEFORE the agent fires it, instead of staying silent. A session holding
    // a navigate fn arms the flag for the same reason — materialisation is a
    // meaningful question there even before any handler mounts.
    const flagMaterialized =
      this.#registry.hasAny() || this.#allowUnmaterialized || this.#navigate !== undefined;
    const edges: AvailableEdge[] = [];
    for (const aff of Object.values(this.spec.affordances)) {
      if (!aff.on.includes(this.#node)) continue;
      const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
      if (!matched) continue;
      // The wire-shaped input contract, derived once and cached per schema —
      // so this hot path (every refused fire calls available() for its gap
      // row's context) never re-normalizes a zod schema.
      const expects = expectsOf(aff);
      edges.push({
        affordanceId: aff.id,
        description: aff.description,
        role: aff.role,
        // The stamp mirrors the ONE materialisation question handlerFor
        // answers: registered, OR url-materialisable through navigate.
        ...(flagMaterialized
          ? { materialized: this.#registry.isRegistered(aff.id) || this.#urlMaterialisable(aff) }
          : {}),
        // A disabled tool is served WITH the marker (a greyed button the agent
        // can see), never silently hidden — whether the registration site said
        // so or the authored `enabledWhen` proves it.
        ...(this.#registry.isEnabled(aff.id) === false || this.#disabledByDeclaration(aff)
          ? { enabled: false }
          : {}),
        evidence: conditions,
        ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
        schema: aff.schema,
        ...(expects !== undefined ? { expects } : {}),
        highEffect: aff.highEffect,
        binding: aff.binding,
        ...(aff.descriptionSource === 'registration' ? { descriptionSource: 'registration' as const } : {}),
      });
    }
    return { version: this.#version, node: this.#node, edges };
  }

  // -------------------------------------------------------------------------
  // registerTools — the live-binding wire (declare statically, bind dynamically)
  // -------------------------------------------------------------------------

  /**
   * Build a ToolGroup handle for a generated group id. Protected: the PUBLIC
   * registration entry points (registerToolGroup / registerTool) live on
   * InteractionSession (the tree API — they take a node path). The flat/legacy
   * graph registers via {@link registerTools}. `setEnabled` may be overridden
   * for instance-aware key mapping.
   */
  protected makeToolGroup(
    group: string,
    node?: string,
    setEnabled?: (toolId: string, enabled: boolean) => void,
  ): ToolGroup {
    return {
      id: group,
      ...(node !== undefined ? { node } : {}),
      setEnabled: setEnabled ?? ((toolId: string, enabled: boolean) => this.setToolEnabled(toolId, enabled)),
      unregister: () => this.unregisterGroup(group),
    };
  }

  /**
   * Register handlers on the FLAT graph (skillGraph — no node tree). Takes a
   * caller `group` string; the tree API (InteractionSession.registerToolGroup)
   * is preferred where you have a node path — it returns a handle so you never
   * invent a group name.
   */
  registerTools(opts: RegisterToolsOptions): RegisteredTools {
    const unknown = Object.keys(opts.tools).filter((id) => !this.spec.affordances[id]);
    if (unknown.length > 0) {
      throw new Error(
        `hcifootprint: registerTools group '${opts.group}' includes undeclared affordance(s) ` +
          `${unknown.map((u) => `'${u}'`).join(', ')} — declare them in the skill graph first ` +
          `(known: ${Object.keys(this.spec.affordances).join(', ')}).`,
      );
    }
    const triggers: Record<string, (payload?: unknown) => FireResult> = {};
    for (const [affordanceId, handler] of Object.entries(opts.tools)) {
      this.#registry.register(opts.group, affordanceId, handler);
      triggers[affordanceId] = (payload?: unknown) =>
        this.fire(affordanceId, { source: 'user', payload });
    }
    this.noteStructureChange();
    return { triggers, unregister: () => this.unregisterGroup(opts.group) };
  }

  /** Remove every live binding currently owned by `group` (component unmount). */
  unregisterGroup(group: string): string[] {
    const removed = this.#registry.unregisterGroup(group);
    if (removed.length > 0) this.noteStructureChange();
    return removed;
  }

  /** Why an affordance is (or is not) available right now — per-condition evidence. */
  explain(affordanceId: string): Explanation {
    const aff = this.spec.affordances[affordanceId];
    if (!aff) {
      throw new Error(
        `hcifootprint: unknown affordance '${affordanceId}'. Known: ${Object.keys(this.spec.affordances).join(', ')}.`,
      );
    }
    const offeredOnThisNode = aff.on.includes(this.#node);
    const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
    return {
      affordanceId,
      node: this.#node,
      offeredOnThisNode,
      guardPassed: matched,
      available: offeredOnThisNode && matched,
      evidence: conditions,
      ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
    };
  }

  /** Skill-level disclosure for the planning LLM (descriptions + feasibility, no tool detail). */
  availableSkills(): { version: number; node: string; skills: AvailableSkill[] } {
    const skills: AvailableSkill[] = [];
    for (const skill of Object.values(this.spec.skills)) {
      const pre = this.#evalGuard(skill.precondition);
      const entry = this.spec.affordances[skill.steps[0]];
      const entryGuard = this.#evalGuard(entry.guard);
      skills.push({
        id: skill.id,
        description: skill.description,
        steps: [...skill.steps],
        preconditionPassed: pre.matched,
        evidence: pre.conditions,
        ...(pre.unevaluable.length > 0 ? { preconditionUnevaluable: pre.unevaluable } : {}),
        entryAvailable: entry.on.includes(this.#node) && entryGuard.matched,
      });
    }
    return { version: this.#version, node: this.#node, skills };
  }

  // -------------------------------------------------------------------------
  // Skill frames — on-demand disclosure: serve skills, expand tools on commit
  // -------------------------------------------------------------------------

  /**
   * Commit to a skill: opens a frame so toMCPTools()/contextBrief() serve ONLY
   * that skill's currently-fireable steps plus escape tools — the token win
   * (skills for planning, tools on commit). One frame at a time in v0.
   *
   * Never-trap invariant: an agent commit whose entry step cannot materialise
   * right now is refused ENTRY_NOT_MATERIALIZED instead of opening a frame
   * that could never act (see the gate below).
   */
  commitSkill(
    skillId: string,
    opts?: { source?: Principal; expectedVersion?: number },
  ): CommitSkillResult {
    const skill = this.spec.skills[skillId];
    if (!skill) {
      return { ok: false, reason: 'UNKNOWN_SKILL', known: Object.keys(this.spec.skills) };
    }
    if (opts?.expectedVersion !== undefined && opts.expectedVersion !== this.#version) {
      return { ok: false, reason: 'STALE_CURSOR', version: this.#version };
    }
    if (this.#frame) {
      return { ok: false, reason: 'FRAME_ALREADY_OPEN', skillId: this.#frame.skillId };
    }
    const pre = this.#evalGuard(skill.precondition);
    if (!pre.matched) {
      return { ok: false, reason: 'PRECONDITION_FAILED', evidence: pre.conditions };
    }
    const principal = opts?.source ?? 'agent';
    // THE NEVER-TRAP COMMIT GATE (fifth refusal, after the existing four): a
    // skill whose ENTRY step could not act right now must never open its frame
    // — the agent would stand in a narrowed room where the first thing it was
    // promised cannot act. The question is couldMaterialise: handlerFor's
    // widened resolution (registered, else navigate-derived) PLUS any
    // instance-keyed wiring, because the gate refuses only frames that could
    // NEVER act — a repeats entry bound per card CAN act (the fire that
    // follows carries the instance key). Only agent commits outside a tour
    // gate here: a user drives the app itself, and a tour's fires are already
    // honest no-ops. Registered-but-disabled entries pass (TOOL_DISABLED is
    // retriable, not missing wiring). The refusal lands ONE gap row and
    // touches no state — no transition, no commit bundle.
    if (principal === 'agent' && !this.#allowUnmaterialized) {
      const entryId = skill.steps[0];
      const entry = this.spec.affordances[entryId];
      if (!this.couldMaterialise(entryId)) {
        this.recordRejection(entryId, 'ENTRY_NOT_MATERIALIZED', principal, undefined, undefined, {
          gestureKind: entry?.binding?.kind,
          skillId,
        });
        return {
          ok: false,
          reason: 'ENTRY_NOT_MATERIALIZED',
          affordanceId: entryId,
          ...(entry?.binding ? { gesture: entry.binding } : {}),
        };
      }
    }
    this.#frame = {
      skillId,
      status: 'open',
      principal,
      openedAt: Date.now(),
      openedAtVersion: this.#version,
      firedSteps: [],
      inferredSteps: [],
    };
    this.#version++; // the served action space just changed
    this.#bumpStructure();
    return { ok: true, frame: this.#frameCopy()!, plan: this.skillPlan(skillId), version: this.#version };
  }

  /**
   * Close the open frame. Default reason: 'completed' if every step was
   * committed while the frame was open, else 'cancelled'. Returns the closed
   * frame, or null when none was open.
   */
  leaveSkill(opts?: { reason?: 'completed' | 'cancelled' }): SkillFrame | null {
    if (!this.#frame) return null;
    const skill = this.spec.skills[this.#frame.skillId];
    // Completion counts observed AND inferred steps; inferredSteps on the
    // returned frame says which of them were guesses.
    const allDone = skill.steps.every(
      (step) => this.#frame!.firedSteps.includes(step) || this.#frame!.inferredSteps.includes(step),
    );
    this.#frame.status = opts?.reason ?? (allDone ? 'completed' : 'cancelled');
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    const closed = this.#frameCopy(this.#frame);
    this.#frame = null;
    this.#version++; // back to skill-level disclosure
    this.#bumpStructure();
    return closed;
  }

  /** The open skill frame (snapshot), or null. */
  skillFrame(): SkillFrame | null {
    return this.#frameCopy();
  }

  /** Frame history: every closed frame (completed / cancelled / demoted), oldest first. */
  frames(): SkillFrame[] {
    return this.#frames.map((f) => this.#frameCopy(f)!);
  }

  /**
   * The DERIVED intra-skill dependency DAG with live status. Dependencies are
   * computed, never authored: step B depends on step A when A's declared
   * effect.writes overlap B's guard keys — the guard×effect atoms already
   * encode the ordering, so it cannot drift from the graph.
   */
  skillPlan(skillId: string): SkillPlan {
    const skill = this.spec.skills[skillId];
    if (!skill) {
      throw new Error(
        `hcifootprint: unknown skill '${skillId}'. Known: ${Object.keys(this.spec.skills).join(', ')}.`,
      );
    }
    const steps: SkillPlanStep[] = skill.steps.map((stepId) => {
      const aff = this.spec.affordances[stepId];
      const dependsOn = stepDependencies(this.spec.affordances, skill.steps, stepId);

      const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
      const frameForSkill = this.#frame?.skillId === skillId ? this.#frame : null;
      const status = frameForSkill?.firedSteps.includes(stepId)
        ? 'done'
        : frameForSkill?.inferredSteps.includes(stepId)
          ? 'inferred-done'
          : !matched
            ? 'blocked'
            : aff.on.includes(this.#node)
              ? 'ready'
              : 'off-node';
      return {
        affordanceId: stepId,
        description: aff.description,
        status,
        dependsOn,
        onNodes: [...aff.on],
        ...(status === 'blocked' ? { blockedOn: conditions.filter((c) => !c.result) } : {}),
        ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
      } as SkillPlanStep;
    });
    return { skillId, description: skill.description, steps };
  }

  /**
   * skillPlan() for an id the caller did not author — a model's, a URL's, a
   * config file's — answering with a value instead of a throw. Same plan; the
   * failure arm is the UNKNOWN_SKILL shape commitSkill() already returns.
   *
   * skillPlan() keeps throwing, deliberately. Every caller inside the library
   * passes an id the spec itself just yielded, and there an unknown id is a bug
   * that should stop the program, not a branch someone forgets to write. This
   * is the door for ids that arrive from outside, where not-a-skill is an
   * ordinary answer.
   *
   * Membership is Object.hasOwn rather than a truthiness lookup BECAUSE the ids
   * here are untrusted: `skills['constructor']` is truthy on any plain object,
   * so a lookup would sail past the guard and fail downstream reading `.steps`
   * off Object's constructor — a TypeError where the caller asked for exactly
   * the honest "no such skill" this method exists to give.
   */
  trySkillPlan(skillId: string): TrySkillPlanResult {
    if (!Object.hasOwn(this.spec.skills, skillId)) {
      return { ok: false, reason: 'UNKNOWN_SKILL', known: Object.keys(this.spec.skills) };
    }
    return { ok: true, plan: this.skillPlan(skillId) };
  }

  // -------------------------------------------------------------------------
  // fire — apply a transition with provenance
  // -------------------------------------------------------------------------

  /**
   * Returned transition records are LIVE views — settlement updates them in
   * place. `effectStatus` is the opposite: a reading taken at return time, and
   * because the handler is always deferred it can never say 'performed' here.
   * `whenSettled` carries the later truth, once, as a snapshot.
   *
   * `opts` is optional at RUNTIME and required in TypeScript: a JS caller's
   * `fire('page.tool')` is answered instead of crashing on `opts.source`,
   * while a typed caller is still made to name the principal. An omitted
   * source reads as 'agent' — never 'user', which would file a machine's
   * action in the ledger under a human and disarm the never-trap gate below.
   *
   * THE CONFIRM BOUNDARY, stated here because this is the signature an
   * integrator reads. There is no `confirm` field on {@link FireOptions} and
   * there never will be: a boolean the caller controls is not evidence, so the
   * door has no slot for one. `confirm` is a MODE B TOOL ARGUMENT
   * (serve/modes.ts), which means a fire arriving here directly is not gated by
   * `confirm` at any layer — the app's own code owns its session, and 'user' /
   * 'system' / `invoke: false` are the app reporting motion that really
   * happened.
   *
   * What {@link SessionOptions.requireHumanApproval} adds is keyed on the
   * PRINCIPAL rather than the door, so an AGENT-sourced high-effect fire is held
   * wherever it comes from — the Mode B port, the MCP server, the testing
   * harness, or this method called directly — and the proof it must present is
   * {@link FireOptions.askId}, a pointer to a row a human-side door recorded.
   * See THE APPROVAL GATE below.
   */
  fire(affordanceId: string, opts: FireOptions = UNATTRIBUTED_FIRE): FireResult {
    // One reading of the principal for every gate, ledger row and cause below
    // — an opts object built at runtime can arrive with `source` missing even
    // though the default above covered the no-arguments call.
    const source = principalOf(opts);
    const aff = this.spec.affordances[affordanceId];
    if (!aff) {
      const available = this.available().edges.map((e) => e.affordanceId);
      this.recordRejection(affordanceId, 'UNKNOWN_AFFORDANCE', source, undefined, available);
      return { ok: false, reason: 'UNKNOWN_AFFORDANCE', available };
    }
    if (opts.expectedVersion !== undefined && opts.expectedVersion !== this.#version) {
      this.recordRejection(affordanceId, 'STALE_CURSOR', source);
      return { ok: false, reason: 'STALE_CURSOR', version: this.#version };
    }
    if (!aff.on.includes(this.#node)) {
      this.recordRejection(affordanceId, 'NOT_ON_NODE', source);
      return { ok: false, reason: 'NOT_ON_NODE', node: this.#node };
    }
    // Guards are re-evaluated at fire time — plan-time guards are advisory.
    const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
    if (!matched) {
      this.recordRejection(affordanceId, 'GUARD_FAILED', source, conditions);
      return { ok: false, reason: 'GUARD_FAILED', evidence: conditions };
    }
    // The input-less action's door, and the ONE place its law applies. An
    // action the author declared `'none'` on takes nothing: a real payload is
    // refused with the shape it sent (PAYLOAD_INVALID — an existing arm every
    // 0.4/0.5 consumer already handles), and a BLANK one normalizes to nothing
    // at all.
    //
    // Normalizing is the fix for the reported bug, not a convenience: a uniform
    // { value: string, required } relay contract forces a model to send
    // `value: ''` to a click-only control, and that empty string reached the
    // handler and OVERRODE the app's own authored default — selecting nothing.
    // Erasing it here means the payload can never reach the handler again.
    //
    // Exactly this door: a schema-bearing action is untouched ('' is a real
    // value there — clearing a field), and an action that declared no input at
    // all is untouched too, because the library cannot know and does not guess.
    if (aff.noInput) {
      const check = checkNoInput(opts.payload);
      if (!check.ok) {
        this.recordRejection(affordanceId, 'PAYLOAD_INVALID', source);
        return { ok: false, reason: 'PAYLOAD_INVALID', issues: check.issues };
      }
      // Every downstream reader — the record, the handler — sees one normalized
      // truth, because there is one object to read it from.
      opts = { ...opts, payload: undefined };
    }
    // EVERY source answers for the payload, deliberately — including the
    // record-only sensor and the app's own 'user'/'system' fires, which the
    // rules below DO exempt. A schema is the app's statement about its own
    // door, so a fire that disagrees with it is drift worth a ledger row
    // wherever it came from, and this gate has always been source-blind: it is
    // where zod ran in 0.3.0, unchanged. Exempting a source here would quietly
    // change what a published zod consumer already gets.
    if (aff.schema !== undefined) {
      const validation = validatePayload(aff.schema, opts.payload, this.#checkPayloadShape);
      if (!validation.ok) {
        this.recordRejection(affordanceId, 'PAYLOAD_INVALID', source);
        return { ok: false, reason: 'PAYLOAD_INVALID', issues: validation.issues };
      }
    }
    // A greyed-out button: registered but not clickable. Only blocks EXECUTION
    // fires (agent/user) — the record-only DOM sensor (invoke:false) still logs
    // whatever actually happened. Retriable: the app may enable it next tick.
    // Instance-aware via the protected seam (a disabled repeats-row button).
    if (opts.invoke !== false && this.isToolDisabled(affordanceId, opts)) {
      this.recordRejection(affordanceId, 'TOOL_DISABLED', source);
      return { ok: false, reason: 'TOOL_DISABLED', affordanceId };
    }
    // The session is an AGENT's only actuator: with nothing bound and invoke
    // wanted, firing would execute nothing — a success-shaped no-op. Fail closed
    // (the guardUnevaluated stance: never launder a claim as a fact). The app
    // self-reporting its OWN motion (source 'user'/'system', or invoke:false)
    // is real motion and passes untouched. Last of the CAPABILITY refusals, so a
    // greyed tool still says TOOL_DISABLED and a mounting one STILL_MOUNTING —
    // and still ahead of the approval gate below, which is the AUTHORITY
    // question: never send a human to approve an action that is guard-closed,
    // mis-shaped, greyed out or wired to nothing.
    const unmaterialized =
      opts.invoke !== false && this.handlerFor(affordanceId, opts) === undefined;
    const honestNoOp = unmaterialized && source === 'agent';
    // The one question every settlement arm below asks: will OUR side actually
    // execute anything? (`unmaterialized` already answered "invoke wanted but
    // nothing bound" — this is the same lookup, not a second one.)
    const handlerWillRun = opts.invoke !== false && !unmaterialized;
    if (honestNoOp && !this.#allowUnmaterialized) {
      this.recordRejection(affordanceId, 'NOT_MATERIALIZED', source, undefined, undefined, {
        gestureKind: aff.binding?.kind,
      });
      // The declared gesture rides the refusal: "this is a click on the
      // checkout button", not "nothing is bound". The binding is deep-frozen
      // spec data (the same object available() already serves) — safe to share.
      return {
        ok: false,
        reason: 'NOT_MATERIALIZED',
        affordanceId,
        ...(aff.binding ? { gesture: aff.binding } : {}),
      };
    }
    // THE APPROVAL GATE (requireHumanApproval — opt-in, absent by default).
    //
    // Here, in base fire(), because this is the ONE chokepoint: #invokeHandler is
    // the only thing that executes, and its four call sites are all below this
    // line. InteractionSession gates the tree then delegates to super.fire, Mode
    // B and the MCP server call fire(), the testing harness routes through the
    // port — so every door inherits this one gate, and a DIRECT session.fire()
    // is gated too. A gate in the serving layer alone could not bind that call,
    // which is exactly the boundary an expert integrator tripped over.
    //
    // Keyed on the PRINCIPAL, not the door: an agent fire is gated wherever it
    // comes from, while the app-self-report tier (source 'user'/'system', and the
    // record-only sensor's invoke:false) passes — that motion really happened,
    // and refusing it would be the library denying reality.
    //
    // BEFORE the tour arm below, and that is the non-obvious half. A gate placed
    // after it would answer an unapproved high-effect fire with ok:true,
    // executed:false and an 'unmaterialized-fire' row — so an agent could
    // enumerate the high-effect doors by firing them and read success-shaped
    // results back. It also keeps a refused fire from writing a demand row it
    // never earned.
    // Holds the ALLOWED verdict only — a refusal returns above, so nothing below
    // has to re-ask whether the gate said yes.
    let approval: Extract<ApprovalVerdict, { ok: true }> | undefined;
    if (this.#holdsFiresFrom(source) && aff.highEffect && opts.invoke !== false) {
      // THE PAYLOAD THE GATE PROVED IS THE PAYLOAD THAT EXECUTES.
      //
      // `confirmAsk` detaches the ask's input (bound-input.ts) so the human's yes
      // binds to a copy the caller cannot reach. That closed one half of the
      // comparison and left the other half live: the gate judged `opts.payload`
      // here, and `#invokeHandler` then called `handler(opts.payload)` on the
      // NEXT MICROTASK, from the same object. A caller that keeps its reference —
      // an app holding its form state, a relay reusing one args object for the
      // ask and then the fire — could change it in between. No exotic construct
      // needed: `fire()` returns synchronously, so a plain `payload.total =
      // 999999` on the very next line was enough. The gate proved {total:10}, the
      // handler was handed {total:999999}, and the journal read ask → approved →
      // used with nothing wrong in it. A getter or a Proxy does the same inside
      // one statement.
      //
      // So the gate reads the caller's object ONCE and everything downstream
      // reads that copy: the comparison, the record's `payload`, and the handler.
      // Exactly the rule this function already applies to a `noInput` payload
      // above ("one normalized truth, because there is one object to read it
      // from") — the gate is where it was missing.
      //
      // AND A VALUE WE CANNOT COPY IS REFUSED, which is the half bound-input.ts
      // reasoned about on the ask side only. A Proxy over a plain object renders
      // faithfully through `sameInput` (its prototype IS Object.prototype) and
      // throws DataCloneError on structuredClone — so keeping the reference for
      // "the ones we cannot clone" would leave the swap open for the one input
      // shape built to lie about itself. We cannot prove what such a value will
      // be when the handler reads it, and an approval we cannot prove is not an
      // approval. The verdict is asked FIRST so every existing refusal keeps its
      // own more specific reason (a human's no still reports APPROVAL_DECLINED);
      // this can only turn an allow into a refusal, never the other way.
      //
      // MUTATION PROOF: drop the `opts = proven` line and 'the payload is
      // swapped after the gate proved it' goes green as a placed order for
      // 999999. Drop the UNCOPYABLE arm and the Proxy test goes green the same
      // way.
      const bound = boundInput(opts.payload);
      const proven = bound === UNCOPYABLE_INPUT ? opts : { ...opts, payload: bound };
      const verdict = this.#approvalVerdict(affordanceId, aff, proven);
      if (!verdict.ok) return this.#refuseApproval(affordanceId, verdict, source);
      if (bound === UNCOPYABLE_INPUT) {
        return this.#refuseApproval(
          affordanceId,
          { ok: false, reason: 'APPROVAL_MISMATCH', askId: verdict.askId, differs: 'cannot-judge' },
          source,
        );
      }
      approval = verdict;
      opts = proven;
    }
    if (honestNoOp) {
      // Allowed tour fire: the binding the app team still has to build.
      this.#recordUnmaterializedFire(affordanceId, source, aff.binding?.kind);
    }
    // Only ever present on the allowed-no-op path — absence means normal.
    const noOpMarks = honestNoOp ? ({ executed: false, materialized: false } as const) : {};

    const record: TransitionRecord = {
      id: buildRuntimeStageId(affordanceId, this.#counter.value++),
      cause: { kind: 'fired', affordanceId, principal: source },
      timestamp: Date.now(),
      payload: opts.payload,
      outcome: 'pending',
      evidence: conditions,
      // Unevaluated conditions are taken on faith (the app is the enforcer at
      // L0/L1) — the record says so instead of pretending the guard passed.
      ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
      fromNode: this.#node,
      cursorVersion: this.#version,
      // Nothing executed: every effect on this record — including any
      // navigation — is a claim (the tour's honesty marker).
      ...(honestNoOp ? { materialized: false as const } : {}),
    };
    // Link the fire to the decision that authorized it, BEFORE the first emit, so
    // every observer sees the record already joined to its receipts.
    //
    // Two modes, and deliberately no overlap. Under enforcement the gate above
    // already produced the verdict, so it SPENDS it: one yes, one fire. In the
    // default mode the fire itself closes the ask as 'approved' — the 0.6
    // behaviour, untouched. Under enforcement nothing else may write an approving
    // row: `#resolveOpenAsk` would stamp the FIRING principal on a row named
    // 'approved', which is the forgery this option exists to refuse.
    if (approval !== undefined) this.#spendApproval(record, affordanceId, approval, source);
    else if (this.#humanApproval === undefined) this.#resolveOpenAsk(record, affordanceId, source);
    this.#transitions.push(record); this.#emitTransition(record);
    this.#version++; // firing changes the world the next plan must see

    const declaredWrites = aff.effect?.writes ?? [];
    // An allowed no-op never pends on the state tap: nothing ran, so no report
    // is coming for it. Pending here would (a) hang 'awaiting-state' forever and
    // (b) let the NEXT real app report settle this phantom by FIFO — certifying
    // the agent's no-op as the verified cause of motion a human performed. It
    // settles unobservably below instead.
    if (declaredWrites.length > 0 && this.#stateTap && !honestNoOp) {
      // The app owns the real handler; the delta arrives via updateState().
      this.#pending.push({ record, affordance: aff });
      const latch = this.#openEffectLatch(record);
      this.#invokeHandler(record, affordanceId, opts);
      return {
        ok: true,
        transition: record,
        version: this.#version,
        settlement: 'awaiting-state',
        // A report and/or the handler will decide; neither has happened yet.
        effectStatus: 'pending',
        whenSettled: latch.promise,
        ...noOpMarks,
      };
    }
    if (declaredWrites.length > 0) {
      // Nothing will ever report a delta for this record — either the session
      // has no state tap, or it is an allowed no-op that ran nothing. A
      // registered handler settles on ITS completion; with nothing to execute,
      // settle now. Either way effectVerified is honestly 'unobservable'.
      if (handlerWillRun) {
        this.#pending.push({ record, affordance: aff, settleOnCompletion: true });
        const latch = this.#openEffectLatch(record);
        this.#invokeHandler(record, affordanceId, opts);
        return {
          ok: true,
          transition: record,
          version: this.#version,
          settlement: 'awaiting-state',
          effectStatus: 'pending',
          whenSettled: latch.promise,
          ...noOpMarks,
        };
      }
      this.#settle(record, aff, {}, { forceUnobservable: true });
      this.#invokeHandler(record, affordanceId, opts); // structurally a no-op: nothing is bound
      return {
        ok: true,
        transition: record,
        version: this.#version,
        settlement: 'settled',
        // Nothing ran and nothing ever will: this fire is already at rest, and
        // 'unobservable' is the whole truth about an effect no one performed.
        effectStatus: 'unobservable',
        whenSettled: this.#settledEffect(record, 'unobservable').promise,
        ...noOpMarks,
      };
    }
    this.#settle(record, aff, {});
    // THE P0-1 SEAM. The record is committed — but #invokeHandler defers, so
    // with a handler bound the app's side has NOT run yet and can still fail a
    // microtask later (flipping this very record to 'rolled-back'). 'settled'
    // says a commit bundle exists; effectStatus says whether anyone did it.
    const latch = handlerWillRun
      ? this.#openEffectLatch(record)
      : this.#settledEffect(record, 'unobservable');
    this.#invokeHandler(record, affordanceId, opts);
    return {
      ok: true,
      transition: record,
      version: this.#version,
      settlement: 'settled',
      effectStatus: handlerWillRun ? 'pending' : 'unobservable',
      whenSettled: latch.promise,
      ...noOpMarks,
    };
  }

  /**
   * Ledger an ALLOWED no-op agent fire (allowUnmaterializedFires): nothing was
   * refused, so it is not a 'fire-rejected' row — it is the missing binding.
   * Same token-lean shape as every other gap row; exporters see it via onGap.
   */
  #recordUnmaterializedFire(
    affordanceId: string,
    principal: Principal,
    gestureKind?: Binding['kind'],
  ): void {
    this.#pushGap({
      kind: 'unmaterialized-fire',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      ...this.#gapContext(),
      affordanceId,
      principal,
      // The kind string only (token-lean): the backlog says WHICH wiring is
      // missing — a click handler vs a navigate fn — without carrying objects.
      ...(gestureKind !== undefined ? { gestureKind } : {}),
    });
  }

  /**
   * D13: fire() executes when a live binding exists. Fire-and-forget — the
   * app's state tap reports the real delta as usual; a FAILING handler
   * auto-rejects its still-pending transition (or rolls back an
   * already-committed immediate settle) instead of leaving a lie in the log.
   * Failing means thrown OR returned `{ok:false}` (see handler-result.ts):
   * both are the app saying it did not do the thing, so both route
   * identically — only the warning text tells them apart.
   *
   * Attribution safety: while the handler's synchronous portion runs,
   * updateState() attributes to THIS record directly; while the handler is in
   * flight (or failed), bare-FIFO skips this record so a neighbor's report
   * can never steal it.
   */
  #invokeHandler(record: TransitionRecord, affordanceId: string, opts: FireOptions): void {
    if (opts.invoke === false) return; // record-only (the DOM sensor's mode)
    const handler = this.handlerFor(affordanceId, opts);
    if (!handler) return;
    const aff = this.spec.affordances[affordanceId];
    const pendingEntry = this.#pending.find((p) => p.record.id === record.id);
    if (pendingEntry) pendingEntry.handlerInFlight = true;
    void Promise.resolve()
      .then(() => {
        this.#invokingRecordId = record.id;
        try {
          return handler(opts.payload);
        } finally {
          this.#invokingRecordId = null;
        }
      })
      .then((returnValue) => {
        // A handler that FAILED BY RETURNING takes the throw's path, exactly —
        // checked BEFORE the produced capture, because a refusal is the
        // settlement's reason, never planner-visible data. While only a throw
        // reached .catch, a returned {ok:false,error} was stamped onto a
        // COMMITTED transition as `produced`: the failure read as a success.
        if (isReturnedFailure(returnValue)) {
          const reason = failureReason(returnValue);
          this.#handleHandlerFailure(record, reason);
          // Distinct wording from "threw:" so a log reader can tell a protocol
          // refusal from an exception.
          this.#warn(
            `hcifootprint: handler for '${affordanceId}' returned failure: ${String(reason)}`,
          );
          return;
        }
        // Act → get data back: whatever the handler returned (search results, a
        // looked-up record) rides the DATA channel on the record — sanitized +
        // capped so untrusted content can never become planner instructions.
        if (this.#captureProduced && returnValue !== undefined && returnValue !== null) {
          record.produced = sanitizeProduced(returnValue);
        }
        const entry = this.#pending.find((p) => p.record.id === record.id);
        if (!entry) {
          // No pending entry: this fire committed synchronously (no declared
          // writes) and its handler has now run to completion — the only event
          // that will ever answer the 'pending' this fire() returned. If a
          // state report already answered it, resolve-once keeps that answer.
          //
          // The verify contract matters MOST here: a click with no declared
          // writes is precisely the fire that used to say 'performed' on the
          // strength of a handler returning, while nothing on screen moved.
          this.#comeToRest(record, aff);
          return;
        }
        if (entry.settleOnCompletion) {
          // Tapless session: the handler finishing IS the settlement signal.
          this.#pending.splice(this.#pending.indexOf(entry), 1);
          this.#settle(entry.record, entry.affordance, {}, { forceUnobservable: true });
          // Our side ran to completion, which is what 'performed' claims —
          // orthogonal to effectVerified, which stays honestly 'unobservable'
          // because no report exists to check the declared writes against.
          this.#comeToRest(entry.record, entry.affordance);
          return;
        }
        entry.handlerInFlight = false; // async app: the tap's later report may FIFO-settle it
      })
      .catch((error) => {
        this.#handleHandlerFailure(record, error);
        this.#warn(`hcifootprint: handler for '${affordanceId}' threw: ${String(error)}`);
      });
  }

  /**
   * A handler failed — thrown or returned, same routing, because the app's
   * side did not do the thing either way.
   *
   * Idempotent by construction (a repeat pass finds no pending and an outcome
   * that is no longer 'committed'), which is what lets both call sites use it
   * without coordinating.
   */
  #handleHandlerFailure(
    record: TransitionRecord,
    reason: unknown,
    /** Stamped only by the verify route — the third axis, carried, never averaged in. */
    verifyHeld?: false,
  ): void {
    const index = this.#pending.findIndex((p) => p.record.id === record.id);
    if (index >= 0) {
      // Effect never landed: reject the pending so later deltas are not mis-attributed.
      this.#pending.splice(index, 1);
      record.outcome = 'rejected';
      this.#version++;
      this.#emitTransition(record); // observers see the settled (rejected) occurrence
    } else if (record.outcome === 'committed' && record.effectVerified === 'unobservable') {
      // Immediate/tapless settle committed BEFORE the handler ran and the
      // handler failed: the commit was a claim about an action that never
      // happened. Roll it back and, if the settle moved the cursor on the
      // navigation CLAIM, walk the cursor back honestly. A commit backed by
      // REAL evidence (a state report settled it, effectVerified true) is
      // stronger than the handler's failure — that one stands.
      record.outcome = 'rolled-back';
      this.#version++;
      this.#emitTransition(record); // observers see the rolled-back occurrence
      if (record.toNodeClaimed && record.toNode === this.#node && record.fromNode !== this.#node) {
        this.sync(record.fromNode, { stimulus: 'navigation', principal: 'system' });
      }
    }
    // 'refused' is the INVOCATION truth and stands even when the commit does
    // (the evidence-backed case above): the handler failed AND the effect
    // landed are both facts, and the settlement carries them side by side
    // rather than averaging them into one comfortable word.
    this.#resolveEffect(record, 'refused', {
      error: reason,
      ...(verifyHeld !== undefined ? { verifyHeld } : {}),
    });
  }

  /**
   * THE LAST QUESTION A SETTLEMENT ASKS: now that this fire has come to rest,
   * does the app's own {@link VerifyContract} agree that it happened?
   *
   * Called from exactly the three places a fire currently comes to rest as a
   * SUCCESS — an attributed state report, a tapless handler completing, and a
   * synchronous commit whose handler completed. Nowhere else, because nowhere
   * else did anything run: a fire with nothing bound already settles
   * 'unobservable', and re-asking there would only invent a verdict about an
   * action nobody performed.
   *
   * A failure routes through the ordinary failure spine, so the rollback rules
   * are the ones already written and tested: a claims-only commit rolls back
   * (with the honest cursor walk-back a claimed navigation earned), and a
   * commit backed by a REAL state report stands while the settlement still
   * says 'refused' — both truths carried, neither averaged.
   *
   * Idempotent, like that spine: a report that settled this record from inside
   * its own handler's synchronous portion has already asked and answered, and
   * first settlement wins.
   */
  #comeToRest(record: TransitionRecord, aff: Affordance | undefined): void {
    if (!this.#effectLatches.has(record.id)) return; // already at rest — nothing to answer
    const check = checkVerify(
      aff?.verify,
      (filter) => this.#evalGuard(filter),
      () => this.state(), // DETACHED: a predicate must never hold live state
      (message) => this.#warn(message),
    );
    if (check.verdict === 'failed') {
      this.#handleHandlerFailure(record, check.failure, false);
      return;
    }
    this.#resolveEffect(
      record,
      'performed',
      check.verdict === 'none' ? undefined : { verifyHeld: check.verdict === 'held' ? true : 'unevaluable' },
    );
  }

  // -------------------------------------------------------------------------
  // Settlement latches — the promise side of fire() (see traverse/settlement.ts)
  // -------------------------------------------------------------------------

  /** Open the question: a later event (report, handler, reject) will answer it. */
  #openEffectLatch(record: TransitionRecord): SettlementLatch {
    const latch = createSettlementLatch();
    this.#effectLatches.set(record.id, latch);
    return latch;
  }

  /**
   * A fire whose truth is known at the instant it is asked: retained AND
   * delivered in one act. The retention is not bookkeeping — without it,
   * `settlementOf()` would refuse a real fire whose answer this session was
   * already holding, and a refusal that names a live id is a lie.
   */
  #settledEffect(
    record: TransitionRecord,
    effectStatus: FireSettlement['effectStatus'],
  ): SettlementLatch {
    const snapshot = this.#effectSnapshot(record, effectStatus);
    this.#settlements.set(record.id, snapshot);
    return settledNow(snapshot);
  }

  /**
   * The fire's truth as of right now. The transition rides as a COPY: a
   * settlement is a receipt of how the fire came to rest, so handing over the
   * LIVE record would both keep changing under a caller who already read it
   * and let that caller rewrite the trace.
   */
  #effectSnapshot(
    record: TransitionRecord,
    effectStatus: FireSettlement['effectStatus'],
    extra?: SettlementExtra,
  ): FireSettlement {
    return {
      effectStatus,
      outcome: record.outcome,
      transition: this.#copyRecord(record),
      // Only handler-failure paths pass one: reject() refuses without an error
      // object, and inventing one would be a guess. Membership, not truthiness:
      // a handler can genuinely fail with `undefined` as its reason, and the
      // field must still say a reason was given.
      ...(extra && 'error' in extra ? { error: extra.error } : {}),
      // Absent unless a verify contract was declared AND asked (see #comeToRest).
      ...(extra?.verifyHeld !== undefined ? { verifyHeld: extra.verifyHeld } : {}),
      // Parity with producedFor(): a fresh sanitized copy, never the record's own.
      ...(record.produced !== undefined ? { produced: sanitizeProduced(record.produced) } : {}),
    };
  }

  /**
   * Answer an open latch. A missing entry means this fire already came to rest
   * (or never had a caller-visible question) — first settlement wins, and the
   * later motion stays visible through transitions() and the 'transition' event.
   */
  #resolveEffect(
    record: TransitionRecord,
    effectStatus: FireSettlement['effectStatus'],
    extra?: SettlementExtra,
  ): void {
    const latch = this.#effectLatches.get(record.id);
    if (!latch) return;
    const snapshot = this.#effectSnapshot(record, effectStatus, extra);
    // RETAINED BEFORE THE LATCH IS DROPPED. Between these two statements the
    // fire must never be answerable by neither door — and because the guard
    // above returns on an already-closed latch, first-settlement-wins governs
    // the retained copy too: settlementOf() and whenSettled cannot disagree.
    this.#settlements.set(record.id, snapshot);
    this.#effectLatches.delete(record.id);
    latch.settle(snapshot);
  }

  /**
   * How a fire came to rest — asked at ANY time by anyone holding its
   * transitionId. `fire()` hands ITS caller `whenSettled`; this is the same
   * answer for everyone else, and it is the hole the field report named: a
   * promise cannot cross a wire, so a remote agent (or the relay in front of
   * it) held the id and had no way to learn the truth.
   *
   * - Still open → that fire's own latch promise. Same law as `whenSettled`:
   *   one answer, first settlement wins, never rejects.
   * - Already at rest → resolves immediately with a detached copy.
   * - NEVER REPORTED (a fire whose app report never arrives) → the promise
   *   honestly stays open, exactly as `whenSettled` does. There is no timeout
   *   arm on purpose: {@link FireSettlement} excludes 'pending' by
   *   construction, so a timed-out answer could only be a guessed
   *   'unobservable'. When you need an answer that cannot wait, ask the
   *   non-blocking doors — {@link Session.pending}, {@link
   *   Session.settlementIfKnown}, or Mode B's `did_it_work` tool.
   * - Unknown id, or a stimulus/sync/structure-swap row → THROWS
   *   synchronously. A promise that could never resolve is precisely the
   *   failure this method exists to prevent: a mistyped id that waits under
   *   someone's ceiling and then reports a fabricated outcome.
   */
  settlementOf(transitionId: string): Promise<FireSettlement> {
    const open = this.#effectLatches.get(transitionId);
    // Detached on BOTH paths. A latch resolves with ONE snapshot object, and
    // this door is the reason several callers can now be holding it at once —
    // so each asker gets its own copy rather than a shared thing any one of
    // them can edit under the others.
    if (open) return open.promise.then((settlement) => this.#detachSettlement(settlement));
    return Promise.resolve(this.#retainedSettlement(transitionId));
  }

  /**
   * The same answer WITHOUT waiting: the settlement if this fire has already
   * come to rest, `undefined` while its question is still open. Refuses an
   * unknown id exactly as {@link Session.settlementOf} does — one law, two
   * doors.
   *
   * This is the door a SYNCHRONOUS caller needs (Mode B's `did_it_work` tool
   * answers a model inside one tool call and must never block it). `undefined`
   * means "no settlement yet", never a guessed outcome — the caller reports
   * still-pending, which is the truth at that instant.
   */
  settlementIfKnown(transitionId: string): FireSettlement | undefined {
    if (this.#effectLatches.has(transitionId)) return undefined;
    return this.#retainedSettlement(transitionId);
  }

  /**
   * The fires whose settlement question is still OPEN — every id
   * {@link Session.settlementOf} has an answer coming for, in fire order.
   *
   * NOT the same list as {@link Session.pending}, and the difference is the
   * reason this door exists. `pending()` names fires awaiting the app's STATE
   * report, which a fire declaring no writes NEVER joins — it still has a
   * handler running and a settlement coming. So every pending fire is awaiting
   * a settlement, and not every fire awaiting a settlement is pending. Asked
   * "what is still live?", `pending()` alone answers "nothing" about an action
   * that is at that moment running.
   *
   * Ids, not rows: a runtimeStageId already carries the affordance that made it
   * (`catalog.go-checkout#0`), so nothing has to be looked up — or guessed —
   * to say which action is still out there.
   */
  awaitingSettlement(): string[] {
    return [...this.#effectLatches.keys()];
  }

  /** The retained answer, or the teaching refusal for an id that can never have one. */
  #retainedSettlement(transitionId: string): FireSettlement {
    const retained = this.#settlements.get(transitionId);
    if (retained) return this.#detachSettlement(retained);
    throw new Error(this.#noSettlementMessage(transitionId));
  }

  /**
   * Why this id can never have a settlement, said in words that let a caller
   * fix it. A throw follows reject()'s precedent, and it is the point: the
   * alternative — a promise nobody will ever resolve — is the field failure
   * mode itself (a mistyped key waits out a ceiling and then lies). So the
   * message names what IS live.
   */
  #noSettlementMessage(transitionId: string): string {
    // The public door's own list, so the sentence a caller reads and the list
    // a caller can query can never name different fires.
    const open = this.awaitingSettlement();
    const known = this.#transitions.find((t) => t.id === transitionId);
    const what =
      known === undefined
        ? `no transition '${transitionId}' in this session`
        : known.cause.kind === 'fired'
          ? `fire '${transitionId}' opened no settlement`
          : `'${transitionId}' is a '${known.cause.stimulus ?? 'stimulus'}' row — the world moved, nobody fired it`;
    return (
      `hcifootprint: ${what}. Only fire() opens a settlement. ` +
      `Fires still awaiting one: ${open.length > 0 ? open.join(', ') : '(none)'}.`
    );
  }

  /**
   * Hand a retained settlement out without letting the caller rewrite it —
   * the same law #effectSnapshot applies at creation, applied again at every
   * later ask, because the retained copy now outlives its readers. `error`
   * stays by reference, as it does at creation: it is the app's own object,
   * and cloning an Error would quietly drop its stack.
   */
  #detachSettlement(settlement: FireSettlement): FireSettlement {
    return {
      ...settlement,
      transition: this.#copyRecord(settlement.transition),
      ...(settlement.produced !== undefined
        ? { produced: sanitizeProduced(settlement.produced) }
        : {}),
    };
  }

  // -------------------------------------------------------------------------
  // updateState — the app reports reality; pending transitions settle
  // -------------------------------------------------------------------------

  /**
   * Report a projected-state delta from the app (router/store tap).
   *
   * Attribution, in priority order:
   * 1. `opts.transitionId` — settles that pending transition precisely (preferred).
   * 2. `opts.stimulus`/`opts.principal` set — recorded as a stimulus transition,
   *    NEVER attributed to a pending fire (explicit attribution wins; a server
   *    push must not hijack a pending action's provenance).
   * 3. Otherwise: FIFO to the oldest pending fired transition. With several
   *    pendings and out-of-order app handlers this can mis-attribute — pass
   *    transitionId from your tap when you can; effectVerified=false is the
   *    designed detector for key mismatches.
   * 4. No pendings, no hints: recorded as a `stimulus:'unknown'` transition —
   *    state never moves silently.
   *
   * Undefined-valued entries are dropped from the report before anything else
   * (uniformly — new and existing keys): a report cannot store undefined, and
   * a declared write reported as undefined counts as missing
   * (`effectVerified: false`).
   */
  updateState(delta: Record<string, unknown>, opts?: UpdateOptions): UpdateResult {
    // Uniform undefined semantics: entries whose value is undefined are
    // DROPPED from the report — new and existing keys alike, on every
    // attribution path. Before this rule, a NEW key with undefined was
    // dropped while an EXISTING key STORED undefined — and a stored
    // undefined slips through value guards (`ne ''` matches undefined),
    // which let a wrong-payload handler put a null item in a cart while
    // the "item selected" guard passed. A JSON tap cannot even express
    // undefined; from in-process handlers it is always an accident.
    // Consequence: a declared write reported as undefined is a MISSING
    // write — effectVerified flips false, the designed drift detector.
    delta = Object.fromEntries(Object.entries(delta).filter(([, value]) => value !== undefined));

    // Validate BEFORE consuming a pending: a non-cloneable value (function, DOM
    // node) must reject loudly without destroying the attribution queue.
    try {
      structuredClone(delta);
    } catch (error) {
      return { ok: false, reason: 'UNCLONEABLE_DELTA', issues: String(error) };
    }

    if (opts?.transitionId !== undefined) {
      const index = this.#pending.findIndex((p) => p.record.id === opts.transitionId);
      if (index < 0) {
        return {
          ok: false,
          reason: 'UNKNOWN_TRANSITION',
          pending: this.#pending.map((p) => p.record.id),
        };
      }
      const [pending] = this.#pending.splice(index, 1);
      this.#settleAttributed(pending, delta);
      return { ok: true, attributed: true, transition: pending.record, version: this.#version };
    }

    const explicitStimulus = opts?.stimulus !== undefined || opts?.principal !== undefined;

    // A handler reporting synchronously from inside its own invocation settles
    // its OWN record — precise attribution, immune to the burst-fire race.
    if (!explicitStimulus && this.#invokingRecordId !== null) {
      const index = this.#pending.findIndex((p) => p.record.id === this.#invokingRecordId);
      if (index >= 0) {
        const [pending] = this.#pending.splice(index, 1);
        this.#settleAttributed(pending, delta);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
    }

    if (!explicitStimulus && this.#pending.length > 0) {
      // Bare FIFO skips records whose handler is still in flight — the handler
      // has first claim on its own record (see #invokeHandler).
      //
      // OUT OF THE QUEUE FIRST, on every arm below as well as the two above: a
      // settlement now asks the verify contract, and a refusal there re-enters
      // the failure spine, which reads this very queue to decide whether the
      // effect ever landed. A record still sitting in it would be read as one
      // that never settled — and the later splice would find it gone and cut
      // an innocent neighbour out at index -1.
      const index = this.#pending.findIndex((p) => !p.handlerInFlight);
      if (index >= 0) {
        const [pending] = this.#pending.splice(index, 1);
        this.#settleAttributed(pending, delta);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
      // Every pending is handler-in-flight. If the delta covers exactly ONE
      // in-flight pending's declared writes, it is that handler's own report
      // (arriving from its async portion, past the #invokingRecordId window) —
      // settle THAT record precisely instead of stranding it forever.
      const deltaKeys = Object.keys(delta);
      const own = this.#pending.filter((p) => {
        const writes = p.affordance.effect?.writes ?? [];
        return writes.length > 0 && writes.every((key) => deltaKeys.includes(key));
      });
      if (own.length === 1) {
        const pending = own[0];
        this.#pending.splice(this.#pending.indexOf(pending), 1);
        this.#settleAttributed(pending, delta);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
      // Ambiguous or non-matching: fall through to stimulus (never inference —
      // guessing while fires are in flight fabricates duplicates).
    }

    // Tier-2 effect-signature inference — only with NO hints and NO pendings.
    // The no-pendings condition is load-bearing: with an async handler still in
    // flight, ITS own report would otherwise match its affordance's signature
    // and fabricate a duplicate inferred transition while the real pending
    // starves. In-flight world = wait for the pending machinery; guessing is
    // for quiet moments only.
    if (!explicitStimulus && this.#pending.length === 0) {
      const inferred = this.#inferAffordanceForDelta(Object.keys(delta));
      if (inferred) {
        const guardEval = this.#evalGuard(inferred.guard);
        const record: TransitionRecord = {
          id: buildRuntimeStageId(inferred.id, this.#counter.value++),
          cause: { kind: 'fired', affordanceId: inferred.id, principal: 'unknown', inferred: true },
          timestamp: Date.now(),
          outcome: 'pending',
          evidence: guardEval.conditions,
          ...(guardEval.unevaluable.length > 0 ? { guardUnevaluated: guardEval.unevaluable } : {}),
          fromNode: this.#node,
          cursorVersion: this.#version,
        };
        this.#commitDelta(inferred.id, record.id, Object.keys(inferred.guard ?? {}), delta);
        record.outcome = 'committed';
        record.toNode = this.#node; // inference never moves the cursor — that would be guessing twice
        record.effectVerified = true; // writes ⊆ delta by construction of the match
        // This row is a GUESS about who acted, and the library invoked nothing
        // to make it: no handler ran, no fire() opened a latch. So its retained
        // settlement is 'unobservable' — 'performed' would launder the guess
        // into a fact for whoever asks settlementOf() later. The state axis is
        // separate and stays true above: the declared writes really did land.
        this.#settlements.set(record.id, this.#effectSnapshot(record, 'unobservable'));
        this.#transitions.push(record); this.#emitTransition(record);
        this.#version++;
        this.#bumpState();
        // A guessed completion never advances firedSteps, but it must be VISIBLE
        // to the plan — 'inferred-done' — or the agent blind-refires the step.
        if (
          this.#frame &&
          this.spec.skills[this.#frame.skillId].steps.includes(inferred.id) &&
          !this.#frame.firedSteps.includes(inferred.id) &&
          !this.#frame.inferredSteps.includes(inferred.id)
        ) {
          this.#frame.inferredSteps.push(inferred.id);
        }
        this.#checkFrameAfterWorldChange();
        return { ok: true, attributed: false, transition: record, version: this.#version };
      }
    }

    const stimulus = opts?.stimulus ?? 'unknown';
    const record: TransitionRecord = {
      id: buildRuntimeStageId(`stimulus:${stimulus}`, this.#counter.value++),
      cause: { kind: 'stimulus', stimulus, principal: opts?.principal ?? 'system' },
      timestamp: Date.now(),
      outcome: 'pending',
      fromNode: this.#node,
      cursorVersion: this.#version,
    };
    // No tracked reads: the causal layer will honestly flag untracked sources.
    this.#commitDelta(`stimulus:${stimulus}`, record.id, [], delta);
    record.outcome = 'committed';
    record.toNode = this.#node;
    record.effectVerified = 'unobservable';
    this.#transitions.push(record); this.#emitTransition(record);
    this.#version++;
    if (Object.keys(delta).length > 0) this.#bumpState();
    this.#checkFrameAfterWorldChange();
    return { ok: true, attributed: false, transition: record, version: this.#version };
  }

  /** Exactly-one match rule: ambiguity refuses to guess (falls through to stimulus). */
  #inferAffordanceForDelta(deltaKeys: string[]): Affordance | null {
    const candidates = Object.values(this.spec.affordances).filter((aff) => {
      if (!this.#registry.isRegistered(aff.id)) return false;
      if (!aff.on.includes(this.#node)) return false;
      const writes = aff.effect?.writes ?? [];
      if (writes.length === 0) return false;
      if (!writes.every((key) => deltaKeys.includes(key))) return false;
      return this.#evalGuard(aff.guard).matched;
    });
    return candidates.length === 1 ? candidates[0] : null;
  }

  /** Fired transitions still awaiting their state report (oldest first). */
  pending(): PendingInfo[] {
    return this.#pending.map((p) => ({
      id: p.record.id,
      affordanceId: p.affordance.id,
      firedAt: p.record.timestamp,
    }));
  }

  /**
   * The app rejected/rolled back a transition's effect (optimistic UI).
   * Works on a PENDING transition (effect never landed → no bundle) and on an
   * already-SETTLED one (server rejected after the optimistic report): the
   * record flips to rolled-back and the app's compensating delta should follow
   * via updateState — the commit log keeps both writes, honestly.
   */
  reject(
    transitionId: string,
    opts?: { outcome?: 'rejected' | 'rolled-back' | 'superseded' },
  ): TransitionRecord {
    const index = this.#pending.findIndex((p) => p.record.id === transitionId);
    if (index >= 0) {
      const [pending] = this.#pending.splice(index, 1);
      const outcome = opts?.outcome ?? 'rejected';
      pending.record.outcome = outcome;
      this.#version++;
      this.#emitTransition(pending.record);
      this.#resolveEffect(pending.record, refusalStatus(outcome));
      return pending.record;
    }
    const settled = this.#transitions.find((t) => t.id === transitionId && t.outcome === 'committed');
    if (settled) {
      const outcome = opts?.outcome ?? 'rolled-back';
      settled.outcome = outcome;
      this.#version++;
      this.#emitTransition(settled);
      this.#resolveEffect(settled, refusalStatus(outcome));
      return settled;
    }
    throw new Error(
      `hcifootprint: no pending or committed transition '${transitionId}' to reject.`,
    );
  }

  // -------------------------------------------------------------------------
  // sync — reconcile the cursor when the world moved without an offered edge
  // -------------------------------------------------------------------------

  /**
   * The observed node is runtime input from the world, so an unauthored page
   * is NOT an error: the cursor follows reality (off-graph), available()
   * honestly serves zero edges there, and the hop is still recorded.
   */
  sync(observedNode: string, opts?: { stimulus?: StimulusKind; principal?: Principal }): SyncResult {
    if (observedNode === this.#node) {
      return { changed: false, node: this.#node, version: this.#version };
    }
    const offGraph = !this.spec.pages[observedNode];
    const record: TransitionRecord = {
      id: buildRuntimeStageId(`sync:${observedNode}`, this.#counter.value++),
      cause: {
        kind: 'stimulus',
        stimulus: opts?.stimulus ?? 'navigation',
        principal: opts?.principal ?? 'system',
      },
      timestamp: Date.now(),
      outcome: 'committed',
      effectVerified: 'unobservable',
      unverifiedEdge: true, // this hop passed no guard — slices treat it as inferred
      fromNode: this.#node,
      toNode: observedNode,
      cursorVersion: this.#version,
    };
    // Empty commit — footprint's own idiom: empty commits are deliberate cursor stops.
    this.#commitDelta(`sync:${observedNode}`, record.id, [], {});
    this.#node = observedNode;
    this.#transitions.push(record); this.#emitTransition(record);
    this.#version++;
    this.#checkFrameAfterWorldChange();
    // The cursor came to rest somewhere new: is there a way out of it?
    this.#checkDeadEnd();
    return offGraph
      ? { changed: true, transition: record, node: this.#node, version: this.#version, offGraph: true }
      : { changed: true, transition: record, node: this.#node, version: this.#version };
  }

  // -------------------------------------------------------------------------
  // Trace surface — footprint's post-hoc toolchain over this session
  // -------------------------------------------------------------------------

  /** The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition. */
  commitLog(): CommitBundle[] {
    return [...this.#log.list()];
  }

  /**
   * The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
   * bundles by TransitionRecord.id; pending and rejected/rolled-back rows
   * exist only here (their effects never touched state). Rows are snapshots —
   * live records are the ones returned by fire()/updateState()/reject().
   */
  transitions(): readonly TransitionRecord[] {
    return this.#transitions.map((t) => this.#copyRecord(t));
  }

  /** "Why does this state key hold its value?" — footprint backward slice, formatted. */
  why(key: string): string {
    const slice = sliceForKey(this.#log.list(), key, keysReadFromMap(this.#readsByStep));
    return formatSlice(slice);
  }

  /** runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup). */
  readsByStep(): ReadonlyMap<string, string[]> {
    return this.#readsByStep;
  }

  /**
   * Data the given transition's handler RETURNED (search results, a looked-up
   * record) — a fresh snapshot, safe to serialize into a tool result. Available
   * once the handler has resolved, so read it AFTER awaiting the settlement.
   * Returns undefined when the handler returned nothing (or capture is off).
   */
  producedFor(transitionId: string): unknown {
    const record = this.#transitions.find((t) => t.id === transitionId);
    if (record?.produced === undefined) return undefined;
    return sanitizeProduced(record.produced); // fresh copy — consumer mutation must not touch the record
  }

  // -------------------------------------------------------------------------
  // Gap ledger — unmet demand, the input to "which skill should we build next"
  // -------------------------------------------------------------------------

  /**
   * Report an ask that no available action or skill could serve (typically
   * called by the agent's report_gap tool before it apologizes). The row is
   * token-lean by design: the ask plus NAME lists, never descriptions.
   */
  reportGap(opts: ReportGapOptions): GapRecord {
    const row: GapRecord = {
      kind: 'reported',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      ...this.#gapContext(),
      request: opts.request.slice(0, 500),
      reason: opts.reason ?? 'other',
      ...(opts.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
      ...(opts.principal !== undefined ? { principal: opts.principal } : {}),
    };
    this.#pushGap(row);
    return structuredClone(row);
  }

  /** The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline. */
  gaps(): GapRecord[] {
    return this.#gaps.map((g) => structuredClone(g));
  }

  /** Live export hook: fires once per new gap row. Sugar for `on('gap', …)`. */
  onGap(listener: (gap: GapRecord) => void): () => void {
    return this.on('gap', listener);
  }

  /** Every refused fire becomes a gap-ledger row (protected: NavSession adds tree rejections). */
  protected recordRejection(
    affordanceId: string,
    rejectionReason: NonNullable<GapRecord['rejectionReason']>,
    principal: Principal,
    evidence?: FilterCondition[],
    precomputedActions?: string[],
    /** Extra triage words for wiring-shaped refusals (which gesture; which skill asked). */
    detail?: { gestureKind?: Binding['kind']; skillId?: string },
  ): void {
    this.#pushGap({
      kind: 'fire-rejected',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      availableActions: precomputedActions ?? this.available().edges.map((e) => e.affordanceId),
      availableSkills: Object.keys(this.spec.skills),
      affordanceId,
      rejectionReason,
      principal,
      // Copy the CONDITION OBJECTS too — the same objects ride FireResult.evidence,
      // and a caller annotating those must not rewrite the ledger.
      ...(evidence !== undefined ? { evidence: evidence.map((c) => ({ ...c })) } : {}),
      ...(detail?.gestureKind !== undefined ? { gestureKind: detail.gestureKind } : {}),
      ...(detail?.skillId !== undefined ? { skillId: detail.skillId } : {}),
    });
  }

  /** Names only — token-lean and injection-safe context for triage. */
  #gapContext(): { availableActions: string[]; availableSkills: string[] } {
    return {
      availableActions: this.available().edges.map((e) => e.affordanceId),
      availableSkills: Object.keys(this.spec.skills),
    };
  }

  /**
   * THE PAGE-LEVEL NEVER-TRAP. The commit gate refuses a skill FRAME that
   * opens onto an entry nothing can perform; this is the same law one level
   * up, about the room itself. A page where NOTHING the graph puts there could
   * act is a room with no doors: the agent is told the truth ("here is what is
   * available"), fires, is refused, re-reads the same true list, and loops —
   * correctly, on the information it was given. Nobody has to fire for the trap
   * to exist, so nobody has to fire for it to be recorded.
   *
   * ARMED only when materialisation is a live question — `(registry.hasAny()
   * || navigate) && !allowUnmaterializedFires` — the same condition available()
   * uses to stamp `materialized` and commitSkill's entry gate uses to run at
   * all. A session nothing has ever registered on is not "trapped"; it is a
   * graph being read. A tour's fires are honest no-ops by contract.
   *
   * THE QUESTION is couldMaterialise, per edge — the same widened resolution
   * every other never-trap surface asks (registered, else navigate-derived,
   * else instance-wired), so a registered-but-DISABLED action still counts as a
   * door (TOOL_DISABLED is retriable, not missing wiring). It is asked over
   * FULL capability — every affordance the graph places on this page, NOT the
   * available() slice, which two filters have already narrowed. The skill frame
   * is one (so an open frame can never manufacture a dead end); the GUARD is
   * the other, and it matters more: an empty-cart checkout serves zero edges
   * while `pay` sits registered behind `cartCount > 0`. That page is wired. Its
   * refusal is GUARD_FAILED, exactly as retriable as the TOOL_DISABLED this
   * gate already forgives, and the next state report may open it — so calling
   * it missing wiring would be a guessed status prescribing a fix already done.
   *
   * OFF-GRAPH is the OTHER trap and a permanent one: the graph has no page by
   * this name, so nothing on screen can be wired to it and the first fix below
   * would throw ('unknown node'). It gets its own sentence and is asked ONCE.
   *
   * CALLED FROM WRITE PATHS ONLY — never from available(). recordRejection's
   * own #gapContext calls available(), so a read-path emission would recurse
   * through every refusal. The three writes where the cursor rests: sync()
   * landing a page change, a fire()-claimed navigation settling, and the
   * coalesced structure flush (where a mount may have just fixed — or just
   * broken — the room).
   */
  #checkDeadEnd(): void {
    if (this.#allowUnmaterialized) return;
    if (!this.#registry.hasAny() && this.#navigate === undefined) return;
    const offGraph = this.spec.pages[this.#node] === undefined;
    // Keyed on the served-structure FINGERPRINT, not the structure VERSION:
    // that axis also bumps for skill-frame open/close/demote — churn that
    // cannot wire anything, so re-arming on it multiplies rows for a page whose
    // answer never moved. Re-ask when the WIRING changed, never when the
    // disclosure filter did. Off-graph is keyed on the node alone: no structure
    // change can author a page, so a second row would only ever be spam.
    const seenKey = offGraph
      ? `off-graph:${this.#node}`
      : `${this.#node}@${this.structureFingerprint()}`;
    if (this.#deadEndSeen.has(seenKey)) return;
    // Full capability, guards included — see THE QUESTION above. (An off-graph
    // node holds no affordances at all, so this loop honestly finds no door.)
    // The count is kept because it decides which refusal the warning may name:
    // served-none-authored refuses UNKNOWN_AFFORDANCE, served-none-but-authored
    // refuses GUARD_FAILED, and only served-and-unwired refuses NOT_MATERIALIZED.
    let authored = 0;
    for (const aff of Object.values(this.spec.affordances)) {
      if (!aff.on.includes(this.#node)) continue;
      if (this.couldMaterialise(aff.id)) return;
      authored++;
    }
    // Marked BEFORE the push: a gap listener that drives the session back into
    // this same position must find the question already answered.
    this.#deadEndSeen.add(seenKey);
    const context = this.#gapContext();
    this.#pushGap({
      kind: 'dead-end',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      ...context,
      ...(offGraph ? { offGraph: true as const } : {}),
    });
    if (this.#deadEndWarned.has(this.#node)) return;
    this.#deadEndWarned.add(this.#node);
    this.#warn(this.#deadEndWarning(offGraph, context.availableActions.length, authored));
  }

  /**
   * ONE sentence per KIND of dead end, because a dev warning that names the
   * wrong refusal sends someone hunting the wrong bug. Every refusal teaches —
   * but only what is TRUE of this room: 'every fire would be refused
   * NOT_MATERIALIZED' holds ONLY where actions are served-but-unwired, and
   * prescribing registerToolGroup for a page the graph never heard of hands the
   * developer a call that throws.
   */
  #deadEndWarning(offGraph: boolean, served: number, authored: number): string {
    if (offGraph) {
      return (
        `hcifootprint: the cursor is on '${this.#node}', which is NOT a page in this graph — an agent ` +
        `standing here is served nothing, and no mount can change that (registerToolGroup('${this.#node}', …) ` +
        `throws: the node is unknown). Two ways out: author the page — or add it to the route table you pass ` +
        `to fromRoutes — so it has a name and actions; or sync() the id the graph uses for this screen (a raw ` +
        `URL is not a node id unless a route table mapped it). Recorded as a dead-end gap row ONCE: no ` +
        `structure change can change this answer.`
      );
    }
    if (served > 0) {
      return (
        `hcifootprint: page '${this.#node}' offers ${served} action(s) and an agent could perform NONE of ` +
        `them — every fire here would be refused NOT_MATERIALIZED, so an agent that lands on this page can ` +
        `only loop. ${this.#deadEndFixes()}`
      );
    }
    if (authored > 0) {
      return (
        `hcifootprint: page '${this.#node}' serves no actions — every one of the ${authored} authored here ` +
        `is hidden by a closed guard AND none of them is wired, so a fire is refused GUARD_FAILED and ` +
        `opening the guard would only reveal an action nothing can perform. ${this.#deadEndFixes()}`
      );
    }
    return (
      `hcifootprint: page '${this.#node}' has NO actions authored on it at all — an agent that lands here ` +
      `has nothing it can even attempt (a fire is refused UNKNOWN_AFFORDANCE or NOT_ON_NODE, never ` +
      `NOT_MATERIALIZED). ${this.#deadEndFixes()}`
    );
  }

  /** The three cures, shared by every on-graph sentence (off-graph has its own). */
  #deadEndFixes(): string {
    return (
      `Three ways out: registerToolGroup('${this.#node}', …) to wire what is on screen; pass ` +
      `navigate: (href) => router.push(href) to createSession so url gestures materialise; or read the ` +
      `route table with fromRoutes(routes, { crossLinks: true }) so every page offers links to the others. ` +
      `Recorded as a dead-end gap row.`
    );
  }

  #pushGap(row: GapRecord): void {
    this.#gaps.push(row);
    // Per-listener deep copy: exporter mutation must never touch the ledger,
    // nor another listener's view. Routes through the 'gap' observer channel.
    const set = this.#listeners.get('gap');
    if (!set) return;
    for (const listener of set) {
      try {
        listener(structuredClone(row));
      } catch (error) {
        // Consumer export code must never break the session (recorder rule).
        this.#warn(`hcifootprint: gap listener threw: ${String(error)}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Confirm journal — receipts on high-effect asks + the ask→decision→fire chain
  // -------------------------------------------------------------------------

  /**
   * Record a high-effect confirm ask and assemble its RECEIPTS from what the
   * session already knows — the guard evidence that made the edge fireable, the
   * declared (honesty-tagged) effect, the current position, and a compact tail
   * of the fire journal. No new capture: this is a pure read over live state.
   *
   * A serving layer calls this the moment it decides to gate a high-effect edge
   * on human consent, then relays the returned receipts to the person. The
   * returned `askId` is the chain key: the confirmed fire closes it as
   * 'approved' automatically (linked by transitionId), or {@link declineConfirm}
   * closes it as 'declined'. Asking twice for the same edge while an ask is
   * still open SUPERSEDES it (the human is still deciding) — one open ask per
   * affordance. Never throws: an unknown affordance yields a minimal receipt
   * (a serving layer relies on this mid-turn).
   */
  confirmAsk(
    affordanceId: string,
    opts?: {
      source?: Principal;
      /**
       * What the confirmed fire will SEND — recorded on the receipts as
       * `willUse.input`, so the human approves an object and not just a verb.
       * Optional: an ask told nothing shows nothing, and under enforcement a fire
       * carrying an input the card never showed is refused.
       *
       * DETACHED THE MOMENT IT ARRIVES (bound-input.ts): keep your reference and
       * change it after the yes, and the fire is refused APPROVAL_MISMATCH rather
       * than compared against itself.
       */
      input?: unknown;
      /** Which row/instance the card is about (an order id). */
      instance?: string;
    },
  ): { askId: string; receipts: ConfirmReceipts } {
    const principal: Principal = opts?.source ?? 'agent';
    const aff = this.spec.affordances[affordanceId];
    // ONE normalization for both sides of the later comparison — the reason a
    // click-only control asked with input '' and fired with nothing still matches.
    const input = normalizeInput(opts?.input, aff?.noInput === true);
    // The card is assembled from what the caller handed us; the BINDING is a copy
    // the caller cannot reach (bound-input.ts). Same value, two jobs, and they
    // must not be the same object: a caller holding its own reference could
    // otherwise change the payload after the yes and still compare 'same'.
    const bound = boundInput(input);
    const receipts = this.#assembleReceipts(affordanceId, this.#willUse(input, opts?.instance));
    const askId = this.#reuseOrMintAsk(affordanceId, bound, opts?.instance);
    this.#openAsks.set(askId, {
      askId,
      affordanceId,
      input: bound,
      ...(opts?.instance !== undefined ? { instance: opts.instance } : {}),
      askedAtVersion: this.#version,
      askedAtStateVersion: this.#stateVersion,
      askedAt: this.#now(),
    });
    this.#pushConfirm({
      kind: 'ask',
      askId,
      affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      principal,
      receipts,
    });
    // Return a detached copy so a serving layer can serialize/annotate freely.
    return { askId, receipts: structuredClone(receipts) };
  }

  /**
   * Reuse the open ask for this action, or mint a new id.
   *
   * DEFAULT MODE: one open ask per affordance — asking twice SUPERSEDES, exactly
   * as 0.6 did. UNDER ENFORCEMENT only an IDENTICAL re-ask reuses, and that is a
   * closed attack rather than a nicety: with supersede, the card on screen for
   * ask#1 says input A, the agent re-asks the same id with input B, the human
   * clicks Approve on the card they are looking at — and B fires. A differing
   * input mints a NEW id, so the shown card can only ever authorize what it shows.
   */
  #reuseOrMintAsk(affordanceId: string, input: unknown, instance: string | undefined): string {
    for (const ask of this.#openAsks.values()) {
      if (ask.affordanceId !== affordanceId) continue;
      // An answered ask is never re-opened: a decision is not a draft.
      if (ask.answer !== undefined) continue;
      if (this.#humanApproval === undefined) return ask.askId;
      if (sameInput(input, ask.input) === 'same' && (instance ?? undefined) === (ask.instance ?? undefined)) {
        return ask.askId; // an idempotent re-render of the same card
      }
    }
    return this.#mintAskId();
  }

  /** The open (unanswered) asks for one action, oldest first. */
  #openAsksFor(affordanceId: string): OpenAsk[] {
    return [...this.#openAsks.values()].filter(
      (ask) => ask.affordanceId === affordanceId && ask.answer === undefined,
    );
  }

  /**
   * The id of the ask this session is holding for exactly this action and input —
   * the pointer a caller passes as {@link FireOptions.askId}, or hands to
   * {@link Session.approveAsk}.
   *
   * It exists so the serving layer never has to re-derive the library's own
   * identity rules (which values compare, which decline): normalization happens
   * once, here, and the port and the gate can therefore never disagree about
   * which card a fire belongs to. Under enforcement it matches on the input and
   * instance; in the default mode it answers with the open ask for the action. A
   * pure read — nothing is minted, nothing is recorded.
   *
   * PREFERENCE ORDER, and it exists so a refusal can still teach: a usable
   * approval first, then a card the human has not answered, then an ALREADY
   * ANSWERED one. Presenting a spent or declined pointer looks odd until you see
   * what it buys — the gate answers APPROVAL_SPENT or APPROVAL_DECLINED instead
   * of the blank "nobody approved this", so the caller learns that the yes was
   * used, or that the person said no, rather than being sent to ask again.
   */
  openAskFor(affordanceId: string, opts?: { input?: unknown; instance?: string }): string | undefined {
    const aff = this.spec.affordances[affordanceId];
    const input = normalizeInput(opts?.input, aff?.noInput === true);
    let unanswered: string | undefined;
    let answered: string | undefined;
    for (const ask of this.#openAsks.values()) {
      if (ask.affordanceId !== affordanceId) continue;
      if (this.#humanApproval !== undefined) {
        if (sameInput(input, ask.input) !== 'same') continue;
        if ((opts?.instance ?? undefined) !== (ask.instance ?? undefined)) continue;
      }
      if (ask.answer === 'approved' && ask.spent !== true) return ask.askId;
      if (ask.answer === undefined) unanswered ??= ask.askId;
      else answered = ask.askId; // the LATEST answered one — the freshest news
    }
    return unanswered ?? answered;
  }

  /**
   * Close a high-effect ask as DECLINED — the human said no. Records the
   * decision so the chain closes honestly instead of the ask dangling forever
   * (the v1 reality: a declined action was simply never re-called, an invisible
   * event). Closes the open ask for `affordanceId` when one exists; with none
   * open (a pre-emptive decline) it mints a standalone decline row — a refusal
   * is worth recording either way. Returns the row (a deep copy).
   *
   * UNDER `requireHumanApproval` IT CLOSES NOTHING, whatever `principal` says.
   * The row is marked `relayed`, the card stays open, and the person still gets
   * asked. `principal` is an argument, and an argument is a claim: a caller that
   * could close a card by saying `'user'` could bury the question before the
   * human ever saw it. A human's no goes through
   * {@link Session.declineAsk}(askId, { by }) — keyed to the card they answered,
   * with no principal argument to lie with.
   */
  declineConfirm(
    affordanceId: string,
    opts?: { by?: string; note?: string; principal?: Principal },
  ): ConfirmRecord {
    const principal: Principal = opts?.principal ?? 'user';
    const open = this.#openAsksFor(affordanceId);
    if (this.#humanApproval === undefined) {
      const askId = open[0]?.askId ?? this.#mintAskId();
      this.#openAsks.delete(askId);
      return this.#pushDecline(askId, affordanceId, principal, opts);
    }
    // UNDER ENFORCEMENT a decline must be as unforgeable as an approval, or the
    // gate is asymmetric in the attacker's favour twice over: a caller could
    // manufacture "the human said no" to excuse inaction, and — worse — BURY a
    // pending ask by declining it, so the card disappears and the person never
    // sees the question.
    //
    // So this door RECORDS a refusal and closes nothing, whatever principal it is
    // handed. `principal` is an ARGUMENT, and an argument is a claim: honouring
    // 'user' here would have made the burial a one-word request, while
    // `approveAsk` deliberately has no such argument at all. The asymmetry that
    // looked like a design was the hole. A human's no arrives through
    // `declineAsk(askId, { by })` — keyed to the card they answered, `by`
    // required, principal stamped 'user' with nothing to override it.
    //
    // So: the ask stays open, groundTruth keeps saying "Awaiting the human's
    // decision", the row is marked `relayed` so an auditor never has to infer it
    // from a principal the caller chose, and the card stays live.
    const askId = open[0]?.askId ?? this.#mintAskId();
    if (principal === 'user') {
      // The caller believed it was closing a card — an app's own Decline button,
      // or a port constructed with source:'user'. Silence would leave a button
      // that no longer does what its owner thinks it does.
      this.#warnOnceAboutApproval(
        affordanceId,
        'RELAYED_DECLINE',
        `hcifootprint: declineConfirm('${affordanceId}') recorded a REPORT, not the human's decision — the card is still open. Under requireHumanApproval a no that CLOSES a card comes from declineAsk(askId, { by }), the door with no principal argument to lie with.`,
      );
    }
    return this.#pushDecline(askId, affordanceId, principal, opts, true);
  }

  /**
   * One 'declined' row, whoever it came from.
   *
   * Under enforcement this door writes REPORTS only (the human's own no goes
   * through #answerAsk), so the two facts arrive together: `enforced` says the
   * gate was live when it landed, `relayed` says the ask it names is still open.
   */
  #pushDecline(
    askId: string,
    affordanceId: string,
    principal: Principal,
    opts?: { by?: string; note?: string },
    relayed?: true,
  ): ConfirmRecord {
    const row: ConfirmRecord = {
      kind: 'declined',
      askId,
      affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      principal,
      ...(opts?.by !== undefined ? { by: opts.by } : {}),
      ...(opts?.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
      ...(relayed ? { enforced: true as const, relayed, stateVersion: this.#stateVersion } : {}),
    };
    this.#pushConfirm(row);
    return structuredClone(row);
  }

  // -------------------------------------------------------------------------
  // The human-side doors — the ONLY writers of an approval the gate honours
  // -------------------------------------------------------------------------

  /**
   * RECORD THE HUMAN'S ALLOW — wire your Approve button to this.
   *
   * Writes an `'approved'` row with `principal: 'user'` BEFORE any fire, and the
   * fire that spends it must present its `askId`. That ordering is the whole
   * change: the row named 'approved' used to be minted by the very fire it
   * claimed to authorize, stamped with that fire's own principal.
   *
   * SINGLE-USE, on purpose: one yes authorizes one action. A second fire under the
   * same askId refuses APPROVAL_SPENT, and the spend lands its own `'used'` row —
   * so an auditor can count approvals against executions.
   *
   * NO `principal` PARAMETER, and that is the unforgeable shape rather than an
   * omission: this door stamps `'user'` unconditionally, so there is no argument
   * to lie with. Its twin {@link Session.declineAsk} has the same shape for the
   * same reason — a fabricated NO is a forgery too. It authorizes nothing, but it
   * puts a human decision in the auditable journal and takes the question off the
   * person's screen, and neither of those may be reachable by asking politely.
   * ({@link Session.declineConfirm} does take a `principal`, and under
   * enforcement it therefore closes nothing at all.)
   *
   * `by` is REQUIRED: an approval whose decider is unknown is exactly the
   * claim-as-fact this closes. It is a string YOUR host supplies — the library
   * proves a human-principal row exists, never that a particular person
   * authenticated.
   */
  approveAsk(askId: string, opts: { by: string; note?: string }): ApprovalResult {
    const guard = this.#approvalDoorGuard(opts);
    if (guard) return guard;
    const ask = this.#openAsks.get(askId);
    if (!ask) {
      return this.#doorRefusal(
        'UNKNOWN_ASK',
        `hcifootprint: no ask '${askId}' in this session. Ask ids are per-session — pass the id that came back from confirmAsk (or rode the needs-confirm result) in THIS session.`,
      );
    }
    if (ask.answer !== undefined) {
      return this.#doorRefusal(
        'ASK_ALREADY_ANSWERED',
        `hcifootprint: ask '${askId}' was already ${ask.answer}. A decision is never overwritten — ask again for a fresh one.`,
      );
    }
    return { ok: true, record: this.#answerAsk(ask, 'approved', opts) };
  }

  /**
   * RECORD THE HUMAN'S NO for one ask — the unambiguous twin of
   * {@link Session.approveAsk}, keyed by askId because several asks for the same
   * action can be open at once under enforcement.
   *
   * Terminal and permanent: a fire naming this askId refuses APPROVAL_DECLINED for
   * the session's life, and `approveAsk` on it returns ASK_ALREADY_ANSWERED.
   * Nothing here ever deletes a row — a re-ask after a no mints a NEW askId, so
   * an agent grinding a person toward yes leaves a countable trail.
   */
  declineAsk(askId: string, opts: { by: string; note?: string }): ApprovalResult {
    const guard = this.#approvalDoorGuard(opts);
    if (guard) return guard;
    const ask = this.#openAsks.get(askId);
    if (!ask) {
      return this.#doorRefusal('UNKNOWN_ASK', `hcifootprint: no ask '${askId}' in this session.`);
    }
    if (ask.answer !== undefined) {
      return this.#doorRefusal(
        'ASK_ALREADY_ANSWERED',
        `hcifootprint: ask '${askId}' was already ${ask.answer}. A decision is never overwritten.`,
      );
    }
    return { ok: true, record: this.#answerAsk(ask, 'declined', opts) };
  }

  /**
   * RECORD A DURABLE ALWAYS ALLOW — a scoped standing policy, not an approval of
   * one action. Every fire it authorizes lands its own `'used'` row, so the
   * journal shows how many times the standing yes was exercised. That visible
   * count is the auditable price of a durable grant, and it is not optional.
   *
   * SCOPED TO THE ACTION (plus an optional instance) and deliberately NOT to the
   * input — a grant that required identical inputs would be indistinguishable
   * from a single ALLOW and therefore useless. Tell the human the truth in those
   * words: "always allow Add to cart — any item, for the next hour." A reader who
   * assumes ALWAYS ALLOW inherits ALLOW's input binding has been misled by us.
   *
   * A durable grant with no off switch is a permanent hole, so
   * {@link Session.revokeAlwaysApprove} ships with it rather than after it.
   */
  alwaysApprove(
    affordanceId: string,
    opts: { by: string; note?: string; instance?: string; expiresInMs?: number },
  ): ApprovalResult {
    const guard = this.#approvalDoorGuard(opts);
    if (guard) return guard;
    const row: ConfirmRecord = {
      kind: 'always-approved',
      // Its own id family, so an auditor reading a 'used' row can see at a glance
      // whether a standing policy or a single yes authorized the fire.
      askId: this.#mintGrantId(),
      affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      stateVersion: this.#stateVersion,
      principal: 'user',
      by: opts.by,
      ...(opts.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
      ...(opts.instance !== undefined ? { scopeInstance: opts.instance } : {}),
      ...(opts.expiresInMs !== undefined ? { expiresAt: this.#now() + opts.expiresInMs } : {}),
      enforced: true,
    };
    this.#standingGrants.push(row);
    this.#approvalRows.set(row.askId, row);
    this.#pushConfirm(row);
    return { ok: true, record: structuredClone(row) };
  }

  /**
   * WITHDRAW a standing grant. It stops authorizing immediately, and each grant
   * withdrawn lands its own `'revoked'` row carrying that grant's id.
   *
   * Omitting `instance` revokes EVERY grant for the action, instance-scoped ones
   * included. Revocation over-reaches on purpose: the failure mode of a too-broad
   * revoke is one extra trip past the human, and the failure mode of a too-narrow
   * one is a hole the person believed they had closed.
   */
  revokeAlwaysApprove(
    affordanceId: string,
    opts: { by: string; note?: string; instance?: string },
  ): ApprovalResult {
    const guard = this.#approvalDoorGuard(opts);
    if (guard) return guard;
    const matching = this.#standingGrants.filter(
      (grant) =>
        grant.affordanceId === affordanceId &&
        (opts.instance === undefined || grant.scopeInstance === opts.instance),
    );
    if (matching.length === 0) {
      return this.#doorRefusal(
        'UNKNOWN_ASK',
        `hcifootprint: no standing approval for '${affordanceId}' in this session, so there is nothing to withdraw.`,
      );
    }
    let last: ConfirmRecord | undefined;
    for (const grant of matching) {
      this.#standingGrants.splice(this.#standingGrants.indexOf(grant), 1);
      this.#approvalRows.delete(grant.askId);
      last = {
        kind: 'revoked',
        askId: grant.askId,
        affordanceId,
        timestamp: this.#now(),
        node: this.#node,
        version: this.#version,
        stateVersion: this.#stateVersion,
        principal: 'user',
        by: opts.by,
        ...(opts.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
        ...(grant.scopeInstance !== undefined ? { scopeInstance: grant.scopeInstance } : {}),
        enforced: true,
      };
      this.#pushConfirm(last);
    }
    return { ok: true, record: structuredClone(last!) };
  }

  /**
   * The two things every human-side door refuses before it looks at anything else.
   *
   * NOT_ENFORCED is not pedantry: a method that records a row nothing reads is
   * exactly the "recorded decision plus a convenience message" this change exists
   * to stop shipping. The door exists only where it is load-bearing, which is also
   * why the default path stays byte-identical.
   */
  #approvalDoorGuard(opts: { by?: string }): ApprovalResult | undefined {
    if (this.#humanApproval === undefined) {
      return this.#doorRefusal(
        'NOT_ENFORCED',
        'hcifootprint: create the session with requireHumanApproval to make an approval enforceable. Without it fire() does not consult the confirm journal, so this row would authorize nothing.',
      );
    }
    if (typeof opts.by !== 'string' || opts.by.trim() === '') {
      return this.#doorRefusal(
        'NEEDS_DECIDER',
        'hcifootprint: pass by — who decided (an operator id, an email, your own label). An approval whose decider is unknown is the claim-as-fact this option refuses.',
      );
    }
    return undefined;
  }

  #doorRefusal(
    reason: 'UNKNOWN_ASK' | 'ASK_ALREADY_ANSWERED' | 'NEEDS_DECIDER' | 'NOT_ENFORCED',
    explanation: string,
  ): ApprovalResult {
    return { ok: false, reason, explanation };
  }

  /** Answer one ask and record the decision. The entry KEEPS the answer, forever. */
  #answerAsk(
    ask: OpenAsk,
    answer: 'approved' | 'declined',
    opts?: { by?: string; note?: string },
  ): ConfirmRecord {
    ask.answer = answer;
    ask.answeredAt = this.#now();
    if (opts?.by !== undefined) ask.answeredBy = opts.by;
    const row: ConfirmRecord = {
      kind: answer,
      askId: ask.askId,
      affordanceId: ask.affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      // Stamped ALWAYS, enforced only when asked — the honest question a strict
      // host can implement any rule it likes from ("did the app's state change
      // since the human looked?").
      stateVersion: this.#stateVersion,
      // The door has no principal argument, so this cannot be anything else. And
      // NO transitionId: nothing has fired yet, which is the whole point.
      principal: 'user',
      ...(opts?.by !== undefined ? { by: opts.by } : {}),
      ...(opts?.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
      enforced: true,
    };
    this.#approvalRows.set(ask.askId, row);
    this.#pushConfirm(row);
    return structuredClone(row);
  }

  /**
   * The confirm journal (DEEP copies): every high-effect ask and how it was
   * answered — an auditable ask → decision → fire chain (join `transitionId`
   * back to the commit log, `askId` across the three rows). Export it to your
   * audit sink like gaps(); it grows for the session's life.
   */
  confirms(): ConfirmRecord[] {
    return this.#confirms.map((c) => structuredClone(c));
  }

  /** Live export hook: fires once per new confirm row. Sugar for `on('confirm', …)`. */
  onConfirm(listener: (record: ConfirmRecord) => void): () => void {
    return this.on('confirm', listener);
  }

  /**
   * Close an open ask as APPROVED when a matching fire lands (called from fire()).
   * THE DEFAULT PATH ONLY: under enforcement the gate owns the outcome, because
   * this stamps the FIRING principal on a row named 'approved' — an audit trail,
   * never an authorization.
   */
  #resolveOpenAsk(record: TransitionRecord, affordanceId: string, source: Principal): void {
    const askId = this.#openAsksFor(affordanceId)[0]?.askId;
    if (askId === undefined) return;
    this.#openAsks.delete(askId);
    record.askId = askId;
    this.#pushConfirm({
      kind: 'approved',
      askId,
      affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      principal: source,
      transitionId: record.id,
    });
  }

  /** Ask the gate whether a recorded human decision authorizes this fire. */
  #approvalVerdict(affordanceId: string, aff: Affordance, opts: FireOptions): ApprovalVerdict {
    return checkApproval({
      ...(opts.askId !== undefined ? { askId: opts.askId } : {}),
      affordanceId,
      ...(opts.instance !== undefined ? { instance: opts.instance } : {}),
      // The same helper the ask used — parity is what keeps a click-only control
      // from refusing its own legitimate approval.
      input: normalizeInput(opts.payload, aff.noInput === true),
      openAsks: this.#openAsks,
      rowFor: (askId) => this.#approvalRows.get(askId),
      standingGrants: this.#standingGrants,
      stateVersion: this.#stateVersion,
      now: this.#now(),
      rules: this.#humanApproval ?? {},
    });
  }

  /**
   * A crossing attempt with no valid yes: BOTH ledgers, always, never deduped.
   *
   * The gap row is not optional. groundTruth()'s FACTS block reads only
   * 'fire-rejected' rows, so a refusal that skipped it would be INVISIBLE in the
   * block a model is told to trust over its own account — which is the structural
   * hole groundTruth shipped to close. The confirm row is not optional either:
   * the journal is the stream the docs point an auditor at, and a gate whose
   * failed crossings are recorded somewhere else is a gate you can only audit if
   * you already know to look elsewhere.
   *
   * The WARNING is deduped once per (action, reason); the ROWS never are. A
   * repeated forgery is new information.
   */
  #refuseApproval(
    affordanceId: string,
    verdict: Extract<ApprovalVerdict, { ok: false }>,
    source: Principal,
  ): FireResult {
    this.recordRejection(affordanceId, verdict.reason, source);
    this.#pushConfirm({
      kind: 'refused',
      // The pointer the caller PRESENTED, so the row joins what it was trying to
      // use. With none presented the row gets its own id from the same counter —
      // never a recycled ask id, which would join a refusal to an innocent ask.
      askId: verdict.askId ?? this.#mintRefusalId(),
      affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      stateVersion: this.#stateVersion,
      principal: source,
      rejectionReason: verdict.reason,
      enforced: true,
    });
    this.#warnOnceAboutApproval(
      affordanceId,
      verdict.reason,
      `hcifootprint: refused a high-effect fire of '${affordanceId}' — ${verdict.reason}. This session runs with requireHumanApproval, so only an approval it recorded from a person can cross that gate.`,
    );
    switch (verdict.reason) {
      case 'APPROVAL_MISMATCH':
        return { ok: false, reason: verdict.reason, affordanceId, askId: verdict.askId, differs: verdict.differs };
      case 'APPROVAL_REQUIRED':
        return {
          ok: false,
          reason: verdict.reason,
          affordanceId,
          ...(verdict.askId !== undefined ? { askId: verdict.askId } : {}),
        };
      default:
        return { ok: false, reason: verdict.reason, affordanceId, askId: verdict.askId };
    }
  }

  /** One dev warning per (action, reason) for the session's life. */
  #warnOnceAboutApproval(affordanceId: string, reason: string, message: string): void {
    const key = `${affordanceId}@${reason}`;
    if (this.#approvalWarned.has(key)) return;
    this.#approvalWarned.add(key);
    this.#warn(message);
  }

  /**
   * SPEND the verdict the gate produced: link the fire to its decision and record
   * the exercise.
   *
   * The 'used' row is its own row, never a mutation of the 'approved' one. The
   * journal is append-only and rows are handed to listeners as deep copies at push
   * time, so rewriting a pushed row would rewrite history nobody re-reads — and an
   * auditor holding only confirms() must be able to count approvals against
   * executions. Two rows, one yes, one spend, and a double-spend attempt shows up
   * as a 'refused' row rather than as an absence.
   */
  #spendApproval(
    record: TransitionRecord,
    affordanceId: string,
    verdict: Extract<ApprovalVerdict, { ok: true }>,
    source: Principal,
  ): void {
    record.askId = verdict.askId;
    // A standing grant is never consumed — that is what durable means. Only a
    // single ALLOW is spent, and the next fire under it refuses APPROVAL_SPENT.
    if (verdict.via === 'approved') {
      const ask = this.#openAsks.get(verdict.askId);
      if (ask) ask.spent = true;
    }
    this.#pushConfirm({
      kind: 'used',
      askId: verdict.askId,
      affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      stateVersion: this.#stateVersion,
      // The principal that ACTED, not the one that approved — the approving row
      // holds that, and folding them together would lose which is which.
      principal: source,
      transitionId: record.id,
      enforced: true,
    });
  }

  /** What the card will SEND — bounded exactly like every other captured value. */
  #willUse(input: unknown, instance?: string): ConfirmWillUse | undefined {
    const shown: ConfirmWillUse = {
      ...(input !== undefined ? { input: sanitizeProduced(input) } : {}),
      ...(instance !== undefined ? { instance } : {}),
    };
    // Absent stays absent: an ask told nothing shows nothing, rather than an empty
    // object a reader would take for "this action sends nothing".
    return Object.keys(shown).length > 0 ? shown : undefined;
  }

  /** Assemble the receipts pack from live state — no new capture, all reads. */
  #assembleReceipts(affordanceId: string, willUse?: ConfirmWillUse): ConfirmReceipts {
    const aff = this.spec.affordances[affordanceId];
    const { conditions, unevaluable } = aff
      ? this.#evalGuard(aff.guard)
      : { conditions: [] as FilterCondition[], unevaluable: [] as string[] };
    const writes = aff?.effect?.writes;
    const declaresWrites = (writes?.length ?? 0) > 0;
    const willDo: ConfirmWillDo = {
      does: aff?.description ?? affordanceId,
      ...(declaresWrites ? { writes: [...writes!] } : {}),
      ...(aff?.effect?.navigatesTo ? { navigatesTo: aff.effect.navigatesTo } : {}),
      // A declared write with no state tap can never be verified (settlement is
      // effectVerified:'unobservable') — say so up front, don't show a claim we
      // cannot check.
      ...(declaresWrites && !this.#stateTap ? { effectUnverifiable: true } : {}),
    };
    return {
      willDo,
      // Copy the condition objects — the same objects ride available().evidence;
      // a consumer annotating a receipt must never rewrite the trace.
      because: conditions.map((c) => ({ ...c })),
      ...(unevaluable.length > 0 ? { becauseUnevaluated: [...unevaluable] } : {}),
      // The one runtime value in the pack, and the reason the approval can bind to
      // an object rather than only to a verb.
      ...(willUse !== undefined ? { willUse } : {}),
      youAreOn: this.#node,
      version: this.#version,
      recentSteps: this.#recentTrail(),
    };
  }

  /** A compact, injection-safe tail of the fire journal (names + principal + outcome). */
  #recentTrail(max = 5): ConfirmTrailStep[] {
    return this.#transitions.slice(-max).map((t) => ({
      what:
        t.cause.kind === 'fired'
          ? t.cause.affordanceId ?? 'unknown'
          : `stimulus:${t.cause.stimulus ?? 'unknown'}`,
      principal: t.cause.principal,
      outcome: t.outcome,
    }));
  }

  /**
   * Three id families, ONE counter — so every id is unique across all of them and
   * an auditor can read what a row is from its prefix alone: `ask#N` is a question
   * put to a human, `grant#N` a standing policy, `refusal#N` a crossing attempt
   * that presented no pointer at all. Never caller-supplied.
   */
  #mintAskId(): string {
    return `ask#${(this.#askSeq += 1)}`;
  }

  #mintGrantId(): string {
    return `grant#${(this.#askSeq += 1)}`;
  }

  #mintRefusalId(): string {
    return `refusal#${(this.#askSeq += 1)}`;
  }

  #pushConfirm(row: ConfirmRecord): void {
    this.#confirms.push(row);
    // Per-listener deep copy (the gap-ledger discipline): exporter mutation must
    // never touch the journal, nor another listener's view.
    const set = this.#listeners.get('confirm');
    if (!set) return;
    for (const listener of set) {
      try {
        listener(structuredClone(row));
      } catch (error) {
        // Consumer export code must never break the session (recorder rule).
        this.#warn(`hcifootprint: confirm listener threw: ${String(error)}`);
      }
    }
  }

  /**
   * Per-edge MCP tool descriptors for the CURRENT slice. Regenerated per call
   * — never cached. With a skill frame open, serves ONLY the frame's
   * currently-fireable steps + escape tools (authored cancel/back roles and a
   * synthetic leave-skill) — the on-demand disclosure contract.
   */
  toMCPTools(opts?: { lossySchemas?: boolean }): MCPToolDescription[] {
    const served = this.#servedEdges();
    const tools = edgesToMCPTools(this.spec, served.edges, opts);
    if (served.escape) tools.push(leaveSkillTool(this.spec, this.#frame!.skillId));
    return tools;
  }

  /**
   * Token-lean, prompt-ready session context for the next chat turn: current
   * position, the open frame, and who did what since `sinceVersion` (the
   * agent's last look). Built from AUTHORED strings and structural facts only
   * — state values and payloads never enter the text.
   */
  contextBrief(opts?: ContextBriefOptions): ContextBrief {
    const sinceVersion = opts?.sinceVersion;
    const max = opts?.maxTransitions ?? 20;
    const relevant = this.#transitions.filter(
      (t) => sinceVersion === undefined || t.cursorVersion >= sinceVersion,
    );
    const omitted = Math.max(0, relevant.length - max);
    const shown = relevant.slice(-max);
    const changedKeysById = new Map(
      this.#log
        .list()
        .map((b) => [b.runtimeStageId, Object.keys({ ...(b.overwrite ?? {}), ...(b.updates ?? {}) })]),
    );

    const lines: string[] = [`You are on: ${this.#nodeLabel(this.#node)}.`];
    if (this.#frame) {
      const skill = this.spec.skills[this.#frame.skillId];
      lines.push(
        `Open skill: ${this.#frame.skillId} — ${skill.description} ` +
          `(${this.#frame.firedSteps.length}/${skill.steps.length} steps done).`,
      );
    }
    for (const f of this.#frames) {
      if (f.status !== 'demoted') continue;
      if (sinceVersion !== undefined && (f.closedAtVersion ?? 0) < sinceVersion) continue;
      lines.push(`Note: skill ${f.skillId} was demoted — its precondition no longer holds.`);
    }
    lines.push(
      sinceVersion !== undefined
        ? `Since version ${sinceVersion} (now ${this.#version}):`
        : `Session so far (version ${this.#version}):`,
    );
    if (shown.length === 0) lines.push('  (no actions)');
    if (omitted > 0) lines.push(`  … ${omitted} earlier action(s) omitted.`);
    for (const t of shown) lines.push(`  • ${this.#briefLine(t, changedKeysById)}`);

    const pend = this.pending();
    lines.push(
      pend.length
        ? `Pending (awaiting app state): ${pend.map((p) => p.affordanceId).join(', ')}.`
        : 'Pending: none.',
    );
    const served = this.#servedEdges();
    const names = served.edges.map((e) => e.affordanceId + (e.highEffect ? ' [high-effect]' : ''));
    if (served.escape) names.push('leave-skill');
    lines.push(`Available now: ${names.length > 0 ? names.join(', ') : '(nothing on this page)'}.`);

    return { node: this.#node, version: this.#version, frame: this.#frameCopy(), text: lines.join('\n') };
  }

  // -------------------------------------------------------------------------
  // groundTruth — the authoritative FACTS block (what HAPPENED, nothing else)
  // -------------------------------------------------------------------------

  /**
   * What this session ACTUALLY did, in words a model is told outrank the
   * conversation: where it is, every attempt and how each came to rest, what a
   * human is still deciding, and what the app has not answered yet.
   *
   * The sibling of {@link Session.contextBrief}, and separate from it on
   * purpose. The brief serves position + options + narrative, and the field
   * exposed a structural hole in that: a REFUSED fire is a gap-ledger row, not
   * a transition, so failed attempts never appeared in it. With the failures
   * invisible and nothing else grounding it, a model narrated an entire flow
   * — "name set, recipe selected" — having called zero tools. Its own prose had
   * become its context. This block merges BOTH ledgers so a refusal is as
   * visible as a success, and states the anti-narration sentence outright when
   * nothing has happened at all.
   *
   * Facts only. Options are whats_here's job, values and payloads belong to the
   * data channel, and nothing here interprets: one line per occurrence.
   */
  groundTruth(opts?: GroundTruthOptions): GroundTruth {
    const sinceVersion = opts?.sinceVersion;
    const max = opts?.maxAttempts ?? 20;
    // Walked ONCE and rendered LAST: the rows are cheap references, the lines
    // are strings, and a long session must not build five thousand of them to
    // print twenty.
    const all = this.#attemptRows();
    const attempts = sinceVersion === undefined ? all : all.filter((row) => row.at >= sinceVersion);
    const omitted = Math.max(0, attempts.length - max);
    const shown = attempts.slice(-max);

    const lines: string[] = [FACTS_HEADER, ...this.positionLines()];
    if (shown.length === 0) {
      // THE anti-narration sentence — said plainly, because the failure it
      // answers was a model filling a silence with its own prose.
      //
      // It claims the whole SESSION, so it is only said where that is true. A
      // cursor that hides real earlier attempts gets the cursor's own sentence
      // and their count instead: a block a model is told to trust above its own
      // memory can never be the thing that denies what happened.
      lines.push(
        all.length > 0
          ? `No actions have been performed since version ${sinceVersion} — ${all.length} earlier attempt(s) this session are not listed.`
          : NOTHING_ATTEMPTED,
      );
    } else {
      lines.push(
        sinceVersion !== undefined
          ? `Attempts since version ${sinceVersion} (now ${this.#version}):`
          : `Attempts so far (version ${this.#version}):`,
      );
      if (omitted > 0) lines.push(`  … ${omitted} earlier attempt(s) omitted.`);
      for (const row of shown) lines.push(`  • ${this.#attemptLine(row)}`);
    }
    // Three states, three authored lines, every one routed through #actionLabel so
    // an id the graph does not have renders as a constant.
    //
    // The two answered lines exist because marking an ask ANSWERED would otherwise
    // silence the awaiting line in exactly the window that matters most: a
    // recorded human approval that nothing has acted on yet, and a no the agent
    // might quietly re-ask around. `by` and `note` are deliberately NOT rendered —
    // they are caller-supplied runtime strings, and this block carries structural
    // facts only. `by` is the AUDIT field; facts gets the fact.
    //
    // BOUNDED WHERE IT CAN BE MINTED, and only there. Under enforcement every
    // distinct input mints a new ask, so a model calling all turn could add a
    // line per call to the one block it is told to trust ABOVE its own account —
    // the attempts list caps itself eleven lines above for exactly this reason.
    // The OLDEST cards are the ones kept: burying the question a person is
    // actually looking at under forty fresh ones is the move this refuses.
    // Answered lines are never capped — only a human-side door writes one, so
    // their number is the person's own doing and hiding a recorded decision is
    // the one thing this block must never do.
    let awaitingShown = 0;
    let awaitingOmitted = 0;
    for (const ask of this.#openAsks.values()) {
      const what = this.#actionLabel(ask.affordanceId);
      if (ask.answer === undefined) {
        if (awaitingShown < max) {
          lines.push(`Awaiting the human's decision: ${what} (${ask.askId}).`);
          awaitingShown++;
        } else awaitingOmitted++;
      } else if (ask.answer === 'approved' && ask.spent !== true) {
        lines.push(`Approved by the human, not yet done: ${what} (${ask.askId}).`);
      } else if (ask.answer === 'declined') {
        lines.push(`The human declined: ${what} (${ask.askId}).`);
      }
    }
    if (awaitingOmitted > 0) {
      lines.push(`  … ${awaitingOmitted} more await the human's decision, not listed.`);
    }
    const pend = this.pending();
    if (pend.length > 0) {
      lines.push(`Awaiting the app's report: ${pend.map((p) => this.#actionLabel(p.affordanceId)).join(', ')}.`);
    }
    return { node: this.#node, version: this.#version, text: lines.join('\n') };
  }

  /**
   * WHERE the reader is — the cursor section of the facts block. Protected
   * because the tree layer knows one more true thing about position (focus
   * below the page level) and says it the same way contextBrief already does.
   */
  protected positionLines(): string[] {
    return [`You are on: ${this.#nodeLabel(this.#node)}.`];
  }

  /**
   * Every attempt, both ledgers merged — the transitions somebody fired and the
   * gap rows for the fires this session refused.
   *
   * Ordered by CURSOR VERSION, not by timestamp, and that is a proof rather
   * than a heuristic: a refusal never bumps the version, and a recorded fire
   * bumps it immediately, so every row carrying version V happened inside the
   * window that ONE transition closed — refusals first, the transition last.
   * Timestamps could only tie at millisecond grain and invent an order.
   *
   * 'reported' and 'dead-end' gap rows are deliberately absent: the first is
   * runtime free text, and neither is an attempt to act.
   *
   * References, not sentences — the caller slices first and renders after.
   */
  #attemptRows(): AttemptRow[] {
    const rows: AttemptRow[] = [];
    for (const gap of this.#gaps) {
      if (gap.kind === 'fire-rejected') rows.push({ at: gap.version, rank: 0, gap });
    }
    for (const t of this.#transitions) {
      if (t.cause.kind === 'fired') rows.push({ at: t.cursorVersion, rank: 1, fired: t });
    }
    rows.sort((a, b) => a.at - b.at || a.rank - b.rank);
    return rows;
  }

  /** One attempt in plain words — a refused fire, or a recorded one. */
  #attemptLine(row: AttemptRow): string {
    return row.rank === 0 ? this.#refusedLine(row.gap) : this.#firedLine(row.fired);
  }

  /** A fire this session refused: it did not happen, and the reason is the typed one. */
  #refusedLine(gap: GapRecord): string {
    const who = gap.principal ?? 'someone';
    const what = this.#actionLabel(gap.affordanceId);
    // A commit gate's refusal, not a fire's — the ONE row that carries a skill.
    // Saying "fired" about it would report an attempt that never happened,
    // inside the block whose whole job is not doing that.
    if (gap.skillId !== undefined) {
      return `did NOT happen — ${who}'s attempt to start ${gap.skillId} was refused: ${gap.rejectionReason} (its first step is ${what})`;
    }
    return `did NOT happen — ${who}'s fire of ${what} was refused: ${gap.rejectionReason}`;
  }

  /**
   * One recorded fire, in plain words. The leads are graded and never rounded
   * up: only a committed fire whose DECLARED effect was observed earns "DID
   * happen", and a fire nobody could check says so instead of borrowing the
   * stronger word. That grading is what makes the block worth trusting.
   */
  #firedLine(t: TransitionRecord): string {
    const { lead, note } = this.#attemptVerdict(t);
    const notes = [note, ...(t.cause.inferred ? ['attributed by inference, not observed'] : [])];
    return `${lead} — ${t.cause.principal} fired ${this.#actionLabel(t.cause.affordanceId)} (${notes.join('; ')})`;
  }

  #attemptVerdict(t: TransitionRecord): { lead: string; note: string } {
    if (t.materialized === false) {
      return { lead: 'did NOT happen', note: 'nothing in this app is wired to perform it, so nothing ran' };
    }
    if (t.outcome === 'pending') {
      return { lead: 'not yet known', note: 'the app has not reported back yet' };
    }
    // The app's OWN check said no. It reads over the record's outcome because
    // it can disagree with it: a commit backed by a real state report STANDS
    // while the settlement refuses, and without this the facts block would say
    // "DID happen" about an action the app itself had just denied.
    if (this.#settlements.get(t.id)?.verifyHeld === false) {
      return { lead: 'did NOT happen', note: "the app's own verify contract did not hold afterwards" };
    }
    if (t.outcome === 'rejected') return { lead: 'did NOT happen', note: 'the app refused it' };
    if (t.outcome === 'rolled-back') return { lead: 'did NOT happen', note: 'it was rolled back' };
    if (t.outcome === 'superseded') {
      return { lead: 'ran, but the outcome was never observed', note: 'tracking of it stopped (superseded)' };
    }
    if (t.effectVerified === true) return { lead: 'DID happen', note: 'committed; declared effect observed' };
    if (t.effectVerified === false) {
      return { lead: 'ran, but the declared effect was NOT observed', note: 'committed' };
    }
    return {
      lead: 'ran, but the effect was unobservable',
      note: 'committed; nothing reported an effect to check it against',
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  #stateView(): Record<string, unknown> {
    return (this.#heap.getState() ?? {}) as Record<string, unknown>;
  }

  /**
   * Resolve what would EXECUTE a fire — the one materialisation question,
   * answered in one place. Protected seam: NavSession keys repeats-container
   * handlers by instance ('cancel-order[o-123]'). Resolution order:
   *
   *   (a) a registry handler wins, byte-identical to before navigate existed;
   *   (b) else, IF the session holds `navigate` AND the edge's gesture yields
   *       a literal href (an explicit url binding, else the fully-literal
   *       route of the page named by effect.navigatesTo), a SYNTHESIZED
   *       handler `() => navigate(href)` — it rides the existing invocation
   *       machinery, so resolve → 'performed' and throw → 'refused' with the
   *       honest rollback, exactly like a registered handler;
   *   (c) else undefined → agent fires refuse NOT_MATERIALIZED as always.
   *
   * click/tab/programmatic gestures NEVER synthesize — they are not addresses;
   * for them navigate changes only the WORDS of the refusal (FireResult.gesture).
   */
  protected handlerFor(affordanceId: string, _opts: FireOptions): ToolHandler | undefined {
    const registered = this.#registry.handlerFor(affordanceId);
    if (registered) return registered;
    const navigate = this.#navigate;
    if (navigate === undefined) return undefined;
    const aff = this.spec.affordances[affordanceId];
    if (!aff) return undefined;
    const href = gestureHref(aff, this.spec.pages);
    if (href === undefined) return undefined;
    return () => navigate(href);
  }

  /** Whether navigate could materialise this edge right now (the available() stamp's half of the question). */
  #urlMaterialisable(aff: Affordance): boolean {
    return this.#navigate !== undefined && gestureHref(aff, this.spec.pages) !== undefined;
  }

  /**
   * The COMMIT gate's materialisation question — deliberately broader than one
   * fire's. handlerFor answers "would THIS call execute?" and needs the
   * caller's instance to say so; the never-trap gate asks "could this edge act
   * AT ALL right now, for any caller?" — refusing an edge that CAN act is the
   * false refusal the gate exists to prevent. The base session has no instance
   * convention, so here the two questions coincide; NavSession widens this
   * with its instance-keyed registrations ('cancel-order[o-123]').
   */
  protected couldMaterialise(affordanceId: string): boolean {
    return this.handlerFor(affordanceId, { source: 'agent' }) !== undefined;
  }

  /**
   * D18: registration/presence flips ARE world motion — but coalesced. Raw
   * registry edits apply immediately; the trace row + version bump flush once
   * per microtask, and a leave+enter of the same shape within one window
   * cancels to nothing (StrictMode double-mounts and HMR never pollute the
   * trace). This also fixes the verified v1 gap: registerTools never bumped
   * the version, so a plan made before a mount/unmount passed CAS after it.
   */
  protected noteStructureChange(): void {
    if (this.#structureFlushScheduled) return;
    this.#structureFlushScheduled = true;
    queueMicrotask(() => {
      this.#structureFlushScheduled = false;
      const now = this.structureFingerprint();
      if (now === this.#structureFingerprint) return; // net-zero churn: no row, no bump
      this.#structureFingerprint = now;
      const record: TransitionRecord = {
        id: buildRuntimeStageId('stimulus:structure-swap', this.#counter.value++),
        cause: { kind: 'stimulus', stimulus: 'structure-swap', principal: 'system' },
        timestamp: Date.now(),
        outcome: 'committed',
        effectVerified: 'unobservable',
        fromNode: this.#node,
        toNode: this.#node,
        cursorVersion: this.#version,
      };
      // Empty commit — footprint's deliberate-cursor-stop idiom.
      this.#commitDelta('stimulus:structure-swap', record.id, [], {});
      this.#transitions.push(record); this.#emitTransition(record);
      this.#version++;
      this.#bumpStructure();
      this.#checkFrameAfterWorldChange();
      // The served structure just changed under a stationary cursor — the one
      // moment a page can become (or stop being) a room with no doors.
      this.#checkDeadEnd();
    });
  }

  /**
   * What "the served structure" looks like right now — compared at flush time
   * against the last flushed value. NavSession extends this with the presence
   * set and visibility signals.
   */
  protected structureFingerprint(): string {
    // Include enabled state so a setEnabled() flip is world motion (the served
    // surface changed), just like a mount/unmount.
    return this.#registry
      .registrations()
      .map((r) => r.affordanceId + (r.enabled ? '' : ':off'))
      .sort()
      .join('|');
  }

  /**
   * Guard evaluation with the D18 honesty split: conditions over keys the
   * state view has never contained are UNEVALUABLE, not false. Evaluable
   * conditions decide matched; unevaluable keys are returned as a marker so
   * edges are served-with-honesty instead of silently hidden — the rung-killer
   * fix that lets one authored graph work at every rung of the ladder.
   */
  #evalGuard(guard: WhereFilter | undefined): {
    matched: boolean;
    conditions: FilterCondition[];
    unevaluable: string[];
  } {
    if (!guard) return { matched: true, conditions: [], unevaluable: [] };
    const state = this.#stateView();
    // A key holding undefined is as unevaluable as an absent one: operators
    // like `ne ''` would MATCH undefined, so a guard authored to mean "a
    // value is set" would pass exactly when it is not. Honesty over guessing:
    // serve the edge with the guardUnevaluated marker instead. (updateState
    // drops undefined from reports; this also covers undefined handed in via
    // the initial state.)
    const evaluableKey = (key: string) => state[key] !== undefined;
    const unevaluable = Object.keys(guard).filter((key) => !evaluableKey(key));
    if (unevaluable.length === 0) {
      const { matched, conditions } = evaluateFilter(
        (key) => state[key],
        (key) => this.#redacted.has(key),
        guard,
      );
      return { matched, conditions, unevaluable };
    }
    const evaluable = Object.fromEntries(
      Object.entries(guard).filter(([key]) => evaluableKey(key)),
    ) as WhereFilter;
    // evaluateFilter deliberately never matches {} — an all-unevaluable guard
    // must not fall into that anti-vacuous-truth rule, so short-circuit.
    if (Object.keys(evaluable).length === 0) return { matched: true, conditions: [], unevaluable };
    const { matched, conditions } = evaluateFilter(
      (key) => state[key],
      (key) => this.#redacted.has(key),
      evaluable,
    );
    return { matched, conditions, unevaluable };
  }

  /**
   * A state report the ladder attributed to a pending fire: settle the record,
   * then close its settlement latch as 'performed'.
   *
   * The latch is answered HERE and not inside #settle, because #settle is also
   * how a fire with no declared writes commits synchronously — before its
   * handler has run. Resolving there would re-tell the exact lie this fixes
   * ("committed" read as "the app did it"). Only these attributed paths, plus
   * a handler running to completion, are evidence that anyone performed it.
   */
  #settleAttributed(pending: PendingTransition, delta: Record<string, unknown>): void {
    this.#settle(pending.record, pending.affordance, delta);
    // AFTER the delta has landed, never before: a verify contract asks about
    // the world the report just created.
    this.#comeToRest(pending.record, pending.affordance);
  }

  #settle(
    record: TransitionRecord,
    aff: Affordance,
    delta: Record<string, unknown>,
    settleOpts?: { forceUnobservable?: boolean },
  ): void {
    // Read provenance = the guard keys this transition's availability rested on.
    this.#commitDelta(aff.id, record.id, Object.keys(aff.guard ?? {}), delta);

    const deltaKeys = Object.keys(delta);
    const declared = aff.effect?.writes;
    record.effectVerified = settleOpts?.forceUnobservable
      ? 'unobservable' // tapless settlement: no report will ever exist to check against
      : declared && declared.length > 0
        ? declared.every((key) => deltaKeys.includes(key))
        : 'unobservable';
    let cursorHopped = false;
    if (aff.effect?.navigatesTo) {
      // Declared target = expectation, flagged as a CLAIM; sync() records reality.
      record.toNode = aff.effect.navigatesTo;
      record.toNodeClaimed = true;
      // The claim moves the LIVE cursor only if nothing else moved it since
      // this transition fired — a weaker claim must never clobber a newer
      // sync() observation that interleaved while the fire was pending.
      if (this.#node === record.fromNode && this.#node !== aff.effect.navigatesTo) {
        this.#node = aff.effect.navigatesTo;
        cursorHopped = true;
      }
    } else {
      // A non-navigating affordance never moves the record's cursor — even if
      // an interleaved sync() moved the session's.
      record.toNode = record.fromNode;
    }
    record.outcome = 'committed';
    this.#version++;
    if (deltaKeys.length > 0) this.#bumpState(); // empty settles are cursor stops, not state motion

    if (
      this.#frame &&
      this.spec.skills[this.#frame.skillId].steps.includes(aff.id) &&
      !this.#frame.firedSteps.includes(aff.id)
    ) {
      this.#frame.firedSteps.push(aff.id);
    }
    this.#emitTransition(record); // now committed — observers see the settled record
    this.#checkFrameAfterWorldChange();
    // A claimed navigation just moved the cursor: same question as sync()'s.
    if (cursorHopped) this.#checkDeadEnd();
  }

  /** The disclosure filter: full slice normally; frame steps + escape roles when a frame is open. */
  #servedEdges(): { edges: AvailableEdge[]; escape: boolean } {
    const edges = this.available().edges;
    if (!this.#frame) return { edges, escape: false };
    const steps = this.spec.skills[this.#frame.skillId].steps;
    return {
      edges: edges.filter(
        (e) => steps.includes(e.affordanceId) || e.role === 'cancel' || e.role === 'back',
      ),
      escape: true,
    };
  }

  /**
   * Demotion: after any world change, an open frame whose skill PRECONDITION
   * no longer holds is closed as 'demoted' — the served context re-collapses
   * to skill level and the agent replans. Step guards failing is normal DAG
   * progress and never demotes; skills without a precondition never demote.
   */
  #checkFrameAfterWorldChange(): void {
    if (!this.#frame) return;
    const skill = this.spec.skills[this.#frame.skillId];
    if (!skill.precondition) return;
    if (this.#evalGuard(skill.precondition).matched) return;
    this.#frame.status = 'demoted';
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    this.#frame = null;
    this.#version++;
    this.#bumpStructure();
  }

  #frameCopy(frame: SkillFrame | null = this.#frame): SkillFrame | null {
    return frame
      ? { ...frame, firedSteps: [...frame.firedSteps], inferredSteps: [...frame.inferredSteps] }
      : null;
  }

  /**
   * The brief's TEXT channel only carries authored strings. A page id is
   * authored; an OFF-GRAPH observed node name is runtime router text (an
   * attacker-influencable URL segment) — it renders as a constant label here
   * and stays available verbatim only in structured data fields.
   */
  #nodeLabel(name: string): string {
    return Object.hasOwn(this.spec.pages, name) ? name : '(an unmapped location, off the authored graph)';
  }

  /**
   * The same discipline for an ACTION id. A refused fire's id is whatever the
   * caller sent — a model's guess, a relay's string — so an id this graph does
   * not have renders as a constant instead of entering the authored channel.
   * `hasOwn`, because 'constructor' is truthy on any plain object and would sail
   * straight through a lookup.
   */
  #actionLabel(id: string | undefined): string {
    return id !== undefined && Object.hasOwn(this.spec.affordances, id) ? id : UNKNOWN_ACTION;
  }

  /** One authored-strings-only line per transition for contextBrief(). */
  #briefLine(t: TransitionRecord, changedKeysById: Map<string, string[]>): string {
    if (t.cause.kind === 'fired') {
      const aff = this.spec.affordances[t.cause.affordanceId ?? ''];
      const moved =
        t.toNode && t.toNode !== t.fromNode
          ? ` (${this.#nodeLabel(t.fromNode)} → ${this.#nodeLabel(t.toNode)})`
          : '';
      const flags: string[] = [];
      if (t.cause.inferred) flags.push('inferred, not observed');
      if (aff?.highEffect) flags.push('high-effect');
      if (t.materialized === false) flags.push('not materialized — nothing executed');
      if (t.toNodeClaimed) flags.push('navigation claimed, unconfirmed');
      if (t.outcome === 'pending') flags.push('awaiting app state');
      if (t.outcome === 'rejected' || t.outcome === 'rolled-back' || t.outcome === 'superseded') {
        flags.push(t.outcome);
      }
      if (t.effectVerified === false) flags.push('declared effect not observed');
      const suffix = flags.length > 0 ? ` [${flags.join('; ')}]` : '';
      return `${t.cause.principal} fired ${t.cause.affordanceId} — ${aff?.description ?? ''}${moved}${suffix}`;
    }
    if (t.toNode && t.toNode !== t.fromNode) {
      return `${t.cause.principal} ${t.cause.stimulus}: cursor moved ${this.#nodeLabel(t.fromNode)} → ${this.#nodeLabel(t.toNode)} (unverified edge)`;
    }
    if (t.cause.stimulus === 'structure-swap') {
      return 'the served tool surface changed (something mounted, unmounted, or changed visibility)';
    }
    // Key NAMES are the designed disclosure (values never enter text) — but a
    // tap could relay hostile keys, so they are hardened before rendering.
    const keys = (changedKeysById.get(t.id) ?? []).map(
      // eslint-disable-next-line no-control-regex
      (key) => key.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 60),
    );
    // An empty key list is not a lost report, and '(nothing)' read like one —
    // a reader (human or model) sees a row that changed nothing and goes
    // looking for the bug. There isn't one: footprint commits NET changes, so a
    // report whose values the state already holds commits no keys, and so does
    // a report of undefined-valued keys, which this session reads as absent.
    //
    // The wording names no dial. `commitValues` looked like the culprit and is
    // not: 'full' and 'delta' both produce an empty bundle here (they encode a
    // commit, they do not decide what nets out), so blaming one of them would
    // send the reader to the wrong knob — this brief is read to be believed.
    const changed =
      keys.length > 0
        ? keys.join(', ')
        : '(no observable change — same-value writes and undefined-valued keys net out before the commit)';
    return `${t.cause.principal} ${t.cause.stimulus} changed: ${changed}`;
  }

  /** One transition = one fresh StageContext = one CommitBundle. */
  #commitDelta(
    stageName: string,
    runtimeStageId: string,
    readKeys: string[],
    delta: Record<string, unknown>,
  ): void {
    const ctx = new StageContext('', stageName, stageName, this.#heap, '', this.#log);
    ctx.runtimeStageId = runtimeStageId;
    ctx.useCommitValues(this.#commitValues);
    ctx.useWriteProvenance('reads-prefix');
    const scope = new ScopeFacade(ctx, stageName);
    scope.attachScopeRecorder(this.#recorder);
    for (const key of readKeys) scope.getValue(key);
    for (const [key, value] of Object.entries(delta)) {
      scope.setValue(key, value, this.#redacted.has(key));
    }
    ctx.commit();
  }
}

/**
 * The literal address an edge's GESTURE yields, or undefined when it yields
 * none. Two ways to an address, one law:
 * - a declared `url` binding IS the address (build already refused ':param'
 *   segments, but the check re-runs here so a hand-built spec cannot smuggle
 *   one past materialisation);
 * - an edge with NO binding that claims `navigatesTo` a page whose route is
 *   fully literal — pure navigation's natural gesture is the url, which is how
 *   a fromRoutes page is reached without any hand-written tool.
 * A declared click/tab/programmatic gesture yields NO address by definition:
 * the author said HOW this edge is performed, and it is not by url — deriving
 * one anyway would replace their gesture with a guess.
 * Literal-ness is judged by the matcher's own segment law (segmentsOf/isParam)
 * so routing, matching and materialisation can never disagree.
 */
function gestureHref(aff: Affordance, pages: SkillGraphSpec['pages']): string | undefined {
  if (aff.binding) {
    if (aff.binding.kind !== 'url') return undefined;
    return fullyLiteral(aff.binding.href) ? aff.binding.href : undefined;
  }
  const target = aff.effect?.navigatesTo;
  if (!target) return undefined;
  const route = pages[target]?.route;
  if (typeof route !== 'string') return undefined;
  return fullyLiteral(route) ? route : undefined;
}

/** No segment is a ':param' — the address exists as bytes, nothing to guess. */
function fullyLiteral(routeOrHref: string): boolean {
  return !segmentsOf(routeOrHref).some(isParam);
}

/**
 * Bounded, firewall-safe copy of a handler's return value for the DATA channel.
 * Caps depth/breadth/string length (search results can be large), drops
 * functions, and tolerates cycles via the depth cap — so a handler return can
 * never blow up a tool result or smuggle live references into the record.
 */
function sanitizeProduced(value: unknown, depth = 0): unknown {
  if (typeof value === 'function') return undefined;
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (value === null || typeof value !== 'object') return value; // number, boolean, undefined
  if (depth >= 4) return null; // deep enough — and a cycle backstop
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeProduced(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (count++ >= 40) break;
    const clean = sanitizeProduced(child, depth + 1);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

/**
 * How an app-declared rejection reads on the INVOCATION axis. 'superseded'
 * means the library stopped tracking this fire — not that it failed — so
 * calling it 'refused' would dress a guess up as a fact.
 */
function refusalStatus(
  outcome: 'rejected' | 'rolled-back' | 'superseded',
): FireSettlement['effectStatus'] {
  return outcome === 'superseded' ? 'unobservable' : 'refused';
}

/** Detach a value defensively — structuredClone, or the ref if it can't be cloned. */
function cloneSafe<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return value; // non-cloneable payload (function/DOM node): best-effort, keep the ref
  }
}

/**
 * The one gate a declared input schema gets. `checkShape` is passed in rather
 * than read off the session because this stays module-private — the decision
 * belongs to the session that owns the option, not to a free function.
 */
function validatePayload(
  schema: unknown,
  payload: unknown,
  checkShape: boolean,
): { ok: true } | { ok: false; issues: string } {
  const validator = schema as {
    safeParse?: (value: unknown) => { success: boolean; error?: unknown };
    parse?: (value: unknown) => unknown;
  };
  if (typeof validator.safeParse === 'function') {
    try {
      const result = validator.safeParse(payload);
      return result.success ? { ok: true } : { ok: false, issues: String(result.error) };
    } catch (error) {
      return { ok: false, issues: String(error) };
    }
  }
  if (typeof validator.parse === 'function') {
    try {
      validator.parse(payload);
      return { ok: true };
    } catch (error) {
      return { ok: false, issues: String(error) };
    }
  }
  // Plain JSON Schema carries no validator of its own, so until now it only
  // DESCRIBED the payload to the model and nothing checked the answer — a
  // guessed key reached the handler as undefined. checkJsonShape judges the
  // structural subset a planner actually gets wrong and passes the rest;
  // detectSchema gates the branch so the duck-typing above stays the only path
  // a zod/parseable validator ever takes.
  if (checkShape && detectSchema(schema) === 'json-schema') {
    return checkJsonShape(schema, payload);
  }
  return { ok: true };
}
