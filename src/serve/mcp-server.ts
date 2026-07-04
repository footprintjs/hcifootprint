/**
 * mcpServer(session) — expose the session as a real MODEL CONTEXT PROTOCOL
 * server, so ANY MCP host (Claude Desktop, a LangGraph MCP client, Cursor, …)
 * can drive your app without a line of framework-specific glue.
 *
 * It wraps {@link skillsAsTools} (Mode B): `tools/list` returns the FIXED tool
 * array (one per skill + whats_here / do_action), and `tools/call` routes to
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
import type { SkillToolsOptions } from './modes.js';
import type { Session } from '../traverse/session.js';

export interface McpServerOptions extends SkillToolsOptions {
  /** Server name advertised over MCP. Default: the graph id. */
  name?: string;
  /** Server version advertised over MCP. Default '0.1.0'. */
  version?: string;
}

/**
 * Build an MCP `Server` backed by a live InteractionSession. Attach any
 * transport with `server.connect(transport)`.
 */
export function mcpServer(session: Session, opts?: McpServerOptions): Server {
  const port = skillsAsTools(session, opts);
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
      // Act → data back, over the wire: if the call fired something, let the
      // handler settle and fold any produced data (search results, a looked-up
      // record) INTO the result — so a remote MCP client sees it, not just an
      // in-process caller.
      if (typeof result['transitionId'] === 'string') {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const produced = session.producedFor(result['transitionId']);
        if (produced !== undefined) result['data'] = produced;
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
