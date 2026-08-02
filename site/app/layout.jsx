import 'storydeck/storydeck.css';
import './globals.css';
import { StoryDeckProvider } from 'storydeck';
import { BASE, SITE, CANONICAL, AUTHOR, AUTHOR_URL } from '../site.config';

const TITLE = 'hcifootprint — put a map between your app and the agent';
const DESC =
  "Turn a web app's interaction surface into a typed, traversable navigation graph an LLM agent can plan over and act on — through your own buttons and handlers, as the signed-in user. The frontend sibling of footprintjs.";
const OG_IMAGE = `${SITE}${BASE}/og.png`;

export const metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  authors: [{ name: AUTHOR, url: AUTHOR_URL }],
  creator: AUTHOR,
  keywords: ['LLM agent', 'MCP', 'navigation graph', 'interaction graph', 'agentic app', 'footprintjs', 'HCI', 'Model Context Protocol'],
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

// The reader's own choice wins; when they have never chosen, the OS setting
// supplies the first guess. Runs before paint (no flash), and writes the class
// every stylesheet on the site keys off.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;

/* The audience choice, restored before paint for the same reason the theme is:
   a reader who chose the business reading last time must not watch the
   developer copy render and then swap. Technical is the default, and also the
   fallback if storage is unreadable — the un-classed state is a real state. */
const viewScript = `(function(){try{var v=localStorage.getItem('view');document.documentElement.classList.add(v==='view-product'?'view-product':'view-technical');}catch(e){document.documentElement.classList.add('view-technical');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: viewScript }} />
        <meta name="theme-color" content="#0a0a0b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#fbfaf8" media="(prefers-color-scheme: light)" />
      </head>
      <body>
        {/* Pages bring their own chrome: the homepage's header/footer are part of
            its design, and /story/ opts into the shared one via <SiteChrome>. */}
        <StoryDeckProvider basePath={BASE}>{children}</StoryDeckProvider>
      </body>
    </html>
  );
}
