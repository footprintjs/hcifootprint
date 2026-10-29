import type { MCPToolDescription } from 'footprintjs';
import type { JourneyToolsPort, ServeResult } from './modes.js';

/** The common registration surface of browser WebMCP implementations. */
export interface WebMcpContext {
  registerTool(tool: WebMcpTool, options: { signal: AbortSignal }): void | Promise<void>;
}

/** A tool projected from the existing serving port, never a second action definition. */
export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: MCPToolDescription['inputSchema'];
  execute(input: unknown, options?: { signal?: AbortSignal }): Promise<ServeResult>;
}

export interface WebMcpOptions {
  /** Unregister the tools when the owning page/component/session is disposed. */
  signal?: AbortSignal;
}

export interface WebMcpRegistration {
  /** Idempotent. Stops new calls; it does not undo an action already dispatched. */
  dispose(): void;
}

/**
 * Register a fixed serving port with an explicitly supplied browser WebMCP context.
 *
 * Pass the context your browser exposes, rather than relying on a global here:
 * Lightpanda uses navigator.modelContext; the October 2026 draft uses
 * document.modelContext. Both synchronous and asynchronous registration work.
 *
 * Execution delegates directly to the supplied port. Its guards, principals,
 * confirmations and settlement policy remain authoritative. A pending result
 * remains pending: the caller uses the same did_it_work tool the port serves.
 * Registration and disposal never call a browser's requestUserInteraction.
 *
 * Tools become callable only after every registration succeeds. Failure aborts
 * this registration group, without unregistering another owner's tools. A host
 * must honor the registration signal to remove its listings; even if it retains
 * an old callback, that callback cannot dispatch after disposal.
 */
export async function registerWebMcpTools(
  port: JourneyToolsPort,
  context: WebMcpContext,
  options: WebMcpOptions = {},
): Promise<WebMcpRegistration> {
  const controller = new AbortController();
  const signal = options.signal;
  let active = false;
  let disposed = false;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    active = false;
    signal?.removeEventListener('abort', dispose);
    controller.abort();
  }

  signal?.addEventListener('abort', dispose, { once: true });
  if (signal?.aborted) dispose();

  try {
    if (disposed) throw inactive();
    // Snapshot before exposing anything: a host must not mutate the port's
    // schema or retarget a retained callback by changing a descriptor's name.
    const tools = structuredClone(port.tools());
    for (const tool of tools) {
      if (disposed) throw inactive();
      const name = tool.name;
      const registration = context.registerTool({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        async execute(input, execution) {
          if (!active || execution?.signal?.aborted) throw inactive();
          // Check only BEFORE dispatch. Cancellation/disposal cannot truthfully
          // turn an already executed action into one that never happened.
          return port.call(name, input);
        },
      }, { signal: controller.signal });
      await registered(registration, controller.signal);
    }
    if (disposed) throw inactive();
    active = true;
    return { dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

function inactive(): Error {
  return new Error('hcifootprint: WebMCP registration is not active; no action was dispatched.');
}

/** An abort can finish initialization even if a host never settles its promise. */
function registered(pending: void | Promise<void>, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', aborted);
    const aborted = () => {
      cleanup();
      reject(inactive());
    };
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
    // Attach both arms even after an abort: an eventual host rejection is
    // consumed, and cannot become an unrelated unhandled rejection.
    Promise.resolve(pending).then(
      () => { cleanup(); resolve(); },
      (error: unknown) => { cleanup(); reject(error); },
    );
  });
}
