/**
 * Internal-link checker for the Fumadocs site (docs-next/content/docs).
 *
 * ANTI-STALE CONTRACT: every internal reference in a hand-written doc must resolve, and
 * every "#anchor" must point at a real heading. A moved page or a reworded heading
 * therefore CANNOT leave a dead link behind — `npm run docs:links` fails CI first (and
 * test/docs/content-links.test.ts runs the same check inside `npm test`).
 *
 * Internal links come in two forms:
 *   • doc:<id>[#anchor]  — the PREFERRED, taxonomy-proof form (resolved by the build via
 *                          lib/remark-doc-links.mjs). Checked against the doc-id index.
 *   • /...[#anchor]      — a real path (e.g. linking into the auto-generated /api tree).
 *                          Checked against the route set.
 * Legacy/relative forms (../guides/x) are reported as broken — they should have been
 * converted to doc:<id>.
 *
 * Scope: hand-written .mdx (the auto-generated /api tree is a valid TARGET but not scanned
 * as a SOURCE — gen-fumadocs-api.mjs owns its links).
 *
 * THE README FRONT-DOOR GATE: the repo-root README links into the LIVE site by ABSOLUTE
 * URL. Two families live under https://footprintjs.github.io/hcifootprint/ —
 *   • the storydeck HOME ('' with optional ?view= query) — a separate static export this
 *     checker does not own; admitted as-is, never validated against docs routes;
 *   • the DOCS app mounted at docs/ — validated path+anchor against the same
 *     filesystem-derived route set, so a taxonomy move can never 404 the front page.
 * Anything else under /hcifootprint/ is broken by definition (there is no third export).
 * Sibling github.io sites (footPrint, the org root) are other repos — the mandatory
 * /hcifootprint/ boundary in the regex skips them.
 *
 * Ported from agentfootprint; the check itself is exported as `runLinkCheck` and the CLI
 * is guarded, so the repo test suite proves every refusal class against fixtures.
 *
 * Usage:  node scripts/check-doc-links.mjs [--strict]
 *   exit 0 = clean · exit 1 = broken links (always) or broken anchors (--strict)
 */
import { readFileSync } from 'node:fs';
import { relative, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildIdMap,
  buildRouteSet,
  walk,
  fileToRoute,
  headingSlugs,
  DOCS_ROOT,
  BASE_URL,
} from '../docs-next/lib/doc-ids.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_README = resolve(HERE, '..', 'README.md');

const LINK_RE = /\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const README_LINK_RE = /https:\/\/footprintjs\.github\.io\/hcifootprint\/([^\s)"'<>]*)/g;

/**
 * Run the whole check. Every path is parameterizable so tests can point it at
 * fixtures; the defaults are the live tree + the repo README.
 */
export function runLinkCheck({ docsRoot = DOCS_ROOT, readmePath = DEFAULT_README } = {}) {
  const idMap = buildIdMap(docsRoot);
  const routes = buildRouteSet(docsRoot);
  // Legit non-doc-page targets: the docs root plus the generated machine surfaces
  // (route handlers, not content files — buildRouteSet cannot see them).
  const APP_ROUTES = new Set(['/', BASE_URL, '/llms.txt', '/llms-full.txt']);
  const sources = walk(docsRoot).filter(
    (f) => !relative(docsRoot, f).replace(/\\/g, '/').startsWith('api/'),
  );
  const anchorsByRoute = new Map(); // real-path anchor lookups
  for (const f of walk(docsRoot)) {
    anchorsByRoute.set(fileToRoute(f, docsRoot), headingSlugs(readFileSync(f, 'utf8')));
  }

  const brokenPaths = [];
  const brokenAnchors = [];

  for (const file of sources) {
    const content = readFileSync(file, 'utf8');
    const selfRoute = fileToRoute(file, docsRoot);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      LINK_RE.lastIndex = 0;
      let m;
      while ((m = LINK_RE.exec(lines[i]))) {
        const raw = m[1];
        if (/^(https?:|mailto:|tel:|data:)/i.test(raw)) continue;
        if (/\.(png|svg|jpe?g|webp|gif|ico|pdf|mp4)$/i.test(raw)) continue;
        const where = `${relative(docsRoot, file)}:${i + 1}`;
        const [pathPart, anchor] = raw.split('#');

        let route, anchorSet;
        if (raw.startsWith('doc:')) {
          const id = pathPart.slice('doc:'.length);
          const entry = idMap.get(id);
          if (!entry) {
            brokenPaths.push({ where, raw, note: `unknown doc id "${id}"` });
            continue;
          }
          route = entry.route;
          anchorSet = entry.anchors;
        } else if (pathPart === '' || pathPart === undefined) {
          route = selfRoute; // pure "#anchor"
          anchorSet = anchorsByRoute.get(selfRoute);
        } else if (pathPart.startsWith('/')) {
          route = pathPart.replace(/\/$/, '') || '/';
          if (!routes.has(route) && !APP_ROUTES.has(route)) {
            brokenPaths.push({ where, raw, note: `no page at ${route}` });
            continue;
          }
          anchorSet = anchorsByRoute.get(route);
        } else {
          brokenPaths.push({ where, raw, note: 'relative/legacy link — convert to doc:<id>' });
          continue;
        }

        if (anchor && anchorSet && !anchorSet.has(anchor)) {
          brokenAnchors.push({ where, raw, note: `no #${anchor} on ${route}` });
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // README front-door gate (see the header for the two admitted URL families).
  let readmeLinks = 0;
  try {
    const readmeLines = readFileSync(readmePath, 'utf8').split('\n');
    for (let i = 0; i < readmeLines.length; i++) {
      README_LINK_RE.lastIndex = 0;
      let m;
      while ((m = README_LINK_RE.exec(readmeLines[i]))) {
        readmeLinks++;
        const where = `README.md:${i + 1}`;
        const [beforeAnchor, anchor] = m[1].split('#');
        // '?view=scrolly' etc. select a lens on the storydeck home — the path is ''.
        const path = beforeAnchor.split('?')[0];
        if (path === '') continue; // the storydeck home — not ours to validate
        if (path !== 'docs' && !path.startsWith('docs/')) {
          brokenPaths.push({
            where,
            raw: m[0],
            note: `not the storydeck home nor a docs route (/${path})`,
          });
          continue;
        }
        const route = '/' + path.slice('docs'.length).replace(/^\//, '').replace(/\/$/, '');
        const normalized = route === '/' ? '/' : route;
        if (!routes.has(normalized) && !APP_ROUTES.has(normalized)) {
          brokenPaths.push({ where, raw: m[0], note: `no page at ${normalized}` });
          continue;
        }
        const anchorSet = anchorsByRoute.get(normalized);
        if (anchor && anchorSet && !anchorSet.has(anchor)) {
          brokenAnchors.push({ where, raw: m[0], note: `no #${anchor} on ${normalized}` });
        }
      }
    }
  } catch (err) {
    brokenPaths.push({
      where: 'README.md',
      raw: readmePath,
      note: `could not read README (${err.code ?? err.message})`,
    });
  }

  return {
    brokenPaths,
    brokenAnchors,
    docCount: sources.length,
    idCount: idMap.size,
    routeCount: routes.size,
    readmeLinks,
  };
}

function main() {
  const STRICT = process.argv.includes('--strict');
  const r = runLinkCheck();
  const fmt = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  console.log(
    `Checked ${fmt(r.docCount, 'doc')} (${fmt(r.idCount, 'doc id')}, ${fmt(r.routeCount, 'route')}).`,
  );
  console.log(`Checked ${fmt(r.readmeLinks, 'README site link')} against the live route set.`);
  if (r.brokenPaths.length) {
    console.error(`\n✗ ${fmt(r.brokenPaths.length, 'broken link')}:`);
    for (const b of r.brokenPaths) console.error(`  ${b.where}  ${b.raw}   [${b.note}]`);
  }
  if (r.brokenAnchors.length) {
    console.error(`\n${STRICT ? '✗' : '⚠'} ${fmt(r.brokenAnchors.length, 'broken anchor')}:`);
    for (const b of r.brokenAnchors) console.error(`  ${b.where}  ${b.raw}   [${b.note}]`);
  }
  if (!r.brokenPaths.length && !r.brokenAnchors.length) console.log('✓ all internal links resolve.');

  process.exit(r.brokenPaths.length > 0 || (STRICT && r.brokenAnchors.length > 0) ? 1 : 0);
}

// Run only as a CLI — importing runLinkCheck (tests do) must never call process.exit.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
