/**
 * THE COVERAGE GATE'S OWN GATE — what a `v8 ignore` is allowed to take with it.
 *
 * Coverage is enforced at 100% on all four metrics, and that number is only
 * worth anything if the denominator is honest. The remapper this project uses
 * (`ast-v8-to-istanbul`, via `@vitest/coverage-v8`) attaches an `ignore next`
 * hint to THE NEXT AST NODE — not to the next line. So an exemption written
 * above a `for` or a multi-line `if` silently removes the entire body from the
 * denominator, however large it is.
 *
 * That is not a hypothetical. One comment above one `?? []` in
 * `graph/sources/merge.ts` was exempting a 65-line validation loop containing
 * six `throw new GraphValidationError(...)` arms. Every one of them was
 * executed by tests — they simply were not being COUNTED, so deleting their
 * tests, or adding a brand-new untested branch beside them, could not move the
 * number off 100%. A gate that cannot go red is not a gate.
 *
 * THE RULE, and it is narrow on purpose: a COUNT-LESS `v8 ignore next` may not
 * sit above a line that opens a multi-line block. A count-less directive says
 * "the one thing below", so the one thing below has to be one thing — hoist the
 * expression into its own statement, or invert the `if` into a guard clause,
 * and the exemption lands where the comment says it does.
 *
 * A COUNTED directive (`v8 ignore next 4`) is exempt from this rule, because
 * there the author has written down that a block is what they mean. Worth
 * knowing while reading those: the count itself is NOT parsed by this remapper
 * — the regex captures only the `next` keyword — so `next 4` and `next` behave
 * identically. The number documents intent to a human; it constrains nothing.
 *
 * `v8 ignore else` is not covered here: it names a branch rather than a node,
 * and cannot swallow a body.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Every .ts file under src/, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

const files = sourceFiles('src');

/** A count-less `/* v8 ignore next *​/` — the form that means "the one node below". */
const COUNTLESS_IGNORE = /\/\*\s*v8 ignore next\s*(--[^*]*)?\*\//;

/**
 * Does this line open a block that continues below it? A trailing `{` is the
 * whole test: a statement that both opens and closes on one line has no body
 * underneath for an exemption to reach.
 */
const opensABlock = (line: string): boolean => line.trim().endsWith('{');

describe('a coverage exemption may not swallow a body', () => {
  it('scans the whole source tree', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  const offenders: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      if (!COUNTLESS_IGNORE.test(line)) continue;
      const next = lines[index + 1] ?? '';
      if (opensABlock(next)) {
        offenders.push(`${file}:${index + 1} exempts the block opened by: ${next.trim()}`);
      }
    }
  }

  it('no count-less directive sits above a multi-line block', () => {
    // Named, not counted: the failure has to say WHICH comment to move, or the
    // next person re-derives the whole investigation from a number.
    expect(offenders).toEqual([]);
  });

  it('and the directives that DO exist still carry a written reason', () => {
    // The `--` reason is what makes an exemption reviewable. Without it the
    // gate is being lowered by a comment nobody has to justify.
    const unexplained: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      for (const [index, line] of lines.entries()) {
        if (!/\/\*\s*v8 ignore/.test(line)) continue;
        if (!/v8 ignore[^*]*--\s*\S/.test(line)) {
          unexplained.push(`${file}:${index + 1}`);
        }
      }
    }
    expect(unexplained).toEqual([]);
  });
});
