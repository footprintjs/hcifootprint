/**
 * A browser stand-in for `node:module`, and a NAMED boundary.
 *
 * `agentfootprint/dist/esm/lib/lazyRequire.js` statically imports `node:module`
 * (as a namespace, with call-time property access — the shape that is safe in a
 * browser), and any import from `agentfootprint` pulls it in transitively. It
 * is tree-shaken to zero real uses in this bundle; without a stub, Vite still
 * externalizes it and warns on every build, and any accidental future use would
 * surface as the opaque "createRequire is not exported by
 * __vite-browser-external".
 *
 * With this file, that path names ITSELF instead. The throw is the point: it
 * can only ever fire if browser code genuinely reached for a node-only API,
 * which is a bug to see, not to swallow.
 */
export function createRequire(): never {
  throw new Error(
    'onboarding-wizard: node:module.createRequire() was called in the browser. ' +
      'Something reached for a node-only code path; that path must not run here.',
  );
}

export default { createRequire };
