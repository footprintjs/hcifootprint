/**
 * 0.3.0 — NOT_MATERIALIZED: an agent fire that would execute NOTHING is a typed
 * rejection, and a tour that opts in tells the truth about it.
 *
 * The bug this kills (reported from a live Bedrock agent): in guide mode — a
 * session wired with no handler group — firing a declared-but-unbound action
 * returned {ok:true, settlement:'settled'}. The model read that as success and
 * told the human "done", while the real app never moved; a goTo action ALSO slid
 * the session cursor on a claim, so the library's position silently diverged
 * from the app's.
 *
 * The stance is the library's own honesty calculus, applied to actuation:
 * never launder a claim as a fact. Fail closed by default; when a guide/tour
 * flow opts in, say plainly that nothing ran (executed:false, materialized:
 * false), ledger the missing binding, and disclose claimed navigation.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { Binding, NavigationGraph } from '../src/index.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The tester's shape: a goTo action an agent can call through Mode B. */
function tourMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        actions: {
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
          'add-to-cart': { does: 'Add the dress to the cart', writes: ['cart'] },
        },
      },
      checkout: { actions: { 'place-order': { does: 'Place the order', writes: ['orders'] } } },
    },
    journeys: { purchase: { does: 'Buy a dress', steps: ['go-checkout', 'place-order'] } },
  });
}

// ---------------------------------------------------------------------------
// 1. The reported repro — it must die loudly
// ---------------------------------------------------------------------------

describe('the reported repro: a success-shaped no-op', () => {
  it('guide mode, no handlers: an agent goTo fire is rejected NOT_MATERIALIZED and the cursor stays put', () => {
    const session = tourMap().createSession({ node: 'catalog', onWarn: () => undefined });
    const port = serveToAgent(session);

    const result = port.call('shop.do_action', { action: 'go-checkout' });

    expect(result).toMatchObject({
      ok: false,
      judgment: 'rejected',
      did: 'catalog.go-checkout',
      reason: 'NOT_MATERIALIZED',
    });
    expect(result['why']).toContain('Nothing in the app is wired to execute this action yet');
    expect(result['retriable']).toBeUndefined(); // nothing is expected to arrive
    expect(session.node).toBe('catalog'); // the cursor NEVER moved on a claim
    expect(session.transitions()).toHaveLength(0); // nothing was recorded as done

    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'NOT_MATERIALIZED',
      affordanceId: 'catalog.go-checkout',
      principal: 'agent',
    });
  });
});

// ---------------------------------------------------------------------------
// 2. The gate closes all three fire arms
// ---------------------------------------------------------------------------

describe('the gate — every arm where nothing would execute', () => {
  function armsGraph() {
    return buildNavigationGraph('g', {
      pages: {
        a: {},
        b: {},
      },
      actions: {
        go: { on: 'a', does: 'Go to b', binding, goTo: 'b' },
        save: { on: 'a', does: 'Save', binding, writes: ['saved'] },
      },
    });
  }

  it('a navigation-only action (no declared writes) is refused', () => {
    const s = armsGraph().createSession({ node: 'a' });
    expect(s.fire('go', { source: 'agent' })).toMatchObject({ ok: false, reason: 'NOT_MATERIALIZED', affordanceId: 'go' });
    expect(s.node).toBe('a');
  });

  it('a declared-writes action in a TAPLESS session is refused (it would settle a lie)', () => {
    const s = armsGraph().createSession({ node: 'a' });
    expect(s.fire('save', { source: 'agent' })).toMatchObject({ ok: false, reason: 'NOT_MATERIALIZED' });
    expect(s.transitions()).toHaveLength(0);
  });

  it('a declared-writes action in a TAPPED session is refused — the pend-forever hang dies with it', () => {
    const s = armsGraph().createSession({ node: 'a', stateTap: true });
    expect(s.fire('save', { source: 'agent' })).toMatchObject({ ok: false, reason: 'NOT_MATERIALIZED' });
    expect(s.pending()).toEqual([]); // nothing would ever have reported
  });
});

// ---------------------------------------------------------------------------
// 3. The opt-in tour — honest no-ops
// ---------------------------------------------------------------------------

describe('allowUnmaterializedFires — the guide/tour rung, told honestly', () => {
  it('the fire proceeds, and the result says plainly that nothing ran', () => {
    const s = tourMap().createSession({ node: 'catalog', allowUnmaterializedFires: true, onWarn: () => undefined });
    const fired = s.fire('catalog.go-checkout', { source: 'agent' });

    expect(fired).toMatchObject({ ok: true, settlement: 'settled', executed: false, materialized: false });
    if (!fired.ok) throw new Error('unreachable');
    expect(fired.transition.materialized).toBe(false);
    expect(fired.transition.toNodeClaimed).toBe(true);
    expect(fired.transition.effectVerified).toBe('unobservable');
  });

  it('the tour walks: the cursor moves on the claim and the next page serves its edges', () => {
    const s = tourMap().createSession({ node: 'catalog', allowUnmaterializedFires: true, onWarn: () => undefined });
    const port = serveToAgent(s);
    const result = port.call('shop.do_action', { action: 'go-checkout' });

    expect(result).toMatchObject({
      ok: true,
      did: 'catalog.go-checkout',
      executed: false,
      materialized: false,
      toNodeClaimed: true, // moved on a CLAIM — re-sync() before trusting it
      youAreOn: 'checkout',
    });
    expect(s.node).toBe('checkout');
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['checkout.place-order']);
  });

  it('ledgers the missing binding as an unmaterialized-fire row (the demand backlog)', () => {
    const s = tourMap().createSession({ node: 'catalog', allowUnmaterializedFires: true, onWarn: () => undefined });
    const exported: unknown[] = [];
    s.onGap((row) => exported.push(row));

    s.fire('catalog.go-checkout', { source: 'agent' });

    expect(s.gaps()).toHaveLength(1);
    expect(s.gaps()[0]).toMatchObject({
      kind: 'unmaterialized-fire',
      affordanceId: 'catalog.go-checkout',
      principal: 'agent',
      node: 'catalog',
      availableActions: ['catalog.go-checkout', 'catalog.add-to-cart'],
    });
    expect(exported).toHaveLength(1); // exporters see it live, like every other row
  });

  it('contextBrief flags the no-op, so the next turn cannot re-read it as success', () => {
    const s = tourMap().createSession({ node: 'catalog', allowUnmaterializedFires: true, onWarn: () => undefined });
    s.fire('catalog.go-checkout', { source: 'agent' });
    const text = s.contextBrief().text;
    expect(text).toContain('not materialized — nothing executed');
    expect(text).toContain('navigation claimed, unconfirmed');
  });

  it('a declared-writes no-op settles unobservably instead of pending forever', () => {
    const s = tourMap().createSession({
      node: 'catalog',
      state: { cart: [] },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const fired = s.fire('catalog.add-to-cart', { source: 'agent' });
    expect(fired).toMatchObject({
      ok: true,
      settlement: 'settled', // NOT 'awaiting-state': no report is coming
      executed: false,
      materialized: false,
    });
    if (!fired.ok) throw new Error('unreachable');
    expect(fired.transition.effectVerified).toBe('unobservable');
    expect(s.pending()).toEqual([]); // nothing waits on a tap that will never fire
  });

  it('a no-op never steals the REAL motion a human performs next (the laundering guard)', () => {
    const s = tourMap().createSession({
      node: 'catalog',
      state: { cart: [] },
      allowUnmaterializedFires: true,
      onWarn: () => undefined,
    });
    const fired = s.fire('catalog.add-to-cart', { source: 'agent' });
    if (!fired.ok) throw new Error('unreachable');
    const noOpId = fired.transition.id;

    // The human then really moves the app; the store tap reports it. FIFO must
    // NOT attribute that motion to the agent's phantom fire — certifying
    // effectVerified:true on a record that ran nothing is exactly the lie.
    const reported = s.updateState({ cart: ['dress'] });
    expect(reported).toMatchObject({ ok: true, attributed: false }); // nobody's fire owns it

    const noOp = s.transitions().find((t) => t.id === noOpId);
    expect(noOp?.outcome).toBe('committed'); // settled at fire time, not by the report
    expect(noOp?.effectVerified).toBe('unobservable'); // never upgraded to true
    expect(noOp?.materialized).toBe(false); // and it stays self-consistent
  });
});

// ---------------------------------------------------------------------------
// 4. Claimed navigation is disclosed on BOUND fires too (the secondary bug)
// ---------------------------------------------------------------------------

describe('A CLAIM IS NEVER A FACT: a navigating fire discloses where it CLAIMS to go', () => {
  it('a BOUND navigating fire still discloses the claim — only sync() confirms position', () => {
    const s = tourMap().createSession({ node: 'catalog', onWarn: () => undefined });
    s.registerActions('catalog', { handlers: { 'go-checkout': () => undefined } });
    const port = serveToAgent(s);

    const result = port.call('shop.do_action', { action: 'go-checkout' });
    expect(result).toMatchObject({ ok: true, toNodeClaimed: true, youAreOn: 'checkout' });
    expect(result['executed']).toBeUndefined(); // it DID execute — no no-op markers
    expect(result['materialized']).toBeUndefined();

    // The consumer rule: re-sync() after a claimed navigation. Reality agrees here.
    expect(s.sync('checkout')).toMatchObject({ changed: false, node: 'checkout' });
  });

  it('a non-navigating bound fire carries no claim flag', () => {
    const s = tourMap().createSession({ node: 'catalog', state: { cart: [] }, onWarn: () => undefined });
    s.registerActions('catalog', { handlers: { 'add-to-cart': () => undefined } });
    const port = serveToAgent(s);
    const result = port.call('shop.do_action', { action: 'add-to-cart' });
    expect(result['ok']).toBe(true);
    expect(result['toNodeClaimed']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. The untouched tiers (regression guards)
// ---------------------------------------------------------------------------

describe('what the gate never touches', () => {
  it("source 'user' — the app self-reporting its OWN motion — is untouched", () => {
    const s = tourMap().createSession({ node: 'catalog', state: { cart: [] }, onWarn: () => undefined });
    const fired = s.fire('catalog.add-to-cart', { source: 'user' });
    expect(fired).toMatchObject({ ok: true, settlement: 'awaiting-state' });
    if (!fired.ok) throw new Error('unreachable');
    expect(fired.executed).toBeUndefined(); // real motion — no honesty markers needed
    expect(fired.transition.materialized).toBeUndefined();
    const settled = s.updateState({ cart: ['dress'] });
    expect(settled.ok).toBe(true);
  });

  it("source 'system' (a world-driven report) is untouched", () => {
    const s = tourMap().createSession({ node: 'catalog', onWarn: () => undefined });
    expect(s.fire('catalog.go-checkout', { source: 'system' }).ok).toBe(true);
  });

  it('invoke:false (the record-only DOM sensor / external actuator tier) is untouched', () => {
    const s = tourMap().createSession({ node: 'catalog', onWarn: () => undefined });
    expect(s.fire('catalog.go-checkout', { source: 'agent', invoke: false }).ok).toBe(true);
  });

  it('a registered handler satisfies the gate — plain success, no markers', () => {
    const s = tourMap().createSession({ node: 'catalog', onWarn: () => undefined });
    s.registerActions('catalog', { handlers: { 'go-checkout': () => undefined } });
    const fired = s.fire('catalog.go-checkout', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) throw new Error('unreachable');
    expect(fired.executed).toBeUndefined();
    expect(fired.materialized).toBeUndefined();
    expect(fired.transition.materialized).toBeUndefined();
    // The GATE ledgered nothing: no rejection row, no missing-binding row.
    expect(s.gaps().filter((gap) => gap.kind !== 'dead-end')).toHaveLength(0);
    // The one row that IS here is the page-level never-trap, and it is true:
    // this fire's claimed navigation landed on 'checkout', which offers one
    // action and has nothing wired to perform it. The fire succeeded; the
    // ROOM it opened onto is the unmet demand.
    expect(s.gaps()).toMatchObject([
      { kind: 'dead-end', node: 'checkout', availableActions: ['checkout.place-order'] },
    ]);
  });

  it('an INSTANCE-keyed handler satisfies the gate for that row', async () => {
    const map = buildNavigationGraph('orders', {
      pages: {
        list: {
          areas: {
            card: {
              repeats: true,
              instances: (state) => (state['ids'] as string[]) ?? [],
              actions: { cancel: { does: 'Cancel this order' } },
            },
          },
        },
      },
    });
    const s = map.createSession({ node: 'list', state: { ids: ['o-1', 'o-2'] }, onWarn: () => undefined });
    s.registerActions('list.card', { instance: 'o-1', handlers: { cancel: () => undefined } });
    await tick();
    expect(s.fire('list.card.cancel', { source: 'agent', instance: 'o-1' }).ok).toBe(true);
    // A row that exists but is not mounted keeps its BETTER answer: mounts are
    // en route, so it stays retriable rather than being called unmaterialized.
    expect(s.fire('list.card.cancel', { source: 'agent', instance: 'o-2' })).toMatchObject({
      ok: false,
      reason: 'STILL_MOUNTING',
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Rejection-taxonomy ordering (the gate is LAST)
// ---------------------------------------------------------------------------

describe('taxonomy order — the new gate never masks a better answer', () => {
  function mountingMap(): NavigationGraph {
    return buildNavigationGraph('shop', {
      pages: {
        catalog: {
          areas: { rail: { actions: { 'set-color': { does: 'Filter by color' } } } },
          actions: { help: { does: 'Open help' } },
        },
      },
    });
  }

  it("a node whose mounts have not arrived still answers STILL_MOUNTING (retriable)", () => {
    const s = mountingMap().createSession({ node: 'catalog', onWarn: () => undefined });
    s.registerActions('catalog', { handlers: { help: () => undefined } }); // the session runs on mounts
    expect(s.fire('catalog.rail.set-color', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'STILL_MOUNTING',
    });
  });

  it('a registered-but-greyed action still answers TOOL_DISABLED', () => {
    const s = mountingMap().createSession({ node: 'catalog', onWarn: () => undefined });
    s.registerActions('catalog', { handlers: { help: () => undefined }, enabled: { help: false } });
    expect(s.fire('catalog.help', { source: 'agent' })).toMatchObject({ ok: false, reason: 'TOOL_DISABLED' });
  });

  it('an unknown id still answers UNKNOWN_AFFORDANCE', () => {
    const s = mountingMap().createSession({ node: 'catalog', onWarn: () => undefined });
    expect(s.fire('ghost', { source: 'agent' })).toMatchObject({ ok: false, reason: 'UNKNOWN_AFFORDANCE' });
  });
});

// ---------------------------------------------------------------------------
// 7. Availability — say it BEFORE the agent fires
// ---------------------------------------------------------------------------

describe('the row says whether the act could reach the app at all', () => {
  it('a touring session stamps materialized:false on every served edge', () => {
    const s = tourMap().createSession({ node: 'catalog', allowUnmaterializedFires: true, onWarn: () => undefined });
    expect(s.available().edges.map((e) => e.materialized)).toEqual([false, false]);
  });

  it('Mode B surfaces it in whats_here actions and in readySteps', () => {
    const s = tourMap().createSession({ node: 'catalog', allowUnmaterializedFires: true, onWarn: () => undefined });
    const port = serveToAgent(s);
    const here = port.call('shop.whats_here');
    expect((here['actions'] as Array<Record<string, unknown>>)[0]).toMatchObject({
      action: 'catalog.go-checkout',
      materialized: false,
    });
    const opened = port.call('shop.journey.purchase', {});
    expect((opened['readySteps'] as Array<Record<string, unknown>>)[0]).toMatchObject({
      step: 'catalog.go-checkout',
      materialized: false,
    });
  });

  it('without the opt-in and with an empty registry the marker stays absent (v0.2 behavior)', () => {
    const s = tourMap().createSession({ node: 'catalog', onWarn: () => undefined });
    expect(s.available().edges.every((e) => e.materialized === undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. The gate is KIND-AGNOSTIC — a click is covered exactly like a navigation
// ---------------------------------------------------------------------------

/**
 * The reported bug arrived as a goTo action, and a reader could reasonably come
 * away thinking the gate is about navigation — that it exists because the
 * CURSOR moved on a claim. It is not. The check asks one question, about
 * actuation: with `invoke` wanted and nothing bound, firing executes nothing.
 * A write-only click that no handler answers is the same lie told without
 * moving: the model is told the dress was added, and no cart anywhere changed.
 *
 * These pin that equivalence at the level a reader can check — same rejection,
 * same ledger row, whatever the affordance claims to do — so a later change
 * that branches the gate on effect kind fails here instead of shipping.
 */
describe('the gate does not care what the affordance claims to do', () => {
  const clicky: Binding = { kind: 'element', locator: { role: 'button', name: 'B' }, actuation: 'click' };

  function kindsGraph() {
    return buildNavigationGraph('g', {
      pages: {
        a: {},
        b: {},
      },
      actions: {
        'save-draft': {
          on: 'a',
          does: 'Save the draft',
          binding: clicky,
          writes: ['draft'],
          // writes only — the cursor never moves
          role: 'action',
        },
        'open-b': {
          on: 'a',
          does: 'Open page b',
          binding: clicky,
          goTo: 'b',
          // navigation only,
        },
        'submit-and-go': {
          on: 'a',
          does: 'Submit and continue',
          binding: clicky,
          writes: ['order'],
          goTo: 'b',
          // both,
        },
        'open-help': { on: 'a', does: 'Open the help panel', binding: clicky },
      },
    });
  }

  it('refuses a write-only click with no handler, and ledgers it like any other', () => {
    const s = kindsGraph().createSession({ node: 'a', state: { draft: null }, stateTap: true });

    expect(s.fire('save-draft', { source: 'agent' })).toEqual({
      ok: false,
      reason: 'NOT_MATERIALIZED',
      affordanceId: 'save-draft',
      // Since 0.4.x the refusal SAYS the declared gesture ("this is a click on
      // B"), instead of the bare "nothing is bound" — exact-equal on purpose.
      gesture: { kind: 'element', locator: { role: 'button', name: 'B' }, actuation: 'click' },
    });
    expect(s.transitions()).toHaveLength(0); // nothing was recorded as done
    expect(s.pending()).toEqual([]); // and nothing waits for a report
    expect(s.gaps()).toHaveLength(1);
    expect(s.gaps()[0]).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'NOT_MATERIALIZED',
      affordanceId: 'save-draft',
      principal: 'agent',
      node: 'a',
    });
  });

  it('gives every effect kind the identical answer — that is the invariant', () => {
    const s = kindsGraph().createSession({ node: 'a', state: { draft: null }, stateTap: true });
    const ids = ['save-draft', 'open-b', 'submit-and-go', 'open-help'];

    const rejections = ids.map((id) => s.fire(id, { source: 'agent' }));

    expect(rejections.map((r) => (r.ok ? 'ok' : r.reason))).toEqual([
      'NOT_MATERIALIZED',
      'NOT_MATERIALIZED',
      'NOT_MATERIALIZED',
      'NOT_MATERIALIZED',
    ]);
    expect(s.node).toBe('a'); // no claim moved the cursor
    expect(s.gaps().map((g) => g.rejectionReason)).toEqual(ids.map(() => 'NOT_MATERIALIZED'));
  });

  it('binding a handler for ONE kind does not unblock the others', () => {
    // The lookup is per affordance, not per kind or per group: proof that the
    // gate reads bindings and nothing else about the edge.
    const s = kindsGraph().createSession({ node: 'a', state: { draft: null }, stateTap: true });
    s.registerHandlers({ group: 'app', handlers: { 'save-draft': () => undefined } });

    expect(s.fire('save-draft', { source: 'agent' })).toMatchObject({ ok: true });
    expect(s.fire('open-b', { source: 'agent' })).toMatchObject({ ok: false, reason: 'NOT_MATERIALIZED' });
  });

  it('the self-report tier passes for a write-only click, exactly as for a navigation', () => {
    // invoke:false is the DOM sensor / external actuator: the click already
    // happened, the session is only recording it. Nothing to execute, nothing
    // to refuse — a rejection here would erase real motion from the log.
    const s = kindsGraph().createSession({ node: 'a', state: { draft: null } });

    expect(s.fire('save-draft', { source: 'agent', invoke: false })).toMatchObject({ ok: true });
    expect(s.fire('open-b', { source: 'agent', invoke: false })).toMatchObject({ ok: true });
    expect(s.transitions()).toHaveLength(2);
    expect(s.gaps()).toEqual([]); // a recorded fact is not a gap
  });
});
