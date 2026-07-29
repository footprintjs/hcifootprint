import { defineConfig } from 'vitest/config';

/**
 * The suite runs in plain node, on purpose: every module the tests exercise —
 * the graph, the store, the router, the mount controller, the panels, the
 * agent loop — is DOM-free by construction. React is a view over that core and
 * owns no behaviour worth asserting. A test that needs a browser would be a
 * signal that logic leaked into a component.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
