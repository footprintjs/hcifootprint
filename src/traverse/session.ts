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
import { isParam, matchRoute, segmentsOf } from '../graph/route-match.js';
import type {
  Affordance,
  ApprovalResult,
  AskStatus,
  AvailableEdge,
  AvailableJourney,
  AvailableSlice,
  BeginWorkOptions,
  Binding,
  BlockedBecause,
  Cause,
  CommitJourneyResult,
  ConfirmReceipts,
  ConfirmRecord,
  ConfirmTrailStep,
  ConfirmWillDo,
  ConfirmWillUse,
  ContextBrief,
  ContextBriefOptions,
  DecisionStatus,
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
  RedactedFields,
  ReportGapOptions,
  SessionEventName,
  SessionEvents,
  SessionOptions,
  JourneyFrame,
  NavigationGraphSpec,
  DependencyEdge,
  JourneyPlan,
  JourneyPlanStep,
  JourneyStanding,
  StimulusKind,
  SyncResult,
  ActionGroup,
  TransitionRecord,
  TryJourneyPlanResult,
  UpdateOptions,
  UpdateResult,
  WorkHandle,
  WorkRow,
} from '../atom/types.js';
import { edgesToMCPTools, leaveJourneyTool } from '../serve/mcp.js';
import { sanitizeProduced } from './data-channel.js';
import { failureOf, guardReads, projectInput } from '../contextful/capture.js';
import { readContextful } from '../contextful/contextful.js';
import type { ContextfulSite } from '../contextful/contextful.js';
import { watchAnchor } from '../contextful/anchor.js';
import type { AnchorWatch } from '../contextful/anchor.js';
import { resolveAnchor } from '../contextful/anchor-port.js';
import type { AnchorElement } from '../contextful/anchor-port.js';
import type {
  ActionCapture,
  ContextfulOptions,
  SenseDeclaration,
  SensedEvent,
  SensedSummary,
} from '../contextful/types.js';
import { createSettlementLatch, settledNow } from './settlement.js';
import type { SettlementLatch } from './settlement.js';
import { checkApproval, stale } from './approval-gate.js';
import type { ApprovalVerdict, OpenAsk } from './approval-gate.js';
import { normalizeInput, sameInput } from './same-input.js';
import { UNCOPYABLE_INPUT, boundInput } from './bound-input.js';
import { failureReason, isReturnedFailure } from './handler-result.js';
import { redactFields } from './redact-fields.js';
import { checkJsonShape, checkNoInput } from './payload-shape.js';
import { NO_INPUT, expectsOf } from './expects.js';
import { checkVerify, filterVerdict } from './verify.js';
import { blockedBecauseFault } from '../graph/guards.js';
import { stepDependencies, unblockingDependencies } from '../graph/step-deps.js';
import { routeBetween, type RouteStep } from '../graph/reach.js';
import { ActionRegistry } from '../registry/registry.js';
import type { Registration, ActionHandler } from '../registry/registry.js';

/**
 * Who an UNATTRIBUTED action is charged to.
 *
 * `FireOptions.source` is required in the types, so this only ever answers for
 * a caller the types never reached — plain JS, or an options object built at
 * runtime. It is not a new policy: `commitJourney()`, `confirmAsk()` and
 * `serveToAgent()` already publish exactly this assumption, and the session is
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

/**
 * THE DEV WARNING FOR A SWITCH-OFF NOBODY EXPLAINED — authored, and it names
 * BOTH doors, because they answer different halves and a reader picking one
 * should know the other exists.
 *
 * Only the action id is interpolated. What the app is waiting for is exactly
 * what this warning is complaining it was never told.
 */
const NO_DECLARED_CAUSE =
  'was switched off with nothing declared about why — no enabledWhen and no blockedBecause — so a ' +
  'caller that reaches for it is refused with the state and no evidence at all: told no, and taught ' +
  'nothing. Declare enabledWhen for derived evidence, or blockedBecause for your own sentence.';

/** An id the graph does not have — caller-supplied text, kept out of the authored channel. */
const UNKNOWN_ACTION = '(an action this app does not have)';

/**
 * The facts-block line for work the app opened without tying it to any action
 * ({@link Session.beginWork}, home 3).
 *
 * AUTHORED, and it ignores the row's own `label` — that is the app's runtime
 * text, and this is the block a model is told to trust above its own account
 * (the same refusal `by` and `note` get on the ask lines). What it says is the
 * fact and the whole fact: something is running, and nothing named what.
 */
const WORK_NOT_TIED_TO_AN_ACTION =
  'The app is still working on something it did not tie to an action here.';

/**
 * THE FACTS-BLOCK LINE FOR A DECISION THAT BELONGS TO A PERSON.
 *
 * It asserts OWNERSHIP and nothing else. That is why `false` and `'unknown'`
 * print the same true sentence and nothing collapses: whether the decision has
 * been made is a state reading, and state readings ride the data channel
 * ({@link Session.decisions}, the `withTheHuman` rows) where the asymmetry
 * between "not yet" and "nobody could tell" survives intact. A line that claimed
 * a made-state would have to pick one of them.
 *
 * The action id is the only interpolation, through `#actionLabel` like every
 * other line here. `about` never enters it — that is the app's own runtime text,
 * and this is the one block a model is told to weigh above its own account.
 * There is no id suffix either, because a decision mints no card and there is no
 * id to name.
 */
const DECISION_WITH_THE_HUMAN = (what: string): string =>
  `A decision is with the human: ${what} — the agent presents options and does not make it.`;

/**
 * The facts-block line for a row that reported the served action list could not
 * be refreshed ({@link ReportGapOptions.actionsMayBeStale}).
 *
 * AUTHORED, and it ignores the row's own `request`: that field is caller text,
 * and this block is the one a model is told to trust above its own account. What
 * it says is a FACT ABOUT A MOMENT — the read failed here — and the consequence
 * is hedged, because stale bindings may well still be correct and the library
 * cannot tell.
 */
const READ_FAILED_LINE =
  'the app could not re-read its own list of actions here — anything listed after this may be from ' +
  'before that.';

/**
 * HOW TO OPEN A CARD — the second half of the refused-crossing warning.
 *
 * The first half names the GATE ("only an approval it recorded from a person can
 * cross"). An integration read that, kept firing its own `confirm: true`, and got
 * the same refusal every time: the message named the wall and not the door, so
 * the loop it produced looked like the library refusing to work. The mechanism
 * had shipped whole — this sentence is the part that says where it is.
 *
 * AUTHORED and interpolation-free, unlike the half it joins (which names the
 * action and the reason word). It is the same three calls in every app, so it is
 * the same bytes in every app.
 */
const HOW_TO_OPEN_A_CARD =
  ' To put the decision in front of a person, call session.confirmAsk(affordanceId): it hands back the ' +
  'receipts to show them, their yes goes in through session.approveAsk(askId, { by }) (their no through ' +
  'session.declineAsk), and the fire then carries that askId.';

/**
 * How many times a page-change broadcast will run again for a listener that
 * moved the cursor from inside it. Two listeners CAN bounce a cursor between
 * them forever; this is where the library stops and says so.
 */
const MAX_PAGE_CHANGE_ROUNDS = 5;

/**
 * CARRY A CAPTURED NAME ONTO A DERIVED ROW — the one door for copying an
 * already-frozen `does` ({@link Cause.does}) from the row that captured it onto
 * a row built out of it (a pending entry, a work row, an ask's public status).
 *
 * It is a copy and never a fresh lookup, which is the whole law: the moment a
 * derived row re-asks the CURRENT spec what an id means, it can get a different
 * answer than the row it was derived from — and two rows of one history
 * disagreeing about the same action is worse than either being silent.
 *
 * Absence stays absence. A row derived from something that captured nothing
 * (work bound to nothing, a card about an id the graph never had) gets NO KEY,
 * because "was not declared at that moment" is a fact worth being able to read.
 */
function carriedDoes(does: string | undefined): { does?: string } {
  return does === undefined ? {} : { does };
}

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

/**
 * WHICH KIND of rest this is, and the distinction is the whole design: did
 * anything REPORT where the cursor now is? Only sync() does. A fire's declared
 * navigation moves the cursor on a CLAIM — at a moment when the app's own
 * handler has not even run yet — and a structure flush does not move it at all.
 * Named rather than flagged, because a boolean at three call sites is how this
 * gets quietly mismatched.
 */
type CursorRest =
  /** sync() reported where the cursor now is. Carries the observation. */
  | { kind: 'observed'; node: string }
  /** Nobody reported anything: a claimed navigation, or the coalesced structure flush. */
  | { kind: 'unreported' };

/**
 * One row of the work ledger, as it is HELD (what {@link Session.openWork}
 * serves is a copy of the open ones, {@link WorkRow}).
 *
 * The two extra fields are the closed stamp. They are held and never served:
 * `closedAt` is what makes `done()` first-close-wins rather than merely
 * idempotent, and `error` is where a `done(error)` lands — on the work row,
 * ONLY. Nothing reads it back out, on purpose: every door that could carry it
 * answers "how did this FIRE come to rest", and an app's note about its own
 * bookkeeping arriving there would read as a settlement.
 *
 * `error` is the app's OWN object, held by reference — the same choice
 * `#detachSettlement` makes and for the same reason: cloning an Error quietly
 * drops its stack, and a bounded copy of a thing nobody serves would buy
 * nothing. The consequence is worth saying out loud, because it is the one
 * un-summarised app value this ledger keeps: whatever graph you hand `done()`
 * (a captured DOM node, a response body) stays reachable for the session's
 * life, alongside the row itself. That is the ledger's disclosed retention
 * policy — nothing here expires — applied to the value as well as the row.
 */
interface WorkEntry {
  workId: string;
  label?: string;
  transitionId?: string;
  affordanceId?: string;
  /** The bound fire's captured name ({@link Cause.does}) — copied, never re-read. */
  does?: string;
  startedAt: number;
  principal: Principal;
  closedAt?: number;
  error?: unknown;
}

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

/**
 * One watched anchor. `refs` is the mount refcount (StrictMode), `element` is
 * what a second registration is compared against to tell a remount from a move.
 */
interface AnchorEntry {
  element: AnchorElement;
  watch: AnchorWatch;
  refs: number;
}

/** What {@link Session.#contextFire} carries into one fire. See the field. */
interface ContextAssist {
  /** The app is invoking its own handler around this fire — hold the settlement open. */
  direct?: true;
  /** A listener attributed this row rather than an observation (law 3). */
  inferred?: true;
  /** What the RECORD may carry as payload — the allowlist projection, never the raw input. */
  recordPayload?: unknown;
}

/**
 * How many by-reference event trails a session keeps. Twenty is "the recent
 * past a person is debugging", and the number is stated here rather than
 * guessed at each door — the record's own `count` survives eviction, so the
 * fact that there were 300 events is never lost, only the events themselves.
 */
const TRAILS_RETAINED = 20;

/** What an anchor-less (or watch-less) contextful registration hands back. */
const NOTHING_TO_RELEASE = (): void => {};

/** A value the app returned that a later turn will answer for. */
function isThenable(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown })?.then === 'function';
}

/** registerHandlers() input: one group per component/section, existing handlers by reference. */
export interface RegisterHandlersOptions {
  group: string;
  handlers: Record<string, ActionHandler>;
}

/** registerHandlers() output: optional exact-provenance triggers + the group's cleanup. */
export interface RegisteredHandlers {
  /**
   * Wrapped manual triggers (same signature as the app's handlers): calling
   * one records the action as source 'user' AND invokes the handler — the
   * opt-in precision tier. Wire a trigger IN PLACE OF the handler at the call
   * site (the trigger invokes it for you); keeping both wired executes the
   * handler twice. If you cannot replace the call site, rely on the zero-touch
   * tiers instead (DOM sensor / effect-signature inference).
   */
  triggers: Record<string, (payload?: unknown) => FireResult>;
  /**
   * Grey out (or restore) one of the actions THIS group registered — the same
   * control the tree API's group handle has always offered, scoped the same way.
   * Reaching for an action the group did not register is refused by name.
   */
  setEnabled: (actionId: string, enabled: boolean) => void;
  /**
   * Say this control is WORKING right now — the app's own label for it, or
   * `undefined` to clear. The third state a control has, scoped and refused the
   * same way `setEnabled` is.
   *
   * It is here for the same reason `setEnabled` is: the door that mounted a
   * control owns its state, and greyed/working are not two different kinds of
   * ownership. Its absence also had a consequence beyond symmetry —
   * `useWorking` (hcifootprint/react) takes handles by their `setBusy`, so a
   * flat-session app could mount its controls through this door and then could
   * not hand the result to the React binding at all.
   */
  setBusy: (actionId: string, label: string | undefined) => void;
  /** Unregister everything this call registered (call on unmount). */
  unregister: () => void;
}

export class Session {
  readonly #spec: NavigationGraphSpec;
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
  /**
   * Paths hidden inside the DATA a transition carries (SessionOptions.
   * redactedFields) — the sibling of #redacted, which governs state keys only.
   *
   * Applied at the FOUR points where a value is written onto something a caller
   * can reach: the record's `payload`, the record's `produced`, the receipts'
   * `willUse.input`, and the served row's `holds` — what a control is holding IS
   * the future fire's payload one turn early, so the payload list governs it too
   * or the secret simply rides out a turn sooner. At the capture site and never
   * at the export door, because there are nine doors (transitions(), the
   * 'transition' event, three settlement readers, producedFor(), confirmAsk's
   * return, confirms(), the 'confirm' listener) and a filter on each is a leak
   * waiting for the tenth. The raw value simply never lands on the artifact.
   *
   * NOT applied to the approval gate's own copies (#openAsks holds
   * bound-input.ts's faithful clone) — that is what keeps the enforced-consent
   * gate comparing real values while the rendered copies carry markers.
   */
  readonly #redactedFields: RedactedFields;
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
  /** The one open journey frame (v0: one at a time). */
  #frame: JourneyFrame | null = null;
  /**
   * Record id whose handler is executing its SYNCHRONOUS portion right now.
   * updateState() called from inside that portion attributes directly to this
   * record (like transitionId targeting) — the fix for the burst-fire race
   * where another handler's report would FIFO-steal an earlier record.
   *
   * THE CALL WINDOW. Named, because there are now two windows in this file and
   * they are different primitives with different lifetimes: this one is open
   * only while a handler's synchronous portion runs (one turn of the microtask
   * queue) and answers "which fire is this call inside of?"; the arrival CLAIM
   * WINDOW (`#navClaim`) lives from a fire until the next fire or the next
   * observation and answers "which navigation claim could this observation
   * corroborate?". They must stay two — collapsing them would let a late
   * observation attribute a call, or a call close a claim.
   */
  #invokingRecordId: string | null = null;
  /**
   * The ACTION whose handler is executing right now — the same window as
   * {@link #invokingRecordId}, one field over.
   *
   * It exists for exactly one question, asked by a contextful wrapper the
   * instant it is entered: "is this call the one the session is already
   * recording?" (contextful/contextful.ts). Keyed on the action rather than on
   * the record because a wrapped handler invoked from INSIDE another action's
   * handler must answer no — otherwise a nested call would attach itself to the
   * neighbour's fire and the ledger would name the wrong action.
   */
  #invokingActionId: string | null = null;
  /**
   * D21 — the one-shot channel a contextful fire opens for itself, read and
   * CLEARED on the first line of `fire()`.
   *
   * Two facts fire() cannot learn from its arguments, because neither is a
   * caller's to state: that the app is invoking its own handler right now (so
   * the settlement must stay open until it reports, exactly as it does for a
   * handler the session itself ran), and that a listener — not an observation —
   * is what attributed this row (`cause.inferred`, law 3). A public FireOptions
   * field for either would be a boolean the caller controls, which is precisely
   * what this library refuses to call evidence.
   */
  #contextFire: ContextAssist | null = null;
  /**
   * Anchors being watched right now, by ACTION. One action, one anchor: a
   * second registration on the SAME element refcounts (React StrictMode mounts
   * twice before it unmounts once, and a double attach would double every
   * listener), a registration on a DIFFERENT element replaces — the registry's
   * own last-registration-wins rule, one field over.
   */
  readonly #anchors = new Map<string, AnchorEntry>();
  /** Sense-only declarations, by action — {@link Session.sense}'s ledger. */
  readonly #senses = new Map<string, ContextfulOptions>();
  /** What each open capture needs at settlement: the options that opened it, and its anchor. */
  readonly #captures = new Map<string, { options: ContextfulOptions; actionId: string }>();
  /**
   * Event trails too long to ride the record inline, by transition id — what
   * {@link Session.sensedTrail} answers with. Bounded (the newest
   * {@link TRAILS_RETAINED}), because a trail is bulk evidence about one action
   * rather than a ledger row, and the record itself always says how many events
   * there were.
   */
  readonly #trails = new Map<string, SensedEvent[]>();
  /** Contextful teardowns owned by a mount group — released with its handlers. */
  readonly #contextReleases = new Map<string, Array<() => void>>();
  /** Contextful complaints already made (the #warnedOnce discipline). */
  readonly #contextWarned = new Set<string>();
  /**
   * THE WORK LEDGER — every piece of work the app said it started, by work id.
   *
   * A fire can come to rest while the app is still working (an upload that
   * reports its delta and keeps uploading, a handler that hands off to a job),
   * and until this ledger every list here answered "nothing is live" about it:
   * `#pending` had settled, the latch had been dropped. This is the app's own
   * imperative statement of what it is doing, held where the readers can see it.
   *
   * ONE MAP, TWO STATES. A row STAYS after `done()` closes it, carrying
   * `closedAt` (and whatever `done(error)` was handed) — the ledger policy this
   * file already runs on (#settlements above, #transitions, the gap ledger):
   * ledgers keep their rows, and pruning is how a real past becomes a fabricated
   * "unknown". {@link Session.openWork} serves the OPEN ones only, which is what
   * its name promises; the closed stamp is what makes a second `done()` unable
   * to reopen or re-stamp anything, and it is deliberately served nowhere. A
   * closed row's `error` is the app's word about WORK, and every door that could
   * carry it is a door about how a FIRE came to rest.
   *
   * It grows for the session's life, and an un-closed row grows with it: nothing
   * expires work, because a clock is never evidence.
   */
  readonly #openWork = new Map<string, WorkEntry>();
  /** Monotonic counter behind every generated work id (never caller-supplied). */
  #workSeq = 0;
  /** Unbound-work complaints already made (the #warnedOnce discipline — see #warnWorkOnce). */
  readonly #workWarned = new Set<string>();
  /** Closed frames (completed / cancelled / demoted), oldest first. */
  readonly #frames: JourneyFrame[] = [];
  readonly #registry: ActionRegistry;
  /**
   * THE VALUE DOOR — how the app says what a control HOLDS, keyed by canonical
   * affordance id. Two maps rather than one because the two doors are not peers:
   * a per-element DECLARATION outranks a registration-time reader.
   *
   * A STACK on the declared side, for the same reason `#dynamic` keeps one: two
   * elements may declare the same edge (a mobile button and a desktop one, a
   * React StrictMode double-invoke), the newest serves, and releasing the newer
   * must hand the row back to the older rather than silencing an edge that is
   * still declared. The registration side follows the handler registry instead —
   * last write wins, and an unregister only removes what its own group still
   * owns — because that is the lifecycle a mount handle already has.
   *
   * A READER AND NOTHING ELSE: no instance dimension, no free-form keys. The
   * door files one reader per SERVED ACTION, which is what keeps this a fact
   * about a control and not a data channel (LIBRARY_ASK.md, "The app's DATA as a
   * fourth pillar" — declined).
   */
  readonly #holdsDeclared = new Map<string, Array<() => unknown>>();
  readonly #holdsRegistered = new Map<string, { group: string; read: () => unknown }>();
  /** Value-reader complaints already made, keyed `reason:affordanceId` (the #warnedOnce discipline). */
  readonly #holdsWarned = new Set<string>();
  /** Busy-label complaints already made, keyed `busy:affordanceId` (same discipline). */
  readonly #busyWarned = new Set<string>();
  /** Blocked-reason reader complaints already made, keyed by affordance id (same discipline). */
  readonly #blockedWarned = new Set<string>();
  /** Actions already told that they were switched off with no cause declared (same discipline). */
  readonly #noCauseWarned = new Set<string>();
  readonly #warn: (message: string) => void;
  /** Unmet demand: rejected fires + explicitly reported unserved asks. */
  readonly #gaps: GapRecord[] = [];
  /**
   * Dead-end rows already written, keyed `node@structureFingerprint` — the row
   * is an observation of one position at one served structure, so re-observing
   * the same pair says nothing new. New WIRING re-arms it: a mount may have
   * fixed the page, and a page still dead afterwards is a new fact. The
   * fingerprint, not `structureVersion`, is the axis: that counter also bumps
   * for journey-frame open/close/demote, which cannot wire anything. Off-graph
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
  /** Whether the "no gate is declared" complaint has been made (once per session). */
  #warnedUngatedFire = false;
  /** Whether `requireHumanApproval` was PASSED at all — `false` is a statement, absence is not. */
  readonly #approvalPolicyDeclared: boolean;
  /**
   * THE DECISIONS BOOK — per `humanDecides` action, who the LATEST committed
   * delta touching any of its `doneWhen` keys was attributed to.
   *
   * SET OR CLEARED at commit time, which is the only moment attribution is
   * knowable (collect during traversal, never post-process). Set by the three
   * identity-bearing rungs of the ladder in {@link Session.updateState} — a
   * delta naming a fired transition, a handler's own call window, an attributed
   * report — and CLEARED by every matching rung, because a computed join never
   * attributes a human decision: FIFO can mis-attribute predictably, the
   * single-cover arm is a signature match, inference is a guess the record
   * itself flags, and the unknown-stimulus floor names nobody.
   *
   * An absent entry is the honest answer, and it is the common one. A stale
   * stamp never survives an unattributed touch: a person picks `standard`, an
   * unattributed delta later rewrites the key to `express` while the condition
   * still holds, and the book CLEARS rather than attributing a value to somebody
   * who never chose it.
   */
  readonly #decisionsBook = new Map<string, Principal>();
  /** Monotonic counter behind every generated confirm id (never caller-supplied). */
  #askSeq = 0;
  /** Passive observer listeners, by event name (the recorder category, session grain). */
  readonly #listeners = new Map<SessionEventName, Set<(payload: unknown) => void>>();
  /**
   * Page-change listeners — a SEPARATE surface from `on()` on purpose. These run
   * inside a write path and are EXPECTED to change the session (a live source
   * re-reads its store and mounts/releases bindings); `on()` promises the exact
   * opposite ("listeners never change what the session does"), and quietly
   * handing an active reaction that passive contract would make the contract a
   * lie for every other listener on it.
   */
  readonly #pageChangeListeners = new Set<() => void>();
  /** Guard: a listener that drives the cursor again must not recurse into its own broadcast. */
  #notifyingPageChange = false;
  /** …and the move it made is not lost: the broadcast runs again for everyone else. */
  #pageChangeMissed = false;
  /**
   * Whether an app REPORT has established the position the cursor is on. True at
   * construction (the caller said where the app is), false the moment a claimed
   * navigation moves the cursor on the app's word alone — so the report that
   * follows is the FIRST word anything outside gets about that position, even
   * though the cursor was already there.
   */
  #positionReported = true;
  /**
   * The newest navigation CLAIM still open to corroboration: the fire whose
   * `arrival` may still become 'observed'. Holds ONE claim and only the newest;
   * the claim's own record carries the version stamp (`cursorVersion`), so no
   * second counter is invented here. Null between windows.
   */
  #navClaim: { recordId: string; target: string } | null = null;
  /** Monotonic counter for generated tool-group ids (never caller-supplied). */
  #groupSeq = 0;

  constructor(spec: NavigationGraphSpec, opts: SessionOptions) {
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
    // SAID vs NEVER SAID — the one difference `#humanApproval` cannot carry,
    // because `false` and absence both mean "do not enforce". Only the complaint
    // below reads it: an app that wrote `requireHumanApproval: false` has stated
    // its policy and is not told about it again; an app that never mentioned the
    // option is the one that does not know where its gate is.
    this.#approvalPolicyDeclared = opts.requireHumanApproval !== undefined;
    this.#now = opts.now ?? Date.now;
    const initial = structuredClone(opts.state ?? {});
    this.#log = new EventLog(initial);
    this.#heap = new SharedMemory(undefined, initial);
    this.#counter = createExecutionCounter();
    this.#redacted = new Set(opts.redactedKeys ?? []);
    // Detached at construction: a consumer mutating the array they passed must not
    // be able to widen or narrow this session's redaction afterwards (the same
    // stance every other option takes — the policy is read once).
    this.#redactedFields = {
      ...(opts.redactedFields?.payload !== undefined
        ? { payload: [...opts.redactedFields.payload] }
        : {}),
      ...(opts.redactedFields?.produced !== undefined
        ? { produced: [...opts.redactedFields.produced] }
        : {}),
    };
    this.#commitValues = opts.commitValues ?? 'delta';
    this.#warn = opts.onWarn ?? ((message) => console.warn(message));
    this.#registry = new ActionRegistry(this.#warn);
    this.#recorder = {
      id: 'hcifootprint-session',
      onRead: (event) => {
        /* v8 ignore next -- unreachable: footprintjs stamps both a key and a runtimeStageId on every read it reports, so this tap never sees a half-formed event. The guard is what keeps a malformed one out of the reads index instead of filing it under 'undefined'. */
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
  protected get spec(): NavigationGraphSpec {
    return this.#spec;
  }

  /** The live-binding registry (protected seam for NavSession's per-instance handlers). */
  protected get registry(): ActionRegistry {
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
      // The capture envelope is plain data by construction (names, types, and
      // whatever the app's own allowlist let through the data-channel bound), so
      // it clones — and it MUST, or a 'transition' listener holds the live
      // record's own event trail and can rewrite the evidence.
      ...(t.captured !== undefined ? { captured: cloneSafe(t.captured) as ActionCapture } : {}),
    };
  }

  #emitTransition(record: TransitionRecord): void {
    this.#emit('transition', this.#copyRecord(record));
  }

  /**
   * Run something every time the app REPORTS that it is on a different page —
   * after the hop is recorded, the version has moved and observers have seen it.
   *
   * FIRES ON {@link Session.sync} ONLY, and only when the reported node differs
   * from where the cursor was. Not on a claimed navigation: that moves the cursor
   * on the app's word, before the app's own handler has run, so anything read
   * there would describe the page the app has not left yet. Not on a structure
   * change either — the cursor did not move, and that flush is usually a listener
   * here seeing its own mount come back around.
   *
   * The door a LIVE SOURCE needs and `on('transition')` cannot be: the transition
   * event fires BEFORE the version bump, and its listeners are documented passive
   * (they never change what the session does), while the whole point here is a
   * reaction that DOES — re-reading an action store and mounting or releasing
   * bindings. So this is its own surface, and the two contracts stay true.
   *
   * ONE SYNC IS THE LIBRARY'S OWN: when a fire that moved the cursor on a claim
   * is rolled back by its handler failing, the session walks the cursor home with
   * a `sync(fromNode, { principal: 'system' })`. That is a position report like
   * any other — the cursor really is back — so this fires for it too, and a live
   * source re-reads the page it is actually on.
   *
   * Listeners run in registration order and are ISOLATED (a throw is caught and
   * warned, never aborting the hop). A listener that moves the cursor again does
   * not recurse into this broadcast; the move is remembered and the pass runs
   * again, so no listener is left holding a page the session has left. Returns
   * the unsubscribe.
   */
  whenPageChanges(listener: () => void): () => void {
    this.#pageChangeListeners.add(listener);
    return () => {
      this.#pageChangeListeners.delete(listener);
    };
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

  /** Generate an opaque group identity (never caller-supplied — see ActionGroup). */
  protected nextGroupId(prefix = 'group'): string {
    return `${prefix}#${(this.#groupSeq += 1)}`;
  }

  /**
   * Flip a registered action between clickable and greyed-out (used by the
   * ActionGroup handle). A real change is world motion — it bumps the structure
   * axis so a stale plan is caught and the surface re-serves.
   */
  protected setActionEnabled(affordanceId: string, enabled: boolean): void {
    if (!this.#registry.setEnabled(affordanceId, enabled)) return;
    if (!enabled) this.#warnNoDeclaredCause(affordanceId);
    this.noteStructureChange();
  }

  /**
   * A CONTROL SWITCHED OFF WITH NOTHING DECLARED ABOUT WHY — said once, to the
   * developer, at the moment it happens.
   *
   * A disable with no declared cause serves a refusal with no evidence: the
   * agent is told no and taught nothing, and a hole in an answer is where a
   * guess goes (the same failure `enabled: false` on the row and `unblockedBy`
   * beside it were each built to close, one layer up). Both cures already
   * exist and neither is discoverable from the imperative call, so the call is
   * where they get named — a production integration carried a hand-rolled
   * workaround for months because nothing pointed at either door.
   *
   * THE ONE CHOKE POINT, deliberately. Every imperative switch-off reaches this
   * method — a group handle's `setEnabled`, and the live-store reconcile, which
   * drives that same handle for both a first-sight disabled row and a later
   * flip. The registry itself would be the wrong place: it knows nothing about
   * sessions, guards or declarations by design, so it cannot ask the question.
   *
   * WARNS ONLY ON A REAL CHANGE (the caller has already asked the registry), and
   * only for a control the app said nothing about. Declaring either door — the
   * derived evidence of `enabledWhen`, or the app's own sentence in
   * `blockedBecause` — silences it for good, because then the refusal carries
   * something. Keyed by the BASE action id, so greying twenty cards of one
   * repeats container is one action's mistake and one line.
   */
  #warnNoDeclaredCause(registryKey: string): void {
    const affordanceId = baseActionId(registryKey);
    const aff = this.spec.affordances[affordanceId];
    if (aff?.enabledWhen !== undefined || aff?.blockedBecause !== undefined) return;
    if (this.#noCauseWarned.has(affordanceId)) return;
    this.#noCauseWarned.add(affordanceId);
    this.#warn(`hcifootprint: '${affordanceId}' ${NO_DECLARED_CAUSE}`);
  }

  /**
   * Say — or stop saying — that a registered action is WORKING RIGHT NOW (the
   * ActionGroup handle's `setBusy`). A real change is world motion for the same
   * reason a `setEnabled` flip is: the served row now reads differently, so a
   * plan made against the old one is stale.
   *
   * The label is normalised on the way in, never on the way out, so the
   * fingerprint below and the served row can never disagree about which bytes
   * the app said. No timer is started here or anywhere else — see
   * {@link AvailableEdge.busy}: a clock is not evidence, and the ceiling on
   * waiting belongs to whoever is waiting.
   */
  protected setActionBusy(affordanceId: string, busy: string | undefined): void {
    const label = this.busyLabel(affordanceId, busy);
    // A REFUSED label is not a CLEAR. `undefined` in means "stop saying it";
    // anything else that failed the door leaves the standing word exactly where
    // it was, because clearing it would be this library deciding, off a
    // malformed call, that the app had finished.
    if (label === undefined && busy !== undefined) return;
    if (this.#registry.setBusy(affordanceId, label)) this.noteStructureChange();
  }

  /**
   * THE LABEL, OR NOTHING — the one door every busy wire passes through
   * (registration, the handle, a live store row), so all three store the same
   * bytes and none of them can invent a state.
   *
   * A STRING IS THE ONLY THING THAT IS A LABEL. `true` is the shape this field
   * deliberately does not have: a flag says "something is happening" and leaves
   * the meaning to whoever renders it, which puts the serving layer in the
   * business of authoring sentences about a state only the app can describe.
   * So a boolean, a number, an object — anything but a string — is REFUSED, with
   * one warning that teaches the shape, and the row keeps saying nothing rather
   * than saying a guess. An all-whitespace label goes the same way: presence
   * with no content would print an empty box for a state that has words.
   *
   * `undefined` is not a refusal — it is the CLEAR, and the only way to stop
   * saying busy.
   *
   * Capped through the same function every app string crosses under, so a runaway
   * label costs a model 200 characters and not its context window.
   */
  protected busyLabel(affordanceId: string, busy: unknown): string | undefined {
    if (busy === undefined) return undefined;
    if (typeof busy !== 'string' || busy.trim() === '') {
      const said = typeof busy === 'string' ? 'an empty label' : `a ${describeKind(busy)}`;
      this.#warnBusyOnce(
        affordanceId,
        `hcifootprint: busy for '${affordanceId}' was ${said}, not a label — so the row says ` +
          `nothing about it. busy is the app's OWN WORDS for what it is doing ('Saving…'), never a flag: ` +
          `there is no boolean form, because a flag would leave this library to author the meaning. Pass a ` +
          `non-empty string, or undefined to stop saying it.`,
      );
      return undefined;
    }
    return sanitizeProduced(busy) as string;
  }

  /** One busy warning per action — a store reconcile can call this on every emission. */
  #warnBusyOnce(affordanceId: string, message: string): void {
    const key = `busy:${affordanceId}`;
    if (this.#busyWarned.has(key)) return;
    this.#busyWarned.add(key);
    this.#warn(message);
  }

  /**
   * Whether firing this action should be refused as TOOL_DISABLED. Protected seam
   * so InteractionSession can consult the INSTANCE-keyed registration first —
   * a per-row disabled button ('id[instance]') must block, not just the base id.
   *
   * ANY wire saying "disabled" lands here: an app that greys a button knows it
   * in one place, and whichever place that is — a registration field, a handle
   * flip, a live store row, or the authored `enabledWhen` — should reach the
   * agent as the same retriable refusal.
   */
  protected isActionDisabled(affordanceId: string, _opts: FireOptions): boolean {
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
   * WHICH CONJUNCTS proved it — the evidence behind a `TOOL_DISABLED` refusal.
   *
   * `enabledWhen` is machine-evaluated to decide that refusal and the failing
   * half was then thrown away, so the one reader who cannot see the screen was
   * handed a CONCLUSION it could not name a field for. That hole is where an
   * integration's relay put an invented diagnosis. The proof existed the whole
   * time; nothing new is computed here that the gate did not already compute.
   *
   * THE FAILING CONJUNCTS ONLY, in the shape `GUARD_FAILED` already serves. The
   * ones that held are not why the control is off. Unevaluable keys cannot
   * appear at all — `#evalGuard` drops them before evaluating — so this can
   * never name a key the library did not read.
   *
   * DECLARATION-DRIVEN ONLY, which is the honesty half. An imperative
   * `setEnabled(false)` (registration, group handle, live store row) declares no
   * conditions, and there is nothing to infer from: the app switched the control
   * off and said nothing about why, so the refusal says exactly that much and
   * the authored sentence beside it keeps forbidding a guess.
   *
   * Re-read on the refusal path rather than threaded through
   * {@link isActionDisabled}: that seam is a boolean a subclass overrides
   * (nav-session.ts), and this asks the same declaration against the same state
   * view one statement later, so the two cannot disagree.
   */
  #disabledEvidence(affordanceId: string): FilterCondition[] | undefined {
    const enabledWhen = this.spec.affordances[affordanceId]?.enabledWhen;
    if (!enabledWhen) return undefined;
    const evaluation = this.#evalGuard(enabledWhen);
    if (filterVerdict(evaluation) !== 'failed') return undefined;
    // Copy the condition objects: the same shapes ride the gap ledger, and a
    // consumer annotating a refusal must never rewrite the trace.
    const failing = evaluation.conditions
      .filter((condition) => !condition.result)
      .map((condition) => ({ ...condition }));
    // An `enabledWhen: {}` proves disabled while naming nothing (evaluateFilter
    // never matches an empty filter). No conjuncts, no key — absence, not [].
    /* v8 ignore next -- the `undefined` arm is unreachable: it stands for an `enabledWhen: {}` (which proves disabled while naming nothing), and BOTH authoring doors refuse an empty filter before a graph exists. It keeps 'no conjuncts' spelled as absence rather than as an empty list. */
    return failing.length > 0 ? failing : undefined;
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
      // Read ONCE, used twice: the marker below and the app's own reason beside
      // it must answer the same question in the same breath, or a row could
      // carry a reason for a control it also calls clickable.
      const switchedOff = this.#registry.isEnabled(aff.id) === false || this.#disabledByDeclaration(aff);
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
        ...(switchedOff ? { enabled: false } : {}),
        // WHY THE APP SAYS IT IS OFF — read HERE, and only on a control that is
        // actually off. A live control carries no blocked sentence however the
        // app declared one (the presence law `unblockedBy` keeps, for the same
        // reason: a reason for an open door is a reason to wait for nothing),
        // so an app that declares nothing serves the same bytes it always did.
        ...(switchedOff ? this.#blockedBecauseFor(aff) : {}),
        // THE THIRD STATE, if the app has said it: working right now, in the
        // app's own words. Read exactly where `enabled` is read (the base
        // registration for this action) and stamped exactly how it is stamped —
        // presence only, so silence stays "the library does not know" rather
        // than becoming a cheerful "not busy". Nothing is derived here: no
        // declaration proves it, no clock expires it, no element is consulted.
        ...this.#busyFor(aff.id),
        // What the control HOLDS right now, read HERE — on the fresh row, never
        // stored on `expects` or `binding`, which are shared and deep-frozen so
        // one rendered contract can reach every caller. A value that changes
        // between two turns cannot live on an object built to be shared.
        ...this.#holdsFor(aff, expects),
        evidence: conditions,
        ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
        schema: aff.schema,
        ...(expects !== undefined ? { expects } : {}),
        highEffect: aff.highEffect,
        // The declared destination, served BEFORE the fire — the same claim the
        // human's confirm receipt has always carried (ConfirmWillDo.navigatesTo).
        ...(aff.effect?.navigatesTo !== undefined ? { navigatesTo: aff.effect.navigatesTo } : {}),
        // THE DECISION HERE IS A PERSON'S, said on the row a model reads BEFORE
        // it reaches for anything. Presence is the whole claim, and the filter
        // behind it never rides: a served row carries verdicts and stamps, not
        // conditions — the same reason `enabledWhen` itself is not here.
        ...(aff.humanDecides !== undefined ? { humanDecides: true as const } : {}),
        binding: aff.binding,
        ...(aff.descriptionSource === 'registration' ? { descriptionSource: 'registration' as const } : {}),
      });
    }
    return { version: this.#version, node: this.#node, edges };
  }

  /**
   * The app's "working right now" for one action, or NO KEY. Whatever the app
   * stored is what is served — there is no arithmetic here, and deliberately no
   * per-instance dimension: one served row stands for every mounted card of a
   * repeats container, so picking a card's label would name a card nobody asked
   * about (the reason {@link servesHolds} exists, and the same answer).
   *
   * That answer covers the ROW and stops there. A fire names its card, and
   * `enabled` has a per-instance door that a fire really does consult — `busy`
   * has none, so a label the app set on one card is absent from that card's
   * refusal. Stated as a limit on the busy page rather than argued away here.
   */
  #busyFor(affordanceId: string): { busy: string } | Record<string, never> {
    const busy = this.#registry.busyOf(affordanceId);
    return busy === undefined ? {} : { busy };
  }

  /**
   * THE APP'S OWN REASON THIS CONTROL IS OFF, or NO KEY — the read side of
   * {@link BlockedBecause}, and every arm but the last is absence.
   *
   * Called only from the switched-off arm of a row, which is the whole presence
   * law: this never answers about a live control.
   *
   * - nothing declared → nothing. No fallback: not the failing conjuncts (those
   *   are `evidence`, and they are ours, not the app's words), not a sentence
   *   built here. The refusal's authored line already says nothing here knows
   *   why, and it must stay true wherever the app did not say.
   * - a written sentence → it, REBUILT field by field. The row owns its bytes,
   *   and a reader answering a wider object cannot smuggle extra fields onto a
   *   surface a model reads.
   * - a READER → called fresh, at every row assembly, never cached: the whole
   *   point of the form is a reason that changes while the page is open, and a
   *   cached one would be this library reporting the sentence from last turn.
   *   Returning `undefined` says NOTHING — the same spelling of absence every
   *   other reader in this file uses.
   * - a reader that THROWS, or answers a shape this library cannot read as a
   *   reason → nothing, plus ONE dev warning per action (this runs on every
   *   served row, and every refused fire assembles rows for its gap context, so
   *   a per-call warning is the console flood `watch-page.ts` already refuses).
   *   Keyed by ACTION rather than by action-and-reason — the narrower grain
   *   `holds` uses — because both faults have one correction, "make the reader
   *   answer a usable reason", and one action shouting twice for one mistake
   *   teaches nothing the first line did not.
   *
   * READING THE ANSWER IS PART OF THE READ, exactly as it is for `holds`: a
   * returned object whose own getter throws fails one level below the call, so
   * the whole read — call, judge, copy — sits inside the one guard. Outside it,
   * a single app closure would take down `available()` and, through the gap
   * context, every refused fire.
   */
  #blockedBecauseFor(aff: Affordance): { blockedBecause: BlockedBecause } | Record<string, never> {
    const declared = aff.blockedBecause;
    if (declared === undefined) return {};
    if (typeof declared !== 'function') return { blockedBecause: { says: declared.says, clearedBy: declared.clearedBy } };
    try {
      const answered = declared();
      if (answered === undefined) return {};
      // The SAME reading both authoring doors apply to a written sentence, one
      // turn later — whatever the compiler would have refused, a reader is
      // refused for, so the two can never teach different shapes.
      if (blockedBecauseFault(answered) !== undefined) {
        this.#warnBlockedOnce(
          aff.id,
          `hcifootprint: the blockedBecause reader for '${aff.id}' answered something this library cannot ` +
            `read as a reason — the row says nothing about why this control is off rather than printing a ` +
            `reason nobody wrote. Return { says, clearedBy } with a non-empty says and clearedBy one of ` +
            `'app', 'user', 'invalid' — or undefined to say nothing.`,
        );
        return {};
      }
      return { blockedBecause: { says: answered.says, clearedBy: answered.clearedBy } };
    } catch (error) {
      this.#warnBlockedOnce(
        aff.id,
        `hcifootprint: the blockedBecause reader for '${aff.id}' threw: ${String(error)} — the row says ` +
          `nothing about why this control is off rather than reporting a reason nobody read.`,
      );
      return {};
    }
  }

  /** One blocked-reason warning per action — this path runs on every served row. */
  #warnBlockedOnce(affordanceId: string, message: string): void {
    if (this.#blockedWarned.has(affordanceId)) return;
    this.#blockedWarned.add(affordanceId);
    this.#warn(message);
  }

  // -------------------------------------------------------------------------
  // holds — what a control is holding right now (the value door)
  // -------------------------------------------------------------------------

  /**
   * Hand over a reader for what one control HOLDS — the per-element
   * DECLARATION door, and the one the sensor forwards `ControlDeclaration.value`
   * into. Returns the release, token-identity like every other declaration pair
   * in this library: it drops the reader it was handed and nothing else, so
   * attach → attach → detach nets to the surviving declaration rather than to
   * silence.
   *
   * PRECEDENCE, stated once: this door OUTRANKS the registration-time `holds:`
   * reader for the same action. A declaration is the more specific statement —
   * it is about the element on screen, not about the tool — which is the same
   * rank order the sensor's own two evidence levels keep.
   *
   * An id no affordance answers to is filed and simply never served. Not a
   * refusal, and deliberately not a warning: a control can be handed over before
   * the tool that declares it is mounted, and shouting at a mount race would
   * teach nothing true.
   *
   * A READING, NOT A BINDING — see {@link AvailableEdge.holds}. Nothing here
   * changes what a fire sends; the fire reads its own payload at act time. And
   * the reader must BE a read: it runs once per served row, on a path every
   * refused fire also walks.
   */
  declareHolds(affordanceId: string, read: () => unknown): () => void {
    const key = canonicalHoldsKey(affordanceId);
    const stack = this.#holdsDeclared.get(key);
    if (stack) stack.push(read);
    else this.#holdsDeclared.set(key, [read]);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const live = this.#holdsDeclared.get(key);
      /* v8 ignore next -- unreachable: these closures are the ONLY writers of #holdsDeclared, each releases once (the `released` latch above), and a stack is deleted only when its last reader leaves — so this reader's own stack is always still here. */
      if (!live) return;
      const at = live.lastIndexOf(read);
      /* v8 ignore next -- and its own entry is always still in that stack, for the same reason. */
      if (at === -1) return;
      live.splice(at, 1);
      if (live.length === 0) this.#holdsDeclared.delete(key);
    };
  }

  /**
   * File a REGISTRATION-time reader, owned by the mount group that declared it —
   * so `unregisterGroup` releases it with the handlers beside it and an unmounted
   * component's closure can never keep answering. Protected: the public
   * registration doors live on the tree layer, which resolves a leaf name to its
   * qualified id first.
   */
  protected registerHolds(affordanceId: string, group: string, read: () => unknown): void {
    const key = canonicalHoldsKey(affordanceId);
    const existing = this.#holdsRegistered.get(key);
    // The same sentence the handler registry says about the same event, because
    // it is the same event one field over: two groups claiming one control. Last
    // write wins here as it does there — but only the handler side stacks back to
    // a survivor, so a silent replace here ends with the row going BARE when the
    // newer group unmounts while the older one is still on screen.
    if (existing !== undefined && existing.group !== group) {
      this.#warn(
        `hcifootprint: the value reader for '${affordanceId}' was replaced by group '${group}' ` +
          `(previously '${existing.group}') — last registration wins, and releasing '${group}' takes the ` +
          `row's value with it rather than handing it back. Two components claiming one control is the ` +
          `usual cause.`,
      );
    }
    this.#holdsRegistered.set(key, { group, read });
  }

  /**
   * May this edge serve `holds` at all? Yes wherever one action names one
   * control. The tree layer overrides it for a repeats container, where the row
   * stands for many rows at once.
   *
   * Consulted ONLY when a reader exists, so an override that teaches does so to
   * an app that actually declared one.
   */
  protected servesHolds(_affordanceId: string): boolean {
    return true;
  }

  /**
   * What this control holds right now, or NO KEY — the whole read side, and
   * every arm but the last one is absence.
   *
   * - the author's `'none'` → nothing. An action that refuses a value has no
   *   value to hold, and a reader must not be able to re-open a door the author
   *   shut (the sensor's `refusesAValue` law, aimed at this surface).
   * - nothing declared → nothing. There is no fallback: not the app's state
   *   under a same-looking key, not a rendered node. `sensor/payload.ts` states
   *   why in full, and it is the same reason here — a plausible wrong value is
   *   indistinguishable, on the row, from a right one.
   * - a row standing for many rows → nothing (see {@link servesHolds}).
   * - a reader that THROWS → nothing, plus a dev warning (once per action —
   *   this runs on every served row). Never `null`: `null` is a value the app
   *   chose, and stamping it for a failure would report a cleared box the human
   *   never cleared. READING THE VALUE IS PART OF THE READ: a returned object
   *   whose own property getter throws (a revoked proxy, a component mid-
   *   teardown) fails one level below the reader, so the whole read — call,
   *   bound, redact — is inside the one guard. Outside it, a single app value
   *   took down `available()` and, through the gap context, every refused fire.
   * - a value this library cannot read as data → nothing, plus a dev warning. A
   *   Map, a Set, a Date has no own enumerable fields, so bounding it produces
   *   `{}` — and `holds: {}` says THE BOX IS EMPTY about a box that is full.
   *   Absence says the one true thing instead.
   * - a reader answering `undefined` → nothing. `undefined` is how this library
   *   spells absence everywhere else, so building the key here would produce the
   *   one shape this surface promises never to serve.
   * - otherwise → the value, READ LATE (the getter runs at row assembly, so the
   *   row carries what the box holds now rather than a copy of what it held),
   *   bounded exactly like a handler's return, then redacted through
   *   `redactedFields.payload` — REDACTION POINT 4 of 4, because what a control
   *   holds IS the future fire's payload one turn early.
   */
  #holdsFor(aff: Affordance, expects: unknown): { holds: unknown } | Record<string, never> {
    // The SERVED contract, not the compiled flag: `'none'` is the author's word
    // and this is the one place both spellings of it arrive as the same value.
    // An ABSENT contract is not 'none' — it neither demands a value nor refuses
    // one — so a declared reader still answers, exactly as a declared value still
    // rides a fire (sensor/payload.ts `takesAValue` / `refusesAValue`).
    if (expects === NO_INPUT) return {};
    const key = canonicalHoldsKey(aff.id);
    const declared = this.#holdsDeclared.get(key);
    const read = declared?.[declared.length - 1] ?? this.#holdsRegistered.get(key)?.read;
    if (read === undefined) return {};
    if (!this.servesHolds(aff.id)) return {};
    try {
      const raw = read();
      if (raw === undefined) return {};
      // Bounded first, then hidden: sanitizeProduced flattens what it can into
      // plain objects, so the redaction walk is over a shape it can see all of —
      // the same order, for the same reason, as the record's `produced`. A reader
      // answering a function sanitizes to nothing, which is absence, not
      // `holds: undefined`.
      const bounded = sanitizeProduced(raw);
      if (bounded === undefined) return {};
      if (emptyBoxFor(raw, bounded)) {
        this.#warnHoldsOnce(
          `unreadable:${aff.id}`,
          `hcifootprint: the holds reader for '${aff.id}' answered a ${describeKind(raw)}, which this ` +
            `library cannot carry on a row as data — serving it would print an EMPTY box for a box that ` +
            `is not empty, so the row says nothing about it. Return the plain value the control holds ` +
            `(a string, a number, or an object of them).`,
        );
        return {};
      }
      return { holds: redactFields(bounded, this.#redactedFields.payload) };
    } catch (error) {
      this.#warnHoldsOnce(
        `threw:${aff.id}`,
        `hcifootprint: the holds reader for '${aff.id}' threw: ${String(error)} — the row says nothing ` +
          `about what this control holds rather than reporting a value nobody read.`,
      );
      return {};
    }
  }

  /**
   * One warning per action per reason. This path runs on every served row — and
   * every refused fire assembles rows for its gap context — so a per-call warning
   * is a console flood, which is the sibling bug `watch-page.ts` already refuses
   * to ship ("an every-click console flood is its own bug").
   */
  #warnHoldsOnce(key: string, message: string): void {
    if (this.#holdsWarned.has(key)) return;
    this.#holdsWarned.add(key);
    this.#warn(message);
  }

  // -------------------------------------------------------------------------
  // registerHandlers — the live-binding wire (declare statically, bind dynamically)
  // -------------------------------------------------------------------------

  /**
   * Build an ActionGroup handle for a generated group id. Protected: the PUBLIC
   * node-scoped entry points (registerActions / registerAction) live on
   * InteractionSession (the tree API — they take a node path). A flat Session
   * binds through {@link registerHandlers}. `setEnabled` may be overridden for
   * instance-aware key mapping.
   */
  protected makeActionGroup(
    group: string,
    node?: string,
    setEnabled?: (actionId: string, enabled: boolean) => void,
    setBusy?: (actionId: string, busy: string | undefined) => void,
  ): ActionGroup {
    return {
      id: group,
      ...(node !== undefined ? { node } : {}),
      setEnabled: setEnabled ?? ((actionId: string, enabled: boolean) => this.setActionEnabled(actionId, enabled)),
      setBusy: setBusy ?? ((actionId: string, busy: string | undefined) => this.setActionBusy(actionId, busy)),
      unregister: () => this.unregisterGroup(group),
    };
  }

  /**
   * Bind the app's existing handlers to declared actions on a FLAT graph (no
   * node tree). Takes a caller `group` string; the tree API
   * (InteractionSession.registerActions) is preferred where you have a node
   * path — it returns a handle so you never invent a group name.
   */
  registerHandlers(opts: RegisterHandlersOptions): RegisteredHandlers {
    const unknown = Object.keys(opts.handlers).filter((id) => !this.spec.affordances[id]);
    if (unknown.length > 0) {
      throw new Error(
        `hcifootprint: registerHandlers group '${opts.group}' includes undeclared affordance(s) ` +
          `${unknown.map((u) => `'${u}'`).join(', ')} — declare them in the navigation graph first ` +
          `(known: ${Object.keys(this.spec.affordances).join(', ')}).`,
      );
    }
    const triggers: Record<string, (payload?: unknown) => FireResult> = {};
    for (const [affordanceId, handler] of Object.entries(opts.handlers)) {
      this.bindHandler(opts.group, affordanceId, handler);
      triggers[affordanceId] = (payload?: unknown) =>
        this.fire(affordanceId, { source: 'user', payload });
    }
    this.noteStructureChange();
    const registered = new Set(Object.keys(opts.handlers));
    return {
      triggers,
      // A door that registers an action should be able to grey it out — the
      // group handle on the tree API has always offered this, and its absence
      // here was an asymmetry rather than a decision: a flat session could mount
      // a control and then had no way to say it is currently unclickable.
      //
      // SCOPED TO WHAT THIS GROUP REGISTERED, which is why the capability is not
      // simply public on the session: enablement belongs to whoever mounted the
      // control, and a caller reaching past that would be switching off someone
      // else's button.
      setEnabled: (actionId: string, enabled: boolean) => {
        this.#assertGroupGoverns(opts.group, registered, actionId, 'enable/disable');
        this.setActionEnabled(actionId, enabled);
      },
      // THE THIRD STATE, through the same door and under the same scope. A
      // control is clickable, switched off, or working; two of the three had a
      // wire here and the third did not, which is an asymmetry rather than a
      // decision — and one with a consequence, since `useWorking` takes handles
      // by their `setBusy`.
      setBusy: (actionId: string, label: string | undefined) => {
        this.#assertGroupGoverns(opts.group, registered, actionId, 'set busy on');
        this.setActionBusy(actionId, label);
      },
      unregister: () => this.unregisterGroup(opts.group),
    };
  }

  /**
   * A group governs only what it mounted. Shared by both state wires on the
   * handle so they can never drift into two different scoping rules — the
   * refusal names what this group actually registered, so the caller can see
   * whose control they reached for.
   */
  #assertGroupGoverns(
    group: string,
    registered: ReadonlySet<string>,
    actionId: string,
    verb: string,
  ): void {
    if (registered.has(actionId)) return;
    throw new Error(
      `hcifootprint: group '${group}' cannot ${verb} '${actionId}' — it registered ` +
        `${[...registered].map((id) => `'${id}'`).join(', ')}. A group governs only what it mounted.`,
    );
  }

  /** Remove every live binding currently owned by `group` (component unmount). */
  unregisterGroup(group: string): string[] {
    const removed = this.#registry.unregisterGroup(group);
    // D21 — a contextful wrapper's site and its anchor go with the handlers that
    // brought them, on the same terms: each release takes back only what IT put
    // there, so a group that re-registered after this one keeps its wire.
    for (const release of this.#contextReleases.get(group) ?? []) release();
    this.#contextReleases.delete(group);
    // The group's value readers go with its handlers: an unmounted component's
    // closure still answering "what does this control hold" is the stale-read bug
    // this whole surface exists to avoid. Ownership-checked like the registry's
    // own removal — a group that re-declared after this one keeps its reader.
    for (const [id, entry] of this.#holdsRegistered) {
      if (entry.group === group) this.#holdsRegistered.delete(id);
    }
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

  /** Journey-level disclosure for the planning LLM (descriptions + feasibility, no tool detail). */
  availableJourneys(): { version: number; node: string; journeys: AvailableJourney[] } {
    const journeys: AvailableJourney[] = [];
    for (const journey of Object.values(this.spec.journeys)) {
      const pre = this.#evalGuard(journey.precondition);
      const entry = this.spec.affordances[journey.steps[0]];
      const entryGuard = this.#evalGuard(entry.guard);
      journeys.push({
        id: journey.id,
        description: journey.description,
        steps: [...journey.steps],
        preconditionPassed: pre.matched,
        evidence: pre.conditions,
        ...(pre.unevaluable.length > 0 ? { preconditionUnevaluable: pre.unevaluable } : {}),
        entryAvailable: entry.on.includes(this.#node) && entryGuard.matched,
      });
    }
    return { version: this.#version, node: this.#node, journeys };
  }

  // -------------------------------------------------------------------------
  // Journey frames — on-demand disclosure: serve journeys, expand tools on commit
  // -------------------------------------------------------------------------

  /**
   * Commit to a journey: opens a frame so toMCPTools()/contextBrief() serve ONLY
   * that journey's currently-fireable steps plus escape tools — the token win
   * (journeys for planning, tools on commit). One frame at a time in v0.
   *
   * Never-trap invariant: an agent commit whose entry step cannot materialise
   * right now is refused ENTRY_NOT_MATERIALIZED instead of opening a frame
   * that could never act (see the gate below).
   */
  commitJourney(
    journeyId: string,
    opts?: { source?: Principal; expectedVersion?: number },
  ): CommitJourneyResult {
    const journey = this.spec.journeys[journeyId];
    if (!journey) {
      return { ok: false, reason: 'UNKNOWN_JOURNEY', known: Object.keys(this.spec.journeys) };
    }
    if (opts?.expectedVersion !== undefined && opts.expectedVersion !== this.#version) {
      return { ok: false, reason: 'STALE_CURSOR', version: this.#version };
    }
    if (this.#frame) {
      return { ok: false, reason: 'FRAME_ALREADY_OPEN', journeyId: this.#frame.journeyId };
    }
    const pre = this.#evalGuard(journey.precondition);
    if (!pre.matched) {
      return { ok: false, reason: 'PRECONDITION_FAILED', evidence: pre.conditions };
    }
    const principal = opts?.source ?? 'agent';
    // THE NEVER-TRAP COMMIT GATE (fifth refusal, after the existing four): a
    // journey whose ENTRY step could not act right now must never open its frame
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
      const entryId = journey.steps[0];
      const entry = this.spec.affordances[entryId];
      if (!this.couldMaterialise(entryId)) {
        this.recordRejection(entryId, 'ENTRY_NOT_MATERIALIZED', principal, undefined, undefined, {
          gestureKind: entry?.binding?.kind,
          journeyId,
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
      journeyId,
      status: 'open',
      principal,
      openedAt: Date.now(),
      openedAtVersion: this.#version,
      firedSteps: [],
      inferredSteps: [],
    };
    this.#version++; // the served action space just changed
    this.#bumpStructure();
    return { ok: true, frame: this.#frameCopy()!, plan: this.journeyPlan(journeyId), version: this.#version };
  }

  /**
   * Close the open frame. Default reason: 'completed' if every step was
   * committed while the frame was open, else 'cancelled'. Returns the closed
   * frame, or null when none was open.
   */
  leaveJourney(opts?: { reason?: 'completed' | 'cancelled' }): JourneyFrame | null {
    if (!this.#frame) return null;
    const journey = this.spec.journeys[this.#frame.journeyId];
    // Completion counts observed AND inferred steps; inferredSteps on the
    // returned frame says which of them were guesses.
    const allDone = journey.steps.every(
      (step) => this.#frame!.firedSteps.includes(step) || this.#frame!.inferredSteps.includes(step),
    );
    this.#frame.status = opts?.reason ?? (allDone ? 'completed' : 'cancelled');
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    const closed = this.#frameCopy(this.#frame);
    this.#frame = null;
    this.#version++; // back to journey-level disclosure
    this.#bumpStructure();
    return closed;
  }

  /** The open journey frame (snapshot), or null. */
  journeyFrame(): JourneyFrame | null {
    return this.#frameCopy();
  }

  /** Frame history: every closed frame (completed / cancelled / demoted), oldest first. */
  frames(): JourneyFrame[] {
    return this.#frames.map((f) => this.#frameCopy(f)!);
  }

  /**
   * HOW DO I GET THERE — the fewest declared hops from where the cursor is to
   * `pageId`, each naming the action whose claim makes the hop.
   *
   * `[]` when you are already there; `null` when nobody declares a route — the
   * honest absence, not "it cannot be reached", because an app may navigate in
   * ways it never declared.
   *
   * DERIVED from `effect.navigatesTo`, which exists for other reasons. Pages
   * declare no edges to each other; an action's claim IS the edge, so there is
   * nothing to author and nothing that can drift.
   *
   * A ROUTE IS NOT A PLAN, and not a permission. It reports declared hops in
   * fewest-hops order — arithmetic, not preference; a preferred order toward a
   * goal is a journey, which is declared. And it does not promise the hops are
   * open: a guard may be closed or a control greyed. Availability is answered
   * on the row of the action you are about to reach for, and is deliberately
   * NOT guessed here for pages you have not arrived at, because the state at a
   * page this session has never seen is a thing it cannot honestly speak to.
   */
  howToReach(pageId: string): RouteStep[] | null {
    // A PAGE NOBODY DECLARED IS A DIFFERENT ANSWER FROM A PAGE NOBODY ROUTES TO,
    // and `null` cannot be both. Read as honest absence, a typo or a renamed page
    // would say "this app declares no way there" — turning a caller's mistake
    // into a finding about the app, and an under-declared graph is exactly what a
    // reader of this method is trying to detect. Every sibling read refuses an
    // unknown id by name (`explain`, `journeyPlan`), and the known list is right
    // here, so the refusal teaches instead of misinforming.
    if (!Object.hasOwn(this.spec.pages, pageId)) {
      throw new Error(
        `hcifootprint: unknown page '${pageId}'. Known: ${Object.keys(this.spec.pages).join(', ')}.`,
      );
    }
    return routeBetween(this.spec.affordances, this.#node, pageId);
  }

  /**
   * WHAT WOULD FREE THIS ACTION — the actions whose declared writes touch a key
   * this one is waiting on, each with the specific keys.
   *
   * The same rule `journeyPlan` runs over a journey's steps, widened to every
   * declared action: DERIVED, never authored. Both halves already exist for
   * other reasons (`writes` powers verification; `guard` and `enabledWhen`
   * power availability), so nothing new is declared and nothing can drift.
   *
   * IT ANSWERS A QUESTION A GREYED CONTROL OTHERWISE CANNOT. `enabled: false`
   * says a control is off; this says what the app itself claims would change
   * that — so a reader stops re-firing a dead button to find out.
   *
   * FOUR HONESTY LIMITS, each a test:
   * - **Only the conditions that did NOT hold.** The keys are evaluated against
   *   live state, never read off the declaration. A control is offered at all
   *   only once its guard HOLDS, so naming actions that write a satisfied
   *   condition's keys would answer with the actions that DESTROY the thing the
   *   control is standing on — "discard the draft", "log out" — and read as
   *   advice to fire them. Inverted, and inverted toward the highest-effect
   *   actions in the app. What is not holding it back is not an answer to what
   *   would free it.
   * - **A claim, not a promise.** `writes` is the app's claim that an action
   *   changes a key. This reports the claim; firing that action is not promised
   *   to free this one.
   * - **Silence over guessing.** An action nobody claims to write a key for
   *   returns `[]` — the honest "nothing here knows what would change it",
   *   never an invented suggestion. A condition the library could not evaluate
   *   is dropped by the same law: it is not evidence of a block.
   * - **Never a plan.** The list is unordered and unranked. Ordering intent is
   *   a journey, which is declared, not derived.
   *
   * Scope is every declared action, not just this node's: the control that
   * frees a greyed button often lives on another page, and hiding a true
   * answer to keep the list short would be the wrong trade.
   */
  whatUnblocks(affordanceId: string): DependencyEdge[] {
    const aff = this.spec.affordances[affordanceId];
    return unblockingDependencies(
      this.spec.affordances,
      Object.keys(this.spec.affordances),
      affordanceId,
      [...this.#unmetKeys(aff?.guard), ...this.#unmetKeys(aff?.enabledWhen)],
    );
  }

  /**
   * The conjunct keys of one declared condition that the app's CURRENT state
   * does not meet. Unevaluable keys never appear — `#evalGuard` drops them
   * before evaluating, so this can only ever name a key the library actually
   * read and actually found wanting.
   */
  #unmetKeys(filter: WhereFilter | undefined): string[] {
    if (!filter) return [];
    return this.#evalGuard(filter)
      .conditions.filter((condition) => !condition.result)
      .map((condition) => condition.key);
  }

  /**
   * The DERIVED intra-journey dependency DAG with live status. Dependencies are
   * computed, never authored: step B depends on step A when A's declared
   * effect.writes overlap B's guard keys — the guard×effect atoms already
   * encode the ordering, so it cannot drift from the graph.
   */
  journeyPlan(journeyId: string): JourneyPlan {
    const journey = this.spec.journeys[journeyId];
    if (!journey) {
      throw new Error(
        `hcifootprint: unknown journey '${journeyId}'. Known: ${Object.keys(this.spec.journeys).join(', ')}.`,
      );
    }
    const steps: JourneyPlanStep[] = journey.steps.map((stepId) => {
      const aff = this.spec.affordances[stepId];
      const dependsOn = stepDependencies(this.spec.affordances, journey.steps, stepId);

      const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
      const frameForJourney = this.#frame?.journeyId === journeyId ? this.#frame : null;
      const status = frameForJourney?.firedSteps.includes(stepId)
        ? 'done'
        : frameForJourney?.inferredSteps.includes(stepId)
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
        // The per-step conditional facts already ride this row; ownership is
        // one more, so the serving layer reads it off the plan instead of
        // re-deriving it per rendering and risking two lists that disagree
        // about one control's owner.
        ...(aff.humanDecides !== undefined ? { humanDecides: true as const } : {}),
      } as JourneyPlanStep;
    });
    return { journeyId, description: journey.description, steps };
  }

  /**
   * journeyPlan() for an id the caller did not author — a model's, a URL's, a
   * config file's — answering with a value instead of a throw. Same plan; the
   * failure arm is the UNKNOWN_JOURNEY shape commitJourney() already returns.
   *
   * journeyPlan() keeps throwing, deliberately. Every caller inside the library
   * passes an id the spec itself just yielded, and there an unknown id is a bug
   * that should stop the program, not a branch someone forgets to write. This
   * is the door for ids that arrive from outside, where not-a-journey is an
   * ordinary answer.
   *
   * Membership is Object.hasOwn rather than a truthiness lookup BECAUSE the ids
   * here are untrusted: `journeys['constructor']` is truthy on any plain object,
   * so a lookup would sail past the guard and fail downstream reading `.steps`
   * off Object's constructor — a TypeError where the caller asked for exactly
   * the honest "no such journey" this method exists to give.
   */
  tryJourneyPlan(journeyId: string): TryJourneyPlanResult {
    if (!Object.hasOwn(this.spec.journeys, journeyId)) {
      return { ok: false, reason: 'UNKNOWN_JOURNEY', known: Object.keys(this.spec.journeys) };
    }
    return { ok: true, plan: this.journeyPlan(journeyId) };
  }

  /**
   * WHERE ONE JOURNEY STANDS — one settled word for the whole chain, and the
   * facts behind it.
   *
   * The question a reader actually has between turns is not "what may I fire
   * next" (that is the plan's, and `whats_here`'s) but "whose turn is it, and is
   * this thing moving". Answering it from the plan alone means re-implementing
   * library law outside the library — which rows close which card, what a
   * relayed decline does NOT close, when a refusal is a failure and when it is
   * nothing of the kind — and two surfaces that re-derive it can disagree about
   * one chain, which reads to a model as "the human already answered".
   *
   * A PURE FOLD over the plan, the ask book, the decisions book, retained
   * settlements and frame history. No state of its own, no cache, no timer, and
   * it never fires: computed fresh on every call, so the word is true about NOW
   * rather than about the last time somebody asked. Two calls in a row change
   * nothing and agree with each other.
   *
   * The walk, stated as the walk it is:
   *
   * 1. An OPEN frame for this journey governs. Otherwise a latest-closed
   *    `'completed'` frame answers `'done'`; a cancelled or demoted one
   *    contributes history and never a verdict — abandonment is not completion
   *    and not failure — so the live plan is walked instead.
   * 2. Walk the steps in chain order. The FIRST step that is not done is the
   *    GOVERNING step, and its hold names the standing: an open card
   *    (`'awaiting-human'`), the human's own no (`'declined'`), a decision that
   *    belongs to a person (`'with-the-human'`), a last attempt that came to
   *    rest badly (`'failed'`), an evaluated failing guard (`'blocked'`), else
   *    `'in-progress'`.
   * 3. Every step done → `'done'`. A journey nobody has started walks arm 2 like
   *    any other, and `'in-progress'` with `stepsDone: 0` is the honest reading
   *    of "open, and nothing holds it" — the counts say plainly that nothing has
   *    fired.
   *
   * `'failed'` IS NEVER MINTED FROM A PAUSE. Not from needs-confirm, not from a
   * relayed decline, not from any approval refusal, not from a guard, disabled
   * or materialization refusal. A refusal is not an execution: nothing ran, so
   * nothing failed. `'failed'` requires a fire that actually came to rest badly,
   * and the evidence carries a POINTER to it — the receipt itself stays
   * `did_it_work`'s to serve, once.
   *
   * Throws on an id this graph does not have, exactly as
   * {@link Session.journeyPlan} does and through that method's own refusal —
   * serving layers resolve names first.
   */
  journeyStanding(journeyId: string): JourneyStanding {
    // journeyPlan's throw IS this method's throw: one refusal, so an unknown id
    // can never be answered one way here and another way there.
    const plan = this.journeyPlan(journeyId);
    const stepsTotal = plan.steps.length;
    const isDone = (step: JourneyPlanStep): boolean =>
      step.status === 'done' || step.status === 'inferred-done';

    if (this.#frame?.journeyId !== journeyId) {
      const closed = this.#frames.filter((frame) => frame.journeyId === journeyId).pop();
      if (closed?.status === 'completed') {
        const journeySteps = this.spec.journeys[journeyId].steps;
        const stepsDone = journeySteps.filter(
          (step) => closed.firedSteps.includes(step) || closed.inferredSteps.includes(step),
        ).length;
        return { journeyId, standing: 'done', evidence: { stepsDone, stepsTotal } };
      }
    }

    const stepsDone = plan.steps.filter(isDone).length;
    const governing = plan.steps.find((step) => !isDone(step));
    if (governing === undefined) {
      return { journeyId, standing: 'done', evidence: { stepsDone, stepsTotal } };
    }
    const step = governing.affordanceId;
    const counts = { step, stepsDone, stepsTotal };

    // A CARD IS THE SHARPER REFERENT, so an open one outranks everything below
    // it: while a person is looking at a question, that is where the chain is.
    const card = this.#latestAskFor(step);
    if (card !== undefined && card.answer === undefined) {
      return { journeyId, standing: 'awaiting-human', evidence: { ...counts, askId: card.askId } };
    }
    // …and their NO closes it. Only the human's own door writes this answer: a
    // relayed decline records a report and closes nothing, so the card above is
    // still open and the standing is still 'awaiting-human'.
    if (card?.answer === 'declined') {
      return { journeyId, standing: 'declined', evidence: { ...counts, askId: card.askId } };
    }

    // THE DECISION IS THEIRS. `made: true` stays here rather than moving the
    // chain on by itself — that is the resumption cue, said in data, and acting
    // on it is the caller's move.
    const decision = this.#decisionFor(step);
    if (decision !== undefined && governing.status === 'ready') {
      return {
        journeyId,
        standing: 'with-the-human',
        evidence: {
          ...counts,
          ...(decision.about !== undefined ? { about: decision.about } : {}),
          made: decision.made,
          ...(decision.madeBy !== undefined ? { madeBy: decision.madeBy } : {}),
        },
      };
    }

    const failedAt = this.#lastAttemptCameToRestBadly(step);
    if (failedAt !== undefined) {
      return { journeyId, standing: 'failed', evidence: { ...counts, transitionId: failedAt } };
    }
    // EVALUATED failing conditions, and the plan already answers exactly that:
    // it carries `blockedOn` on a step whose guard was evaluated and failed, and
    // on no other. A step held only by keys nobody could read is not blocked,
    // carries none, and falls through to the honest word below.
    if (governing.blockedOn !== undefined) {
      return {
        journeyId,
        standing: 'blocked',
        evidence: { ...counts, blockedOn: governing.blockedOn },
      };
    }
    // Taken-on-faith is not blocked — the same asymmetry as everywhere else —
    // so the marker is carried rather than resolved into a verdict.
    return {
      journeyId,
      standing: 'in-progress',
      evidence: {
        ...counts,
        ...(governing.guardUnevaluated ? { guardUnevaluated: governing.guardUnevaluated } : {}),
      },
    };
  }

  /** The NEWEST card this session minted for one action, whatever became of it. */
  #latestAskFor(affordanceId: string): OpenAsk | undefined {
    let latest: OpenAsk | undefined;
    for (const ask of this.#openAsks.values()) if (ask.affordanceId === affordanceId) latest = ask;
    return latest;
  }

  /** The decision row for one action, or nothing where the app declared none. */
  #decisionFor(affordanceId: string): DecisionStatus | undefined {
    return this.decisions().find((row) => row.affordanceId === affordanceId);
  }

  /**
   * The id of this action's LAST fire, when that fire came to rest badly and
   * nothing has succeeded since — a refused settlement, or a record the app
   * rejected or rolled back.
   *
   * The LAST attempt only, which is what makes "with no later success" true
   * without a second pass: a fire that went well after a failed one is simply
   * the row this walk stops on.
   */
  #lastAttemptCameToRestBadly(affordanceId: string): string | undefined {
    for (let i = this.#transitions.length - 1; i >= 0; i--) {
      const row = this.#transitions[i];
      if (row.cause.kind !== 'fired' || row.cause.affordanceId !== affordanceId) continue;
      const badly =
        this.#settlements.get(row.id)?.effectStatus === 'refused' ||
        row.outcome === 'rejected' ||
        row.outcome === 'rolled-back';
      return badly ? row.id : undefined;
    }
    return undefined;
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
    // READ AND CLEARED ON THE FIRST LINE. The contextful channel is one-shot by
    // construction (see #contextFire): a fire that never reached this line —
    // refused by a tree gate in the InteractionSession override — cannot leave
    // the channel armed for somebody else's fire, and neither can a nested fire
    // inherit it.
    const assist = this.#contextFire;
    this.#contextFire = null;
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
    //
    // WITH ITS PROOF where the app declared one: the `enabledWhen` conjuncts
    // that did not hold ride the refusal and the ledger row exactly as
    // GUARD_FAILED's do above, so a reader can NAME the field instead of being
    // told a conclusion. Absent for the imperative wires — see #disabledEvidence.
    if (opts.invoke !== false && this.isActionDisabled(affordanceId, opts)) {
      const evidence = this.#disabledEvidence(affordanceId);
      this.recordRejection(affordanceId, 'TOOL_DISABLED', source, evidence);
      return { ok: false, reason: 'TOOL_DISABLED', affordanceId, ...(evidence ? { evidence } : {}) };
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
    //
    // A DIRECT contextful call answers YES through the second arm, and it is the
    // whole reason that arm exists: the fire is record-only (the app is running
    // its own function, and a session that invoked as well would run one human
    // click twice), yet somebody IS executing it — so the settlement must stay
    // open until that somebody reports, exactly as it does for a handler this
    // session ran itself. Without it a human's click on a no-writes action
    // settles 'unobservable' before the app's own function has even started.
    const handlerWillRun = (opts.invoke !== false && !unmaterialized) || assist?.direct === true;
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
      // THE NAME IS CAPTURED HERE, at the only moment it is certainly true: the
      // spec has this action right now — the gate above proved it — and nothing
      // guarantees it still will when someone reads this row back.
      cause: {
        kind: 'fired',
        affordanceId,
        principal: source,
        ...this.#captureDoes(affordanceId),
        // LAW 3, stamped at the source. A sense-only anchor saw a trusted click
        // and nothing else: that is evidence a person acted, never proof this
        // action is what they performed, and the marker says so in the field
        // every reader of a cause already checks. A DIRECT call is not stamped —
        // the app called its own function, which is an observation.
        ...(assist?.inferred === true ? { inferred: true as const } : {}),
      },
      timestamp: Date.now(),
      // REDACTION POINT 1 of 4 (SessionOptions.redactedFields.payload). The
      // RECORD's copy only: the handler is still handed `opts.payload` below, and
      // the gate above already compared the real values. Written redacted here
      // rather than filtered at each export door, so transitions(), the
      // 'transition' event, every settlement's `transition`, and any journal
      // export are covered by one line and a tenth door cannot forget.
      //
      // MUTATION PROOF: drop the redactFields() call and four tests in
      // redacted-fields.test.ts go red with the card number in hand — all three
      // under "a fire's payload" (the record, every export, the live listener)
      // plus the one proving a passed array cannot be widened after the fact.
      //
      // AND A DIRECT CONTEXTFUL CALL RECORDS ITS ALLOWLIST, NOT ITS ARGUMENT
      // (law 1). Every gate above judged the REAL value — a schema must see what
      // the app actually passed — but the argument to a human's own click is a
      // value this library never saw before D21, so what it may keep is what the
      // app named in `include` and nothing else. An agent's fire is untouched:
      // it sent that payload through this door itself, under the redaction dial
      // the app already controls.
      payload: redactFields(
        assist?.direct === true ? assist.recordPayload : opts.payload,
        this.#redactedFields.payload,
      ),
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
    // AND IF NOBODY APPROVED IT, SAY SO — once, to the integrator, never to the
    // model. Read AFTER the two lines above because they are what decides
    // whether this fire has an approval on record at all.
    this.#warnUngatedFireOnce(affordanceId, aff, record, source, opts);
    // A new fire closes any older navigation claim's window, and — when this one
    // declares a destination — opens its own.
    //
    // OPENED HERE, AT FIRE TIME, and this is the whole of the window's ordering
    // law: its closers (the next fire, the next observation) run in FIRE order,
    // so an opener that ran at SETTLE re-opened a window that an intervening fire
    // or a contradicting observation had already closed — and a settle that lands
    // late (two rapid fires, the second handler resolving first) handed the
    // window to the OLDER fire. Both produced 'observed' about a navigation
    // nothing corroborated. The stamp still lands at settle; only the window
    // lives here.
    //
    // NOT FOR AN ALLOWED NO-OP: nothing executed it, so there is nothing for an
    // observation to corroborate. It still stamps 'claimed' at settle — the app
    // did declare a destination — and simply can never be upgraded.
    this.#closeArrivalWindow();
    if (aff.effect?.navigatesTo !== undefined && !honestNoOp) {
      this.#navClaim = { recordId: record.id, target: aff.effect.navigatesTo };
    }
    // D21 — the capture envelope opens BEFORE the first emit, so the very first
    // observer of this row already sees what was true the moment before it ran.
    this.#openCapture(record, aff, conditions, unevaluable, opts);
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
        this.#invokingActionId = affordanceId;
        try {
          return handler(opts.payload);
        } finally {
          this.#invokingRecordId = null;
          this.#invokingActionId = null;
        }
      })
      .then((returnValue) => this.#invocationSucceeded(record, affordanceId, returnValue))
      .catch((error) => this.#invocationFailed(record, affordanceId, error));
  }

  /**
   * ONE ACTION FINISHED — whichever side ran it.
   *
   * Extracted from #invokeHandler when D21 gave the app's OWN call the same
   * settlement it always gave the agent's: a human clicking a wrapped handler
   * and an agent firing it now come to rest through this exact code, so the two
   * doors cannot drift into two settlement stories. (contextful/contextful.ts is
   * the other caller, via #directRun.)
   */
  #invocationSucceeded(
    record: TransitionRecord,
    affordanceId: string,
    returnValue: unknown,
    /**
     * The APP called its own function, so the value came back to the app's own
     * code — not to an agent that asked for it. Set on the direct contextful
     * path, and the reason is law 1: `produced` is the act → get data back
     * channel for a caller who ASKED, and a wrapper must not turn a human's own
     * return value into a channel the agent reads. An agent's fire captures it
     * exactly as it always did.
     */
    returnedToTheApp = false,
  ): void {
    const aff = this.spec.affordances[affordanceId];
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
      this.#warn(`hcifootprint: handler for '${affordanceId}' returned failure: ${String(reason)}`);
      return;
    }
    // Act → get data back: whatever the handler returned (search results, a
    // looked-up record) rides the DATA channel on the record — sanitized +
    // capped so untrusted content can never become planner instructions.
    if (
      !returnedToTheApp &&
      this.#captureProduced &&
      returnValue !== undefined &&
      returnValue !== null
    ) {
      // REDACTION POINT 2 of 4 (SessionOptions.redactedFields.produced).
      // AFTER the sanitizer, deliberately: sanitizeProduced has already
      // flattened Maps and class instances into plain objects and dropped
      // whatever exceeded its caps, so the walk below is over a plain shape
      // and can never be defeated by an exotic one. Nothing is lost by the
      // order — a value the sanitizer dropped reaches no audience either —
      // and the marker survives its later re-sanitizing (it is an 11-char
      // string, far inside the 200-char cap).
      //
      // MUTATION PROOF: drop the redactFields() call and the three tests under
      // "a handler's return value" (redacted-fields.test.ts) go red — the
      // model's door, the settlement, and the wire, one each.
      record.produced = redactFields(sanitizeProduced(returnValue), this.#redactedFields.produced);
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
  }

  /** The other half of the same pair: an action that threw, whichever side ran it. */
  #invocationFailed(record: TransitionRecord, affordanceId: string, error: unknown): void {
    this.#handleHandlerFailure(record, error);
    this.#warn(`hcifootprint: handler for '${affordanceId}' threw: ${String(error)}`);
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
    // D21 — stamped HERE rather than at settlement, because a failure can land
    // after this fire has already come to rest (an app function that throws two
    // turns later, a verify contract that refuses a committed row). The
    // settlement receipt is never rewritten; the live record still gains the
    // class of what went wrong.
    this.#captureFailure(record, reason);
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
  // D21 — contextful actions: the capture envelope, and the anchor that senses
  // -------------------------------------------------------------------------

  /**
   * SENSE-ONLY — declare that this action lives at that element, with no handler
   * to wrap. The L0 on-ramp, and the human-interleave path: an app whose button
   * does its own thing still gets its people into the record.
   *
   * A TRUSTED click inside the anchor opens a record-only fire (the browser has
   * already run the app's code — a fire that also invoked would run one human
   * click twice) stamped `cause.inferred`, carrying the correlation rule on the
   * record. Nothing here performs anything, and nothing here reads a value.
   *
   * Returns the release, token-identity like every other declaration pair in
   * this library. An id no affordance answers to is filed and simply reports
   * whatever refusal its own fire earns — a control can be handed over before
   * the action that declares it is mounted, and refusing at this door would only
   * shout at a mount race.
   */
  sense(affordanceId: string, declaration: SenseDeclaration): () => void {
    const options = declaration.options;
    this.#senses.set(affordanceId, options);
    const releaseAnchor = this.#openAnchor(affordanceId, options, () =>
      this.#senseClick(affordanceId),
    );
    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseAnchor();
      // Token identity: a newer declaration for this action has already taken
      // the slot, and deleting it here is how a StrictMode remount goes blind.
      if (this.#senses.get(affordanceId) === options) this.#senses.delete(affordanceId);
    };
  }

  /**
   * The whole event trail behind one contextful fire — the door the record
   * points at when the trail was too long to ride inline.
   *
   * ONE DOOR FOR BOTH SHAPES: an inline trail is answered off the record itself,
   * so a caller never has to branch on which shape it got (the record still SAYS
   * which, because a reader deserves to know whether they are holding everything
   * or a pointer to it). Copies, never the live arrays.
   *
   * Throws for an id this session cannot answer for — the same stance
   * {@link Session.settlementOf} takes, and for the same reason: a silent `[]`
   * would read as "nothing happened" about an action that may have had three
   * hundred events.
   */
  sensedTrail(transitionId: string): readonly SensedEvent[] {
    const retained = this.#trails.get(transitionId);
    if (retained !== undefined) return retained.map((event) => ({ ...event }));
    const trail = this.#transitions.find((t) => t.id === transitionId)?.captured?.sensed?.trail;
    if (trail?.shape === 'inline') return trail.events.map((event) => ({ ...event }));
    throw new Error(
      `hcifootprint: no event trail for '${transitionId}'. A trail exists only for a contextful fire ` +
        `whose action was watching an anchor, and only the newest ${TRAILS_RETAINED} oversized trails are ` +
        `kept — the record's own \`captured.sensed.trail.count\` survives either way.`,
    );
  }

  /**
   * THE ONE REGISTRATION DOOR, and the reason D21 needed no new option: every
   * way an app binds a handler — the flat `registerHandlers`, the tree's
   * `registerActions`, a mount-declared action, a live source — lands here, so
   * recognising a contextful wrapper happens once instead of at four call sites
   * that could each forget.
   *
   * Recognition is a BRAND ON THE FUNCTION (contextful/contextful.ts): the
   * registry is deliberately session-blind and stores plain handlers, so the
   * declaration travels on the handler itself. Registering binds the site the
   * wrapper reports through and attaches its anchor; unregistering takes both
   * back, token-identity, with the group that owns them.
   */
  protected bindHandler(
    group: string,
    registryKey: string,
    handler: ActionHandler,
    enabled = true,
    busy?: string,
  ): void {
    this.#registry.register(group, registryKey, handler, enabled, busy);
    const brand = readContextful(handler);
    if (brand === undefined) return;
    const actionId = baseActionId(registryKey);
    const instance = registryKey === actionId ? undefined : registryKey.slice(actionId.length + 1, -1);
    const site = this.#siteFor(actionId, instance, brand.options);
    brand.site = site;
    const releaseAnchor = this.#openAnchor(actionId, brand.options);
    const releases = this.#contextReleases.get(group) ?? [];
    releases.push(() => {
      // Only the site THIS registration installed may be taken back — a newer
      // registration has already superseded it, and clearing that one is how a
      // StrictMode remount ends up with a wrapper reporting to nobody.
      if (brand.site === site) brand.site = null;
      releaseAnchor();
    });
    this.#contextReleases.set(group, releases);
  }

  /** The contextful declaration behind one action: the handler's brand, or a sense-only one. */
  #contextOptions(affordanceId: string, opts: FireOptions): ContextfulOptions | undefined {
    const handler = this.handlerFor(affordanceId, opts);
    const brand = handler === undefined ? undefined : readContextful(handler);
    return brand?.options ?? this.#senses.get(affordanceId);
  }

  /**
   * Open the envelope: what was true the moment before this action ran.
   *
   * LAW 1 LIVES IN THE ARGUMENTS. The guard block is built from key NAMES and
   * outcomes — never from the conditions themselves, which carry state — and the
   * input block is the app's allowlist projection or nothing at all.
   */
  #openCapture(
    record: TransitionRecord,
    aff: Affordance,
    conditions: FilterCondition[],
    unevaluable: string[],
    opts: FireOptions,
  ): void {
    const options = this.#contextOptions(aff.id, opts);
    if (options === undefined) return;
    const input = projectInput(opts.payload, options);
    record.captured = {
      before: {
        at: record.timestamp,
        node: record.fromNode,
        cursorVersion: record.cursorVersion,
        guard: guardReads(Object.keys(aff.guard ?? {}), conditions, unevaluable),
        ...(input !== undefined ? { input } : {}),
      },
    };
    this.#captures.set(record.id, { options, actionId: aff.id });
    this.#anchors.get(aff.id)?.watch.open();
  }

  /** The failure block: the error CLASS always, its message only behind the allowlist. */
  #captureFailure(record: TransitionRecord, reason: unknown): void {
    const entry = this.#captures.get(record.id);
    if (entry === undefined || record.captured === undefined) return;
    // First failure wins, like every other settlement fact on this record.
    /* v8 ignore next -- unreachable today: the failure spine is entered once per invocation (a handler either throws, returns a refusal, or succeeds and meets its verify contract), so no record reaches it twice. The guard is what keeps a SECOND failure — a rollback re-entering the spine, an app that rejects a row its own handler already failed — from rewriting the first thing the app said went wrong. */
    if (record.captured.failure !== undefined) return;
    record.captured.failure = failureOf(reason, entry.options);
  }

  /** Close the envelope at rest, and ask the anchor for what it saw. */
  #closeCapture(record: TransitionRecord, effectStatus: FireSettlement['effectStatus']): void {
    const entry = this.#captures.get(record.id);
    if (entry === undefined || record.captured === undefined) return;
    /* v8 ignore next -- unreachable today: #effectSnapshot is reached only through the two latch doors, and both are guarded by first-settlement-wins before they get here. The guard states that law for the CAPTURE too, so a future third door cannot quietly re-time an action that already came to rest. */
    if (record.captured.after !== undefined) return; // first settlement wins here too
    const at = Date.now();
    record.captured.after = {
      at,
      ms: at - record.captured.before.at,
      effectStatus,
      outcome: record.outcome,
    };
    this.#anchors
      .get(entry.actionId)
      ?.watch.close((summary, events) => this.#stampSensed(record, summary, events));
  }

  /**
   * The sensing block, one turn after rest (see contextful/anchor.ts's header
   * for why the window ends where it does).
   *
   * It lands on the LIVE record and is announced like the `arrival: 'observed'`
   * upgrade it is modelled on — same shape, same reason: the receipt taken at
   * rest is never rewritten, and an observer that mirrors rows still learns.
   */
  #stampSensed(
    record: TransitionRecord,
    summary: SensedSummary,
    events: readonly SensedEvent[],
  ): void {
    /* v8 ignore next -- unreachable: the only caller is #closeCapture, which has already proved this record HAS a capture, and nothing deletes one. The guard is what keeps a future caller from inventing a sensing block on a record that never opened an envelope. */
    if (record.captured === undefined) return;
    record.captured.sensed = summary;
    if (summary.trail.shape === 'by-reference') this.#retainTrail(record.id, events);
    this.#emitTransition(record);
  }

  /** Keep an oversized trail, newest {@link TRAILS_RETAINED} — bulk evidence, not a ledger row. */
  #retainTrail(transitionId: string, events: readonly SensedEvent[]): void {
    this.#trails.set(transitionId, [...events]);
    for (const oldest of this.#trails.keys()) {
      if (this.#trails.size <= TRAILS_RETAINED) break;
      this.#trails.delete(oldest);
    }
  }

  /**
   * Start (or join) the watch at one action's anchor. Returns the release.
   *
   * REFCOUNTED ON THE ELEMENT, because React StrictMode mounts twice before it
   * unmounts once: the second registration of the same control must not double
   * every listener, and the first release must not silence the survivor. A
   * registration naming a DIFFERENT element is a move, not a remount — the old
   * watch stops and the new one takes over (last registration wins, the
   * registry's own rule).
   */
  #openAnchor(actionId: string, options: ContextfulOptions, onHumanClick?: () => void): () => void {
    if (options.watch !== true) return NOTHING_TO_RELEASE;
    const element = resolveAnchor(options.anchor);
    if (element === undefined) {
      this.#warnContextOnce(
        `anchor:${actionId}`,
        `hcifootprint: '${actionId}' is contextful with watch: true, but no anchor was handed over — ` +
          `nothing is being sensed. Pass the element the action lives at: ` +
          `contextful(fn, { watch: true, anchor: () => ref.current }). A getter is the SSR-safe form.`,
      );
      return NOTHING_TO_RELEASE;
    }
    const existing = this.#anchors.get(actionId);
    if (existing !== undefined && existing.element === element) {
      existing.refs += 1;
      return () => this.#releaseAnchor(actionId, existing);
    }
    existing?.watch.stop();
    const entry: AnchorEntry = {
      element,
      refs: 1,
      watch: watchAnchor(element, {
        ...(options.expect !== undefined ? { expect: options.expect } : {}),
        ...(options.onStimulus !== undefined ? { onStimulus: options.onStimulus } : {}),
        ...(onHumanClick !== undefined ? { onHumanClick } : {}),
        now: () => Date.now(),
        warn: (message) => this.#warn(message),
      }),
    };
    this.#anchors.set(actionId, entry);
    return () => this.#releaseAnchor(actionId, entry);
  }

  /** One release of one anchor reference; the last one stops the watch. */
  #releaseAnchor(actionId: string, entry: AnchorEntry): void {
    entry.refs -= 1;
    if (entry.refs > 0) return;
    // Only if this entry is still the live one: a MOVE already stopped it and
    // put a newer watch in the slot, and deleting that one would blind the
    // control that is actually on screen.
    if (this.#anchors.get(actionId) !== entry) return;
    entry.watch.stop();
    this.#anchors.delete(actionId);
  }

  /** One contextful complaint per reason — the #warnedOnce discipline. */
  #warnContextOnce(key: string, message: string): void {
    if (this.#contextWarned.has(key)) return;
    this.#contextWarned.add(key);
    this.#warn(message);
  }

  /**
   * The wire a wrapped handler reports through — one per registration, and it
   * CARRIES the declaration it was built from.
   *
   * Carried rather than looked up again: the brand is right there at
   * registration, and a second lookup at call time would have to guess a
   * registry key and could answer differently from the site that is calling it.
   */
  #siteFor(actionId: string, instance: string | undefined, options: ContextfulOptions): ContextfulSite {
    return {
      // Keyed on the ACTION: a wrapped handler called from inside ANOTHER
      // action's handler must answer no, or its call would attach itself to the
      // neighbour's fire and the ledger would name the wrong action.
      invoking: () => this.#invokingActionId === actionId,
      direct: (payload, run) => this.#directRun(actionId, instance, options, payload, run),
    };
  }

  /**
   * THE APP CALLING ITS OWN ACTION — the second direction of one declaration.
   *
   * Record first (record-only: the app is about to run its own function, and a
   * fire that also invoked would run one human click twice), then run it, then
   * come to rest through the SAME two methods an agent's fire uses — so a human
   * click and an agent call settle identically, verify contract and all.
   *
   * A REFUSED FIRE STILL RUNS THE APP'S FUNCTION. Severability is the whole
   * promise of this wrapper: deleting it must change nothing about behaviour, so
   * a guard the graph has closed can ledger a rejection but can never stop the
   * app's own button from working. The refusal is on the record either way.
   */
  #directRun(
    actionId: string,
    instance: string | undefined,
    options: ContextfulOptions,
    payload: unknown,
    run: () => unknown,
  ): unknown {
    const result = this.#fireAssisted(
      actionId,
      {
        source: options.principal ?? 'user',
        // The one canonical door: RECORD, never perform (sensor/types.ts).
        invoke: false,
        payload,
        ...(instance !== undefined ? { instance } : {}),
      },
      { direct: true, recordPayload: projectInput(payload, options) },
    );
    if (!result.ok) return run();
    const record = result.transition;
    const entry = this.#pending.find((p) => p.record.id === record.id);
    if (entry) entry.handlerInFlight = true;
    // The same attribution window #invokeHandler opens: an updateState() the
    // app's function makes inline lands on THIS record rather than being
    // FIFO-matched to a neighbour.
    this.#invokingRecordId = record.id;
    this.#invokingActionId = actionId;
    let returned: unknown;
    let thrown: unknown;
    let failed = false;
    try {
      returned = run();
    } catch (error) {
      failed = true;
      thrown = error;
    }
    this.#invokingRecordId = null;
    this.#invokingActionId = null;
    if (failed) {
      this.#invocationFailed(record, actionId, thrown);
      throw thrown; // the app's own error reaches the app, exactly as it did before
    }
    if (isThenable(returned)) {
      // The ORIGINAL promise is what the app gets back; this is a second reader
      // of it, so nothing is swallowed and no unhandled rejection is invented.
      void returned.then(
        (value) => this.#invocationSucceeded(record, actionId, value, true),
        (error: unknown) => this.#invocationFailed(record, actionId, error),
      );
      return returned;
    }
    this.#invocationSucceeded(record, actionId, returned, true);
    return returned;
  }

  /** Arm the one-shot contextful channel for exactly one fire. */
  #fireAssisted(affordanceId: string, opts: FireOptions, assist: ContextAssist): FireResult {
    this.#contextFire = assist;
    try {
      return this.fire(affordanceId, opts);
    } finally {
      // fire() clears it on its first line; this covers the fire that never got
      // there — an InteractionSession tree gate refusing before super.fire().
      this.#contextFire = null;
    }
  }

  /** A trusted click inside a sense-only anchor: evidence a person acted, never proof. */
  #senseClick(affordanceId: string): void {
    this.#fireAssisted(affordanceId, { source: 'user', invoke: false }, { inferred: true });
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
    // D21 — THE ONE PLACE A FIRE COMES TO REST, whichever arm brought it here,
    // so the capture's `after` block is stamped exactly once and BEFORE the copy
    // below: a receipt carries how the action came to rest, and the sensing that
    // lands a turn later rides the live record alone (the `arrival: 'observed'`
    // precedent — a receipt taken at rest is never rewritten).
    this.#closeCapture(record, effectStatus);
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
    /* v8 ignore next 6 -- two of the three arms below are unreachable, and v8 can only exempt the statement they live in. The 'opened no settlement' arm: every ok fire leaves an open latch or a RETAINED settlement, so a fired id never gets this far. The `?? 'stimulus'` fallback: a stimulus row's name is defaulted where the row is recorded, so it is never missing here. Both keep the refusal a sentence rather than a shrug if either invariant is relaxed. */
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
      // RUNG 1 — the report NAMES the fire, so the book takes that fire's own
      // recorded principal.
      this.#noteDecisionDelta(delta, this.#decisionPrincipalOf(pending.record));
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
        // RUNG 2 — the report IS that fire's, by construction: nothing is
        // matched, so nothing can be mismatched.
        this.#noteDecisionDelta(delta, this.#decisionPrincipalOf(pending.record));
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
        // A MATCHING RUNG — FIFO computes a join and can mis-attribute
        // predictably, so any decision this delta touches loses its maker.
        this.#noteDecisionDelta(delta, null);
        this.#settleAttributed(pending, delta);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
      // Every pending is handler-in-flight. If the delta covers exactly ONE
      // in-flight pending's declared writes, it is that handler's own report
      // (arriving from its async portion, past the #invokingRecordId window) —
      // settle THAT record precisely instead of stranding it forever.
      const deltaKeys = Object.keys(delta);
      const own = this.#pending.filter((p) => {
        /* v8 ignore next -- the `?? []` arm is unreachable: a fire only joins #pending when its affordance DECLARED writes, so every pending here has some. */
        const writes = p.affordance.effect?.writes ?? [];
        return writes.length > 0 && writes.every((key) => deltaKeys.includes(key));
      });
      if (own.length === 1) {
        const pending = own[0];
        this.#pending.splice(this.#pending.indexOf(pending), 1);
        // A MATCHING RUNG — a signature match, not an identity. Cleared.
        this.#noteDecisionDelta(delta, null);
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
        // A MATCHING RUNG, and the one the record itself flags as a guess
        // (`Cause.inferred`). A guess never names who decided something.
        this.#noteDecisionDelta(delta, null);
        const guardEval = this.#evalGuard(inferred.guard);
        const record: TransitionRecord = {
          id: buildRuntimeStageId(inferred.id, this.#counter.value++),
          cause: {
            kind: 'fired',
            affordanceId: inferred.id,
            principal: 'unknown',
            inferred: true,
            // A guessed ATTRIBUTION is still a real action: the match came out
            // of the spec, so the row captures its name like any other. What
            // stays a guess is `inferred`, and nothing here softens that.
            ...this.#captureDoes(inferred.id),
          },
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
        // A guessed fire is still a fire: it closes an older claim's window, for
        // the same reason a real one does — two candidates, no way to tell which
        // moved the app, so nothing is corroborated.
        this.#closeArrivalWindow();
        this.#transitions.push(record); this.#emitTransition(record);
        this.#version++;
        this.#bumpState();
        // A guessed completion never advances firedSteps, but it must be VISIBLE
        // to the plan — 'inferred-done' — or the agent blind-refires the step.
        if (
          this.#frame &&
          this.spec.journeys[this.#frame.journeyId].steps.includes(inferred.id) &&
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
    // RUNG 3 AND THE FLOOR, in one arm because the code has one. A caller that
    // STATED a principal is naming it outright, and it rides the book verbatim.
    // A report that stated none names nobody — the floor's `'system'` is this
    // library's honest default for a record, never somebody's claim to a
    // decision — so the book clears.
    this.#noteDecisionDelta(delta, opts?.principal ?? null);
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

  /**
   * One committed delta, written into the decisions book — set where identity
   * travelled with the report, CLEARED where it did not.
   *
   * Called from every arm of {@link Session.updateState} and nowhere else,
   * because those arms are the only place a state delta and its attribution are
   * both known. `principal: null` means "no door that carries identity said
   * anything", and the entry is removed rather than left standing: a stamp that
   * outlives the report that earned it is a person's name on somebody else's
   * value.
   *
   * Untouched decisions keep whatever they held. The book is keyed by ACTION,
   * and a delta that misses every one of an action's `doneWhen` keys is not news
   * about that action.
   */
  #noteDecisionDelta(delta: Record<string, unknown>, principal: Principal | null): void {
    const deltaKeys = Object.keys(delta);
    if (deltaKeys.length === 0) return; // an empty commit is a cursor stop, not a touch
    for (const aff of Object.values(this.spec.affordances)) {
      const doneWhen = aff.humanDecides?.doneWhen;
      if (doneWhen === undefined) continue;
      if (!Object.keys(doneWhen).some((key) => deltaKeys.includes(key))) continue;
      if (principal === null) this.#decisionsBook.delete(aff.id);
      else this.#decisionsBook.set(aff.id, principal);
    }
  }

  /**
   * The principal a FIRE carries, for the book — or nothing, when the row itself
   * says its attribution was guessed.
   *
   * Belt and braces, and said out loud as such: a row flagged `inferred` is the
   * library's own admission that nobody observed who acted, and such a row must
   * never mint an entry on ANY path, not only on the arm that creates it.
   */
  #decisionPrincipalOf(record: TransitionRecord): Principal | null {
    /* v8 ignore next -- unreachable today: an inferred row is minted by the inference arm alone, which never joins #pending, so no pending record can carry the flag. The line is the invariant written where it is relied on, so a future path that DID pend an inferred row could not launder a guess into a maker. */
    if (record.cause.inferred === true) return null;
    return record.cause.principal;
  }

  /**
   * EVERY DECISION IN THIS GRAPH THAT BELONGS TO A PERSON, and whether it has
   * been made — read at the moment you ask.
   *
   * The sibling of {@link Session.asks}: that one answers "is anything waiting
   * on a person?", this one answers "is anything a person's to DECIDE?". Two
   * different questions with two different next moves — wait for a card to be
   * answered, or present options and stop — so they are two lists and they share
   * no vocabulary. Nothing here mints an ask, an askId, a card or a receipt, and
   * nothing here ever will.
   *
   * GRAPH-WIDE, like the ask book. A decision on another page still holds a
   * journey, so every declaring control has a row wherever it lives — the row is
   * about a declaration, not about where the cursor happens to be.
   *
   * A LIVE READ. `made` is evaluated fresh against projected state on every
   * call, and `madeBy` is served only beside `made: true` and only from the
   * decisions book. Nothing is cached, nothing is timed, and nothing here fires:
   * `made: true` is a state reading, not a command.
   *
   * No per-instance rows: the declaration is action-level and `doneWhen` reads
   * flat projected-state keys. An app modelling per-row decisions models them in
   * its own keys — a stated limit, not a roadmap promise.
   */
  decisions(): DecisionStatus[] {
    const rows: DecisionStatus[] = [];
    for (const aff of Object.values(this.spec.affordances)) {
      const declared = aff.humanDecides;
      if (declared === undefined) continue;
      const made = this.#decisionMade(declared.doneWhen);
      const madeBy = made === true ? this.#decisionsBook.get(aff.id) : undefined;
      rows.push({
        affordanceId: aff.id,
        ...(declared.about !== undefined ? { about: declared.about } : {}),
        made,
        ...(madeBy !== undefined ? { madeBy } : {}),
      });
    }
    return rows;
  }

  /**
   * Whether the app's own "it has been decided" holds — `true`, `false`, or the
   * third answer that is not a softer `false`.
   *
   * `'unknown'` WHENEVER ANY KEY IS UNEVALUABLE, and that is the `guardUnevaluated`
   * asymmetry applied to decisions. `made` is a claim about the WHOLE
   * declaration, so a filter half-read is a filter unread: `false` is reserved
   * for a condition this library actually evaluated, because "it was evaluated
   * and does not hold" and "nobody could tell" are answers to different
   * questions and only one of them says a person has not answered yet.
   */
  #decisionMade(doneWhen: WhereFilter | undefined): boolean | 'unknown' {
    if (doneWhen === undefined) return 'unknown';
    const { matched, unevaluable } = this.#evalGuard(doneWhen);
    return unevaluable.length > 0 ? 'unknown' : matched;
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
      // Off the fire's own row, not off the spec: a fire can still be waiting
      // for its report long after the component that declared it unmounted, and
      // that is precisely the row a reader most needs named.
      ...carriedDoes(p.record.cause.does),
      firedAt: p.record.timestamp,
    }));
  }

  // -------------------------------------------------------------------------
  // The work ledger — the app says what it is still doing (beginWork/openWork)
  // -------------------------------------------------------------------------

  /**
   * SAY THE APP IS WORKING ON SOMETHING, and get back the handle that closes it.
   *
   * The imperative sibling of {@link AvailableEdge.busy}. `busy` is a fact about
   * a CONTROL — the spinner in the button, standing until the app changes it.
   * This is a fact about a PIECE OF WORK: it opens where the work starts, closes
   * where the work ends, and while it is open the readers can say so about the
   * FIRE it belongs to. A fire can come to rest while the app is still working
   * (the delta is reported, the upload continues), and before this ledger every
   * list answered "nothing is live" about exactly that.
   *
   * ```ts
   * const work = session.beginWork('Uploading the photo');
   * try {
   *   await upload(file);
   * } finally {
   *   work.done();
   * }
   * ```
   *
   * WHERE IT LANDS IS DECIDED AT CALL TIME, and never revisited — three homes:
   *
   * 1. `{ transitionId }` — the exact fire, and EXPLICIT WINS, the same order
   *    {@link Session.updateState} keeps. An id this session does not know as a
   *    fire binds to nothing (see below).
   * 2. Inside a handler's synchronous portion — the fire whose handler is
   *    running, read from the same call window `updateState()` reads. No id to
   *    pass, no correlation to get wrong.
   * 3. Neither — an UNBOUND row at principal `'system'`, plus one dev warning.
   *    Work never runs silently: the row is still opened and still served, it
   *    simply does not claim a fire nothing named. The warning exists so an app
   *    cannot believe unbound work is bound.
   *
   * TWO CAVEATS ABOUT HOME 2, and both are the window's shape rather than a bug:
   *
   * - **Call it before the first `await`.** The window is open for the handler's
   *   SYNCHRONOUS portion only. Past an await the handler is no longer "the call
   *   we are inside of" — another fire may be mid-flight — so a later call is
   *   unbound rather than bound to a record that is merely the most recent. (A
   *   handler that must open work late passes `{ transitionId }`.)
   * - **App code around `fire()` is outside the window.** Calling `fire()` and
   *   then `beginWork()` on the next line is home 3: the handler is deferred, so
   *   nothing is running yet. Bind it with the `transitionId` the fire result
   *   just handed you.
   *
   * NOTHING ABOUT THIS IS A GATE OR A CLOCK. Opening work refuses no fire,
   * changes no served row, and does not bump the session version (a plan made
   * before it is not stale — nothing an agent can act on changed). No timer
   * expires a row, and a row that outlives everyone's patience keeps saying the
   * one true thing: the app said it was working and has not said otherwise.
   */
  beginWork(label?: string, opts?: BeginWorkOptions): WorkHandle {
    const workId = `work#${this.#workSeq++}`;
    const entry: WorkEntry = {
      workId,
      ...this.#workLabel(label),
      ...this.#bindWork(label, opts?.transitionId),
      // The session's clock, so a test can hold it still — and DATA either way.
      // Nothing here renders a duration from it and nothing expires a row
      // because of it: a clock is never evidence (answer-grammar.md, rule 2).
      startedAt: this.#now(),
    };
    this.#openWork.set(workId, entry);
    return {
      workId,
      done: (error?: unknown) => this.#closeWork(workId, error),
    };
  }

  /**
   * Work the app has open RIGHT NOW, oldest first — the third "what is still
   * live?" door, beside {@link Session.pending} (fires awaiting the app's state
   * report) and {@link Session.awaitingSettlement} (fires that can still be
   * asked about), and the cousin of {@link Session.asks} (cards awaiting a
   * person).
   *
   * OPEN ONLY, which is what the name promises: a closed row leaves this list
   * the moment `done()` runs and never comes back. Copies, so a caller holding
   * one cannot edit the ledger.
   *
   * Every row here is the APP'S CLAIM about itself. Nothing in this library
   * checks that work is running, measures it, or ends it.
   */
  openWork(): WorkRow[] {
    const rows: WorkRow[] = [];
    for (const entry of this.#openWork.values()) {
      if (entry.closedAt !== undefined) continue;
      rows.push({
        workId: entry.workId,
        ...(entry.label !== undefined ? { label: entry.label } : {}),
        ...(entry.transitionId !== undefined ? { transitionId: entry.transitionId } : {}),
        ...(entry.affordanceId !== undefined ? { affordanceId: entry.affordanceId } : {}),
        ...carriedDoes(entry.does),
        startedAt: entry.startedAt,
        principal: entry.principal,
      });
    }
    return rows;
  }

  /**
   * Close one row. FIRST CLOSE WINS — a second `done()` finds a closed row and
   * returns, so a handle passed around cannot resurrect or re-stamp anything.
   *
   * WHAT IT DELIBERATELY DOES NOT DO is the whole design. It settles no
   * transition, resolves no latch, flips no outcome and touches no ask — not
   * even when an error is handed in. The failure spine stays the doors that have
   * always been it: a handler throw, a returned `{ ok: false }`, and
   * {@link Session.reject}. A `done(error)` that resolved a settlement would
   * fork first-settlement-wins (two independent things racing to write one
   * receipt) and turn an app's note about its own bookkeeping into the library's
   * verdict on an action.
   *
   * The version is not bumped either, for the reason given on
   * {@link Session.beginWork}: nothing an agent plans against changed, and a
   * bumped version is what refuses a fire as STALE_CURSOR.
   */
  #closeWork(workId: string, error: unknown): void {
    const entry = this.#openWork.get(workId);
    if (entry === undefined || entry.closedAt !== undefined) return;
    entry.closedAt = this.#now();
    // Recorded on the WORK ROW, and nowhere else — see WorkEntry.
    if (error !== undefined) entry.error = error;
  }

  /**
   * The app's words for one piece of work, or NO KEY — bounded exactly as every
   * other app string that crosses is bounded, and never rendered into a
   * sentence.
   *
   * A non-string (a JS caller's object, a thrown-together template that came out
   * `undefined`) simply does not become a label: the row still opens, because
   * the row is the point and a name for it is not. No warning is minted here —
   * unlike `busy`, this string enters no served row and no authored line, so a
   * bad one costs a reader nothing.
   */
  #workLabel(label: unknown): { label: string } | Record<string, never> {
    if (typeof label !== 'string' || label.trim() === '') return {};
    return { label: sanitizeProduced(label) as string };
  }

  /**
   * WHICH FIRE THIS WORK BELONGS TO — decided here, at call time, once.
   *
   * Explicit id, then the call window, then nothing. That order is
   * {@link Session.updateState}'s own, and it is one law rather than two: what
   * the caller SAID outranks what the library inferred, everywhere.
   *
   * RECENCY IS NOWHERE IN IT. There is no "the newest fire" arm and no FIFO arm:
   * a work row is opened by app code that either knows its fire or does not, and
   * a guess would be right exactly when nothing was racing — unfalsifiable
   * precisely when the answer matters (`docs/design/answer-grammar.md`, "How
   * completion is correlated"). Unbound is the honest floor, and it is loud.
   */
  #bindWork(
    label: string | undefined,
    transitionId: string | undefined,
  ): { transitionId?: string; affordanceId?: string; does?: string; principal: Principal } {
    if (transitionId !== undefined) {
      const record = this.#transitions.find((t) => t.id === transitionId);
      // A FIRE, specifically. A stimulus row is the world moving with nobody
      // firing anything, so there is no work "for" it and no did_it_work answer
      // it could ride — the same line #noSettlementMessage draws, drawn once.
      if (record !== undefined && record.cause.kind === 'fired') {
        return {
          transitionId,
          /* v8 ignore next 3 -- the `{}` arm is unreachable: a record of kind 'fired' always names the action that was fired. It is written this way because TransitionRecord.cause types the field across BOTH kinds. */
          ...(record.cause.affordanceId !== undefined
            ? { affordanceId: record.cause.affordanceId }
            : {}),
          // The id and the name travel together, off the SAME row — a work row
          // that re-looked-up its action could outlive the mount and start
          // disagreeing with the fire it belongs to.
          ...carriedDoes(record.cause.does),
          principal: record.cause.principal,
        };
      }
      this.#warnWorkOnce(
        // Keyed by the CALLSITE, like the arm below — never by the id, which is
        // the one thing here a caller can rotate. `beginWork('save', {
        // transitionId: job.id })` in a loop is ONE place in the app getting one
        // thing wrong; keyed by id it warned on every pass and grew the warned
        // set by one caller-supplied string each time, for the session's life.
        `unusable-id:${label ?? ''}`,
        // CAPPED, exactly as the label in this same feature is: the id is app
        // text too, and a templated one that came out as a whole response body
        // would cross to onWarn whole.
        `hcifootprint: beginWork({ transitionId: '${sanitizeProduced(transitionId) as string}' }) names ` +
          `${record === undefined ? 'no transition in this session' : 'a row nobody fired (the world moved)'}, ` +
          `so this work row is UNBOUND — it says the app is working and does not say which action. ` +
          `Pass a transitionId from a fire result. Fires still awaiting a settlement: ` +
          `${this.awaitingSettlement().join(', ') || '(none)'}.`,
      );
      return { principal: 'system' };
    }
    if (this.#invokingRecordId !== null) {
      const record = this.#transitions.find((t) => t.id === this.#invokingRecordId);
      /* v8 ignore next 10 -- the else arm is unreachable: #invokingRecordId is set only while a FIRE's handler is running, and that fire's record is in the log under the action that made it. The `{}` inside is unreachable for the same reason the one above is — a fired record always names its action. */
      if (record !== undefined && record.cause.kind === 'fired') {
        return {
          transitionId: record.id,
          ...(record.cause.affordanceId !== undefined
            ? { affordanceId: record.cause.affordanceId }
            : {}),
          ...carriedDoes(record.cause.does),
          principal: record.cause.principal,
        };
      }
    }
    this.#warnWorkOnce(
      `nothing-to-bind:${label ?? ''}`,
      'hcifootprint: beginWork() had nothing to bind to, so this work row is UNBOUND — it says the ' +
        'app is working, and does not say which action it belongs to. Bind it by calling beginWork() ' +
        'inside a handler BEFORE its first await, or by passing { transitionId } from the fire result ' +
        'you are working on (app code around fire() is outside that window — the handler has not run ' +
        'yet). Nothing was dropped: the row is open, openWork() serves it, and the facts block says ' +
        'the app is working on something it did not tie to an action.',
    );
    return { principal: 'system' };
  }

  /**
   * One unbound-work warning per callsite — a save button pressed forty times
   * must teach once, not forty times.
   *
   * Keyed by the LABEL on both arms — prefixed by which arm, so the two
   * complaints about one label are still two — because the label is the only
   * thing here that tells one callsite from another: two different labels are
   * two different places in the app, and one label in a loop is one place. A
   * stack-frame key would be exact and would also charge every unbound call for
   * an Error it will usually throw away.
   *
   * NOT keyed by the transitionId, which was the earlier shape and the one thing
   * a caller can rotate: a callsite templating a stale id warned once per CALL
   * and grew this set by one caller-supplied string each time. A warn-once set
   * that grows with traffic is not a warn-once set.
   */
  #warnWorkOnce(key: string, message: string): void {
    if (this.#workWarned.has(key)) return;
    this.#workWarned.add(key);
    this.#warn(message);
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
      // An OBSERVATION, not a hop — and the one that matters most to a
      // navigation claim: a claimed nav moves the cursor optimistically, so the
      // app's own router confirming that page arrives HERE, not below.
      //
      // A FIRST report of this position is a full rest even though nothing
      // moved: until it landed, the only thing that had placed the cursor here
      // was the app's word, and this is the moment anyone outside can act on it.
      // A REPEAT report is not — the position was already established, and
      // re-reading the world on every redundant router tick would be motion the
      // session invented. Either way the join runs: corroboration is what the
      // report is for.
      if (this.#positionReported) this.#joinArrival(observedNode);
      else {
        this.#positionReported = true;
        this.#cursorCameToRest({ kind: 'observed', node: observedNode });
      }
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
    this.#positionReported = true; // this report is what established the new position
    this.#transitions.push(record); this.#emitTransition(record);
    this.#version++;
    this.#checkFrameAfterWorldChange();
    // The cursor came to rest somewhere new and something REPORTED it — the one
    // rest that can corroborate a navigation claim, and the one that must re-read
    // the live action surface (an app's store has no reason to emit on a route
    // change). Both phases run here, in that order.
    this.#cursorCameToRest({ kind: 'observed', node: observedNode });
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
  // Gap ledger — unmet demand, the input to "which journey should we build next"
  // -------------------------------------------------------------------------

  /**
   * Report an ask that no available action or journey could serve (typically
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
      // The one mark that puts a 'reported' row in front of the model, as an
      // authored line — see ReportGapOptions.actionsMayBeStale.
      ...(opts.actionsMayBeStale === true ? { actionsMayBeStale: true } : {}),
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
    /** Extra triage words for wiring-shaped refusals (which gesture; which journey asked). */
    detail?: { gestureKind?: Binding['kind']; journeyId?: string },
  ): void {
    this.#pushGap({
      kind: 'fire-rejected',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      availableActions: precomputedActions ?? this.available().edges.map((e) => e.affordanceId),
      availableJourneys: Object.keys(this.spec.journeys),
      affordanceId,
      // A refusal is history too, and it splits exactly where the truth does: a
      // real control refused (greyed out, guard closed, approval missing) was
      // DECLARED at this moment and keeps its name for ever after; a name
      // nobody ever authored captures nothing, and goes on rendering as the
      // constant no matter what mounts later.
      ...this.#captureDoes(affordanceId),
      rejectionReason,
      principal,
      // Copy the CONDITION OBJECTS too — the same objects ride FireResult.evidence,
      // and a caller annotating those must not rewrite the ledger.
      ...(evidence !== undefined ? { evidence: evidence.map((c) => ({ ...c })) } : {}),
      ...(detail?.gestureKind !== undefined ? { gestureKind: detail.gestureKind } : {}),
      ...(detail?.journeyId !== undefined ? { journeyId: detail.journeyId } : {}),
    });
  }

  /** Names only — token-lean and injection-safe context for triage. */
  #gapContext(): { availableActions: string[]; availableJourneys: string[] } {
    return {
      availableActions: this.available().edges.map((e) => e.affordanceId),
      availableJourneys: Object.keys(this.spec.journeys),
    };
  }

  /**
   * THE CURSOR CAME TO REST — the three write points, and the ONE order they
   * all take. Two phases and a closing question, and the order is the contract:
   *
   *   1. SESSION-INTERNAL. The join the session owes itself: a claim meeting the
   *      observation that corroborates it. Nothing outside has run yet, so it
   *      reads a settled, self-consistent session.
   *   2. EXTERNAL. Reactions that may drive the session back — a live source
   *      re-reading its action store and mounting or releasing bindings.
   *   3. THE NEVER-TRAP, last, because it is a question about the room AS IT
   *      FINALLY STANDS. Asked before phase 2 it would file a dead-end row
   *      against a page whose door the library had not got around to asking for
   *      — a true observation of a world that existed for one statement.
   *
   * WHY EXTERNAL IS HERE rather than on the 'transition' event: `#emitTransition`
   * fires BEFORE `#version++`, so a reaction riding it would register tools
   * against a version the world had already moved past — and `on()` promises its
   * listeners never change what the session does. This slot is strictly after the
   * record is pushed, the version is bumped and observers have seen it, which is
   * the only point where "the cursor is HERE now" is true for everyone.
   *
   * ONLY A REPORTED REST RUNS PHASES 1 AND 2. A claimed navigation moves the
   * cursor optimistically at a moment when the app's handler has not run: asking
   * the app's own store what is available there would read the page it has not
   * left yet and bind those answers to the new position — worse than not asking.
   * A structure flush moves the cursor not at all, and is usually a phase-2
   * listener's own mount coming back around.
   */
  #cursorCameToRest(rest: CursorRest): void {
    if (rest.kind === 'observed') {
      this.#joinArrival(rest.node);
      this.#notifyPageChanged();
    }
    this.#checkDeadEnd();
  }

  /**
   * Phase 2: hand the rest to whoever asked for it. Isolated per listener (the
   * recorder rule — a live source's failure never aborts a hop that already
   * happened) and non-re-entrant: a listener that moves the cursor again does not
   * nest a second broadcast inside this one.
   *
   * DEFERRED, NOT DROPPED. The nested move is remembered and the pass runs again
   * afterwards, because a dropped broadcast leaves every OTHER listener holding
   * the page the session has already left — a live source that re-read at the old
   * page and never heard about the new one serves that page's bindings under this
   * page's name, and the worst version of that is a confident empty list. Bounded,
   * because two listeners can bounce the cursor between them forever, and a
   * library that spins is worse than one that says so.
   *
   * Iterates a COPY: a listener may unsubscribe itself — or another — mid-loop.
   */
  #notifyPageChanged(): void {
    if (this.#notifyingPageChange) {
      this.#pageChangeMissed = true;
      return;
    }
    if (this.#pageChangeListeners.size === 0) return;
    this.#notifyingPageChange = true;
    try {
      for (let round = 0; round < MAX_PAGE_CHANGE_ROUNDS; round++) {
        this.#pageChangeMissed = false;
        for (const listener of [...this.#pageChangeListeners]) {
          try {
            listener();
          } catch (error) {
            this.#warn(`hcifootprint: a page-change listener threw: ${String(error)}`);
          }
        }
        if (!this.#pageChangeMissed) return;
      }
      this.#warn(
        `hcifootprint: page-change listeners kept moving the cursor after ${MAX_PAGE_CHANGE_ROUNDS} rounds ` +
          `— the re-read stops here, so a listener may be holding an older page than the session is on. A ` +
          `listener that syncs on every page change is the usual cause.`,
      );
    } finally {
      this.#notifyingPageChange = false;
      this.#pageChangeMissed = false;
    }
  }

  /**
   * ARRIVAL — the claim and the observation, joined where they meet.
   *
   * A fire that declared `navigatesTo` stamped `arrival: 'claimed'`: the app
   * SAID it navigates. This is the other half — an observation landing on the
   * page that claim named upgrades it to 'observed'. Nothing else does, and
   * nothing ever writes a third value: see {@link TransitionRecord.arrival}.
   *
   * THE MATCH LAW, and it is narrow on purpose. Two ways to match, no third:
   * exact page-id equality, or — when the observation is a raw path the graph
   * has no page named for — the answer `matchRoute` gives over the WHOLE route
   * table. Never string similarity, never `endsWith` on a pathname. The whole
   * table rather than the claimed page's own route, because a claim on
   * '/orders/:id' would otherwise swallow an observation of '/orders/new' that a
   * more literal route describes exactly; asking the matcher lets the better
   * route win and this join correctly find nothing.
   *
   * THE WINDOW is one claim wide, opens where the fire is RECORDED, and closes on
   * whichever comes first: the next FIRED transition, or the next OBSERVATION.
   * Fire order on both ends, deliberately — a window opened at settle could be
   * re-opened after its own closers had run, and handed to whichever fire settled
   * last rather than the one that fired last. Two rapid fires claiming the same
   * page can never both be corroborated by one observation — the older keeps
   * 'claimed', which is the truth about it. And an observation that landed
   * SOMEWHERE ELSE closes the window without being a verdict: nothing is marked
   * failed, but it is evidence the claim did not describe, and corroborating a
   * later hop across a contradiction would be a guess wearing the word
   * 'observed'.
   *
   * The upgrade does NOT bump the version: nothing about the world changed here,
   * and invalidating live plans for a record annotation would be motion the
   * session invented. It re-emits the record so observers see the join, and it
   * touches nothing else — `toNodeClaimed` stands, and the settlement receipt
   * taken when the fire came to rest was copied at that moment and is never
   * rewritten.
   */
  #joinArrival(observed: string): void {
    const claim = this.#navClaim;
    if (claim === null) return;
    // An authored page id is compared exactly; only an off-graph observation
    // (a raw pathname — what watchLocation reports) is put to the route table.
    const landed =
      this.spec.pages[observed] !== undefined ? observed : matchRoute(this.spec.pages, observed);
    // One observation per claim, whichever way it goes: the window closes here.
    this.#navClaim = null;
    if (landed !== claim.target) return; // elsewhere, or unplaceable: no verdict either way
    const record = this.#transitions.find((t) => t.id === claim.recordId);
    // `!== 'observed'` rather than `=== 'claimed'`: the fire may not have settled
    // yet — a router that moves before its own promise resolves is the ordinary
    // case — so the stamp lands here and #settle's `??=` leaves it standing.
    /* v8 ignore next -- unreachable: the claim window is closed one line above, so no second observation can re-enter with the same claim, and the record a live claim points at is always still in the log. The guard is what makes 'one observation per claim' true of the STAMP and not just of the window. */
    if (record === undefined || record.arrival === 'observed') return;
    record.arrival = 'observed';
    this.#emitTransition(record);
  }

  /**
   * Close the arrival window. Called wherever a FIRED transition is recorded:
   * once anything else has been fired, an observation can no longer be told
   * apart from that fire's own doing, and the library does not guess which of
   * two candidates moved the app.
   */
  #closeArrivalWindow(): void {
    this.#navClaim = null;
  }

  /**
   * THE PAGE-LEVEL NEVER-TRAP. The commit gate refuses a journey FRAME that
   * opens onto an entry nothing can perform; this is the same law one level
   * up, about the room itself. A page where NOTHING the graph puts there could
   * act is a room with no doors: the agent is told the truth ("here is what is
   * available"), fires, is refused, re-reads the same true list, and loops —
   * correctly, on the information it was given. Nobody has to fire for the trap
   * to exist, so nobody has to fire for it to be recorded.
   *
   * ARMED only when materialisation is a live question — `(registry.hasAny()
   * || navigate) && !allowUnmaterializedFires` — the same condition available()
   * uses to stamp `materialized` and commitJourney's entry gate uses to run at
   * all. A session nothing has ever registered on is not "trapped"; it is a
   * graph being read. A tour's fires are honest no-ops by contract.
   *
   * THE QUESTION is couldMaterialise, per edge — the same widened resolution
   * every other never-trap surface asks (registered, else navigate-derived,
   * else instance-wired), so a registered-but-DISABLED action still counts as a
   * door (TOOL_DISABLED is retriable, not missing wiring). It is asked over
   * FULL capability — every affordance the graph places on this page, NOT the
   * available() slice, which two filters have already narrowed. The journey frame
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
   * through every refusal. It runs inside {@link Session.#cursorCameToRest},
   * which owns the three writes where the cursor rests.
   */
  #checkDeadEnd(): void {
    if (this.#allowUnmaterialized) return;
    if (!this.#registry.hasAny() && this.#navigate === undefined) return;
    const offGraph = this.spec.pages[this.#node] === undefined;
    // Keyed on the served-structure FINGERPRINT, not the structure VERSION:
    // that axis also bumps for journey-frame open/close/demote — churn that
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
   * prescribing registerActions for a page the graph never heard of hands the
   * developer a call that throws.
   */
  #deadEndWarning(offGraph: boolean, served: number, authored: number): string {
    if (offGraph) {
      return (
        `hcifootprint: the cursor is on '${this.#node}', which is NOT a page in this graph — an agent ` +
        `standing here is served nothing, and no mount can change that (registerActions('${this.#node}', …) ` +
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
      `Three ways out: registerActions('${this.#node}', …) to wire what is on screen; pass ` +
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
      // A card waits on a PERSON, so it outlives renders by design — the one row
      // here most likely to be read after the control that raised it is gone.
      ...this.#captureDoes(affordanceId),
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
      // A revoked yes is never presented as USABLE: the person withdrew it, and
      // handing it out as live would send the caller into the gate's refusal
      // believing it had an approval. It still lands on the answered fallback
      // below, so the refusal teaches APPROVAL_REVOKED instead of the blank
      // "nobody approved this".
      if (ask.answer === 'approved' && ask.spent !== true && ask.revoked !== true) return ask.askId;
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
   * WITHDRAW A YES THE PERSON ALREADY GAVE, before anything spends it — the ask
   * book's third word. The ordinary human act of changing one's mind had no
   * door: `declineAsk` refuses an answered card (a decision is never
   * overwritten), so a withdrawal was caught only by the app's own rules and
   * was INVISIBLE on the served surface, which kept holding a yes the person
   * had taken back.
   *
   * APPEND-ONLY, like everything in this journal: the `'approved'` row is
   * NEVER rewritten. The withdrawal is a NEW `'revoked'` row referencing the
   * askId — principal, timestamp, `by` — and the ask book carries the fact as
   * data ({@link AskStatus.revoked}) beside the answer it does not touch. A
   * fire that then presents the pointer refuses `APPROVAL_REVOKED`, through
   * every door the gate guards; the cure is a fresh ask.
   *
   * THE BOUNDARIES, each a typed refusal rather than a throw:
   * - an UNANSWERED card refuses `REVOKE_UNANSWERED` — there is no yes to
   *   withdraw, and the right verb for answering no is {@link Session.declineAsk};
   * - a DECLINED card refuses `ASK_ALREADY_ANSWERED` — the no already refuses
   *   every fire, and needs no withdrawal;
   * - a SPENT yes refuses `ASK_ALREADY_SPENT` — revoking cannot un-fire the
   *   past, and the honest record of what happened is the `'used'` row;
   * - a card already revoked refuses `ASK_ALREADY_ANSWERED` — the withdrawal
   *   is recorded once, never doubled.
   *
   * ONLY THE HUMAN SIDE REVOKES, in either direction. Like its siblings this
   * door stamps `principal: 'user'`; unlike them it accepts an optional
   * `principal` CLAIM so an honest relay (a port built with `source: 'agent'`,
   * a scripted driver) can state what it is — and any claim other than
   * `'user'` is refused `WRONG_PRINCIPAL`. An agent must never be able to
   * withdraw a human's decision: honouring an agent's revoke would let it
   * cancel a yes it dislikes as surely as forging one it wants.
   */
  revokeAsk(
    askId: string,
    opts: { by: string; note?: string; principal?: Principal },
  ): ApprovalResult {
    const guard = this.#approvalDoorGuard(opts);
    if (guard) return guard;
    if ((opts.principal ?? 'user') !== 'user') {
      return this.#doorRefusal(
        'WRONG_PRINCIPAL',
        `hcifootprint: revokeAsk is the human side's door — a '${opts.principal}' principal cannot withdraw a human's decision, in either direction. Relay the person's change of mind to the app, whose own control calls this without a principal to claim.`,
      );
    }
    const ask = this.#openAsks.get(askId);
    if (!ask) {
      return this.#doorRefusal('UNKNOWN_ASK', `hcifootprint: no ask '${askId}' in this session.`);
    }
    if (ask.answer === undefined) {
      return this.#doorRefusal(
        'REVOKE_UNANSWERED',
        `hcifootprint: ask '${askId}' has no answer to withdraw — the person has not decided. To answer no, declineAsk(askId, { by }) is the right verb; revoke exists for taking back a yes already given.`,
      );
    }
    if (ask.answer === 'declined' || ask.revoked === true) {
      return this.#doorRefusal(
        'ASK_ALREADY_ANSWERED',
        ask.answer === 'declined'
          ? `hcifootprint: ask '${askId}' was declined — there is no yes to withdraw, and the no already refuses every fire. A decision is never overwritten.`
          : `hcifootprint: the yes on ask '${askId}' was already withdrawn. The revocation is recorded once — ask again for a fresh decision.`,
      );
    }
    if (ask.spent === true) {
      return this.#doorRefusal(
        'ASK_ALREADY_SPENT',
        `hcifootprint: the yes on ask '${askId}' was already spent by a fire — revoking cannot un-fire the past. The 'used' row keeps that honest; what remains withdrawable is the next yes, on a fresh card.`,
      );
    }
    // The withdrawal lands: a marker on the BOOK entry (bookkeeping, the same
    // pen that writes `spent`), and a NEW row in the JOURNAL (the receipt). The
    // 'approved' row stays in #approvalRows untouched, so the gate still walks
    // its full law and refuses with the specific word rather than a blank
    // APPROVAL_REQUIRED.
    ask.revoked = true;
    const row: ConfirmRecord = {
      kind: 'revoked',
      askId,
      affordanceId: ask.affordanceId,
      timestamp: this.#now(),
      node: this.#node,
      version: this.#version,
      stateVersion: this.#stateVersion,
      principal: 'user',
      by: opts.by,
      ...(opts.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
      enforced: true,
    };
    this.#pushConfirm(row);
    return { ok: true, record: structuredClone(row) };
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
    reason:
      | 'UNKNOWN_ASK'
      | 'ASK_ALREADY_ANSWERED'
      | 'ASK_ALREADY_SPENT'
      | 'REVOKE_UNANSWERED'
      | 'WRONG_PRINCIPAL'
      | 'NEEDS_DECIDER'
      | 'NOT_ENFORCED',
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
    /* v8 ignore next -- the else arm is unreachable: both doors that answer a card (approveAsk, declineAsk) REQUIRE `by`, which is what makes a recorded decision attributable to a person. */
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
      /* v8 ignore next -- the `{}` arm is unreachable for the same reason: `by` is required at both doors, so an answered row always carries the person it came from. */
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
   * THE ASK BOOK — every high-effect ask this session is holding, and what
   * became of each (copies, oldest first).
   *
   * The read that answers "is anything waiting on a person?". A paused ask is
   * not a transition and never joins {@link Session.pending} or
   * {@link Session.awaitingSettlement}, so before this door a caller asking
   * about a paused action was answered by the two lists that structurally could
   * not contain it — and an empty list reads as *nothing is happening*, which
   * is the confident emptiness this library keeps closing.
   *
   * NOT named `openAsks`: under {@link SessionOptions.requireHumanApproval}
   * answered cards STAY in the book (an approval must be spendable once, a
   * decline refusable for the session's life), so a name promising only open
   * ones would be wrong on its own rows. Read `answer` for the fate — absent
   * means the person has not decided.
   *
   * A LIVE READ, and callers must keep it that way: ask it at answer time, never
   * once at construction. The whole value of the arm it feeds is that the fate
   * it reports is the fate right now.
   *
   * Structural facts only ({@link AskStatus}) — the receipts stay on the ask.
   * {@link Session.confirms} remains the auditable journal; this is the
   * derivation the library owes its own serving layer, because deriving these
   * fates from journal rows means re-implementing the gate's law beside the gate.
   */
  asks(): AskStatus[] {
    return [...this.#openAsks.values()].map((ask) => ({
      askId: ask.askId,
      affordanceId: ask.affordanceId,
      ...carriedDoes(ask.does),
      ...(ask.instance !== undefined ? { instance: ask.instance } : {}),
      ...(ask.answer !== undefined ? { answer: ask.answer } : {}),
      ...(ask.spent !== undefined ? { spent: ask.spent } : {}),
      ...(ask.revoked === true ? { revoked: true as const } : {}),
      ...(this.#approvalWentStale(ask) ? { stale: true as const } : {}),
    }));
  }

  /**
   * Would the gate refuse a fire on this recorded yes RIGHT NOW, because the
   * app's own policy says it is too old? Asked through the gate's own function,
   * never re-derived: the read that tells a caller "go and do it" and the check
   * that refuses the doing must be the same law, or the library hands out an
   * instruction it will then reject forever.
   *
   * Only ever true about an unspent approval under a declared policy — a spent
   * one is finished, and a session with no policy has no way for a yes to age.
   */
  #approvalWentStale(ask: OpenAsk): boolean {
    if (this.#humanApproval === undefined) return false;
    // A withdrawn yes is finished the way a spent one is: the decision-fact is
    // the whole story, and reporting it stale would bury the person's own act
    // under a policy's.
    if (ask.answer !== 'approved' || ask.spent === true || ask.revoked === true) return false;
    const row = this.#approvalRows.get(ask.askId);
    /* v8 ignore next -- unreachable: the two lines above have already proven a policy is in force and this ask is APPROVED, and under a policy the only thing that approves an ask (#answerAsk) files its row in the same breath. */
    if (row === undefined) return false;
    return stale(row, ask, {
      rules: this.#humanApproval,
      now: this.#now(),
      stateVersion: this.#stateVersion,
    });
  }

  /**
   * AN AGENT DID SOMETHING HIGH-EFFECT AND NOBODY APPROVED IT — said once, to
   * the developer, through the session's own warn sink.
   *
   * The gap this closes is DISCOVERABILITY, not enforcement. An expert
   * integrator put the human in the loop where it was easiest to see — a
   * `confirmHighEffect` on one serving port, or an approvals Set inside one
   * chatbot — and both are properties of a DOOR. Any other caller holding the
   * same session (a second port, a flat tool surface a baseline drives, a
   * script) walks straight past them, performs the action, and leaves no record
   * that an approval was skipped. Nothing in the library said so, because from
   * `fire()`'s side the configuration is simply the default.
   *
   * WHAT IT IS NOT, deliberately: not a refusal, not a new result field, not a
   * changed default. The audit trail already exists — a high-effect fire with
   * principal 'agent' and no `askId` on its record is exactly "an agent did this
   * and nobody approved it", derivable from the journal today. What was missing
   * is anyone telling the integrator they are in that state.
   *
   * THE FOUR CONDITIONS, and each one is why it stays quiet the rest of the time:
   * - no policy is in force (under `requireHumanApproval` the gate answered this
   *   fire already, and it answered it in the record);
   * - the option was never PASSED (`requireHumanApproval: false` is an app
   *   stating its policy — it gets told once and is then left alone);
   * - principal 'agent' on a high-effect action that actually ran
   *   (`invoke: false` is the app reporting its OWN motion — the gate itself
   *   skips it, and so does this);
   * - no `askId` landed on the record, so nothing minted a card for this fire.
   *   A port that asked first and fired on the human's answer is the
   *   configuration this warning is asking for, and it never hears from it.
   */
  #warnUngatedFireOnce(
    affordanceId: string,
    aff: Affordance,
    record: TransitionRecord,
    source: Principal,
    opts: FireOptions,
  ): void {
    if (this.#warnedUngatedFire || this.#approvalPolicyDeclared) return;
    if (source !== 'agent' || aff.highEffect !== true || opts.invoke === false) return;
    if (record.askId !== undefined) return;
    this.#warnedUngatedFire = true;
    this.#warn(
      `hcifootprint: '${affordanceId}' is high-effect and an agent just fired it with NO human approval on record. ` +
        `This session was created without requireHumanApproval, so fire() held nothing — a confirm on a serving port, ` +
        `or a boolean in the model's own tool arguments, protects that one door and travels with nothing: any other ` +
        `caller holding this session performs the same action unheld. Pass requireHumanApproval to createSession to ` +
        `gate high-effect agent fires at the session itself, or pass requireHumanApproval: false to state that this ` +
        `app means it. Said once per session.`,
    );
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
      /* v8 ignore next -- the `?? {}` arm is unreachable: the gate is only consulted for a fire this session HOLDS, which is exactly the case where a policy exists. */
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
      `hcifootprint: refused a high-effect fire of '${affordanceId}' — ${verdict.reason}. This session runs with requireHumanApproval, so only an approval it recorded from a person can cross that gate.` +
        HOW_TO_OPEN_A_CARD,
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
      /* v8 ignore next -- the else arm is unreachable: a verdict of via 'approved' was reached by reading that very ask out of this map, so it is still there to spend. */
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

  /**
   * What the card will SEND — bounded exactly like every other captured value.
   *
   * REDACTION POINT 3 of 4 (SessionOptions.redactedFields.payload — the SAME list
   * as the record's, because this is the same value with a second home, and a
   * field hidden from the log that still rides the card is not hidden).
   *
   * THE CARD IS A RENDERING, NEVER THE BINDING. `confirmAsk` binds the approval to
   * `boundInput(input)` (bound-input.ts) and the gate compares the fire against
   * THAT, so a marker here cannot turn a mismatch into a match, and the 0.7.0
   * gate keeps proving the real values. What it does cost is stated in
   * RedactedFields: the person reading this card no longer sees the hidden field,
   * because this library has exactly one channel to hand the pack down.
   *
   * MUTATION PROOF: drop the redactFields() call and four tests in
   * redacted-fields.test.ts go red — both under "the approval card" (the receipts
   * pack, the exported row, the served ask) and the two under "the gate still
   * proves the real values" that assert the marker rode the card while the
   * approval still crossed.
   */
  #willUse(input: unknown, instance?: string): ConfirmWillUse | undefined {
    const shown: ConfirmWillUse = {
      ...(input !== undefined
        ? { input: redactFields(sanitizeProduced(input), this.#redactedFields.payload) }
        : {}),
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
      /* v8 ignore next 4 -- neither `?? 'unknown'` is reachable, and v8 can only exempt the property they live in: a 'fired' row always names its action, and a stimulus row's name is defaulted where the row is recorded. They keep this trail printable rather than spelling 'undefined' at a human if either invariant is relaxed. */
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
   *
   * THE ONE COLLISION, said out loud where it can be fixed. A transition id is
   * `<affordanceId>#<n>` from a different counter, so a graph with an action
   * literally named 'ask' can mint a transition and a card with the same string.
   * The serving layer refuses to answer about either one when that happens
   * (AMBIGUOUS_ID) — this warning is the half that reaches the person who can
   * rename the action. Once per prefix; the ids themselves are never changed to
   * dodge it, because an id that quietly differs from what the counter says is a
   * second thing to reason about.
   */
  #mintAskId(): string {
    return this.#mintedConfirmId('ask');
  }

  #mintGrantId(): string {
    return this.#mintedConfirmId('grant');
  }

  #mintRefusalId(): string {
    return this.#mintedConfirmId('refusal');
  }

  #mintedConfirmId(prefix: 'ask' | 'grant' | 'refusal'): string {
    if (this.spec.affordances[prefix] !== undefined && !this.#approvalWarned.has(`id:${prefix}`)) {
      this.#approvalWarned.add(`id:${prefix}`);
      this.#warn(
        `hcifootprint: this graph has an action named '${prefix}', and approval cards are numbered ` +
          `'${prefix}#1', '${prefix}#2', … — the same shape as that action's transition ids. One string ` +
          `can end up naming both, and did_it_work refuses to answer about either when it does. Rename ` +
          `the action to keep the two apart.`,
      );
    }
    return `${prefix}#${(this.#askSeq += 1)}`;
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
   * — never cached. With a journey frame open, serves ONLY the frame's
   * currently-fireable steps + escape tools (authored cancel/back roles and a
   * synthetic leave-journey) — the on-demand disclosure contract.
   */
  toMCPTools(opts?: { lossySchemas?: boolean }): MCPToolDescription[] {
    const served = this.#servedEdges();
    const tools = edgesToMCPTools(this.spec, served.edges, opts);
    if (served.escape) tools.push(leaveJourneyTool(this.spec, this.#frame!.journeyId));
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
    /* v8 ignore next 5 -- both `?? {}` arms are unreachable and v8 can only exempt the statement they live in: footprintjs declares `overwrite` and `updates` as REQUIRED fields of a CommitBundle, so every bundle carries both halves, empty or not. They are the guard for reading a log written by a version that did not. */
    const changedKeysById = new Map(
      this.#log
        .list()
        .map((b) => [b.runtimeStageId, Object.keys({ ...(b.overwrite ?? {}), ...(b.updates ?? {}) })]),
    );

    const lines: string[] = [`You are on: ${this.#nodeLabel(this.#node)}.`];
    if (this.#frame) {
      const journey = this.spec.journeys[this.#frame.journeyId];
      lines.push(
        `Open journey: ${this.#frame.journeyId} — ${journey.description} ` +
          `(${this.#frame.firedSteps.length}/${journey.steps.length} steps done).`,
      );
    }
    for (const f of this.#frames) {
      if (f.status !== 'demoted') continue;
      /* v8 ignore next -- the `?? 0` arm is unreachable (only DEMOTED frames get here, and a demotion stamps closedAtVersion in the same breath), and v8 cannot exempt part of a line — the version comparison itself IS exercised, both ways, in context-brief.test.ts. */
      if (sinceVersion !== undefined && (f.closedAtVersion ?? 0) < sinceVersion) continue;
      lines.push(`Note: journey ${f.journeyId} was demoted — its precondition no longer holds.`);
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
        ? // THROUGH THE GUARD, like every other name in this text. It printed the
          // raw id before, which made it the one line here that could not tell a
          // real action from a string — and the row's captured name is what lets
          // it keep saying the real one after the mount that declared it is gone.
          `Pending (awaiting app state): ${pend.map((p) => this.#actionLabel(p.affordanceId, p.does)).join(', ')}.`
        : 'Pending: none.',
    );
    const served = this.#servedEdges();
    const names = served.edges.map((e) => e.affordanceId + (e.highEffect ? ' [high-effect]' : ''));
    if (served.escape) names.push('leave-journey');
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
    // Four states, four authored lines, every one routed through #actionLabel so
    // an id the graph does not have renders as a constant.
    //
    // The answered lines exist because marking an ask ANSWERED would otherwise
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
      const what = this.#actionLabel(ask.affordanceId, ask.does);
      if (ask.answer === undefined) {
        if (awaitingShown < max) {
          lines.push(`Awaiting the human's decision: ${what} (${ask.askId}).`);
          awaitingShown++;
        } else awaitingOmitted++;
      } else if (ask.revoked === true) {
        // The third word, in the same status plumbing as its two siblings — a
        // block that kept saying "approved, not yet done" about a withdrawn yes
        // would be instructing the model to fire into APPROVAL_REVOKED forever.
        lines.push(`The human withdrew their approval: ${what} (${ask.askId}).`);
      } else if (ask.answer === 'approved' && ask.spent !== true) {
        lines.push(`Approved by the human, not yet done: ${what} (${ask.askId}).`);
      } else if (ask.answer === 'declined') {
        lines.push(`The human declined: ${what} (${ask.askId}).`);
      }
    }
    if (awaitingOmitted > 0) {
      lines.push(`  … ${awaitingOmitted} more await the human's decision, not listed.`);
    }
    // A DECISION THAT IS A PERSON'S, for every such control OFFERED HERE and not
    // known made — one authored line apiece, beside the cards above because both
    // are about whose turn it is.
    //
    // OFFERED-HERE is the scope, and it is the same `available()` view every
    // serving surface reads: this block describes the room the person is
    // standing in, and a decision elsewhere is `decisions()`'s to carry and the
    // journey tool's to speak for.
    //
    // The whole walk is skipped where nothing declares one, so an app that
    // declares nothing pays nothing and prints nothing.
    //
    // CAPPED BY THE SAME DIAL as the awaiting lines. These are
    // declaration-bounded — a model cannot mint them — but the block a model
    // trusts above its own account stays bounded by one number regardless.
    const declared = this.decisions();
    if (declared.length > 0) {
      const unmade = new Set(
        declared.filter((row) => row.made !== true).map((row) => row.affordanceId),
      );
      const here = this.available().edges.filter((edge) => unmade.has(edge.affordanceId));
      for (const edge of here.slice(0, max)) {
        lines.push(DECISION_WITH_THE_HUMAN(this.#actionLabel(edge.affordanceId)));
      }
      const decisionsOmitted = here.length - max;
      if (decisionsOmitted > 0) {
        lines.push(`  … ${decisionsOmitted} more decisions here are the human's, not listed.`);
      }
    }
    const pend = this.pending();
    if (pend.length > 0) {
      lines.push(
        `Awaiting the app's report: ${pend.map((p) => this.#actionLabel(p.affordanceId, p.does)).join(', ')}.`,
      );
    }
    // WORK THE APP SAYS IT IS STILL DOING — the same shape as the line above,
    // and for a reason the line above cannot cover: a fire settles when the app
    // reports its delta, and the app may keep working long after that. Before
    // this, the block said nothing at all about the one thing still happening.
    //
    // TWO LINES, TWO FACTS, neither a substitute for the other. A BOUND row
    // names its action through #actionLabel — registry-derived, the same door
    // every other line here uses. An UNBOUND row gets the authored constant,
    // because the only other thing it carries is the app's own label, and a
    // runtime string never enters this block.
    //
    // CAPPED like the awaiting lines and the attempts list: work rows are minted
    // by app code, a leaked handle mints them in a loop, and this is the one
    // block a model is told to weigh above its own memory.
    const work = this.openWork();
    const workNames = [
      ...new Set(
        work
          .filter((row) => row.transitionId !== undefined)
          .map((row) => this.#actionLabel(row.affordanceId, row.does)),
      ),
    ];
    if (workNames.length > 0) {
      lines.push(`The app is still working on: ${workNames.slice(0, max).join(', ')}.`);
      const moreWork = workNames.length - max;
      if (moreWork > 0) lines.push(`  … ${moreWork} more the app says it is working on, not listed.`);
    }
    if (work.some((row) => row.transitionId === undefined)) lines.push(WORK_NOT_TIED_TO_AN_ACTION);
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
   * 'dead-end' rows are absent (not an attempt to act), and so is nearly every
   * 'reported' row: those carry runtime free text, and this block admits none.
   * THE ONE EXCEPTION is a row that marks itself
   * {@link ReportGapOptions.actionsMayBeStale} — a report that the list of
   * actions being served could not be refreshed. It is not an attempt either, but
   * it is the one thing a reader of this block cannot afford to be missing: every
   * other line here is about what happened, and this one is about whether the
   * room being described is still the room. It renders as an AUTHORED line; the
   * row's own `request` never crosses.
   *
   * References, not sentences — the caller slices first and renders after.
   */
  #attemptRows(): AttemptRow[] {
    const rows: AttemptRow[] = [];
    for (const gap of this.#gaps) {
      if (gap.kind === 'fire-rejected') rows.push({ at: gap.version, rank: 0, gap });
      else if (gap.kind === 'reported' && gap.actionsMayBeStale === true) {
        rows.push({ at: gap.version, rank: 0, gap });
      }
    }
    for (const t of this.#transitions) {
      if (t.cause.kind === 'fired') rows.push({ at: t.cursorVersion, rank: 1, fired: t });
    }
    rows.sort((a, b) => a.at - b.at || a.rank - b.rank);
    return rows;
  }

  /** One row in plain words — a refused fire, a recorded one, or a failed re-read. */
  #attemptLine(row: AttemptRow): string {
    if (row.rank === 1) return this.#firedLine(row.fired);
    return row.gap.kind === 'reported' ? READ_FAILED_LINE : this.#refusedLine(row.gap);
  }

  /** A fire this session refused: it did not happen, and the reason is the typed one. */
  #refusedLine(gap: GapRecord): string {
    /* v8 ignore next -- the `?? 'someone'` arm is unreachable: every refusal row is written by recordRejection, which stamps the principal that reached for the action. It exists so a row from an older release still reads as a sentence. */
    const who = gap.principal ?? 'someone';
    const what = this.#actionLabel(gap.affordanceId, gap.does);
    // A commit gate's refusal, not a fire's — the ONE row that carries a journey.
    // Saying "fired" about it would report an attempt that never happened,
    // inside the block whose whole job is not doing that.
    if (gap.journeyId !== undefined) {
      return `did NOT happen — ${who}'s attempt to start ${gap.journeyId} was refused: ${gap.rejectionReason} (its first step is ${what})`;
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
    return `${lead} — ${t.cause.principal} fired ${this.#actionLabel(t.cause.affordanceId, t.cause.does)} (${notes.join('; ')})`;
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
    /* v8 ignore next -- the `?? {}` arm is unreachable: the heap is constructed with the session's initial state, so it always has one to answer with. */
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
  protected handlerFor(affordanceId: string, _opts: FireOptions): ActionHandler | undefined {
    const registered = this.#registry.handlerFor(affordanceId);
    if (registered) return registered;
    const navigate = this.#navigate;
    if (navigate === undefined) return undefined;
    const aff = this.spec.affordances[affordanceId];
    /* v8 ignore next -- unreachable: every caller has already found this affordance in the spec (fire resolves it first; the commit gate asks about a declared journey step). The guard states the precondition where the url synthesis depends on it. */
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
   * trace). This also fixes the verified v1 gap: registerHandlers never bumped
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
      // moment a page can become (or stop being) a room with no doors. Nobody
      // reported a position, so only the never-trap question runs.
      this.#cursorCameToRest({ kind: 'unreported' });
    });
  }

  /**
   * What "the served structure" looks like right now — compared at flush time
   * against the last flushed value. NavSession extends this with the presence
   * set and visibility signals.
   */
  protected structureFingerprint(): string {
    // Include enabled state so a setEnabled() flip is world motion (the served
    // surface changed), just like a mount/unmount. Busy joins it for the same
    // reason and on the same terms: the row a planner read now says something
    // else, whether the app started working, stopped, or reworded the label.
    return this.#registry.registrations().map(registrationMark).sort().join('|');
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
      // …and the claim is stamped, for EVERY gesture that declares a destination.
      // Including 'tab': the cursor hop below has never been gated on the gesture
      // either, so excluding tabs here minted a session where the cursor moved on
      // the app's word and nothing could ever corroborate it — the asymmetry, not
      // the honesty. The declaration is the app's, whichever gesture carries it.
      //
      // `??=`: an observation that landed while this fire was still in flight has
      // already written 'observed', and a claim written over it would forget the
      // corroboration between a router that moves first and a promise that
      // resolves second — the ordinary shape of a real navigation.
      record.arrival ??= 'claimed';
      // The claim moves the LIVE cursor only if nothing else moved it since
      // this transition fired — a weaker claim must never clobber a newer
      // sync() observation that interleaved while the fire was pending.
      if (this.#node === record.fromNode && this.#node !== aff.effect.navigatesTo) {
        this.#node = aff.effect.navigatesTo;
        // Moved on the app's WORD. Nothing has reported this position, so the
        // router's confirmation — a sync that changes no node — still counts as
        // the first report of it.
        this.#positionReported = false;
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
      this.spec.journeys[this.#frame.journeyId].steps.includes(aff.id) &&
      !this.#frame.firedSteps.includes(aff.id)
    ) {
      this.#frame.firedSteps.push(aff.id);
    }
    this.#emitTransition(record); // now committed — observers see the settled record
    this.#checkFrameAfterWorldChange();
    // A claimed navigation just moved the cursor: the same rest sync() takes,
    // minus the observation — nothing has confirmed this hop, and the app's own
    // handler has not even run yet.
    if (cursorHopped) this.#cursorCameToRest({ kind: 'unreported' });
  }

  /** The disclosure filter: full slice normally; frame steps + escape roles when a frame is open. */
  #servedEdges(): { edges: AvailableEdge[]; escape: boolean } {
    const edges = this.available().edges;
    if (!this.#frame) return { edges, escape: false };
    const steps = this.spec.journeys[this.#frame.journeyId].steps;
    return {
      edges: edges.filter(
        (e) => steps.includes(e.affordanceId) || e.role === 'cancel' || e.role === 'back',
      ),
      escape: true,
    };
  }

  /**
   * Demotion: after any world change, an open frame whose journey PRECONDITION
   * no longer holds is closed as 'demoted' — the served context re-collapses
   * to journey level and the agent replans. Step guards failing is normal DAG
   * progress and never demotes; journeys without a precondition never demote.
   */
  #checkFrameAfterWorldChange(): void {
    if (!this.#frame) return;
    const journey = this.spec.journeys[this.#frame.journeyId];
    if (!journey.precondition) return;
    if (this.#evalGuard(journey.precondition).matched) return;
    this.#frame.status = 'demoted';
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    this.#frame = null;
    this.#version++;
    this.#bumpStructure();
  }

  #frameCopy(frame: JourneyFrame | null = this.#frame): JourneyFrame | null {
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
   * FREEZE WHAT THE APP SAYS THIS ACTION DOES, NOW — the one door every history
   * row goes through to capture its {@link Cause.does}, and the only place the
   * authored sentence is ever read for a record.
   *
   * Read from the spec THIS SESSION SERVES (the merged one, on the tree API), so
   * a mount-declared action is captured exactly as a built-in one is: at the
   * moment the row is minted, both are simply actions this app has.
   *
   * NO KEY when the graph does not have the id, which is how a name a model
   * invented stays out of the authored channel forever — with nothing captured,
   * every render below falls through to the UNKNOWN_ACTION constant.
   *
   * `hasOwn`, because 'constructor' is truthy on any plain object and would sail
   * straight through a lookup — the same reason `#actionLabel` below uses it.
   */
  #captureDoes(id: string): { does?: string } {
    return Object.hasOwn(this.spec.affordances, id) ? { does: this.spec.affordances[id].description } : {};
  }

  /**
   * The same discipline for an ACTION id. A refused fire's id is whatever the
   * caller sent — a model's guess, a relay's string — so an id this graph does
   * not have renders as a constant instead of entering the authored channel.
   * `hasOwn`, because 'constructor' is truthy on any plain object and would sail
   * straight through a lookup.
   *
   * THE ROW'S OWN EVIDENCE OUTRANKS THE SPEC, and that ordering is the fix this
   * guard needed: `hasOwn` asks whether the app has the action WHEN YOU READ,
   * and history is a question about when it HAPPENED. A component that
   * mount-declared an action and unmounted took the id out of the merged spec,
   * and a genuinely-fired action then rendered as *(an action this app does not
   * have)* — the library calling the app a liar about the app's own record. A
   * row carrying a captured `does` was declared at its moment; that is proof
   * enough to print the name, and no fresh lookup can take it back.
   *
   * The spec lookup stays for a row that captured nothing, so an id that was
   * never authored reads exactly as it always has.
   */
  #actionLabel(id: string | undefined, captured?: string): string {
    return id !== undefined && (captured !== undefined || Object.hasOwn(this.spec.affordances, id))
      ? id
      : UNKNOWN_ACTION;
  }

  /** One authored-strings-only line per transition for contextBrief(). */
  #briefLine(t: TransitionRecord, changedKeysById: Map<string, string[]>): string {
    if (t.cause.kind === 'fired') {
      // THIS LINE USED TO BYPASS THE GUARD ENTIRELY — it printed the raw id and
      // looked the description up in the spec as it stands right now, so after
      // an unmount it rendered a real action's sentence as ''. Both halves come
      // off the ROW now: the name through #actionLabel, the sentence from the
      // capture beside it.
      const what = this.#actionLabel(t.cause.affordanceId, t.cause.does);
      // Still a live read, and deliberately: the flags below are facts about the
      // action AS IT STANDS, not about the moment. An action nothing declares
      // any more contributes none of them, which is the honest floor.
      const aff = Object.hasOwn(this.spec.affordances, what) ? this.spec.affordances[what] : undefined;
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
      /* v8 ignore next -- both fallbacks are unreachable: every fired row captures its `does` at fire time, and there is no door that mints one for an id the spec did not have (an unknown id is refused into the gap ledger instead). They keep this line printable, in today's bytes, if a future mint path forgets to capture. */
      const does = t.cause.does ?? aff?.description ?? '';
      return `${t.cause.principal} fired ${what} — ${does}${moved}${suffix}`;
    }
    if (t.toNode && t.toNode !== t.fromNode) {
      return `${t.cause.principal} ${t.cause.stimulus}: cursor moved ${this.#nodeLabel(t.fromNode)} → ${this.#nodeLabel(t.toNode)} (unverified edge)`;
    }
    if (t.cause.stimulus === 'structure-swap') {
      return 'the served tool surface changed (something mounted, unmounted, or changed visibility)';
    }
    // Key NAMES are the designed disclosure (values never enter text) — but a
    // tap could relay hostile keys, so they are hardened before rendering.
    /* v8 ignore next -- the `?? []` arm is unreachable: every stimulus row that reaches this line committed a bundle under its own id (an empty one still counts — that is the cursor stop the sentence below is about). */
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
function gestureHref(aff: Affordance, pages: NavigationGraphSpec['pages']): string | undefined {
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
 * The ACTION behind a registry key — `'orders.cancel[o-57]'` → `'orders.cancel'`.
 *
 * A registration is instance-keyed; a DECLARATION is not (one `enabledWhen`
 * greys every card at once), so a question about what the app declared has to
 * ask about the action. `[` is a reserved segment character, so the first one
 * is always the instance suffix and never part of a name.
 */
function baseActionId(registryKey: string): string {
  const at = registryKey.indexOf('[');
  return at === -1 ? registryKey : registryKey.slice(0, at);
}

/**
 * The id a value reader is filed under, and the id a served row looks it up by.
 *
 * CANONICAL IS SELF TODAY — an action has exactly one name, so this is identity.
 * It exists as one function anyway because a future alias feature has to resolve
 * THROUGH it: an alias that filed its own key would give one control two readers
 * and serve whichever was written last, which is the guessed-value class this
 * whole surface refuses. One place to change, and both sides change together.
 */
function canonicalHoldsKey(affordanceId: string): string {
  return affordanceId;
}

/**
 * Did bounding this value produce an EMPTY BOX — `{}` for something that was not
 * empty? True for a Map, a Set, a Date, a RegExp: containers whose contents live
 * nowhere `Object.entries` can see, so the bounded copy comes out with no keys at
 * all. An app's genuinely empty `{}` is not one of these and still serves, because
 * there the empty box is the truth.
 */
function emptyBoxFor(raw: unknown, bounded: unknown): boolean {
  if (typeof bounded !== 'object' || bounded === null) return false;
  if (Array.isArray(bounded) || Object.keys(bounded).length > 0) return false;
  const proto: unknown = Object.getPrototypeOf(raw as object);
  return proto !== Object.prototype && proto !== null;
}

/**
 * ONE registration, as a fingerprint segment — shared by both
 * {@link Session.structureFingerprint} and the tree layer's override, so the two
 * can never disagree about what counts as a change.
 *
 * BOTH HALVES ARE ESCAPED, and that is what makes the encoding injective. The
 * fingerprint is a `|`-joined list of `:`-separated parts, and both the id and
 * the label are app-authored text that may contain either character. Escape only
 * the label and a tool literally named `save:busy=Saving…` spells, byte for
 * byte, what `save` carrying that label spells — so the app could flip one on
 * while the other went away, and the flush would see no change and write no row.
 * A fingerprint that can be spelled two ways is not a fingerprint.
 */
export function registrationMark(registration: Registration): string {
  return (
    encodeURIComponent(registration.affordanceId) +
    (registration.enabled ? '' : ':off') +
    busyMark(registration.busy)
  );
}

/** The busy half of {@link registrationMark}, escaped for the same reason. */
export function busyMark(busy: string | undefined): string {
  return busy === undefined ? '' : `:busy=${encodeURIComponent(busy)}`;
}

/** What kind of thing the app handed back, for the warning only — never served. */
function describeKind(raw: unknown): string {
  const name: unknown = (raw as { constructor?: { name?: unknown } })?.constructor?.name;
  return typeof name === 'string' && name.length > 0 ? name : 'value';
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
