/**
 * The integration that justifies the footprintjs dependency: a UI session's
 * transitions land in a real footprint commit log, and the whole post-hoc
 * toolchain (sliceForKey, causalChain, arrayProvenance) answers "why?"
 * questions about the session with zero new query code.
 */
import { describe, expect, it } from 'vitest';
import { arrayProvenance, causalChain, commitValueAt, formatCausalChain } from 'footprintjs/trace';
import { shop, initialState, okUpdate, wire } from './fixture.js';
import { buildNavigationGraph } from '../src/index.js';
import type { Session } from '../src/index.js';

/** user logs in, agent adds two products, walks to checkout, places the order */
function playSession(commitValues?: 'full' | 'delta'): Session {
  const s = shop().createSession({
    node: 'catalog',
    state: initialState,
    redactedKeys: ['user'],
    ...(commitValues ? { commitValues } : {}),
  });
  // The app has bound its buttons (Phase 1) — an agent fire of an unbound action
  // is a NOT_MATERIALIZED rejection since 0.3.0.
  wire(s, 'add-to-cart', 'go-to-cart', 'proceed-to-checkout', 'place-order');
  s.fire('login', { source: 'user' });
  s.updateState({ authenticated: true, user: { name: 'ada' } });
  s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
  s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 });
  s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p2' } });
  s.updateState({ cart: [{ id: 'p1' }, { id: 'p2' }], cartCount: 2 });
  s.fire('go-to-cart', { source: 'agent' });
  s.fire('proceed-to-checkout', { source: 'agent' });
  s.fire('place-order', { source: 'agent' });
  s.updateState({ orderId: 'ord-1' });
  return s;
}

describe('footprint trace toolchain over a UI session', () => {
  it('exact bijection: one CommitBundle per committed transition, unique ids, idx == position', () => {
    const s = playSession();
    const log = s.commitLog();
    const committed = s.transitions().filter((t) => t.outcome === 'committed');
    expect(log).toHaveLength(6);
    expect(committed).toHaveLength(6);
    expect(log.every((b, i) => b.idx === i)).toBe(true);
    const bundleIds = log.map((b) => b.runtimeStageId);
    expect(new Set(bundleIds).size).toBe(bundleIds.length); // no duplicate commits
    expect([...bundleIds].sort()).toEqual(committed.map((t) => t.id).sort());
  });

  it('why(key) — the backward slice includes the UPSTREAM chain, not just the last writer', () => {
    const s = playSession();
    const why = s.why('orderId');
    expect(why).toContain('place-order'); // the writer
    expect(why).toContain('login'); // upstream: place-order's guard read authenticated, written by login
    expect(why).toContain('authenticated');
    expect(s.why('cart')).toContain('add-to-cart');
  });

  it('causalChain walks per-write guard-read edges: orderId ← authenticated/cartCount ← login/add-to-cart', () => {
    const s = playSession();
    const log = s.commitLog();
    const orderBundle = log.find((b) => b.runtimeStageId.startsWith('place-order'))!;
    const dag = causalChain(log, orderBundle.runtimeStageId, (id) => s.readsByStep().get(id) ?? [], {
      edgeAttribution: 'per-write',
    });
    expect(dag).toBeDefined();
    const rendered = formatCausalChain(dag!);
    expect(rendered).toContain('place-order');
    expect(rendered).toMatch(/via authenticated/); // the guard-read edge itself
    expect(rendered).toMatch(/via cartCount/);
    expect(rendered).toContain('login#'); // authenticated's writer
    expect(rendered).not.toContain('proceed-to-checkout'); // nav-only, wrote nothing → not causal
  });

  it('arrayProvenance labels each cart element with the transition that created it', () => {
    const s = playSession();
    const prov = arrayProvenance(s.commitLog(), 'cart');
    const births = prov.births ?? [];
    expect(births).toHaveLength(2);
    expect(births[0].runtimeStageId).toMatch(/^add-to-cart#/);
    expect(births[1].runtimeStageId).toMatch(/^add-to-cart#/);
    expect(births[0].runtimeStageId).not.toBe(births[1].runtimeStageId);
  });

  it('redacted keys: commit log stores REDACTED, live state keeps raw bytes', () => {
    const s = playSession();
    const log = s.commitLog();
    const loginBundle = log.find((b) => b.runtimeStageId.startsWith('login'))!;
    expect(loginBundle.overwrite['user']).toBe('REDACTED');
    expect(loginBundle.redactedPaths).toContain('user');
    expect((s.state()['user'] as { name: string }).name).toBe('ada');
  });

  it("the whole trace surface also works under the commitValues:'full' dial", () => {
    const s = playSession('full');
    expect(s.why('orderId')).toContain('place-order');
    expect(s.why('cart')).toContain('add-to-cart');
    const births = arrayProvenance(s.commitLog(), 'cart').births ?? [];
    expect(births).toHaveLength(2);
  });

  // THE DIALS REACH EVERY COMMIT. The two dials ride ONE frozen RecordEncoding
  // (session.ts · #encoding), handed to every transition's RecordFrame
  // (#commitDelta · useEncoding; footprintjs/write, 2.7.0). Each dial leaves its
  // own mark in the log, so a frame that commits under footprintjs's defaults
  // instead ('full', no provenance) fails both of these.
  it("the default 'delta' dial reaches the frame: a grown cart commits only its tail; every row names the reads before it", () => {
    const log = playSession().commitLog();
    const cartRows = log.flatMap((b) =>
      b.trace.filter((t) => t.path === 'cart').map((t) => ({ idx: b.idx, verb: t.verb, value: b.overwrite['cart'] })),
    );
    expect(cartRows).toEqual([
      { idx: 1, verb: 'append', value: [{ id: 'p1' }] },
      { idx: 2, verb: 'append', value: [{ id: 'p2' }] },
    ]);
    expect(commitValueAt(log, 2, 'cart')).toEqual([{ id: 'p1' }, { id: 'p2' }]);
    // writeProvenance 'reads-prefix': every written row carries the guard keys read before it.
    expect(log.flatMap((b) => b.trace).every((t) => Array.isArray(t.readKeys))).toBe(true);
    const order = log.find((b) => b.runtimeStageId.startsWith('place-order'))!;
    expect(order.trace.map((t) => t.path)).toEqual(['orderId']);
    expect([...(order.trace[0].readKeys ?? [])].sort()).toEqual(['authenticated', 'cartCount']);
  });

  it("commitValues: 'full' reaches the frame too: the same cart is a set of its whole value, provenance unchanged", () => {
    const log = playSession('full').commitLog();
    const cartRows = log.flatMap((b) =>
      b.trace.filter((t) => t.path === 'cart').map((t) => ({ idx: b.idx, verb: t.verb, value: b.overwrite['cart'] })),
    );
    expect(cartRows).toEqual([
      { idx: 1, verb: 'set', value: [{ id: 'p1' }] },
      { idx: 2, verb: 'set', value: [{ id: 'p1' }, { id: 'p2' }] },
    ]);
    expect(log.flatMap((b) => b.trace).every((t) => Array.isArray(t.readKeys))).toBe(true);
  });

  // This file is an ES module, so it runs in strict mode — where a plain
  // assignment into a frozen object throws (sloppy code ignores it silently).
  it('commitLog() hands out frozen bundles: a strict-mode write throws and the record stays what was committed', () => {
    const s = playSession();
    const bundle = s.commitLog()[1];
    expect(Object.isFrozen(bundle)).toBe(true);
    expect(() => {
      (bundle.overwrite as Record<string, unknown>)['cartCount'] = 999;
    }).toThrow(TypeError);
    expect(s.commitLog()[1].overwrite['cartCount']).toBe(1);
  });

  it('Date values survive settlement; undefined values are dropped from state (pinned semantics)', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const u = okUpdate(s.updateState({ when: new Date('2026-07-02'), gone: undefined }, { stimulus: 'push' }));
    expect(u.transition.outcome).toBe('committed');
    expect(s.state()['when']).toBeInstanceOf(Date);
    expect('gone' in s.state()).toBe(false);
  });

  // Through footprintjs 9.21 a Date, Map or Set compared equal to ANY other (they
  // have no own keys), so a report of a new one committed nothing and state()
  // kept the old value while the row said 'committed'. footprintjs 9.22.0 gave
  // its net-change compare typed arms (`equalPairs`).
  it('a DIFFERENT Date, Map or Set is a change: it commits a set row and state() moves', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    okUpdate(
      s.updateState(
        { when: new Date('2026-07-02'), index: new Map([['k', 1]]), tags: new Set(['a']) },
        { stimulus: 'push' },
      ),
    );
    const u = okUpdate(
      s.updateState(
        { when: new Date('2026-07-03'), index: new Map([['k', 2]]), tags: new Set(['b']) },
        { stimulus: 'push' },
      ),
    );
    const last = s.commitLog().at(-1)!;
    expect(last.runtimeStageId).toBe(u.transition.id);
    expect(last.trace.map((t) => [t.path, t.verb])).toEqual([
      ['when', 'set'],
      ['index', 'set'],
      ['tags', 'set'],
    ]);
    expect(s.state()['when']).toEqual(new Date('2026-07-03'));
    expect(s.state()['index']).toEqual(new Map([['k', 2]]));
    expect(s.state()['tags']).toEqual(new Set(['b']));
  });

  // The session reads an undefined-valued key as absent (above); since
  // footprintjs 9.19.1 the net-change compare does too, at every depth.
  it('a report that differs from state only by an own undefined field is no change: nothing commits', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    okUpdate(s.updateState({ o: { a: 1 } }, { stimulus: 'push' }));
    okUpdate(s.updateState({ o: { a: 1, b: undefined } }, { stimulus: 'push' }));
    const last = s.commitLog().at(-1)!;
    expect(last.trace).toEqual([]);
    // toStrictEqual: toEqual would ignore an own undefined `b` and pass either way.
    expect(s.state()['o']).toStrictEqual({ a: 1 });
  });

  // A guard may name the empty key (nothing refuses it). 2.6.1 read every guard key
  // through footprintjs's frame, so the bundle's readKeys named it, and filed reads
  // for why() through a read tap that skipped an empty key. 2.7.0 notes the read on
  // its RecordFrame and files it itself; this pins both halves of that edge.
  it("an empty guard key is named on the bundle's readKeys but not filed in readsByStep()", () => {
    const graph = buildNavigationGraph('edge', {
      does: 'An action guarded on an empty key',
      pages: { home: { route: '/' } },
      actions: {
        toggle: {
          on: 'home',
          does: 'Toggle the flag',
          binding: { kind: 'element', locator: { role: 'button', name: 'Toggle' }, actuation: 'click' },
          when: { '': { eq: 'on' }, ready: { eq: true } },
          writes: ['done'],
        },
      },
    });
    const s = graph.createSession({ node: 'home', state: { '': 'on', ready: true } });
    wire(s, 'toggle');
    s.fire('toggle', { source: 'agent' });
    okUpdate(s.updateState({ done: true }));
    const bundle = s.commitLog().find((b) => b.runtimeStageId.startsWith('toggle'))!;
    expect(bundle.trace.map((t) => [t.path, t.readKeys])).toEqual([['done', ['', 'ready']]]);
    expect(s.readsByStep().get(bundle.runtimeStageId)).toEqual(['ready']);
  });

  it('runtimeStageIds stay unique across unbounded revisits (monotonic counter)', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    wire(s, 'add-to-cart');
    for (let i = 0; i < 25; i++) {
      s.fire('add-to-cart', { source: 'agent', payload: { productId: `p${i}` } });
      s.updateState({ cart: [], cartCount: 0 });
    }
    const ids = s.commitLog().map((b) => b.runtimeStageId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
