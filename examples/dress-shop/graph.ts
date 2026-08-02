/**
 * The dress shop's declared journey graph — authored once; descriptions are the
 * only planner-facing strings (runtime data like dress names never enters them).
 */
import { buildNavigationGraph } from '../../src/index.js';
import type { NavigationGraph } from '../../src/index.js';

const btn = (name: string) => ({ kind: 'element', locator: { role: 'button', name }, actuation: 'click' }) as const;
const link = (name: string) => ({ kind: 'element', locator: { role: 'link', name }, actuation: 'click' }) as const;

export function dressShopGraph(): NavigationGraph {
  return buildNavigationGraph('dress-shop', {
    does: 'A small mock dress store',
    pages: {
      home: { route: '/' },
      catalog: { route: '/dresses' },
      product: { route: '/dresses/:id' },
      cart: { route: '/cart' },
      checkout: { route: '/checkout' },
      orders: { route: '/orders' },
    },
    actions: {
      'browse-dresses': {
        on: 'home',
        does: 'Browse the dress catalog',
        binding: link('Shop dresses'),
        goTo: 'catalog',
      },
      'search-dresses': {
        on: 'catalog',
        does: 'Search dresses by name or color',
        binding: { kind: 'element', locator: { role: 'searchbox', name: 'Search' }, actuation: 'type' },
        input: {
        type: 'object',
        properties: { query: { type: 'string', description: 'search text, e.g. "silk" or "red"' } },
        required: ['query'],
        },
        writes: ['resultIds', 'resultCount'],
      },
      'filter-by-color': {
        on: 'catalog',
        does: 'Filter the current results by color',
        binding: { kind: 'element', locator: { role: 'combobox', name: 'Color' }, actuation: 'select' },
        when: { resultCount: { gt: 0 } },
        input: {
        type: 'object',
        properties: { color: { type: 'string' } },
        required: ['color'],
        },
        writes: ['resultIds', 'resultCount', 'activeColor'],
      },
      'view-dress': {
        on: 'catalog',
        does: 'Open one dress from the results',
        binding: link('View dress'),
        when: { resultCount: { gt: 0 } },
        input: {
        type: 'object',
        properties: { dressId: { type: 'string' } },
        required: ['dressId'],
        },
        writes: ['selectedDressId'],
        goTo: 'product',
      },
      'add-to-cart': {
        on: 'product',
        does: 'Add the open dress to the cart',
        binding: btn('Add to cart'),
        when: { selectedDressId: { ne: '' } },
        writes: ['cartIds', 'cartCount'],
      },
      'go-to-cart': {
        on: ['catalog', 'product'],
        does: 'Open the shopping cart',
        binding: link('Cart'),
        when: { cartCount: { gt: 0 } },
        goTo: 'cart',
      },
      'proceed-to-checkout': {
        on: 'cart',
        does: 'Proceed to checkout',
        binding: btn('Checkout'),
        when: { cartCount: { gt: 0 } },
        goTo: 'checkout',
      },
      'place-order': {
        on: 'checkout',
        does: 'Place the order for everything in the cart',
        binding: btn('Place order'),
        when: { cartCount: { gt: 0 } },
        writes: ['lastOrderId', 'orderCount', 'cartIds', 'cartCount'],
        confirm: true,
      },
      'view-orders': {
        on: ['home', 'catalog', 'cart', 'checkout'],
        does: 'Open your past orders',
        binding: link('My orders'),
        goTo: 'orders',
        role: 'next',
      },
      'check-order-status': {
        on: 'orders',
        does: 'Look up the status of one order',
        binding: btn('Check status'),
        when: { orderCount: { gt: 0 } },
        input: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
        },
        writes: ['orderStatus'],
      },
    },
    journeys: {
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
  });
}
