import 'storydeck/storydeck.css';
import './globals.css';
import { StoryDeckProvider, ThemeToggle } from 'storydeck';
import { BASE, SITE, CANONICAL, AUTHOR, AUTHOR_URL } from '../site.config';

const TITLE = 'HACI Footprint — turn your web app into an agentic app';
const DESC =
  "Turn a web app's interaction surface into a typed, traversable skill graph an LLM agent can plan over and act on — through your own buttons and handlers, as the signed-in user. The frontend sibling of footprintjs.";
const OG_IMAGE = `${SITE}${BASE}/og.png`;

export const metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  authors: [{ name: AUTHOR, url: AUTHOR_URL }],
  creator: AUTHOR,
  keywords: ['LLM agent', 'MCP', 'skill graph', 'interaction graph', 'agentic app', 'footprintjs', 'HCI', 'Model Context Protocol'],
  icons: { icon: `${BASE}/logo-foot.png`, apple: `${BASE}/logo-foot.png` },
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: 'website',
    siteName: 'HACI Footprint',
    title: TITLE,
    description: DESC,
    url: CANONICAL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'HACI Footprint — Human & Agent, Computer Interaction' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    site: '@1909sanjay',
    creator: '@1909sanjay',
    images: [OG_IMAGE],
  },
};

// Dark by default; flip to light only if the reader chose it. Runs before paint (no flash).
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light')t='dark';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#0a0a0b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#fbfaf8" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        <StoryDeckProvider basePath={BASE}>
          <a className="skip-link" href="#main">Skip to content</a>
          <header className="site-hd">
            <a className="brand" href={`${BASE}/`}>
              <img src={`${BASE}/logo-foot.png`} alt="" width={26} height={26} />
              <span>H<span className="a">A</span>CI&nbsp;Footprint</span>
            </a>
            <span className="sp" />
            <a className="nav" href="https://github.com/footprintjs/hcifootprint">GitHub</a>
            <a className="nav" href="https://www.npmjs.com/package/hcifootprint">npm</a>
            <a className="nav" href="https://footprintjs.github.io/">footprintjs</a>
            <ThemeToggle />
          </header>
          {children}
          <footer className="site-ft">
            <span className="built">Built by <a href={AUTHOR_URL}>{AUTHOR}</a></span> · open source ·{' '}
            <a href="https://github.com/footprintjs/hcifootprint/blob/main/LICENSE">MIT</a> · a{' '}
            <a href="https://footprintjs.github.io/">footprintjs</a> library
          </footer>
        </StoryDeckProvider>
      </body>
    </html>
  );
}
