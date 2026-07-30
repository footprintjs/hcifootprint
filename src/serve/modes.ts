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
import type { AvailableEdge, Explanation, FireResult, FireSettlement, Principal } from '../atom/types.js';
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
}

/**
 * What {@link skillsAsTools} returns: a port whose settlement door is always
 * there. Name the type only if you are storing the port somewhere typed — the
 * factory's inferred return already has it.
 */
export interface SkillToolsPortWithSettlement extends SkillToolsPort {
  whenSettled(transitionId: string): Promise<FireSettlement>;
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
  'Find out how an action you already performed came to rest — whether the app actually did it. ' +
  'Pass the transitionId from that action’s result. This answers immediately either way: the final ' +
  'outcome, or that the app has not finished yet (call again). Use it whenever a result came back ' +
  'with effectStatus "pending".';

const STILL_PENDING_HOWTO =
  'The app has not finished this action yet, so there is no outcome to report. Do NOT perform the ' +
  'action again — call this tool again with the same transitionId, or call whats_here to see where ' +
  'things stand.';

const OUTCOME_MOVED_HOWTO =
  'This is the receipt from when the action came to rest — the app has moved it since (see ' +
  'outcomeNow). Do NOT act on outcome alone: call whats_here to see where things actually stand.';

const NOT_MATERIALIZED_WHY =
  'Nothing in the app is wired to execute this action yet — firing it would do nothing. ' +
  'Tell the human it is not available; the app team can register a tool group to wire it, ' +
  'or create the session with allowUnmaterializedFires for read-only touring.';

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
            description: 'The transitionId carried by the result of the action you performed.',
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
    if (askBeforeHighEffect && edge?.highEffect && args.confirm !== true) {
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
    if (askBeforeHighEffect && edge.highEffect && args.confirm !== true) {
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
   * Three arms, no fourth: settled (the final word), still-pending (honest,
   * immediate), unknown (refused in the UpdateResult vocabulary the rest of
   * the library already teaches with).
   */
  function callDidItWork(transitionId: string): ServeResult {
    let settled: FireSettlement | undefined;
    try {
      settled = session.settlementIfKnown(transitionId);
    } catch {
      // The session refuses an id no settlement can ever exist for. Over the
      // wire a throw is not an answer, so it becomes a typed result carrying
      // TWO lists, side by side, neither standing in for the other:
      //
      //   pending            — fires awaiting the app's STATE report. The exact
      //                        meaning updateState()'s own UNKNOWN_TRANSITION
      //                        carries, kept identical so one word does not
      //                        mean two things across the library.
      //   awaitingSettlement — fires this tool can still be asked about.
      //
      // The second is the one the model's question is actually about, and it is
      // the SUPERSET: a fire declaring no writes never joins `pending` while
      // its handler runs, so `pending` alone answered "[]" — "nothing is live" —
      // about an action that was at that moment running. That is the same
      // confident-emptiness this tool exists to end, and it left the wire
      // teaching strictly less than the in-process throw, which has always
      // named the open latches.
      return {
        ok: false,
        judgment: 'error',
        reason: 'UNKNOWN_TRANSITION',
        pending: session.pending().map((waiting) => waiting.id),
        awaitingSettlement: session.awaitingSettlement(),
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
        ...positionData(),
      };
    }
    const data = session.producedFor(transitionId);
    const writes = settled.transition.effectVerified;
    // A settlement is a RECEIPT of how the fire came to rest, and first
    // settlement wins — so the record can move on afterwards while the receipt
    // stands (a server rejecting an order the app already reported flips it to
    // 'rolled-back'). This tool's own question is "did the app actually do it",
    // so serving the receipt alone would answer "it worked" about something the
    // app has since undone — a fact the session is holding right there. The
    // later word rides ALONGSIDE, never over: the receipt is not rewritten, and
    // it appears only when the two genuinely disagree.
    const outcomeNow = session.transitions().find((row) => row.id === transitionId)?.outcome;
    const moved = outcomeNow !== undefined && outcomeNow !== settled.outcome;
    return {
      ok: true,
      settled: true,
      ...(settled.transition.cause.affordanceId !== undefined
        ? { did: settled.transition.cause.affordanceId }
        : {}),
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
      ...(settled.transition.toNode !== undefined ? { toNode: settled.transition.toNode } : {}),
      // Capped TEXT: an app's error object never crosses a result whole.
      ...(settled.error !== undefined ? { error: errorText(settled.error) } : {}),
      ...(data !== undefined ? { data } : {}),
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
        why: APPROVAL_REQUIRED_WHY,
        ...(edge ? { does: edge.description } : {}),
        ...askData(id, args),
      };
    }
    return {
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
      // Not retriable — unlike STILL_MOUNTING, nothing is expected to arrive.
      ...(fired.reason === 'NOT_MATERIALIZED' ? { why: NOT_MATERIALIZED_WHY } : {}),
      ...approvalWhy(fired),
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
      ...(edge.highEffect ? { highEffect: true } : {}),
      ...(edge.guardUnevaluated ? { guardUnevaluated: edge.guardUnevaluated } : {}),
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
  };
}

function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]/g, '_');
}
