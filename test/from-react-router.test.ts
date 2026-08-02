/**
 * fromReactRouter() — the route TREE the app already declared becomes pages.
 *
 * The laws pinned here, each one a sentence from the factory's own header:
 *
 * 1. ADDRESSES COMPOSE and index routes FOLD — a nested config is read the way
 *    every router reads it, and two routes at one address are one page.
 * 2. A NAME IS TRANSCRIBED, NEVER GUESSED — a fully-static address becomes its
 *    own segments joined; a ':param', a '*', an optional '?' and the root's zero
 *    segments have nothing to transcribe, so they REFUSE, naming the path and
 *    the same two doors every time.
 * 3. THE TWO DOORS, in order: `nameOf` (the call-site override) then
 *    `handle.hcifootprint.name` (the literal the app owns).
 * 4. PAGES ONLY — an action-shaped key inside handle.hcifootprint is refused BY
 *    NAME, never read-and-discarded.
 * 5. NAMES ARE UNIQUE — two addresses arriving at one id refuse, naming both.
 * 6. DUCK-TYPED — a v6-shaped and a v7-shaped table both walk, and the framework
 *    fields (element/Component/lazy/loader) are never READ, not merely ignored.
 * 7. A SOURCE IS A VALUE — mutating the input afterwards changes nothing.
 * 8. crossLinks is fromRoutes' option, with fromRoutes' two stances.
 *
 * Mutation proof: the module did not exist before this change, and every case
 * below fails against a tree without it.
 */
import { describe, expect, it } from 'vitest';
import {
  GraphValidationError,
  buildNavigationGraph,
  fromReactRouter,
  matchRoute,
} from '../src/index.js';
import type { RouteObjectLike } from '../src/index.js';

/** The message a refusal carried, or a failure if it did not refuse at all. */
function refusal(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('expected fromReactRouter to refuse, and it did not');
}

/** The two-doors sentence, byte for byte — the tail of every naming refusal. */
const TWO_DOORS =
  "Name it at the call — fromReactRouter(routes, { nameOf: (route, path) => … }) — or declare it on the " +
  "route your app already owns: handle: { hcifootprint: { name: 'order-detail' } }.";

// ---------------------------------------------------------------------------
// 1. composition and folding
// ---------------------------------------------------------------------------

describe('a nested route tree is read the way a router reads it', () => {
  it('composes child addresses through their parent and transcribes each name', () => {
    const source = fromReactRouter([
      {
        path: '/projects',
        handle: { hcifootprint: { does: 'the Projects list' } },
        children: [{ path: 'new' }, { path: 'archive', children: [{ path: 'restore' }] }],
      },
    ]);
    expect(source.kind).toBe('routes');
    expect(source.pages).toEqual({
      projects: { route: '/projects', does: 'the Projects list' },
      'projects-new': { route: '/projects/new' },
      'projects-archive': { route: '/projects/archive' },
      'projects-archive-restore': { route: '/projects/archive/restore' },
    });
  });

  it('a child path that starts with "/" REPLACES the inherited prefix, never doubles it', () => {
    const source = fromReactRouter([
      { path: '/orders', children: [{ path: '/settings' }, { path: 'open' }] },
    ]);
    expect(Object.keys(source.pages)).toEqual(['orders', 'settings', 'orders-open']);
    expect(source.pages['settings'].route).toBe('/settings');
  });

  it('a LAYOUT route (no path of its own) contributes no page and passes its address down', () => {
    const source = fromReactRouter([
      {
        path: '/account',
        children: [{ children: [{ path: 'billing' }] }],
      },
    ]);
    expect(Object.keys(source.pages)).toEqual(['account', 'account-billing']);
  });

  it('an index route FOLDS into its parent — one address is one page', () => {
    const source = fromReactRouter([
      {
        path: '/orders',
        children: [{ index: true, handle: { hcifootprint: { does: 'Every order you placed' } } }, { path: 'new' }],
      },
    ]);
    expect(Object.keys(source.pages)).toEqual(['orders', 'orders-new']);
    // The index child's label reached the page its parent contributed.
    expect(source.pages['orders'].does).toBe('Every order you placed');
  });

  it("`path: ''` folds identically — the other spelling of the same idea", () => {
    const source = fromReactRouter([
      { path: '/orders', children: [{ path: '', handle: { hcifootprint: { does: 'Every order' } } }] },
    ]);
    expect(source.pages).toEqual({ orders: { route: '/orders', does: 'Every order' } });
  });

  it('the OUTERMOST label wins when both a parent and its index route declare one', () => {
    const source = fromReactRouter([
      {
        path: '/orders',
        handle: { hcifootprint: { does: 'the parent label' } },
        children: [{ index: true, handle: { hcifootprint: { does: 'the index label' } } }],
      },
    ]);
    expect(source.pages['orders'].does).toBe('the parent label');
  });

  it('a folded index route may supply the NAME its parent could not transcribe', () => {
    const source = fromReactRouter([
      { path: '/', children: [{ index: true, handle: { hcifootprint: { name: 'home' } } }] },
    ]);
    expect(source.pages).toEqual({ home: { route: '/' } });
  });

  it('two routes at ONE address naming it differently refuse — one place has one name', () => {
    const message = refusal(() =>
      fromReactRouter([
        {
          path: '/orders',
          handle: { hcifootprint: { name: 'orders' } },
          children: [{ index: true, handle: { hcifootprint: { name: 'order-list' } } }],
        },
      ]),
    );
    expect(message).toContain("two routes at '/orders' declare different page names");
    expect(message).toContain("('orders' and 'order-list')");
  });

  it('the same name declared twice at one address is agreement, not a conflict', () => {
    const source = fromReactRouter([
      {
        path: '/orders',
        handle: { hcifootprint: { name: 'orders' } },
        children: [{ index: true, handle: { hcifootprint: { name: 'orders' } } }],
      },
    ]);
    expect(Object.keys(source.pages)).toEqual(['orders']);
  });

  it("a page literally named '__proto__' is a KEY, not a prototype swap", () => {
    const source = fromReactRouter([{ path: '/__proto__' }]);
    expect(Object.keys(source.pages)).toEqual(['__proto__']);
    expect(source.pages['__proto__']).toEqual({ route: '/__proto__' });
  });
});

// ---------------------------------------------------------------------------
// 2. the refusal — same words, every time
// ---------------------------------------------------------------------------

describe('a name that cannot be transcribed is refused, naming the path and both doors', () => {
  it("a ':param' route refuses with the message, byte for byte", () => {
    expect(refusal(() => fromReactRouter([{ path: '/orders', children: [{ path: ':id' }] }]))).toBe(
      "hcifootprint: fromReactRouter cannot name the page at route '/orders/:id': a dynamic segment " +
        "(':param', '*', an optional '?') is not bytes — the address is not known until a URL supplies it, " +
        'and a page name that changes per URL is not a name. This library does not guess. ' +
        TWO_DOORS,
    );
  });

  it("a '*' splat and an optional '?' segment refuse with the SAME words", () => {
    for (const [path, address] of [
      ['/files/*', '/files/*'],
      ['/docs/:id?', '/docs/:id?'],
      ['/about?', '/about?'],
    ]) {
      const message = refusal(() => fromReactRouter([{ path }]));
      expect(message).toContain(`cannot name the page at route '${address}'`);
      expect(message).toContain("a dynamic segment (':param', '*', an optional '?') is not bytes");
      expect(message).toContain(TWO_DOORS);
    }
  });

  it('the ROOT refuses too — zero segments is zero bytes to transcribe', () => {
    const message = refusal(() => fromReactRouter([{ path: '/' }]));
    expect(message).toContain("cannot name the page at route '/'");
    expect(message).toContain('the root address has no segments at all');
    expect(message).toContain('a word this library chose rather than one your app wrote');
    expect(message).toContain(TWO_DOORS);
  });

  it('a segment carrying a RESERVED character refuses rather than minting an illegal name', () => {
    const message = refusal(() => fromReactRouter([{ path: '/files.json' }]));
    expect(message).toContain("transcribing its segments gives 'files.json'");
    expect(message).toContain("'. [ ] # / |' are reserved");
    expect(message).toContain(TWO_DOORS);
  });

  it('a blank segment refuses on the same law (a name cannot be nothing)', () => {
    const message = refusal(() => fromReactRouter([{ path: '/ ' }]));
    expect(message).toContain('it cannot be blank');
    expect(message).toContain(TWO_DOORS);
  });

  it('every refusal ends with the SAME two doors — the reader learns it once', () => {
    const messages = [
      refusal(() => fromReactRouter([{ path: '/orders/:id' }])),
      refusal(() => fromReactRouter([{ path: '/' }])),
      refusal(() => fromReactRouter([{ path: '/files.json' }])),
      refusal(() => fromReactRouter([{ path: '/a' }, { path: '/b', handle: { hcifootprint: { name: 'a' } } }])),
    ];
    for (const message of messages) expect(message.endsWith(TWO_DOORS)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. the two doors, in order
// ---------------------------------------------------------------------------

describe('the two doors: nameOf first, then the route the app owns', () => {
  it('nameOf names what the transcription could not, and receives the route and its address', () => {
    const seen: string[] = [];
    const source = fromReactRouter([{ path: '/orders', children: [{ path: ':id' }] }], {
      nameOf: (route, absolutePath) => {
        seen.push(absolutePath);
        return absolutePath === '/orders/:id' ? 'order-detail' : undefined;
      },
    });
    expect(seen).toEqual(['/orders', '/orders/:id']);
    expect(source.pages).toEqual({
      orders: { route: '/orders' },
      'order-detail': { route: '/orders/:id' },
    });
  });

  it('nameOf OVERRIDES a name the transcription could have minted', () => {
    const source = fromReactRouter([{ path: '/projects/new' }], { nameOf: () => 'wizard' });
    expect(Object.keys(source.pages)).toEqual(['wizard']);
  });

  it('nameOf beats a name declared on the route — the call site is the override', () => {
    const source = fromReactRouter([{ path: '/orders/:id', handle: { hcifootprint: { name: 'declared' } } }], {
      nameOf: () => 'from-the-call',
    });
    expect(Object.keys(source.pages)).toEqual(['from-the-call']);
  });

  it('nameOf returning undefined falls through to the handle, then to the refusal', () => {
    const declared = fromReactRouter([{ path: '/orders/:id', handle: { hcifootprint: { name: 'order-detail' } } }], {
      nameOf: () => undefined,
    });
    expect(Object.keys(declared.pages)).toEqual(['order-detail']);
    expect(refusal(() => fromReactRouter([{ path: '/orders/:id' }], { nameOf: () => undefined }))).toContain(
      TWO_DOORS,
    );
  });

  it('nameOf is asked about PLACES only — never about a layout route', () => {
    const seen: string[] = [];
    fromReactRouter([{ children: [{ path: '/orders' }] }], {
      nameOf: (_route, absolutePath) => {
        seen.push(absolutePath);
        return undefined;
      },
    });
    expect(seen).toEqual(['/orders']);
  });

  it('a name from either door still meets the compiler’s segment law', () => {
    expect(refusal(() => fromReactRouter([{ path: '/a' }], { nameOf: () => 'bad.name' }))).toContain(
      "fromReactRouter nameOf for route '/a': 'bad.name' contains a reserved character",
    );
    expect(refusal(() => fromReactRouter([{ path: '/a', handle: { hcifootprint: { name: '' } } }]))).toContain(
      "fromReactRouter route '/a': empty name.",
    );
  });

  it('a nameOf that answers with something other than a name is refused, not coerced', () => {
    expect(
      refusal(() => fromReactRouter([{ path: '/a' }], { nameOf: () => 42 as unknown as string })),
    ).toContain("nameOf returned a number for route '/a'");
  });
});

// ---------------------------------------------------------------------------
// 4. pages only — refused by name, never dropped
// ---------------------------------------------------------------------------

describe('a route declares a PAGE, and says so about anything else', () => {
  const declaring = (hcifootprint: unknown): RouteObjectLike => ({ path: '/catalog', handle: { hcifootprint } });

  it.each(['actions', 'tools', 'skills', 'journeys', 'binding'])(
    "refuses the action-shaped key '%s' BY NAME",
    (key) => {
      const message = refusal(() => fromReactRouter([declaring({ [key]: {} })]));
      expect(message).toContain(`route '/catalog' declares handle.hcifootprint.${key}`);
      expect(message).toContain('a route contributes a PAGE, never a control');
    },
  );

  it('the refusal names where the controls DO belong, so it teaches a move', () => {
    expect(refusal(() => fromReactRouter([declaring({ actions: {} })]))).toContain(
      'Author actions and journeys on the page in your graph definition',
    );
  });

  it('the two keys a route DOES declare still compile', () => {
    const source = fromReactRouter([declaring({ name: 'catalog', does: 'Browse the catalogue' })]);
    expect(source.pages).toEqual({ catalog: { route: '/catalog', does: 'Browse the catalogue' } });
  });

  it('refuses a declaration that is not an object at all', () => {
    expect(refusal(() => fromReactRouter([declaring('catalog')]))).toContain(
      "declares handle.hcifootprint as a string — it is an object naming the page: { name, does }",
    );
    expect(refusal(() => fromReactRouter([declaring(['catalog'])]))).toContain(
      'declares handle.hcifootprint as a array',
    );
  });

  it('refuses a name or a label that is not a string', () => {
    expect(refusal(() => fromReactRouter([declaring({ name: 7 })]))).toContain(
      'declares handle.hcifootprint.name as a number — a page name is a string',
    );
    expect(refusal(() => fromReactRouter([declaring({ does: 7 })]))).toContain(
      "declares handle.hcifootprint.does as a number — a page's label is a string",
    );
  });

  it('refuses a declaration on a LAYOUT route — a page is an address, and a layout has none', () => {
    const message = refusal(() =>
      fromReactRouter([{ path: '/account', children: [{ handle: { hcifootprint: { name: 'settings' } } }] }]),
    );
    expect(message).toContain('a route with no path of its own is a LAYOUT, not a place');
    expect(message).toContain("could never be read");
    expect(message).toContain("Declare it on the route that has the address");
  });

  it('a handle carrying only the app’s OWN keys is left entirely alone', () => {
    const source = fromReactRouter([{ path: '/catalog', handle: { crumb: 'Catalog', analyticsId: 42 } }]);
    expect(source.pages).toEqual({ catalog: { route: '/catalog' } });
  });
});

// ---------------------------------------------------------------------------
// 5. names are unique
// ---------------------------------------------------------------------------

describe('two places cannot share one name', () => {
  it('refuses a transcription collision, naming BOTH paths (never last-wins)', () => {
    const message = refusal(() => fromReactRouter([{ path: '/orders/list' }, { path: '/orders-list' }]));
    expect(message).toContain("routes '/orders/list' and '/orders-list' both name the page 'orders-list'");
    expect(message).toContain('the second would silently replace the first');
    expect(message).toContain(TWO_DOORS);
  });

  it('refuses a DECLARED collision the same way', () => {
    expect(
      refusal(() =>
        fromReactRouter([
          { path: '/a', handle: { hcifootprint: { name: 'shared' } } },
          { path: '/b', handle: { hcifootprint: { name: 'shared' } } },
        ]),
      ),
    ).toContain("both name the page 'shared'");
  });
});

// ---------------------------------------------------------------------------
// 6. duck-typed: the shapes that must walk, and the fields never read
// ---------------------------------------------------------------------------

/** react-router v6's route shape — the FIELDS, declared here so nothing is imported. */
interface V6IndexRoute {
  index: true;
  path?: string;
  children?: undefined;
  element?: unknown;
  loader?: unknown;
  errorElement?: unknown;
  handle?: unknown;
}
interface V6NonIndexRoute {
  index?: false;
  path?: string;
  children?: V6Route[];
  element?: unknown;
  loader?: unknown;
  errorElement?: unknown;
  handle?: unknown;
}
type V6Route = V6IndexRoute | V6NonIndexRoute;

/** react-router v7's route shape — same spine, the newer fields on top. */
interface V7Route {
  index?: boolean;
  path?: string;
  children?: V7Route[];
  Component?: unknown;
  lazy?: unknown;
  loader?: unknown;
  action?: unknown;
  HydrateFallback?: unknown;
  shouldRevalidate?: unknown;
  handle?: unknown;
}

describe('a v6-shaped and a v7-shaped table both walk — duck-typed, not imported', () => {
  it('a v6 table assigns and walks', () => {
    const v6: V6Route[] = [
      {
        path: '/shop',
        element: 'ShopLayout',
        errorElement: 'Boom',
        children: [
          { index: true, element: 'ShopHome', handle: { hcifootprint: { does: 'the shop' } } },
          { path: 'cart', element: 'Cart', loader: () => null },
        ],
      },
    ];
    expect(fromReactRouter(v6).pages).toEqual({
      shop: { route: '/shop', does: 'the shop' },
      'shop-cart': { route: '/shop/cart' },
    });
  });

  it('a v7 table assigns and walks', () => {
    const v7: V7Route[] = [
      {
        path: '/shop',
        Component: 'ShopLayout',
        HydrateFallback: 'Spinner',
        children: [
          { index: true, lazy: () => null },
          { path: 'cart', lazy: () => null, action: () => null, shouldRevalidate: () => true },
        ],
      },
    ];
    expect(Object.keys(fromReactRouter(v7).pages)).toEqual(['shop', 'shop-cart']);
  });

  it('NEVER READS the framework fields — throwing getters on them are never fired', () => {
    const never = ['element', 'Component', 'lazy', 'loader', 'action', 'errorElement', 'HydrateFallback', 'id'];
    const withTraps = (path: string): RouteObjectLike => {
      const route: Record<string, unknown> = { path };
      for (const key of never) {
        Object.defineProperty(route, key, {
          enumerable: true,
          get() {
            throw new Error(`fromReactRouter read '${key}', which it promises never to touch`);
          },
        });
      }
      return route as RouteObjectLike;
    };
    const trapped = withTraps('/orders');
    (trapped as { children?: RouteObjectLike[] }).children = [withTraps('new')];
    expect(Object.keys(fromReactRouter([trapped]).pages)).toEqual(['orders', 'orders-new']);
  });
});

// ---------------------------------------------------------------------------
// 7. a source is a VALUE
// ---------------------------------------------------------------------------

describe('a source is a snapshot value — the app editing its routes afterwards changes nothing', () => {
  it('mutating the array, a route and a handle after the call leaves the graph untouched', () => {
    const child: RouteObjectLike = { path: 'new' };
    const parent: RouteObjectLike = {
      path: '/projects',
      handle: { hcifootprint: { does: 'the Projects list' } },
      children: [child],
    };
    const routes: RouteObjectLike[] = [parent];
    const source = fromReactRouter(routes);
    const before = JSON.stringify(source.pages);

    routes.push({ path: '/late' });
    parent.path = '/mutated';
    child.path = 'mutated';
    (parent.handle as { hcifootprint: { does: string } }).hcifootprint.does = 'mutated';

    expect(JSON.stringify(source.pages)).toBe(before);
    expect(Object.keys(source.pages)).toEqual(['projects', 'projects-new']);
  });

  it('is frozen all the way down', () => {
    const source = fromReactRouter([{ path: '/a' }], { crossLinks: ['a'] });
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.pages)).toBe(true);
    expect(Object.isFrozen(source.pages['a'])).toBe(true);
    expect(Object.isFrozen(source.crossLinks)).toBe(true);
  });

  it('unasked crossLinks is ABSENT, not false', () => {
    expect('crossLinks' in fromReactRouter([{ path: '/a' }])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. crossLinks — fromRoutes' option, fromRoutes' two stances
// ---------------------------------------------------------------------------

describe('crossLinks behaves exactly as it does on fromRoutes', () => {
  const tree = (): RouteObjectLike[] => [
    { path: '/', handle: { hcifootprint: { name: 'home', does: 'the dashboard' } } },
    {
      path: '/projects',
      handle: { hcifootprint: { does: 'the Projects list' } },
      children: [{ path: 'new' }, { path: ':id', handle: { hcifootprint: { name: 'project' } } }],
    },
  ];

  it('records the REQUEST, not actions', () => {
    expect(fromReactRouter(tree(), { crossLinks: true }).crossLinks).toBe(true);
    expect(fromReactRouter(tree(), { crossLinks: ['projects'] }).crossLinks).toEqual(['projects']);
  });

  it('a blanket true FILTERS the param page silently — a half-address is not an address', () => {
    const graph = buildNavigationGraph('app', { sources: [fromReactRouter(tree(), { crossLinks: true })] });
    expect(Object.keys(graph.spec.affordances).sort()).toEqual([
      'go-to-home',
      'go-to-projects',
      'go-to-projects-new',
    ]);
    expect(graph.spec.affordances['go-to-projects'].description).toBe('Go to the Projects list');
  });

  it('an explicitly NAMED param page refuses loudly, at the factory', () => {
    expect(refusal(() => fromReactRouter(tree(), { crossLinks: ['project'] }))).toContain(
      "fromReactRouter crossLinks names 'project', whose route '/projects/:id' has a ':param' segment",
    );
  });

  it('an unknown name refuses and lists what there is', () => {
    expect(refusal(() => fromReactRouter(tree(), { crossLinks: ['projcts'] }))).toContain(
      "fromReactRouter crossLinks names 'projcts', which this route table does not declare. " +
        'Known pages: home, projects, projects-new, project.',
    );
  });
});

// ---------------------------------------------------------------------------
// 9. the shapes a JS caller can hand in — fail closed, in the library's voice
// ---------------------------------------------------------------------------

describe('an unreadable route tree fails closed with a sentence, never a TypeError', () => {
  it('refuses a routes argument that is not an array', () => {
    expect(refusal(() => fromReactRouter({} as unknown as RouteObjectLike[]))).toContain(
      'routes must be an array of route objects (got object)',
    );
  });

  it.each([
    [null, 'null'],
    ['/orders', 'string'],
    [7, 'number'],
    [[], 'object'],
  ])('refuses a route entry that is not a route object (%s)', (entry, named) => {
    expect(refusal(() => fromReactRouter([entry] as unknown as RouteObjectLike[]))).toContain(
      `routes[0] is not a route object (got ${named})`,
    );
  });

  it('refuses a non-string path, a non-boolean index and a non-array children', () => {
    expect(refusal(() => fromReactRouter([{ path: 7 } as unknown as RouteObjectLike]))).toContain(
      "a route's path must be a string (got number)",
    );
    expect(refusal(() => fromReactRouter([{ index: 'yes' } as unknown as RouteObjectLike]))).toContain(
      "a route's index must be true or false (got string)",
    );
    expect(refusal(() => fromReactRouter([{ children: {} } as unknown as RouteObjectLike]))).toContain(
      "a route's children must be an array of route objects (got object)",
    );
  });

  it('refuses an index route carrying a path or children — every router refuses the same shape', () => {
    expect(refusal(() => fromReactRouter([{ index: true, path: '/x' }]))).toContain(
      "an index route renders at its PARENT's address, so it can carry neither a path nor children — this " +
        "one carries path '/x'",
    );
    expect(refusal(() => fromReactRouter([{ index: true, children: [] }]))).toContain(
      'this one carries children',
    );
  });

  it('an index: false route is an ordinary route, not an index one', () => {
    expect(Object.keys(fromReactRouter([{ index: false, path: '/a' }]).pages)).toEqual(['a']);
  });

  it('an empty tree is an empty source — the compiler owns "has no pages"', () => {
    expect(fromReactRouter([]).pages).toEqual({});
    expect(() => buildNavigationGraph('app', { sources: [fromReactRouter([])] })).toThrow(/has no pages/);
  });
});

// ---------------------------------------------------------------------------
// 10. and then it is just a routes source
// ---------------------------------------------------------------------------

describe('the pages it contributes are ordinary spine pages', () => {
  const graph = buildNavigationGraph('shop', {
    sources: [
      fromReactRouter([
        {
          path: '/',
          handle: { hcifootprint: { name: 'home' } },
          children: [
            { path: 'orders', handle: { hcifootprint: { does: 'Your orders' } } },
            { path: 'orders/:id', handle: { hcifootprint: { name: 'order-detail' } } },
          ],
        },
      ]),
    ],
    pages: { orders: { actions: { refresh: { does: 'Reload the list' } } } },
  });

  it('routes become REAL page nodes, and the hand-authored overlay keeps the sourced route', () => {
    expect(graph.nodes['home']).toMatchObject({ kind: 'page', parent: null, page: 'home' });
    expect(graph.spec.pages['orders'].route).toBe('/orders');
    expect(Object.keys(graph.spec.affordances)).toEqual(['orders.refresh']);
  });

  it('routing and matching agree: matchRoute finds the pages the tree seeded', () => {
    expect(matchRoute(graph.spec.pages, '/')).toBe('home');
    expect(matchRoute(graph.spec.pages, '/orders')).toBe('orders');
    expect(matchRoute(graph.spec.pages, '/orders/57')).toBe('order-detail');
  });

  it('a sourced page is a live node at runtime — the session accepts it', () => {
    expect(() => graph.createSession().registerActions('order-detail')).not.toThrow();
  });

  it('every refusal it throws is the package’s own error class', () => {
    expect(() => fromReactRouter([{ path: '/' }])).toThrow(GraphValidationError);
  });
});
