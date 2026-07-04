/**
 * D18 — buildNavigationGraph(): one object literal in, a validated frozen tree + flat
 * projection out. The enforcement spine mirrors skillGraph(): every
 * referential/shape mistake dies loudly at authoring time.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, Session } from '../src/index.js';
import type { NavigationGraphDef } from '../src/index.js';

const DEF: NavigationGraphDef = {
  pages: {
    catalog: {
      route: '/catalog',
      areas: {
        'filter-rail': {
          tools: { 'set-color': { does: 'Filter dresses by color' } },
        },
      },
      tools: {
        'add-to-cart': {
          does: 'Add the selected dress to the cart',
          when: { authenticated: { eq: true } },
          writes: ['cart'],
        },
        'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
      },
    },
    checkout: {
      when: { authenticated: { eq: true } },
      modals: {
        'confirm-order': {
          tools: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } },
        },
      },
      tabs: {
        shipping: { tools: { 'save-address': { does: 'Save the shipping address', writes: ['address'] } } },
        payment: { tools: { 'save-card': { does: 'Save the payment card', writes: ['card'] } } },
      },
    },
    orders: {
      areas: {
        'order-card': {
          repeats: true,
          tools: { 'cancel-order': { does: 'Cancel this order', confirm: true } },
        },
      },
    },
  },
  tools: {
    'open-help': { does: 'Open the help panel', on: ['catalog', 'orders'] },
  },
  skills: {
    purchase: {
      does: 'Buy a dress end to end',
      steps: ['add-to-cart', 'go-checkout', 'place-order'],
      when: { authenticated: { eq: true } },
    },
  },
};

describe('buildNavigationGraph — compile', () => {
  it('builds the tree index: paths, kinds, overlay/repeats flags, children', () => {
    const map = buildNavigationGraph('shop', DEF);
    expect(map.nodes['catalog'].kind).toBe('page');
    expect(map.nodes['catalog.filter-rail'].kind).toBe('area');
    expect(map.nodes['checkout.shipping'].kind).toBe('tab');
    expect(map.nodes['checkout.confirm-order']).toMatchObject({ kind: 'modal', overlay: true });
    expect(map.nodes['orders.order-card'].repeats).toBe(true);
    // children are emitted in canonical bucket order: areas → tabs → modals
    expect(map.nodes['checkout'].children).toEqual([
      'checkout.shipping',
      'checkout.payment',
      'checkout.confirm-order',
    ]);
    expect(map.toolNodes['catalog.filter-rail.set-color']).toEqual(['catalog.filter-rail']);
    expect(map.toolNodes['open-help']).toEqual(['catalog', 'orders']); // root tool lives on its pages
  });

  it('the flat projection is a real SkillGraphSpec — a PLAIN Session runs on it', () => {
    const map = buildNavigationGraph('shop', DEF);
    const session = new Session(map.spec, { node: 'catalog', state: { authenticated: true } });
    const ids = session.available().edges.map((edge) => edge.affordanceId).sort();
    expect(ids).toEqual([
      'catalog.add-to-cart',
      'catalog.filter-rail.set-color',
      'catalog.go-checkout',
      'open-help',
    ]);
  });

  it('container when AND-composes into descendant tool guards (root → leaf)', () => {
    const map = buildNavigationGraph('shop', DEF);
    // place-order inherits checkout's authenticated guard even though it declared none.
    expect(map.spec.affordances['checkout.confirm-order.place-order'].guard).toEqual({
      authenticated: { eq: true },
    });
  });

  it('narrowing conflicts die loudly (same key+op, different values)', () => {
    expect(() =>
      buildNavigationGraph('x', {
        pages: {
          p: {
            when: { tier: { eq: 'gold' } },
            areas: { a: { tools: { t: { does: 'd', when: { tier: { eq: 'silver' } } } } } },
          },
        },
      }),
    ).toThrow(/children can only narrow/);
  });

  it('skills resolve steps by unambiguous suffix; ambiguity and misses die loudly', () => {
    const map = buildNavigationGraph('shop', DEF);
    expect(map.spec.skills['purchase'].steps).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
      'checkout.confirm-order.place-order',
    ]);
    expect(() =>
      buildNavigationGraph('x', {
        pages: {
          a: { tools: { save: { does: 'd' } } },
          b: { tools: { save: { does: 'd' } } },
        },
        skills: { s: { does: 'd', steps: ['save'] } },
      }),
    ).toThrow(/ambiguous/);
    expect(() =>
      buildNavigationGraph('x', {
        pages: { a: { tools: { t: { does: 'd' } } } },
        skills: { s: { does: 'd', steps: ['ghost'] } },
      }),
    ).toThrow(/matches no tool/);
  });

  it('rejects reserved characters in names, unknown goTo, empty when, reserved leave-skill', () => {
    expect(() => buildNavigationGraph('x', { pages: { 'a.b': {} } })).toThrow(/reserved character/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { tools: { t: { does: 'd', goTo: 'ghost' } } } } }),
    ).toThrow(/goTo unknown page/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { tools: { t: { does: 'd', when: {} } } } } }),
    ).toThrow(/empty when/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { tools: { 'leave-skill': { does: 'd' } } } } }),
    ).toThrow(/reserved/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { areas: { b: {} }, tools: { b: { does: 'd' } } } } }),
    ).toThrow(/both a container and a tool/);
  });

  it('a tool needs only `does` to exist in the spine — the gradient floor', () => {
    const map = buildNavigationGraph('tiny', { pages: { home: { tools: { hello: { does: 'Say hello' } } } } });
    const affordance = map.spec.affordances['home.hello'];
    expect(affordance.binding).toBeUndefined();
    expect(affordance.descriptionSource).toBe('declared');
    expect(affordance.highEffect).toBe(false);
  });

  it('the compiled map is frozen — post-compile mutation cannot change what sessions offer', () => {
    const map = buildNavigationGraph('shop', DEF);
    expect(Object.isFrozen(map.spec.affordances['catalog.add-to-cart'])).toBe(true);
    expect(Object.isFrozen(map.nodes['catalog'])).toBe(true);
    expect(() => {
      (map.nodes as Record<string, unknown>)['injected'] = {};
    }).toThrow();
  });
});
