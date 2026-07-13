/**
 * `map` — the full session model: Mode B fixed tools (one per skill +
 * whats_here + do_action) with disclosure in results, PLUS the two wire-fix
 * stand-ins this repo's paper needs and the reference implementation will
 * upstream:
 *
 *   whats_changed {sinceVersion} → the O(Δ) brief (contextBrief delta)
 *   why {key}                    → the provenance backward slice
 *
 * Both are static tools (the set stays fixed for the episode — cache-valid).
 * Tool names are sanitized for the Messages API ('.' → '__').
 */
import { skillsAsTools } from 'hcifootprint';
import type { Session } from 'hcifootprint';
import type { Substrate, ToolDef } from './types.js';
import { settle } from './types.js';

export function mapSubstrate(session: Session): Substrate {
  const port = skillsAsTools(session);
  const nameMap = new Map<string, string>(); // sanitized → port tool name

  const portTools: ToolDef[] = port.tools().map((tool) => {
    const safe = tool.name.replace(/[^a-zA-Z0-9_-]/g, '__');
    nameMap.set(safe, tool.name);
    return {
      name: safe,
      description: tool.description,
      input_schema: tool.inputSchema as Record<string, unknown>,
    };
  });

  const extraTools: ToolDef[] = [
    {
      name: 'whats_changed',
      description:
        'What happened in the session since a version you already saw: who did what (you, the ' +
        'user, or the system), where the session is now, and what is fireable. Pass the `version` ' +
        'from any earlier result to get only the delta.',
      input_schema: {
        type: 'object',
        properties: { sinceVersion: { type: 'number', description: 'a version from a previous result' } },
        additionalProperties: false,
      },
    },
    {
      name: 'why',
      description: 'Explain why a state key has its value — the causal chain of actions (and who fired them) that produced it.',
      input_schema: {
        type: 'object',
        properties: { key: { type: 'string', description: 'a state key, e.g. "cartIds" or "lastOrderId"' } },
        required: ['key'],
        additionalProperties: false,
      },
    },
  ];

  return {
    name: 'map',
    contract: () =>
      'You operate the app through a FIXED set of tools: one per skill, plus whats_here, do_action, ' +
      'whats_changed, and why. Results carry readySteps — perform a step by calling the same skill ' +
      'tool again with {step, input}. Every result carries a `version`; if things look different ' +
      'than you expected, call whats_changed with your last seen version. High-effect steps return ' +
      'needs-confirm: ask the human in chat, then retry with confirm: true.',
    tools: () => [...portTools, ...extraTools],
    dispatch: async (name, input) => {
      if (name === 'whats_changed') {
        const sinceVersion = typeof input['sinceVersion'] === 'number' ? input['sinceVersion'] : undefined;
        const brief = session.contextBrief(sinceVersion === undefined ? undefined : { sinceVersion });
        return JSON.stringify({ brief: brief.text, youAreOn: brief.node, version: brief.version });
      }
      if (name === 'why') {
        return session.why(String(input['key'] ?? ''));
      }
      const portName = nameMap.get(name);
      if (!portName) return JSON.stringify({ ok: false, error: `unknown tool ${name}` });
      const result = port.call(portName, input) as Record<string, unknown>;
      if (typeof result['transitionId'] === 'string') {
        await settle();
        const produced = session.producedFor(result['transitionId'] as string);
        if (produced !== undefined) result['data'] = produced;
      }
      return JSON.stringify(result);
    },
  };
}
