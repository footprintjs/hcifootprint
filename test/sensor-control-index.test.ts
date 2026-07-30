/**
 * control-index.ts — the DECLARED level, where identity is OBJECT identity.
 *
 * The two behaviours worth pinning are the StrictMode ones. A React double-invoke
 * runs setup → cleanup → setup, and a naive index answers that with either a stale
 * declaration or none at all. Attach-replaces plus token-identity detach is what
 * makes the sequence net to exactly one, the same contract a PresenceHandle keeps
 * (presence.ts:10-13).
 *
 * Mutation proof: control-index.ts did not exist before this change, so every test
 * here fails against pre-change source.
 */
import { describe, expect, it } from 'vitest';
import { createControlIndex } from '../src/sensor/control-index.js';
import { desk, el } from './sensor-fixture.js';

describe('object identity, so nothing is computed and nothing is ambiguous', () => {
  it('answers for the exact element handed over, and for no other', () => {
    const index = createControlIndex();
    const button = el('button', { text: 'Send' });
    const twin = el('button', { text: 'Send' });
    index.attach({ edge: desk.send, element: button });

    expect(index.declarationFor(button)?.edge).toBe(desk.send);
    // An identical-looking twin is a different object, so it is a different answer.
    expect(index.declarationFor(twin)).toBeUndefined();
  });

  it('carries the instance a locator never could', () => {
    const index = createControlIndex();
    const button = el('button', { text: 'Reply' });
    index.attach({ edge: desk.reply, element: button, instance: 't-7' });
    expect(index.declarationFor(button)?.instance).toBe('t-7');
  });

  it('is one hop, not a walk — the ancestor climb belongs to match.ts', () => {
    const index = createControlIndex();
    const span = el('span', { text: 'Send' });
    const button = el('button', { children: [span] });
    index.attach({ edge: desk.send, element: button });
    expect(index.declarationFor(span)).toBeUndefined();
  });
});

describe('the StrictMode shape: setup → cleanup → setup nets to ONE', () => {
  it('attach → detach → attach leaves exactly one live declaration', () => {
    const index = createControlIndex();
    const button = el('button');
    const first = index.attach({ edge: desk.send, element: button });
    first();
    index.attach({ edge: desk.send, element: button });
    expect(index.size).toBe(1);
    expect(index.declarationFor(button)).toBeDefined();
  });

  it('a LATE detach from the superseded declaration releases nothing', () => {
    // The order React actually produces under a double-invoke: setup, setup,
    // cleanup-of-the-first. A detach that deleted by element would unwatch the
    // control that is still mounted.
    const index = createControlIndex();
    const button = el('button');
    const releaseFirst = index.attach({ edge: desk.send, element: button });
    index.attach({ edge: desk.archive, element: button });
    releaseFirst();
    expect(index.size).toBe(1);
    expect(index.declarationFor(button)?.edge).toBe(desk.archive);
  });

  it('detach is idempotent', () => {
    const index = createControlIndex();
    const button = el('button');
    const release = index.attach({ edge: desk.send, element: button });
    release();
    release();
    expect(index.size).toBe(0);
  });
});

describe('forEdge — what coverage asks about an edge', () => {
  it('finds the declaration an edge would be reported through', () => {
    const index = createControlIndex();
    const button = el('button');
    index.attach({ edge: desk.send, element: button });
    expect(index.forEdge(desk.send)?.element).toBe(button);
    expect(index.forEdge(desk.archive)).toBeUndefined();
  });

  it('two elements declaring one edge both stay live; the FIRST answers for the edge', () => {
    // A mobile and a desktop button for the same action is a real page. Both must
    // report; coverage speaks about the edge, so one of them answers for it.
    const index = createControlIndex();
    const mobile = el('button');
    const wide = el('button');
    index.attach({ edge: desk.send, element: mobile });
    index.attach({ edge: desk.send, element: wide });
    expect(index.size).toBe(2);
    expect(index.forEdge(desk.send)?.element).toBe(mobile);
  });

  it('releasing the answering declaration hands the edge to the survivor', () => {
    const index = createControlIndex();
    const mobile = el('button');
    const wide = el('button');
    const releaseMobile = index.attach({ edge: desk.send, element: mobile });
    index.attach({ edge: desk.send, element: wide });
    releaseMobile();
    expect(index.forEdge(desk.send)?.element).toBe(wide);
  });
});

describe('teardown', () => {
  it('clear empties the index', () => {
    const index = createControlIndex();
    index.attach({ edge: desk.send, element: el('button') });
    index.attach({ edge: desk.archive, element: el('button') });
    expect(index.declarations).toHaveLength(2);
    index.clear();
    expect(index.size).toBe(0);
    expect(index.declarations).toEqual([]);
    expect(index.forEdge(desk.send)).toBeUndefined();
  });
});
