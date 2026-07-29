/**
 * The badge gate (scripts/check-test-badge.mjs) — every verdict proven, plus
 * the live half: the REAL README must still carry a number a run can check.
 *
 * The rot it answers is dull and real. The badge said 324 while the suite ran
 * 806, two commits edited the README without noticing, and nothing in the repo
 * could have noticed for them. A count is a claim; this is the thing that reads
 * it back.
 *
 * What it must NOT do is fail a focused run — `vitest run test/one.test.ts`
 * tallies one file, and a gate that cried drift there is a gate people learn to
 * pass with `--no-post`. Fewer files ran than exist on disk means skip, said
 * out loud.
 *
 * Mutation proofs: drop the `files < testFileCount` guard and the partial-run
 * case below reports drift; compare only the image URL and the alt-text case
 * passes while a screen reader is told the old number; and the live assertion
 * fails against the README as it stood before this change.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkTestBadge, countTestFiles } from '../../scripts/check-test-badge.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readmeSaying = (badge: number, alt = badge): string =>
  `<img src="https://img.shields.io/badge/tests-${badge}%20passing?style=flat" alt="${alt} tests passing">`;
const tallyOf = (tests: number, files: number) => ({
  numTotalTests: tests,
  testResults: Array.from({ length: files }, () => ({})),
});

describe('the verdicts', () => {
  it('agreement is ok', () => {
    expect(checkTestBadge({ readme: readmeSaying(806), tally: tallyOf(806, 64), testFileCount: 64 })).toEqual({
      verdict: 'ok',
      badge: 806,
      ran: 806,
    });
  });

  it('a stale number is drift, and the message can name both', () => {
    expect(checkTestBadge({ readme: readmeSaying(324), tally: tallyOf(806, 64), testFileCount: 64 })).toEqual({
      verdict: 'drift',
      badge: 324,
      spoken: 324,
      ran: 806,
    });
  });

  it('an alt text that disagrees is drift too — that is the version a screen reader is told', () => {
    expect(checkTestBadge({ readme: readmeSaying(806, 324), tally: tallyOf(806, 64), testFileCount: 64 })).toMatchObject(
      { verdict: 'drift', badge: 806, spoken: 324 },
    );
  });

  it('a PARTIAL run is skipped, never judged', () => {
    expect(checkTestBadge({ readme: readmeSaying(806), tally: tallyOf(9, 1), testFileCount: 64 })).toEqual({
      verdict: 'partial',
      files: 1,
      testFileCount: 64,
    });
  });

  it('no tally at all is skipped — a run that never happened proves nothing', () => {
    expect(checkTestBadge({ readme: readmeSaying(806), testFileCount: 64 })).toEqual({ verdict: 'absent' });
  });

  it('a README with no badge is refused rather than passed by default', () => {
    expect(checkTestBadge({ readme: '# hcifootprint', tally: tallyOf(806, 64), testFileCount: 64 })).toEqual({
      verdict: 'unreadable',
    });
  });
});

describe('the live README', () => {
  it('still carries a badge this gate can read, in both places', () => {
    const readme = readFileSync(path.join(REPO, 'README.md'), 'utf8');
    const files = countTestFiles(REPO);
    // The count itself is compared post-run by the gate (a test cannot know the
    // suite's total from inside it). What a test CAN prove is that the claim is
    // still there to be compared, and that both spellings agree.
    const verdict = checkTestBadge({ readme, tally: tallyOf(1, files), testFileCount: files });
    expect(verdict.verdict).toBe('drift'); // 1 ≠ the real number — but readable
    expect(verdict).toMatchObject({ badge: expect.any(Number), spoken: expect.any(Number) });
    expect((verdict as { badge: number }).badge).toBe((verdict as { spoken: number }).spoken);
  });

  it('counts the same test files vitest collects', () => {
    expect(countTestFiles(REPO)).toBeGreaterThan(60);
  });
});
