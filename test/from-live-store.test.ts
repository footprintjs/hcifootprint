/**
 * fromLiveStore() — the app's live action store drives the EXISTING
 * declare-then-bind wire (registerActions), reconciled by identity key
 * `${node}.${name}`(+instance): new registers, gone releases, an enabled flip
 * rides setEnabled, and an UNCHANGED action is never re-registered (a chatty
 * store must cause zero last-wins warnings and zero spurious structure bumps).
 *
 * Mutation proofs: before this change the module did not exist, `sources`
 * refused kind 'live' as unknown, and InteractionSession had no detachSources.
 */
import { describe, expect, it, vi } from 'vitest';
import { buildNavigationGraph, fromLiveStore } from '../src/index.js';
import type { LiveAction, LiveActionStore } from '../src/index.js';

/** A minimal subscribe+read-current store (the shape React itself blesses). */
function fakeStore(
  initial: LiveAction[],
): LiveActionStore & { set(next: LiveAction[]): void; emit(): void; listenerCount(): number } {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    listenerCount: () => listeners.size,
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
  it('a store the app already had becomes mount-declared actions that really execute', async () => {
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

  it('…even when the STORE ignores its own unsubscribe — detach does not depend on good manners', () => {
    // Unsubscribing is the store's promise, not ours, and a store that keeps
    // calling a released listener is an ordinary bug in somebody else's code.
    // Trusting it would mean a detached session growing bindings again, from a
    // source it has already let go of — so the released side latches shut on its
    // own account rather than relying on the notification stopping.
    const listeners = new Set<() => void>();
    let current: LiveAction[] = [
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
    ];
    const rudeStore: LiveActionStore = {
      subscribe(onChange) {
        listeners.add(onChange);
        return () => undefined; // says it unsubscribed; keeps the listener
      },
      actions: () => current.map((action) => ({ ...action })),
    };

    const session = ordersGraph(rudeStore);
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(true);

    session.detachSources();
    // The store now announces a WHOLE NEW action, to the listener it never let go.
    current = [{ node: 'orders', name: 'archive', does: 'Archive', handler: () => undefined }];
    for (const listener of listeners) listener();

    const ids = session.available().edges.map((e) => e.affordanceId);
    expect(ids).not.toContain('orders.refresh'); // still released
    expect(ids).not.toContain('orders.archive'); // and nothing new was minted
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

  it('a store entry matching an action the graph already declares BINDS to it, silently', async () => {
    const warnings: string[] = [];
    const ran: string[] = [];
    const store = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh (store copy)', handler: () => void ran.push('refresh') },
    ]);
    const graph = buildNavigationGraph('shop', {
      pages: { orders: { actions: { refresh: { does: 'Refresh the order list' } } } },
      sources: [fromLiveStore(store)],
    });
    const session = graph.createSession({ node: 'orders', onWarn: (m) => warnings.push(m) });
    expect(warnings).toEqual([]); // the declared action was BOUND, never re-declared
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

describe('error stance — loud at attach, isolated inside the notify loop', () => {
  it("a LATER emission's bad action warns and never breaks the app's own subscribers", () => {
    // MUTATION PROOF: before this fix the reconcile ran bare inside
    // store.subscribe — the unknown-node throw propagated out of set() INTO
    // app code and aborted the app's iteration over its other subscribers
    // mid-loop. Consumer store code must never be broken by ours.
    const warnings: string[] = [];
    const store = fakeStore([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined }]);
    const session = ordersGraph(store, warnings);
    let appSubscriberRan = false;
    store.subscribe(() => {
      appSubscriberRan = true; // the app's own listener, notified after ours
    });

    expect(() =>
      store.set([
        // 'refresh' stays in the snapshot (unchanged identity — kept as-is)…
        { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
        // …and the bad newcomer throws mid-reconcile.
        { node: 'ghost', name: 'boom', does: 'Bad', handler: () => undefined },
      ]),
    ).not.toThrow();

    expect(appSubscriberRan).toBe(true); // the notify loop finished
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/could not be reconciled/);
    expect(warnings[0]).toMatch(/unknown node 'ghost'/);
    // The session itself is unharmed: the still-published action still fires.
    expect(session.fire('orders.refresh', { source: 'agent' }).ok).toBe(true);
  });

  it('the next emission simply retries — a corrected store converges, warning only for the bad one', () => {
    const warnings: string[] = [];
    const store = fakeStore([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined }]);
    const session = ordersGraph(store, warnings);

    store.set([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
      { node: 'ghost', name: 'boom', does: 'Bad', handler: () => undefined },
    ]);
    expect(warnings).toHaveLength(1);

    store.set([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
      { node: 'orders', name: 'export', does: 'Export', handler: () => undefined },
    ]);
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.export')).toBe(true);
    expect(warnings).toHaveLength(1); // the good emission is silent
  });

  it('an invalid action at ATTACH still dies loudly at createSession — and the failed attach leaks no subscription', () => {
    // MUTATION PROOF (leak half): before this fix the loud first-read throw
    // left the store subscription registered forever, with no detach handle
    // ever returned to release it.
    const store = fakeStore([{ node: 'ghost', name: 'boom', does: 'Bad', handler: () => undefined }]);
    expect(() => ordersGraph(store)).toThrow(/unknown node 'ghost'/);
    expect(store.listenerCount()).toBe(0);
  });

  it('the direct door: a loud attach releases anything registered before the bad action', () => {
    const session = ordersGraph(fakeStore([])); // a healthy session
    const badStore = fakeStore([
      { node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined },
      { node: 'ghost', name: 'boom', does: 'Bad', handler: () => undefined },
    ]);
    expect(() => fromLiveStore(badStore).attach(session)).toThrow(/unknown node 'ghost'/);
    expect(badStore.listenerCount()).toBe(0);
    // 'refresh' registered before 'ghost' threw — the cleanup released it, so
    // the session serves no orphan binding nothing can ever detach.
    expect(session.available().edges.some((e) => e.affordanceId === 'orders.refresh')).toBe(false);
  });

  it('the direct door without a warn sink falls back to the console — same default as every warn seam', () => {
    const session = ordersGraph(fakeStore([]));
    const store = fakeStore([{ node: 'orders', name: 'refresh', does: 'Refresh', handler: () => undefined }]);
    const detach = fromLiveStore(store).attach(session);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      store.set([{ node: 'ghost', name: 'boom', does: 'Bad', handler: () => undefined }]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(String(spy.mock.calls[0][0])).toMatch(/could not be reconciled/);
    } finally {
      spy.mockRestore();
      detach();
    }
  });
});

describe('a control the store can SEE but has nothing wired to yet', () => {
  it('declares it and serves it honestly unmaterialized, instead of pretending it works', async () => {
    // A store that knows the surface (a server-driven menu, a plugin registry)
    // before it knows the code behind each entry. The action exists on the page,
    // so the agent is told it is there — and told, in the same row, that nothing
    // in this app is wired to perform it.
    const store = fakeStore([{ node: 'orders', name: 'export', does: 'Export the order list' }]);
    const session = ordersGraph(store);

    expect(session.available().edges.map((e) => e.affordanceId)).toContain('orders.export');
    expect(session.fire('orders.export', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'NOT_MATERIALIZED',
    });

    // Reconciliation is by IDENTITY, so re-announcing the same `orders.export`
    // with a handler attached changes nothing — the documented way to replace an
    // action's behaviour is to remove it and add it back.
    store.set([
      { node: 'orders', name: 'export', does: 'Export the order list', handler: () => undefined },
    ]);
    await microtasks();
    expect(session.fire('orders.export', { source: 'agent' })).toMatchObject({
      reason: 'NOT_MATERIALIZED',
    });

    store.set([]); //                                     gone
    await microtasks();
    store.set([
      { node: 'orders', name: 'export', does: 'Export the order list', handler: () => undefined },
    ]);
    await microtasks();
    expect(session.fire('orders.export', { source: 'agent' }).ok).toBe(true);
  });
});
