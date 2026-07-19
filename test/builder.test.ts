import { describe, expect, it } from 'vitest';
import { skillGraph, SkillGraphValidationError } from '../src/index.js';
import { shop } from './fixture.js';

const binding = { kind: 'element', locator: { role: 'button', name: 'Go' } } as const;

describe('skillGraph builder — enforcement spine', () => {
  it('builds a frozen, serializable spec', () => {
    const g = shop();
    expect(Object.isFrozen(g.spec)).toBe(true);
    expect(Object.isFrozen(g.spec.affordances)).toBe(true);
    // Worker-transferable: plain data, survives structuredClone
    expect(() => structuredClone(g.spec)).not.toThrow();
    expect(Object.keys(g.spec.pages)).toEqual(['catalog', 'cart', 'checkout']);
  });

  it('rejects duplicate ids', () => {
    expect(() => skillGraph('g').page('a').page('a')).toThrow(SkillGraphValidationError);
    const b = skillGraph('g').page('a').affordance('x', { on: 'a', description: 'd', binding });
    expect(() => b.affordance('x', { on: 'a', description: 'd', binding })).toThrow(/duplicate affordance/);
  });

  it('rejects an affordance on an unknown page, naming the known pages', () => {
    const b = skillGraph('g').page('home').affordance('x', { on: 'nope', description: 'd', binding });
    expect(() => b.build()).toThrow(/unknown page 'nope'.*home/);
  });

  it('rejects navigatesTo an unknown page', () => {
    const b = skillGraph('g')
      .page('home')
      .affordance('x', { on: 'home', description: 'd', binding, effect: { navigatesTo: 'ghost' } });
    expect(() => b.build()).toThrow(/navigatesTo unknown page 'ghost'/);
  });

  it('rejects an empty guard {} with the anti-vacuous-truth explanation', () => {
    expect(() =>
      skillGraph('g').page('a').affordance('x', { on: 'a', description: 'd', binding, guard: {} }),
    ).toThrow(/empty guard.*NEVER matches/i);
  });

  it('rejects guard operator typos at build time', () => {
    expect(() =>
      skillGraph('g')
        .page('a')
        .affordance('x', {
          on: 'a',
          description: 'd',
          binding,
          guard: { count: { gle: 3 } as never },
        }),
    ).toThrow(/unknown operator 'gle'/);
  });

  it('rejects an EMPTY operator object on a guard key — it would be silently ignored at runtime', () => {
    expect(() =>
      skillGraph('g')
        .page('a')
        .affordance('x', {
          on: 'a',
          description: 'd',
          binding,
          guard: { authenticated: { eq: true }, admin: {} as never },
        }),
    ).toThrow(/key 'admin' has an empty operator object/);
  });

  it('rejects skill precondition typos too — same loud-failure contract as guards', () => {
    expect(() =>
      skillGraph('g')
        .page('a')
        .affordance('x', { on: 'a', description: 'd', binding })
        .skill('s', { description: 'd', steps: ['x'], precondition: { count: { equals: 3 } as never } }),
    ).toThrow(/precondition key 'count' uses unknown operator 'equals'/);
  });

  it("rejects guard keys on footprint's denied list (they silently never match)", () => {
    expect(() =>
      skillGraph('g')
        .page('a')
        .affordance('x', { on: 'a', description: 'd', binding, guard: { constructor: { eq: 1 } } as never }),
    ).toThrow(/denied list/);
  });

  it('rejects on: [] — an affordance that could never be offered', () => {
    expect(() =>
      skillGraph('g').page('a').affordance('x', { on: [], description: 'd', binding }),
    ).toThrow(/on: \[\]/);
  });

  it('compiled guards are deep-frozen AND decoupled from the author\'s live objects', () => {
    const authorGuard = { authenticated: { eq: false } };
    const g = skillGraph('g')
      .page('a')
      .affordance('x', { on: 'a', description: 'd', binding, guard: authorGuard })
      .build();
    const s = g.createSession({ node: 'a', state: { authenticated: false } });

    // author mutates their original object post-build → no effect (cloned at build)
    authorGuard.authenticated = { eq: true } as never;
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['x']);

    // the compiled guard itself is frozen → strict-mode mutation throws
    expect(() => {
      (g.spec.affordances['x'].guard as Record<string, unknown>)['authenticated'] = { eq: true };
    }).toThrow(TypeError);
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['x']);
  });

  it('requires a description — the planner-facing text', () => {
    expect(() =>
      skillGraph('g').page('a').affordance('x', { on: 'a', description: '  ', binding }),
    ).toThrow(/needs a description/);
  });

  it('rejects a skill step that is not a known affordance', () => {
    const b = skillGraph('g')
      .page('a')
      .affordance('x', { on: 'a', description: 'd', binding })
      .skill('s', { description: 'd', steps: ['x', 'ghost'] });
    expect(() => b.build()).toThrow(/step 'ghost' is not a known affordance/);
  });

  it('rejects an unrecognized schema object', () => {
    expect(() =>
      skillGraph('g')
        .page('a')
        .affordance('x', { on: 'a', description: 'd', binding, schema: { totally: 'random' } }),
    ).toThrow(/unrecognized schema/);
  });

  it('derives canonical roles: navigatesTo → next, otherwise action; explicit wins', () => {
    const g = skillGraph('g')
      .page('a')
      .page('b')
      .affordance('nav', { on: 'a', description: 'd', binding, effect: { navigatesTo: 'b' } })
      .affordance('act', { on: 'a', description: 'd', binding })
      .affordance('cancel', { on: 'a', description: 'd', binding, role: 'cancel' })
      .build();
    expect(g.spec.affordances['nav'].role).toBe('next');
    expect(g.spec.affordances['act'].role).toBe('action');
    expect(g.spec.affordances['cancel'].role).toBe('cancel');
  });
});

describe('skillGraph — requiredStateKeys (the projector-seed set)', () => {
  it('returns the sorted, deduped guard-key set across every tool and skill precondition', () => {
    // shop() guards read `authenticated` (login, add-to-cart, place-order + the
    // skill precondition) and `cartCount` (go-to-cart, proceed-to-checkout,
    // place-order) — every key, once, sorted.
    expect(shop().requiredStateKeys()).toEqual(['authenticated', 'cartCount']);
  });

  it('a guard-free graph returns []', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('x', { on: 'a', description: 'd', binding })
      .build();
    expect(g.requiredStateKeys()).toEqual([]);
  });

  it('a key read by several guards (and a precondition) appears exactly once', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('x', { on: 'a', description: 'd', binding, guard: { role: { eq: 'admin' } } })
      .affordance('y', {
        on: 'a',
        description: 'd',
        binding,
        guard: { role: { ne: 'guest' }, tier: { eq: 'gold' } },
      })
      .skill('s', { description: 'd', steps: ['x'], precondition: { role: { eq: 'admin' } } })
      .build();
    expect(g.requiredStateKeys()).toEqual(['role', 'tier']);
  });
});
