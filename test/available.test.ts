import { describe, expect, it } from 'vitest';
import { skillGraph } from '../src/index.js';
import { shop, initialState } from './fixture.js';

const binding = { kind: 'element', locator: { role: 'button', name: 'Go' } } as const;

describe('available() — the guard-filtered action space', () => {
  it('offers only on-node, guard-passing edges', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const slice = s.available();
    expect(slice.node).toBe('catalog');
    // authenticated=false → login passes (eq:false), add-to-cart fails, cartCount=0 → go-to-cart fails
    expect(slice.edges.map((e) => e.affordanceId)).toEqual(['login']);
  });

  it('the action space changes as projected state changes', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.updateState({ authenticated: true, cartCount: 2 }, { stimulus: 'push' });
    const ids = s.available().edges.map((e) => e.affordanceId);
    expect(ids).toContain('add-to-cart');
    expect(ids).toContain('go-to-cart');
    expect(ids).not.toContain('login'); // eq:false now fails
  });

  it('a multi-page affordance is offered on its second page too', () => {
    const s = shop().createSession({ node: 'cart', state: initialState });
    const ids = s.available().edges.map((e) => e.affordanceId);
    expect(ids).toContain('login');
    expect(ids).not.toContain('add-to-cart'); // catalog-only
    expect(s.fire('login', { source: 'user' })).toMatchObject({ ok: true, settlement: 'awaiting-state' });
  });

  it('serves per-condition evidence — why each edge is passable', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, cartCount: 3 } });
    const edge = s.available().edges.find((e) => e.affordanceId === 'go-to-cart');
    expect(edge).toBeDefined();
    expect(edge!.evidence).toEqual([
      expect.objectContaining({ key: 'cartCount', op: 'gt', threshold: 0, result: true }),
    ]);
  });

  it('surfaces the highEffect marker on the edge', () => {
    const s = shop().createSession({
      node: 'checkout',
      state: { ...initialState, authenticated: true, cartCount: 1 },
    });
    const edge = s.available().edges.find((e) => e.affordanceId === 'place-order');
    expect(edge).toMatchObject({ highEffect: true, role: 'action' });
  });

  it('explain() answers why an edge is NOT available, with failing conditions', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const why = s.explain('add-to-cart');
    expect(why.available).toBe(false);
    expect(why.offeredOnThisNode).toBe(true);
    expect(why.guardPassed).toBe(false);
    expect(why.evidence).toEqual([
      expect.objectContaining({ key: 'authenticated', op: 'eq', result: false }),
    ]);
    // and off-node:
    expect(s.explain('place-order').offeredOnThisNode).toBe(false);
  });

  it('a guard on a key ABSENT from state is served WITH guardUnevaluated — never silently hidden (D18)', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('x', { on: 'a', description: 'd', binding, guard: { missingKey: { eq: true } } })
      .build();
    const s = g.createSession({ node: 'a', state: {} });
    // The session's state view has never contained missingKey: the condition is
    // UNEVALUABLE, not false. The edge is offered, honestly marked, and the app
    // remains the enforcer — one authored graph works at every ladder rung.
    const edges = s.available().edges;
    expect(edges).toHaveLength(1);
    expect(edges[0].guardUnevaluated).toEqual(['missingKey']);
    expect(s.explain('x')).toMatchObject({
      guardPassed: true,
      available: true,
      guardUnevaluated: ['missingKey'],
    });
    // Once the key IS reported, real evaluation takes over and can hide it.
    s.updateState({ missingKey: false }, { stimulus: 'push' });
    expect(s.available().edges).toEqual([]);
    expect(s.explain('x').guardUnevaluated).toBeUndefined();
  });

  it('redacted keys show [REDACTED] in evidence, never the raw value', () => {
    const s = shop().createSession({
      node: 'catalog',
      state: { ...initialState, authenticated: true },
      redactedKeys: ['authenticated'],
    });
    const edge = s.available().edges.find((e) => e.affordanceId === 'add-to-cart');
    expect(edge!.evidence[0].redacted).toBe(true);
    expect(edge!.evidence[0].actualSummary).toBe('[REDACTED]');
  });

  it('availableSkills() discloses skill-level feasibility for the planner', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    let skills = s.availableSkills().skills;
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({ id: 'purchase', preconditionPassed: false, entryAvailable: false });

    s.updateState({ authenticated: true }, { stimulus: 'push' });
    skills = s.availableSkills().skills;
    expect(skills[0]).toMatchObject({ id: 'purchase', preconditionPassed: true, entryAvailable: true });
  });

  it('state() returns a detached snapshot — mutating it cannot corrupt the session', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const snap = s.state();
    (snap as Record<string, unknown>)['authenticated'] = true;
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['login']);
  });
});
