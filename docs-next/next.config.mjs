import { createMDX } from 'fumadocs-mdx/next';

// Static export for GitHub Pages is opt-in via EXPORT=true so local `dev`/`build`
// stay a normal Next app. basePath comes from NEXT_PUBLIC_BASE_PATH (also read by
// lib/site.ts `asset()` so public-asset URLs and the router base stay in sync).
//
// DEPLOY GEOMETRY (three constants that must agree — see also lib/doc-ids.mjs):
//   NEXT_PUBLIC_BASE_PATH = /hcifootprint/docs   (this app's mount point)
//   pages.yml copy step   = cp docs-next/out → site/out/docs
//   Fumadocs loader baseUrl = '/'                (lib/source.ts)
// The storydeck home (site/) exports with basePath /hcifootprint and this app with
// /hcifootprint/docs, so each keeps its _next/ under its own URL prefix — the two
// static exports can share one Pages artifact with zero collisions.
const isExport = process.env.EXPORT === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: {
    // Root = this app. The parent repo has its own lockfile; without an explicit
    // root Turbopack would try to infer a workspace root and warn. Nothing in the
    // app imports the library at runtime (twoslash resolves types via TS, not the
    // bundler), so the app directory is the correct bundling root.
    root: import.meta.dirname,
  },
  ...(isExport
    ? {
        output: 'export',
        basePath,
        // every route becomes a directory + index.html → GitHub Pages serves it cleanly
        trailingSlash: true,
        // no Next image optimization server on static hosting
        images: { unoptimized: true },
      }
    : {}),
};

const withMDX = createMDX();

export default withMDX(config);
