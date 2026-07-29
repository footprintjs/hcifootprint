import { defineConfig } from 'vitest/config';

/**
 * The demo's own suite. Node environment on purpose: every claim these tests
 * make is about the SESSION (registrations, refusals, gaps, receipts), never
 * about pixels — the browser half is verified by running the app. Vitest reads
 * this file in preference to vite.config.ts, so the React plugin and the
 * node-builtin stubs (browser-only concerns) stay out of the test run.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
