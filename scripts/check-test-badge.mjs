/**
 * THE BADGE GATE — the README states a test count, so the suite states it back.
 *
 * A number nobody can check is a claim like any other, and this one had drifted
 * to less than half the truth: the badge read 324 while the suite ran 806, and
 * commits kept editing the README around it. The library's own law says a fact
 * it cannot verify does not get asserted — the same law applies to the repo's
 * front door.
 *
 * Wiring: `npm test` writes the run's tally (vitest's json reporter →
 * .test-tally.json, gitignored) and npm's own `posttest` hook runs this. A
 * failing suite never reaches it (npm skips post-hooks after a failure), so the
 * number it compares is always a green run's.
 *
 * It only speaks for a WHOLE run. A focused `vitest run test/one.test.ts` tallies
 * one file, and a gate that failed on that would be a gate people learn to
 * ignore — fewer files on disk than ran means SKIP, said out loud, never a
 * guessed verdict.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TALLY = path.join(REPO, '.test-tally.json');
/** The vitest `include` globs, as directories. Keep in lockstep with vitest.config.ts. */
const SUITE_ROOTS = ['test', 'examples'];

/** Both places the README says the number: the badge image and its alt text. */
const BADGE_SRC = /tests-(\d+)%20passing/;
const BADGE_ALT = /alt="(\d+) tests passing"/;

/**
 * The pure verdict, so the gate itself is testable (test/docs/test-badge.test.ts).
 * Nothing here reads the filesystem — every input is handed in.
 */
export function checkTestBadge({ readme, tally, testFileCount }) {
  if (!tally) return { verdict: 'absent' };
  const ran = tally.numTotalTests;
  const files = Array.isArray(tally.testResults) ? tally.testResults.length : 0;
  if (files < testFileCount) return { verdict: 'partial', files, testFileCount };

  const src = BADGE_SRC.exec(readme);
  const alt = BADGE_ALT.exec(readme);
  if (!src || !alt) return { verdict: 'unreadable' };
  const badge = Number(src[1]);
  const spoken = Number(alt[1]);
  // The two must agree with each other as well as with the run: an alt text
  // saying something else is the version a screen reader is told.
  if (badge !== ran || spoken !== ran) return { verdict: 'drift', badge, spoken, ran };
  return { verdict: 'ok', badge, ran };
}

/** Every *.test.ts under the suite roots — the same set vitest would collect. */
export function countTestFiles(root = REPO, roots = SUITE_ROOTS) {
  let count = 0;
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.test.ts')) count += 1;
    }
  };
  for (const suiteRoot of roots) walk(path.join(root, suiteRoot));
  return count;
}

function main() {
  const readme = readFileSync(path.join(REPO, 'README.md'), 'utf8');
  const tally = existsSync(TALLY) ? JSON.parse(readFileSync(TALLY, 'utf8')) : undefined;
  const result = checkTestBadge({ readme, tally, testFileCount: countTestFiles() });

  switch (result.verdict) {
    case 'ok':
      console.log(`[badge] README says ${result.badge} tests; the run counted ${result.ran}. ✓`);
      return 0;
    case 'absent':
      console.log('[badge] no .test-tally.json — skipped (run `npm test`, which writes it).');
      return 0;
    case 'partial':
      console.log(
        `[badge] ${result.files} of ${result.testFileCount} test files ran — a partial run cannot count the suite. Skipped.`,
      );
      return 0;
    case 'unreadable':
      console.error('[badge] the README no longer carries a "tests-N passing" badge with matching alt text.');
      return 1;
    default:
      console.error(
        `[badge] DRIFT: the run counted ${result.ran} tests; the README badge says ${result.badge} ` +
          `(alt text: ${result.spoken}). Update both in README.md — a number nobody checks is not a fact.`,
      );
      return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main());
