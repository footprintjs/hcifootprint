/**
 * Browser stub for `node:module`.
 *
 * `agentfootprint/dist/esm/lib/lazyRequire.js` statically imports this builtin
 * (namespace import, call-time property access), and ANY import from
 * `agentfootprint` pulls it in transitively. Merely importing it is harmless
 * and Rollup tree-shakes it out, because nothing on the mock/browser-provider
 * path calls it. The stub exists so the boundary is EXPLICIT: a node-only
 * adapter reached from the browser names itself instead of surfacing as
 * "createRequire is not exported by __vite-browser-external".
 */
export function createRequire(): (specifier: string) => never {
  return (specifier: string): never => {
    throw new Error(
      `[live-desk] node-only dependency requested in the browser: "${specifier}". ` +
        `This app uses only the browser-safe providers (mock / browserAnthropic / browserOpenai) ` +
        `from 'agentfootprint/llm-providers'.`,
    );
  };
}

export default { createRequire };
