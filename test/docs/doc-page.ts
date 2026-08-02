/**
 * A hand-written docs page, found by its STABLE ID rather than by its folder.
 *
 * WHY. The docs site links by id (`doc:receipts`) precisely so the taxonomy can
 * be reorganised without breaking anything — docs-next/lib/doc-ids.mjs derives
 * id → current route from the filesystem, and the id is the filename slug. The
 * SUITE was the one place that still hard-coded folders: two dozen literal
 * `docs-next/content/docs/<folder>/<page>.mdx` strings that went red the moment
 * the build/serve split became map/traversal/actions. A gate that breaks when
 * the sidebar is reorganised is not testing the thing it claims to test.
 *
 * So this resolves a page the same way the site does, and every content
 * assertion in the suite goes through it. Moving a page between context folders
 * is now invisible here; RENAMING one is still loud, which is correct — the id
 * is the contract.
 *
 * The api/ tree is excluded for the same reason doc-ids.mjs excludes it: it is
 * generated, and its pages carry colliding `index` slugs.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = path.join(REPO, 'docs-next', 'content', 'docs');

/** Every hand-written page under the docs content tree, absolute. */
function handWrittenPages(dir: string = DOCS, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (full === path.join(DOCS, 'api')) continue;
      handWrittenPages(full, found);
    } else if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
      found.push(full);
    }
  }
  return found;
}

/**
 * The repo-relative path of the page with this id (its filename slug).
 * Throws when no page — or more than one — answers to it, because both are
 * bugs a silent `undefined` would turn into a vacuously passing assertion.
 */
export function docPage(id: string): string {
  const matches = handWrittenPages().filter(
    (file) => path.basename(file).replace(/\.mdx?$/, '') === id,
  );
  if (matches.length === 0) {
    throw new Error(`[doc-page] no hand-written docs page has the id "${id}".`);
  }
  if (matches.length > 1) {
    throw new Error(
      `[doc-page] the id "${id}" is ambiguous:\n  ${matches
        .map((file) => path.relative(REPO, file))
        .join('\n  ')}`,
    );
  }
  return path.relative(REPO, matches[0]!).replace(/\\/g, '/');
}

/** The page's source text, found by id. */
export function readDocPage(id: string): string {
  return readFileSync(path.join(REPO, docPage(id)), 'utf8');
}
