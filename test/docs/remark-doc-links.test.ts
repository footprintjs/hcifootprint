/**
 * The build-time `doc:<id>` resolver (docs-next/lib/remark-doc-links.mjs).
 * It memoises the REAL content tree on purpose — these tests double as a
 * guard that the ids the guides actually use keep existing.
 *
 * Mutation proof: the plugin is new with this change; before it, a doc: URL
 * passed through MDX untouched and shipped as a literal dead href.
 */
import { describe, expect, it } from 'vitest';
import { remarkDocLinks } from '../../docs-next/lib/remark-doc-links.mjs';

type Link = { type: 'link'; url: string; children: unknown[] };
const tree = (url: string) => ({
  type: 'root',
  children: [{ type: 'link', url, children: [] } as Link],
});

describe('doc:<id> links resolve to the live route at build time', () => {
  it('resolves a real guide id (and keeps the anchor)', () => {
    const t = tree('doc:quick-start#where-next');
    remarkDocLinks()(t);
    expect((t.children[0] as Link).url).toBe('/get-started/quick-start#where-next');
  });

  it('THROWS on an unknown id — a dead cross-reference can never ship', () => {
    const t = tree('doc:this-page-does-not-exist');
    expect(() => remarkDocLinks()(t)).toThrowError(/unknown doc id "this-page-does-not-exist"/);
  });

  it('leaves non-doc links alone', () => {
    const t = tree('/api');
    remarkDocLinks()(t);
    expect((t.children[0] as Link).url).toBe('/api');
  });
});
