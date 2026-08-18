/**
 * The capability index in CLAUDE.md may omit, but must never lie.
 *
 * The table exists because a reader searches for the words THEY would use, finds
 * nothing, and builds a capability this library has shipped for releases. That
 * happened three times in one day, twice in this repo: "bind actions by role and
 * name instead of CSS selectors" was proposed while `ElementLocator` had been
 * exactly `{ role, name }` since 0.2.0, and a vocabulary for what moved the
 * cursor was proposed while `Cause` and `Principal` sat one screen away in the
 * same file. An index that cures that is only worth having if it is TRUE, and a
 * stale row pointing at a deleted file is worse than no row: it costs the reader
 * the same search plus a wrong turn.
 *
 * So: every path a row names must exist, and every symbol it names must appear in
 * the tree it points at. The table can still go out of date by OMISSION — nothing
 * cheap forces a new capability to add a row — and that is the honest limit,
 * stated rather than papered over.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** `| what you'd build | `symbol` | `path` | since |` */
function indexRows(): { symbol: string; where: string }[] {
  const md = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const rows: { symbol: string; where: string }[] = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| If you are') || line.startsWith('|---'))
      continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    const symbol = cells[2] ?? '';
    const where = (cells[3] ?? '').replace(/`/g, '');
    // A row may honestly have no home yet (another package, not yet landed).
    // `—` opts it out rather than inventing a path for the checker to pass.
    if (where === '' || where === '—') continue;
    rows.push({ symbol: symbol.replace(/`/g, ''), where });
  }
  return rows;
}

function textUnder(target: string): string {
  const full = join(ROOT, target);
  if (!existsSync(full)) return '';
  if (statSync(full).isFile()) return readFileSync(full, 'utf8');
  let out = '';
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) out += readFileSync(p, 'utf8');
    }
  };
  walk(full);
  return out;
}

/**
 * The symbols a row names, from a cell written for a human. `+` and `/` join
 * alternatives; anything in parentheses is the row's own aside ("one arm of
 * `Binding`", "written by `Session.reportGap`") and is prose, not a claim about
 * where the file lives. A dotted `Session.why` is checked by its last segment,
 * because that is the token the source actually contains.
 */
function symbolsOf(cell: string): string[] {
  return cell
    .replace(/\([^)]*\)/g, '')
    .split(/[+/]/)
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => (n.includes('.') ? (n.split('.').pop() as string) : n));
}

describe('the capability index names things that exist', () => {
  const rows = indexRows();

  // A silently empty parse — a changed table header, a reformatted row — would
  // pass every row below VACUOUSLY, and the suite would report a green index
  // that was never read. This is the one assertion that cannot be satisfied by
  // finding nothing.
  it('finds the table at all — a silently empty parse would pass every row', () => {
    expect(rows.length).toBeGreaterThan(20);
  });

  for (const { symbol, where } of rows) {
    it(`${symbol} really lives in ${where}`, () => {
      expect(existsSync(join(ROOT, where)), `${where} does not exist`).toBe(true);
      const haystack = textUnder(where);
      // A row may name several symbols; any one is enough to prove the pointer
      // still lands somewhere real. Requiring all of them would fail rows whose
      // second name is deliberately the neighbouring concept.
      const names = symbolsOf(symbol);
      const found = names.some((n) => haystack.includes(n));
      expect(found, `none of ${names.join(', ')} appears under ${where}`).toBe(true);
    });
  }
});
