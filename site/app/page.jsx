import './home.css';
import HomeClient from '../components/HomeClient';
import { code, lineCount, lineWord, version } from '../content/agent-map';
import { CANONICAL, AUTHOR, AUTHOR_URL, AUTHOR_SAMEAS, NPM_URL } from '../site.config';

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
    /* Both readings of the page, one sentence each. The page itself ships BOTH
       (CSS reveals one), so this description matches what a crawler actually
       finds in the markup rather than advertising only half of it. */
    description:
      'Put a map between your app and the agent: a typed, traversable navigation graph an LLM can plan over, with every step recorded and consequential steps gated. For product teams: let an AI agent use your app safely, without rebuilding it — the agent sees only what you declare, and anything consequential still stops for a human.',
    url: CANONICAL,
    codeRepository: 'https://github.com/footprintjs/hcifootprint',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Node.js',
    license: 'https://opensource.org/licenses/MIT',
    version,
    keywords:
      'LLM agent, MCP, Model Context Protocol, navigation graph, interaction graph, agentic app, ' +
      'AI agent frontend, agent-ready app, human in the loop, context engineering, footprintjs',
    author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL, sameAs: AUTHOR_SAMEAS },
    maintainer: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL, sameAs: AUTHOR_SAMEAS },
    /* npm is where the software is actually obtained, so it is named as the
       install target rather than left as a link buried in prose. */
    downloadUrl: NPM_URL,
    installUrl: NPM_URL,
    sameAs: [NPM_URL, 'https://github.com/footprintjs/hcifootprint'],
    isPartOf: { '@type': 'SoftwareApplication', name: 'footprintjs', url: 'https://footprintjs.github.io/' },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient version={version} code={code} lineCount={lineCount} lineWord={lineWord} />
    </>
  );
}
