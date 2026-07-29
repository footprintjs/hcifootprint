/**
 * mcpServer(session) — expose the session as a real MODEL CONTEXT PROTOCOL
 * server, so ANY MCP host (Claude Desktop, a LangGraph MCP client, Cursor, …)
 * can drive your app without a line of framework-specific glue.
 *
 * It wraps {@link skillsAsTools} (Mode B): `tools/list` returns the FIXED tool
 * array (one per skill + whats_here / do_action / why), and `tools/call` routes to
 * the port. Because the tool set never changes, a plain MCP server works with
 * no `tools/list_changed` churn — that is the whole point of the fixed-tool
 * design. High-effect steps come back as `judgment: 'needs-confirm'` in the
 * result; the HOST decides how to get human approval, then calls again with
 * `confirm: true` — a portable, framework-agnostic human-in-the-loop.
 *
 * This module lives behind the `hcifootprint/mcp` subpath and is the ONLY
 * place `@modelcontextprotocol/sdk` (an OPTIONAL peer dependency) is imported —
 * the core entry stays zero-dependency. You pick the transport (stdio, SSE,
 * streamable HTTP) and connect it yourself; the topology (where the live
 * session runs) is yours.
 *
 * @example
 *   import { mcpServer } from 'hcifootprint/mcp';
 *   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 *   const server = mcpServer(session);
 *   await server.connect(new StdioServerTransport());
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { skillsAsTools } from './modes.js';
import type { SkillToolsOptions, SkillToolsPort } from './modes.js';
import { errorText } from './error-text.js';
import type { FireSettlement } from '../atom/types.js';
import type { Session } from '../traverse/session.js';

export interface McpServerOptions extends SkillToolsOptions {
  /** Server name advertised over MCP. Default: the graph id. */
  name?: string;
  /** Server version advertised over MCP. Default '0.1.0'. */
  version?: string;
  /**
   * How long a `tools/call` that FIRED something waits for the app to finish
   * before it answers. Default 250.
   *
   * This is the ONE place in the library where waiting is allowed: a tool call
   * is already an async turn, and the model is going to ask "did it work?"
   * anyway. Settle inside the ceiling and the result carries the final word;
   * miss it and `effectStatus: 'pending'` stands, with `did_it_work` named as
   * the next call. Nothing is ever guessed at the boundary — the ceiling
   * decides how long to wait, never what the answer is.
   *
   * Raise it for an app whose handlers talk to a slow backend.
   *
   * `0` is the SHORTEST ceiling, not an off switch: a settlement already in
   * hand — or one a handler reports in the same microtask turn — still wins the
   * race and is still folded in, because the timer is a macrotask. There is no
   * way to turn the fold off, deliberately: withholding an answer the session
   * is already holding would be the only thing dishonest here.
   */
  settleWithinMs?: number;
}

/**
 * Build an MCP `Server` backed by a live InteractionSession. Attach any
 * transport with `server.connect(transport)`.
 */
export function mcpServer(session: Session, opts?: McpServerOptions): Server {
  const port = skillsAsTools(session, opts);
  const settleWithinMs = opts?.settleWithinMs ?? 250;
  const server = new Server(
    { name: opts?.name ?? session.graphId, version: opts?.version ?? '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // Fixed tool list — identical every request (Mode B), so no list_changed.
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: port.tools() as unknown as Tool[],
  }));

  // Route a call to the port; a domain rejection is a normal result the model
  // reads (needs-confirm, GUARD_FAILED, …). Only a genuinely unknown tool — or
  // an unexpected throw — is surfaced as isError.
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = port.call(name, args ?? {}) as Record<string, unknown>;
      // If the call FIRED something, give the app its moment and fold the
      // settled truth INTO the result — the invocation word, the produced data
      // (search results, a looked-up record) and any failure. A remote client
      // gets what an in-process caller gets from `whenSettled`; before this,
      // one macrotask of grace folded produced data only, and the result still
      // said 'pending' about an action that had already finished or failed.
      if (typeof result['transitionId'] === 'string') {
        const settled = await settleWithin(port, result['transitionId'], settleWithinMs);
        if (settled) {
          result['effectStatus'] = settled.effectStatus;
          const produced = session.producedFor(result['transitionId']);
          if (produced !== undefined) result['data'] = produced;
          if (settled.error !== undefined) result['error'] = errorText(settled.error);
          // The pointer sent the model to ask did_it_work; it just got the
          // answer, so leaving it would buy a wasted turn.
          delete result['howToSettle'];
        }
      }
      const misused = result['reason'] === 'UNKNOWN_TOOL';
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        ...(misused ? { isError: true } : {}),
      };
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: `hcifootprint: tool '${name}' failed: ${String(error)}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Wait for a fire to come to rest, but never longer than the ceiling —
 * `undefined` means "not in time", never a guessed outcome.
 *
 * The timer is cleared on both paths: a settlement that wins the race must not
 * leave a pending timer holding the event loop open behind it.
 */
async function settleWithin(
  port: SkillToolsPort,
  transitionId: string,
  ms: number,
): Promise<FireSettlement | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  try {
    return await Promise.race([port.whenSettled(transitionId), ceiling]);
  } finally {
    clearTimeout(timer);
  }
}
