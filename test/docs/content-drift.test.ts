/**
 * THE CONTENT GATE — a doc that QUOTES the library must quote what the library
 * actually says, and a page that exists must be reachable.
 *
 * The link checker already proves every internal link resolves. It cannot see
 * the other two ways docs rot: a page nobody wired into the sidebar, and a
 * sentence copied out of the source that the source has since reworded. Both
 * have exactly one honest cure — assert against the real thing.
 *
 * Mutation proofs: every assertion below fails against the tree as it stood
 * before this documentation change — the two new pages are absent from their
 * meta.json files, the merge-order sentence lacks its link-tools clause in the
 * homes that had not been amended, and no page quoted the verify refusal, the
 * no-input refusal or the anti-narration line at all.
 *
 * NOT gated: docs/design/*.md. Those are dated records of what a numbered
 * design decided at the time ("Status: SHIPPED (0.4.x line)"); amending the
 * sentence inside one would falsify the record rather than update a doc.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNavigationGraph } from '../../src/index.js';
import { VERIFY_FAILED_EXPLANATION } from '../../src/traverse/verify.js';
import { checkNoInput } from '../../src/traverse/payload-shape.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = path.join(REPO, 'docs-next', 'content', 'docs');

const read = (relative: string): string => readFileSync(path.join(REPO, relative), 'utf8');
/** Prose compared as PROSE: line wrapping and comment markers are formatting, not meaning. */
const flatten = (text: string): string => text.replace(/[*>"]/g, ' ').replace(/\s+/g, ' ').trim();

describe('the sidebar and the filesystem agree', () => {
  const sections = ['get-started', 'build', 'serve', 'reference'];

  it.each(sections)('%s: every listed page exists and every page is listed', (section) => {
    const meta = JSON.parse(read(`docs-next/content/docs/${section}/meta.json`)) as { pages: string[] };
    // A meta entry may be a markdown link out of the tree ('[API Reference](/api)').
    const listed = meta.pages.filter((page) => !page.startsWith('['));
    const onDisk = readdirSync(path.join(DOCS, section))
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => name.replace(/\.mdx$/, ''));
    expect([...listed].sort()).toEqual([...onDisk].sort());
  });

  it('the two pages this change adds are wired where they were asked for', () => {
    const build = JSON.parse(read('docs-next/content/docs/build/meta.json')) as { pages: string[] };
    const serve = JSON.parse(read('docs-next/content/docs/serve/meta.json')) as { pages: string[] };
    expect(build.pages).toContain('guarded-journeys');
    expect(build.pages.indexOf('guarded-journeys')).toBe(build.pages.indexOf('skills') + 1);
    expect(serve.pages.indexOf('grounding')).toBe(serve.pages.indexOf('receipts') + 1);
  });
});

describe('the merge order is ONE sentence, identical in every home that quotes it', () => {
  // Every live surface that prints it as current law. The docs page, the public
  // type it documents, the module that enforces it, the source-kind types, the
  // demo that runs it, and the suite that asserts it.
  const homes = [
    'docs-next/content/docs/build/graph-sources.mdx',
    'src/tree/types.ts',
    'src/graph/sources/merge.ts',
    'src/graph/sources/types.ts',
    'demos/onboarding-wizard/README.md',
    'demos/onboarding-wizard/src/app/graph.ts',
    'test/merge-sources.test.ts',
  ];

  /** The sentence itself, however the file happens to wrap or comment it. */
  const sentenceIn = (relative: string): string => {
    const flat = flatten(read(relative));
    const start = flat.indexOf('Pages first');
    const end = flat.indexOf('hand-authored tools win');
    expect(start, `${relative} does not quote the merge order`).toBeGreaterThanOrEqual(0);
    expect(end, `${relative} is missing the link-tools clause`).toBeGreaterThan(start);
    return flat.slice(start, end + 'hand-authored tools win'.length);
  };

  it('all seven homes carry byte-identical prose, link-tools clause included', () => {
    const [first, ...rest] = homes.map(sentenceIn);
    expect(first).toContain('Routes may also contribute link tools; hand-authored tools win');
    for (const [index, sentence] of rest.entries()) {
      expect(sentence, `${homes[index + 1]} drifted from ${homes[0]}`).toBe(first);
    }
  });
});

describe('a doc that quotes a refusal quotes the refusal the library emits', () => {
  const sessions = flatten(read('docs-next/content/docs/serve/sessions.mdx'));
  const journeys = flatten(read('docs-next/content/docs/build/guarded-journeys.mdx'));
  const grounding = flatten(read('docs-next/content/docs/serve/grounding.mdx'));
  const graph = flatten(read('docs-next/content/docs/build/navigation-graph.mdx'));

  it('the verify refusal sentence is the authored constant', () => {
    expect(sessions).toContain(flatten(VERIFY_FAILED_EXPLANATION));
    expect(journeys).toContain(flatten(VERIFY_FAILED_EXPLANATION));
  });

  it("the input:'none' refusal is what checkNoInput actually says", () => {
    const refusal = checkNoInput({ value: '' });
    expect(refusal.ok).toBe(false);
    expect(graph).toContain(flatten(refusal.ok ? '' : refusal.issues));
  });

  it('the facts header and the anti-narration line are the session’s own words', () => {
    const session = buildNavigationGraph('gate', { pages: { home: {} } }).createSession();
    const facts = session.groundTruth().text;
    const header = flatten(facts.split('\n')[0]);
    const nothingAttempted = 'No actions have been performed in this app this session.';

    expect(facts).toContain(nothingAttempted); // the library still says it…
    expect(journeys).toContain(header); // …and the pages quote it verbatim
    expect(journeys).toContain(nothingAttempted);
    expect(grounding).toContain(nothingAttempted);
    // The ranking clause is the part that makes the block a floor, not an opinion.
    expect(grounding).toContain(
      'these lines are what actually happened; the conversation is a claim about them',
    );
  });

  it('the dead-end warning names the same three fixes the docs name', () => {
    const warnings: string[] = [];
    const graphWithNothing = buildNavigationGraph('trap', {
      pages: { home: { tools: { look: { does: 'Look around' } } }, empty: {} },
    });
    const session = graphWithNothing.createSession({
      node: 'home',
      navigate: () => {
        /* armed: materialisation is a live question */
      },
      onWarn: (message) => warnings.push(message),
    });
    session.sync('empty');

    expect(warnings).toHaveLength(1);
    const liveBindings = read('docs-next/content/docs/build/live-bindings.mdx');
    for (const fix of ['registerToolGroup', 'navigate:', 'crossLinks: true']) {
      expect(warnings[0]).toContain(fix);
      expect(liveBindings).toContain(fix);
    }
  });
});
