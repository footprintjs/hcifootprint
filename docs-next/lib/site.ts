/**
 * Single source of truth for site-wide constants — consumed by the root metadata,
 * the layout links, and per-page canonical tags.
 *
 * `url` is the FULL deployed origin INCLUDING the GitHub-Pages mount point
 * (/hcifootprint/docs — the docs app is assembled UNDER the storydeck home at
 * /hcifootprint/, see next.config.mjs "DEPLOY GEOMETRY"). Absolute links built as
 * `SITE.url + path` are correct regardless of Next's basePath handling.
 */
export const SITE = {
  url: 'https://footprintjs.github.io/hcifootprint/docs',
  /** The storydeck home this docs app is mounted under — one level up. */
  home: 'https://footprintjs.github.io/hcifootprint/',
  name: 'hcifootprint',
  title: 'hcifootprint — web apps as typed skill graphs agents can operate',
  description:
    'hcifootprint (HACI Footprint) turns a web app’s interaction surface into a typed, traversable skill graph an LLM agent can plan over and act on — as the signed-in user, through the app’s own buttons and handlers. Built on footprintjs.',
  author: 'Sanjay', // display byline
  authorName: 'Sanjay Krishna Anbalagan', // full name — matches LICENSE + CITATION.cff
  authorUrl: 'https://github.com/sanjay1909',
  publisher: 'footprintjs',
  repo: 'https://github.com/footprintjs/hcifootprint',
  npm: 'https://www.npmjs.com/package/hcifootprint',
  keywords: [
    'hcifootprint',
    'HACI',
    'skill graph',
    'LLM agent',
    'MCP',
    'affordance',
    'interaction graph',
    'agent-operable UI',
    'footprintjs',
  ],
} as const;

/** Build an absolute site URL from a root-relative path (`/build/...`). */
export const abs = (path: string) => `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Deploy base path (GitHub-Pages mount point). Empty in local dev. Set via
 * NEXT_PUBLIC_BASE_PATH at the static-export build. Next prepends basePath to
 * <Link>/<Image>, but NOT to raw <img src> or client `fetch()` — so use `asset()`
 * for public/ assets and any hand-built fetch URL (e.g. the static search index).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const asset = (path: string) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
