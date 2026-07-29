/**
 * Hand-written declarations for lib/remark-doc-links.mjs (see doc-ids.d.mts for
 * why these exist). Node is typed loosely on purpose — the repo tests hand the
 * transformer a minimal mdast-shaped tree, not the full unified types.
 */
export declare function remarkDocLinks(): (
  tree: unknown,
  file?: { path?: string },
) => void;
export default remarkDocLinks;
