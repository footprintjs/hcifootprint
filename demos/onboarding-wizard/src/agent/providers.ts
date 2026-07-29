import type { LLMProvider } from 'agentfootprint';
import { browserAnthropic, browserOpenai, mock } from 'agentfootprint/llm-providers';

import { wizardRespond } from './mockScript.js';

/**
 * Provider construction — the only place a key VALUE is used, and it arrives as
 * an argument and leaves as a provider. It is never stored, logged or returned.
 *
 * All three symbols come from the `agentfootprint/llm-providers` subpath, not
 * the root barrel (the root exports the LLM *types* and `providerFromEnv`).
 *
 * Model rules that each cause a hard 400 on current Claude models if broken:
 *   1. Never pass `temperature` — omitting the field is the fix.
 *   2. Never set `thinking` — the shape the provider would emit is the removed
 *      `{type:'enabled',budget_tokens}` form.
 *   3. Always pass `defaultModel`; the built-in default is a legacy id.
 *
 * MOCK IS THE DEFAULT, and it is not a lesser mode: the scripted model reads
 * real tool results and drives the real session, so `npm run dev` and
 * `npm test` exercise exactly the code path a key would.
 */
export type ProviderKind = 'mock' | 'anthropic' | 'openai';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-5';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface BuiltProvider {
  provider: LLMProvider;
  /** 'live' the moment the provider talks to a real host. */
  mode: 'mock' | 'live';
  /** Model label for the header and the trace. */
  modelLabel: string;
  /** Set when the requested configuration could not be honoured. */
  problem: string | null;
}

export interface BuildProviderOptions {
  kind: ProviderKind;
  /** The key for `kind`, read once by the caller from the key store. */
  key?: string;
  model?: string;
}

/** The deterministic stand-in. Instant by default — a wizard demo is a walk, not a wait. */
export function mockProvider(): LLMProvider {
  return mock({ name: 'mock', respond: wizardRespond });
}

export function buildProvider(opts: BuildProviderOptions): BuiltProvider {
  const key = (opts.key ?? '').trim();

  if (opts.kind === 'anthropic') {
    if (key.length === 0) {
      // Fall back to the mock rather than failing: the demo must still run, and
      // the panel must be able to say exactly why it is not live.
      return {
        provider: mockProvider(),
        mode: 'mock',
        modelLabel: 'mock',
        problem: 'Live mode is set to Anthropic but no Anthropic key is present in this tab.',
      };
    }
    const model = opts.model || DEFAULT_ANTHROPIC_MODEL;
    return {
      provider: browserAnthropic({ apiKey: key, defaultModel: model, defaultMaxTokens: 8000 }),
      mode: 'live',
      modelLabel: model,
      problem: null,
    };
  }

  if (opts.kind === 'openai') {
    if (key.length === 0) {
      return {
        provider: mockProvider(),
        mode: 'mock',
        modelLabel: 'mock',
        problem: 'Live mode is set to OpenAI but no OpenAI key is present in this tab.',
      };
    }
    const model = opts.model || DEFAULT_OPENAI_MODEL;
    return {
      provider: browserOpenai({ apiKey: key, defaultModel: model }),
      mode: 'live',
      modelLabel: model,
      problem: null,
    };
  }

  return { provider: mockProvider(), mode: 'mock', modelLabel: 'mock', problem: null };
}
