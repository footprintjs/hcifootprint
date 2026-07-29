/**
 * Provider construction — the only place a key value is used, and it arrives as
 * an argument and leaves as a provider.
 *
 * Provider symbols come from the `agentfootprint/llm-providers` subpath (the
 * root barrel exports `providerFromEnv` and the LLM types only). The browser
 * arms are the two that can genuinely run in a tab: Bedrock needs long-lived AWS
 * credentials, and Azure's own doc comment warns it may need a same-origin proxy
 * a static demo cannot provide.
 *
 * Model rules, each of which 400s on current Claude models if broken:
 *   • never pass `temperature` — omit the field entirely;
 *   • never set `thinking` — the shape browserAnthropic would emit is the
 *     removed `{type:'enabled',budget_tokens}` form;
 *   • always pass `defaultModel` — the built-in default is a legacy id;
 *   • give the Anthropic arm room: max_tokens caps thinking + text together.
 */
import type { LLMProvider } from 'agentfootprint';
import { browserAnthropic, browserOpenai, mock } from 'agentfootprint/llm-providers';
import { deskRespond } from './mockScript.js';

export type ProviderChoice = 'mock' | 'anthropic' | 'openai';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface BuiltProvider {
  readonly provider: LLMProvider;
  /** 'live' the moment the provider talks to a real host. */
  readonly mode: 'mock' | 'live';
  readonly modelLabel: string;
  /** Set when the choice cannot be honoured — the app falls back to the mock. */
  readonly problem: string | null;
}

export function buildProvider(choice: ProviderChoice, key: string): BuiltProvider {
  if (choice === 'mock') return scripted(null);
  if (key.trim().length === 0) {
    return scripted(
      `No ${choice} key is present, so the desk is running the scripted model instead. Paste a key to go live.`,
    );
  }
  if (choice === 'anthropic') {
    return {
      provider: browserAnthropic({
        apiKey: key,
        defaultModel: DEFAULT_ANTHROPIC_MODEL,
        defaultMaxTokens: 16000,
        // NO temperature. NO thinking. See the header.
      }),
      mode: 'live',
      modelLabel: DEFAULT_ANTHROPIC_MODEL,
      problem: null,
    };
  }
  return {
    provider: browserOpenai({ apiKey: key, defaultModel: DEFAULT_OPENAI_MODEL }),
    mode: 'live',
    modelLabel: DEFAULT_OPENAI_MODEL,
    problem: null,
  };
}

function scripted(problem: string | null): BuiltProvider {
  return {
    // `respond`, not `replies`: stateless, so asking the same thing twice
    // behaves identically and nothing throws on exhaustion.
    provider: mock({ name: 'mock', respond: deskRespond, thinkingMs: 0, chunkDelayMs: 0 }),
    mode: 'mock',
    modelLabel: 'scripted',
    problem,
  };
}
