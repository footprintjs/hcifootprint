/**
 * Auto-generate the Fumadocs in-site API reference from TypeScript source via TypeDoc.
 *
 * ANTI-STALE CONTRACT: this script CLEANS and REGENERATES the API reference from
 * `src/` on every run, then post-processes the TypeDoc markdown to be Fumadocs-ready
 * (adds `title` frontmatter, rewrites internal links, writes sidebar meta.json).
 *
 * It runs as docs-next's `predev` / `prebuild`, so the published API reference is
 * ALWAYS rebuilt from the current source — a removed/renamed export can never leave
 * a stale page behind (the clean step deletes the old tree first).
 *
 * The generated `.md` files ARE committed (reviewable diff + the site builds without
 * re-running TypeDoc); the CI `docs` job runs `check:api` (regen + git diff
 * --exit-code) to enforce freshness — see .github/workflows/ci.yml.
 *
 * Unlike agentfootprint's single-entry setup, typedoc.docs-next.json declares ALL
 * FOUR public entry points (., ./mcp, ./testing, ./testing/lint) so the subpath
 * exports are documented too — the gap that forced af to grow a docs-truth ratchet
 * never opens here.
 *
 * Ported from agentfootprint; the pure helpers are exported and the run is guarded
 * so the repo test suite can prove title derivation and link rewriting without
 * executing TypeDoc.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // hcifootprint/
const OUT = path.join(ROOT, 'docs-next', 'content', 'docs', 'api');

/** Declaration-kind folders TypeDoc's markdown plugin emits. */
const FOLDER_TITLES = {
  classes: 'Classes',
  functions: 'Functions',
  interfaces: 'Interfaces',
  'type-aliases': 'Type Aliases',
  variables: 'Variables',
  enumerations: 'Enumerations',
  namespaces: 'Namespaces',
};

/** Entry-point module folders (multi-entry TypeDoc) → the import specifier they document. */
const MODULE_TITLES = {
  index: 'hcifootprint',
  mcp: 'hcifootprint/mcp',
  testing: 'hcifootprint/testing',
  'testing/index': 'hcifootprint/testing',
  'testing/lint': 'hcifootprint/testing/lint',
};

/** Strip TypeDoc's "Kind: Name()" H1 down to a clean sidebar/title string. */
export function deriveTitle(md, fallback) {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  if (!m) return fallback;
  let t = m[1].replace(/\\/g, '').replace(/`/g, '');
  t = t.replace(
    /^(Class|Function|Interface|Type Alias|Variable|Enumeration|Enum|Namespace|Module)\s*:\s*/i,
    '',
  );
  t = t.replace(/\(\)$/, '');
  return t.trim() || fallback;
}

/** Make TypeDoc's absolute `/api/...md` links Fumadocs-resolvable (no `.md`, collapse /index). */
export function rewriteLinks(md) {
  // strip `.md` from internal (non-http) link targets, preserving an optional #hash
  md = md.replace(
    /\]\((?!https?:)([^)\s#]*?)\.md(#[^)]*)?\)/g,
    (_, p, hash = '') => `](${p}${hash || ''})`,
  );
  // Collapse ANY trailing /index to the folder route, mirroring the Fumadocs
  // loader's own slug rule. Multi-entry TypeDoc links every module page as
  // /api/<module>/index (and the root as /api/index) — the file lives at that
  // path but the SERVED route is the folder, so an uncollapsed link 404s.
  md = md.replace(
    /\]\((\/api(?:\/[^)\s#]*)?)\/index(#[^)]*)?\)/g,
    (_, p, hash = '') => `](${p}${hash || ''})`,
  );
  return md;
}

function fumadocsify(dir) {
  for (const entry of readdirSync(dir)) {
    const fp = join(dir, entry);
    if (statSync(fp).isDirectory()) {
      fumadocsify(fp);
      continue;
    }
    if (!entry.endsWith('.md')) continue;
    let md = readFileSync(fp, 'utf8');
    const base = entry.replace(/\.md$/, '');
    const title = deriveTitle(md, base);
    md = rewriteLinks(md);
    const safeTitle = /[:#"'{}[\]]/.test(title) ? JSON.stringify(title) : title;
    md = `---\ntitle: ${safeTitle}\n---\n\n${md}`;
    writeFileSync(fp, md);
  }
}

/**
 * Sidebar meta.json for every folder in the generated tree. The root gets
 * Fumadocs' "root": true (its own sidebar tab); module folders are titled with
 * the import specifier they document; kind folders with their declaration kind.
 */
function writeMetas(dir, relFromOut = '') {
  const entries = readdirSync(dir).filter((e) => statSync(join(dir, e)).isDirectory());
  if (relFromOut === '') {
    writeFileSync(
      join(dir, 'meta.json'),
      JSON.stringify(
        {
          title: 'API Reference',
          // own sidebar tab (Fumadocs "root") — switcher: Docs | API Reference
          root: true,
          description: 'Auto-generated from TypeScript source.',
          pages: ['index', '...'],
        },
        null,
        2,
      ) + '\n',
    );
  } else {
    const title =
      MODULE_TITLES[relFromOut] ??
      FOLDER_TITLES[path.basename(relFromOut)] ??
      path.basename(relFromOut);
    writeFileSync(
      join(dir, 'meta.json'),
      JSON.stringify({ title, pages: ['...'] }, null, 2) + '\n',
    );
  }
  for (const e of entries) {
    writeMetas(join(dir, e), relFromOut === '' ? e : `${relFromOut}/${e}`);
  }
}

function main() {
  // 1. clean (the anti-stale guarantee)
  rmSync(OUT, { recursive: true, force: true });

  // 2. regenerate from source
  console.log('[api] running TypeDoc → Fumadocs markdown …');
  // execFileSync (no shell) — static args, no interpolation.
  execFileSync('node_modules/.bin/typedoc', ['--options', 'typedoc.docs-next.json'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  // 3. Fumadocs-ify every page (frontmatter + links)
  fumadocsify(OUT);

  // 4. sidebar meta.json for the whole tree
  writeMetas(OUT);

  console.log(`[api] done → ${path.relative(ROOT, OUT)}`);
}

// Run only as a CLI — importing the helpers (tests do) must never execute TypeDoc.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
