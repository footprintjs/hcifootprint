/**
 * The API pass: passive event surface (on), tool enablement (setEnabled +
 * TOOL_DISABLED), the handle-identity registration (registerToolGroup /
 * registerTool — no caller-supplied group string), and typed node paths.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, skillGraph } from '../src/index.js';
import type { Binding, TransitionRecord } from '../src/index.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function shop() {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        areas: { rail: { tools: { search: { does: 'Search', writes: ['n'] } } } },
        tools: { 'add-to-cart': { does: 'Add to cart', writes: ['cart'] } },
      },
      checkout: { tools: { 'place-order': { does: 'Place order', confirm: true } } },
    },
  });
}

describe('events — a passive observer surface (never business logic)', () => {
  it('emits transition / state / structure, and unsubscribes cleanly', async () => {
    const session = shop().createSession({ node: 'catalog', state: { cart: [] } });
    const seen = { transition: 0, state: 0, structure: 0 };
    const offT = session.on('transition', () => (seen.transition += 1));
    session.on('state', () => (seen.state += 1));
    session.on('structure', () => (seen.structure += 1));

    session.fire('catalog.add-to-cart', { source: 'agent' }); // transition (pending)
    session.updateState({ cart: ['x'] }); // settle → transition + state
    expect(seen.transition).toBeGreaterThanOrEqual(2);
    expect(seen.state).toBe(1);

    session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => undefined } });
    await tick(); // coalesced structure swap
    expect(seen.structure).toBeGreaterThanOrEqual(1);

    offT();
    const before = seen.transition;
    session.fire('catalog.add-to-cart', { source: 'agent' });
    expect(seen.transition).toBe(before); // unsubscribed
  });

  it("a throwing listener is isolated — it never breaks the session", () => {
    const warnings: string[] = [];
    const session = shop().createSession({ node: 'catalog', state: { cart: [] }, onWarn: (m) => warnings.push(m) });
    session.on('transition', () => {
      throw new Error('observer exploded');
    });
    const fired = session.fire('catalog.add-to-cart', { source: 'agent' });
    expect(fired.ok).toBe(true); // the session proceeds normally
    expect(warnings.some((w) => w.includes('observer exploded'))).toBe(true);
  });

  it('the transition payload is a copy — a listener cannot mutate the log', () => {
    const session = shop().createSession({ node: 'catalog', state: { cart: [] } });
    session.on('transition', (t: TransitionRecord) => {
      (t as { fromNode: string }).fromNode = 'TAMPERED';
    });
    session.fire('catalog.add-to-cart', { source: 'agent' });
    expect(session.transitions()[0].fromNode).toBe('catalog');
  });

  it('onGap is sugar for on("gap")', () => {
    const session = shop().createSession({ node: 'catalog', state: {} });
    const viaOn: unknown[] = [];
    const viaOnGap: unknown[] = [];
    session.on('gap', (g) => viaOn.push(g));
    session.onGap((g) => viaOnGap.push(g));
    session.fire('ghost', { source: 'agent' });
    expect(viaOn).toHaveLength(1);
    expect(viaOnGap).toHaveLength(1);
  });
});

describe('enablement — a greyed button the agent sees but cannot fire', () => {
  it('registered-disabled is served with enabled:false and refuses to fire (TOOL_DISABLED)', () => {
    const session = shop().createSession({ node: 'catalog', state: {} });
    const group = session.registerToolGroup('catalog', {
      handlers: { 'add-to-cart': () => undefined },
      enabled: { 'add-to-cart': false },
    });
    const edge = session.available().edges.find((e) => e.affordanceId === 'catalog.add-to-cart')!;
    expect(edge.enabled).toBe(false);
    const fired = session.fire('catalog.add-to-cart', { source: 'agent' });
    expect(fired).toMatchObject({ ok: false, reason: 'TOOL_DISABLED', affordanceId: 'catalog.add-to-cart' });
    expect(session.gaps().at(-1)).toMatchObject({ rejectionReason: 'TOOL_DISABLED' });

    // the app enables its button → the same fire now works, and the flip bumped structure
    group.setEnabled('add-to-cart', true);
    expect(session.available().edges.find((e) => e.affordanceId === 'catalog.add-to-cart')!.enabled).toBeUndefined();
    expect(session.fire('catalog.add-to-cart', { source: 'agent' }).ok).toBe(true);
  });

  it('setEnabled flips bump the structure version (a stale plan is caught)', async () => {
    const session = shop().createSession({ node: 'catalog', state: {} });
    const group = session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => undefined } });
    await tick();
    const v = session.structureVersion;
    group.setEnabled('add-to-cart', false);
    await tick(); // the flip coalesces into one structure swap on the microtask
    expect(session.structureVersion).toBe(v + 1);
    group.setEnabled('add-to-cart', false); // no-op — already disabled
    await tick();
    expect(session.structureVersion).toBe(v + 1);
  });

  it('the record-only DOM sensor (invoke:false) is never blocked by disabled', () => {
    const session = shop().createSession({ node: 'catalog', state: {} });
    session.registerToolGroup('catalog', {
      handlers: { 'add-to-cart': () => undefined },
      enabled: { 'add-to-cart': false },
    });
    expect(session.fire('catalog.add-to-cart', { source: 'user', invoke: false }).ok).toBe(true);
  });

  it('a PER-INSTANCE disabled repeats-row button is blocked, not just the base id (critical fix)', async () => {
    const map = buildNavigationGraph('orders', {
      pages: {
        list: {
          areas: {
            row: {
              repeats: true,
              instances: (s) => (s['ids'] as string[]) ?? [],
              tools: { cancel: { does: 'Cancel this order' } },
            },
          },
        },
      },
    });
    const session = map.createSession({ node: 'list', state: { ids: ['o-1', 'o-2'] } });
    let ran = false;
    const group = session.registerToolGroup('list.row', {
      instance: 'o-1',
      handlers: { cancel: () => { ran = true; } },
      enabled: { cancel: false }, // this row's button is greyed out
    });
    const fired = session.fire('list.row.cancel', { source: 'agent', instance: 'o-1' });
    expect(fired).toMatchObject({ ok: false, reason: 'TOOL_DISABLED' });
    await tick();
    expect(ran).toBe(false); // the handler must NOT have run

    // a DIFFERENT instance (o-2) is unaffected — enablement is per instance
    session.registerToolGroup('list.row', { instance: 'o-2', handlers: { cancel: () => undefined } });
    expect(session.fire('list.row.cancel', { source: 'agent', instance: 'o-2' }).ok).toBe(true);

    // and re-enabling o-1 flushes a structure bump (stale plan caught)
    await tick();
    const v = session.structureVersion;
    group.setEnabled('cancel', true);
    await tick();
    expect(session.structureVersion).toBe(v + 1);
    expect(session.fire('list.row.cancel', { source: 'agent', instance: 'o-1' }).ok).toBe(true);
  });
});

describe('observer completeness + copy safety (review fixes)', () => {
  it("a handler that throws emits a 'transition' (rejected) — observers never stick on 'pending'", async () => {
    const session = shop().createSession({ node: 'catalog', state: { cart: [] }, onWarn: () => undefined });
    const outcomes: string[] = [];
    session.on('transition', (t) => outcomes.push(t.outcome));
    session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => { throw new Error('boom'); } } });
    session.fire('catalog.add-to-cart', { source: 'agent' });
    await tick();
    expect(outcomes).toContain('rejected'); // not stuck on 'pending'
    expect(session.transitions().find((t) => t.cause.affordanceId === 'catalog.add-to-cart')!.outcome).toBe('rejected');
  });

  it('a transition listener cannot corrupt the log via nested payload/produced', () => {
    const session = shop().createSession({ node: 'catalog', state: { cart: [] } });
    session.on('transition', (t) => {
      if (t.payload) (t.payload as { sku: string }).sku = 'TAMPERED';
    });
    session.fire('catalog.add-to-cart', { source: 'agent', payload: { sku: 'orig' } });
    const stored = session.transitions()[0].payload as { sku: string };
    expect(stored.sku).toBe('orig'); // log intact
  });
});

describe('registration identity — a handle, never a caller-supplied string', () => {
  it('registerToolGroup returns a handle with a generated id; unregister() removes it', () => {
    const session = shop().createSession({ node: 'catalog', state: {} });
    const group = session.registerToolGroup('catalog.rail', { handlers: { search: () => undefined } });
    expect(typeof group.id).toBe('string');
    expect(group.node).toBe('catalog.rail');
    expect(session.available().edges.find((e) => e.affordanceId === 'catalog.rail.search')!.materialized).toBe(true);
    group.unregister();
    // registry now empty → materialization is meaningless, the flag is omitted (no longer true)
    expect(session.available().edges.find((e) => e.affordanceId === 'catalog.rail.search')!.materialized).not.toBe(true);
  });

  it('registerTool binds one tool and its handle setEnabled/unregister work', async () => {
    const session = shop().createSession({ node: 'catalog', state: {} });
    let ran = false;
    const handle = session.registerTool('catalog', 'add-to-cart', { does: '', handler: () => { ran = true; } });
    expect(handle.toolId).toBe('add-to-cart');
    session.fire('catalog.add-to-cart', { source: 'agent' });
    await tick();
    expect(ran).toBe(true);
    handle.setEnabled(false);
    expect(session.fire('catalog.add-to-cart', { source: 'agent' })).toMatchObject({ ok: false, reason: 'TOOL_DISABLED' });
    handle.unregister();
    expect(session.available().edges.find((e) => e.affordanceId === 'catalog.add-to-cart')!.materialized).not.toBe(true);
  });

  it('the flat/legacy graph still uses registerTools (registerToolGroup is tree-only)', async () => {
    const g = skillGraph('g').page('a').affordance('act', { on: 'a', description: 'Act', binding }).build();
    const session = g.createSession({ node: 'a', state: {} });
    let ran = false;
    const reg = session.registerTools({ group: 'legacy', tools: { act: () => { ran = true; } } });
    reg.triggers['act']();
    await tick(); // handlers invoke on a microtask
    expect(ran).toBe(true);
    reg.unregister();
  });
});
