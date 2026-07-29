import { defineConfig } from 'vitest/config';

// Scope the suite to the library's own tests. paper/ hosts the research
// harness (its own package + suite, run from paper/harness) — without this
// include, a root `vitest run` would sweep paper/harness/test and fail on
// its uninstalled dependencies.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'examples/**/*.test.ts'],
    // The README badge states a test COUNT, and a number this repo cannot check
    // is a claim like any other (it sat at 324 while the suite ran 806). This is
    // the run's own tally, written for the `posttest` gate to read back —
    // scripts/check-test-badge.mjs. Gitignored, and only ever read by that gate.
    reporters: ['default', 'json'],
    outputFile: { json: '.test-tally.json' },
  },
});
