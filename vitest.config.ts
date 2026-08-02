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
    // Coverage is enforced at 100% — a drop fails `npm run test:coverage`.
    // The sibling precedent is vizfootprint, where the same four thresholds
    // have held for a while: unreachable defensive arms carry a documented
    // `/* v8 ignore */` AT THE SITE, so an exemption is a sentence someone had
    // to write and a reader can argue with, never a silent gap in a number.
    coverage: {
      // *.ts, not `src/**`: every module directory carries a README.md, and the
      // bare glob hands those to the provider as if they were source — eight
      // parse-error stack traces on every run, for files that hold no code.
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.*', '**/types.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
