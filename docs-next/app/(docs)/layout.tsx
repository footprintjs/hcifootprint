import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import type { ReactNode } from 'react';
import { BookText, Braces } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      sidebar={{
        // The Docs | API Reference switcher at the top of the sidebar. The api
        // folder's generated meta.json declares "root": true, so the API tree is
        // its own tab and never crowds the hand-written taxonomy.
        tabs: [
          {
            title: 'Docs',
            description: 'Guides & concepts',
            url: '/',
            icon: <BookText className="size-4" />,
          },
          {
            title: 'API Reference',
            description: 'Auto-generated from source',
            url: '/api',
            icon: <Braces className="size-4" />,
          },
        ],
      }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
