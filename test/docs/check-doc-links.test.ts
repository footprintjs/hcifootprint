/**
 * The link checker (scripts/check-doc-links.mjs) — every refusal class proven
 * against fixtures, plus the live gate: the REAL content tree and the REAL
 * README must be clean, which wires the checker into `npm test` itself (the
 * packet's "link checker wired into the gate"), not only into the CI job.
 *
 * Mutation proofs: runLinkCheck is this port's own extraction (the af original
 * is CLI-only — importing it would process.exit), and the README front-door
 * gate's two-family geometry (storydeck home admitted as-is, docs/ validated,
 * anything else refused) is new with this repo: against the af original every
 * fixture below either exits the process or mis-classifies the home URL as a
 * broken docs route.
 */
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runLinkCheck } from '../../scripts/check-doc-links.mjs';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const GOOD = path.join(FIXTURES, 'tree-good');
const BROKEN = path.join(FIXTURES, 'tree-broken');

describe('a clean tree + a clean README pass', () => {
  it('resolves doc: ids, self anchors, absolute paths and api targets; skips externals/images', () => {
    const r = runLinkCheck({
      docsRoot: GOOD,
      readmePath: path.join(FIXTURES, 'readme-good.md'),
    });
    expect(r.brokenPaths).toEqual([]);
    expect(r.brokenAnchors).toEqual([]);
    // api/ is a valid TARGET but not a scanned SOURCE:
    expect(r.docCount).toBe(2);
    // all 5 /hcifootprint/ URLs are checked; the sibling footPrint site is not:
    expect(r.readmeLinks).toBe(5);
  });
});

describe('every refusal class fires', () => {
  const r = runLinkCheck({
    docsRoot: BROKEN,
    readmePath: path.join(FIXTURES, 'readme-broken.md'),
  });
  const notes = (list: { note: string }[]) => list.map((b) => b.note);

  it('an unknown doc id is a broken link', () => {
    expect(notes(r.brokenPaths)).toContain('unknown doc id "nope"');
  });
  it('a dead absolute path is a broken link', () => {
    expect(notes(r.brokenPaths)).toContain('no page at /missing/page');
  });
  it('a relative/legacy link is refused by policy', () => {
    expect(notes(r.brokenPaths)).toContain('relative/legacy link — convert to doc:<id>');
  });
  it('a dead anchor is reported separately (strict-only failure)', () => {
    expect(notes(r.brokenAnchors)).toContain('no #not-here on /a');
  });

  it('README: a dead docs route is a broken link', () => {
    expect(notes(r.brokenPaths)).toContain('no page at /missing-page');
  });
  it('README: an unknown third export under /hcifootprint/ is refused', () => {
    expect(notes(r.brokenPaths)).toContain(
      'not the storydeck home nor a docs route (/mystery-export/thing)',
    );
  });
  it('README: a dead anchor on a real docs route is reported', () => {
    expect(notes(r.brokenAnchors)).toContain('no #no-such-anchor on /a');
  });
});

describe('THE LIVE GATE — the shipped content and README are clean right now', () => {
  it('zero broken links and zero broken anchors in docs-next/content + README.md', () => {
    const r = runLinkCheck();
    expect(r.brokenPaths).toEqual([]);
    expect(r.brokenAnchors).toEqual([]);
    // the taxonomy really is being scanned (guards against an empty-walk bug
    // reporting a hollow green):
    expect(r.docCount).toBeGreaterThanOrEqual(15);
    expect(r.readmeLinks).toBeGreaterThanOrEqual(4);
  });
});
