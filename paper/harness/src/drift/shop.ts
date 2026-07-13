/**
 * Drift axis — the system under test is `hcifootprint/testing` itself.
 *
 * The dress shop authored as a NavigationGraph SPEC (plain data, so mutation
 * operators can transform it before compile) + mock resolvers whose patches
 * are EXPLICIT (never derived from effect.writes — the whole point is that
 * the graph's claim and the mock's real delta stay independent), + the one
 * canonical journey used to score behavioral catches.
 */
import { buildNavigationGraph } from 'hcifootprint';
import type { NavigationGraph } from 'hcifootprint';
import type { Resolver, TestApp } from 'hcifootprint/testing';
import { DRESSES, searchDresses, filterByColor } from '../apps/dress-shop/data.js';

export interface ShopState extends Record<string, unknown> {
  resultIds: string[];
  resultCount: number;
  activeColor: string;
  selectedDressId: string;
  cartIds: string[];
  cartCount: number;
  lastOrderId: string;
  orderCount: number;
  orderStatus: string;
}

export const initialState: ShopState = {
  resultIds: [],
  resultCount: 0,
  activeColor: '',
  selectedDressId: '',
  cartIds: [],
  cartCount: 0,
  lastOrderId: '',
  orderCount: 0,
  orderStatus: '',
};

/** The spec as PLAIN DATA — deep-cloneable, mutation operators edit a copy. */
// deep structures below are edited by mutation operators via structuredClone
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ShopSpec = any;

export function shopSpec(): ShopSpec {
  return {
    does: 'A small mock dress store',
    pages: {
      home: {
        tools: {
          'browse-dresses': { does: 'Browse the dress catalog', goTo: 'catalog' },
        },
      },
      catalog: {
        tools: {
          'search-dresses': {
            does: 'Search dresses by name or color',
            writes: ['resultIds', 'resultCount'],
          },
          'filter-by-color': {
            does: 'Filter the current results by color',
            when: { resultCount: { gt: 0 } },
            writes: ['resultIds', 'resultCount', 'activeColor'],
          },
          'view-dress': {
            does: 'Open one dress from the results',
            when: { resultCount: { gt: 0 } },
            writes: ['selectedDressId'],
            goTo: 'product',
          },
        },
      },
      product: {
        tools: {
          'add-to-cart': {
            does: 'Add the open dress to the cart',
            when: { selectedDressId: { ne: '' } },
            writes: ['cartIds', 'cartCount'],
          },
        },
      },
      cart: {
        tools: {
          'proceed-to-checkout': {
            does: 'Proceed to checkout',
            when: { cartCount: { gt: 0 } },
            goTo: 'checkout',
          },
        },
      },
      checkout: {
        tools: {
          'place-order': {
            does: 'Place the order for everything in the cart',
            when: { cartCount: { gt: 0 } },
            writes: ['lastOrderId', 'orderCount', 'cartIds', 'cartCount'],
            confirm: true,
          },
        },
      },
      orders: {
        tools: {
          'check-order-status': {
            does: 'Look up the status of one order',
            when: { orderCount: { gt: 0 } },
            writes: ['orderStatus'],
          },
        },
      },
    },
    tools: {
      'go-to-cart': {
        on: ['catalog', 'product'],
        does: 'Open the shopping cart',
        when: { cartCount: { gt: 0 } },
        goTo: 'cart',
      },
      'view-orders': {
        on: ['home', 'catalog', 'cart', 'checkout'],
        does: 'Open your past orders',
        goTo: 'orders',
      },
    },
    skills: {
      'find-dress': {
        does: 'Find a dress: search the catalog, optionally filter by color, open one',
        steps: ['search-dresses', 'filter-by-color', 'view-dress'],
      },
      purchase: {
        does: 'Buy the open dress: add it to the cart and place the order',
        steps: ['add-to-cart', 'go-to-cart', 'proceed-to-checkout', 'place-order'],
      },
      'track-order': {
        does: 'Check on a past order',
        steps: ['view-orders', 'check-order-status'],
        when: { orderCount: { gt: 0 } },
      },
    },
  };
}

export function compileShop(spec: ShopSpec): NavigationGraph {
  return buildNavigationGraph('dress-shop', spec);
}

/** The mock APP: explicit patches + explicit router confirms. */
export function shopResolvers(): Record<string, Resolver<ShopState>> {
  let results = [] as typeof DRESSES;
  return {
    'browse-dresses': () => ({ goTo: 'catalog' }),
    'search-dresses': (payload) => {
      const { query } = (payload ?? {}) as { query?: string };
      results = searchDresses(query ?? '');
      return { patch: { resultIds: results.map((d) => d.id), resultCount: results.length } };
    },
    'filter-by-color': (payload) => {
      const { color } = (payload ?? {}) as { color?: string };
      results = filterByColor(results, color ?? '');
      return {
        patch: { resultIds: results.map((d) => d.id), resultCount: results.length, activeColor: color ?? '' },
      };
    },
    'view-dress': (payload) => {
      const { dressId } = (payload ?? {}) as { dressId?: string };
      return { patch: { selectedDressId: dressId ?? '' }, goTo: 'product' };
    },
    'add-to-cart': (_payload, { state }) => ({
      patch: { cartIds: [...state.cartIds, state.selectedDressId], cartCount: state.cartCount + 1 },
    }),
    'go-to-cart': () => ({ goTo: 'cart' }),
    'proceed-to-checkout': () => ({ goTo: 'checkout' }),
    'place-order': (_payload, { state }) => ({
      patch: {
        lastOrderId: `ord-${state.orderCount + 1}`,
        orderCount: state.orderCount + 1,
        cartIds: [],
        cartCount: 0,
      },
    }),
    'view-orders': () => ({ goTo: 'orders' }),
    'check-order-status': (payload, { state }) => {
      const { orderId } = (payload ?? {}) as { orderId?: string };
      const known = orderId !== undefined && Number(orderId.split('-')[1]) <= state.orderCount;
      return { patch: { orderStatus: known ? `${orderId}: processing` : `${orderId}: not found` } };
    },
  };
}

/**
 * The canonical journey — a full mixed user/agent pass over the shop.
 * Any assertion throw is a behavioral catch; the caller inspects report() too.
 */
export async function journey(app: TestApp<ShopState>): Promise<void> {
  await app.user.fire('browse-dresses');
  app.expectOn('catalog');
  await app.user.fire('search-dresses', { payload: { query: 'red' } });
  app.expectState({ resultCount: 2 });
  await app.user.fire('view-dress', { payload: { dressId: 'd3' } });
  app.expectOn('product');
  app.expectState({ selectedDressId: 'd3' });
  await app.user.fire('add-to-cart');
  app.expectState({ cartIds: ['d3'], cartCount: 1 });
  await app.user.fire('go-to-cart');
  app.expectOn('cart');
  await app.user.fire('proceed-to-checkout');
  app.expectOn('checkout');
  await app.agent.do('place-order', { confirm: true });
  app.expectState({ orderCount: 1, cartCount: 0, lastOrderId: 'ord-1' });
  await app.user.fire('view-orders');
  app.expectOn('orders');
  await app.user.fire('check-order-status', { payload: { orderId: 'ord-1' } });
  app.expectState({ orderStatus: 'ord-1: processing' });
}
