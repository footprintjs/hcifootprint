/**
 * M1–M5 aggregation — recomputes every paper number from raw EpisodeLogs.
 * No number in the paper may come from anywhere else.
 */
import type { EpisodeLog } from './runner.js';

export interface SubstrateAggregate {
  substrate: string;
  episodes: number;
  successRate: number;
  abortRate: number;
  meanPromptTokensPerTurn: number;
  meanTokensPerTask: number;
  meanAgentTurns: number;
  /** M3 proxy: agent fires rejected by the session (typed) — stale/blind attempts. */
  rejectedAgentFires: number;
  /** M2: attribution probe accuracy (probes with a definite answer scored). */
  attributionAccuracy: number | null;
  probesAsked: number;
}

interface Transitionish {
  cause?: { principal?: string; kind?: string };
  outcome?: string;
}

export function aggregate(episodes: EpisodeLog[]): SubstrateAggregate[] {
  const kinds = [...new Set(episodes.map((e) => e.substrate))];
  return kinds.map((kind) => {
    const runs = episodes.filter((e) => e.substrate === kind);
    const agentTurns = runs.flatMap((e) => e.turns.filter((t) => t.toolCalls.length > 0 || t.text));
    const totalInput = runs.reduce(
      (sum, e) => sum + e.turns.reduce((s, t) => s + t.usage.input, 0),
      0,
    );
    const rejected = runs.reduce(
      (sum, e) =>
        sum +
        (e.transitions as Transitionish[]).filter(
          (t) => t.cause?.principal === 'agent' && t.outcome === 'rejected',
        ).length,
      0,
    );
    const probes = runs.flatMap((e) => e.probeAnswers);
    return {
      substrate: kind,
      episodes: runs.length,
      successRate: runs.length ? runs.filter((e) => e.success).length / runs.length : 0,
      abortRate: runs.length ? runs.filter((e) => e.aborted).length / runs.length : 0,
      meanPromptTokensPerTurn: agentTurns.length ? totalInput / agentTurns.length : 0,
      meanTokensPerTask: runs.length ? totalInput / runs.length : 0,
      meanAgentTurns: runs.length ? agentTurns.length / runs.length : 0,
      rejectedAgentFires: rejected,
      attributionAccuracy: probes.length ? probes.filter((p) => p.correct).length / probes.length : null,
      probesAsked: probes.length,
    };
  });
}

export function table(aggregates: SubstrateAggregate[]): string {
  const header =
    '| substrate | n | success | abort | tokens/turn | tokens/task | turns | rejected fires | attribution |';
  const sep = '|---|---|---|---|---|---|---|---|---|';
  const rows = aggregates.map((a) =>
    `| ${a.substrate} | ${a.episodes} | ${(a.successRate * 100).toFixed(0)}% | ${(a.abortRate * 100).toFixed(0)}% | ` +
    `${a.meanPromptTokensPerTurn.toFixed(0)} | ${a.meanTokensPerTask.toFixed(0)} | ${a.meanAgentTurns.toFixed(1)} | ` +
    `${a.rejectedAgentFires} | ${a.attributionAccuracy === null ? '—' : `${(a.attributionAccuracy * 100).toFixed(0)}% (${a.probesAsked})`} |`,
  );
  return [header, sep, ...rows].join('\n');
}
