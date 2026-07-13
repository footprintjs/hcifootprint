/**
 * `map` — the full session model over the REAL wire: Mode B fixed tools,
 * one per skill plus the three fixed generics the library now serves —
 * whats_here {sinceVersion?} (the O(Δ) mixed-initiative resync), why {key}
 * (the provenance backward slice), and do_action. No harness-side stand-ins:
 * what this substrate measures is exactly what any MCP host would get.
 * Tool names are sanitized for the Messages API ('.' → '__').
 */
import { skillsAsTools } from 'hcifootprint';
import type { Session } from 'hcifootprint';
import type { Substrate, ToolDef } from './types.js';
import { settle } from './types.js';

export function mapSubstrate(session: Session): Substrate {
  const port = skillsAsTools(session);
  const nameMap = new Map<string, string>(); // sanitized → port tool name

  const tools: ToolDef[] = port.tools().map((tool) => {
    const safe = tool.name.replace(/[^a-zA-Z0-9_-]/g, '__');
    nameMap.set(safe, tool.name);
    return {
      name: safe,
      description: tool.description,
      input_schema: tool.inputSchema as Record<string, unknown>,
    };
  });

  return {
    name: 'map',
    contract: () =>
      'You operate the app through a FIXED set of tools: one per skill, plus whats_here, why, and ' +
      'do_action. Results carry readySteps — perform a step by calling the same skill tool again ' +
      'with {step, input}. Every result carries a `version`; if things look different than you ' +
      'expected, call whats_here with {sinceVersion: <your last seen version>} to learn who did ' +
      'what in the meantime, and why with {key} to trace who produced a state value. High-effect ' +
      'steps return needs-confirm: ask the human in chat, then retry with confirm: true.',
    tools: () => tools,
    dispatch: async (name, input) => {
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
