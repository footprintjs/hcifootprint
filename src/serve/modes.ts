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
 * availableSkills / skillPlan / frames / fire / contextBrief) — it is a pure
 * projection, independently testable, swappable per conversation. One
 * conversation = one mode (a mid-conversation mode flip is a tool-set change
 * = a full cache bust).
 *
 * Two-string-class invariant: every text field in tools AND results is either
 * an authored description or a fixed authored-constant sentence. Runtime
 * values (state, payloads, instance keys, evidence) are structured DATA fields.
 */
import type { MCPToolDescription } from 'footprintjs';
import { detectSchema } from 'footprintjs';
import { normalizeSchema } from 'footprintjs/advanced';
import type { AvailableEdge, FireResult, Principal } from '../atom/types.js';
import type { Session } from '../traverse/session.js';

export interface SkillToolsOptions {
  /** Require confirm:true before firing high-effect steps/actions. Default true. */
  confirmHighEffect?: boolean;
  /** Principal stamped on fires made through this port. Default 'agent'. */
  source?: Principal;
}

export interface SkillCallArgs {
  step?: string;
  input?: unknown;
  confirm?: boolean;
  /** Instance key for steps on repeats containers (from `instances` in results). */
  instance?: string;
}

export interface DoActionArgs {
  action: string;
  input?: unknown;
  confirm?: boolean;
  instance?: string;
}

/** Results are plain data objects — serialize one as the tool_result body. */
export type ServeResult = Record<string, unknown>;

export interface SkillToolsPort {
  /** The STATIC tool array — identical bytes for the life of the conversation. */
  tools(): MCPToolDescription[];
  /** Route a tool_use by name. Unknown names return a structured error result. */
  call(name: string, args?: unknown): ServeResult;
}

const SKILL_USAGE =
  ' Call with no arguments to open this skill and see its ready steps; call again with' +
  " {step: '<name from readySteps>', input: {...}} to perform a step. High-effect steps additionally" +
  ' need confirm: true. Steps arrive as DATA in results — they are never separate tools.';

const WHATS_HERE_DESCRIPTION =
  'Describe the current position: the page, the open skill (if any), what happened recently, ' +
  'and the actions and skills available right now. Pass sinceVersion (the version from any ' +
  'earlier result) to get only what changed since your last look — including what the user ' +
  'did themselves in the meantime.';

const DO_ACTION_DESCRIPTION =
  'Perform one available action outside any skill flow. Call whats_here first to see action names. ' +
  'High-effect actions additionally need confirm: true.';

const WHY_DESCRIPTION =
  'Explain why a state key currently holds its value: the causal chain of session actions — and ' +
  'who fired each one — that produced it. Pass a state key name seen in results or guards.';

const STEP_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    step: { type: 'string', description: 'A step name taken from readySteps in a previous result.' },
    input: { type: 'object', description: 'The step input. Each result states what the next step expects.' },
    confirm: { type: 'boolean', description: 'Required true for high-effect steps.' },
    instance: {
      type: 'string',
      description: 'Which instance to act on, when the step lists instances (e.g. an order id).',
    },
  },
  additionalProperties: false,
};

export function skillsAsTools(session: Session, opts?: SkillToolsOptions): SkillToolsPort {
  const confirmHighEffect = opts?.confirmHighEffect ?? true;
  const source: Principal = opts?.source ?? 'agent';
  const graphId = session.graphId;

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

  const staticTools: MCPToolDescription[] = [
    ...declaredSkills.map(
      (skill) =>
        ({
          name: sanitizeName(`${graphId}.skill.${skill.id}`),
          description: skill.description + SKILL_USAGE,
          inputSchema: structuredClone(STEP_INPUT_SCHEMA),
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
          input: structuredClone(STEP_INPUT_SCHEMA.properties.input),
          confirm: structuredClone(STEP_INPUT_SCHEMA.properties.confirm),
          instance: structuredClone(STEP_INPUT_SCHEMA.properties.instance),
        },
        required: ['action'],
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
    if (confirmHighEffect && edge?.highEffect && args.confirm !== true) {
      return {
        ok: false,
        judgment: 'needs-confirm',
        skill: skillId,
        step: stepId,
        does: edge.description,
        howToAct: 'Ask the human, then call again with confirm: true.',
        ...positionData(),
      };
    }
    const fired = session.fire(stepId, { source, payload: args.input, instance: args.instance });
    // frameData FIRST: on a rejected fire, fireData's judgment ('rejected')
    // must win over the frame's ('needs-choice'); on success fireData carries
    // no judgment and the frame's stands.
    return { skill: skillId, ...frameData(skillId), ...fireData(fired, stepId, edge), ...positionData() };
  }

  function resolveStep(skillId: string, step: string): string | null {
    const steps = skillSteps.get(skillId) ?? [];
    if (steps.includes(step)) return step;
    const matches = steps.filter((candidate) => candidate.endsWith(`.${step}`));
    return matches.length === 1 ? matches[0] : null;
  }

  function callWhatsHere(sinceVersion?: number): ServeResult {
    const brief = session.contextBrief(sinceVersion === undefined ? undefined : { sinceVersion });
    return {
      ok: true,
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
        ...positionData(),
      };
    }
    const edge = matches[0];
    if (confirmHighEffect && edge.highEffect && args.confirm !== true) {
      return {
        ok: false,
        judgment: 'needs-confirm',
        action: edge.affordanceId,
        does: edge.description,
        howToAct: 'Ask the human, then call again with confirm: true.',
        ...positionData(),
      };
    }
    const fired = session.fire(edge.affordanceId, { source, payload: args.input, instance: args.instance });
    return { ...fireData(fired, edge.affordanceId, edge), ...positionData() };
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
          ...expectsData(edge?.schema),
        };
      }),
      laterSteps: plan.steps
        .filter((step) => step.status !== 'ready')
        .map((step) => ({ step: step.affordanceId, status: step.status })),
      howToAct: 'Call this tool again with step set to one of readySteps.',
    };
  }

  function fireData(fired: FireResult, id: string, edge: AvailableEdge | undefined): ServeResult {
    if (fired.ok) {
      return {
        ok: true,
        did: id,
        settlement: fired.settlement,
        // The transition id lets a caller fetch producedFor() AFTER awaiting the
        // handler — the "act → data back" channel (the tool result is built
        // synchronously here, before an async handler has produced anything).
        transitionId: fired.transition.id,
        // Copy: fired.transition is the LIVE record — a consumer mutating its
        // result must never rewrite the trace.
        ...(fired.transition.guardUnevaluated ? { guardUnevaluated: [...fired.transition.guardUnevaluated] } : {}),
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
      ...(fired.reason === 'PAYLOAD_INVALID' ? expectsData(edge?.schema) : {}),
      ...(fired.reason === 'STILL_MOUNTING' ? { retriable: true } : {}),
    };
  }

  function edgeData(edge: AvailableEdge): ServeResult {
    return {
      action: edge.affordanceId,
      does: edge.description,
      ...(edge.highEffect ? { highEffect: true } : {}),
      ...(edge.guardUnevaluated ? { guardUnevaluated: edge.guardUnevaluated } : {}),
      ...(edge.instances ? { instances: edge.instances, enumeration: edge.enumeration } : {}),
      ...(edge.activation && edge.activation !== 'registered' && edge.activation !== 'synced'
        ? { activation: edge.activation }
        : {}),
    };
  }

  /** The step's expected input, rendered as DATA in the result (never as tool schema). */
  function expectsData(schema: unknown): ServeResult {
    if (schema === undefined) return {};
    const kind = detectSchema(schema);
    if (kind === 'zod') return { expects: normalizeSchema(schema as never) };
    if (kind === 'json-schema') return { expects: structuredClone(schema) };
    return { expects: 'validated at fire time (non-serializable validator)' };
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
      if (name === doActionName) {
        if (typeof parsed['action'] !== 'string' || !parsed['action']) {
          return { ok: false, judgment: 'error', reason: 'ACTION_REQUIRED' };
        }
        return callDoAction({
          action: parsed['action'],
          input: parsed['input'],
          confirm: parsed['confirm'] === true,
          instance: typeof parsed['instance'] === 'string' ? parsed['instance'] : undefined,
        });
      }
      return { ok: false, judgment: 'error', reason: 'UNKNOWN_TOOL', tools: staticTools.map((tool) => tool.name) };
    },
  };
}

function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]/g, '_');
}
