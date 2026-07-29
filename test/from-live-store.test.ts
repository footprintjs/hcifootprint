/**
 * fromLiveStore() — the app's live action store drives the EXISTING
 * declare-then-bind wire (registerToolGroup), reconciled by identity key
 * `${node}.${name}`(+instance): new registers, gone releases, an enabled flip
 * rides setEnabled, and an UNCHANGED action is never re-registered (a chatty
 * store must cause zero last-wins warnings and zero spurious structure bumps).
 *
 * Mutation proofs: before this change the module did not exist, `sources`
 * refused kind 'live' as unknown, and InteractionSession had no detachSources.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, fromLiveStore } from '../src/index.js';
import type { LiveAction, LiveActionStore } from '../src/index.js';

/** A minimal subscribe+read-current store (the shape React itself blesses). */
function fakeStore(initial: LiveAction[]): LiveActionStore & { set(next: LiveAction[]): void; emit(): void } {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    // CHATTY on purpose: a fresh array of fresh objects on EVERY read — object
    // identity carries no information, exactly like a real app store.
    actions: () => current.map((action) => ({ ...action })),
    set(next) {
      current = next;
      for (const listener of listeners) listener();
    },
    emit() {
      for (const listener of listeners) listener();
    },
  };
}

function ordersGraph(store: LiveActionStore, warnings: string[] = []) {
  const graph = buildNavigationGraph('shop', {
    pages: {
      orders: {
        areas: { list: { repeats: true } },
      },
    },
    sources: [fromLiveStore(store)],
  });
  return graph.createSession({ node: 'orders', onWarn: (m) => warnings.push(m) });
}

const microtasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('attach / detach / re-attach', () => {
  it('createSession attaches: store actions land as mount-declared tools and really execute', async () => {
    const calls: unknown[] = [];
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh the order list', handler: (p?: unknown) => void calls.push(p) },
    ]);
    const session = ordersGraph(store);
    const edge = session.available().edges.find((e) => e.affordanceId === 'orders.refresh');
    expect(edge).toBeDefined();
    expect(edge!.materialized).toBe(true);
    const fired = session.fire('orders.refresh', { source: 'agent', payload: { hard: true } });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(calls).toEqual([{ hard: true }]);
  });

  it('detachSources releases everything; a second call is a no-op; the direct door re-attaches cleanly', () => {
    const store = fakeStore([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined }]);
    const session = ordersGraph(store);
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(true);

    session.detachSources();
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(false);
    session.detachSources(); // idempotent — the ledger drained on the first call

    // The direct door: attach the same source again by hand.
    const detach = fromLiveStore(store).attach(session);
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(true);
    detach();
    detach(); // detach itself is idempotent too
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(false);
  });

  it('a late store emission AFTER detach resurrects nothing', () => {
    const store = fakeStore([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined }]);
    const session = ordersGraph(store);
    session.detachSources();
    store.emit();
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(false);
  });
});

describe('reconcile by identity — the chatty-store discipline', () => {
  it('unchanged actions are NEVER re-registered: zero warnings, zero spurious structure bumps', async () => {
    const warnings: string[] = [];
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
      { node: 'orders', name: 'export', does: 'Export', handler: () => undefined },
    ]);
    const session = ordersGraph(store, warnings);
    await microtasks(); // let the mount's own structure row flush
    const structureBefore = session.structureVersion;

    store.emit();
    store.emit();
    store.emit();
    await microtasks();

    expect(warnings).toEqual([]); // the last-wins warning never spammed
    expect(session.structureVersion).toBe(structureBefore); // no phantom world motion
  });

  it('gone releases its handle; new registers; the rest stay untouched', async () => {
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
      { node: 'orders', name: 'export', does: 'Export', handler: () => undefined },
    ]);
    const session = ordersGraph(store);
    store.set([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
      { node: 'orders', name: 'archive', does: 'Archive', handler: () => undefined },
    ]);
    await microtasks();
    const ids = session.available().edges.map((e) => e.affordanceId).sort();
    expect(ids).toContain('orders.refresh');
    expect(ids).toContain('orders.archive');
    expect(ids).not.toContain('orders.export');
  });

  it('an enabled flip flows through setEnabled to a typed TOOL_DISABLED', () => {
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
    ]);
    const session = ordersGraph(store);
    expect(session.fire('orders.refresh', { source: 'agent' }).ok).toBe(true);

    store.set([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined, enabled: false }]);
    expect(session.fire('orders.refresh', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'TOOL_DISABLED',
    });
    // …and served honestly with the marker, never hidden.
    const edge = session.available().edges.find((e) => e.affordanceId === 'orders.refresh');
    expect(edge?.enabled).toBe(false);

    store.set([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined, enabled: true }]);
    expect(session.fire('orders.refresh', { source: 'agent' }).ok).toBe(true);
  });

  it("an initially-disabled action starts grey — first sight and later flips take one door", () => {
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined, enabled: false },
    ]);
    const session = ordersGraph(store);
    expect(session.fire('orders.refresh', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'TOOL_DISABLED',
    });
  });

  it('an action for a DECLARED tool binds silently — attach last, only bind, no declared-wins spam', async () => {
    const warnings: string[] = [];
    const ran: string[] = [];
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh (store copy)', handler: () => void ran.push('refresh') },
    ]);
    const graph = buildNavigationGraph('shop', {
      pages: { orders: { tools: { refresh: { does: 'Refresh the order list' } } } },
      sources: [fromLiveStore(store)],
    });
    const session = graph.createSession({ node: 'orders', onWarn: (m) => warnings.push(m) });
    expect(warnings).toEqual([]); // the declared tool was BOUND, never re-declared
    // The central declaration stays the audited description; the store's handler runs.
    const edge = session.available().edges.find((e) => e.affordanceId === 'orders.refresh')!;
    expect(edge.description).toBe('Refresh the order list');
    const fired = session.fire('orders.refresh', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(ran).toEqual(['refresh']);
  });

  it("instance actions register under 'id[instance]' — one card of a repeats container", async () => {
    const cancelled: string[] = [];
    const store = fakeStore([
      {
        node: 'orders.list',
        name: 'cancel',
        does: 'Cancel this order',
        instance: 'o-123',
        handler: () => void cancelled.push('o-123'),
      },
    ]);
    const session = ordersGraph(store);
    const fired = session.fire('orders.list.cancel', { source: 'agent', instance: 'o-123' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) return;
    await fired.whenSettled;
    expect(cancelled).toEqual(['o-123']);
  });
});
