import { describe, expect, it } from 'vitest';
import { shop, initialState, okUpdate } from './fixture.js';

describe('sync() — external motion is recorded, never silent', () => {
  it('records a stimulus transition with unverifiedEdge and moves the cursor', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const before = s.version;
    const r = s.sync('checkout', { stimulus: 'navigation' });
    expect(r.changed).toBe(true);
    expect(s.node).toBe('checkout');
    expect(s.version).toBe(before + 1);

    const t = (r as { transition: import('../src/index.js').TransitionRecord }).transition;
    expect(t.cause).toEqual({ kind: 'stimulus', stimulus: 'navigation', principal: 'system' });
    expect(t.unverifiedEdge).toBe(true); // this hop passed no guard — slices treat it as inferred
    expect(t.fromNode).toBe('catalog');
    expect(t.toNode).toBe('checkout');
  });

  it('writes an EMPTY commit bundle — footprint\'s "cursor stop" idiom — joined by id', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const before = s.commitLog().length;
    const r = s.sync('cart');
    const log = s.commitLog();
    expect(log).toHaveLength(before + 1);
    const bundle = log[log.length - 1];
    const t = (r as { transition: { id: string } }).transition;
    expect(bundle.runtimeStageId).toBe(t.id); // join between interaction log and commit log
    expect(bundle.overwrite).toEqual({});
  });

  it('same-node sync is a no-op (no transition, no version bump)', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const v = s.version;
    const r = s.sync('catalog');
    expect(r).toEqual({ changed: false, node: 'catalog', version: v });
    expect(s.transitions()).toHaveLength(0);
  });

  it('an UNAUTHORED page is followed honestly: offGraph flag, zero edges, recoverable', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const r = s.sync('settings'); // the world went somewhere the graph does not know
    expect(r).toMatchObject({ changed: true, offGraph: true, node: 'settings' });
    expect(s.node).toBe('settings');
    expect(s.available().edges).toEqual([]); // honest: nothing is offered off-graph
    expect(s.transitions()).toHaveLength(1); // the motion was still recorded

    const back = s.sync('catalog');
    expect(back).toMatchObject({ changed: true, node: 'catalog' });
    expect('offGraph' in back && back.offGraph).toBeFalsy();
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['login']);
  });

  it('sync() while a transition is pending does NOT pollute its settlement toNode', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.fire('login', { source: 'user' }); // pending, fired on catalog, no navigatesTo
    s.sync('checkout'); // user wandered off before the state report arrived
    const settled = okUpdate(s.updateState({ authenticated: true, user: {} }));
    expect(settled.transition.fromNode).toBe('catalog');
    expect(settled.transition.toNode).toBe('catalog'); // the sync hop, not login, made the move
    expect(settled.transition.toNodeClaimed).toBeUndefined();
  });

  it('unattributed state deltas become stimulus transitions (server push)', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const u = okUpdate(s.updateState({ cartCount: 3 }, { stimulus: 'push' }));
    expect(u.attributed).toBe(false);
    expect(u.transition.cause).toMatchObject({ kind: 'stimulus', stimulus: 'push', principal: 'system' });
    // the pushed state is now guard-visible:
    expect(s.available().edges.map((e) => e.affordanceId)).toContain('go-to-cart');
  });
});
