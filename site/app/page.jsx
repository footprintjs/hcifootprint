import { post } from '../content/registry';
import { PostView } from 'storydeck';
import { CANONICAL, AUTHOR, AUTHOR_URL } from '../site.config';

// The HACI Footprint landing IS a storydeck post — the library telling its own story through the
// Read / Scroll / Watch lenses (write once, the reader chooses the lens).
export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'HACI Footprint',
    alternateName: 'hcifootprint',
    description: post.description,
    url: CANONICAL,
    codeRepository: 'https://github.com/footprintjs/hcifootprint',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Node.js',
    license: 'https://opensource.org/licenses/MIT',
    keywords: 'LLM agent, MCP, skill graph, interaction graph, agentic app, footprintjs',
    author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    maintainer: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    isPartOf: { '@type': 'SoftwareApplication', name: 'footprintjs', url: 'https://footprintjs.github.io/' },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: post.deckCssScoped }} />
      <PostView post={post} />
    </>
  );
}
