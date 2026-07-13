/**
 * The dress shop's declared skill graph — a faithful copy of the reference
 * implementation's example graph (imports rewired to the package). Authored
 * descriptions are the only planner-facing strings.
 */
import { skillGraph } from 'hcifootprint';
import type { SkillGraph } from 'hcifootprint';

const btn = (name: string) => ({ kind: 'element', locator: { role: 'button', name }, actuation: 'click' }) as const;
const link = (name: string) => ({ kind: 'element', locator: { role: 'link', name }, actuation: 'click' }) as const;

export function dressShopGraph(): SkillGraph {
  return skillGraph('dress-shop', { description: 'A small mock dress store' })
    .page('home', { route: '/' })
    .page('catalog', { route: '/dresses' })
    .page('product', { route: '/dresses/:id' })
    .page('cart', { route: '/cart' })
    .page('checkout', { route: '/checkout' })
    .page('orders', { route: '/orders' })

    .affordance('browse-dresses', {
      on: 'home',
      description: 'Browse the dress catalog',
      binding: link('Shop dresses'),
      effect: { navigatesTo: 'catalog' },
    })
    .affordance('search-dresses', {
      on: 'catalog',
      description: 'Search dresses by name or color',
      binding: { kind: 'element', locator: { role: 'searchbox', name: 'Search' }, actuation: 'type' },
      schema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'search text, e.g. "silk" or "red"' } },
        required: ['query'],
      },
      effect: { writes: ['resultIds', 'resultCount'] },
    })
    .affordance('filter-by-color', {
      on: 'catalog',
      description: 'Filter the current results by color',
      binding: { kind: 'element', locator: { role: 'combobox', name: 'Color' }, actuation: 'select' },
      guard: { resultCount: { gt: 0 } },
      schema: {
        type: 'object',
        properties: { color: { type: 'string' } },
        required: ['color'],
      },
      effect: { writes: ['resultIds', 'resultCount', 'activeColor'] },
    })
    .affordance('view-dress', {
      on: 'catalog',
      description: 'Open one dress from the results',
      binding: link('View dress'),
      guard: { resultCount: { gt: 0 } },
      schema: {
        type: 'object',
        properties: { dressId: { type: 'string' } },
        required: ['dressId'],
      },
      effect: { writes: ['selectedDressId'], navigatesTo: 'product' },
    })
    .affordance('add-to-cart', {
      on: 'product',
      description: 'Add the open dress to the cart',
      binding: btn('Add to cart'),
      guard: { selectedDressId: { ne: '' } },
      effect: { writes: ['cartIds', 'cartCount'] },
    })
    .affordance('go-to-cart', {
      on: ['catalog', 'product'],
      description: 'Open the shopping cart',
      binding: link('Cart'),
      guard: { cartCount: { gt: 0 } },
      effect: { navigatesTo: 'cart' },
    })
    .affordance('proceed-to-checkout', {
      on: 'cart',
      description: 'Proceed to checkout',
      binding: btn('Checkout'),
      guard: { cartCount: { gt: 0 } },
      effect: { navigatesTo: 'checkout' },
    })
    .affordance('place-order', {
      on: 'checkout',
      description: 'Place the order for everything in the cart',
      binding: btn('Place order'),
      guard: { cartCount: { gt: 0 } },
      effect: { writes: ['lastOrderId', 'orderCount', 'cartIds', 'cartCount'] },
      highEffect: true,
    })
    .affordance('view-orders', {
      on: ['home', 'catalog', 'cart', 'checkout'],
      description: 'Open your past orders',
      binding: link('My orders'),
      effect: { navigatesTo: 'orders' },
      role: 'next',
    })
    .affordance('check-order-status', {
      on: 'orders',
      description: 'Look up the status of one order',
      binding: btn('Check status'),
      guard: { orderCount: { gt: 0 } },
      schema: {
        type: 'object',
        properties: { orderId: { type: 'string' } },
        required: ['orderId'],
      },
      effect: { writes: ['orderStatus'] },
    })

    .skill('find-dress', {
      description: 'Find a dress: search the catalog, optionally filter by color, open one',
      steps: ['search-dresses', 'filter-by-color', 'view-dress'],
    })
    .skill('purchase', {
      description: 'Buy the open dress: add it to the cart and place the order',
      steps: ['add-to-cart', 'go-to-cart', 'proceed-to-checkout', 'place-order'],
    })
    .skill('track-order', {
      description: 'Check on a past order',
      steps: ['view-orders', 'check-order-status'],
      precondition: { orderCount: { gt: 0 } },
    })
    .build();
}
