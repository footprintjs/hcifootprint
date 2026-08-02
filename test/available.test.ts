/**
 * WHAT CAN BE DONE FROM HERE — the offer a model reads before it reaches.
 *
 * A page's declared actions are not all reachable at once. A guard says what
 * must be true for one to be offered, and `available()` is the answer to the
 * only question a planner asks first: of everything this app declares, what
 * could I act on standing where I am standing?
 *
 * That answer is arithmetic over declared conditions and reported state. It
 * expresses no preference, ranks nothing, and recommends nothing — ordering
 * intent toward a goal is a JOURNEY, which is authored. This is the set, and
 * beside each member the evidence that put it there.
 *
 * THREE HONESTY LAWS LIVE HERE, each pinned below:
 * - UNKNOWABLE BECOMES ABSENCE, NOT FALSE. A guard reading a key the app has
 *   never reported is UNEVALUABLE. The edge is served WITH the marker, never
 *   silently withheld — hiding it would be this library deciding, from missing
 *   information, that a real control does not exist.
 * - A REFUSAL TEACHES. `explain()` answers why an edge is not offered by naming
 *   the conditions that failed, so a planner can act on the answer rather than
 *   re-firing to discover it.
 * - REDACTION HOLDS ON EVERY CHANNEL. Evidence is a channel like any other: a
 *   hidden key's value cannot ride out through the reason an edge passed.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { shop, initialState } from './fixture.js';

const binding = { kind: 'element', locator: { role: 'button', name: 'Go' } } as const;

describe('the set of actions a planner may reach for right now', () => {
  it('offers only what is declared on this page AND whose guard passes', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const slice = s.available();
    expect(slice.node).toBe('catalog');
    // authenticated=false → login passes (eq:false), add-to-cart fails, cartCount=0 → go-to-cart fails
    expect(slice.edges.map((e) => e.affordanceId)).toEqual(['login']);
  });

  it('the offer moves when the world moves — a plan made against the old set is stale', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.updateState({ authenticated: true, cartCount: 2 }, { stimulus: 'push' });
    const ids = s.available().edges.map((e) => e.affordanceId);
    expect(ids).toContain('add-to-cart');
    expect(ids).toContain('go-to-cart');
    expect(ids).not.toContain('login'); // eq:false now fails
  });

  it('an action the author put on two pages is offered on both, and fireable on both', () => {
    const s = shop().createSession({ node: 'cart', state: initialState });
    const ids = s.available().edges.map((e) => e.affordanceId);
    expect(ids).toContain('login');
    expect(ids).not.toContain('add-to-cart'); // catalog-only
    expect(s.fire('login', { source: 'user' })).toMatchObject({ ok: true, settlement: 'awaiting-state' });
  });

  it('reading the state a caller was served can never edit the state the guards read', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const snap = s.state();
    (snap as Record<string, unknown>)['authenticated'] = true;
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['login']);
  });
});

describe('every offer arrives with the evidence that put it there', () => {
  it('names each condition, what it compared, and how it came out', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, cartCount: 3 } });
    const edge = s.available().edges.find((e) => e.affordanceId === 'go-to-cart');
    expect(edge).toBeDefined();
    expect(edge!.evidence).toEqual([
      expect.objectContaining({ key: 'cartCount', op: 'gt', threshold: 0, result: true }),
    ]);
  });

  it('an action the author marked hard-to-undo says so on the row, before it is fired', () => {
    const s = shop().createSession({
      node: 'checkout',
      state: { ...initialState, authenticated: true, cartCount: 1 },
    });
    const edge = s.available().edges.find((e) => e.affordanceId === 'place-order');
    expect(edge).toMatchObject({ highEffect: true, role: 'action' });
  });

});

describe('EVERY REFUSAL TEACHES: why an action is not on the list', () => {
  it('names the conditions that failed, and separately whether the action is even here', () => {
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

});

describe('UNKNOWABLE BECOMES ABSENCE: a guard on a key the app never reported', () => {
  // The alternative is this library reading missing information as `false` and
  // withholding a control that may well be live — a verdict drawn from silence,
  // which is the one inference the house forbids.
  it('is served WITH the unevaluable marker, never silently withheld', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        x: { on: 'a', does: 'd', binding, when: { missingKey: { eq: true } } },
      },
    });
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

});

describe('REDACTION HOLDS ON THE EVIDENCE CHANNEL TOO', () => {
  it('a hidden key cannot leak its value through the reason an action passed', () => {
    const s = shop().createSession({
      node: 'catalog',
      state: { ...initialState, authenticated: true },
      redactedKeys: ['authenticated'],
    });
    const edge = s.available().edges.find((e) => e.affordanceId === 'add-to-cart');
    expect(edge!.evidence[0].redacted).toBe(true);
    expect(edge!.evidence[0].actualSummary).toBe('[REDACTED]');
  });

});

describe('which journeys are worth committing to from here', () => {
  it('separates "the precondition holds" from "the first step can actually be taken"', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    let journeys = s.availableJourneys().journeys;
    expect(journeys).toHaveLength(1);
    expect(journeys[0]).toMatchObject({ id: 'purchase', preconditionPassed: false, entryAvailable: false });

    s.updateState({ authenticated: true }, { stimulus: 'push' });
    journeys = s.availableJourneys().journeys;
    expect(journeys[0]).toMatchObject({ id: 'purchase', preconditionPassed: true, entryAvailable: true });
  });
});
