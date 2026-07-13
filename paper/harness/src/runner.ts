/**
 * The episode loop. One episode = one task × one substrate × one seed:
 *
 *   task prompt ─► agent turn ─► [scripted user interleave] ─► agent turn ─► … ─► probes
 *
 * The runner is substrate-blind (fairness): same system preamble, same abort
 * rules, same accounting. Everything an analysis could need lands in the
 * EpisodeLog — raw, append-only, recomputable.
 */
import type { Session } from 'hcifootprint';
import { createDressShopApp, type DressShopApp } from './apps/dress-shop/store.js';
import { mapSubstrate } from './substrates/map.js';
import { flatSubstrate } from './substrates/flat.js';
import { perceptionSubstrate } from './substrates/perception.js';
import type { Substrate } from './substrates/types.js';
import { runInterleave, type UserAction } from './interleave.js';
import type { Task } from './tasks.js';
import type { Driver, Message } from './driver.js';

export type SubstrateKind = 'map' | 'flat' | 'perception';

const COMMON_SYSTEM =
  'You are the shopping assistant for a small dress store, working inside the LIVE app session of ' +
  'the signed-in user. The human may also use the app themselves at any moment while you work. ' +
  'Ground every claim in what the tools actually returned. Keep replies short. ';

const MAX_TURNS = 25;
const MAX_IDENTICAL_FAILURES = 3;

export interface TurnLog {
  turn: number;
  usage: { input: number; output: number };
  toolCalls: { name: string; input: Record<string, unknown>; result: string }[];
  text: string;
  interleaved: UserAction[];
}

export interface EpisodeLog {
  task: string;
  substrate: SubstrateKind;
  seed: number;
  model: string;
  turns: TurnLog[];
  finalText: string;
  aborted: boolean;
  success: boolean;
  probeAnswers: { question: string; truth: string; answer: string; correct: boolean }[];
  /** Ground truth for reanalysis: the session's full interaction + commit history. */
  transitions: unknown[];
  gaps: unknown[];
  finalState: Record<string, unknown>;
  finalNode: string;
  version: number;
}

export function makeSubstrate(kind: SubstrateKind, session: Session, app: DressShopApp): Substrate {
  if (kind === 'map') return mapSubstrate(session);
  if (kind === 'flat') return flatSubstrate(session, app);
  return perceptionSubstrate(session, app);
}

export async function runEpisode(opts: {
  task: Task;
  substrate: SubstrateKind;
  driver: Driver;
  seed?: number;
  model?: string;
}): Promise<EpisodeLog> {
  const app = createDressShopApp({ onWarn: () => {} });
  const session = app.session;
  const substrate = makeSubstrate(opts.substrate, session, app);
  const system = COMMON_SYSTEM + substrate.contract();

  const messages: Message[] = [{ role: 'user', content: opts.task.prompt }];
  const turns: TurnLog[] = [];
  let finalText = '';
  let aborted = false;
  let identicalFailures = 0;
  let lastFailureKey = '';

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const reply = await opts.driver.next(system, substrate.tools(), messages);
    messages.push({ role: 'assistant', content: reply.assistantContent });

    const turnLog: TurnLog = { turn, usage: reply.usage, toolCalls: [], text: reply.text, interleaved: [] };

    if (reply.toolCalls.length === 0) {
      finalText = reply.text;
      turns.push(turnLog);
      break;
    }

    const results: unknown[] = [];
    for (const call of reply.toolCalls) {
      const result = await substrate.dispatch(call.name, call.input);
      turnLog.toolCalls.push({ name: call.name, input: call.input, result });
      results.push({ type: 'tool_result', tool_use_id: call.id, content: result });
      const failureKey = result.includes('"ok":false') || result.startsWith('Nothing happened')
        ? `${call.name}:${JSON.stringify(call.input)}`
        : '';
      identicalFailures = failureKey && failureKey === lastFailureKey ? identicalFailures + 1 : 0;
      lastFailureKey = failureKey;
    }
    messages.push({ role: 'user', content: results });

    // World interleave — the user acts AFTER the agent's turn settled.
    turnLog.interleaved = await runInterleave(app, opts.task.script, turn);
    turns.push(turnLog);

    if (identicalFailures >= MAX_IDENTICAL_FAILURES) {
      aborted = true;
      break;
    }
    if (turn === MAX_TURNS) aborted = true;
  }

  // ── attribution probes: no tools, one word ────────────────────────────────
  const probeAnswers: EpisodeLog['probeAnswers'] = [];
  for (const probe of opts.task.probes) {
    messages.push({
      role: 'user',
      content: `${probe.question} Answer with exactly one word: USER or AGENT.`,
    });
    const reply = await opts.driver.next(system, [], messages);
    messages.push({ role: 'assistant', content: reply.assistantContent });
    const answer = /\buser\b/i.test(reply.text) && !/\bagent\b/i.test(reply.text)
      ? 'user'
      : /\bagent\b/i.test(reply.text) && !/\buser\b/i.test(reply.text)
        ? 'agent'
        : 'unclear';
    probeAnswers.push({
      question: probe.question,
      truth: probe.truth,
      answer,
      correct: answer === probe.truth,
    });
    turns.push({ turn: turns.length + 1, usage: reply.usage, toolCalls: [], text: reply.text, interleaved: [] });
  }

  return {
    task: opts.task.id,
    substrate: opts.substrate,
    seed: opts.seed ?? 0,
    model: opts.model ?? 'mock',
    turns,
    finalText,
    aborted,
    success: opts.task.success(session, app),
    probeAnswers,
    transitions: session.transitions().map((t) => JSON.parse(JSON.stringify(t))),
    gaps: session.gaps().map((g) => JSON.parse(JSON.stringify(g))),
    finalState: session.state(),
    finalNode: session.node,
    version: session.version,
  };
}
