import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Aliases must be ABSOLUTE FILESYSTEM paths resolved from THIS file. A
 * root-absolute '/src/stub-node-module.ts' builds fine (Rollup resolves it
 * against the project root) but breaks `npm run dev`, because the dev server's
 * esbuild pre-bundling resolves it against the filesystem root. Same trap the
 * Cited demo documents (agentfootprint-demo/vite.config.ts).
 */
const stub = (file: string): string => fileURLToPath(new URL(`./src/${file}`, import.meta.url));

/**
 * Why the node-builtin stubs: agentfootprint's lazyRequire statically imports
 * `node:module`, and ANY import from `agentfootprint` pulls it in transitively.
 * It is browser-safe as shipped and tree-shaken to zero occurrences here; the
 * stubs only silence the externalization warning and make the boundary
 * EXPLICIT — a node-only path that is ever reached names itself instead of
 * surfacing as "createRequire is not exported by __vite-browser-external".
 *
 * `base: './'` so the built bundle works from any subdirectory (a demo is
 * usually served from one).
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      'node:module': stub('stub-node-module.ts'),
      'node:fs/promises': stub('stub-node-fs-promises.ts'),
    },
  },
});
