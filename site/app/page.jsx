import './home.css';
import HomeClient from '../components/HomeClient';
import { code, lineCount, lineWord, version } from '../content/agent-map';
import { CANONICAL, AUTHOR, AUTHOR_URL } from '../site.config';

// The homepage: one journey told as a relay — a human drives, hands off to an
// agent at a single shared seam, and comes back to answer the gate. The seven
// scroll scenes then build the same story as a map that only ever accumulates.
// (The storydeck post that used to live here now has its own page at /story/.)
export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'hcifootprint',
    alternateName: 'HACI Footprint',
    description:
      'Put a map between your app and the agent: a typed, traversable skill graph an LLM can plan over, with every step recorded and consequential steps gated.',
    url: CANONICAL,
    codeRepository: 'https://github.com/footprintjs/hcifootprint',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Node.js',
    license: 'https://opensource.org/licenses/MIT',
    version,
    keywords: 'LLM agent, MCP, skill graph, interaction graph, agentic app, footprintjs',
    author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    maintainer: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
    isPartOf: { '@type': 'SoftwareApplication', name: 'footprintjs', url: 'https://footprintjs.github.io/' },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient version={version} code={code} lineCount={lineCount} lineWord={lineWord} />
    </>
  );
}
