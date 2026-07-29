/**
 * Browser stub for `node:fs/promises`.
 *
 * `agentfootprint/dist/esm/lib/tool-lint/cli.js` does a lazy
 * `await import('node:fs/promises')` inside a function — correct as shipped, and
 * tree-shaken out of this bundle. Vite still warns because it sees the
 * specifier statically. Same reason as the `node:module` stub: turn a build
 * warning into an explicit, self-naming failure if that path is ever reached.
 */
export function readFile(path: unknown): Promise<never> {
  return Promise.reject(
    new Error(
      `[live-desk] node:fs/promises.readFile("${String(path)}") was called in the browser. ` +
        `That is the agentfootprint tool-lint CLI path — Node-only, and not part of this app.`,
    ),
  );
}

export default { readFile };
