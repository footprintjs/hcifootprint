import { describe, expect, it } from 'vitest';
import { declareLifecycle } from '../src/index.js';

/**
 * LIFECYCLE — a declared state chart owning WHETHER, never WHEN. Node,
 * React, and the browser own time; this library lives inside hosts that
 * already do. What we adopt from those loops is the part worth adopting:
 * PUBLISHED phase names, so nobody debugs by guessing.
 */

describe('declareLifecycle — the chart is validated at declaration', () => {
  it('refuses a terminal state with an outgoing edge — a terminal never reopens', () => {
    expect(() =>
      declareLifecycle({
        name: 'reopenable',
        states: ['open', 'done'],
        terminals: ['done'],
        edges: [
          { from: 'open', to: 'done' },
          { from: 'done', to: 'open' },
        ],
      }),
    ).toThrow(/terminal never reopens; record late arrivals beside it instead/);
  });

  it('refuses unknown terminals, edges to undeclared states, and duplicate states', () => {
    expect(() =>
      declareLifecycle({ name: 'x', states: ['a'], terminals: ['b'], edges: [] }),
    ).toThrow(/unknown state 'b' terminal/);
    expect(() =>
      declareLifecycle({
        name: 'x',
        states: ['a'],
        terminals: [],
        edges: [{ from: 'a', to: 'ghost' }],
      }),
    ).toThrow(/touching an undeclared state/);
    expect(() =>
      declareLifecycle({ name: 'x', states: ['a', 'a'], terminals: [], edges: [] }),
    ).toThrow(/distinct states/);
  });

  it('an illegal move is a teaching refusal naming the legal ones', () => {
    const chart = declareLifecycle({
      name: 'review',
      states: ['draft', 'submitted', 'approved', 'rejected'],
      terminals: ['approved', 'rejected'],
      edges: [
        { from: 'draft', to: 'submitted' },
        { from: 'submitted', to: 'approved' },
        { from: 'submitted', to: 'rejected' },
      ],
    });
    expect(chart.initial).toBe('draft');
    expect(chart.isTerminal('approved')).toBe(true);
    expect(() => chart.assertMove('draft', 'approved')).toThrow(
      /From 'draft' the legal moves are: 'submitted'/,
    );
    expect(() => chart.assertMove('approved', 'draft')).toThrow(
      /'approved' is terminal — it never reopens/,
    );
    expect(() => chart.assertMove('draft', 'submitted')).not.toThrow();
  });

  it('an edge with `by` gates the move by principal; without it, the app said nothing', () => {
    const chart = declareLifecycle({
      name: 'gated',
      states: ['open', 'closed'],
      terminals: ['closed'],
      edges: [{ from: 'open', to: 'closed', by: ['user'] }],
    });
    expect(() => chart.assertMove('open', 'closed', 'agent')).toThrow(
      /belongs to 'user', not 'agent'/,
    );
    expect(() => chart.assertMove('open', 'closed')).toThrow(
      /and no principal was named/,
    );
    expect(() => chart.assertMove('open', 'closed', 'user')).not.toThrow();
  });
});
