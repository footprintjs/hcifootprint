import { defineTool } from 'agentfootprint';
import type { Tool } from 'agentfootprint';
import type { ServeResult, JourneyToolsPort } from 'hcifootprint';

/**
 * THE BRIDGE — Mode B's tool surface, handed to an agentfootprint Agent.
 *
 * `journeysAsTools(session)` already produces the exact tool array and the router
 * for it, so this file adds exactly two things and nothing else:
 *
 *   1. NAME SANITISING. The library's names are dotted ('onboarding.journey.signup')
 *      because dots are fine in MCP. Anthropic and OpenAI accept only
 *      [A-Za-z0-9_-], so every dot becomes an underscore on the way out and the
 *      original is looked up on the way back in. The map is the only state here.
 *
 *   2. A SETTLE BEAT. `port.call()` is synchronous, and a fire's handler is
 *      deliberately deferred — so the call returns before the app has moved.
 *      Awaiting one macrotask before handing the result back means the model's
 *      NEXT look sees the settled world (navigated, mounted, state reported).
 *      The result itself is passed through VERBATIM: it reports the session's
 *      claim at call time, `toNodeClaimed` and all, and rewriting it after the
 *      fact would replace the library's honesty with the demo's opinion.
 */
export interface ToolCallRecord {
  /** The name the model called (sanitised). */
  name: string;
  /** The library-side name it routed to. */
  routedTo: string;
  args: unknown;
  result: ServeResult;
}

export interface ToolBridge {
  tools: Tool[];
  /** Every call this conversation made, oldest first — the demo's tool log panel. */
  calls(): ToolCallRecord[];
}

/** Dots and other MCP-legal characters that LLM tool names reject. */
export function sanitizeToolName(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function createToolBridge(port: JourneyToolsPort, settle: () => Promise<void>): ToolBridge {
  const calls: ToolCallRecord[] = [];
  const routes = new Map<string, string>();

  const tools = port.tools().map((description) => {
    const name = sanitizeToolName(description.name);
    routes.set(name, description.name);
    return defineTool<Record<string, unknown>, ServeResult>({
      name,
      description: description.description,
      inputSchema: description.inputSchema,
      execute: async (args) => {
        const routedTo = routes.get(name) ?? description.name;
        const result = port.call(routedTo, args);
        await settle();
        calls.push({ name, routedTo, args, result });
        return result;
      },
    });
  });

  return { tools, calls: () => [...calls] };
}
