import { CANONICAL } from '../site.config';

// This site is a static export: there is no server to regenerate on request,
// so the file must be produced once at build time.
export const dynamic = 'force-static';


/**
 * The two real pages. 404 is deliberately absent — a sitemap is a list of what
 * is worth reading, and offering an error page as one is a small lie told to a
 * crawler. Listed by hand rather than walked from the filesystem, because this
 * site has two pages and a directory walk would quietly start advertising every
 * future scratch route the moment someone adds one.
 */
export default function sitemap() {
  return [
    { url: CANONICAL, changeFrequency: 'monthly', priority: 1 },
    { url: `${CANONICAL}story/`, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
