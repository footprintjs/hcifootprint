import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Aliases must be ABSOLUTE FILESYSTEM paths resolved from this file. A
 * root-absolute '/src/…' looks like it works — `vite build` accepts it, because
 * Rollup resolves against the project root — but the DEV server's esbuild
 * pre-bundling resolves against the filesystem root and dies. `fileURLToPath`
 * is correct for both, and cross-platform (a bare `new URL(…).pathname` yields
 * '/C:/…' on Windows).
 */
const stub = (file: string): string => fileURLToPath(new URL(`./src/${file}`, import.meta.url));

/**
 * `base: './'` so the built bundle works from any path — a Pages
 * sub-directory, a preview server, a plain file open — without a rebuild.
 *
 * The one alias replaces a node builtin that rides in transitively from
 * agentfootprint and is tree-shaken to nothing. See src/stub-node-module.ts for
 * why the boundary is named rather than silenced.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      'node:module': stub('stub-node-module.ts'),
    },
  },
});
