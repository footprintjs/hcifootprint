/**
 * lifecycle — a declared state chart, and the mover that enforces it.
 *
 * Node names its loop phases, React names mount/commit, the browser names
 * task/microtask/paint — and nobody debugs those systems by guessing,
 * because the phases are PUBLISHED. This is that idea without the part we
 * must not copy: those loops are SCHEDULERS that own time, and this library
 * lives inside hosts (React's commit, the browser's loop, a BE
 * orchestrator) that already own it. Two owners of time is a fight.
 *
 * So a chart owns WHETHER, never WHEN: states, edges, terminals, and who
 * may move them — declared as data, enforced by the mover, renderable by
 * any surface, pinned by tests that read the same table the code does.
 * An illegal move is a teaching refusal naming the legal ones.
 *
 * Deliberately shipped only WITH an enforcing consumer: a chart nobody's
 * mover consults is decoration, and a declaration nobody sees fire is the
 * disease this family keeps curing.
 * @internal
 */
import type { Principal } from '../atom/types.js';

export interface LifecycleEdge {
  readonly from: string;
  readonly to: string;
  /** Who may make this move. Omitted means the app said nothing — the
   *  refusal only exists where a list does, the same law `mayInvoke`
   *  follows. */
  readonly by?: readonly Principal[];
}

export interface LifecycleChart {
  readonly name: string;
  /** The first state is the initial one. */
  readonly states: readonly string[];
  readonly terminals: readonly string[];
  readonly edges: readonly LifecycleEdge[];
}

export interface Lifecycle {
  readonly chart: LifecycleChart;
  readonly initial: string;
  isTerminal(state: string): boolean;
  /** Refuses an illegal move with the legal ones named — never a boolean a
   *  caller can forget to check. */
  assertMove(from: string, to: string, by?: Principal): void;
}

export function declareLifecycle(chart: LifecycleChart): Lifecycle {
  const states = new Set(chart.states);
  if (states.size !== chart.states.length || chart.states.length === 0) {
    throw new TypeError(
      `hcifootprint: lifecycle '${chart.name}' needs a non-empty list of distinct states.`,
    );
  }
  const terminals = new Set(chart.terminals);
  for (const terminal of terminals) {
    if (!states.has(terminal)) {
      throw new TypeError(
        `hcifootprint: lifecycle '${chart.name}' marks unknown state '${terminal}' terminal.`,
      );
    }
  }
  for (const edge of chart.edges) {
    if (!states.has(edge.from) || !states.has(edge.to)) {
      throw new TypeError(
        `hcifootprint: lifecycle '${chart.name}' has an edge '${edge.from}' → '${edge.to}' touching an undeclared state.`,
      );
    }
    if (terminals.has(edge.from)) {
      // FIRST TERMINAL WINS is a chart property, not a per-consumer
      // convention: a terminal with an outgoing edge is a terminal in name
      // only, and everything built on "the terminal never reopens" —
      // late-evidence quotation included — would quietly stop being true.
      throw new TypeError(
        `hcifootprint: lifecycle '${chart.name}' gives terminal state '${edge.from}' an outgoing edge — a terminal never reopens; record late arrivals beside it instead.`,
      );
    }
  }
  const outgoing = new Map<string, LifecycleEdge[]>();
  for (const edge of chart.edges) {
    const list = outgoing.get(edge.from);
    if (list === undefined) outgoing.set(edge.from, [edge]);
    else list.push(edge);
  }
  return Object.freeze({
    chart,
    initial: chart.states[0]!,
    isTerminal: (state: string) => terminals.has(state),
    assertMove: (from: string, to: string, by?: Principal): void => {
      const edges = outgoing.get(from) ?? [];
      const edge = edges.find((candidate) => candidate.to === to);
      if (edge === undefined) {
        const legal = edges.map((candidate) => `'${candidate.to}'`).join(', ');
        throw new Error(
          `hcifootprint: lifecycle '${chart.name}' has no move '${from}' → '${to}'. ${
            edges.length === 0
              ? `'${from}' is ${terminals.has(from) ? 'terminal — it never reopens' : 'a dead end in this chart'}.`
              : `From '${from}' the legal moves are: ${legal}.`
          }`,
        );
      }
      if (edge.by !== undefined && (by === undefined || !edge.by.includes(by))) {
        throw new Error(
          `hcifootprint: lifecycle '${chart.name}' move '${from}' → '${to}' belongs to ${edge.by.map((p) => `'${p}'`).join(' or ')}${by === undefined ? ', and no principal was named' : `, not '${by}'`}.`,
        );
      }
    },
  });
}
