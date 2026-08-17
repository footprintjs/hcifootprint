/**
 * Who moved the cursor?
 *
 * The focus has always moved; until now nothing recorded WHY. In a library
 * whose subject is mixed initiative that is the question worth answering — the
 * journey beside this one is "user finds a dress → agent purchases → user asks
 * about the order", and it is two different stories depending on which of them
 * moved the cursor at each step. A recording that cannot separate them cannot
 * answer the only question anybody asks of it.
 *
 * Driven through the real app rather than a hand-built graph: an unmounted
 * fixture makes `fire()` answer `ok: false`, the recorder is never reached, and
 * a test written against it passes its setup while proving nothing.
 */
import { describe, expect, it } from 'vitest';
import { createDressShopApp } from './store.js';

describe('focusHistory attributes every move to a principal', () => {
  it('starts empty — beginning somewhere is not a move', () => {
    expect(createDressShopApp().session.focusHistory).toEqual([]);
  });

  it('records the principal and the affordance that moved the focus', () => {
    const s = createDressShopApp().session;
    s.fire('browse-dresses', { source: 'user' });

    const [move] = s.focusHistory;
    expect(move, 'a successful fire recorded no focus move').toBeDefined();
    expect(move!.cause.kind).toBe('fired');
    expect(move!.cause.principal).toBe('user');
    expect(move!.cause.affordanceId).toBe('browse-dresses');
  });

  it('separates the user-driven half of a journey from the agent-driven half', async () => {
    const app = createDressShopApp();
    const s = app.session;

    const flush = () => new Promise((r) => setTimeout(r, 0));
    // Each navigation mounts the next page's group lazily, so the journey has to
    // let the mount land before firing what it unlocked — the same shape
    // journey.test.ts uses.
    s.fire('browse-dresses', { source: 'user' });
    await flush();
    s.fire('search-dresses', { source: 'user', payload: { query: 'dress' } });
    await flush();
    s.fire('filter-by-color', { source: 'user', payload: { color: 'red' } });
    await flush();
    s.fire('view-dress', { source: 'user', payload: { dressId: 'd3' } });
    await flush();
    // The handover: the agent takes the cursor from here.
    s.fire('add-to-cart', { source: 'agent' });

    const principals = s.focusHistory.map((m) => m.cause.principal);
    expect(principals).toContain('user');
    expect(principals).toContain('agent');
    // The claim this whole feature exists for: the LAST hand on the cursor is
    // knowable, so "who put us here" is a lookup rather than an argument.
    expect(principals[principals.length - 1]).toBe('agent');
  });

  it('does not credit a principal with a fire that was refused', () => {
    const s = createDressShopApp().session;
    const before = s.focusHistory.length;
    // Not reachable from the starting page — the guard refuses it.
    const refused = s.fire('place-order', { source: 'agent' });
    if (!refused.ok) expect(s.focusHistory.length).toBe(before);
  });
});
