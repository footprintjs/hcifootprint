/**
 * D13 integration — declare statically, bind dynamically:
 * registerHandlers (additive), fire() invoking real handlers, record-only mode,
 * materialization, and tier-2 effect-signature inference with honesty flags.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { shop, initialState, okUpdate } from './fixture.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const binding = { kind: 'element', locator: { role: 'button', name: 'Go' } } as const;

describe('registerHandlers() — the additive live-binding wire', () => {
  it('rejects undeclared affordance ids loudly, naming the known ones', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    expect(() => s.registerHandlers({ group: 'g', handlers: { ghost: () => 1 } })).toThrow(
      /undeclared affordance\(s\) 'ghost'.*add-to-cart/s,
    );
  });

  it('fire(agent) invokes the registered handler with the payload — the acting loop closes', async () => {
    const calls: unknown[] = [];
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerHandlers({
      group: 'catalog-page',
      handlers: { 'add-to-cart': (payload) => calls.push(payload) },
    });
    const r = s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    expect(r).toMatchObject({ ok: true, settlement: 'awaiting-state' });
    await flush();
    expect(calls).toEqual([{ productId: 'p1' }]);
  });

  it('invoke:false is record-only (the DOM sensor mode — the browser already ran the onClick)', async () => {
    const calls: unknown[] = [];
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerHandlers({ group: 'g', handlers: { 'add-to-cart': () => calls.push(1) } });
    s.fire('add-to-cart', { source: 'user', payload: { productId: 'p1' }, invoke: false });
    await flush();
    expect(calls).toEqual([]); // recorded, not executed by us
    expect(s.transitions()[0].cause).toMatchObject({ kind: 'fired', principal: 'user' });
  });

  it('wrapped triggers record source user AND invoke the handler exactly once', async () => {
    const calls: unknown[] = [];
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    const { triggers } = s.registerHandlers({
      group: 'g',
      handlers: { 'add-to-cart': (payload) => calls.push(payload) },
    });
    const r = triggers['add-to-cart']({ productId: 'p9' });
    expect(r).toMatchObject({ ok: true });
    await flush();
    expect(calls).toEqual([{ productId: 'p9' }]);
    expect(s.transitions()[0].cause).toMatchObject({ kind: 'fired', principal: 'user', affordanceId: 'add-to-cart' });
  });

  it('unregistering removes the live binding, and the action goes back to being unwired', async () => {
    const calls: unknown[] = [];
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    const { unregister } = s.registerHandlers({ group: 'g', handlers: { 'add-to-cart': () => calls.push(1) } });
    unregister();
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    await flush();
    expect(calls).toEqual([]); // no live binding → record-only again
  });

  it('materialized appears on edges only when registrations exist, and doubles as drift telemetry', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    expect(s.available().edges[0].materialized).toBeUndefined(); // headless session: flag absent

    s.registerHandlers({ group: 'g', handlers: { login: () => 1 } });
    const byId = Object.fromEntries(s.available().edges.map((e) => [e.affordanceId, e]));
    expect(byId['login'].materialized).toBe(true);
    // declared on this page but nothing registered it → visible drift signal:
    s.updateState({ authenticated: true, cartCount: 1 }, { stimulus: 'push' });
    const cart = s.available().edges.find((e) => e.affordanceId === 'go-to-cart')!;
    expect(cart.materialized).toBe(false);
  });

  it('a throwing handler auto-rejects its pending transition and warns — never stuck', async () => {
    const warnings: string[] = [];
    const s = shop().createSession({
      node: 'catalog',
      state: { ...initialState, authenticated: true },
      onWarn: (m) => warnings.push(m),
    });
    s.registerHandlers({
      group: 'g',
      handlers: {
        'add-to-cart': () => {
          throw new Error('api down');
        },
      },
    });
    const r = s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    await flush();
    const t = (r as { transition: { outcome: string } }).transition;
    expect(t.outcome).toBe('rejected');
    expect(s.pending()).toEqual([]);
    expect(warnings.some((w) => w.includes('api down'))).toBe(true);
    // a later clean delta is NOT mis-attributed to the dead transition:
    expect(okUpdate(s.updateState({ cart: [], cartCount: 0 })).attributed).toBe(false);
  });
});

describe('handler races — the handler has first claim on its own record', () => {
  it('burst-fire with a throwing first handler: neighbor reports settle their OWN records; the failed fire is rejected', async () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        search: { on: 'a', does: 'Search', binding, writes: ['resultIds', 'resultCount'] },
        filter: { on: 'a', does: 'Filter', binding, writes: ['resultIds', 'resultCount', 'activeColor'] },
      },
    });
    const warnings: string[] = [];
    const s = g.createSession({ node: 'a', onWarn: (m) => warnings.push(m) });
    s.registerHandlers({
      group: 'g',
      handlers: {
        search: () => {
          throw new Error('search backend down');
        },
        // filter reports synchronously from inside its own invocation:
        filter: () => s.updateState({ resultIds: ['d1'], resultCount: 1, activeColor: 'red' }),
      },
    });

    const searchFire = s.fire('search', { source: 'agent', payload: { query: 'x' } });
    const filterFire = s.fire('filter', { source: 'agent', payload: { color: 'red' } });
    await flush();

    const searchT = (searchFire as { transition: { outcome: string } }).transition;
    const filterT = (filterFire as { transition: { outcome: string } }).transition;
    expect(filterT.outcome).toBe('committed'); // settled by ITS OWN handler's report
    expect(searchT.outcome).toBe('rejected'); // auto-rejected, never stolen
    expect(s.pending()).toEqual([]); // nothing stuck
    expect(warnings.some((w) => w.includes('search backend down'))).toBe(true);
  });

  it('an external unhinted delta never steals a record whose handler is still in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerHandlers({ group: 'g', handlers: { 'add-to-cart': () => gate } }); // slow async handler
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });

    // A server push lands while the handler is mid-flight, with no hints:
    const u = okUpdate(s.updateState({ notifications: 5 }));
    expect(u.attributed).toBe(false); // fell through to stimulus — not stolen
    expect(s.pending()).toHaveLength(1);

    release();
    await flush();
    const settled = okUpdate(s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 }));
    expect(settled.attributed).toBe(true); // handler done → the tap's report settles it normally
    expect(settled.transition.cause.affordanceId).toBe('add-to-cart');
  });

  it('a throwing handler on an ALREADY-COMMITTED navigation claim rolls it back and walks the cursor home', async () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
        b: {},
      },
      actions: {
        go: { on: 'a', does: 'Go to b', binding, goTo: 'b' },
      },
    });
    const warnings: string[] = [];
    const s = g.createSession({ node: 'a', onWarn: (m) => warnings.push(m) });
    s.registerHandlers({
      group: 'g',
      handlers: {
        go: () => {
          throw new Error('router crashed');
        },
      },
    });
    const r = s.fire('go', { source: 'agent' });
    expect(s.node).toBe('b'); // the claim moved the cursor…
    await flush();
    const t = (r as { transition: { outcome: string } }).transition;
    expect(t.outcome).toBe('rolled-back'); // …but the failure is not recorded as success
    expect(s.node).toBe('a'); // and the cursor honestly walked home
    expect(warnings.some((w) => w.includes('router crashed'))).toBe(true);
  });
});

describe('tier-2 effect-signature inference — a guess, marked as one', () => {
  it('an unattributed delta matching exactly one registered affordance is attributed with inferred:true', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerHandlers({ group: 'g', handlers: { 'add-to-cart': () => 1 } });
    // The user clicked the app's own untouched button; only the store tap fires:
    const u = okUpdate(s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 }));
    expect(u.transition.cause).toEqual({
      kind: 'fired',
      affordanceId: 'add-to-cart',
      // A guessed ATTRIBUTION still names a real action, so the row captures
      // its authored sentence exactly as a fired one does. What stays a guess
      // is `inferred`.
      does: 'Add a product to the cart',
      principal: 'unknown',
      inferred: true,
    });
    expect(u.transition.effectVerified).toBe(true);
    expect(s.contextBrief().text).toContain('[inferred, not observed]');
  });

  it('ambiguity refuses to guess: two matching signatures fall back to a stimulus record', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        'save-a': { on: 'a', does: 'Save A', binding: { kind: 'element', locator: { role: 'button', name: 'A' } }, writes: ['value'] },
        'save-b': { on: 'a', does: 'Save B', binding: { kind: 'element', locator: { role: 'button', name: 'B' } }, writes: ['value'] },
      },
    });
    const s = g.createSession({ node: 'a' });
    s.registerHandlers({ group: 'g', handlers: { 'save-a': () => 1, 'save-b': () => 2 } });
    const u = okUpdate(s.updateState({ value: 42 }));
    expect(u.transition.cause.kind).toBe('stimulus'); // refused to pick between the two
  });

  it('never reinterprets an explicitly-marked stimulus, and never fires for unregistered affordances', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.registerHandlers({ group: 'g', handlers: { 'add-to-cart': () => 1 } });
    const explicit = okUpdate(s.updateState({ cart: [], cartCount: 0 }, { stimulus: 'push' }));
    expect(explicit.transition.cause.kind).toBe('stimulus'); // explicit attribution wins

    const bare = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    const u = okUpdate(bare.updateState({ cart: [], cartCount: 0 })); // nothing registered at all
    expect(u.transition.cause.kind).toBe('stimulus');
  });
});
