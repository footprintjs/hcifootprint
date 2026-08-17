/**
 * Mode B — journeys as FIXED tools (the default serving mode, D18 §7).
 *
 * The tool array an LLM sees contains ONE tool per journey plus three fixed
 * generics (whats_here, do_action, why) and NEVER changes for the life of a
 * conversation. Disclosure rides the RESULT channel: every call returns
 * readySteps — what is fireable at the current navigation cursor, right now —
 * and the model acts by calling the SAME journey tool again with {step}.
 * Between-turn grounding rides the same channel: whats_here accepts
 * {sinceVersion} and narrates only the delta (who did what since the model's
 * last look), and `why` serves the causal backward slice for a state key —
 * the mixed-initiative attribution query.
 *
 * The journey door has TWO shapes, and the default is the one above: with
 * `journeyTools: 'single'` there is one `<graph>.journey` tool taking a journey
 * id instead of N named ones — same rule, one level up (discovery moves to the
 * result channel, which is where steps already live). See
 * {@link JourneyToolsOptions.journeyTools} for what that trades.
 *
 * Why: tools render first in the prompt; any tool-set change busts every
 * prompt-cache tier. Result payloads are ordinary messages — cache-stable.
 * ("JIT disclosure moved from the tool channel to the result channel.")
 * It also makes the library a PLAIN MCP server for any host: no
 * tools/list_changed, no dynamic-tool support required.
 *
 * The stated trade-off: the static schema cannot enforce each step's exact
 * input shape at the API layer — `input` is free-form and fire() validates.
 * A wrong input returns a structured error RESULT carrying what was expected,
 * and the model corrects on the next call.
 *
 * Layering: this file consumes ONLY the public Session surface (available /
 * availableJourneys / journeyPlan / frames / fire / explain / contextBrief) — it is a pure
 * projection, independently testable, swappable per conversation. One
 * conversation = one mode (a mid-conversation mode flip is a tool-set change
 * = a full cache bust).
 *
 * Two-string-class invariant: every text field in tools AND results is either
 * an authored description or a fixed authored-constant sentence. Runtime
 * values (state, payloads, instance keys, evidence) are structured DATA fields.
 */
import { encodeToolName } from './tool-name.js';
import type { MCPToolDescription } from 'footprintjs';
import type {
  AskStatus,
  AvailableEdge,
  AvailableJourney,
  Explanation,
  ExternalObservation,
  FireResult,
  FireSettlement,
  JourneyPlanStep,
  Principal,
} from '../atom/types.js';
import type { Session } from '../traverse/session.js';
import { errorText } from './error-text.js';

export interface JourneyToolsOptions {
  /** Require confirm:true before firing high-effect steps/actions. Default true. */
  confirmHighEffect?: boolean;
  /**
   * Principal stamped on fires made through this port. Default 'agent'.
   *
   * Leave it alone for a port a MODEL holds. Under `requireHumanApproval` the
   * gate holds agent fires and lets the app-self-report tier through, so a port
   * stamping `'user'` or `'system'` is a port whose fires are not gated — the
   * library says so out loud when you build one, and the confirm argument it
   * serves stops claiming a gate it does not have.
   */
  source?: Principal;
  /**
   * How journeys are offered in the TOOL channel. Default `'per-journey'` —
   * today's behaviour, byte for byte.
   *
   * - `'per-journey'` — one `<graph>.journey.<id>` tool per DECLARED journey.
   *   Every journey is named and described in the channel a model selects from,
   *   and the array grows with the app.
   * - `'single'` — ONE `<graph>.journey` tool taking `journey: '<id>'`, the same
   *   shape `do_action` already has for actions. Journey DISCOVERY moves to the
   *   result channel (`whats_here` lists the journeys you can start from here),
   *   which is what this port already does for steps.
   *
   * WHY THE OPTION EXISTS. Measured on a 60-page app declaring 57 journeys:
   * **85% of the 79,199-byte tool array was two authored constants repeated 57
   * times** — the step input schema and the usage sentence, byte-identical each
   * time. The per-journey information content is the authored `does`, 21–121
   * bytes of a ~1,331-byte marginal cost. In `'single'` the array is ~4,428
   * bytes and STAYS there, so the tool channel stops depending on how many
   * journeys an app declares — byte-stable across apps, not merely across turns.
   *
   * WHAT IS NOT KNOWN, and it is the reason this is opt-in rather than the
   * default: whether a model SELECTS as well from one generic tool plus a list
   * as it does from N named, described tools is **unmeasured**. That is a
   * tool-selection quality question, not a byte-count one, and it is being
   * measured on a task grid before any default changes. Until then the default
   * is untouched and this mode is a choice you make with your eyes open.
   *
   * BREAKING FOR NAMES, if you switch: a host matching on `<graph>.journey.<id>`
   * tool names sees one tool instead. Names that no longer exist are answered
   * `UNKNOWN_TOOL` with the list that does — never routed silently.
   */
  journeyTools?: 'per-journey' | 'single';
}

export interface JourneyCallArgs {
  step?: string;
  input?: unknown;
  confirm?: boolean;
  /**
   * Record the human's refusal of a high-effect step (they said no) — closes the
   * ask, does not fire. Under `requireHumanApproval` it is recorded as the
   * caller's REPORT and closes nothing, so the person's card stays live.
   */
  decline?: boolean;
  /** Instance key for steps on repeats containers (from `instances` in results). */
  instance?: string;
  /** The served row this step was planned against — see {@link DoActionArgs.offerId}. */
  offerId?: string;
  /** The acknowledgement this step performs — see {@link DoActionArgs.acknowledgementId}. */
  acknowledgementId?: string;
}

export interface DoActionArgs {
  action: string;
  input?: unknown;
  confirm?: boolean;
  /**
   * Record the human's refusal of a high-effect action (they said no) — closes
   * the ask, does not fire. Under `requireHumanApproval` it is recorded as the
   * caller's REPORT and closes nothing, so the person's card stays live.
   */
  decline?: boolean;
  instance?: string;
  /**
   * The served row this call was planned against — the `offerId` a `whats_here`
   * row carried. A CITATION to a session record, never a secret and never a
   * capability: holding one authorizes nothing, and every gate runs exactly as
   * it did. Required only where the app's freshness policy enforces an axis
   * ({@link FreshnessPolicy}); ignored otherwise, beyond being recorded.
   */
  offerId?: string;
  /**
   * The acknowledgement this call performs, for a `'require-ack'` axis — the id
   * `session.acknowledgeStale()` handed back. It proves the protocol step was
   * PERFORMED and says nothing about anything being understood.
   */
  acknowledgementId?: string;
}

/** Results are plain data objects — serialize one as the tool_result body. */
export type ServeResult = Record<string, unknown>;

export interface JourneyToolsPort {
  /** The STATIC tool array — identical bytes for the life of the conversation. */
  tools(): MCPToolDescription[];
  /** Route a tool_use by name. Unknown names return a structured error result. */
  call(name: string, args?: unknown): ServeResult;
  /**
   * How a fire came to rest — the ASYNC door, for the caller that holds this
   * port and nothing else (a relay, a transport wrapper). `call()` is
   * synchronous by contract and answers with the truth AT RETURN TIME; this is
   * the later truth, delegated straight to {@link Session.settlementOf} with
   * its laws intact: never rejects, first settlement wins, stays open for a
   * fire the app never reports, and THROWS synchronously on an id no
   * settlement can exist for.
   *
   * The field report is the reason it exists: a relay holding only the port
   * could not learn the final truth, so it rebuilt one by hand out of a
   * listener and a stopwatch.
   *
   * OPTIONAL here and REQUIRED on {@link JourneyToolsPortWithSettlement}, which is
   * what {@link serveToAgent} hands back — so a caller holding a built port
   * never meets the optionality, and nobody has to check for a member the
   * library always provides. The split is not decoration: this interface is
   * PUBLISHED, and an object literal written against an earlier release — a test
   * double, a hand-rolled relay facade — is a shape that must keep compiling. A
   * required member added underneath one would have broken every one of them,
   * which is a strange way to ship a door nobody had yet.
   */
  whenSettled?(transitionId: string): Promise<FireSettlement>;
  /**
   * What `did_it_work` would ANSWER about a fire that has come to rest — the
   * same facts, in the same words, minus that tool's own envelope. For the
   * caller that already holds the id and wants the settled truth as a result
   * rather than as a promise: a transport folding the final word into the
   * result of the call that fired (see {@link JourneyToolsPort.whenSettled} for
   * the wait itself).
   *
   * Three answers, and they are three different things:
   * - the facts, for a fire at rest;
   * - `undefined` while the fire is still in flight — "no answer yet", never a
   *   guessed one;
   * - a synchronous THROW, on the two ids no honest answer exists for: one no
   *   settlement can ever exist for (the same law {@link Session.settlementOf}
   *   holds), and one that names BOTH a fire and a human's open card, which
   *   `did_it_work` refuses as `AMBIGUOUS_ID` and this door refuses in the same
   *   words. A mistyped id refused by name is the whole point: the alternative
   *   is silence a caller reads as "not finished", which is how a wrong id
   *   becomes a confident wrong answer.
   *
   * The keys are the ones `did_it_work` documents (`effectStatus`, `outcome`,
   * `outcomeNow`, `effectVerified`, `writesObserved`, `verifyHeld`, `arrival`,
   * `arrivalMeans`, `materialized`, `why`, `toNode`, `error`, `data`,
   * `stillWorking`, `stillWorkingMeans`, the external-report trio
   * (`settledBy`, `reportedBy`, `evidenceOnRecord`, `settledByMeans`), and
   * `howToAct` on a moved outcome) —
   * absent when unknown, never filled in. A LIST IS A THING THAT GOES STALE, so
   * the one a remote host reads is checked against a real answer by a test
   * rather than kept in step by hand.
   *
   * OPTIONAL here and REQUIRED on {@link JourneyToolsPortWithSettlement}, for the
   * reason stated above: this interface is PUBLISHED, and an object literal
   * written against an earlier release must keep compiling.
   */
  settledAnswer?(transitionId: string): ServeResult | undefined;
}

/**
 * What {@link serveToAgent} returns: a port whose settlement doors are always
 * there. Name the type only if you are storing the port somewhere typed — the
 * factory's inferred return already has them.
 */
export interface JourneyToolsPortWithSettlement extends JourneyToolsPort {
  whenSettled(transitionId: string): Promise<FireSettlement>;
  settledAnswer(transitionId: string): ServeResult | undefined;
}

// The half of the usage sentence that is true of a journey however it is
// offered. Split out — not duplicated — so the two tool shapes can never teach
// two different confirm protocols; the bytes either one serves are unchanged.
const JOURNEY_USAGE_TAIL =
  ' A high-effect step first returns' +
  ' needs-confirm WITH receipts (what it will do and why): show the human, then call again with' +
  ' confirm: true to proceed — or decline: true if they refuse. Steps arrive as DATA in results —' +
  ' they are never separate tools.';

const JOURNEY_USAGE =
  ' Call with no arguments to open this journey and see its ready steps; call again with' +
  " {step: '<name from readySteps>', input: {...}} to perform a step." +
  JOURNEY_USAGE_TAIL;

/** The ONE generic journey tool's description (opts.journeyTools: 'single'). */
const JOURNEY_TOOL_DESCRIPTION =
  'Follow one of this app’s declared journeys — a named multi-step flow. Call whats_here first: it ' +
  'lists the journeys you can start from where you are, each with what it does. Then call this with ' +
  "journey: '<id from whats_here>' to open it and see its ready steps; call again with the same " +
  "journey and {step: '<name from readySteps>', input: {...}} to perform a step." +
  JOURNEY_USAGE_TAIL;

/** The `journey` argument's own description — authored, like every other. */
const JOURNEY_ARG_DESCRIPTION = 'A journey id from the journeys list in a whats_here result.';

// WHAT A SCOPED LIST OMITS, said on the row that omits it. A silently shortened
// list is a worse failure than a long one: a model that cannot see a journey and
// is not told one exists concludes the app cannot do it. This sentence says the
// list is about POSITION (not permission, and not the whole app) and names the
// way through — the same routeTo argument this tool already takes.
const JOURNEYS_ELSEWHERE_MEANS =
  'This list is scoped to where you are: it holds the journeys whose first step is available on this ' +
  'page right now. The others are declared on other pages — not gone, and not refused. Go to the page ' +
  'one starts on (pass routeTo: <page id> here for the declared hops) and it appears in this list.';

/** The `routeTo` argument's own description — authored, like every other. */
const ROUTE_TO_ARG_DESCRIPTION =
  'A page id you want to get to: the reply adds the declared hops from here, each naming the action ' +
  'that makes it. Fewest hops, which is arithmetic — not a recommendation, and not a promise that ' +
  'those hops are open right now.';

/** What a route IS, said once, so the hops are never read as permission. */
const ROUTE_MEANS =
  'Declared hops, fewest first. Each names the action whose own claim makes it. Whether a hop is ' +
  'available right now is answered on that action\'s row, not here — and for a page this session has ' +
  'not visited, nothing here knows.';

/** And what an absent route means, which is not "impossible". */
const NO_DECLARED_ROUTE =
  'No action declares a way there from here. That is what this graph says, not a claim that the app ' +
  'cannot reach it — it may navigate in ways it never declared.';

const WHATS_HERE_DESCRIPTION =
  'Describe the current position: the page, the open journey (if any), what happened recently, ' +
  'and the actions and journeys available right now. The reply also carries facts — the app’s ' +
  'own authoritative record of what has actually been done and what was refused. Call this ' +
  'whenever you are unsure whether something has already happened; trust facts over your own ' +
  'account of the conversation. Pass sinceVersion (the version from any earlier result) to get ' +
  'only what changed since your last look — including what the user did themselves in the meantime.';

const DO_ACTION_DESCRIPTION =
  'Perform one available action outside any journey flow. Call whats_here first to see action names. ' +
  'A high-effect action first returns needs-confirm WITH receipts (what it will do and why): show the ' +
  'human, then call again with confirm: true to proceed — or decline: true if they refuse.';

const WHY_DESCRIPTION =
  'Explain why a state key currently holds its value: the causal chain of session actions — and ' +
  'who fired each one — that produced it. Pass a state key name seen in results or guards.';

const DID_IT_WORK_DESCRIPTION =
  'Find out how an action came to rest — whether the app actually did it. Pass the transitionId ' +
  'from that action’s result. This answers immediately either way: the final outcome, or that the ' +
  'app has not finished yet (call again). Use it whenever a result came back with effectStatus ' +
  '"pending". It also takes the askId from a needs-confirm result, and answers whether the human ' +
  'has decided yet — a paused action is not a failed one.';

const STILL_PENDING_HOWTO =
  'The app has not finished this action yet, so there is no outcome to report. Do NOT perform the ' +
  'action again — call this tool again with the same transitionId, or call whats_here to see where ' +
  'things stand.';

const OUTCOME_MOVED_HOWTO =
  'This is the receipt from when the action came to rest — the app has moved it since (see ' +
  'outcomeNow). Do NOT act on outcome alone: call whats_here to see where things actually stand.';

// The journey frame's next move, in the two shapes it has. They are two
// sentences and not one with a clause, because grammar rule 4 forbids an
// instruction that names a move the gate will refuse: "pick one of readySteps"
// against an empty list is a loop built out of a true sentence. A frame whose
// only remaining steps are switched off or off-page has a different next move —
// wait, or go where the step lives — and it gets the sentence that says so.
const PICK_A_READY_STEP_HOWTO = 'Call this tool again with step set to one of readySteps.';

const NO_READY_STEP_HOWTO =
  'Nothing in this journey can be fired from here right now. Do not keep trying the steps in ' +
  'laterSteps — each one says why it is not available: a switched-off control carries enabled: ' +
  'false and, where the app declared it, unblockedBy naming what it claims would change that. ' +
  'Wait if something there is already in flight, go to the page a step lives on, or tell the ' +
  'human what is holding it up.';

// A PAUSE IS NOT A FAILURE — the four sentences of the ask book, and the field
// report they answer: an agent met needs-confirm, read `ok: false` as an error,
// told the human the app had failed, and went looking for another route. Nothing
// in the payload said the two things a reader needed — that NOTHING was done, and
// that the missing piece is a person rather than a fix. Now the results say both,
// and `performed: false` says the first one in a field a machine can branch on.
// The answer vocabulary these belong to is written down in
// docs/design/answer-grammar.md.
const PAUSED_NOTHING_DONE =
  'Nothing has been done. This is a question for the human, not a failure — do not report it as an ' +
  'error, and confirm: true is not the human’s answer.';

const PAUSED_AWAITING_HUMAN_HOWTO =
  'Paused, not failed: no outcome exists because nothing was fired. The human has not decided. Do ' +
  'not report this as an error and do not look for another way to do it — show them what it will ' +
  'do and wait for their answer.';

const PAUSED_APPROVED_HOWTO =
  'The human approved this and nothing has fired yet, so there is still no outcome. Perform the ' +
  'action to carry out what they approved — do not ask them a second time.';

const PAUSED_DECLINED_HOWTO =
  'The human said no, so this was never performed and no outcome exists. Do not ask again about the ' +
  'same thing — tell them it was not done, and move on or ask about something different.';

// The yes exists and the app will not take it: this app requires an approval to
// be fresh, and this one is not any more. Said instead of PAUSED_APPROVED_HOWTO
// and never beside it — "go and perform it" here would order the one move the
// gate is about to refuse, forever, since the refusal leaves the card exactly as
// it found it.
const PAUSED_APPROVAL_STALE_HOWTO =
  'The human approved this, but the app will not act on that approval any more — it has run out, or ' +
  'things changed since they looked. Nothing has been done. Do not keep trying to perform it: show ' +
  'them the action again and get a fresh answer.';

// The third word of the ask book: the person gave a yes and took it back before
// anything spent it. Said instead of PAUSED_APPROVED_HOWTO for the same reason
// the stale sentence is — "go and perform it" here would order the one move the
// gate refuses forever, since the refusal leaves the card exactly as it found it.
const PAUSED_APPROVAL_REVOKED_HOWTO =
  'The human approved this and then withdrew that approval before it was acted on. Nothing has been ' +
  'done, and the withdrawn yes will not be accepted. Do not keep trying to perform it and do not ' +
  'treat the earlier yes as standing — if it still needs doing, show them the action again and get ' +
  'a fresh answer.';

// One id, two objects, and no way to tell which was meant — so neither answer is
// given. The app team is the reader who can fix it; the model is told what it
// safely can do.
const AMBIGUOUS_ID_WHY =
  'This id names two different things in this session: an action that was performed, and a question ' +
  'a human was asked. Answering about either could be an answer about the other one, so neither is ' +
  'reported. Call whats_here to see where things actually stand. (App team: an action named "ask", ' +
  '"grant" or "refusal" shares the id grammar this library uses for approval cards — renaming the ' +
  'action ends this.)';

// ARRIVAL — the claim and the observation, side by side, and neither promoted.
// A navigating action declares no writes, so "nothing changed here" is what its
// success looks like from the element's side; the only other evidence is the app
// reporting where it now is. These two sentences say exactly how much that is
// worth, and the second is deliberately the weaker word: a matching observation
// is corroboration, and nothing here can see the app's router.
const ARRIVAL_CLAIMED_MEANS =
  'The app declares this action navigates, and nothing has observed it arrive. That is not a ' +
  'failure — no observation has landed, which is a different thing from a navigation that did not ' +
  'happen. Call whats_here to see where things actually stand.';

const ARRIVAL_OBSERVED_MEANS =
  'A matching observation landed after this action: the app reported being on the page this action ' +
  'said it goes to. That is corroboration, not proof that this action caused it.';

const NOT_MATERIALIZED_WHY =
  'Nothing in the app is wired to execute this action yet — firing it would do nothing. ' +
  'Tell the human it is not available; the app team can register a tool group to wire it, ' +
  'or create the session with allowUnmaterializedFires for read-only touring.';

// The same fact one call later. This session allows fires nothing is wired to
// execute, so the record came to rest without anything having happened — every
// effect on it, including where it says it goes, is the app's declaration alone.
const NOTHING_EXECUTED_IT =
  'Nothing in the app was wired to execute this action, so it was recorded but never performed. ' +
  'Anything it says about where it goes or what it changes is the app’s declaration, not something ' +
  'that happened. Do not tell the human it is done.';

// A control the app has SWITCHED OFF — a greyed button, on screen and not
// clickable. The refusal itself has been typed and retriable for releases; what
// it never carried was the difference between a STATE and a VERDICT, and a
// relay filled that silence in itself: it told its human "a required field is
// probably empty", which nothing in the app had ever said. A guess wearing the
// shape of a diagnosis is the one failure this library exists to make
// impossible, so the sentence names what IS true (the app switched it off),
// says out loud what is NOT known (why), and names the move that is worth a
// turn. Fixed and authored like every other sentence here — an interpolated
// runtime value would be the app's own text arriving as an instruction.
const DISABLED_WHY =
  'The app has this control switched off right now — on screen and not clickable, the way a greyed ' +
  'button is for a person. That is a STATE, not a verdict on what you asked for: it can change, and ' +
  'nothing here knows what would change it. Do not invent a reason it is off. Call whats_here to see ' +
  'where things stand — a switched-off control is served there with enabled: false — and if it is ' +
  'still off, tell the human it is not available yet.';

// THE ONE CASE WHERE THE APP DID SAY SOMETHING. `enabledWhen` is machine-
// evaluated to decide the refusal above, and the failing conjuncts were thrown
// away — so a reader was handed a conclusion it could not name a field for,
// which is precisely the hole the invented diagnosis went into. The conjuncts
// themselves ride as DATA (`evidence`, the shape GUARD_FAILED already serves);
// this is the sentence that says what they are.
//
// APPENDED, NEVER INSTEAD OF — the withBusy shape. The sentence above stays
// true of every switched-off control, including the three wires that carry no
// conditions at all, and it is the one that forbids inventing a cause. Read
// alone, "nothing here knows what would change it" beside a named condition
// would be two of this library's own sentences disagreeing on one screen; this
// clause is what keeps them one answer.
//
// AND IT PROMISES NOTHING. A met condition is not an open door: the other three
// wires can still switch the same control off and none of them declares a
// reason, so the sentence sends the reader back to the row rather than into a
// retry loop against a door that never opens.
//
// IT IS ALSO WHAT KEEPS `unblockedBy` HONEST BESIDE THE SENTENCE ABOVE. That
// field is derived from the conjuncts that did NOT hold, so it can only ever be
// present on a control this clause is also served for — the case where the app
// DID say something. Where it said nothing, there are no failing conjuncts,
// `unblockedBy` is absent, and "nothing here knows what would change it" is
// exactly true. The two sentences cannot meet a row that contradicts them.
const DISABLED_EVIDENCE_WHY =
  'This control also declares a condition for being clickable, and the app’s own state does not meet ' +
  'it — the parts that did not hold ride this result as evidence, named by the app’s own declaration ' +
  'and not guessed here. whats_here may also carry unblockedBy for this control: the actions the app ' +
  'claims write those same parts. That is what the app declared, not a promise: firing one is not ' +
  'promised to free this, and meeting the condition may still leave the control off for a reason ' +
  'nothing here can see. Say what the evidence says, and no more.';

// THE THIRD STATE, at the moment of the reach. A control is clickable, switched
// off, or WORKING — and only the first two ever had a wire, so a reader that
// cannot see the screen met a mid-flight control as a plain refusal and made one
// of the two moves that are wrong about working: fire it again, or tell the
// human it failed.
//
// The label itself never appears in here. It rides as DATA on the same result,
// because it is the app's own runtime text and this is an authored sentence —
// the two-string-class invariant, at the one place they meet on one payload.
//
// It says out loud that it is not a diagnosis of anything else on the result. A
// switched-off control that is ALSO busy has had two separate things said about
// it by the app, and joining them into "off BECAUSE busy" would be this library
// inventing a cause, which is exactly what the sentence above forbids.
//
// NO CLOCK APPEARS HERE EITHER. There is no "it should finish soon", because
// nothing in this library knows that, and no timer will ever expire this state
// (docs/design/answer-grammar.md — a clock is never evidence). The ceiling on
// waiting belongs to whoever is waiting, and it reports UNFINISHED.
const BUSY_WHY =
  'The app also says it is working on this control right now — its own label for that is on this ' +
  'result as busy. Working is not broken and not done, and it is not given here as the cause of ' +
  'anything else. Nothing here will time it out. Wait and call whats_here again, or ask did_it_work ' +
  'about a fire you already made — do not fire again to find out.';

// THE SAME THIRD STATE, ONE LAYER IN: the app opened a piece of work for THIS
// fire (Session.beginWork) and has not closed it. `busy` is about a control on
// screen; this is about the fire the caller is asking after, which is why it can
// ride an answer about an action nobody can see a button for any more.
//
// IT RIDES ALONGSIDE, NEVER OVER. On the still-pending arm it is the second
// reason the same answer is true. On the SETTLED arm it sits beside the receipt
// exactly as outcomeNow does — a fire can come to rest (the app reported its
// delta) while the app keeps working (the upload continues), and both are true
// at once. So the sentence says out loud that it is not a verdict on the outcome
// printed next to it: averaging them would destroy the only evidence a reader
// has that two things are happening.
//
// NO NEW JUDGMENT WORD was minted for it, and no clock appears in it. The
// judgment vocabulary is closed (docs/design/answer-grammar.md); this is a fact
// riding an existing arm, and a work row that outlives anyone's patience is
// answered by the row still being open — never by a timer.
const STILL_WORKING_MEANS =
  'The app also says it is still working on this action — it opened a piece of work for this fire ' +
  'and has not closed it. That is the app’s own account of what it is doing, not a verdict on ' +
  'anything else on this result, and nothing here will time it out. Do not perform the action again ' +
  'to find out: ask this tool again, or call whats_here to see where things stand.';

// WHO SAID 'performed' — the companion sentence for `settledBy: 'external-report'`,
// in the `stillWorkingMeans` / `arrivalMeans` shape.
//
// WHY IT HAS TO EXIST. `observeEffect` records a REPORT, never a fact, and its
// own doc-comment is emphatic about it — but the one surface a model actually
// reads served the same `effectStatus: 'performed'` for a handler this library
// watched run and for a sentence somebody handed in about a processor it cannot
// see. `effectVerified: 'unobservable'` is a partial disclosure: it says nobody
// checked the writes, not that the verdict itself came from outside. The session
// HOLDS the distinguishing fact (TransitionRecord.observations), so withholding
// it is the library flattening report and fact into one word.
//
// NAMES ONLY. The source rides as data (the app's own label, already capped
// where it landed) and the evidence pointer rides as PRESENCE — this library
// never fetches, dereferences or quotes it, and a reference is not evidence.
const EXTERNAL_REPORT_MEANS =
  'The word above came from OUTSIDE this client: a source the app named reported this action’s ' +
  'outcome, and this library recorded that report without checking it. Nothing here watched the ' +
  'effect happen, and a report is not proof — if it matters, say who reported it rather than that ' +
  'it is confirmed.';

// WHOSE THE CHOICE IS — the companion sentence for the `withTheHuman` list, in
// the `stillWorkingMeans` / `arrivalMeans` shape: a fact rides as data, and one
// authored constant says what the fact MEANS.
//
// The list itself is the disclosure — those steps have left `readySteps`,
// because a step listed there IS an instruction to fire it. This says the rest:
// what to do instead, where the answer comes from, and what `made: true` is and
// is not. It is deliberately not a refusal: nothing here stops a fire, and a
// sentence promising a gate the library does not have would be the same class of
// lie this library spends its refusals avoiding.
//
// NO CLOCK, and no "they should answer soon". Nothing expires a decision and
// nothing flips it by time — a clock is never evidence
// (docs/design/answer-grammar.md, rule 2). And nothing fires by itself: `made`
// turning true is a state reading, not a trigger, so the move after it is still
// the caller's to make.
const WITH_THE_HUMAN_MEANS =
  'These steps are the human’s to decide, not yours to perform. Present the options if they ask, and ' +
  'wait: they answer through the app’s own control, and the flow moves because the world moved. Nothing ' +
  'is being held here — there is no card to approve and no question of yours outstanding. A row with ' +
  'made: true means they have answered; act on it as a normal step, and know that nothing fires by ' +
  'itself. Nothing here will time any of this out.';

// The requireHumanApproval refusals, in the NOT_MATERIALIZED_WHY shape: name
// what happened, name the next move, name the option. Every one is a fixed
// authored sentence (the two-string-class invariant above) — a refusal that
// interpolated the payload it rejected would leak the value it was protecting.
const APPROVAL_REQUIRED_WHY =
  'No human has approved this action. confirm: true is your request to proceed, not the human’s ' +
  'answer — this session was created with requireHumanApproval, so only an approval the app ' +
  'recorded from a person can cross this gate. Show the human the receipts and wait; if you were ' +
  'never given a way to collect a yes, tell the human that and stop.';

const APPROVAL_SPENT_WHY =
  'That approval was already used by an earlier action. One yes authorizes one action, on purpose. ' +
  'Ask again if this needs to happen a second time — and tell the human it is the second time.';

const APPROVAL_MISMATCH_WHY =
  'The human approved something different from what you just sent (see differs). An approval covers ' +
  'what was on the card and nothing else. Ask again for THIS input; do not reuse the earlier approval.';

const APPROVAL_UNCOMPARABLE_WHY =
  ' This input also contains a value the library cannot compare faithfully, so it will not guess ' +
  'that they match.';

const APPROVAL_STALE_WHY =
  'The human’s approval is too old for this session’s rules, or the app’s state changed after they ' +
  'said yes. Show them the current receipts and ask again.';

const APPROVAL_DECLINED_WHY =
  'The human said no to this. Do not ask again about the same thing — tell them it was not done, and ' +
  'move on or ask about something different.';

// The freshness + single-flight refusals, in the same shape and under the same
// two-string-class invariant: a fixed authored sentence, naming what happened and
// the next move. Every one of them is about a MECHANISM the app switched on —
// none of them second-guesses the caller's judgement, and none carries a value.
const OFFER_REQUIRED_WHY =
  'This app checks that an action is fired against the row you actually planned from, and this call ' +
  'named no row. Look again (whats_here) and send the offerId that came with the action you pick. It ' +
  'is a reference to what you were shown, not a password — it grants nothing on its own.';

const OFFER_UNKNOWN_WHY =
  'That offerId is not one this session handed out. Look again and use the offerId printed on the ' +
  'row you are firing — an offer belongs to one action, and one row.';

const OFFER_EVICTED_WHY =
  'That offerId was real and this session no longer holds it: it keeps a bounded number of rows and ' +
  'the oldest have been dropped. Nothing is wrong with what you did — look again and fire against a ' +
  'fresh row.';

const OFFER_OTHER_ACTION_WHY =
  'That offerId is on this session’s record, and it names a DIFFERENT action (see offeredFor). An ' +
  'offer answers only the row it was minted for, so it says nothing about this one. Look at the row ' +
  'for the action you are firing and send ITS offerId.';

/**
 * The three answers to "this offer cannot settle this fire", by the word the
 * refusal carries. A `Record` over the union, so a fourth `why` added to the type
 * stops the build rather than silently falling back to the sentence that blames
 * the caller.
 */
const OFFER_NOT_ON_RECORD_WHY: Record<
  Extract<FireResult, { reason: 'OFFER_NOT_ON_RECORD' }>['why'],
  string
> = {
  unknown: OFFER_UNKNOWN_WHY,
  evicted: OFFER_EVICTED_WHY,
  'other-action': OFFER_OTHER_ACTION_WHY,
};

const WORLD_MOVED_WHY =
  'Something this action was offered under has changed since you were shown that row (see moved — ' +
  'those are key names, not values). The app asks you to plan again rather than fire on an old ' +
  'reading: look again, and fire against the new row.';

const ACKNOWLEDGEMENT_REQUIRED_WHY =
  'Something this action was offered under has changed since that row (see moved). The app requires ' +
  'that you record having dealt with it before firing. Do it through the app’s own acknowledgement ' +
  'door and send the id it returns. Recording it means you performed that step — this library makes ' +
  'no claim that anything was understood, and neither should you.';

// THE SAME REFUSAL, WITH THE BLAME PUT WHERE IT BELONGS. The step WAS performed
// and this session's own cap dropped the receipt, so the sentence above — which
// reads as "you have not done this yet" — would be the library charging a caller
// for its own bound. Same split, same reason, as OFFER_EVICTED_WHY.
const ACKNOWLEDGEMENT_EVICTED_WHY =
  'You did record that step, and this session no longer holds the receipt: it keeps a bounded number ' +
  'of them and the oldest have been dropped. Nothing is wrong with what you did — record it again ' +
  'through the app’s own acknowledgement door and send the new id. Recording it means you performed ' +
  'that step; this library makes no claim that anything was understood, and neither should you.';

const ACKNOWLEDGEMENT_STALE_WHY =
  'That acknowledgement was recorded before the app’s state moved again, so it does not cover the ' +
  'world you are firing into. Look at what has changed and acknowledge again.';

// The fourth settling door (observeEffect) is the APP's, not the caller's, so
// this sentence names its CONSEQUENCE rather than its API: the wait may depend on
// something no move of yours can hurry. Saying only "ask did_it_work" invites a
// model to read a long wait as a failure and try again somewhere else.
const PRIOR_FIRE_PENDING_WHY =
  'An earlier attempt at this action has not finished, and this app allows one at a time. It is not ' +
  'stuck because time passed — nothing here expires. It clears when that earlier fire settles, which ' +
  'may be waiting on something outside this app (a payment processor, a queue) and is not something ' +
  'you can do from here. Ask did_it_work about the id in pendingTransitionId; when it has an answer, ' +
  'decide whether this still needs doing.';

// The principal-policy refusals, in the same shape: name what happened, name
// the next move, and never suggest a retry — nothing about the world changes
// who this caller is. Two sentences because the useful next move differs: when
// the app says a PERSON must do it, the move is to hand it to them.
const PRINCIPAL_NOT_ALLOWED_WHY =
  'This app declares who may perform this action, and you are not one of them (see required). This is ' +
  'not a timing problem and not a permission you can be granted here — trying again will be refused ' +
  'the same way. Tell the human what you were asked to do and that this app does not let you do it.';

const PRINCIPAL_HUMAN_ONLY_WHY =
  'This app declares that a PERSON performs this action, not you. Do not try again: show them what ' +
  'needs doing and let them do it in the app — the flow moves because they acted, and you will see ' +
  'the result like any other change in the world.';

// The effect-policy refusal. The audience is the DEVELOPER, and the sentence
// says so plainly rather than sending a model looking for a workaround it does
// not have.
const EFFECT_NOT_VERIFIABLE_WHY =
  'This app requires a high-effect action to say how anyone could check that it happened, and this ' +
  'one does not (see needs). Nothing you send can satisfy that — it is a missing declaration in the ' +
  'app itself. Tell the human the action is not available and that their developer needs to declare ' +
  'how its effect is observable.';

const APPROVAL_REVOKED_WHY =
  'The human approved this and then withdrew that approval before anything acted on it. A withdrawn ' +
  'yes authorizes nothing. Tell them it was not done; if it still needs doing, show them the ' +
  'receipts again and wait for a fresh answer.';

// The `confirm` and `decline` descriptions, in the two modes each can honestly
// have. The enforced pair is served only by a port whose OWN fires the gate holds
// (`gated` below — the session enforcing is not enough, since the gate keys on
// the port's principal), so the instruction a model reads is true of the app it
// is holding. A description promising a gate that is off would be the same class
// of lie this option removes.
const CONFIRM_DESCRIPTION =
  'Required true to proceed with a high-effect step (after the human approves the receipts).';

const CONFIRM_DESCRIPTION_ENFORCED =
  'Required true to proceed with a high-effect step, AFTER a human has approved it in the app. This ' +
  'app enforces that: your setting true is a request to proceed, and it does not by itself authorize ' +
  'anything — a step with no approval on record is refused. Show the human the receipts and wait.';

const DECLINE_DESCRIPTION =
  'Set true to record that the human refused a high-effect step (closes the ask; nothing fires).';

// Same asymmetry as `confirm`, for the same reason: a relayed no is the agent's
// REPORT of a refusal, and under enforcement it closes nothing. Telling a model
// it closes the ask would invite it to believe the human's card is gone.
const DECLINE_DESCRIPTION_ENFORCED =
  'Set true to report that the human refused a high-effect step. Nothing fires, and your report is ' +
  'recorded as yours: the ask stays open until the person answers it in the app, because a no you ' +
  'send is no more the human’s decision than a yes you send.';

// The three true things about a name this position cannot serve but the app
// DOES have. One of them is always the case, and the session already knows
// which — see notHereData below for why the refusal now says it.
const NOT_ON_THIS_PAGE =
  'This app does have that action, but not on this page. Call whats_here to see where you are and ' +
  'what is offered here — reaching it means going to the page that offers it first.';

const CONDITIONS_NOT_MET =
  'This app does have that action and it belongs on this page, but its conditions are not met right ' +
  'now, so it is not being offered (see evidence). Change what it needs, or tell the human it is not ' +
  'available yet — do not report it as done.';

const DECLARED_HERE_NOT_OFFERED =
  'This app declares that action on this page, but it is not being offered right now. Call whats_here ' +
  'to see what is.';

const STEP_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    step: { type: 'string', description: 'A step name taken from readySteps in a previous result.' },
    input: {
      type: 'object',
      description:
        'The step input. Each result states what the next step expects. Match the shape in that step’s ' +
        'expects field — an input that does not returns PAYLOAD_INVALID carrying what was expected.',
    },
    confirm: { type: 'boolean', description: CONFIRM_DESCRIPTION },
    decline: { type: 'boolean', description: DECLINE_DESCRIPTION },
    instance: {
      type: 'string',
      description: 'Which instance to act on, when the step lists instances (e.g. an order id).',
    },
  },
  additionalProperties: false,
};

export function serveToAgent(
  session: Session,
  opts?: JourneyToolsOptions,
): JourneyToolsPortWithSettlement {
  const confirmHighEffect = opts?.confirmHighEffect ?? true;
  const source: Principal = opts?.source ?? 'agent';
  const graphId = session.graphId;
  /**
   * TWO different truths, and conflating them was a lie served to a model.
   *
   * `sessionEnforces` — this session refuses a high-effect fire with no recorded
   * human approval. `gated` — a fire THROUGH THIS PORT is one of the ones it
   * refuses, which is a question about the port's own principal because the gate
   * keys on the principal and not the door (Session.requiresHumanApprovalFrom).
   * A port constructed with `source: 'user'` is exempt, so it must not hand a
   * model the sentence that says otherwise.
   *
   * Read once: the mode is fixed for the session's life, so the tool array is
   * still frozen once and serves identical bytes every turn — the invariant is
   * about a turn-to-turn CHANGE, and there is none.
   */
  const sessionEnforces = session.requiresHumanApproval;
  const gated = session.requiresHumanApprovalFrom(source);
  if (sessionEnforces && !gated) {
    // Loud, once, through the host's own sink. The combination is documented
    // (receipts.mdx: "hand a model a port constructed with source: 'user' and you
    // have disarmed this gate") and the docs being right is not the same as the
    // developer having read them.
    session.warn(
      `hcifootprint: this session runs with requireHumanApproval, but this port stamps its fires '${source}' — and the gate only holds agent fires. Every high-effect fire through this port executes with no approval on record. Build the port a model holds with the default source ('agent'); keep a '${source}' port for the app reporting its OWN motion.`,
    );
  }
  /**
   * Under enforcement the port ALWAYS asks for a high-effect edge, whatever
   * `confirmHighEffect` says. Fail-closed and usable: silently honouring `false`
   * would leave every high-effect fire refused with no ask ever landing, which is
   * a dead app rather than a safe one.
   */
  const askBeforeHighEffect = confirmHighEffect || gated;
  /** The step schema, with the confirm/decline arguments described mode-honestly. */
  function stepSchema(): typeof STEP_INPUT_SCHEMA {
    const schema = structuredClone(STEP_INPUT_SCHEMA);
    if (gated) {
      schema.properties.confirm.description = CONFIRM_DESCRIPTION_ENFORCED;
      schema.properties.decline.description = DECLINE_DESCRIPTION_ENFORCED;
    }
    return schema;
  }

  /** The arguments do_action shares with a journey step — everything but `step`. */
  function sharedStepProperties(): Record<string, unknown> {
    const { step: _step, ...shared } = stepSchema().properties;
    return shared;
  }

  // Journeys are declared-only data: the tool array derived from them is static
  // BY CONSTRUCTION — freeze it once, serve identical bytes every turn.
  const declaredJourneys = session.availableJourneys().journeys;
  const journeyToolMode = opts?.journeyTools ?? 'per-journey';
  const journeyToolNames = new Map<string, string>(); // tool name → journey id
  if (journeyToolMode === 'per-journey') {
    for (const journey of declaredJourneys) {
      journeyToolNames.set(sanitizeName(`${graphId}.journey.${journey.id}`), journey.id);
    }
  }
  // The ONE generic tool's name in 'single' mode. Computed either way (it is one
  // string) but only ever REACHABLE in that mode: in 'per-journey' the array
  // never carries it, and the dispatcher below asks the mode before the name, so
  // an app with a journey literally called '' can never collide with it.
  const singleJourneyName = sanitizeName(`${graphId}.journey`);
  const journeySteps = new Map(declaredJourneys.map((journey) => [journey.id, [...journey.steps]]));
  const declaredJourneyIds = new Set(declaredJourneys.map((journey) => journey.id));
  const whatsHereName = sanitizeName(`${graphId}.whats_here`);
  const doActionName = sanitizeName(`${graphId}.do_action`);
  const whyName = sanitizeName(`${graphId}.why`);
  const didItWorkName = sanitizeName(`${graphId}.did_it_work`);
  // Authored, not runtime: the graph id is the author's own word and the tool
  // name is a fixed constant of this port, so this sentence is byte-stable for
  // the life of the conversation like every other authored string here. It
  // rides ONLY the 'pending' arm — on a fire already at rest it would send the
  // model to ask a question it already has the answer to.
  const howToSettle =
    `Not finished yet — the app’s side is still running. Call ${didItWorkName} with this ` +
    `transitionId to learn how it came to rest. Do not perform the action again.`;

  /**
   * THE SAME POINTER, AS A FIELD — because a projection cannot route on a
   * sentence.
   *
   * `howToSettle` names the door in prose, and prose is readable by the model
   * that is looking at it and by nothing else. A consumer that re-serves this
   * surface into an action space of its own — a benchmark harness, a router, an
   * app that publishes three verbs instead of four — reads the tool ARRAY, wires
   * what it finds there, and drops a door that is only ever named inside a
   * string. The failure then surfaces nowhere near here: an agent holding an
   * unsettled high-effect fire, told not to repeat it and given no way to settle
   * it, repeats it several turns later. That was measured, off a real campaign,
   * and it is a drop the library cannot otherwise see happening to it.
   *
   * So: the prose stays byte-for-byte what it was, and this rides beside it.
   * `tool` is a name this port publishes unconditionally; `arg` is the property
   * that tool's schema requires; the id to put in it is the `transitionId`
   * already on this very result. Nothing new is computed and no app data
   * crosses. A consumer that wires it can settle; one that cannot now has a
   * field to fail on rather than a sentence to ignore.
   */
  function settleWithData(): ServeResult {
    // A fresh object per result: everything this port returns is the caller's
    // to keep, and a shared literal would let one consumer's edit reach the next.
    return { settleWith: { tool: didItWorkName, arg: 'transitionId' } };
  }

  /**
   * The journey door(s), in whichever shape this port was built for.
   *
   * ONE tool or N — and the N-tool array is what a journey costs in the channel
   * that renders first in every prompt. See {@link JourneyToolsOptions.journeyTools}
   * for the measurement and for what is still unknown about the single-tool mode.
   */
  const journeyTools: MCPToolDescription[] =
    journeyToolMode === 'single'
      ? [
          {
            name: singleJourneyName,
            description: JOURNEY_TOOL_DESCRIPTION,
            inputSchema: {
              type: 'object',
              properties: {
                journey: { type: 'string', description: JOURNEY_ARG_DESCRIPTION },
                // The five step arguments, taken from the SAME rendered schema a
                // per-journey tool serves — so no two journey doors can ever
                // describe confirm differently.
                ...stepSchema().properties,
              },
              required: ['journey'],
              additionalProperties: false,
            },
          } as MCPToolDescription,
        ]
      : declaredJourneys.map(
          (journey) =>
            ({
              name: sanitizeName(`${graphId}.journey.${journey.id}`),
              description: journey.description + JOURNEY_USAGE,
              inputSchema: stepSchema(),
            }) as MCPToolDescription,
        );

  const staticTools: MCPToolDescription[] = [
    ...journeyTools,
    {
      name: whatsHereName,
      description: WHATS_HERE_DESCRIPTION,
      inputSchema: {
        type: 'object',
        properties: {
          sinceVersion: {
            type: 'number',
            description: 'A version from a previous result: the reply narrates only the delta since it.',
          },
          routeTo: {
            type: 'string',
            description: ROUTE_TO_ARG_DESCRIPTION,
          },
        },
        additionalProperties: false,
      },
    } as MCPToolDescription,
    {
      name: whyName,
      description: WHY_DESCRIPTION,
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'A state key name, as seen in results, guards, or evidence.' },
        },
        required: ['key'],
        additionalProperties: false,
      },
    } as MCPToolDescription,
    {
      name: doActionName,
      description: DO_ACTION_DESCRIPTION,
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'An action name from whats_here.' },
          // The four shared arguments, taken from the SAME rendered schema a journey
          // step serves — so the two doors can never describe confirm differently.
          ...sharedStepProperties(),
        },
        required: ['action'],
        additionalProperties: false,
      },
    } as MCPToolDescription,
    {
      name: didItWorkName,
      description: DID_IT_WORK_DESCRIPTION,
      inputSchema: {
        type: 'object',
        properties: {
          transitionId: {
            type: 'string',
            // One property, two id families, and no second argument: a schema
            // grown for this would change the tool array's bytes for every
            // caller, and the port can tell the two apart itself.
            description:
              'The transitionId carried by the result of the action you performed — or the askId ' +
              'from a needs-confirm result, to learn whether the human has decided.',
          },
        },
        required: ['transitionId'],
        additionalProperties: false,
      },
    } as MCPToolDescription,
  ];

  /** Currently-fireable edges by id — the serve layer's only view of tool detail. */
  function edgeById(): Map<string, AvailableEdge> {
    return new Map(session.available().edges.map((edge) => [edge.affordanceId, edge]));
  }

  function callJourney(journeyId: string, args: JourneyCallArgs): ServeResult {
    // Cross-journey switch is implicit — but NEVER destructive-first: the open
    // frame is left only after the target journey is known to be openable, so a
    // blocked target cannot cost the model its current flow.
    const openFrame = session.journeyFrame();
    if (openFrame && openFrame.journeyId !== journeyId) {
      const target = session.availableJourneys().journeys.find((journey) => journey.id === journeyId);
      if (target && !target.preconditionPassed) {
        return {
          ok: false,
          judgment: 'blocked',
          journey: journeyId,
          why: 'This journey’s precondition does not hold right now. Your current journey is still open.',
          evidence: structuredClone(target.evidence),
          keptFrame: openFrame.journeyId,
          ...positionData(),
        };
      }
      session.leaveJourney();
    }
    if (!session.journeyFrame()) {
      const committed = session.commitJourney(journeyId, { source });
      if (!committed.ok) {
        if (committed.reason === 'PRECONDITION_FAILED') {
          return {
            ok: false,
            judgment: 'blocked',
            journey: journeyId,
            why: 'This journey’s precondition does not hold right now.',
            evidence: structuredClone(committed.evidence),
            ...positionData(),
          };
        }
        return { ok: false, judgment: 'error', journey: journeyId, reason: committed.reason, ...positionData() };
      }
    }

    if (args.step === undefined) {
      return { ok: true, journey: journeyId, ...frameData(journeyId), ...positionData() };
    }

    const stepId = resolveStep(journeyId, args.step);
    if (!stepId) {
      return {
        ok: false,
        judgment: 'error',
        journey: journeyId,
        reason: 'UNKNOWN_STEP',
        /* v8 ignore next -- the `?? []` arm is unreachable: journeySteps and the journey tool names are built from one declared list, so a name that resolved to a journeyId always has its steps filed here. */
        steps: [...(journeySteps.get(journeyId) ?? [])],
        ...positionData(),
      };
    }
    const edge = edgeById().get(stepId);
    if (askBeforeHighEffect && edge?.highEffect && args.confirm !== true && !greyedOut(edge)) {
      // A refusal is relayed: record it and do NOT fire. It closes the ask in the
      // default mode; under enforcement it is the caller's report and closes
      // nothing, which relayedDeclineData says out loud in the result.
      if (args.decline === true) {
        const declined = session.declineConfirm(stepId, { principal: source });
        return {
          ok: false,
          judgment: 'declined',
          journey: journeyId,
          step: stepId,
          askId: declined.askId,
          ...relayedDeclineData(declined),
          ...positionData(),
        };
      }
      // First look at a high-effect step: land the ask + assemble the receipts
      // the agent shows the human. confirm: true on the next call fires it.
      const asked = askData(stepId, args);
      return {
        ok: false,
        judgment: 'needs-confirm',
        journey: journeyId,
        step: stepId,
        does: edge.description,
        // `ok: false` is true of the CALL and was read as true of the app. These
        // two say what actually happened: nothing, and it is a person's turn.
        performed: false,
        why: PAUSED_NOTHING_DONE,
        ...asked,
        ...positionData(),
      };
    }
    const fired = session.fire(stepId, fireOptions(stepId, args));
    // frameData FIRST: on a rejected fire, fireData's judgment ('rejected')
    // must win over the frame's ('needs-choice'); on success fireData carries
    // no judgment and the frame's stands.
    return {
      journey: journeyId,
      ...frameData(journeyId),
      ...fireData(fired, stepId, edge, args),
      ...positionData(),
    };
  }

  function resolveStep(journeyId: string, step: string): string | null {
    /* v8 ignore next -- the `?? []` arm is unreachable for the same reason as the one in callJourney: only a name that mapped to a declared journey ever reaches this resolver. */
    const steps = journeySteps.get(journeyId) ?? [];
    if (steps.includes(step)) return step;
    const matches = steps.filter((candidate) => candidate.endsWith(`.${step}`));
    return matches.length === 1 ? matches[0] : null;
  }

  /**
   * The declared hops to a page, for the reader who cannot open a map.
   *
   * The third context this port serves is TRAVERSAL, and until now a model was
   * told where it IS but had no way to ask how to get somewhere — the one thin
   * spot among map, traversal and actions. It rides `whats_here` rather than
   * arriving as a sixth tool because the tool array is a contract: its bytes are
   * the same for every caller on every turn, and a new tool would change them.
   *
   * THE ROUTE'S LAWS TRAVEL WITH IT ONTO THE WIRE, unchanged:
   * - NOT A PLAN. Fewest hops is arithmetic. A preferred order toward a goal is
   *   a journey, which the app declares.
   * - NOT A PERMISSION. `goTo` is a claim about where an action goes; a guarded
   *   or greyed hop is still reported, because whether it is open is answered on
   *   the row you actually reach for — and is never guessed for a page this
   *   session has not visited.
   * - `[]` means already there; absence of a route means nobody DECLARED one,
   *   which is not the same as "you cannot get there".
   */
  function routeAnswer(routeTo: string | undefined): ServeResult {
    if (routeTo === undefined) return {};
    const hops = session.howToReach(routeTo);
    if (hops === null) return { routeTo: { to: routeTo, why: NO_DECLARED_ROUTE } };
    if (hops.length === 0) return { routeTo: { to: routeTo, alreadyHere: true } };
    return { routeTo: { to: routeTo, hops, means: ROUTE_MEANS } };
  }

  /**
   * THE JOURNEYS THIS POSITION CAN ACTUALLY START — and a count of the ones it
   * cannot, because a scoped list that does not say it is scoped is a lie.
   *
   * Until now this door listed every journey the app DECLARES, wherever its
   * first step lives. On a 60-page app declaring 57 journeys that list grew from
   * 382 to 8,651 bytes while the rest of the position block did not move at all
   * — 100% of the growth, served every turn, describing flows that cannot be
   * started from here. It is the same on-demand-disclosure rule this port
   * already applies one level down (steps arrive after a journey is entered),
   * applied to the journeys themselves.
   *
   * `entryAvailable` IS THE SIGNAL, and the session already computes it
   * (`AvailableJourney.entryAvailable` — the first step is offered on this node
   * AND its guard holds). NOT `preconditionPassed`: measured at that same cursor,
   * 56 of 57 journeys passed their precondition and 2 had an available entry —
   * a journey declaring no precondition passes trivially, so filtering on it
   * buys nothing.
   *
   * THE OPEN FRAME IS ALWAYS LISTED, whatever its entry says. A journey in
   * progress has usually moved past its first step, so an entry-only filter
   * would drop the one journey the model is actually inside — and a flow that
   * vanishes from the list reads as a flow that ended.
   *
   * Nothing is hidden from the APP: `session.availableJourneys()` still answers
   * for every declared journey. This is what the model is SERVED.
   */
  function journeysHere(): { here: AvailableJourney[]; elsewhere: number } {
    const all = session.availableJourneys().journeys;
    const openId = session.journeyFrame()?.journeyId;
    const here = all.filter((journey) => journey.entryAvailable || journey.id === openId);
    return { here, elsewhere: all.length - here.length };
  }

  /** The omission, disclosed — a count and the way through, never silence. */
  function elsewhereData(elsewhere: number): ServeResult {
    return elsewhere > 0 ? { journeysElsewhere: elsewhere, journeysElsewhereMeans: JOURNEYS_ELSEWHERE_MEANS } : {};
  }

  function callWhatsHere(sinceVersion?: number, routeTo?: string): ServeResult {
    const since = sinceVersion === undefined ? undefined : { sinceVersion };
    const brief = session.contextBrief(since);
    const rows = session.available().edges;
    const turn = turnFacts(rows, sinceVersion);
    const scoped = journeysHere();
    return {
      ok: true,
      // FIRST, and on the call a model already makes. The field failure was a
      // model narrating a flow it had never performed — its own prose competing
      // with the app for authority and winning. This block says which source
      // wins, and lists the refusals the brief structurally cannot show (a
      // refused fire is a gap row, not a transition).
      facts: session.groundTruth(since).text,
      brief: brief.text,
      actions: rows.map((edge) => edgeData(edge, turn)),
      journeys: scoped.here.map((journey) => ({
        journey: journey.id,
        does: journey.description,
        feasible: journey.preconditionPassed,
        // WHERE THIS CHAIN STANDS, from the SAME call the journey tool serves —
        // never a second derivation here. Two doors that computed this
        // separately could disagree about one journey, and a disagreement of
        // that shape reads to a model as "the human already answered". The ids
        // come from the session's own list, so nothing unresolved reaches the
        // throwing door.
        standing: session.journeyStanding(journey.id).standing,
        ...(journey.preconditionUnevaluable ? { feasibilityUnknownFor: journey.preconditionUnevaluable } : {}),
      })),
      ...elsewhereData(scoped.elsewhere),
      ...positionData(),
      ...routeAnswer(routeTo),
    };
  }

  /**
   * Is this control SWITCHED OFF right now — the capability question, asked
   * before the authority one.
   *
   * `fire()` has always ordered the two: "never send a human to approve an
   * action that is guard-closed, mis-shaped, greyed out or wired to nothing"
   * ({@link Session.fire}). The confirm arms here return BEFORE `fire()` is
   * called at all, so on this door the order was inverted for one of the four:
   * a greyed-out high-effect control summoned a person, took their yes, and
   * refused the fire afterwards with `TOOL_DISABLED`. Two of this library's own
   * sentences then disagreed on one screen — the refusal telling the agent to
   * say the control is not available yet, while its sibling door handed the
   * human a card for that very control.
   *
   * Only the state the served row PROVES: the app said switched off, or the
   * authored `enabledWhen` proved it. Not "wired to nothing" — a touring session
   * fires unmaterialized edges on purpose — and not the payload, which is
   * `fire()`'s to judge. When this is true the arm falls through to `fire()`,
   * which refuses in the word that was already true, records the gap row, and
   * carries the busy label if the app said one. Nobody is asked to approve
   * something nobody can do.
   */
  function greyedOut(edge: AvailableEdge): boolean {
    // TWO WAYS A CONTROL IS NOT PERFORMABLE RIGHT NOW, and both belong on this
    // side of the human. The second is single-flight: a person asked to
    // authorize a payment that is then refused as a repeat has been asked for
    // nothing, and the app's own two sentences would disagree on one screen —
    // exactly the inversion the greyed-out arm was written to fix.
    return edge.enabled === false || edge.heldByPriorFire === true;
  }

  function callDoAction(args: DoActionArgs): ServeResult {
    const edges = session.available().edges;
    const exact = edges.find((edge) => edge.affordanceId === args.action);
    const matches = exact ? [exact] : edges.filter((edge) => edge.affordanceId.endsWith(`.${args.action}`));
    if (matches.length !== 1) {
      return {
        ok: false,
        judgment: 'error',
        reason: matches.length === 0 ? 'UNKNOWN_ACTION' : 'AMBIGUOUS_ACTION',
        actions: edges.map((edge) => edge.affordanceId),
        // Only on the no-match arm: an ambiguous SHORT name is not a claim about
        // any one action, and the id list above is already its whole answer.
        ...(matches.length === 0 ? notHereData(args.action) : {}),
        ...positionData(),
      };
    }
    const edge = matches[0];
    if (askBeforeHighEffect && edge.highEffect && args.confirm !== true && !greyedOut(edge)) {
      if (args.decline === true) {
        const declined = session.declineConfirm(edge.affordanceId, { principal: source });
        return {
          ok: false,
          judgment: 'declined',
          action: edge.affordanceId,
          askId: declined.askId,
          ...relayedDeclineData(declined),
          ...positionData(),
        };
      }
      return {
        ok: false,
        judgment: 'needs-confirm',
        action: edge.affordanceId,
        does: edge.description,
        performed: false,
        why: PAUSED_NOTHING_DONE,
        ...askData(edge.affordanceId, args),
        ...positionData(),
      };
    }
    const fired = session.fire(edge.affordanceId, fireOptions(edge.affordanceId, args));
    return { ...fireData(fired, edge.affordanceId, edge, args), ...positionData() };
  }

  /**
   * The truth about a name this position cannot serve but the app DOES have.
   *
   * This refusal is the PORT's own — the name matched no served edge, so no
   * `fire()` happens and the session's ledgers never see the reach (stated on
   * the Ground truth page: what lands in `facts` is a refusal that reached
   * `fire()`). What the refusal must not do is compound that silence with a
   * wrong word. `UNKNOWN_ACTION` beside an action the app declares reads as *no
   * such thing*, and a model told that about a control it watched a moment ago
   * has one honest move left: report it missing, or reach again. The session
   * already knows which of the three true things is the case — `explain()` is
   * the door it has always answered through — so the refusal carries it, in
   * `explain()`'s own evidence.
   *
   * EXACT ids only, and deliberately. Every result names an action by its full
   * id, so this covers every reach for something the model has actually been
   * shown; a shortened name the graph never served stays what it was — a guess
   * the library does not resolve on the caller's behalf.
   */
  function notHereData(action: string): ServeResult {
    let seen: Explanation;
    try {
      seen = session.explain(action);
    } catch {
      // The graph really does not have it. The words above were already the
      // whole truth, and inventing more would be the library guessing.
      return {};
    }
    if (!seen.offeredOnThisNode) return { why: NOT_ON_THIS_PAGE };
    if (!seen.guardPassed) {
      return {
        why: CONDITIONS_NOT_MET,
        // The same per-condition evidence a GUARD_FAILED fire carries — copied,
        // because a consumer annotating a result must not rewrite the session's.
        evidence: structuredClone(seen.evidence),
        ...(seen.guardUnevaluated ? { guardUnevaluated: [...seen.guardUnevaluated] } : {}),
      };
    }
    // Declared here, conditions met, still not served: the tree layer knows
    // reasons this door does not (a hidden node, a blocking overlay). Say that
    // much and no more — a guessed reason is the one thing worse than none.
    return { why: DECLARED_HERE_NOT_OFFERED };
  }

  /**
   * did_it_work — the settled truth, in ONE synchronous answer.
   *
   * `call()` is synchronous by contract, so this POLLS the session's retained
   * settlement instead of awaiting it: an answer that cannot arrive yet is
   * reported as still-pending, never waited for. That is the whole design —
   * the field failure was a relay that WAITED (a listener plus a four-second
   * ceiling) and then rewrote the result with whatever it had, so a mistyped
   * key produced a confident lie. Here a wrong id is refused by name, and an
   * unfinished action says it is unfinished.
   *
   * The arms: settled (the final word), still-pending (honest, immediate), the
   * three ASK-BOOK arms (nothing fired — a person has it, answered it, or
   * refused it), and unknown (refused in the UpdateResult vocabulary the rest of
   * the library already teaches with). One vocabulary, written down:
   * docs/design/answer-grammar.md.
   *
   * Two facts ride ALONGSIDE the settled arm rather than inside it, because both
   * can land after the receipt was written and the receipt is never rewritten:
   * `outcomeNow` (the record moved) and `arrival` (an observation corroborated —
   * or has yet to corroborate — a navigation claim).
   */
  function callDidItWork(transitionId: string, visited: ReadonlySet<string> = new Set()): ServeResult {
    let settled: FireSettlement | undefined;
    try {
      settled = session.settlementIfKnown(transitionId);
    } catch {
      // The session refuses an id no settlement can ever exist for — and an
      // ASK id is exactly that, honestly so: nothing fired, so there is no
      // transition to have come to rest. Before this, a paused action's id was
      // answered UNKNOWN_TRANSITION beside two lists that structurally could not
      // contain it (an ask is not a latch and never joins pending()), so the one
      // question with an answer available got the one word that says there
      // isn't one. Ask the book first.
      const paused = fromAskBook(transitionId, visited);
      if (paused) return paused;
      // Not an ask either. Over the wire a throw is not an answer, so it becomes
      // a typed result carrying THREE lists, side by side, none standing in for
      // another:
      //
      //   pending            — fires awaiting the app's STATE report. The exact
      //                        meaning updateState()'s own UNKNOWN_TRANSITION
      //                        carries, kept identical so one word does not
      //                        mean two things across the library.
      //   awaitingSettlement — fires this tool can still be asked about.
      //   awaitingHuman      — asks nobody has answered. Not fires at all, which
      //                        is why they need their own list rather than a
      //                        third meaning bolted onto one of the others.
      //
      // The second is the one a model's question is usually about, and it is the
      // SUPERSET of the first: a fire declaring no writes never joins `pending`
      // while its handler runs, so `pending` alone answered "[]" — "nothing is
      // live" — about an action that was at that moment running. That is the same
      // confident-emptiness this tool exists to end, and it left the wire
      // teaching strictly less than the in-process throw, which has always
      // named the open latches.
      return {
        ok: false,
        judgment: 'error',
        reason: 'UNKNOWN_TRANSITION',
        pending: session.pending().map((waiting) => waiting.id),
        awaitingSettlement: session.awaitingSettlement(),
        awaitingHuman: session
          .asks()
          .filter((ask) => ask.answer === undefined)
          .map((ask) => ({ askId: ask.askId, action: ask.affordanceId })),
        ...positionData(),
      };
    }
    // Past the catch, the id NAMES A TRANSITION — and in one graph shape it names
    // a card as well. An action the app called 'ask' (or 'grant', or 'refusal')
    // mints transition ids from the very grammar the ask book mints its own from
    // (`<name>#<n>`), nothing refuses that name at build, and the two counters
    // collide sooner or later. Answering from either book would be a confident
    // answer about the OTHER object — a settled fire reported as the fate of a
    // human's open card, or the reverse. There is no second argument to
    // disambiguate with and no fact that says which was meant, so it is refused
    // by name, with both candidates on the row.
    const twin = session.asks().find((row) => row.askId === transitionId);
    if (twin !== undefined) {
      const fired = firedAction(transitionId);
      return {
        ok: false,
        judgment: 'error',
        reason: 'AMBIGUOUS_ID',
        why: AMBIGUOUS_ID_WHY,
        askId: twin.askId,
        askedAbout: twin.affordanceId,
        /* v8 ignore next -- the `{}` arm is unreachable: past the catch above the id NAMES A FIRED TRANSITION (an unknown id and a stimulus/sync row both throw their way out), and a fired transition always carries the action that made it. */
        ...(fired !== undefined ? { did: fired } : {}),
        ...positionData(),
      };
    }
    if (!settled) {
      const did = firedAction(transitionId);
      return {
        ok: true,
        settled: false,
        judgment: 'still-pending',
        /* v8 ignore next -- the `{}` arm is unreachable for the same reason: an unsettled id is one this session opened a latch for, which only fire() does, and that fire is in the log under the action that made it. */
        ...(did !== undefined ? { did } : {}),
        howToAct: STILL_PENDING_HOWTO,
        // ADDITIVE, on the arm that already says the right word: the judgment is
        // 'still-pending' either way, and this says the app has told us WHY —
        // it has work open for this fire. No new word for a fate that has one.
        ...stillWorkingData(transitionId),
        ...positionData(),
      };
    }
    return {
      ok: true,
      settled: true,
      /* v8 ignore next 3 -- the `{}` arm is unreachable: only fire() ever retains a settlement, so a SETTLED id always belongs to a fired transition, and a fired transition always names its action. */
      ...(settled.transition.cause.affordanceId !== undefined
        ? { did: settled.transition.cause.affordanceId }
        : {}),
      ...settledFacts(transitionId, settled),
      ...positionData(),
    };
  }

  /**
   * THE SETTLED ANSWER — everything true about a fire that has come to rest,
   * built ONCE and served through two doors.
   *
   * Door one is `did_it_work`, which wraps these facts in its own envelope
   * (`ok`, `settled: true`, `did`, the position). Door two is a transport that
   * gives the app its moment and folds the final truth into the result of the
   * very call that fired — `mcpServer`'s `settleWithinMs`. That transport used
   * to hand-patch three fields it picked out by name, so a remote agent learned
   * strictly less from a folded result than the same agent learned one call
   * later from `did_it_work`: no `outcome`, no `verifyHeld`, no `writesObserved`,
   * no `arrival`, and no marker at all on a fire nothing in the app executed.
   * One builder ends that: whatever this library knows about a settled fire, it
   * says the same way wherever it is asked.
   *
   * NO ENVELOPE OF ITS OWN, deliberately. A folded result already carries the
   * fire's `ok`, `did` and `transitionId`, and it carries `settlement` — the
   * word for "a commit bundle exists". Adding a boolean `settled` beside it
   * would put two names one letter apart on one payload, answering two
   * different questions. The envelope belongs to the arm that has one.
   *
   * THE RECEIPT IS NEVER REWRITTEN (docs/design/answer-grammar.md). `outcome`
   * and `effectStatus` are read off the retained settlement; the two facts that
   * can land after it — `outcomeNow` and `arrival` — are read LIVE and served
   * beside it, exactly as the law says, whichever door asked.
   */
  function settledFacts(transitionId: string, settled: FireSettlement): ServeResult {
    const data = session.producedFor(transitionId);
    const writes = settled.transition.effectVerified;
    // A settlement is a RECEIPT of how the fire came to rest, and first
    // settlement wins — so the record can move on afterwards while the receipt
    // stands (a server rejecting an order the app already reported flips it to
    // 'rolled-back'). The question here is "did the app actually do it", so
    // serving the receipt alone would answer "it worked" about something the
    // app has since undone — a fact the session is holding right there. The
    // later word rides ALONGSIDE, never over: the receipt is not rewritten, and
    // it appears only when the two genuinely disagree.
    const live = session.transitions().find((row) => row.id === transitionId);
    const outcomeNow = live?.outcome;
    const moved = outcomeNow !== undefined && outcomeNow !== settled.outcome;
    // ARRIVAL rides the same rail, for the same reason: a navigation claim can be
    // corroborated by an observation that lands long after the receipt was
    // written, and the receipt is not rewritten to say so. Read LIVE (the
    // receipt's own copy was frozen at rest and still says 'claimed'), served
    // beside it, and never mistaken for the settlement's verdict — an action can
    // be 'performed' with arrival still 'claimed', and that pair is the truth.
    const arrival = live?.arrival;
    return {
      // THREE axes, side by side, none averaged into another: effectStatus =
      // did anyone perform it, effectVerified = were the declared writes
      // observed, verifyHeld = did the app's OWN condition hold.
      effectStatus: settled.effectStatus,
      outcome: settled.outcome,
      // Only on disagreement — and with the one instruction that resolves it,
      // because a settled arm that points nowhere is how a model acts on a
      // receipt for an action the app has taken back.
      ...(moved ? { outcomeNow, howToAct: OUTCOME_MOVED_HOWTO } : {}),
      ...(writes !== undefined ? { effectVerified: writes } : {}),
      // The BOOLEAN form of the STATE axis, present only when the answer is
      // knowable — a model testing truthiness would read the string
      // 'unobservable' as an observed write, and absence cannot be misread that
      // way. NAMED FOR ITS OWN AXIS: as plain `verified` it collided with the
      // settlement's verify-contract verdict, and the collision was not
      // theoretical — a fire whose declared write DID land while the app's own
      // check answered no served `verified: true` beside an error sentence
      // saying verification failed. One name, two questions, opposite answers,
      // one payload.
      ...(typeof writes === 'boolean' ? { writesObserved: writes } : {}),
      // The CONTRACT axis, which never used to cross at all: in-process callers
      // read it off the settlement, and a remote agent — the one this whole tool
      // exists for — was left to infer it from `error` prose. Absent when the
      // action declares no verify: silence, never a passing grade.
      ...(settled.verifyHeld !== undefined ? { verifyHeld: settled.verifyHeld } : {}),
      // Absent on every action that declares no navigation — silence, not a
      // third word for "this one does not travel".
      ...(arrival !== undefined
        ? {
            arrival,
            arrivalMeans: arrival === 'observed' ? ARRIVAL_OBSERVED_MEANS : ARRIVAL_CLAIMED_MEANS,
          }
        : {}),
      // The tour marker, carried onto the POLL. The fire-time result said
      // `materialized: false` and this answer did not, so the same action read
      // "settled, and here is how it came to rest" one call later — about
      // something nothing in the app executed. Same word as the fire result, so a
      // consumer branches on one name.
      ...(settled.transition.materialized === false
        ? { materialized: false, why: NOTHING_EXECUTED_IT }
        : {}),
      ...(settled.transition.toNode !== undefined ? { toNode: settled.transition.toNode } : {}),
      // WHO ANSWERED. Read off the RECEIPT, not live: the question is who this
      // fire came to rest on, and a reversal that lands afterwards is a new fact
      // beside the receipt rather than a rewrite of it (the same law `outcome`
      // keeps one arm up). Absent on every fire nobody reported on — silence, so
      // an ordinary settlement serves exactly the bytes it always did.
      ...externalReportData(settled.transition.observations),
      // Capped TEXT: an app's error object never crosses a result whole. Capped
      // HERE and nowhere else, so no second door can grow its own idea of how
      // much of an app's error object is allowed onto a model's context.
      ...(settled.error !== undefined ? { error: errorText(settled.error) } : {}),
      ...(data !== undefined ? { data } : {}),
      // The app's own work, read LIVE on the same rail outcomeNow and arrival
      // ride: a work row can outlive the receipt, and the receipt is not
      // rewritten to mention it. Alongside, never over.
      ...stillWorkingData(transitionId),
    };
  }

  /**
   * WHERE THIS FIRE'S ANSWER CAME FROM, when it came from outside — the one
   * distinction `effectStatus` alone cannot carry.
   *
   * A handler this library watched complete and a webhook somebody handed in
   * both settle as `'performed'`, and they are not the same claim. This names the
   * second one: the marker a consumer BRANCHES on, the source the app named, and
   * whether the app holds a reference to evidence. The reference itself never
   * crosses — this library does not follow it, so quoting it would dress a
   * pointer up as a check.
   *
   * The FIRST report is the one that answered. Later ones are new facts on the
   * record (`session.observationsOf`) and do not rewrite a receipt.
   */
  function externalReportData(observations: ExternalObservation[] | undefined): ServeResult {
    const first = observations?.[0];
    if (first === undefined) return {};
    return {
      settledBy: 'external-report',
      reportedBy: first.source,
      ...(first.evidenceRef !== undefined ? { evidenceOnRecord: true } : {}),
      settledByMeans: EXTERNAL_REPORT_MEANS,
    };
  }

  /**
   * Whether the app has WORK OPEN for this fire, and the sentence that keeps a
   * reader from turning it into a verdict — served on the two arms about a fire
   * (still-pending, and settled), absent everywhere else.
   *
   * READ AT ANSWER TIME, never from anything this port kept: a work row's whole
   * value is that it says what is true right now.
   *
   * The label never crosses. It is the app's runtime text and it belongs to the
   * data channel `openWork()` already is — a caller that wants it holds the
   * session. What crosses here is the FACT (a boolean) and an authored sentence,
   * which is the two-string-class invariant at the one place they meet.
   *
   * `stillWorkingMeans`, not `why`: `why` is already spoken for on this very
   * builder (the tour marker's sentence), and two facts writing one key would
   * mean whichever came second silently erased the other. Named for its own
   * axis, exactly as `arrivalMeans` is.
   */
  function stillWorkingData(transitionId: string): ServeResult {
    const working = session.openWork().some((row) => row.transitionId === transitionId);
    return working ? { stillWorking: true, stillWorkingMeans: STILL_WORKING_MEANS } : {};
  }

  /**
   * The id names no settlement — so ask the ASK BOOK, whose three fates are the
   * three ways an action can have produced no outcome without anything failing
   * (the same three `groundTruth()` prints). `undefined` = not an ask either,
   * and the caller refuses it by name.
   *
   * READ AT ANSWER TIME, never from a snapshot this port kept: a card's fate is
   * exactly the thing that changes between two calls, and reporting "the human
   * is still deciding" about an ask they answered a minute ago is this tool's own
   * failure mode wearing a friendlier word.
   *
   * EXACT IDS ONLY, like every other lookup here. `resolveStep`'s suffix matching
   * exists because a model retypes a step name it read in prose; nothing retypes
   * an askId, and a near-miss match would answer about a DIFFERENT person's
   * card — the one class of wrong answer this tool must never give.
   */
  function fromAskBook(askId: string, visited: ReadonlySet<string>): ServeResult | undefined {
    const ask = session.asks().find((row) => row.askId === askId);
    if (ask === undefined) {
      // Not in the book. In the DEFAULT mode an ask is dropped the moment the
      // fire closes it, so a spent id lands here rather than on the arm below —
      // the transition still carries it, which is the whole point of the chain.
      return spentAnswer(askId, visited);
    }
    if (ask.answer === undefined) return pausedAnswer('awaiting-human', ask, PAUSED_AWAITING_HUMAN_HOWTO);
    if (ask.answer === 'declined') return pausedAnswer('declined', ask, PAUSED_DECLINED_HOWTO);
    // The withdrawn yes — the book's third word, before the unspent arm below,
    // whose "go and perform it" instruction is exactly the loop this card must
    // never be handed: the gate refuses APPROVAL_REVOKED identically every
    // time, without changing anything the ask book can see.
    if (ask.revoked === true) return pausedAnswer('approval-withdrawn', ask, PAUSED_APPROVAL_REVOKED_HOWTO);
    if (ask.spent !== true) {
      // A yes the app's own policy has aged out is still a yes on the card and
      // still unspent, so it lands here — and the instruction has to split. The
      // gate will refuse a fire on it (APPROVAL_STALE) and refuse it identically
      // every time, without changing anything the ask book can see, so telling
      // the model to perform it is telling it to loop.
      return ask.stale === true
        ? pausedAnswer('approval-no-longer-valid', ask, PAUSED_APPROVAL_STALE_HOWTO)
        : pausedAnswer('approved-not-yet-done', ask, PAUSED_APPROVED_HOWTO);
    }
    return spentAnswer(askId, visited);
  }

  /**
   * A card that has been SPENT: the fire it authorized carries its askId
   * (TransitionRecord.askId, written by the gate as it spends the approval), so
   * the question is forwarded to that fire and answered with ITS settlement. The
   * model asked "did it work" and gets the outcome, not a lecture about ids.
   *
   * EXACTLY ONE, or nothing. A standing ALWAYS ALLOW grant is exercised by many
   * fires under one id, and picking the newest would answer about an action the
   * caller may not have meant — so an ambiguous id falls through to the refusal,
   * which names what IS live rather than guessing which fire was meant.
   *
   * ONE HOP, ENFORCED. The forward re-enters with a TRANSITION id, which the ask
   * book normally cannot match — but "normally" is not a proof: an action named
   * 'ask' mints transition ids in the same `<name>#<n>` grammar the ask counter
   * uses, so the two id spaces really can meet. The `visited` set is the
   * termination argument, in code rather than in a sentence: nothing here is
   * answered twice, whatever the app named its actions.
   */
  function spentAnswer(askId: string, visited: ReadonlySet<string>): ServeResult | undefined {
    const spent = session.transitions().filter((row) => row.askId === askId);
    if (spent.length !== 1) return undefined;
    const forwardTo = spent[0]!.id;
    /* v8 ignore next -- unreachable today: every ok fire leaves either an open latch or a RETAINED settlement, so the forwarded transition id always answers on the second hop and never throws its way back into the ask book. The set is the termination proof for the one graph shape where the two id spaces really can meet (an action named 'ask' mints ids in the ask counter's own grammar) — written in code rather than in a sentence, because that is what makes it hold when either counter changes. */
    if (visited.has(forwardTo)) return undefined;
    return callDidItWork(forwardTo, new Set([...visited, forwardTo]));
  }

  /**
   * One ask-book arm: nothing fired, so there is no settlement to report and no
   * failure to report either.
   *
   * `performed: false` rides here for the same reason it rides the needs-confirm
   * results — it is the same fact, and a consumer branching on it must not have
   * to know which arm produced the payload. It is also what separates this from
   * `still-pending`, whose action WAS fired and is merely unfinished: both carry
   * `settled: false`, and only one of them means nobody has done anything.
   *
   * The action NAME and nothing more. The receipts belong to the ask that minted
   * them; re-serving them here would put the human's card on a second channel,
   * and a payload a model can fetch twice is a payload it can quote as new.
   */
  function pausedAnswer(judgment: string, ask: AskStatus, howToAct: string): ServeResult {
    return {
      ok: true,
      settled: false,
      performed: false,
      judgment,
      askId: ask.askId,
      did: ask.affordanceId,
      howToAct,
      ...positionData(),
    };
  }

  /**
   * Which action a transition id belongs to, for a fire still in flight (the
   * settled arm reads it off the settlement's own record). pending() first
   * because it is the cheap list; the log is the fallback for a fire that
   * declared no writes and therefore never pended.
   */
  function firedAction(transitionId: string): string | undefined {
    const waiting = session.pending().find((entry) => entry.id === transitionId);
    if (waiting) return waiting.affordanceId;
    return session.transitions().find((row) => row.id === transitionId)?.cause.affordanceId;
  }

  // -- result builders (data channel; text = authored strings only) -----------

  function positionData(): ServeResult {
    return { youAreOn: session.node, version: session.version };
  }

  function frameData(journeyId: string): ServeResult {
    const frame = session.journeyFrame();
    /* v8 ignore next 7 -- unreachable from either caller: both reach this builder only after callJourney has PROVEN a frame for this journey is open (it commits one and returns on every refusal), and nothing between there and here can close it — a demotion needs a state change, and handlers are deferred to a microtask. The arm answers for a frame that closed underneath the call, and it reports the closed frame's own status rather than inventing "no frame". */
    if (!frame || frame.journeyId !== journeyId) {
      const closed = session
        .frames()
        .filter((candidate) => candidate.journeyId === journeyId)
        .pop();
      return closed ? { frame: closed.status } : {};
    }
    const plan = session.journeyPlan(journeyId);
    if (plan.steps.every((step) => step.status === 'done' || step.status === 'inferred-done')) {
      session.leaveJourney({ reason: 'completed' });
      // ONE derivation, on this arm too: the frame it just closed is what the
      // standing reads, so this door and `whats_here` cannot say two things
      // about one chain in one state.
      return { frame: 'completed', judgment: 'done', standing: session.journeyStanding(journeyId).standing };
    }
    const rows = session.available().edges;
    const running = runningNow(rows);
    const edges = new Map(rows.map((edge) => [edge.affordanceId, edge]));
    // A step whose fire is still awaiting the app's state report is NOT ready
    // to fire again — advertising it would instruct the model to double-fire.
    const awaiting = new Set(session.pending().map((pendingInfo) => pendingInfo.affordanceId));
    // NOR IS A STEP WHOSE CONTROL THE APP HAS SWITCHED OFF. `journeyPlan` calls
    // it 'ready' because the DECLARED graph is satisfied — its guard holds and
    // the cursor is on its page — and that is a true and useful fact. It is not
    // the same fact as "you can fire this now": the four wires that grey a
    // control (registration, group handle, live store row, `enabledWhen`) are
    // live state the plan does not read. Advertising it here would break the
    // grammar's rule 4 — the instruction below names `readySteps`, and the gate
    // answers a switched-off step with TOOL_DISABLED forever, which is a loop
    // built out of two true sentences, and the exact re-fire loop `unblockedBy`
    // exists to end.
    const fireable = (step: JourneyPlanStep): boolean =>
      step.status === 'ready' &&
      !awaiting.has(step.affordanceId) &&
      edges.get(step.affordanceId)?.enabled !== false;
    // THE READY BUCKET SPLITS THREE WAYS, and a held step is never advertised as
    // fireable. The precedent is `awaitingState` in this same function —
    // "advertising it would instruct the model to double-fire" — and it applies
    // twice over here, because a step listed under `readySteps` IS an
    // instruction to fire it and both of these steps are somebody else's.
    //
    // THE ASK WINS while its card is open: a card is the sharper referent, and
    // the same ordering governs the standing word. Once no card is open,
    // ownership governs again.
    //
    // DISCLOSURE, NOT ENFORCEMENT. `fire()` still accepts every one of these
    // steps, no refusal word exists for either hold, and the model is told what
    // is true rather than stopped at a door the app never declared.
    const openCards = new Map(
      session
        .asks()
        .filter((ask) => ask.answer === undefined)
        .map((ask) => [ask.affordanceId, ask.askId]),
    );
    const decisions = new Map(session.decisions().map((row) => [row.affordanceId, row]));
    const awaitingHuman: ServeResult[] = [];
    const withTheHuman: ServeResult[] = [];
    const ready: JourneyPlanStep[] = [];
    for (const step of plan.steps.filter(fireable)) {
      const askId = openCards.get(step.affordanceId);
      if (askId !== undefined) {
        awaitingHuman.push({ askId, step: step.affordanceId });
        continue;
      }
      const decision = decisions.get(step.affordanceId);
      if (decision !== undefined) {
        withTheHuman.push({
          step: step.affordanceId,
          // The made-state rides as DATA, all three of its answers intact — a
          // `made: true` row stays LISTED, because the step is still the
          // person's and the row itself is the resumption cue. It leaves the
          // list when the step is done, and not before.
          made: decision.made,
          ...(decision.about !== undefined ? { about: decision.about } : {}),
        });
        continue;
      }
      ready.push(step);
    }
    return {
      frame: 'open',
      // ONE derivation for both doors — never re-computed here, so `whats_here`
      // and this tool cannot disagree about one chain. It sits BESIDE `judgment`
      // because the two answer different questions: `judgment` is "what is my
      // move this turn", `standing` is "where does this chain stand".
      standing: session.journeyStanding(journeyId).standing,
      judgment: ready.length === 0 ? 'navigate-or-wait' : ready.length === 1 ? 'one-ready-step' : 'needs-choice',
      ...(awaiting.size > 0 ? { awaitingState: [...awaiting] } : {}),
      ...(awaitingHuman.length > 0 ? { awaitingHuman } : {}),
      ...(withTheHuman.length > 0 ? { withTheHuman, withTheHumanMeans: WITH_THE_HUMAN_MEANS } : {}),
      readySteps: ready.map((step) => {
        const edge = edges.get(step.affordanceId);
        return {
          step: step.affordanceId,
          does: step.description,
          // The SAME claim the action row makes ({@link edgeData}) — a navigating
          // STEP declares no writes either, so a model inside a journey frame read a
          // working link as a dead one for exactly the reason the action row was
          // fixed. This was the last surface still telling the two readers of one
          // edge different things. A CLAIM, said as one: absent when the app
          // declared no destination, never inferred.
          ...(edge?.navigatesTo !== undefined ? { goesTo: edge.navigatesTo } : {}),
          ...(edge?.highEffect ? { highEffect: true } : {}),
          ...(step.guardUnevaluated ? { guardUnevaluated: step.guardUnevaluated } : {}),
          // Declared here but nothing is bound: firing it executes nothing.
          ...(edge?.materialized === false ? { materialized: false } : {}),
          // The app's own words for what this control is doing, on the step row
          // as on the action row. Advisory, not a refusal — it does not move the
          // step out of `readySteps`, it tells the reader why it might wait.
          ...(edge?.busy !== undefined ? { busy: edge.busy } : {}),
          ...expectsData(edge),
        };
      }),
      // Everything the model cannot fire this turn, each with why. A step the
      // plan calls 'ready' whose control is switched off lands here carrying
      // BOTH facts side by side — grammar rule 1: the plan's word is not
      // overwritten, because "the declared graph is satisfied and the app
      // switched the control off" and "the graph does not allow it yet" are
      // different diagnoses demanding different moves, and one word for both
      // would have to be wrong about one of them.
      laterSteps: plan.steps
        .filter((step) => !fireable(step) && !awaiting.has(step.affordanceId))
        .map((step) => {
          const edge = edges.get(step.affordanceId);
          return {
            step: step.affordanceId,
            status: step.status,
            // OWNERSHIP TRAVELS WITH THE STEP, on every rendering of it. A
            // humanDecides step that is blocked or off-page is not "with the
            // human" YET — it is not the person's turn until the step could
            // actually be taken — so it stays here, carrying the stamp, and one
            // story is told about it wherever it is read. Off the PLAN row, not
            // re-derived per rendering.
            ...(step.humanDecides ? { humanDecides: true } : {}),
            ...(edge?.enabled === false ? { enabled: false } : {}),
            // AND THE APP'S OWN REASON, on the journey surface too — for the
            // same reason `unblockedBy` is here: the two readers of one edge
            // must not be told different things about it. A step listed as
            // switched-off with the sentence stripped is the whats_here row
            // minus the one fact that says whether to wait or fetch a person.
            ...(edge?.blockedBecause !== undefined ? { blockedBecause: edge.blockedBecause } : {}),
            // WHAT WOULD FREE IT, on the journey surface too. This is the
            // default surface `mcpServer` wraps; serving the answer only on
            // `whats_here` left the two readers of one edge told different
            // things again, one release after that was fixed.
            ...(edge === undefined ? {} : unblockedByFor(edge, running)),
            ...(edge?.busy !== undefined ? { busy: edge.busy } : {}),
          };
        }),
      howToAct: ready.length > 0 ? PICK_A_READY_STEP_HOWTO : NO_READY_STEP_HOWTO,
    };
  }

  /** The step/action arguments the confirm chain reads, from either door. */
  type ConfirmArgs = { input?: unknown; instance?: string; offerId?: string; acknowledgementId?: string };

  /**
   * Land the ask and assemble the card. The INPUT and INSTANCE go with it, so the
   * receipts say what this fire will send — a human approves an object, not just a
   * verb, and under enforcement that is what the approval binds to.
   */
  function askData(affordanceId: string, args: ConfirmArgs): ServeResult {
    const { askId, receipts } = session.confirmAsk(affordanceId, {
      source,
      // ONLY where it binds something. Under enforcement the input on the card is
      // what the approval is bound to, which is the whole point of putting it
      // there. With the option off it would bind nothing — and it would still put
      // every caller's payload into `receipts.willUse`, into the model's result
      // and into the confirm journal an app exports to its audit sink. A default
      // path that starts carrying user payloads is not a default path that stayed
      // the same, so the option pays for its own cost. An app that wants the card
      // to show the input either way passes `input` to confirmAsk itself.
      ...(sessionEnforces ? { input: args.input } : {}),
      ...(args.instance !== undefined ? { instance: args.instance } : {}),
    });
    return {
      askId,
      receipts,
      howToAct: gated
        ? 'Show the human what this will do (see receipts) and let THEM approve it in the app — then call again with confirm: true. Your confirm: true alone will be refused, because this app requires an approval it recorded from a person. Send decline: true to report that they refused.'
        : 'Show the human what this will do (see receipts), then call again with confirm: true to proceed — or decline: true if they refuse.',
    };
  }

  /**
   * The options one served fire carries — including the POINTER to the recorded
   * decision, when this session enforces one.
   *
   * The model never handles the pointer: it is looked up here, from the ask this
   * port already minted for exactly this action and input. So no model-facing
   * schema property is added, `additionalProperties: false` is untouched, and the
   * tool array stays byte-identical every turn. Two doors (this one and
   * FireOptions.askId for an app driving its own Approve button), one gate.
   */
  function fireOptions(affordanceId: string, args: ConfirmArgs): Parameters<Session['fire']>[1] {
    const askId = gated
      ? session.openAskFor(affordanceId, { input: args.input, ...(args.instance !== undefined ? { instance: args.instance } : {}) })
      : undefined;
    return {
      source,
      payload: args.input,
      ...(args.instance !== undefined ? { instance: args.instance } : {}),
      ...(askId !== undefined ? { askId } : {}),
      // The two citations, threaded verbatim. This layer judges neither: an id
      // it cannot resolve is the session's to refuse, in the session's own
      // words, and a port that pre-screened them would be a second gate to keep
      // in step with the first.
      ...(args.offerId !== undefined ? { offerId: args.offerId } : {}),
      ...(args.acknowledgementId !== undefined ? { acknowledgementId: args.acknowledgementId } : {}),
    };
  }

  /**
   * An agent-relayed decline under enforcement closes NOTHING — so the result says
   * so, rather than letting the model read 'declined' as "the question is gone".
   * Without this sentence an agent could believe it had buried the human's card.
   */
  function relayedDeclineData(declined: { relayed?: true }): ServeResult {
    // Reads the ROW's own marker, never the principal. The principal on a relayed
    // decline is whatever the caller stamped — including 'user' — so inferring
    // "this closed the card" from it would let a port constructed with
    // source:'user' report a human decision the session never recorded.
    return declined.relayed === true
      ? {
          recordedAs: 'your-report',
          why: 'Recorded as your report, not as the human’s decision — the ask is still open. A human’s no arrives through the app’s own Decline control.',
        }
      : {};
  }

  function fireData(
    fired: FireResult,
    id: string,
    edge: AvailableEdge | undefined,
    args?: ConfirmArgs,
  ): ServeResult {
    if (fired.ok) {
      return {
        ok: true,
        did: id,
        settlement: fired.settlement,
        // The planner's copy of the invocation truth. 'settled' only means a
        // commit bundle exists, so without this word a Mode B agent reads a
        // queued handler as a finished one — the hole this fixes was reported
        // from exactly here, the wire, not from the in-process FireResult.
        // Only the word crosses; whenSettled deliberately stays behind.
        effectStatus: fired.effectStatus,
        // The transition id lets a caller fetch producedFor() AFTER awaiting the
        // handler — the "act → data back" channel (the tool result is built
        // synchronously here, before an async handler has produced anything).
        transitionId: fired.transition.id,
        // 'pending' means nobody has done anything YET, and a model told only
        // that has no move: the pointer names the door out (the settlement
        // tool, with this same id). Only on 'pending' — the other three words
        // are final, and pointing at a poll would invite a needless turn.
        //
        // Twice, on purpose: the sentence for the reader, the field for the
        // relay ({@link settleWithData}). Same door, same arm, one of them
        // machine-readable.
        ...(fired.effectStatus === 'pending' ? { howToSettle, ...settleWithData() } : {}),
        // Copy: fired.transition is the LIVE record — a consumer mutating its
        // result must never rewrite the trace.
        ...(fired.transition.guardUnevaluated ? { guardUnevaluated: [...fired.transition.guardUnevaluated] } : {}),
        // Honest no-op (allowUnmaterializedFires tour): nothing ran, nothing is bound.
        ...(fired.executed === false ? { executed: false, materialized: false } : {}),
        // Navigation moved on a CLAIM (effect.navigatesTo), not an app confirmation —
        // youAreOn already shows the claimed position; this flags it as unconfirmed.
        ...(fired.transition.toNodeClaimed ? { toNodeClaimed: true } : {}),
      };
    }
    // A high-effect fire with no approval on record is answered with THE ASK,
    // again — carrying fresh receipts. Enforcement is not a wall the agent
    // bounces off blindly: its only useful next move is to get the human, and
    // this port already knows how to hand it the card. The refusal is still in
    // both ledgers, and `facts` still says the fire did NOT happen.
    if (fired.reason === 'APPROVAL_REQUIRED' && args !== undefined) {
      return {
        ok: false,
        judgment: 'needs-confirm',
        did: id,
        reason: fired.reason,
        // The pause marker, on the third needs-confirm arm. Its `why` stays the
        // enforcement sentence rather than the generic one: it already says both
        // halves of PAUSED_NOTHING_DONE (nothing crossed, confirm: true is not the
        // human's answer) and adds the one thing only this arm knows — that the
        // app requires an approval it recorded from a person.
        performed: false,
        why: APPROVAL_REQUIRED_WHY,
        /* v8 ignore next -- the `{}` arm is unreachable: an APPROVAL_REQUIRED refusal means the fire already got past page, guard, payload shape, greyed-out and materialisation — the same four questions that decide whether a row appears in available() — so this door always has that row in hand. */
        ...(edge ? { does: edge.description } : {}),
        ...askData(id, args),
      };
    }
    return withBusy(edge, {
      ok: false,
      judgment: 'rejected',
      did: id,
      reason: fired.reason,
      ...('evidence' in fired ? { evidence: structuredClone(fired.evidence) } : {}),
      ...('issues' in fired ? { issues: fired.issues } : {}),
      ...('instances' in fired ? { instances: [...fired.instances] } : {}),
      ...('node' in fired ? { node: fired.node } : {}),
      ...('askId' in fired && fired.askId !== undefined ? { askId: fired.askId } : {}),
      /* v8 ignore next -- unreachable for the same reason as the APPROVAL_MISMATCH arm in approvalWhy below: `differs` rides only on that refusal, and this port derives its approval pointer from the very action, input and instance it is about to fire. */
      ...('differs' in fired ? { differs: fired.differs } : {}),
      ...(fired.reason === 'PAYLOAD_INVALID' ? expectsData(edge) : {}),
      ...(fired.reason === 'STILL_MOUNTING' ? { retriable: true } : {}),
      // Switched off is a STATE, and a state can change — so it carries the same
      // marker STILL_MOUNTING does, beside the sentence that stops a reader
      // inventing the cause it was never given. Where the app DECLARED the
      // condition, the conjuncts that failed rode in through the shared
      // `evidence` spread above and this arm adds the clause that says what they
      // are — appended, never replacing the sentence that is true either way.
      // RIDES BESIDE, NEVER INSIDE. The app's own reason joins the refusal as a
      // DATA field, and the authored sentences above it are unchanged to the
      // byte — including "nothing here knows what would change it", which is
      // about what THIS LIBRARY knows and stays true beside anything the app
      // says. Splicing `says` into the `why` would put app text into the one
      // channel that must only ever carry words we wrote.
      ...(fired.reason === 'TOOL_DISABLED'
        ? {
            retriable: true,
            why: fired.evidence === undefined ? DISABLED_WHY : `${DISABLED_WHY} ${DISABLED_EVIDENCE_WHY}`,
            ...(edge?.blockedBecause !== undefined ? { blockedBecause: edge.blockedBecause } : {}),
          }
        : {}),
      // Not retriable — unlike STILL_MOUNTING, nothing is expected to arrive.
      ...(fired.reason === 'NOT_MATERIALIZED' ? { why: NOT_MATERIALIZED_WHY } : {}),
      // The machine-readable half of a freshness or single-flight refusal, beside
      // its sentence: WHICH keys moved on which axis, or WHICH fire is still out
      // there and how to settle it. Names and ids only — the same law the row's
      // own stamps keep, so nothing a value could ride in on crosses here either.
      ...('offerId' in fired ? { offerId: fired.offerId } : {}),
      // WHICH ROW THAT OFFER REALLY NAMES, on the one refusal that knows: an
      // authored action id, so a caller told "wrong row" can see which row it
      // was rather than being sent to re-read everything. Presence-only, like
      // `offerId` above — the field is written by exactly one arm and is never
      // written empty, so there is no second check to make.
      ...('offeredFor' in fired ? { offeredFor: fired.offeredFor } : {}),
      ...('moved' in fired ? { moved: structuredClone(fired.moved) } : {}),
      ...('acknowledgementId' in fired && fired.acknowledgementId !== undefined
        ? { acknowledgementId: fired.acknowledgementId }
        : {}),
      ...('pendingTransitionId' in fired
        ? { pendingTransitionId: fired.pendingTransitionId, scope: fired.scope }
        : {}),
      ...approvalWhy(fired),
      ...freshnessWhy(fired),
      ...policyWhy(fired),
      // The machine-readable half of a principal refusal: the kinds the app
      // NAMED, and the principal that tried. Names only — the same law every
      // other structured half on this result keeps.
      ...('required' in fired ? { required: [...fired.required], attempted: fired.attempted } : {}),
      // …and of an effect-policy refusal: which half is missing, and what the
      // app did declare. Both are the APP's words about its own graph.
      ...('needs' in fired ? { needs: fired.needs } : {}),
      ...('observability' in fired && fired.observability !== undefined
        ? { observability: fired.observability }
        : {}),
    });
  }

  /**
   * The app's "working right now", ON A REFUSAL — the one place the row's third
   * state and a rejection meet.
   *
   * NO NEW REASON WORD, and that is the design rather than a shortcut. Busy does
   * not refuse anything: an app that means "and nobody may press it" disables the
   * control, and the refusal is the `TOOL_DISABLED` that already exists. A
   * `TOOL_BUSY` would be this library inventing a gate the app never declared —
   * and `FireResult.reason` and `GapRecord.rejectionReason` grow in lockstep, so
   * a word minted here would land in the triage ledger as a refusal class an app
   * never asked for.
   *
   * WHAT IT ADDS IS THE FACT AND THE TEACHING, never a verdict: the label as
   * DATA, and one authored sentence. It RIDES ALONGSIDE whatever the refusal
   * already said — the same rule the settlement receipt keeps — because a
   * disabled-and-busy control has had two true things said about it and neither
   * one is the other's cause. Appending is the shape `APPROVAL_MISMATCH` already
   * uses for a second authored clause; the refusal's own `why` is never replaced.
   *
   * Only the REJECTED arm. A needs-confirm result is a person's open question,
   * not a refusal, and its `why` is about what the human has to do. (A greyed
   * control never reaches that arm any more — {@link greyedOut} sends it to
   * `fire()` first — so the two facts about a switched-off busy control now
   * arrive together rather than one of them at the moment a person decides.)
   *
   * READS THE SERVED ROW, which is the base action's — so a `repeats` CARD that
   * the app labelled through its own handle carries no label here, even though
   * the caller named that card by instance. The row's own omission is right (one
   * row stands for many cards); this one is a gap, and it is stated on the busy
   * page under Honest limits rather than reasoned away. Closing it means a
   * per-instance busy door, which is a design decision, not a patch.
   */
  function withBusy(edge: AvailableEdge | undefined, rejected: ServeResult): ServeResult {
    if (edge?.busy === undefined) return rejected;
    const already = rejected['why'];
    return {
      ...rejected,
      busy: edge.busy,
      why: typeof already === 'string' ? `${already} ${BUSY_WHY}` : BUSY_WHY,
    };
  }

  /**
   * The unblocking claims for a row: each entry names an action and the keys it
   * claims to write. Ids only, deliberately — an id carries its node, so a
   * reader can find the action's own row rather than trusting a description
   * copied here, and the list stays token-lean on a hot surface.
   *
   * Only for a control the app has actually switched off. A live control needs
   * no answer to "what would free it", and answering anyway would invite a
   * reader to treat a dependency list as a plan.
   */
  function unblockedByFor(edge: AvailableEdge, running: RunningSet): ServeResult {
    if (edge.enabled !== false) return {};
    const deps = session.whatUnblocks(edge.affordanceId);
    if (deps.length === 0) return {};
    return {
      unblockedBy: deps.map((dep) => ({
        action: dep.affordanceId,
        writes: dep.viaKeys,
        ...(running.has(dep.affordanceId) ? { inFlight: true } : {}),
      })),
    };
  }

  /**
   * WHETHER THE THING THAT WOULD FREE A CONTROL IS ALREADY RUNNING. Two observed
   * signals, never a third guessed one: a fire of that action is awaiting its
   * report (the library's own record), or the app has said it is working
   * (`busy`). An id is in this set only when one of those is true — absence is
   * "nothing here knows", never a cheerful "it is idle".
   *
   * It turns the reader's next move from a question into a fact: the control
   * that frees this one is IN FLIGHT, so the move is to wait, not to re-fire it
   * and not to go hunting for a cause. That is the field incident's exact shape
   * — an upload running, Next greyed, and an agent with no way to tell "working"
   * from "broken".
   *
   * BUILT ONCE PER ANSWER, and passed down. Both halves are properties of the
   * session, not of the row being described, so computing them inside the row
   * builder made one `whats_here` walk every pending fire and every available
   * edge again for each switched-off control on the page — quadratic on the
   * per-turn hot path, for an answer that cannot differ between rows.
   */
  type RunningSet = ReadonlySet<string>;
  function runningNow(rows: readonly AvailableEdge[]): RunningSet {
    const running = new Set(session.pending().map((waiting) => waiting.affordanceId));
    for (const row of rows) if (row.busy !== undefined) running.add(row.affordanceId);
    return running;
  }

  /**
   * THE FACTS A ROW NEEDS AND CANNOT HOLD — session-wide, read ONCE per answer
   * and handed down, for the reason {@link runningNow} states at length: none of
   * them can differ between two rows of the same reply, and re-deriving each one
   * per row walks the whole session per control.
   */
  interface TurnFacts {
    /** What is in flight (see {@link runningNow}). */
    running: RunningSet;
    /**
     * State keys committed since the caller's `sinceVersion`, from the session's
     * own single derivation (`keysChangedSince`) — never a second reading of the
     * commit log here.
     *
     * WITH NO `sinceVersion` THE WINDOW IS THE WHOLE SESSION, which is the same
     * window `brief` and `facts` answer to on that same call. Three fields of
     * one reply keeping two different clocks is precisely the disagreement this
     * layer refuses to author.
     *
     * AND IT IS ASKED FOR THIS PORT'S PRINCIPAL, because "changed" on a served
     * row means CHANGED UNDER YOU. A caller's own committed write is the caller
     * acting, not the world moving beneath it — and once the stamp is carried
     * until answered, serving it back is a loop the caller cannot leave: the act
     * that clears it (firing the control) is the act that re-arms it. Anybody
     * else's write to the same key still lands here, which is the whole feature.
     */
    changed: ReadonlySet<string>;
    /**
     * affordanceId → the transitionId of its most recent fire this session is
     * still holding a latch open for.
     *
     * Most recent because they arrive in fire order and a later one overwrites:
     * asked "is there an unsettled fire of this control?", the useful answer is
     * the one that has just been made, not the oldest one still outstanding.
     */
    unsettled: ReadonlyMap<string, string>;
  }

  /** The open latches, by the action that opened them (see {@link TurnFacts.unsettled}). */
  function unsettledByAction(): ReadonlyMap<string, string> {
    const byAction = new Map<string, string>();
    for (const id of session.awaitingSettlement()) {
      const action = firedAction(id);
      /* v8 ignore next -- unreachable: an open latch is one fire() opened, and fire() pushes the transition naming the action before it opens the latch, so this lookup always answers. It keeps a future latch source from putting `undefined` on a row as if it were an id. */
      if (action === undefined) continue;
      byAction.set(action, id);
    }
    return byAction;
  }

  /** Everything session-wide one `whats_here` answer rests on, read once. */
  function turnFacts(rows: readonly AvailableEdge[], sinceVersion?: number): TurnFacts {
    return {
      running: runningNow(rows),
      changed: new Set(session.keysChangedSince(sinceVersion, { for: source })),
      unsettled: unsettledByAction(),
    };
  }

  /**
   * WHAT THIS CONTROL DEPENDS ON THAT HAS SINCE MOVED — the join the surface
   * could not make.
   *
   * The session has always been able to say a key changed, and the row has
   * always been able to say what a control does. Nothing joined them, so a
   * reader was handed "user push changed: claim.total" in one field and
   * "ledger.settle-claim is available" in another and left to connect the two by
   * eye. Measured, off a real campaign: it did not connect them, on every
   * surface tested.
   *
   * The intersection, and ONLY the intersection: the app's declared
   * {@link Effect.reads} ∩ the keys committed since the caller's last look.
   *
   * WHAT IT DOES NOT SAY. Not that the value differs from the one the caller
   * saw — this compares no values and holds none. Not that firing is wrong; not
   * that anything should be re-read. It is the same class of stamp as `enabled`,
   * `humanDecides` and `busy` beside it: a fact on the row, refusing nothing,
   * with the decision left where it belongs.
   *
   * PRESENCE-ONLY, and silent by default. An app that declares no `reads` serves
   * byte-identical rows; a declared read that nothing has written serves no key.
   * `staleReads: []` would be a claim ("we checked, nothing moved") on every row
   * of every reply, and this library does not manufacture reassurance.
   *
   * AND THE WRITE SIDE, which the read side is silent about by construction.
   * `staleReads` intersects the changed keys with what a control's outcome
   * DEPENDS ON — so a control that simply overwrites a key, correctly declaring
   * no read of it, served bare while somebody else's write of that very key sat
   * in the same reply's brief. Measured, off a real campaign: a person held a
   * room between two turns; the control that holds a room declares as its
   * writes exactly the two keys that person moved; it was served with nothing
   * on it, twice, and a second room was booked. `staleWrites` is `writes ∩
   * changed` — the one intersection nobody was computing, under every law
   * above: key names only, declared by the app, presence-only, refusing
   * nothing. It says someone has written what you are about to write. It does
   * not say who, that your write would be wrong, or that anything is a repeat.
   *
   * CARRIED UNTIL ACKNOWLEDGED, both of them. `changed` is a delta since the
   * caller's last look and that look advances every time it looks, so a stamp
   * described its condition for one turn and then went quiet while the
   * condition held — measured too: present at the turn of the change, absent
   * two turns later with the same version and the same world, and the fire
   * landed on the third. What is served is the window UNION what this session
   * has already said and nobody has answered, and serving it is what puts it on
   * the ledger. It leaves the ledger only for an act the session can witness
   * (`acknowledgeStale`, or an agent fire of that control) — never for another
   * look, which is the defect rather than the fix.
   */
  function staleData(edge: AvailableEdge, changed: ReadonlySet<string>): ServeResult {
    const declared = [...(edge.reads ?? []), ...(edge.writes ?? [])];
    if (declared.length === 0) return {};
    const carried = session.carriedStale(edge.affordanceId);
    const outstanding = (key: string): boolean => changed.has(key) || carried.includes(key);
    const stale = declared.filter(outstanding);
    if (stale.length === 0) return {};
    // Recorded against the row that carries it, so what is carried is what was
    // SAID — and a key a control both reads and writes is one fact on the
    // ledger, served on both halves of the row.
    session.carryStale(edge.affordanceId, stale);
    const reads = edge.reads?.filter(outstanding) ?? [];
    const writes = edge.writes?.filter(outstanding) ?? [];
    return {
      ...(reads.length > 0 ? { staleReads: reads } : {}),
      ...(writes.length > 0 ? { staleWrites: writes } : {}),
    };
  }

  /**
   * A FIRE OF THIS CONTROL HAS NOT COME TO REST — the fact under the advice.
   *
   * The pending fire report tells the model "do not perform the action again",
   * and the very next `whats_here` served the control back with nothing on it to
   * remember that by. So the sentence lived for one turn, in one result, while
   * the row it was about kept looking exactly like a fresh one — and a repeated
   * high-effect fire two turns later was, from the row's side, indistinguishable
   * from a first.
   *
   * IT MUST NOT REFUSE, and does not. Refusing a repeat would be this library
   * deciding that repeating is wrong, and there are legitimate retries — a
   * genuinely lost fire is one, and the caller is the only one who can tell.
   * Mechanism and honesty: state the fact, name the id it is about (so the
   * settlement door can be asked), and leave the decision. Exactly the stance
   * `enabled: false`, `humanDecides` and `busy` take on this same row.
   *
   * The id is one this session minted; no app data crosses. The claim is that
   * the prior fire has not come to rest — which is what the latch knows — and
   * nothing at all about whether it ever will.
   */
  function priorFireData(edge: AvailableEdge, unsettled: ReadonlyMap<string, string>): ServeResult {
    const open = unsettled.get(edge.affordanceId);
    return open === undefined ? {} : { priorFireUnsettled: open };
  }

  /**
   * The authored teaching sentence for the two POLICY refusals this release
   * adds — kept out of `approvalWhy` because neither is about a person's yes,
   * and a function named for approvals answering for them would be the first
   * step toward one word covering both.
   *
   * NEITHER IS RETRIABLE, and the sentences say so in different ways because the
   * next move is different: a principal refusal wants a DIFFERENT ACTOR (ask the
   * person), an effect refusal wants a DIFFERENT GRAPH (tell the developer).
   * Telling a model to try again would send it round a loop nothing in the world
   * can end.
   */
  function policyWhy(fired: Extract<FireResult, { ok: false }>): ServeResult {
    if (fired.reason === 'PRINCIPAL_NOT_ALLOWED') {
      return {
        why:
          fired.required.includes('human') && !fired.required.includes('agent')
            ? PRINCIPAL_HUMAN_ONLY_WHY
            : PRINCIPAL_NOT_ALLOWED_WHY,
      };
    }
    if (fired.reason === 'EFFECT_NOT_VERIFIABLE') return { why: EFFECT_NOT_VERIFIABLE_WHY };
    return {};
  }

  /** The authored teaching sentence for one approval refusal, by reason. */
  function approvalWhy(fired: Extract<FireResult, { ok: false }>): ServeResult {
    switch (fired.reason) {
      /* v8 ignore next 2 -- unreachable: fireData answers an APPROVAL_REQUIRED refusal with the ask ITSELF whenever the call carried arguments, and both of its callers always pass them. This case stands for a caller that fires with none (the parameter is optional), which would otherwise get the one refusal in this family with no teaching at all. */
      case 'APPROVAL_REQUIRED':
        return { why: APPROVAL_REQUIRED_WHY };
      case 'APPROVAL_SPENT':
        return { why: APPROVAL_SPENT_WHY };
      /* v8 ignore next 8 -- unreachable through this port: the askId it presents is looked up from the very action, input and instance the fire then carries (fireOptions → openAskFor), and that lookup already refuses to answer with a card that differs on any of the three — so the gate cannot find a mismatch behind a pointer this port minted. The arm is what an app driving fire() with its own FireOptions.askId gets. */
      case 'APPROVAL_MISMATCH':
        return {
          why:
            fired.differs === 'cannot-judge'
              ? APPROVAL_MISMATCH_WHY + APPROVAL_UNCOMPARABLE_WHY
              : APPROVAL_MISMATCH_WHY,
        };
      case 'APPROVAL_STALE':
        return { why: APPROVAL_STALE_WHY };
      case 'APPROVAL_DECLINED':
        return { why: APPROVAL_DECLINED_WHY };
      case 'APPROVAL_REVOKED':
        return { why: APPROVAL_REVOKED_WHY };
      default:
        return {};
    }
  }

  /**
   * The authored sentence for one freshness or single-flight refusal.
   *
   * A SECOND FUNCTION beside {@link approvalWhy} rather than one bigger switch,
   * because the two families answer different questions — *who said you may* and
   * *is this still the world you planned in* — and a reader tracing one refusal
   * should not have to walk the other family's arms to find it.
   */
  function freshnessWhy(fired: Extract<FireResult, { ok: false }>): ServeResult {
    switch (fired.reason) {
      case 'OFFER_REQUIRED':
        return { why: OFFER_REQUIRED_WHY };
      case 'OFFER_NOT_ON_RECORD':
        // THREE ANSWERS, THREE SENTENCES, because only one of them is the
        // caller's mistake. 'evicted' is this library's own limit and says so;
        // 'other-action' is a row this session really did hand out, one control
        // over; only 'unknown' names an id nobody here ever minted. Telling a
        // caller their honest citation was made up is the failure all three
        // exist to prevent.
        return { why: OFFER_NOT_ON_RECORD_WHY[fired.why] };
      case 'WORLD_MOVED':
        return { why: WORLD_MOVED_WHY };
      case 'ACKNOWLEDGEMENT_REQUIRED':
        return {
          why: fired.why === 'evicted' ? ACKNOWLEDGEMENT_EVICTED_WHY : ACKNOWLEDGEMENT_REQUIRED_WHY,
        };
      case 'ACKNOWLEDGEMENT_STALE':
        return { why: ACKNOWLEDGEMENT_STALE_WHY };
      case 'PRIOR_FIRE_PENDING':
        return { why: PRIOR_FIRE_PENDING_WHY };
      default:
        return {};
    }
  }

  function edgeData(edge: AvailableEdge, turn: TurnFacts): ServeResult {
    return {
      action: edge.affordanceId,
      does: edge.description,
      // What this edge CLAIMS it will move you to, before anything is fired. The
      // human's confirm receipt has always disclosed it (ConfirmWillDo.
      // navigatesTo) and the agent's row did not, so only one of the two readers
      // knew that this edge's success evidence is PAGE MOTION — a navigation
      // declares no writes, so an agent watching the control it clicked sees
      // nothing change and reads a working link as a dead one. A CLAIM, said as
      // one: absent when the app declared no destination, never inferred.
      ...(edge.navigatesTo !== undefined ? { goesTo: edge.navigatesTo } : {}),
      // What the control is HOLDING right now — the draft in the box, before the
      // model asks a human to retype it or invents a value of its own. Present
      // only where the app declared a way to read it: an absent key means the
      // library does not know, never that the box is empty. `null` DOES ride —
      // it is a value the app chose — so the test is against undefined, not
      // truthiness. And it is a reading, not a binding: firing still sends the
      // caller's own input.
      ...(edge.holds !== undefined ? { holds: edge.holds } : {}),
      ...(edge.highEffect ? { highEffect: true } : {}),
      // THE DECISION HERE IS A PERSON'S — on the action row, so a model meets
      // ownership before it reaches rather than after. Presence-only like every
      // other stamp on this row, and it refuses nothing: `do_action` still
      // performs it, and the fire is recorded as the agent's.
      ...(edge.humanDecides ? { humanDecides: true } : {}),
      // WHO MAY PERFORM IT, AND WHOSE CHOICE IT IS — served whether or not this
      // session enforces, because what the app declared is true either way. A
      // model that reads `mayInvoke: ['human']` and hands the job over has saved
      // itself a refusal; one that ignores it meets PRINCIPAL_NOT_ALLOWED where
      // enforcement is on, and is RECORDED acting outside a declared policy
      // where it is not.
      //
      // Two keys, never one: an owner is not a permission (see PrincipalPolicy),
      // and folding them here would teach the conflation the declaration was
      // designed to prevent.
      ...(edge.mayInvoke !== undefined ? { mayInvoke: [...edge.mayInvoke] } : {}),
      ...(edge.decisionOwner !== undefined ? { decisionOwner: edge.decisionOwner } : {}),
      ...(edge.guardUnevaluated ? { guardUnevaluated: edge.guardUnevaluated } : {}),
      // THE GREYED BUTTON, on the agent's row. `available()` has stamped this
      // from all four wires that can say it (registration, the group handle, a
      // live store row, the declared `enabledWhen`) — and this projection, the
      // one surface whose reader cannot see the screen, dropped it. So the
      // agent met disabledness only by firing, and a refusal with no other fact
      // on it is exactly where a relay started inventing causes.
      //
      // PRESENCE-ONLY, like every other stamp on this row: a clickable control
      // serves NO key. `enabled: true` on some rows would make its absence on
      // the rest read as "nobody knows", which is a claim about a session that
      // was never asked.
      ...(edge.enabled === false ? { enabled: false } : {}),
      // THE APP'S OWN REASON IT IS OFF, beside the state — data, like `does` and
      // `holds` above it, and never a sentence this layer builds. It arrives
      // already presence-gated: `available()` reads it only on a switched-off
      // row, so a clickable control cannot carry one, and an app that declares
      // nothing serves the same bytes it always did.
      //
      // `clearedBy` is the half that decides the reader's next turn — wait,
      // interrupt a person, report a validation problem — so it crosses
      // verbatim. This library authors no reading of it.
      ...(edge.blockedBecause !== undefined ? { blockedBecause: edge.blockedBecause } : {}),
      // WHAT WOULD FREE IT — served only on a control that is actually off, and
      // only where the app's OWN declarations answer: an action whose `writes`
      // touch a key this one waits on. Derived, never authored (session
      // .whatUnblocks), so it cannot drift from the graph.
      //
      // The field incident this exists for: an agent met a greyed control, was
      // told only that it was greyed, and re-fired it in a loop to find out what
      // would change — then reported the app broken. `enabled: false` says a
      // control is off; this says what the app itself claims would turn it on.
      //
      // A CLAIM, NOT A PROMISE, and silence rather than a guess: where nothing
      // declares a write for the keys it waits on, the key is absent and the row
      // says nothing — the same absence law every other stamp here obeys.
      ...unblockedByFor(edge, turn.running),
      // WHAT THIS CONTROL DEPENDS ON — AND WHAT IT WOULD OVERWRITE — THAT HAS
      // MOVED SINCE YOU LOOKED AND YOU HAVE NOT ANSWERED, and whether one of
      // your own fires of it is still out there. All facts about this row that
      // only the session knows; none of them refuses anything.
      ...staleData(edge, turn.changed),
      ...priorFireData(edge, turn.unsettled),
      // THE NAME OF THIS ROW, and only where a fire will be asked for it. An
      // offer is minted for every row (it is identity, not enforcement), but a
      // model that can never be asked to cite one should not pay tokens to carry
      // it — so this is presence-gated on the session's own answer, and a session
      // enforcing nothing serves the bytes it always served.
      ...(edge.mustCiteOffer && edge.offerRef ? { offerId: edge.offerRef.offerId } : {}),
      // THE SPINNER IN THE BUTTON, on the agent's row — the app's own words for
      // what it is doing, before anything is reached for. Data, like `holds` and
      // `does` above it: the label is the app's, and no sentence here is built
      // out of it. Presence-only for the same reason `enabled` is: an app that
      // never wired this says nothing about any control, and a manufactured
      // "not busy" would be a claim about a session nobody asked.
      ...(edge.busy !== undefined ? { busy: edge.busy } : {}),
      // Nothing is bound to execute this one — visible BEFORE the agent fires it.
      ...(edge.materialized === false ? { materialized: false } : {}),
      ...(edge.instances ? { instances: edge.instances, enumeration: edge.enumeration } : {}),
      ...(edge.activation && edge.activation !== 'registered' && edge.activation !== 'synced'
        ? { activation: edge.activation }
        : {}),
      // The input contract, BEFORE the model fires. Without it a do_action
      // caller could only learn the shape by guessing wrong once — and for a
      // plain JSON Schema (unenforced until 0.4.0) not even then.
      ...expectsData(edge),
    };
  }

  /**
   * The step's expected input, rendered as DATA in the result (never as tool
   * schema). The derivation moved to the edge itself — one contract, computed
   * once, so this surface and `available()` can never teach two shapes for the
   * same action. Absent stays absent: no contract declared, nothing advertised.
   */
  function expectsData(edge: AvailableEdge | undefined): ServeResult {
    return edge?.expects === undefined ? {} : { expects: edge.expects };
  }

  return {
    tools: () => structuredClone(staticTools),
    call(name: string, args?: unknown): ServeResult {
      const parsed = (args ?? {}) as Record<string, unknown>;
      const stepArgs = (): JourneyCallArgs => ({
        step: typeof parsed['step'] === 'string' ? parsed['step'] : undefined,
        input: parsed['input'],
        confirm: parsed['confirm'] === true,
        decline: parsed['decline'] === true,
        instance: typeof parsed['instance'] === 'string' ? parsed['instance'] : undefined,
        offerId: typeof parsed['offerId'] === 'string' ? parsed['offerId'] : undefined,
        acknowledgementId:
          typeof parsed['acknowledgementId'] === 'string' ? parsed['acknowledgementId'] : undefined,
      });
      const journeyId = journeyToolNames.get(name);
      if (journeyId !== undefined) {
        return callJourney(journeyId, stepArgs());
      }
      if (journeyToolMode === 'single' && name === singleJourneyName) {
        const asked = parsed['journey'];
        if (typeof asked !== 'string' || !asked) {
          return { ok: false, judgment: 'error', reason: 'JOURNEY_REQUIRED' };
        }
        // RESOLVED HERE, so `callJourney` keeps the invariant it was written
        // under: only a DECLARED journey id ever reaches it (and its
        // step resolver). The refusal is scoped like the list it points at —
        // naming all 57 ids on an error path would put back the bytes this mode
        // exists to remove — and it discloses the omission the same way.
        if (!declaredJourneyIds.has(asked)) {
          const scoped = journeysHere();
          return {
            ok: false,
            judgment: 'error',
            reason: 'UNKNOWN_JOURNEY',
            journey: asked,
            journeys: scoped.here.map((journey) => journey.id),
            ...elsewhereData(scoped.elsewhere),
            ...positionData(),
          };
        }
        return callJourney(asked, stepArgs());
      }
      if (name === whatsHereName) {
        return callWhatsHere(
          typeof parsed['sinceVersion'] === 'number' ? parsed['sinceVersion'] : undefined,
          typeof parsed['routeTo'] === 'string' ? parsed['routeTo'] : undefined,
        );
      }
      if (name === whyName) {
        if (typeof parsed['key'] !== 'string' || !parsed['key']) {
          return { ok: false, judgment: 'error', reason: 'KEY_REQUIRED' };
        }
        // The slice text is DATA (it can carry committed state values) — it
        // rides the result channel like producedFor(), never a description.
        return { ok: true, key: parsed['key'], why: session.why(parsed['key']), ...positionData() };
      }
      if (name === didItWorkName) {
        if (typeof parsed['transitionId'] !== 'string' || !parsed['transitionId']) {
          return { ok: false, judgment: 'error', reason: 'TRANSITION_ID_REQUIRED' };
        }
        return callDidItWork(parsed['transitionId']);
      }
      if (name === doActionName) {
        if (typeof parsed['action'] !== 'string' || !parsed['action']) {
          return { ok: false, judgment: 'error', reason: 'ACTION_REQUIRED' };
        }
        return callDoAction({
          action: parsed['action'],
          input: parsed['input'],
          confirm: parsed['confirm'] === true,
          decline: parsed['decline'] === true,
          instance: typeof parsed['instance'] === 'string' ? parsed['instance'] : undefined,
          offerId: typeof parsed['offerId'] === 'string' ? parsed['offerId'] : undefined,
          acknowledgementId:
            typeof parsed['acknowledgementId'] === 'string' ? parsed['acknowledgementId'] : undefined,
        });
      }
      return { ok: false, judgment: 'error', reason: 'UNKNOWN_TOOL', tools: staticTools.map((tool) => tool.name) };
    },
    // Straight delegation — the port owns no settlement state of its own, so
    // there is nothing here that could drift from the session's answer.
    whenSettled: (transitionId: string) => session.settlementOf(transitionId),
    // The POLL beside the wait, and the same builder `did_it_work` answers
    // from — so a folded result and a later poll cannot say two things about
    // one fire. `settlementIfKnown` keeps both of its own laws on the way
    // through: undefined while the question is open, a throw on an id that can
    // never have an answer.
    settledAnswer(transitionId: string): ServeResult | undefined {
      const settled = session.settlementIfKnown(transitionId);
      // ONE ID, TWO OBJECTS — refused HERE too, and for the reason the whole
      // door exists: the two doors must not answer differently about one id.
      // `did_it_work` refuses an id this session minted for BOTH a fire and a
      // human's card (AMBIGUOUS_ID), and a builder that answered it confidently
      // would be exactly the wrong-answer class that refusal was written to
      // prevent — a settled fire reported as the fate of someone's open card.
      // Checked AFTER the call above so a plain askId still gets
      // `settlementIfKnown`'s own teaching refusal (nothing fired, so there is
      // no transition) rather than an ambiguity that is not there.
      if (session.asks().some((row) => row.askId === transitionId)) {
        // A THROW, which is arm three of this door's contract, not a new one:
        // no envelope exists here to carry `ok: false`, and the alternative —
        // `undefined` — is this door's word for "still in flight", which would
        // be a second wrong answer on top of the first. The sentence is the one
        // `did_it_work` serves, so both doors teach the app team the same fix.
        throw new Error(`hcifootprint: ${AMBIGUOUS_ID_WHY}`);
      }
      return settled === undefined ? undefined : settledFacts(transitionId, settled);
    },
  };
}

function sanitizeName(name: string): string {
  return encodeToolName(name);
}
