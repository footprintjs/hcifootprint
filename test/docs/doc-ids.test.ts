/**
 * The stable doc-ID index (docs-next/lib/doc-ids.mjs) — the single source of
 * truth the build-time link resolver AND the CI link checker both derive from.
 * These behaviors are what make `doc:<id>` links taxonomy-proof, so each gets
 * its own proof against fixtures, not just against today's real content.
 *
 * Mutation proofs: the module is new with this change (nothing resolved doc
 * ids before), and the fixture-root parameter is this port's own addition —
 * every test here fails against a tree without it. The duplicate-id throw and
 * the api/ exclusion are the two behaviors a careless refactor would drop
 * silently; both are pinned below.
 */
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildIdMap,
  buildRouteSet,
  fileToId,
  fileToRoute,
  headingSlugs,
} from '../../docs-next/lib/doc-ids.mjs';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const GOOD = path.join(FIXTURES, 'tree-good');
const DUP = path.join(FIXTURES, 'tree-dup');

describe('fileToRoute mirrors the Fumadocs loader slug rules (baseUrl "/")', () => {
  it('the tree root index collapses to /', () => {
    expect(fileToRoute(path.join(GOOD, 'index.mdx'), GOOD)).toBe('/');
  });
  it('a nested page keeps its folder path', () => {
    expect(fileToRoute(path.join(GOOD, 'guides', 'journeys.mdx'), GOOD)).toBe('/guides/journeys');
  });
  it('a folder index collapses to the folder route', () => {
    expect(fileToRoute(path.join(GOOD, 'guides', 'index.mdx'), GOOD)).toBe('/guides');
  });
});

describe('fileToId is the filename slug — stable across taxonomy moves', () => {
  it('a leaf file is its own id', () => {
    expect(fileToId(path.join(GOOD, 'guides', 'journeys.mdx'), GOOD)).toBe('journeys');
  });
  it('a folder index collapses to the folder name', () => {
    expect(fileToId(path.join(GOOD, 'guides', 'index.mdx'), GOOD)).toBe('guides');
  });
});

describe('headingSlugs uses the same slugger Fumadocs renders anchors with', () => {
  it('strips inline markup before slugging', () => {
    const slugs = headingSlugs('## The `merge` **order**\n');
    expect(slugs.has('the-merge-order')).toBe(true);
  });
  it('honours an explicit {#custom} id', () => {
    const slugs = headingSlugs('## Anything at all {#custom-id}\n');
    expect(slugs.has('custom-id')).toBe(true);
  });
  it('never reads headings out of fenced code blocks', () => {
    const slugs = headingSlugs('```md\n# not a heading\n```\n## Real\n');
    expect(slugs.has('not-a-heading')).toBe(false);
    expect(slugs.has('real')).toBe(true);
  });
});

describe('buildIdMap — the id index', () => {
  it('indexes hand-written pages with route + anchors', () => {
    const map = buildIdMap(GOOD);
    expect(map.get('journeys')?.route).toBe('/guides/journeys');
    expect(map.get('index')?.anchors.has('the-merge-order')).toBe(true);
  });

  it('EXCLUDES the generated api/ tree — its pages are never id targets', () => {
    const map = buildIdMap(GOOD);
    expect(map.has('generated')).toBe(false);
    // …while the route set still knows the page as a real-path TARGET:
    expect(buildRouteSet(GOOD).has('/api/generated')).toBe(true);
  });

  it('THROWS on a duplicate id so a slug collision fails fast, naming both files', () => {
    expect(() => buildIdMap(DUP)).toThrowError(/duplicate doc id "same"/);
  });
});
