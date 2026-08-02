/**
 * The API generator's pure helpers (scripts/gen-fumadocs-api.mjs). The script
 * itself runs TypeDoc; importing it must NOT (the CLI is guarded), so the
 * helpers are provable in isolation.
 *
 * Mutation proof: the multi-entry /index collapse is this port's own fix —
 * agentfootprint's single-entry original only collapsed the ROOT index, so
 * against that code the `/api/mcp/index` case below fails (the link keeps its
 * trailing /index and 404s on the served site).
 */
import { describe, expect, it } from 'vitest';
import { deriveTitle, rewriteLinks } from '../../scripts/gen-fumadocs-api.mjs';

describe('a generated page arrives with the title a reader should see in the sidebar', () => {
  it('strips the kind prefix and call parens', () => {
    expect(deriveTitle('# Function: buildNavigationGraph()\n\nbody', 'x')).toBe(
      'buildNavigationGraph',
    );
    expect(deriveTitle('# Interface: NavigationGraphDef\n', 'x')).toBe('NavigationGraphDef');
  });
  it('unescapes markdown and drops backticks', () => {
    expect(deriveTitle('# Type Alias: `Binding`\n', 'x')).toBe('Binding');
    expect(deriveTitle('# Variable: FOO\\_BAR\n', 'x')).toBe('FOO_BAR');
  });
  it('falls back to the filename when there is no H1', () => {
    expect(deriveTitle('no heading here', 'fallback-name')).toBe('fallback-name');
  });
});

describe('a generated cross-reference points at the route the site really serves', () => {
  it('strips .md from internal links, preserving anchors', () => {
    expect(rewriteLinks('[a](/api/index/classes/Foo.md#bar)')).toBe(
      '[a](/api/index/classes/Foo#bar)',
    );
  });
  it('collapses the root entry file to the api root', () => {
    expect(rewriteLinks('[a](/api/index)')).toBe('[a](/api)');
  });
  it('collapses EVERY module index to its folder route (multi-entry TypeDoc)', () => {
    expect(rewriteLinks('[m](/api/mcp/index)')).toBe('[m](/api/mcp)');
    expect(rewriteLinks('[l](/api/testing/lint/index#usage)')).toBe('[l](/api/testing/lint#usage)');
  });
  it('never touches external links', () => {
    const md = '[x](https://example.com/page.md) [y](https://example.com/api/index)';
    expect(rewriteLinks(md)).toBe(md);
  });
});
