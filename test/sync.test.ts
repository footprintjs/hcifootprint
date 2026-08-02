/**
 * THE WORLD MOVED WITHOUT US — telling the session where the human actually is.
 *
 * An app navigates for a hundred reasons this library never sees: a back
 * button, a deep link, a redirect after login, a push from a server. If the
 * session only learned about motion it caused, its cursor would drift away from
 * the screen, and every answer it gave afterwards would be about a page nobody
 * is looking at. `sync()` is the door for saying so.
 *
 * WHAT THIS MUST NEVER DO is quietly promote that report into something it is
 * not. Three laws are pinned below.
 *
 * - A REPORT IS NOT A VERIFIED CROSSING. Nothing here passed a guard, so the
 *   hop is stamped `unverifiedEdge` and downstream readers treat it as inferred
 *   rather than proven. The library did not watch this happen.
 * - SILENCE IS NEVER A VERDICT. A page the graph never declared is FOLLOWED,
 *   marked off-graph, and answered with an empty offer — not refused, and not
 *   papered over with the nearest page that resembles it. The session is lost,
 *   says so, and can be told its way back.
 * - MOTION IS NOT ATTRIBUTION. A fire that is still awaiting its report keeps
 *   the page it was fired on. A human wandering off in the meantime must never
 *   be recorded as where that fire took them.
 */
import { describe, expect, it } from 'vitest';
import { shop, initialState, okUpdate } from './fixture.js';

describe('telling the session the app moved on its own', () => {
  it('records the hop as a real transition, marked as one nobody watched happen', () => {
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

  it('leaves a cursor stop on the commit log that joins back to the interaction record by id', () => {
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

  it('being told what it already knew writes nothing and moves no version', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const v = s.version;
    const r = s.sync('catalog');
    expect(r).toEqual({ changed: false, node: 'catalog', version: v });
    expect(s.transitions()).toHaveLength(0);
  });

});

describe('SILENCE IS NEVER A VERDICT: a page the graph never declared', () => {
  it('is followed, marked off-graph, answered with nothing offered — and is recoverable', () => {
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

});

describe('MOTION IS NOT ATTRIBUTION: what a wandering human cannot be blamed for', () => {
  it('a hop taken while a fire is still open is never recorded as that fire’s destination', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.fire('login', { source: 'user' }); // pending, fired on catalog, no navigatesTo
    s.sync('checkout'); // user wandered off before the state report arrived
    const settled = okUpdate(s.updateState({ authenticated: true, user: {} }));
    expect(settled.transition.fromNode).toBe('catalog');
    expect(settled.transition.toNode).toBe('catalog'); // the sync hop, not login, made the move
    expect(settled.transition.toNodeClaimed).toBeUndefined();
  });

  it('a state change nobody fired for is recorded as the world moving, not as an act', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const u = okUpdate(s.updateState({ cartCount: 3 }, { stimulus: 'push' }));
    expect(u.attributed).toBe(false);
    expect(u.transition.cause).toMatchObject({ kind: 'stimulus', stimulus: 'push', principal: 'system' });
    // the pushed state is now guard-visible:
    expect(s.available().edges.map((e) => e.affordanceId)).toContain('go-to-cart');
  });
});
