import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { SITE, asset } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: '%s · hcifootprint',
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.authorName, url: SITE.authorUrl }],
  creator: SITE.authorName,
  publisher: SITE.publisher,
  category: 'technology',
  alternates: { canonical: `${SITE.url}/` },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        {/* Static (client-side Orama) search over the prerendered /static.json index.
            `api` is basePath-aware: the static client uses a raw fetch() that Next does
            NOT prefix, so we build the URL via asset() for the GitHub-Pages sub-path. */}
        <RootProvider search={{ options: { type: 'static', api: asset('/static.json') } }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
