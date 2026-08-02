/**
 * "Can this guard EVER be true?" — the operator-level reasoning behind the
 * linter's `unsatisfiable-guard` finding, proved one operator at a time.
 *
 * A control gated on a guard that no value can satisfy is a button that can
 * never light up. Nobody writes one on purpose; they arrive by edit — a bound
 * moved, an allow-list emptied, a status renamed on one side of a pair. This
 * reasoning is LITERAL (no state, no engine) and deliberately CONSERVATIVE: it
 * says "dead" only when the operators alone prove it, so a finding is never a
 * guess the team has to re-check by hand.
 *
 * The reasoning is reached the way a consumer reaches it — through `lintGraph`
 * over a real compiled graph — so every case below is also proof that the
 * compiler lets that operator pairing through in the first place.
 *
 * Mutation proofs: make the comparison arms stricter than footprint's coercive
 * evaluator and the cross-type case starts crying dead over a guard that
 * really passes; drop the "a finite candidate set decides it" pass and every
 * eq/in case below goes silent.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { lintGraph } from '../src/testing/index.js';
import type { LintFinding } from '../src/testing/index.js';

/** Lint one action gated on one key, and hand back the dead-guard verdict. */
function verdictFor(ops: Record<string, unknown>): LintFinding | undefined {
  const graph = buildNavigationGraph('g', {
    pages: {
      home: { actions: { act: { does: 'Act', when: { k: ops } as never, writes: ['k'] } } },
    },
  });
  return lintGraph(graph).find((f) => f.code === 'unsatisfiable-guard');
}

/** The parenthetical the finding gives as its reason. */
const reasonOf = (finding: LintFinding | undefined): string | undefined =>
  finding && /\((.*?)\)/.exec(finding.message)?.[1];

describe('an allow-list with nothing in it', () => {
  it('names `in: []` as a set no value can be a member of', () => {
    expect(reasonOf(verdictFor({ in: [] }))).toBe('in: [] can never match any value');
  });
});

describe('a numeric window with no room inside it', () => {
  it('names a lower bound that sits above the upper one', () => {
    expect(reasonOf(verdictFor({ gt: 5, lt: 3 }))).toBe('lower bound 5 is above upper bound 3');
  });

  it('flags bounds that meet at a point the exclusive side pushes out', () => {
    expect(reasonOf(verdictFor({ gt: 3, lte: 3 }))).toBe('bounds around 3 exclude every value');
    expect(reasonOf(verdictFor({ gte: 4, lt: 4 }))).toBe('bounds around 4 exclude every value');
  });

  it('leaves bounds that meet at a point BOTH sides include — exactly one value passes', () => {
    expect(verdictFor({ gte: 3, lte: 3 })).toBeUndefined();
  });

  it('leaves bounds it cannot compare as numbers rather than guessing at them', () => {
    expect(verdictFor({ gt: 'a', lt: 'z' })).toBeUndefined();
  });
});

describe('a finite set of candidate values, tested against every operator at once', () => {
  it('rules out the value `eq` demands when `ne` forbids that same value', () => {
    expect(reasonOf(verdictFor({ eq: 'paid', ne: 'paid' }))).toBe(
      'no value satisfies all of its operators at once',
    );
  });

  it('rules out an `eq` the allow-list does not contain', () => {
    expect(verdictFor({ eq: 'paid', in: ['draft', 'open'] })).toBeDefined();
  });

  it('rules out an allow-list every member of which the deny-list forbids', () => {
    expect(verdictFor({ in: ['a'], notIn: ['a'] })).toBeDefined();
  });

  it('rules out a candidate each comparison operator rejects', () => {
    expect(verdictFor({ eq: 5, ne: 9, gt: 100 })).toBeDefined(); // 5 is not above 100
    expect(verdictFor({ eq: 1, gte: 5 })).toBeDefined(); //         1 is not at or above 5
    expect(verdictFor({ eq: 10, lt: 3 })).toBeDefined(); //         10 is not below 3
    expect(verdictFor({ eq: 1, lte: 0 })).toBeDefined(); //         1 is not at or below 0
  });

  it('keeps testing the REST of the operators after one of them passes', () => {
    // In each pair the first operator is satisfied by the candidate and the
    // second is not — so a reader who stopped at the first "true" would call
    // every one of these guards live.
    expect(verdictFor({ eq: 1, notIn: [2], gt: 5 })).toBeDefined(); // notIn passes, gt does not
    expect(verdictFor({ eq: 5, gte: 1, ne: 5 })).toBeDefined(); //     gte passes, ne does not
    expect(verdictFor({ eq: 1, lt: 3, ne: 1 })).toBeDefined(); //      lt passes, ne does not
    expect(verdictFor({ eq: 1, lte: 3, ne: 1 })).toBeDefined(); //     lte passes, ne does not
  });

  it('says nothing about an open-ended guard, because nothing is provable there', () => {
    // No candidate set to decide over: `ne`/`notIn`/a lone bound leave infinitely
    // many values open, and the linter never cries dead over what it cannot prove.
    expect(verdictFor({ ne: 'paid' })).toBeUndefined();
    expect(verdictFor({ notIn: ['a', 'b'] })).toBeUndefined();
    expect(verdictFor({ gt: 0 })).toBeUndefined();
  });
});

describe('the reasoning compares the way the real evaluator compares', () => {
  it('accepts a cross-type guard footprint would really pass', () => {
    // footprint's evaluator coerces, so '5' > 3 is true at runtime. A stricter
    // rule here would report a dead control that works.
    expect(verdictFor({ eq: '5', gt: 3 })).toBeUndefined();
  });
});
