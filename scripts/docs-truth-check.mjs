#!/usr/bin/env node
/**
 * DOCS-TRUTH CHECK — "do the docs describe what the code actually does?"
 *
 * The method is agentfootprint's (scripts/docs-truth-check.mjs there), ported
 * to this package's shape. Two questions per exported symbol, kept apart
 * because their combinations are different bugs:
 *
 *   1. DECLARED   — is it in the SHIPPED public surface?
 *   2. DOCUMENTED — does a hand-written page describe it, in prose?
 *
 * ── DECLARED: why not TypeDoc ──────────────────────────────────────────────
 * TypeDoc runs from ONE entry point, so it sees the root barrel and nothing
 * else — every `hcifootprint/<subpath>` symbol is invisible to it. This package
 * has SIX entry points, so five of them would simply not exist as far as a
 * TypeDoc-shaped check is concerned. Instead we read package.json `exports`,
 * resolve each subpath to its shipped `.d.ts` under `dist/`, and enumerate the
 * exported symbols with the TypeScript checker, so `export *` chains resolve
 * exactly as a consumer's compiler sees them.
 *
 * Requires `npm run build` first: the surface being judged is what SHIPS, not
 * what happens to be in src.
 *
 * ── DOCUMENTED: the part that can silently lie ─────────────────────────────
 * Three docs locations, and they are NOT equivalent:
 *
 *   1. docs-next/content/docs/**.mdx, EXCLUDING api/ — hand-written. THE TRUTH
 *      SOURCE: what the published site renders and a reader actually reads.
 *   2. docs-next/content/docs/api/**  — TypeDoc-generated. EXCLUDED.
 *   3. README.md + docs/**.md         — repo prose. Tracked separately as
 *      "written, not published".
 *
 * (2) MUST be excluded because it is generated FROM the source: every exported
 * symbol appears there by construction. Counting it would mark everything
 * documented, make every gap vanish, and return a clean bill of health that
 * means nothing — false reassurance, which is worse than no check at all. The
 * report prints how many symbols WOULD have flipped, so the size of that trap
 * is visible rather than asserted.
 *
 * So DOCUMENTED is four-valued:
 *   site-prose      — named in prose (outside fenced code) on a hand-written
 *                     page. This alone counts as documented.
 *   site-code-only  — appears ONLY inside a code sample there. A reader
 *                     scanning the page never learns it exists.
 *   repo-only       — absent from the site, explained in README/docs prose.
 *   undocumented    — nowhere.
 *
 * ── The baseline ───────────────────────────────────────────────────────────
 * A number nobody checks is not a fact, so this gates. `--check` fails if the
 * documented set REGRESSES against docs/docs-truth/baseline.json; it never
 * fails for improving. Refresh deliberately with `--update-baseline`.
 *
 * Usage:
 *   node scripts/docs-truth-check.mjs                 # report
 *   node scripts/docs-truth-check.mjs --check         # gate (CI)
 *   node scripts/docs-truth-check.mjs --update-baseline
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'docs', 'docs-truth', 'baseline.json');
const args = new Set(process.argv.slice(2));

// ---------------------------------------------------------------------------
// 1. DECLARED — every symbol the package actually ships, per entry point
// ---------------------------------------------------------------------------

/** The entry points a consumer can import, from package.json `exports`. */
function entryPoints() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const out = [];
  for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
    const types = typeof value === 'string' ? value : value?.types ?? value?.import?.types;
    if (typeof types !== 'string') continue;
    out.push({ subpath, dts: path.join(ROOT, types) });
  }
  return out;
}

/**
 * The exported symbol names of one `.d.ts`, resolved through the checker so
 * `export *` re-export chains answer as a consumer's compiler would.
 */
function exportedSymbols(dts) {
  if (!existsSync(dts)) {
    console.error(`docs-truth: ${path.relative(ROOT, dts)} is missing — run \`npm run build\` first.`);
    process.exit(2);
  }
  const program = ts.createProgram([dts], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
  });
  const source = program.getSourceFile(dts);
  const checker = program.getTypeChecker();
  const moduleSymbol = source && checker.getSymbolAtLocation(source);
  if (!moduleSymbol) return [];
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((s) => s.getName())
    .filter((name) => name !== 'default' && !name.startsWith('_'))
    .sort();
}

// ---------------------------------------------------------------------------
// 2. DOCUMENTED — prose beats code samples; generated pages count for nothing
// ---------------------------------------------------------------------------

function walk(dir, filter, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, filter, acc);
    else if (filter(full)) acc.push(full);
  }
  return acc;
}

/** Text with fenced code blocks removed — what a reader actually reads. */
const proseOf = (text) => text.replace(/```[\s\S]*?```/g, ' ');

/** A whole-word hit, so `Session` does not match `InteractionSession`. */
function mentions(haystack, name) {
  return new RegExp(`(^|[^A-Za-z0-9_$])${name}([^A-Za-z0-9_$]|$)`).test(haystack);
}

function corpus() {
  const docsRoot = path.join(ROOT, 'docs-next', 'content', 'docs');
  const isMdx = (f) => f.endsWith('.mdx') || f.endsWith('.md');
  const generatedDir = path.join(docsRoot, 'api');

  const handWritten = walk(docsRoot, isMdx).filter((f) => !f.startsWith(generatedDir));
  const generated = walk(generatedDir, isMdx);
  const repoProse = [
    path.join(ROOT, 'README.md'),
    ...walk(path.join(ROOT, 'docs'), isMdx).filter((f) => !f.includes(`${path.sep}docs-truth${path.sep}`)),
  ].filter(existsSync);

  const read = (files) => files.map((f) => readFileSync(f, 'utf8')).join('\n');
  return {
    siteAll: read(handWritten),
    siteProse: proseOf(read(handWritten)),
    generated: read(generated),
    repoProse: proseOf(read(repoProse)),
  };
}

/** site-prose | site-code-only | repo-only | undocumented */
function statusOf(name, c) {
  if (mentions(c.siteProse, name)) return 'site-prose';
  if (mentions(c.siteAll, name)) return 'site-code-only';
  if (mentions(c.repoProse, name)) return 'repo-only';
  return 'undocumented';
}

// ---------------------------------------------------------------------------
// 3. Report
// ---------------------------------------------------------------------------

const c = corpus();
const rows = [];
for (const { subpath, dts } of entryPoints()) {
  for (const name of exportedSymbols(dts)) {
    rows.push({ name, subpath, status: statusOf(name, c) });
  }
}

// Deduplicate: a symbol re-exported from two entry points is ONE symbol to a
// reader, and its best status is the true one.
const RANK = { 'site-prose': 3, 'site-code-only': 2, 'repo-only': 1, undocumented: 0 };
const best = new Map();
for (const row of rows) {
  const prev = best.get(row.name);
  if (!prev || RANK[row.status] > RANK[prev.status]) best.set(row.name, row);
}
const symbols = [...best.values()].sort((a, b) => a.name.localeCompare(b.name));

const by = (status) => symbols.filter((s) => s.status === status);
const documented = by('site-prose');
const codeOnly = by('site-code-only');
const repoOnly = by('repo-only');
const missing = by('undocumented');

// The size of the trap, printed rather than asserted: how many symbols would
// have flipped to "documented" had the generated API pages been counted.
const wouldFlip = [...codeOnly, ...repoOnly, ...missing].filter((s) =>
  mentions(c.generated, s.name),
).length;

console.log(`\ndocs-truth — ${symbols.length} exported symbols across ${entryPoints().length} entry points\n`);
console.log(`  site-prose      ${String(documented.length).padStart(4)}   a reader learns it exists`);
console.log(`  site-code-only  ${String(codeOnly.length).padStart(4)}   only inside a sample`);
console.log(`  repo-only       ${String(repoOnly.length).padStart(4)}   written, not published`);
console.log(`  undocumented    ${String(missing.length).padStart(4)}`);
console.log(
  `\n  (counting the generated API pages would have flipped ${wouldFlip} of those to "documented" — which is why they are excluded)`,
);

const show = (label, list) => {
  if (list.length === 0) return;
  console.log(`\n${label}:`);
  for (const s of list) console.log(`  ${s.name}  ${s.subpath}`);
};
if (args.has('--verbose') || args.has('--check')) {
  show('UNDOCUMENTED', missing);
  show('SITE-CODE-ONLY (present, but a scanning reader never meets it)', codeOnly);
}

// ---------------------------------------------------------------------------
// 4. Baseline — improving is free; regressing fails
// ---------------------------------------------------------------------------

const snapshot = {
  documented: documented.map((s) => s.name),
  // The whole exported surface, so a later run can tell a NEW undocumented
  // symbol from one that was already undocumented when the baseline was taken.
  // Without it, "new and undocumented" is unanswerable and a rename's new half
  // arrives invisibly.
  surface: symbols.map((s) => s.name).sort(),
  counts: {
    total: symbols.length,
    'site-prose': documented.length,
    'site-code-only': codeOnly.length,
    'repo-only': repoOnly.length,
    undocumented: missing.length,
  },
};

if (args.has('--update-baseline')) {
  mkdirSync(path.dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`\n✓ baseline updated — ${documented.length} documented symbols recorded.`);
  process.exit(0);
}

if (args.has('--check')) {
  if (!existsSync(BASELINE)) {
    console.error('\n✗ no baseline. Run: node scripts/docs-truth-check.mjs --update-baseline');
    process.exit(1);
  }
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const nowDocumented = new Set(snapshot.documented);
  const lost = (base.documented ?? []).filter((n) => !nowDocumented.has(n) && best.has(n));

  // WHAT THIS GATE CANNOT SEE ON ITS OWN, said out loud rather than absorbed.
  //
  // `lost` deliberately ignores a symbol that left the SURFACE (`best.has(n)`):
  // demanding prose for a name the package no longer exports would fail the
  // build for deleting something, which is backwards. But a RENAME is exactly
  // that shape — the old name leaves the surface AND its prose in one move,
  // while the new name arrives with none — so a rename could pass this check
  // in perfect silence, which is the one release where prose drift is most
  // likely and least visible.
  //
  // So it is reported, never failed on. Deleting a documented symbol is a
  // legitimate move; doing it without noticing is not.
  const leftTheSurface = (base.documented ?? []).filter((n) => !best.has(n));
  if (leftTheSurface.length > 0) {
    console.log(`\n! ${leftTheSurface.length} documented symbol(s) LEFT THE SURFACE since the baseline:`);
    for (const n of leftTheSurface) console.log(`  ${n}`);
    console.log(
      '  Not a failure — a deleted export needs no prose. But if one of these was RENAMED,\n' +
        '  check that the new name is documented: this gate cannot tell the two apart.',
    );
  }
  const newAndUndocumented = missing
    .filter((s) => !(base.documented ?? []).includes(s.name))
    .filter((s) => !(base.surface ?? []).includes(s.name));
  if (newAndUndocumented.length > 0) {
    console.log(`\n! ${newAndUndocumented.length} symbol(s) are NEW to the surface and undocumented:`);
    for (const s of newAndUndocumented) console.log(`  ${s.name}  ${s.subpath}`);
    console.log('  Also not a failure — the undocumented count is a floor, not a gate.');
  }

  if (lost.length > 0) {
    console.error(`\n✗ ${lost.length} symbol(s) STOPPED being documented in prose:`);
    for (const n of lost) console.error(`  ${n}  (now: ${best.get(n).status})`);
    console.error('\nDocument them again, or update the baseline deliberately.');
    process.exit(1);
  }
  const gained = snapshot.documented.filter((n) => !(base.documented ?? []).includes(n));
  console.log(
    `\n✓ no documentation regressed${gained.length > 0 ? ` — and ${gained.length} newly documented` : ''}.`,
  );
}
