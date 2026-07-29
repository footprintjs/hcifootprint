import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { createElement } from 'react';

export const source = loader({
  // '/' (not '/docs'): this whole app IS the docs and is mounted at
  // /hcifootprint/docs by the Pages basePath — a '/docs' baseUrl here would double
  // up to /hcifootprint/docs/docs/…. Must stay in lockstep with BASE_URL in
  // lib/doc-ids.mjs and the copy destination in .github/workflows/pages.yml.
  baseUrl: '/',
  source: docs.toFumadocsSource(),
  // Resolve `icon` strings in meta.json (folder groups) to lucide-react icons,
  // e.g. "icon": "Rocket".
  icon(icon) {
    if (!icon) return undefined;
    if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
    return undefined;
  },
});
