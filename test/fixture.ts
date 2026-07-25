/**
 * Shared fixture: a small storefront graph exercising every atom component —
 * guards, declared-write effects, navigation effects, payload schema,
 * high-effect marking, multi-page affordances, and a skill.
 */
import { skillGraph } from '../src/index.js';
import type { Session, SkillGraph, TransitionRecord, UpdateResult } from '../src/index.js';

/**
 * Phase-1 wiring: bind live handlers so an AGENT can really act. Since 0.3.0 an
 * agent fire of a declared-but-UNBOUND tool is a NOT_MATERIALIZED rejection
 * (firing it would execute nothing), so any test whose story is "the agent
 * acts on a wired app" binds the app's side of the wire here. The handlers are
 * inert on purpose: the app's state report still arrives through the test's own
 * updateState() calls — the store tap a real app owns.
 */
export function wire(session: Session, ...toolIds: string[]): void {
  session.registerTools({
    group: 'app',
    tools: Object.fromEntries(toolIds.map((id) => [id, () => undefined])),
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

export function shop(): SkillGraph {
  return skillGraph('shop', { description: 'Demo storefront' })
    .page('catalog', { route: '/products' })
    .page('cart', { route: '/cart' })
    .page('checkout', { route: '/checkout' })
    .affordance('login', {
      on: ['catalog', 'cart'],
      description: 'Log in to your account',
      binding: { kind: 'element', locator: { role: 'button', name: 'Log in' }, actuation: 'click' },
      guard: { authenticated: { eq: false } },
      effect: { writes: ['authenticated', 'user'] },
    })
    .affordance('add-to-cart', {
      on: 'catalog',
      description: 'Add a product to the cart',
      binding: { kind: 'element', locator: { role: 'button', name: 'Add to cart' }, actuation: 'click' },
      guard: { authenticated: { eq: true } },
      effect: { writes: ['cart', 'cartCount'] },
      schema: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
    })
    .affordance('go-to-cart', {
      on: 'catalog',
      description: 'Open the shopping cart',
      binding: { kind: 'element', locator: { role: 'link', name: 'Cart' }, actuation: 'click' },
      guard: { cartCount: { gt: 0 } },
      effect: { navigatesTo: 'cart' },
    })
    .affordance('proceed-to-checkout', {
      on: 'cart',
      description: 'Proceed to checkout',
      binding: { kind: 'element', locator: { role: 'button', name: 'Checkout' }, actuation: 'click' },
      guard: { cartCount: { gt: 0 } },
      effect: { navigatesTo: 'checkout' },
    })
    .affordance('place-order', {
      on: 'checkout',
      description: 'Place the order',
      binding: { kind: 'element', locator: { role: 'button', name: 'Place order' }, actuation: 'click' },
      guard: { cartCount: { gt: 0 }, authenticated: { eq: true } },
      effect: { writes: ['orderId'] },
      highEffect: true,
    })
    .affordance('open-help', {
      on: 'cart',
      description: 'Open the help panel',
      binding: { kind: 'element', locator: { role: 'button', name: 'Help' }, actuation: 'click' },
    })
    .affordance('go-home', {
      on: 'cart',
      description: 'Go back to the catalog',
      binding: { kind: 'element', locator: { role: 'link', name: 'Home' }, actuation: 'click' },
      effect: { navigatesTo: 'catalog' },
      role: 'back',
    })
    .skill('purchase', {
      description: 'Buy the items currently in the cart',
      steps: ['add-to-cart', 'go-to-cart', 'proceed-to-checkout', 'place-order'],
      precondition: { authenticated: { eq: true } },
    })
    .build();
}

export const initialState = {
  authenticated: false,
  user: null,
  cartCount: 0,
  cart: [] as unknown[],
};
