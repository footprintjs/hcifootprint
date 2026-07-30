/**
 * THE FRONTMATTER GATE — a docs page the site cannot PARSE is a page nobody reads.
 *
 * WHY THIS EXISTS. `npm run docs:links` walked 20 docs and 173 routes and said
 * "✓ all internal links resolve" about a tree whose docs site would not build at
 * all: one page's `description` was an unquoted YAML scalar containing a
 * colon-space, and YAML reads `key: value` inside a plain scalar as a NESTED
 * MAPPING. The whole Fumadocs build died on it — one line, every page gone. The
 * link checker cannot see it because it never parses frontmatter as YAML, and a
 * green gate over a broken site is the exact shape of a claim treated as a fact.
 *
 * WHY THE RULE AND NOT A PARSER. Asserting through a YAML library would pin the
 * suite to a package this repo does not declare (it is present only as a
 * transitive dependency of the docs site, which is not this package's tree). So
 * the ONE rule that actually bit is stated directly, in the terms an author can
 * act on: an unquoted value containing `: ` is not the sentence you wrote. The
 * cure is the same either way — quote the value.
 *
 * MUTATION PROOF: drop the surrounding quotes from `description:` in
 * serve/receipts.mdx (the exact state this test was written against) and the
 * case below goes red naming that file, one line, with the fix in the message.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT = path.join(REPO, 'docs-next', 'content');

/** Every .md/.mdx page under the docs content tree, repo-relative. */
function docPages(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) docPages(full, found);
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) found.push(full);
  }
  return found;
}

/** The frontmatter block's lines, or none when a page has no frontmatter. */
function frontmatterLines(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match ? match[1]!.split(/\r?\n/) : [];
}

/**
 * A plain (unquoted) YAML scalar that carries a colon-space — the one shape
 * that turns a sentence into a parse error.
 *
 * Continuation lines and list items are skipped: they are not `key: value`
 * pairs, so the rule does not apply to them and pretending it does would refuse
 * frontmatter that is perfectly valid.
 */
function unquotedColonSpace(line: string): { key: string; value: string } | undefined {
  const pair = /^([A-Za-z0-9_-]+):[ \t]+(.*)$/.exec(line);
  if (!pair) return undefined;
  const [, key, raw] = pair as unknown as [string, string, string];
  const value = raw.trim();
  // A quoted scalar can hold anything, which is the whole point of quoting it.
  if (/^["'].*["']$/.test(value)) return undefined;
  // A block scalar (`|`, `>`) has its own rules and is not a plain scalar.
  if (value.startsWith('|') || value.startsWith('>')) return undefined;
  return value.includes(': ') ? { key, value } : undefined;
}

describe('every docs page has frontmatter the site can parse', () => {
  const pages = docPages(CONTENT);

  it('finds the docs content tree at all (a passing gate over zero files is not a gate)', () => {
    expect(pages.length).toBeGreaterThan(100);
  });

  it('no frontmatter value is an unquoted scalar carrying a colon-space', () => {
    const broken: string[] = [];
    for (const page of pages) {
      for (const line of frontmatterLines(page)) {
        const hit = unquotedColonSpace(line);
        if (hit) {
          broken.push(
            `${path.relative(REPO, page)} — ${hit.key}: contains ': ' unquoted, so YAML reads it as a nested mapping and the docs build fails. Wrap the value in double quotes.`,
          );
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('the rule itself', () => {
  it('catches the line that broke the build', () => {
    expect(unquotedColonSpace('description: the agent’s own `confirm: true` crosses it')).toMatchObject({
      key: 'description',
    });
  });

  it('passes the same line once it is quoted', () => {
    expect(unquotedColonSpace('description: "the agent’s own `confirm: true` crosses it"')).toBeUndefined();
  });

  it('leaves ordinary frontmatter alone', () => {
    expect(unquotedColonSpace('title: Confirms & receipts')).toBeUndefined();
    expect(unquotedColonSpace('  - a list item: with a colon')).toBeUndefined();
    expect(unquotedColonSpace('a continuation line, no key at all')).toBeUndefined();
  });
});
