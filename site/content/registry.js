import fs from 'node:fs';
import path from 'node:path';
import { assemblePost, scopeDeckCss } from 'storydeck';

// Loads the one post for this site (HACI Footprint explaining itself) — the same JSON-structure +
// Markdown-prose adapter the storydeck dogfood site and the footprintjs blog use.
const dir = path.join(process.cwd(), 'content', 'posts', 'hcifootprint');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function load() {
  const { sections, ...meta } = readJson(path.join(dir, 'post.json'));
  const deck = readJson(path.join(dir, 'deck-data.json'));
  const bodyMd = fs.readFileSync(path.join(dir, 'body.md'), 'utf8');
  const deckSlides = deck.sections.map((s) => ({ label: s.label, html: s.html }));
  const post = assemblePost({ meta, sections, bodyMd, deckSlides });
  post.deckCssScoped = scopeDeckCss(deck.deckCss); // scope :root/html,body → .deck-scope
  return post;
}

export const post = load();
