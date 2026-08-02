import { post } from '../../content/registry';
import { PostView } from 'storydeck';
import { SiteChrome } from '../../components/SiteChrome';
import { CANONICAL, AUTHOR, AUTHOR_URL } from '../../site.config';

// The story deck — HACI Footprint telling its own story through the
// Read / Scroll / Watch lenses. This was the site's home until the relay
// homepage took the root URL; it keeps its own page (and its own chrome)
// rather than being retired, and the homepage footer links to it.
export const metadata = {
  title: 'The story deck — HACI Footprint',
  description: post.description,
  alternates: { canonical: `${CANONICAL}story/` },
};

export default function Story() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'HACI Footprint',
    alternateName: 'hcifootprint',
    description: post.description,
    url: `${CANONICAL}story/`,
    codeRepository: 'https://github.com/footprintjs/hcifootprint',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Node.js',
    license: 'https://opensource.org/licenses/MIT',
    keywords: 'LLM agent, MCP, navigation graph, interaction graph, agentic app, footprintjs',
    author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    maintainer: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    isPartOf: { '@type': 'SoftwareApplication', name: 'footprintjs', url: 'https://footprintjs.github.io/' },
  };
  return (
    <SiteChrome>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: post.deckCssScoped }} />
      {/* the page carries a deck — see the .deck-page block in globals.css */}
      <div className="deck-page"><PostView post={post} /></div>
    </SiteChrome>
  );
}
