/**
 * The model driver — one Messages request per agent turn. Two implementations:
 * the real Anthropic API (records token usage — measure M1's source of truth)
 * and a scripted mock (plumbing tests, no key, zero tokens).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ToolDef } from './substrates/types.js';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface DriverReply {
  text: string;
  toolCalls: ToolCall[];
  /** Raw assistant content to echo back into history (API-shape passthrough). */
  assistantContent: unknown;
  usage: { input: number; output: number };
}

export type Message = { role: 'user' | 'assistant'; content: unknown };

export interface Driver {
  next(system: string, tools: ToolDef[], messages: Message[]): Promise<DriverReply>;
}

export function anthropicDriver(model: string): Driver {
  const client = new Anthropic();
  return {
    async next(system, tools, messages) {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system,
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema as Anthropic.Tool.InputSchema,
        })),
        messages: messages as Anthropic.MessageParam[],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const toolCalls: ToolCall[] = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }));
      return {
        text,
        toolCalls,
        assistantContent: response.content,
        usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
      };
    },
  };
}

/** One scripted mock turn: tool calls to make, or final text when calls is empty. */
export interface MockTurn {
  calls?: { name: string; input?: Record<string, unknown> }[];
  text?: string;
}

export function mockDriver(turns: MockTurn[]): Driver {
  let cursor = 0;
  let nextId = 1;
  return {
    async next() {
      const turn = turns[Math.min(cursor, turns.length - 1)];
      cursor++;
      const toolCalls: ToolCall[] = (turn.calls ?? []).map((c) => ({
        id: `mock-${nextId++}`,
        name: c.name,
        input: c.input ?? {},
      }));
      return {
        text: turn.text ?? '',
        toolCalls,
        assistantContent: [
          ...(turn.text ? [{ type: 'text', text: turn.text }] : []),
          ...toolCalls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.input })),
        ],
        usage: { input: 0, output: 0 },
      };
    },
  };
}
