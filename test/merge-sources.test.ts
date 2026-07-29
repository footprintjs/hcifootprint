/**
 * The merge order, exactly as the docs print it:
 *
 *   "Pages first (routes then hand-authored, hand-authored wins), journeys
 *    overlay second and may only add, live actions attach last and only bind —
 *    nothing later in the order may remove anything earlier."
 *
 * Exercised through the PUBLIC door (buildNavigationGraph) on purpose: the
 * merge is a pre-pass the author never calls, so what must hold is what a
 * compiled graph shows. Every test here is a mutation proof against
 * pre-sources code, where `sources` was unknown and ignored.
 */
import { describe, expect, it } from 'vitest';
import { SkillGraphValidationError, buildNavigationGraph, fromJourneys, fromRoutes } from '../src/index.js';

describe('merge order — pages: routes then hand-authored, hand-authored wins', () => {
  it('page key order is routes-source order first, hand additions after (matchRoute tie-break + node order feed on it)', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { catalog: {}, home: {} }, // home overrides a sourced page; catalog is hand-only
      sources: [fromRoutes({ home: '/', orders: '/orders/:id' })],
    });
    // Overriding 'home' keeps its FIRST appearance's slot (the source's), so
    // the same def always yields the same order.
    expect(Object.keys(graph.spec.pages)).toEqual(['home', 'orders', 'catalog']);
  });

  it('hand-authored WINS per page id — its content, its tools, its route spelling', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        cart: {
          route: 'cart/', // segment-equal to the source's '/cart' — hand bytes win
          does: 'Hand-authored cart',
          tools: { empty: { does: 'Empty the cart', writes: ['cart'] } },
        },
      },
      sources: [fromRoutes({ cart: { route: '/cart', does: 'Sourced cart' } })],
    });
    expect(graph.spec.pages.cart.route).toBe('cart/');
    expect(graph.spec.pages.cart.description).toBe('Hand-authored cart');
    expect(graph.spec.affordances['cart.empty'].description).toBe('Empty the cart');
  });

  it('the ONE courtesy: a hand page missing `route` inherits the source route — that IS the use case', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { checkout: { tools: { pay: { does: 'Pay now' } } } },
      sources: [fromRoutes({ checkout: '/checkout' })],
    });
    expect(graph.spec.pages.checkout.route).toBe('/checkout');
    expect(graph.spec.affordances['checkout.pay'].description).toBe('Pay now');
  });

  it('both declaring DIFFERENT routes refuses loudly — drift made visible, never resolved by picking one', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { checkout: { route: '/checkout' } },
        sources: [fromRoutes({ checkout: '/cart' })],
      }),
    ).toThrow(/page 'checkout' declares route '\/checkout' by hand and '\/cart' from a routes source/);
  });

  it("route equality is the MATCHER's segment law, not string bytes: spellings and param names never conflict", () => {
    // '/cart' vs 'cart/' — one place; '/orders/:id' vs '/orders/:orderId' — a param's name is never read.
    const graph = buildNavigationGraph('shop', {
      pages: {
        cart: { route: 'cart/' },
        orders: { route: '/orders/:orderId' },
      },
      sources: [fromRoutes({ cart: '/cart', orders: '/orders/:id' })],
    });
    expect(graph.spec.pages.cart.route).toBe('cart/');
    expect(graph.spec.pages.orders.route).toBe('/orders/:orderId');
  });
});

describe('merge order — journeys overlay second, may only add; hand-authored skill wins silently', () => {
  const PAGES = {
    catalog: { tools: { 'add-to-cart': { does: 'Add to cart', writes: ['cart'] } } },
  };

  it('a hand-authored skill beats a same-id journey WITHOUT a refusal — deterministic and documented', () => {
    const graph = buildNavigationGraph('shop', {
      pages: PAGES,
      skills: { purchase: { does: 'Hand-authored purchase', steps: ['add-to-cart'] } },
      sources: [fromJourneys({ purchase: { does: 'Journey purchase', steps: ['add-to-cart'] } })],
    });
    expect(graph.spec.skills.purchase.description).toBe('Hand-authored purchase');
  });

  it('journeys and hand skills coexist under distinct ids', () => {
    const graph = buildNavigationGraph('shop', {
      pages: PAGES,
      skills: { restock: { does: 'Hand skill', steps: ['add-to-cart'] } },
      sources: [fromJourneys({ purchase: { does: 'Journey skill', steps: ['add-to-cart'] } })],
    });
    expect(Object.keys(graph.spec.skills).sort()).toEqual(['purchase', 'restock']);
  });
});

describe('merge order — same-kind collisions are ambiguous AUTHORSHIP, refused loudly', () => {
  it('two routes sources on one page id', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: {},
        sources: [fromRoutes({ home: '/' }), fromRoutes({ home: '/home' })],
      }),
    ).toThrow(/page 'home' is declared by two routes sources — ambiguous authorship/);
  });

  it('two journeys sources on one skill id', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { catalog: { tools: { add: { does: 'Add' } } } },
        sources: [
          fromJourneys({ buy: { does: 'A', steps: ['add'] } }),
          fromJourneys({ buy: { does: 'B', steps: ['add'] } }),
        ],
      }),
    ).toThrow(/skill 'buy' is declared by two journeys sources — ambiguous authorship/);
  });
});

describe('merge — cross-source references become first-class', () => {
  it('a hand tool may goTo a routes-sourced page (pre-change: "goTo unknown page")', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { catalog: { tools: { 'go-home': { does: 'Go home', goTo: 'home' } } } },
      sources: [fromRoutes({ home: '/' })],
    });
    expect(graph.spec.affordances['catalog.go-home'].effect).toEqual({ navigatesTo: 'home' });
  });

  it('a root tool may live ON a routes-sourced page (pre-change: "offered on unknown page")', () => {
    const graph = buildNavigationGraph('shop', {
      pages: { catalog: {} },
      tools: { 'open-help': { does: 'Open help', on: ['home'] } },
      sources: [fromRoutes({ home: '/' })],
    });
    expect(graph.toolNodes['open-help']).toEqual(['home']);
  });
});

describe('merge — fail closed on what this build cannot read', () => {
  it('an unknown source kind is refused, never silently dropped', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { catalog: {} },
        sources: [{ kind: 'live' } as never],
      }),
    ).toThrow(/sources\[0\] has unknown kind 'live' — this build understands 'routes' and 'journeys'/);
  });

  it('a non-object source is refused', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { catalog: {} },
        sources: [null as never],
      }),
    ).toThrow(/sources\[0\] is not a source object/);
  });

  // A KNOWN kind hand-crafted without its payload (JS caller territory —
  // TypeScript and the factories make this unreachable) must die in the
  // library's OWN voice, not a bare TypeError from Object.entries. The
  // instanceof assertions are the mutation proof: pre-change code threw
  // TypeError here, which is exactly the un-owned failure being closed.
  it("a routes source with a MISSING pages payload is refused in the library's voice", () => {
    const build = () =>
      buildNavigationGraph('shop', {
        pages: { catalog: {} },
        sources: [{ kind: 'routes' } as never],
      });
    expect(build).toThrow(SkillGraphValidationError);
    expect(build).toThrow(/sources\[0\] has kind 'routes' but its pages payload is missing or not a plain object/);
  });

  it("a journeys source with a MISSING skills payload is refused in the library's voice", () => {
    const build = () =>
      buildNavigationGraph('shop', {
        pages: { catalog: {} },
        sources: [{ kind: 'journeys' } as never],
      });
    expect(build).toThrow(SkillGraphValidationError);
    expect(build).toThrow(/sources\[0\] has kind 'journeys' but its skills payload is missing or not a plain object/);
  });

  it('a PRIMITIVE payload is refused — Object.entries on a string would launder its index keys into page ids', () => {
    // Pre-change, {pages: 'x'} silently produced a page literally named '0'.
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { catalog: {} },
        sources: [{ kind: 'routes', pages: 'x' } as never],
      }),
    ).toThrow(/sources\[0\] has kind 'routes' but its pages payload is missing or not a plain object/);
  });

  it('an ARRAY payload is refused — indices are not skill ids, and the library never guesses', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        pages: { catalog: {} },
        sources: [{ kind: 'journeys', skills: [{ does: 'Buy', steps: [] }] } as never],
      }),
    ).toThrow(/sources\[0\] has kind 'journeys' but its skills payload is missing or not a plain object/);
  });
});

describe('merge — the non-breaking edges', () => {
  const DEF = {
    does: 'A shop',
    pages: {
      catalog: {
        tools: { 'add-to-cart': { does: 'Add', when: { authenticated: { eq: true } }, writes: ['cart'] } },
      },
    },
    skills: { purchase: { does: 'Buy', steps: ['add-to-cart'] } },
  };

  it('an empty sources list and empty-content sources compile to the SAME spec as no sources at all', () => {
    const plain = buildNavigationGraph('shop', DEF);
    const emptyList = buildNavigationGraph('shop', { ...DEF, sources: [] });
    const emptyContent = buildNavigationGraph('shop', {
      ...DEF,
      sources: [fromRoutes({}), fromJourneys({})],
    });
    expect(JSON.stringify(emptyList.spec)).toBe(JSON.stringify(plain.spec));
    expect(JSON.stringify(emptyContent.spec)).toBe(JSON.stringify(plain.spec));
    expect(emptyList.requiredStateKeys()).toEqual(plain.requiredStateKeys());
  });

  it('the no-pages refusal judges the EFFECTIVE graph: sources can be the only pages, but nothing is still nothing', () => {
    expect(() => buildNavigationGraph('shop', { pages: {} })).toThrow(/has no pages/);
    expect(() => buildNavigationGraph('shop', { pages: {}, sources: [fromRoutes({})] })).toThrow(/has no pages/);
    expect(() =>
      buildNavigationGraph('shop', { pages: {}, sources: [fromRoutes({ home: '/' })] }),
    ).not.toThrow();
  });

  it('the merge never mutates the author\'s def or sources', () => {
    const def = {
      pages: { checkout: { tools: { pay: { does: 'Pay' } } } },
      sources: [fromRoutes({ checkout: '/checkout', home: '/' })],
    };
    const before = JSON.stringify(def);
    buildNavigationGraph('shop', def);
    expect(JSON.stringify(def)).toBe(before);
  });
});
