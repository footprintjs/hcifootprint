/**
 * matchRoute, alone. It answers "which page is this URL?" — the question whose
 * wrong answer is worst, because the page id it returns becomes the session's
 * cursor, and the cursor decides which guards run, which edges are served and
 * which plan the model gets. So two properties are pinned throughout: it never
 * returns a page it is not sure about, and the same input always returns the
 * same page (an ambiguous map must not resolve by iteration luck).
 *
 * The POC case — '/orders/123' → the orders page — is the first test.
 */
import { describe, expect, it } from 'vitest';
import { matchRoute, skillGraph } from '../src/index.js';
import type { RoutedPages } from '../src/index.js';

const shopRoutes: RoutedPages = {
  home: { route: '/' },
  orders: { route: '/orders/:id' },
  ordersNew: { route: '/orders/new' },
  catalog: { route: '/products' },
};

describe('matchRoute — the reported case', () => {
  it("places '/orders/123' on the page that declared '/orders/:id'", () => {
    expect(matchRoute(shopRoutes, '/orders/123')).toBe('orders');
  });

  it('reads the routes off a compiled spec — the field the author already wrote', () => {
    const spec = skillGraph('shop')
      .page('catalog', { route: '/products' })
      .page('cart', { route: '/cart' })
      .build().spec;
    expect(matchRoute(spec.pages, '/cart')).toBe('cart');
    expect(matchRoute(spec.pages, '/products')).toBe('catalog');
  });
});

describe('matchRoute — precedence', () => {
  it('a literal segment beats a parameter for the same path', () => {
    expect(matchRoute(shopRoutes, '/orders/new')).toBe('ordersNew');
    // and the parameter still takes everything else on that shape
    expect(matchRoute(shopRoutes, '/orders/new-year-sale')).toBe('orders');
  });

  it('declaration order does not decide it — the more literal route wins either way', () => {
    const paramFirst: RoutedPages = { a: { route: '/orders/:id' }, b: { route: '/orders/new' } };
    const literalFirst: RoutedPages = { b: { route: '/orders/new' }, a: { route: '/orders/:id' } };
    expect(matchRoute(paramFirst, '/orders/new')).toBe('b');
    expect(matchRoute(literalFirst, '/orders/new')).toBe('b');
  });

  it('counts literals across the whole route, not just the first difference', () => {
    const pages: RoutedPages = {
      loose: { route: '/:section/:id/edit' },
      tighter: { route: '/orders/:id/edit' },
    };
    expect(matchRoute(pages, '/orders/9/edit')).toBe('tighter');
  });

  it('matches several parameters in one route', () => {
    const pages: RoutedPages = { line: { route: '/orders/:orderId/items/:itemId' } };
    expect(matchRoute(pages, '/orders/9/items/4')).toBe('line');
    expect(matchRoute(pages, '/orders/9/items')).toBeUndefined(); // a param needs a segment
  });
});

describe('matchRoute — the normalizing rules', () => {
  it('ignores a trailing slash on either side', () => {
    expect(matchRoute(shopRoutes, '/products/')).toBe('catalog');
    expect(matchRoute({ catalog: { route: '/products/' } }, '/products')).toBe('catalog');
    expect(matchRoute(shopRoutes, '/orders/123/')).toBe('orders');
  });

  it('strips a query string and a hash before matching', () => {
    expect(matchRoute(shopRoutes, '/products?color=red&page=2')).toBe('catalog');
    expect(matchRoute(shopRoutes, '/products#reviews')).toBe('catalog');
    expect(matchRoute(shopRoutes, '/orders/123?tab=items#top')).toBe('orders');
  });

  it("places the root path on the page that declared '/'", () => {
    expect(matchRoute(shopRoutes, '/')).toBe('home');
    expect(matchRoute(shopRoutes, '')).toBe('home');
  });

  it('is case-sensitive, like the routers it mirrors', () => {
    expect(matchRoute(shopRoutes, '/Products')).toBeUndefined();
  });
});

describe('matchRoute — what it refuses to answer', () => {
  it('returns undefined when nothing matches, so the caller can stay honest', () => {
    expect(matchRoute(shopRoutes, '/admin/secrets')).toBeUndefined();
  });

  it('returns undefined when no page declared a route at all', () => {
    expect(matchRoute({ a: {}, b: { description: 'no route here' } as { route?: string } }, '/a')).toBeUndefined();
    expect(matchRoute({}, '/anything')).toBeUndefined();
  });

  it('never matches across a different segment count', () => {
    expect(matchRoute(shopRoutes, '/orders')).toBeUndefined();
    expect(matchRoute(shopRoutes, '/orders/123/items')).toBeUndefined();
  });

  it('does not read a full URL — an origin is not a path', () => {
    // Honest non-answer rather than a guess at where the path starts.
    expect(matchRoute(shopRoutes, 'https://shop.example.com/products')).toBeUndefined();
  });

  it('does not invent wildcard support — a splat is read as the literal it is', () => {
    const pages: RoutedPages = { splat: { route: '/files/*' } };
    expect(matchRoute(pages, '/files/report.pdf')).toBeUndefined();
    expect(matchRoute(pages, '/files/a/b')).toBeUndefined();
    expect(matchRoute(pages, '/files/*')).toBe('splat'); // never "anything"
  });

  it('reads an optional parameter as an ordinary one — present matches, absent misses', () => {
    // The unimplemented half fails toward a MISS, never toward a wrong page.
    const pages: RoutedPages = { doc: { route: '/docs/:id?' } };
    expect(matchRoute(pages, '/docs/7')).toBe('doc');
    expect(matchRoute(pages, '/docs')).toBeUndefined();
  });
});

describe('matchRoute — determinism when the map is ambiguous', () => {
  it('breaks a literal-count tie by the longer route, in both declaration orders', () => {
    const forward: RoutedPages = { short: { route: '/o/:id' }, long: { route: '/o/:orderId' } };
    const reversed: RoutedPages = { long: { route: '/o/:orderId' }, short: { route: '/o/:id' } };
    expect(matchRoute(forward, '/o/7')).toBe('long');
    expect(matchRoute(reversed, '/o/7')).toBe('long');
  });

  it('breaks a full tie by first declaration, and answers the same on every call', () => {
    const pages: RoutedPages = { first: { route: '/a/:x/c' }, second: { route: '/a/:y/c' } };
    const answers = new Set([1, 2, 3].map(() => matchRoute(pages, '/a/b/c')));
    expect([...answers]).toEqual(['first']);
  });
});

describe('matchRoute — composed with sync(), which it does not touch', () => {
  const shopGraph = () =>
    skillGraph('shop').page('catalog', { route: '/products' }).page('order', { route: '/orders/:id' }).build();

  it('a matched path moves the cursor to a real page, on the graph', () => {
    const graph = shopGraph();
    const session = graph.createSession({ node: 'catalog' });
    const path = '/orders/123';
    const result = session.sync(matchRoute(graph.spec.pages, path) ?? path);

    expect(result).toMatchObject({ changed: true, node: 'order' });
    expect('offGraph' in result).toBe(false);
    expect(session.node).toBe('order');
  });

  it('an unmatched path keeps the existing off-graph behaviour, unchanged', () => {
    const graph = shopGraph();
    const session = graph.createSession({ node: 'catalog' });
    const path = '/admin/secrets';
    const result = session.sync(matchRoute(graph.spec.pages, path) ?? path);

    expect(result).toMatchObject({ changed: true, node: '/admin/secrets', offGraph: true });
    expect(session.available().edges).toEqual([]); // nothing is served off-graph
  });
});
