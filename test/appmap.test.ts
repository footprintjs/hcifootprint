/**
 * D18 — buildNavigationGraph(): one object literal in, a validated frozen tree + flat
 * projection out. The enforcement spine is the same one every door shares: every
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
          actions: { 'set-color': { does: 'Filter dresses by color' } },
        },
      },
      actions: {
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
          actions: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } },
        },
      },
      tabs: {
        shipping: { actions: { 'save-address': { does: 'Save the shipping address', writes: ['address'] } } },
        payment: { actions: { 'save-card': { does: 'Save the payment card', writes: ['card'] } } },
      },
    },
    orders: {
      areas: {
        'order-card': {
          repeats: true,
          actions: { 'cancel-order': { does: 'Cancel this order', confirm: true } },
        },
      },
    },
  },
  actions: {
    'open-help': { does: 'Open the help panel', on: ['catalog', 'orders'] },
  },
  journeys: {
    purchase: {
      does: 'Buy a dress end to end',
      steps: ['add-to-cart', 'go-checkout', 'place-order'],
      when: { authenticated: { eq: true } },
    },
  },
};

describe('an app description becomes a graph an agent can plan over', () => {
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
    expect(map.actionNodes['catalog.filter-rail.set-color']).toEqual(['catalog.filter-rail']);
    expect(map.actionNodes['open-help']).toEqual(['catalog', 'orders']); // a root action lives on every page it was offered on
  });

  it('the flat projection is a real NavigationGraphSpec — a PLAIN Session runs on it', () => {
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

  it('container when AND-composes into descendant action guards (root → leaf)', () => {
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
            areas: { a: { actions: { t: { does: 'd', when: { tier: { eq: 'silver' } } } } } },
          },
        },
      }),
    ).toThrow(/children can only narrow/);
  });

  it('journeys resolve steps by unambiguous suffix; ambiguity and misses die loudly', () => {
    const map = buildNavigationGraph('shop', DEF);
    expect(map.spec.journeys['purchase'].steps).toEqual([
      'catalog.add-to-cart',
      'catalog.go-checkout',
      'checkout.confirm-order.place-order',
    ]);
    expect(() =>
      buildNavigationGraph('x', {
        pages: {
          a: { actions: { save: { does: 'd' } } },
          b: { actions: { save: { does: 'd' } } },
        },
        journeys: { s: { does: 'd', steps: ['save'] } },
      }),
    ).toThrow(/ambiguous/);
    expect(() =>
      buildNavigationGraph('x', {
        pages: { a: { actions: { t: { does: 'd' } } } },
        journeys: { s: { does: 'd', steps: ['ghost'] } },
      }),
    ).toThrow(/matches no action/);
  });

  it('rejects reserved characters in names, unknown goTo, empty when, reserved leave-journey', () => {
    expect(() => buildNavigationGraph('x', { pages: { 'a.b': {} } })).toThrow(/reserved character/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { actions: { t: { does: 'd', goTo: 'ghost' } } } } }),
    ).toThrow(/goTo unknown page/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { actions: { t: { does: 'd', when: {} } } } } }),
    ).toThrow(/empty when/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { actions: { 'leave-journey': { does: 'd' } } } } }),
    ).toThrow(/reserved/);
    expect(() =>
      buildNavigationGraph('x', { pages: { a: { areas: { b: {} }, actions: { b: { does: 'd' } } } } }),
    ).toThrow(/both a container and an action/);
  });

  it('an action needs only `does` to exist in the spine — the gradient floor', () => {
    const map = buildNavigationGraph('tiny', { pages: { home: { actions: { hello: { does: 'Say hello' } } } } });
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

describe('which state keys an app must report for the graph to answer honestly', () => {
  const GUARDED: NavigationGraphDef = {
    pages: {
      catalog: {
        actions: {
          'add-to-cart': { does: 'd', when: { authenticated: { eq: true } }, writes: ['cart'] },
          browse: { does: 'd' }, // guard-free — contributes no key
        },
      },
      checkout: {
        when: { authenticated: { eq: true } }, // node guard — key repeats an action's
        areas: {
          promo: {
            when: { tier: { eq: 'gold' } },
            actions: { 'apply-code': { does: 'd', when: { hasPromo: { eq: true } } } },
          },
        },
      },
      settings: {
        // A guard-bearing container with NO descendant action: its key surfaces
        // ONLY through node.guard (it AND-composes into an action mounted here later).
        areas: { advanced: { when: { betaEnabled: { eq: true } } } },
        actions: { save: { does: 'd' } },
      },
    },
    journeys: {
      buy: { does: 'd', steps: ['add-to-cart'], when: { cartCount: { gt: 0 } } },
    },
  };

  it('folds action whens, composed chains, container-only whens, and journey preconditions — sorted, deduped', () => {
    const map = buildNavigationGraph('shop', GUARDED);
    // apply-code's composed guard = checkout.authenticated + promo.tier + own hasPromo;
    // settings.advanced contributes betaEnabled purely via node.guard; buy adds cartCount.
    expect(map.requiredStateKeys()).toEqual([
      'authenticated',
      'betaEnabled',
      'cartCount',
      'hasPromo',
      'tier',
    ]);
  });

  it('a guard-free graph returns []', () => {
    const map = buildNavigationGraph('bare', { pages: { home: { actions: { hi: { does: 'd' } } } } });
    expect(map.requiredStateKeys()).toEqual([]);
  });

  it('a key read by several guards appears exactly once (authenticated spans an action, a node, and a composed chain)', () => {
    const map = buildNavigationGraph('shop', GUARDED);
    const keys = map.requiredStateKeys();
    expect(keys.filter((k) => k === 'authenticated')).toEqual(['authenticated']);
  });
});

/**
 * A GUARD THAT COULD NEVER MATCH DIES AT AUTHORING TIME, NOT IN PRODUCTION.
 *
 * The evaluator's stance at RUNTIME is to fail a malformed condition quietly —
 * which for a guard means the control is simply never offered. To an author that
 * is indistinguishable from "the state is not right yet", and to a planner it is
 * a control that does not exist. So the shape is judged where a person is still
 * reading: at build, by name, with the operator list in the sentence.
 *
 * These three refusals are SHARED — the compiler here, mount-time declaration,
 * and journey preconditions all reach the same checker. Their proofs used to
 * live with the v1 fluent builder, which is deleted at 1.0; the checker outlived
 * it, so the proofs are restated here against the door that survived.
 */
describe('EVERY REFUSAL TEACHES: a guard whose shape the evaluator would ignore', () => {
  it('a key on footprint’s denied list is refused, and told WHY it would never match', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: { actions: { act: { does: 'Act', when: { toString: { eq: true } } } } } },
      }),
    ).toThrow(/key 'toString' is on footprint's denied list/);
  });

  it('a key mapped to something that is not an operator object names the operators it could use', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: { actions: { act: { does: 'Act', when: { admin: true } } } } },
      } as never),
    ).toThrow(/key 'admin' must map to an operator object like \{ eq: value \}/);
    // An array is an object too, and would be just as silently ignored.
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: { actions: { act: { does: 'Act', when: { admin: ['eq'] } } } } },
      } as never),
    ).toThrow(/must map to an operator object/);
  });

  it('an EMPTY operator object is refused rather than silently ignored', () => {
    // `{ admin: {} }` reads as a condition and enforces nothing. Left alone it
    // would either vanish from the guard or — as the only key — make the guard
    // never match. Both are a control quietly behaving unlike its declaration.
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: { actions: { act: { does: 'Act', when: { admin: {} } } } } },
      }),
    ).toThrow(/key 'admin' has an empty operator object \{\}/);
  });

  it('a typo in an operator name is refused, with the valid list to correct against', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: { actions: { act: { does: 'Act', when: { count: { gle: 3 } } } } } },
      } as never),
    ).toThrow(/uses unknown operator 'gle'/);
  });
});

describe('EVERY REFUSAL TEACHES: an app description that could not compile into a graph', () => {
  it('needs a graph id, because the id names every tool the model will ever see', () => {
    const page = { pages: { home: { actions: { go: { does: 'Go' } } } } };
    expect(() => buildNavigationGraph('', page)).toThrow(/requires a non-empty id/);
    expect(() => buildNavigationGraph('   ', page)).toThrow(/requires a non-empty id/);
  });

  it('needs a `does` on every action — it is the one string both readers get', () => {
    expect(() =>
      buildNavigationGraph('g', { pages: { home: { actions: { go: { does: '  ' } } } } }),
    ).toThrow(/action 'home.go' needs a 'does'/);
  });

  it('refuses a PAGE that repeats — a page is a place, and there is one of it', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { orders: { repeats: true, actions: { open: { does: 'Open one' } } } },
      }),
    ).toThrow(/page 'orders' cannot be repeats — repeat a container inside it/);
  });

  it('refuses an instances source on a container that is not a repeats container', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: {
          orders: {
            areas: { list: { instances: () => ['o-1'], actions: { open: { does: 'Open one' } } } },
          },
        },
      }),
    ).toThrow(/declares an instances source but is not repeats: true/);
  });

  it('refuses two children of one node sharing a name, whichever buckets they came from', () => {
    // areas / tabs / modals are ONE namespace because they become one path
    // segment — the second 'panel' would silently overwrite the first.
    expect(() =>
      buildNavigationGraph('g', {
        pages: {
          home: {
            areas: { panel: { actions: { a: { does: 'A' } } } },
            modals: { panel: { actions: { b: { does: 'B' } } } },
          },
        },
      }),
    ).toThrow(/node 'home' declares 'panel' twice \(areas\/tabs\/modals share one namespace\)/);
  });

  it('refuses a journey with nothing to say and a journey with nothing to do', () => {
    const base = { pages: { home: { actions: { go: { does: 'Go', writes: ['x'] } } } } };
    expect(() =>
      buildNavigationGraph('g', { ...base, journeys: { flow: { does: ' ', steps: ['go'] } } }),
    ).toThrow(/journey 'flow' needs a 'does'/);
    expect(() =>
      buildNavigationGraph('g', { ...base, journeys: { flow: { does: 'A flow', steps: [] } } }),
    ).toThrow(/journey 'flow' needs at least one step/);
  });
});

describe('an action offered on several pages at once', () => {
  it('needs at least one page to be offered on', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: {} },
        actions: { help: { does: 'Open help', on: [] } },
      }),
    ).toThrow(/root action 'help' has on: \[\] — list at least one page/);
  });

  it('names the pages it DOES know when it is offered on one that does not exist', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: {}, settings: {} },
        actions: { help: { does: 'Open help', on: ['nowhere'] } },
      }),
    ).toThrow(/offered on unknown page 'nowhere'. Known pages: home, settings/);
  });

  it('refuses to take an id something else in the graph already answers to', () => {
    expect(() =>
      buildNavigationGraph('g', {
        pages: { home: {} },
        actions: { home: { does: 'A thing named after a page', on: ['home'] } },
      }),
    ).toThrow(/root action 'home' collides with an existing id/);
  });
});
