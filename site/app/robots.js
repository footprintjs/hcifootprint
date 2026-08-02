import { CANONICAL } from '../site.config';

// This site is a static export: there is no server to regenerate on request,
// so the file must be produced once at build time.
export const dynamic = 'force-static';


/**
 * Everything here is public and meant to be read, so nothing is disallowed —
 * this file exists to point crawlers at the sitemap rather than to hide
 * anything from them.
 */
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${CANONICAL}sitemap.xml`,
  };
}
