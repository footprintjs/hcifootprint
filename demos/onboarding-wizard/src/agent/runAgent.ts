import { Agent, isPaused } from 'agentfootprint';
import { skillsAsTools } from 'hcifootprint';

import type { OnboardingSession } from '../app/graph.js';
import { settle as defaultSettle } from '../app/settle.js';
import type { BuiltProvider } from './providers.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { createToolBridge, type ToolCallRecord } from './tools.js';

/**
 * ONE CONVERSATION over one session.
 *
 * The Agent is built once and reused across turns, deliberately: Mode B's tool
 * array is static for the life of a conversation, so rebuilding the agent per
 * turn would throw away exactly the property the mode exists to give (a
 * cache-stable prompt prefix). Disclosure rides the result channel instead.
 *
 * Each turn injects `contextBrief({ sinceVersion })` — the traverse-path delta
 * since the model's last look, which is how it learns what the HUMAN did in
 * between (clicking a button on the page is world motion the agent never saw).
 * The brief carries authored strings and structural facts only; state values
 * never enter it.
 */
export interface Conversation {
  /** One turn. Never throws: a provider failure comes back as text. */
  ask(message: string): Promise<TurnResult>;
  /** Every tool call this conversation made, oldest first. */
  toolCalls(): ToolCallRecord[];
  mode: 'mock' | 'live';
  modelLabel: string;
  /** Set when the requested provider could not be honoured (e.g. live with no key). */
  problem: string | null;
}

export interface TurnResult {
  text: string;
  /** Tool calls made during THIS turn. */
  calls: ToolCallRecord[];
  /** Set when the run failed or paused — the panel says so instead of showing nothing. */
  trouble: string | null;
}

export interface ConversationOptions {
  session: OnboardingSession;
  provider: BuiltProvider;
  /** Yield-the-task hook; the default lets a fire's deferred work land. */
  settle?: () => Promise<void>;
  /** Bound on the ReAct loop. The scripted walk takes ~16 calls. */
  maxIterations?: number;
}

export function createConversation(opts: ConversationOptions): Conversation {
  const settle = opts.settle ?? defaultSettle;
  // The serving mode: skills as fixed tools, three generics, disclosure in
  // results. confirmHighEffect stays ON — the confirm gate is the demo.
  const port = skillsAsTools(opts.session, { source: 'agent', confirmHighEffect: true });
  const bridge = createToolBridge(port, settle);

  const agent = Agent.create({
    provider: opts.provider.provider,
    model: opts.provider.modelLabel,
    name: 'Onboarding assistant',
    maxIterations: opts.maxIterations ?? 24,
    // NO temperature, NO thinking — see providers.ts.
  })
    .system(SYSTEM_PROMPT)
    .tools(bridge.tools)
    .build();

  let lastTurnVersion = 0;

  return {
    mode: opts.provider.mode,
    modelLabel: opts.provider.modelLabel,
    problem: opts.provider.problem,
    toolCalls: () => bridge.calls(),

    async ask(message) {
      const before = bridge.calls().length;
      const brief = opts.session.contextBrief({ sinceVersion: lastTurnVersion });
      let text = '';
      let trouble: string | null = null;
      try {
        const raw = await agent.run({
          message: `<session-context>\n${brief.text}\n</session-context>\n\n${message}`,
        });
        if (isPaused(raw)) {
          trouble = 'The run paused for input, which this demo does not wire.';
        } else {
          text = raw;
        }
      } catch (error) {
        // A provider failure is a first-class outcome, not a crash: the panels
        // still have a real trace of whatever DID happen before it.
        trouble = error instanceof Error ? error.message : String(error);
      }
      lastTurnVersion = opts.session.version;
      return { text, calls: bridge.calls().slice(before), trouble };
    },
  };
}
