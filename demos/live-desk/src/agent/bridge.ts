/**
 * The bridge — hcifootprint's Mode B port, handed to an agentfootprint Agent.
 *
 * Mode B (`skillsAsTools`, hcifootprint src/serve/modes.ts:124) hands back a
 * tool array that NEVER changes for the life of a conversation, and moves all
 * disclosure onto the result channel. This desk declares no skills — every
 * action arrives from the store at runtime — so the array is the three fixed
 * generics: whats_here, why, do_action. The agent learns what exists by asking,
 * every time, which is exactly right for a surface that changes under it.
 *
 * Two jobs, and nothing else:
 *
 * 1. NAMES. Mode B names its tools '<graphId>.whats_here'; Anthropic and OpenAI
 *    both reject a dot in a tool name (^[a-zA-Z0-9_-]{1,64}$). So a dot becomes
 *    '__' on the wire and maps straight back for dispatch — the same
 *    substitution the in-repo dress-shop chatbot uses.
 *
 * 2. THE DATA CHANNEL. A fire's tool result is built synchronously, before the
 *    app's handler has run, so anything the handler RETURNS is not in it yet.
 *    The result carries `transitionId` precisely so a caller can come back for
 *    it (modes.ts:401-403), which is what the wrapper does: let the handler
 *    settle, then attach `producedFor(transitionId)` if it produced anything.
 *    Without it, "list the tickets" would answer with an id and no tickets.
 */
import { defineTool } from 'agentfootprint';
import type { Tool } from 'agentfootprint';
import { skillsAsTools } from 'hcifootprint';
import type { ServeResult } from 'hcifootprint';
import type { DeskSession } from '../desk/wiring.js';

/** One real call the agent made, kept for the chat panel to print verbatim. */
export interface ToolCallRecord {
  readonly at: number;
  /** The name as the model called it (dots already substituted). */
  readonly name: string;
  readonly args: unknown;
  readonly result: ServeResult;
}

export interface DeskBridge {
  /** The static tool array — identical bytes every turn. */
  readonly tools: readonly Tool[];
  /** Calls made so far, oldest first. */
  readonly calls: readonly ToolCallRecord[];
  /** The wire name for a Mode B tool name (dots substituted). */
  wireName(portName: string): string;
}

/** Dots are legal in a Mode B tool name and illegal in an LLM tool name. */
export function wireName(portName: string): string {
  return portName.replaceAll('.', '__');
}

/** Let a just-fired handler run before reading what it produced. */
const settleTick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export function createBridge(session: DeskSession): DeskBridge {
  const port = skillsAsTools(session);
  const calls: ToolCallRecord[] = [];

  const tools = port.tools().map((described) =>
    defineTool<Record<string, unknown>, ServeResult>({
      name: wireName(described.name),
      description: described.description,
      inputSchema: described.inputSchema as Readonly<Record<string, unknown>>,
      execute: async (args) => {
        const result = port.call(described.name, args);
        const enriched = await withProduced(session, result);
        calls.push({ at: Date.now(), name: wireName(described.name), args, result: enriched });
        return enriched;
      },
    }),
  );

  return { tools, calls, wireName };
}

async function withProduced(session: DeskSession, result: ServeResult): Promise<ServeResult> {
  const transitionId = result['transitionId'];
  if (result['ok'] !== true || typeof transitionId !== 'string') return result;
  await settleTick();
  const produced = session.producedFor(transitionId);
  return produced === undefined ? result : { ...result, produced };
}
