/**
 * World interleaving — the benchmark's one idea. After designated agent turns
 * the scripted USER acts through the app's own surface (`source: 'user'`,
 * navigation via the app's router), exactly the code path a human click takes.
 * The agent is never told; discovering it is the point.
 */
import type { DressShopApp } from './apps/dress-shop/store.js';
import { settle } from './substrates/types.js';

export type UserAction =
  | { kind: 'goto'; page: string }
  | { kind: 'fire'; id: string; payload?: unknown };

export interface InterleaveStep {
  /** Fire these user actions after the Nth agent request completes (1-based). */
  afterAgentTurn: number;
  actions: UserAction[];
}

export type InterleaveLevel = 'none' | 'light' | 'heavy';

export interface InterleaveScript {
  level: InterleaveLevel;
  /** CowCorpus-style intervention kind: helps / unrelated / invalidates the plan. */
  kind: 'augmenting' | 'diverging' | 'conflicting';
  steps: InterleaveStep[];
}

export const NO_INTERLEAVE: InterleaveScript = { level: 'none', kind: 'diverging', steps: [] };

/** Execute every step scheduled for this agent turn. Returns what actually ran (for the episode log). */
export async function runInterleave(
  app: DressShopApp,
  script: InterleaveScript,
  agentTurn: number,
): Promise<UserAction[]> {
  const ran: UserAction[] = [];
  for (const step of script.steps) {
    if (step.afterAgentTurn !== agentTurn) continue;
    for (const action of step.actions) {
      if (action.kind === 'goto') {
        app.goto(action.page);
      } else {
        app.session.fire(action.id, { source: 'user', payload: action.payload });
        await settle();
      }
      ran.push(action);
    }
  }
  return ran;
}
