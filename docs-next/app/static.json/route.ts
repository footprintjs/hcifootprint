import { source } from '@/lib/source';
import { createSearchAPI } from 'fumadocs-core/search/server';
import type { AdvancedIndex } from 'fumadocs-core/search/server';

// Static search index for the exported (GitHub Pages) site. Prerendered to a single
// /static.json file at build; the search dialog loads it client-side (Orama).
// `revalidate = false` + staticGET makes it a fully static asset (no server needed).
export const revalidate = false;

const indexes: AdvancedIndex[] = source.getPages().map((page) => ({
  id: page.url,
  title: page.data.title ?? '',
  description: page.data.description,
  url: page.url,
  structuredData: page.data.structuredData,
}));

export const { staticGET: GET } = createSearchAPI('advanced', {
  language: 'english',
  indexes,
});
