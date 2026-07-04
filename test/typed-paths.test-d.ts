/**
 * Type-level checks for buildNavigationGraph's typed node paths. This file is
 * NOT run — it must COMPILE (a bad path must be a type error). `npm run
 * typecheck` covers it. @ts-expect-error asserts the error exists.
 */
import { buildNavigationGraph } from '../src/index.js';

const graph = buildNavigationGraph('shop', {
  pages: {
    catalog: {
      areas: { 'filter-rail': { tools: { 'set-color': { does: 'Filter by color' } } } },
      tools: { 'add-to-cart': { does: 'Add' } },
    },
    checkout: {
      modals: { 'confirm-order': { tools: { 'place-order': { does: 'Place', confirm: true } } } },
    },
  },
});

const session = graph.createSession();

// Real paths compile:
session.registerToolGroup('catalog');
session.registerToolGroup('catalog.filter-rail');
session.registerToolGroup('checkout.confirm-order');
session.setVisible('checkout.confirm-order', true);
session.show('catalog');

// A typo is a COMPILE error — the whole point of the guardrail:
// @ts-expect-error 'catalog.filter-rai' is not a declared node path
session.registerToolGroup('catalog.filter-rai');
// @ts-expect-error 'ghost' is not a page
session.setVisible('ghost', true);
