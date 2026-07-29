/**
 * One chat turn.
 *
 * The turn is grounded the way Mode B intends: `contextBrief({sinceVersion})`
 * narrates only what changed since the model's last look — including what the
 * HUMAN did in the meantime — and the model reads the rest off its own tool
 * results. A fresh Agent per turn, per the same freshness discipline the Cited
 * demo follows; the desk, not the agent, is what carries state between turns.
 */
import { Agent, isPaused } from 'agentfootprint';
import type { LLMProvider } from 'agentfootprint';
import type { DeskBridge, ToolCallRecord } from './bridge.js';
import type { Desk } from '../desk/wiring.js';

export const SYSTEM_PROMPT = `You work a support desk through a live action surface. The actions you can
take change as the app changes under you, so never assume: call whats_here, read what it returns, and act
only on what is listed there. Fire an action with do_action; a row action needs the instance id of the row.
If the desk refuses, say so plainly and name the reason it gave — never describe an action as done when the
result did not say it was. A high-effect action comes back needing confirmation with receipts: show the
human what it would do and wait. Keep replies short and grounded in what the desk actually returned.`;

export interface Turn {
  readonly reply: string;
  /** The real tool calls this turn made, in order. */
  readonly calls: readonly ToolCallRecord[];
  /** Cursor version after the turn — pass it as `sinceVersion` on the next one. */
  readonly version: number;
}

export interface TurnDeps {
  readonly desk: Desk;
  readonly bridge: DeskBridge;
  readonly provider: LLMProvider;
  readonly model: string;
  /** The version the model last saw. The brief narrates only what moved since. */
  readonly sinceVersion?: number;
}

export async function runTurn(deps: TurnDeps, message: string): Promise<Turn> {
  const { desk, bridge, provider, model } = deps;
  const before = bridge.calls.length;
  const brief = desk.session.contextBrief(
    deps.sinceVersion === undefined ? undefined : { sinceVersion: deps.sinceVersion },
  );

  const agent = Agent.create({
    provider,
    model,
    name: 'Desk assistant',
    maxIterations: 6,
    // NO temperature — omitting the field is the fix for current Claude models.
  })
    .system(SYSTEM_PROMPT)
    .tools([...bridge.tools])
    .build();

  const raw = await agent.run({
    message: `<session-context>\n${brief.text}\n</session-context>\n\n${message}`,
  });

  const reply = isPaused(raw)
    ? 'The run paused for input, and this demo does not wire pause/resume — so there is nothing to report.'
    : raw;

  return { reply, calls: bridge.calls.slice(before), version: desk.session.version };
}
