/**
 * fromRoutes() — the route table the app already owns becomes the page spine.
 *
 * Three properties pinned here:
 * 1. Page names are EXPLICIT (table keys) — the factory never guesses a name
 *    from a route, and it refuses bad names with the compiler's own words.
 * 2. A route contributes a PAGE, never an action — the spine is places.
 * 3. Routing and matching share one law: a page seeded from a route is found
 *    again by matchRoute for the URLs that route describes.
 *
 * Every test in this file is a mutation proof against pre-sources code:
 * fromRoutes did not exist, and a def whose only pages came from a source
 * was refused as "has no pages".
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromRoutes, matchRoute } from '../src/index.js';

describe('the router table an app already has, read as pages', () => {
  it('reads both value shapes: a bare route string, and { route, does }', () => {
    const src = fromRoutes({
      home: '/',
      orders: { route: '/orders/:id', does: 'Your orders' },
    });
    expect(src.kind).toBe('routes');
    expect(src.pages.home).toEqual({ route: '/' });
    expect(src.pages.orders).toEqual({ route: '/orders/:id', does: 'Your orders' });
  });

  it('is a frozen SNAPSHOT — editing the table after the read changes nothing', () => {
    const orders = { route: '/orders/:id', does: 'Your orders' };
    const src = fromRoutes({ orders });
    orders.route = '/mutated';
    orders.does = 'mutated';
    expect(src.pages.orders).toEqual({ route: '/orders/:id', does: 'Your orders' });
    expect(Object.isFrozen(src)).toBe(true);
    expect(Object.isFrozen(src.pages)).toBe(true);
    expect(Object.isFrozen(src.pages.orders)).toBe(true);
  });

  it('refuses page names the compiler would refuse — same law, same words, earlier door', () => {
    expect(() => fromRoutes({ '': '/x' })).toThrow(/fromRoutes page '': empty name\./);
    expect(() => fromRoutes({ 'bad.name': '/x' })).toThrow(/reserved character/);
  });

  it('refuses a non-string route — a route is an address, not a guess', () => {
    expect(() => fromRoutes({ home: 42 as unknown as string })).toThrow(
      /fromRoutes page 'home': route must be a string \(got number\)/,
    );
    expect(() => fromRoutes({ home: {} as unknown as string })).toThrow(
      /route must be a string \(got undefined\)/,
    );
  });

  it("a page literally named '__proto__' is a KEY, not a prototype swap", () => {
    const src = fromRoutes({ ['__proto__']: '/p' });
    expect(Object.keys(src.pages)).toEqual(['__proto__']);
    expect(src.pages['__proto__']).toEqual({ route: '/p' });
  });
});

describe('those pages becoming the spine a hand-authored graph hangs on', () => {
  const graph = buildNavigationGraph('shop', {
    pages: {},
    sources: [
      fromRoutes({
        home: '/',
        orders: { route: '/orders/:id', does: 'Your orders' },
        ordersNew: '/orders/new',
      }),
    ],
  });

  it('routes become REAL page nodes (pre-change: "has no pages")', () => {
    expect(graph.nodes['home']).toMatchObject({ kind: 'page', parent: null, page: 'home' });
    expect(graph.spec.pages.orders.route).toBe('/orders/:id');
    expect(graph.spec.pages.orders.description).toBe('Your orders');
  });

  it('a route contributes a PAGE, never an action — zero affordances from the table', () => {
    expect(Object.keys(graph.spec.affordances)).toEqual([]);
  });

  it('routing and matching agree: matchRoute finds the seeded pages', () => {
    expect(matchRoute(graph.spec.pages, '/orders/123')).toBe('orders');
    expect(matchRoute(graph.spec.pages, '/orders/new')).toBe('ordersNew');
    expect(matchRoute(graph.spec.pages, '/')).toBe('home');
  });

  it('a source page is a live node at runtime — the session accepts it', () => {
    const session = graph.createSession();
    // #requireNode would throw 'unknown node' if the spine were not real.
    expect(() => session.registerActions('orders')).not.toThrow();
  });
});

/**
 * REFUSED, NEVER DROPPED — the same law `authoring-keys.ts` states one door down.
 *
 * `fromRoutes` exists for the table that is NOT an authored literal: a JSON
 * blob, a generated module, a value cast on the way in. The type admits `route`
 * and `does` only, so TypeScript already refuses the rest — but none of those
 * three doors is typechecked, and reading two keys while discarding the others
 * turns "my actions vanished" into a silent, typeless bug whose first symptom is
 * an agent standing on a page with nothing on it.
 */
describe('a route table declares places and says so about anything else', () => {
  const table = (page: Record<string, unknown>) =>
    JSON.parse(JSON.stringify({ catalog: page })) as Record<string, { route: string }>;

  it('refuses the RENAMED control key by name — the promise `tools:` is never silently empty', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        sources: [fromRoutes(table({ route: '/catalog', tools: { search: { does: 'Search' } } }))],
      }),
    ).toThrow(/'tools' is not a key a route table declares/);
  });

  it('refuses the CURRENT control key too — dropping it silently was the older half of the bug', () => {
    expect(() =>
      buildNavigationGraph('shop', {
        sources: [fromRoutes(table({ route: '/catalog', actions: { search: { does: 'Search' } } }))],
      }),
    ).toThrow(/'actions' is not a key a route table declares/);
  });

  it('the refusal names where the controls DO belong, so it teaches a move', () => {
    expect(() => fromRoutes(table({ route: '/catalog', journeys: {} }))).toThrow(
      /Author actions and journeys on the page in your graph definition/,
    );
  });

  it('the two keys a route table DOES declare still compile', () => {
    const source = fromRoutes(table({ route: '/catalog', does: 'Browse the catalogue' }));
    const graph = buildNavigationGraph('shop', { sources: [source] });
    expect(graph.spec.pages.catalog.route).toBe('/catalog');
    expect(graph.spec.pages.catalog.description).toBe('Browse the catalogue');
  });

  it('and the bare-string form is untouched', () => {
    expect(buildNavigationGraph('shop', { sources: [fromRoutes({ catalog: '/catalog' })] })
      .spec.pages.catalog.route).toBe('/catalog');
  });
});
