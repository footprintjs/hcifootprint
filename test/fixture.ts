/**
 * Shared fixture: a small storefront graph exercising every atom component —
 * guards, declared-write effects, navigation effects, payload schema,
 * high-effect marking, multi-page actions, and a journey.
 */
import { buildNavigationGraph } from '../src/index.js';
import type { NavigationGraph, Session, TransitionRecord, UpdateResult } from '../src/index.js';

/**
 * Phase-1 wiring: bind live handlers so an AGENT can really act. Since 0.3.0 an
 * agent fire of a declared-but-UNBOUND action is a NOT_MATERIALIZED rejection
 * (firing it would execute nothing), so any test whose story is "the agent
 * acts on a wired app" binds the app's side of the wire here. The handlers are
 * inert on purpose: the app's state report still arrives through the test's own
 * updateState() calls — the store tap a real app owns.
 */
export function wire(session: Session, ...actionIds: string[]): void {
  session.registerHandlers({
    group: 'app',
    handlers: Object.fromEntries(actionIds.map((id) => [id, () => undefined])),
  });
}

/** Narrow an UpdateResult to its success arm (throws loudly on failure). */
export function okUpdate(u: UpdateResult): {
  attributed: boolean;
  transition: TransitionRecord;
  version: number;
} {
  if (!u.ok) throw new Error(`updateState failed: ${JSON.stringify(u)}`);
  return u;
}

export function shop(): NavigationGraph {
  return buildNavigationGraph('shop', {
    does: 'Demo storefront',
    pages: {
      catalog: { route: '/products' },
      cart: { route: '/cart' },
      checkout: { route: '/checkout' },
    },
    // Root-level multi-attach actions: each one names the pages it is offered
    // on, so every id stays unqualified ('login', not 'catalog.login').
    actions: {
      login: {
        on: ['catalog', 'cart'],
        does: 'Log in to your account',
        binding: { kind: 'element', locator: { role: 'button', name: 'Log in' }, actuation: 'click' },
        when: { authenticated: { eq: false } },
        writes: ['authenticated', 'user'],
      },
      'add-to-cart': {
        on: 'catalog',
        does: 'Add a product to the cart',
        binding: { kind: 'element', locator: { role: 'button', name: 'Add to cart' }, actuation: 'click' },
        when: { authenticated: { eq: true } },
        writes: ['cart', 'cartCount'],
        input: {
          type: 'object',
          properties: { productId: { type: 'string' } },
          required: ['productId'],
        },
      },
      'go-to-cart': {
        on: 'catalog',
        does: 'Open the shopping cart',
        binding: { kind: 'element', locator: { role: 'link', name: 'Cart' }, actuation: 'click' },
        when: { cartCount: { gt: 0 } },
        goTo: 'cart',
      },
      'proceed-to-checkout': {
        on: 'cart',
        does: 'Proceed to checkout',
        binding: { kind: 'element', locator: { role: 'button', name: 'Checkout' }, actuation: 'click' },
        when: { cartCount: { gt: 0 } },
        goTo: 'checkout',
      },
      'place-order': {
        on: 'checkout',
        does: 'Place the order',
        binding: { kind: 'element', locator: { role: 'button', name: 'Place order' }, actuation: 'click' },
        when: { cartCount: { gt: 0 }, authenticated: { eq: true } },
        writes: ['orderId'],
        confirm: true,
      },
      'open-help': {
        on: 'cart',
        does: 'Open the help panel',
        binding: { kind: 'element', locator: { role: 'button', name: 'Help' }, actuation: 'click' },
      },
      'go-home': {
        on: 'cart',
        does: 'Go back to the catalog',
        binding: { kind: 'element', locator: { role: 'link', name: 'Home' }, actuation: 'click' },
        goTo: 'catalog',
        role: 'back',
      },
    },
    journeys: {
      purchase: {
        does: 'Buy the items currently in the cart',
        steps: ['add-to-cart', 'go-to-cart', 'proceed-to-checkout', 'place-order'],
        when: { authenticated: { eq: true } },
      },
    },
  });
}

export const initialState = {
  authenticated: false,
  user: null,
  cartCount: 0,
  cart: [] as unknown[],
};
