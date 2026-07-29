/**
 * Stable doc-ID index — the single source of truth shared by the build-time link
 * resolver (lib/remark-doc-links.mjs) and the CI link-checker (scripts/check-doc-links.mjs).
 *
 * WHY: hand-written guides link to each other by a STABLE ID, not a URL path
 * (`[Skills](doc:skills)`). The ID is the page's filename slug and never changes when
 * the page moves between taxonomy folders, so reorganizing the sidebar can never break a
 * link. The path SEGMENTS live only in the meta.json taxonomy; this module derives the
 * id -> current-route map from the filesystem, so there is no second list to keep in sync.
 *
 * Ported from agentfootprint. Every exported function takes an optional `root`
 * (defaulting to this repo's content tree) so the repo test suite can prove the
 * behaviors — duplicate-id refusal, api/ exclusion, index collapsing — against
 * small fixtures instead of only against today's real content.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DOCS_ROOT = resolve(HERE, '..', 'content', 'docs');
// '/' — this app is the whole site (mounted at /hcifootprint/docs by the Pages
// basePath). Must match the loader baseUrl in lib/source.ts; see next.config.mjs
// "DEPLOY GEOMETRY" for the three constants that move together.
export const BASE_URL = '/';

const isDoc = (n) => n.endsWith('.md') || n.endsWith('.mdx');

export function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (isDoc(name)) out.push(full);
  }
  return out;
}

/** filesystem path -> page route (mirrors fumadocs-core loader slug rules). */
export function fileToRoute(file, root = DOCS_ROOT) {
  let rel = relative(root, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  if (rel === 'index') return '/';
  return `/${rel}`;
}

/** filesystem path -> stable id (filename slug; `index` collapses to its folder name). */
export function fileToId(file, root = DOCS_ROOT) {
  const rel = relative(root, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
  const parts = rel.split('/');
  let leaf = parts[parts.length - 1];
  if (leaf === 'index') leaf = parts.length > 1 ? parts[parts.length - 2] : 'index';
  return leaf;
}

/** Heading slugs of a page, using the SAME github-slugger Fumadocs uses for ids. */
export function headingSlugs(content) {
  const slugger = new GithubSlugger();
  const slugs = new Set();
  const noFences = content.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');
  for (const line of noFences.split('\n')) {
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    let text = m[1];
    const explicit = /\{#([\w-]+)\}\s*$/.exec(text);
    if (explicit) {
      slugs.add(explicit[1]);
      text = text.replace(/\{#[\w-]+\}\s*$/, '');
    }
    text = text
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/\*([^*]*)\*/g, '$1')
      .replace(/_([^_]*)_/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim();
    if (text) slugs.add(slugger.slug(text));
  }
  return slugs;
}

/**
 * Build the id -> { route, file, anchors } index from hand-written docs.
 * The auto-generated /api tree is EXCLUDED (its pages have colliding `index`
 * slugs and are never linked by id; link to them with a real `/api/...` path).
 * Throws on a duplicate id so an accidental slug collision fails fast.
 */
export function buildIdMap(root = DOCS_ROOT) {
  const map = new Map();
  for (const file of walk(root)) {
    const rel = relative(root, file).replace(/\\/g, '/');
    if (rel.startsWith('api/')) continue;
    const id = fileToId(file, root);
    if (map.has(id)) {
      throw new Error(
        `[doc-ids] duplicate doc id "${id}":\n  ${map.get(id).file}\n  ${rel}\n` +
          `Rename one file — ids must be unique so doc:${id} is unambiguous.`,
      );
    }
    map.set(id, {
      route: fileToRoute(file, root),
      file: rel,
      anchors: headingSlugs(readFileSync(file, 'utf8')),
    });
  }
  return map;
}

/** Full route set (incl. /api) for validating real-path links. */
export function buildRouteSet(root = DOCS_ROOT) {
  const routes = new Set();
  for (const file of walk(root)) routes.add(fileToRoute(file, root));
  return routes;
}
