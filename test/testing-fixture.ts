/**
 * Shared fixture for the hcifootprint/testing suites: a small, CLEAN dress-shop
 * navigation graph (lints with zero findings) plus its typed state. Stale
 * variants are built inline in the lint suite.
 */
import { buildNavigationGraph } from '../src/index.js';
import type { NavigationGraph } from '../src/index.js';

export interface ShopState extends Record<string, unknown> {
  cartCount: number;
}

/** A clean three-page shop: every page reachable, every guard key produced. */
export function shopGraph(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': { does: 'Add a dress to the cart', writes: ['cartCount'] },
          'go-to-cart': { does: 'Open the cart', when: { cartCount: { gt: 0 } }, goTo: 'cart' },
        },
      },
      cart: {
        tools: {
          checkout: { does: 'Proceed to checkout', when: { cartCount: { gt: 0 } }, goTo: 'checkout' },
          'back-home': { does: 'Back to the catalog', goTo: 'catalog', role: 'back' },
        },
      },
      checkout: {
        tools: {
          'place-order': {
            does: 'Place the order',
            when: { cartCount: { gt: 0 } },
            writes: ['cartCount'],
            confirm: true,
          },
          'back-cart': { does: 'Back to the cart', goTo: 'cart', role: 'back' },
        },
      },
    },
    skills: {
      purchase: {
        does: 'Buy the items in the cart',
        steps: ['add-to-cart', 'go-to-cart', 'checkout', 'place-order'],
      },
    },
  });
}

export const shopInitial: ShopState = { cartCount: 0 };
