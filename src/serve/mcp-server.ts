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
import type { ServeResult, SkillToolsOptions, SkillToolsPortWithSettlement } from './modes.js';
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
      // settled truth INTO the result, so a remote client gets what an
      // in-process caller gets from `whenSettled`.
      //
      // ONLY a result that fired is folded, and `transitionId` is the proof: it
      // is minted by an executed fire and by nothing else (docs/design/
      // answer-grammar.md, "What mints a transitionId"). That invariant is what
      // keeps this await structurally incapable of blocking on a person — a
      // needs-confirm, a decline and every refusal carry no such id, so they
      // return at once with the ceiling untouched.
      if (typeof result['transitionId'] === 'string') {
        const settled = await settleWithin(port, result['transitionId'], settleWithinMs);
        if (settled) {
          // The SAME answer `did_it_work` gives about this id, from the same
          // builder — not three fields picked out by name. Hand-patching taught
          // a remote agent strictly less than one extra poll would have: no
          // outcome, no verifyHeld, no writesObserved, no arrival, and no marker
          // at all on a fire nothing in the app executed.
          //
          // PRECEDENCE, chosen: the settled facts WIN over the fire-time words
          // they overlap with. That is the whole point on `effectStatus`
          // ('pending' was true at return time and is not true now), and it is
          // the point again on `howToAct` — an outcome the app has since taken
          // back must not be answered with the frame's generic "pick the next
          // step". Everything the builder does not serve is left exactly as the
          // port built it, including `ok`, `did` and `transitionId`.
          //
          // REFUSED, on one id: `settledAnswer` throws rather than answer about
          // an id this session minted for both a fire and a human's card. A
          // refusal must cost the caller nothing it already had — the fire's own
          // result stands untouched, `howToSettle` keeps pointing at the door
          // that explains why, and the model gets the whole sentence there.
          const answer = foldable(port, result['transitionId']);
          if (answer) {
            Object.assign(result, answer);
            // A FIRE-TIME WORD THE SETTLED FACTS SUPERSEDE, dropped for the same
            // reason `howToSettle` is. `settlement` answers "does a commit bundle
            // exist YET?" — a question whose whole meaning is "as of return
            // time", and this payload no longer describes return time. Left in,
            // it says 'awaiting-state' beside facts that were read from the very
            // bundle it says does not exist. The builder has no word for this
            // axis and one is not invented here: the library simply stops
            // saying, which is never a lie. A caller that wants it polls nothing
            // — `did_it_work` has never carried it either.
            delete result['settlement'];
            // The pointer sent the model to ask did_it_work; it just got the
            // answer, so leaving it would buy a wasted turn.
            delete result['howToSettle'];
          }
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
 * The settled answer IF this door may give one — `undefined` where it refuses.
 *
 * `settledAnswer` throws by contract on an id it cannot answer about honestly,
 * and a throw here would be read as "the tool failed": the model would lose the
 * result of a fire that actually happened, on an app whose only mistake was
 * naming an action 'ask'. The refusal is honoured instead of relayed — nothing
 * is folded, nothing the port built is removed, and the pointer the port left on
 * the result sends the model to `did_it_work`, which answers the refusal in full
 * words. A caller holding the port meets the throw exactly as documented; only
 * this transport, which asks on the caller's behalf, absorbs it.
 */
function foldable(
  port: SkillToolsPortWithSettlement,
  transitionId: string,
): ServeResult | undefined {
  try {
    return port.settledAnswer(transitionId);
  } catch {
    return undefined;
  }
}

/**
 * Wait for a fire to come to rest, but never longer than the ceiling —
 * `undefined` means "not in time", never a guessed outcome.
 *
 * The timer is cleared on both paths: a settlement that wins the race must not
 * leave a pending timer holding the event loop open behind it.
 */
async function settleWithin(
  // The BUILT port: `mcpServer` makes its own with `skillsAsTools` above, so the
  // settlement door is always there and this never has to check for it.
  port: SkillToolsPortWithSettlement,
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
