/**
 * Mode B — skills as FIXED tools (the default serving mode, D18 §7).
 *
 * The tool array an LLM sees contains ONE tool per skill plus three fixed
 * generics (whats_here, do_action, why) and NEVER changes for the life of a
 * conversation. Disclosure rides the RESULT channel: every call returns
 * readySteps — what is fireable at the current navigation cursor, right now —
 * and the model acts by calling the SAME skill tool again with {step}.
 * Between-turn grounding rides the same channel: whats_here accepts
 * {sinceVersion} and narrates only the delta (who did what since the model's
 * last look), and `why` serves the causal backward slice for a state key —
 * the mixed-initiative attribution query.
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
 * availableSkills / skillPlan / frames / fire / explain / contextBrief) — it is a pure
 * projection, independently testable, swappable per conversation. One
 * conversation = one mode (a mid-conversation mode flip is a tool-set change
 * = a full cache bust).
 *
 * Two-string-class invariant: every text field in tools AND results is either
 * an authored description or a fixed authored-constant sentence. Runtime
 * values (state, payloads, instance keys, evidence) are structured DATA fields.
 */
import type { MCPToolDescription } from 'footprintjs';
import type {
  AskStatus,
  AvailableEdge,
  Explanation,
  FireResult,
  FireSettlement,
  Principal,
} from '../atom/types.js';
import type { Session } from '../traverse/session.js';
import { errorText } from './error-text.js';

export interface SkillToolsOptions {
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
}

export interface SkillCallArgs {
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
}

/** Results are plain data objects — serialize one as the tool_result body. */
export type ServeResult = Record<string, unknown>;

export interface SkillToolsPort {
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
   * OPTIONAL here and REQUIRED on {@link SkillToolsPortWithSettlement}, which is
   * what {@link skillsAsTools} hands back — so a caller holding a built port
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
   * result of the call that fired (see {@link SkillToolsPort.whenSettled} for
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
   * `stillWorking`, `stillWorkingMeans`, and `howToAct` on a moved outcome) —
   * absent when unknown, never filled in. A LIST IS A THING THAT GOES STALE, so
   * the one a remote host reads is checked against a real answer by a test
   * rather than kept in step by hand.
   *
   * OPTIONAL here and REQUIRED on {@link SkillToolsPortWithSettlement}, for the
   * reason stated above: this interface is PUBLISHED, and an object literal
   * written against an earlier release must keep compiling.
   */
  settledAnswer?(transitionId: string): ServeResult | undefined;
}

/**
 * What {@link skillsAsTools} returns: a port whose settlement doors are always
 * there. Name the type only if you are storing the port somewhere typed — the
 * factory's inferred return already has them.
 */
export interface SkillToolsPortWithSettlement extends SkillToolsPort {
  whenSettled(transitionId: string): Promise<FireSettlement>;
  settledAnswer(transitionId: string): ServeResult | undefined;
}

const SKILL_USAGE =
  ' Call with no arguments to open this skill and see its ready steps; call again with' +
  " {step: '<name from readySteps>', input: {...}} to perform a step. A high-effect step first returns" +
  ' needs-confirm WITH receipts (what it will do and why): show the human, then call again with' +
  ' confirm: true to proceed — or decline: true if they refuse. Steps arrive as DATA in results —' +
  ' they are never separate tools.';

const WHATS_HERE_DESCRIPTION =
  'Describe the current position: the page, the open skill (if any), what happened recently, ' +
  'and the actions and skills available right now. The reply also carries facts — the app’s ' +
  'own authoritative record of what has actually been done and what was refused. Call this ' +
  'whenever you are unsure whether something has already happened; trust facts over your own ' +
  'account of the conversation. Pass sinceVersion (the version from any earlier result) to get ' +
  'only what changed since your last look — including what the user did themselves in the meantime.';

const DO_ACTION_DESCRIPTION =
  'Perform one available action outside any skill flow. Call whats_here first to see action names. ' +
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

// The five requireHumanApproval refusals, in the NOT_MATERIALIZED_WHY shape: name
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

export function skillsAsTools(
  session: Session,
  opts?: SkillToolsOptions,
): SkillToolsPortWithSettlement {
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

  /** The arguments do_action shares with a skill step — everything but `step`. */
  function sharedStepProperties(): Record<string, unknown> {
    const { step: _step, ...shared } = stepSchema().properties;
    return shared;
  }

  // Skills are declared-only data: the tool array derived from them is static
  // BY CONSTRUCTION — freeze it once, serve identical bytes every turn.
  const declaredSkills = session.availableSkills().skills;
  const skillToolNames = new Map<string, string>(); // tool name → skill id
  for (const skill of declaredSkills) {
    skillToolNames.set(sanitizeName(`${graphId}.skill.${skill.id}`), skill.id);
  }
  const skillSteps = new Map(declaredSkills.map((skill) => [skill.id, [...skill.steps]]));
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

  const staticTools: MCPToolDescription[] = [
    ...declaredSkills.map(
      (skill) =>
        ({
          name: sanitizeName(`${graphId}.skill.${skill.id}`),
          description: skill.description + SKILL_USAGE,
          inputSchema: stepSchema(),
        }) as MCPToolDescription,
    ),
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
          // The four shared arguments, taken from the SAME rendered schema a skill
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

  function callSkill(skillId: string, args: SkillCallArgs): ServeResult {
    // Cross-skill switch is implicit — but NEVER destructive-first: the open
    // frame is left only after the target skill is known to be openable, so a
    // blocked target cannot cost the model its current flow.
    const openFrame = session.skillFrame();
    if (openFrame && openFrame.skillId !== skillId) {
      const target = session.availableSkills().skills.find((skill) => skill.id === skillId);
      if (target && !target.preconditionPassed) {
        return {
          ok: false,
          judgment: 'blocked',
          skill: skillId,
          why: 'This skill’s precondition does not hold right now. Your current skill is still open.',
          evidence: structuredClone(target.evidence),
          keptFrame: openFrame.skillId,
          ...positionData(),
        };
      }
      session.leaveSkill();
    }
    if (!session.skillFrame()) {
      const committed = session.commitSkill(skillId, { source });
      if (!committed.ok) {
        if (committed.reason === 'PRECONDITION_FAILED') {
          return {
            ok: false,
            judgment: 'blocked',
            skill: skillId,
            why: 'This skill’s precondition does not hold right now.',
            evidence: structuredClone(committed.evidence),
            ...positionData(),
          };
        }
        return { ok: false, judgment: 'error', skill: skillId, reason: committed.reason, ...positionData() };
      }
    }

    if (args.step === undefined) {
      return { ok: true, skill: skillId, ...frameData(skillId), ...positionData() };
    }

    const stepId = resolveStep(skillId, args.step);
    if (!stepId) {
      return {
        ok: false,
        judgment: 'error',
        skill: skillId,
        reason: 'UNKNOWN_STEP',
        steps: [...(skillSteps.get(skillId) ?? [])],
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
          skill: skillId,
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
        skill: skillId,
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
      skill: skillId,
      ...frameData(skillId),
      ...fireData(fired, stepId, edge, args),
      ...positionData(),
    };
  }

  function resolveStep(skillId: string, step: string): string | null {
    const steps = skillSteps.get(skillId) ?? [];
    if (steps.includes(step)) return step;
    const matches = steps.filter((candidate) => candidate.endsWith(`.${step}`));
    return matches.length === 1 ? matches[0] : null;
  }

  function callWhatsHere(sinceVersion?: number): ServeResult {
    const since = sinceVersion === undefined ? undefined : { sinceVersion };
    const brief = session.contextBrief(since);
    return {
      ok: true,
      // FIRST, and on the call a model already makes. The field failure was a
      // model narrating a flow it had never performed — its own prose competing
      // with the app for authority and winning. This block says which source
      // wins, and lists the refusals the brief structurally cannot show (a
      // refused fire is a gap row, not a transition).
      facts: session.groundTruth(since).text,
      brief: brief.text,
      actions: session.available().edges.map(edgeData),
      skills: session.availableSkills().skills.map((skill) => ({
        skill: skill.id,
        does: skill.description,
        feasible: skill.preconditionPassed,
        ...(skill.preconditionUnevaluable ? { feasibilityUnknownFor: skill.preconditionUnevaluable } : {}),
      })),
      ...positionData(),
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
    return edge.enabled === false;
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

  function frameData(skillId: string): ServeResult {
    const frame = session.skillFrame();
    if (!frame || frame.skillId !== skillId) {
      const closed = session
        .frames()
        .filter((candidate) => candidate.skillId === skillId)
        .pop();
      return closed ? { frame: closed.status } : {};
    }
    const plan = session.skillPlan(skillId);
    if (plan.steps.every((step) => step.status === 'done' || step.status === 'inferred-done')) {
      session.leaveSkill({ reason: 'completed' });
      return { frame: 'completed', judgment: 'done' };
    }
    const edges = edgeById();
    // A step whose fire is still awaiting the app's state report is NOT ready
    // to fire again — advertising it would instruct the model to double-fire.
    const awaiting = new Set(session.pending().map((pendingInfo) => pendingInfo.affordanceId));
    const ready = plan.steps.filter((step) => step.status === 'ready' && !awaiting.has(step.affordanceId));
    return {
      frame: 'open',
      judgment: ready.length === 0 ? 'navigate-or-wait' : ready.length === 1 ? 'one-ready-step' : 'needs-choice',
      ...(awaiting.size > 0 ? { awaitingState: [...awaiting] } : {}),
      readySteps: ready.map((step) => {
        const edge = edges.get(step.affordanceId);
        return {
          step: step.affordanceId,
          does: step.description,
          ...(edge?.highEffect ? { highEffect: true } : {}),
          ...(step.guardUnevaluated ? { guardUnevaluated: step.guardUnevaluated } : {}),
          // Declared here but nothing is bound: firing it executes nothing.
          ...(edge?.materialized === false ? { materialized: false } : {}),
          ...expectsData(edge),
        };
      }),
      laterSteps: plan.steps
        .filter((step) => step.status !== 'ready')
        .map((step) => ({ step: step.affordanceId, status: step.status })),
      howToAct: 'Call this tool again with step set to one of readySteps.',
    };
  }

  /** The step/action arguments the confirm chain reads, from either door. */
  type ConfirmArgs = { input?: unknown; instance?: string };

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
        ...(fired.effectStatus === 'pending' ? { howToSettle } : {}),
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
      ...('differs' in fired ? { differs: fired.differs } : {}),
      ...(fired.reason === 'PAYLOAD_INVALID' ? expectsData(edge) : {}),
      ...(fired.reason === 'STILL_MOUNTING' ? { retriable: true } : {}),
      // Switched off is a STATE, and a state can change — so it carries the same
      // marker STILL_MOUNTING does, beside the sentence that stops a reader
      // inventing the cause it was never given.
      ...(fired.reason === 'TOOL_DISABLED' ? { retriable: true, why: DISABLED_WHY } : {}),
      // Not retriable — unlike STILL_MOUNTING, nothing is expected to arrive.
      ...(fired.reason === 'NOT_MATERIALIZED' ? { why: NOT_MATERIALIZED_WHY } : {}),
      ...approvalWhy(fired),
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

  /** The authored teaching sentence for one approval refusal, by reason. */
  function approvalWhy(fired: Extract<FireResult, { ok: false }>): ServeResult {
    switch (fired.reason) {
      case 'APPROVAL_REQUIRED':
        return { why: APPROVAL_REQUIRED_WHY };
      case 'APPROVAL_SPENT':
        return { why: APPROVAL_SPENT_WHY };
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
      default:
        return {};
    }
  }

  function edgeData(edge: AvailableEdge): ServeResult {
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
      const skillId = skillToolNames.get(name);
      if (skillId !== undefined) {
        return callSkill(skillId, {
          step: typeof parsed['step'] === 'string' ? parsed['step'] : undefined,
          input: parsed['input'],
          confirm: parsed['confirm'] === true,
          decline: parsed['decline'] === true,
          instance: typeof parsed['instance'] === 'string' ? parsed['instance'] : undefined,
        });
      }
      if (name === whatsHereName) {
        return callWhatsHere(typeof parsed['sinceVersion'] === 'number' ? parsed['sinceVersion'] : undefined);
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
  return name.replace(/[^A-Za-z0-9_.-]/g, '_');
}
