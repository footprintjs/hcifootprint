/**
 * The never-trap invariant, commit half: "a skill whose first step cannot
 * materialise is never committed to." commitSkill() gains exactly one typed
 * refusal — ENTRY_NOT_MATERIALIZED — after its existing four, answering the
 * SAME widened handlerFor question fire() asks (one code path, no second
 * lookup). The frame that could never act is never opened.
 *
 * Mutation proofs: before this change every agent commit below with an
 * unbound entry answered ok:true and opened the trap frame; the gap ledger
 * had no ENTRY_NOT_MATERIALIZED reason and no skillId field.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import type { NavigationGraphDef } from '../src/index.js';

// Annotated (not `as const`): the annotation keeps the binding literals
// contextually typed against the Binding union while arrays stay mutable.
function graphDef(): NavigationGraphDef {
  return {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': {
            does: 'Add the dress to the cart',
            binding: { kind: 'element', locator: { role: 'button', name: 'Add' }, actuation: 'click' },
            writes: ['cart'],
          },
        },
      },
      cart: { route: '/cart', tools: { 'place-order': { does: 'Place the order', writes: ['orders'] } } },
    },
    tools: {
      'open-cart': { does: 'Open the cart', on: 'catalog', goTo: 'cart' },
    },
    skills: {
      purchase: { does: 'Buy a dress', steps: ['add-to-cart', 'place-order'] },
      'to-cart': { does: 'Go look at the cart', steps: ['open-cart'] },
    },
  };
}

describe('ENTRY_NOT_MATERIALIZED — the fifth typed refusal', () => {
  it('an agent commit with an unbound entry is refused; the frame never opens; nothing touches state', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    const versionBefore = session.version;
    const bundlesBefore = session.commitLog().length;

    const refused = session.commitSkill('purchase', { source: 'agent' });
    expect(refused).toEqual({
      ok: false,
      reason: 'ENTRY_NOT_MATERIALIZED',
      affordanceId: 'catalog.add-to-cart',
      gesture: { kind: 'element', locator: { role: 'button', name: 'Add' }, actuation: 'click' },
    });
    expect(session.skillFrame()).toBeNull(); // the trap room was never entered
    expect(session.version).toBe(versionBefore); // no world motion
    expect(session.transitions()).toHaveLength(0); // NO transition…
    expect(session.commitLog()).toHaveLength(bundlesBefore); // …and NO commit bundle
  });

  it('exactly ONE gap row per refusal — fire-rejected, naming the entry step, the skill and the gesture kind', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    session.commitSkill('purchase', { source: 'agent' });
    const gaps = session.gaps();
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'ENTRY_NOT_MATERIALIZED',
      affordanceId: 'catalog.add-to-cart',
      skillId: 'purchase',
      gestureKind: 'element',
      principal: 'agent',
    });
  });

  it('the default principal is agent — a bare commitSkill() gates identically', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    expect(session.commitSkill('purchase')).toMatchObject({ ok: false, reason: 'ENTRY_NOT_MATERIALIZED' });
  });

  it('order preserved: the existing four refusals still answer FIRST', () => {
    const gated = buildNavigationGraph('shop', {
      ...graphDef(),
      skills: {
        purchase: {
          does: 'Buy a dress',
          steps: ['add-to-cart', 'place-order'],
          when: { authenticated: { eq: true } },
        },
      },
    }).createSession({ node: 'catalog', state: { authenticated: false } });
    // PRECONDITION_FAILED wins over the entry gate — same unbound entry either way.
    expect(gated.commitSkill('purchase')).toMatchObject({ ok: false, reason: 'PRECONDITION_FAILED' });
    // …and the un-ledgered stance of the first four holds (protocol events, not gaps).
    expect(gated.gaps()).toHaveLength(0);
  });
});

describe('who passes the gate — every arm that can actually act', () => {
  it('a registered entry handler commits fine', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => undefined } });
    expect(session.commitSkill('purchase', { source: 'agent' })).toMatchObject({ ok: true });
  });

  it('a navigate-materialisable entry commits fine — the SAME widened handlerFor question', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({
      node: 'catalog',
      navigate: () => undefined,
    });
    // 'to-cart' enters through 'open-cart' (goTo cart, literal route '/cart').
    expect(session.commitSkill('to-cart', { source: 'agent' })).toMatchObject({ ok: true });
  });

  it('a tour session (allowUnmaterializedFires) commits fine — its fires are already honest no-ops', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({
      node: 'catalog',
      allowUnmaterializedFires: true,
    });
    expect(session.commitSkill('purchase', { source: 'agent' })).toMatchObject({ ok: true });
  });

  it("a 'user' commit never gates — a human drives the app itself", () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    expect(session.commitSkill('purchase', { source: 'user' })).toMatchObject({ ok: true });
  });

  it('a registered-but-DISABLED entry commits fine — TOOL_DISABLED is retriable, not missing wiring', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    const handle = session.registerToolGroup('catalog', {
      handlers: { 'add-to-cart': () => undefined },
    });
    handle.setEnabled('add-to-cart', false);
    expect(session.commitSkill('purchase', { source: 'agent' })).toMatchObject({ ok: true });
  });
});

describe('the SERVE gate stays structural', () => {
  it('page actions remain reachable while a frame is open (escape guaranteed) — unchanged', () => {
    const session = buildNavigationGraph('shop', graphDef()).createSession({ node: 'catalog' });
    session.registerToolGroup('catalog', { handlers: { 'add-to-cart': () => undefined } });
    session.commitSkill('purchase', { source: 'agent' });
    const served = session.toMCPTools().map((t) => t.name);
    expect(served).toContain('shop.leave-skill'); // the frame that opens can always be left
  });
});
