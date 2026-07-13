import { defineConfig } from 'vitest/config';

// Scope the suite to the library's own tests. paper/ hosts the research
// harness (its own package + suite, run from paper/harness) — without this
// include, a root `vitest run` would sweep paper/harness/test and fail on
// its uninstalled dependencies.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'examples/**/*.test.ts'],
  },
});
