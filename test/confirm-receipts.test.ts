/**
 * D21 — receipts on the high-effect ask, and decisions that leave a record.
 *
 * Two gaps this closes:
 *  1. The needs-confirm ask now carries RECEIPTS — willDo / because / youAreOn /
 *     recentSteps, assembled from what the session already knows (guard
 *     evidence, declared effect, position, the fire trail). No new capture.
 *  2. Asks and decisions become RECORDS — an auditable ask → decision → fire
 *     chain (confirms() ledger + TransitionRecord.askId linkage), kept separate
 *     from the gap ledger by design (a gated action is consented capability,
 *     not unmet demand).
 *
 * Field kinship with agentfootprint's checkIn evidence is deliberate; nothing
 * is imported across (this suite proves the shape stands on its own).
 */
import { describe, expect, it } from 'vitest';
import { shop, initialState, okUpdate } from './fixture.js';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
import type { ConfirmReceipts, ConfirmRecord, NavigationGraph } from '../src/index.js';

// A nav graph mirroring modes.test: place-order is a high-effect step on checkout.
function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      catalog: {
        tools: {
          'add-to-cart': { does: 'Add the selected dress to the cart', writes: ['cart'] },
          'go-checkout': { does: 'Go to checkout', goTo: 'checkout' },
        },
      },
      checkout: {
        tools: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } },
      },
    },
    skills: {
      purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart', 'go-checkout', 'place-order'] },
    },
  });
}

/** Drive a Mode B port all the way to a needs-confirm on place-order. */
function atNeedsConfirm() {
  const session = shopMap().createSession({ state: { cart: [] }, onWarn: () => undefined });
  const port = skillsAsTools(session);
  port.call('shop.skill.purchase', {});
  port.call('shop.skill.purchase', { step: 'add-to-cart' });
  session.updateState({ cart: ['dress'] });
  port.call('shop.skill.purchase', { step: 'go-checkout' }); // navigate to checkout
  const asked = port.call('shop.skill.purchase', { step: 'place-order' });
  return { session, port, asked };
}

// ---------------------------------------------------------------------------
// The receipts pack — assembled from what the session ALREADY knows
// ---------------------------------------------------------------------------

describe('receipts ride the ask', () => {
  it('assembles willDo (description + declared effect) + because (real guard evidence) + position', () => {
    // place-order: high-effect, guard { cartCount: gt 0, authenticated: eq true }, writes ['orderId'].
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    const { askId, receipts } = s.confirmAsk('place-order', { source: 'agent' });

    expect(askId).toMatch(/^ask#/);
    // willDo = authored words + the declared, honesty-tagged effect claim.
    expect(receipts.willDo).toEqual({ does: 'Place the order', writes: ['orderId'] });
    // because = the ACTUAL guard conditions that made it fireable, each KNOWN true.
    expect(receipts.because).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'cartCount', result: true }),
        expect.objectContaining({ key: 'authenticated', result: true }),
      ]),
    );
    expect(receipts.becauseUnevaluated).toBeUndefined();
    expect(receipts.youAreOn).toBe('checkout');
    expect(receipts.version).toBe(s.version);
  });

  it('recentSteps carries a compact, injection-safe tail of the fire journal', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    okUpdate(s.updateState({ cart: ['p1'], cartCount: 1 })); // settle it committed

    const { receipts } = s.confirmAsk('add-to-cart', { source: 'agent' });
    expect(receipts.recentSteps).toEqual([
      { what: 'add-to-cart', principal: 'agent', outcome: 'committed' },
    ]);
  });

  it('flags an unverifiable effect (declared writes, no state tap) up front', () => {
    // stateTap:false — nothing will ever report a delta, so the write can never be verified.
    const s = shop().createSession({
      node: 'checkout',
      state: { cartCount: 2, authenticated: true },
      stateTap: false,
    });
    const { receipts } = s.confirmAsk('place-order');
    expect(receipts.willDo).toEqual({ does: 'Place the order', writes: ['orderId'], effectUnverifiable: true });
  });

  it('marks guard keys taken on faith with becauseUnevaluated (honesty, not a silent pass)', () => {
    // cartCount is absent from the state view → unevaluable; authenticated is present.
    const s = shop().createSession({ node: 'checkout', state: { authenticated: true } });
    const { receipts } = s.confirmAsk('place-order');
    expect(receipts.because).toEqual([expect.objectContaining({ key: 'authenticated', result: true })]);
    expect(receipts.becauseUnevaluated).toEqual(['cartCount']);
  });

  it('an unguarded edge yields empty because — never a fabricated reason', () => {
    // The nav map's place-order has no guard chain.
    const map = shopMap();
    const s = map.createSession({ node: 'checkout', state: {} });
    const { receipts } = s.confirmAsk('checkout.place-order');
    expect(receipts.because).toEqual([]);
    expect(receipts.willDo).toMatchObject({ does: 'Place the order', writes: ['orders'] });
  });
});

// ---------------------------------------------------------------------------
// The ask → decision → fire chain (confirms() ledger + askId linkage)
// ---------------------------------------------------------------------------

describe('asks and decisions become records', () => {
  it('a confirmed fire closes the ask as approved and stamps askId on the transition', () => {
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    const { askId } = s.confirmAsk('place-order', { source: 'agent' });

    const fired = s.fire('place-order', { source: 'agent' });
    expect(fired.ok).toBe(true);
    if (!fired.ok) throw new Error('unreachable');
    // The fire links back to the receipts a human approved.
    expect(fired.transition.askId).toBe(askId);

    const chain = s.confirms();
    expect(chain.map((c) => c.kind)).toEqual(['ask', 'approved']);
    expect(chain[1]).toMatchObject({
      kind: 'approved',
      askId,
      affordanceId: 'place-order',
      transitionId: fired.transition.id,
      principal: 'agent',
    });
    // The transition log itself carries the link — auditable without the ledger.
    expect(s.transitions().find((t) => t.id === fired.transition.id)!.askId).toBe(askId);
  });

  it('declineConfirm closes the chain as declined — the refusal is recorded, nothing fires', () => {
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    const { askId } = s.confirmAsk('place-order', { source: 'agent' });

    const declined = s.declineConfirm('place-order', { by: 'ops@acme', note: 'over budget' });
    expect(declined).toMatchObject({ kind: 'declined', askId, affordanceId: 'place-order', by: 'ops@acme', note: 'over budget' });

    expect(s.confirms().map((c) => c.kind)).toEqual(['ask', 'declined']);
    expect(s.transitions()).toHaveLength(0); // no fire — nothing touched state
  });

  it('asking twice while an ask is open supersedes it (one open ask per edge)', () => {
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    const first = s.confirmAsk('place-order').askId;
    const second = s.confirmAsk('place-order').askId;
    expect(second).toBe(first);
    // Two ask rows landed, but a single fire approves ONCE (the open ask closes).
    s.fire('place-order', { source: 'agent' });
    const kinds = s.confirms().map((c) => c.kind);
    expect(kinds).toEqual(['ask', 'ask', 'approved']);
    expect(s.confirms().filter((c) => c.kind === 'approved')).toHaveLength(1);
  });

  it('a pre-emptive decline (no ask outstanding) still records a standalone refusal', () => {
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    const declined = s.declineConfirm('place-order');
    expect(declined.kind).toBe('declined');
    expect(declined.askId).toMatch(/^ask#/);
    expect(s.confirms()).toHaveLength(1);
  });

  it('the confirm journal is SEPARATE from the gap ledger (consented capability ≠ unmet demand)', () => {
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    s.confirmAsk('place-order');
    s.declineConfirm('place-order');
    expect(s.confirms()).toHaveLength(2);
    expect(s.gaps()).toHaveLength(0); // an ask/decline never pollutes the triage signal
  });

  it('onConfirm fires per row, deep-copies, isolates a throwing listener, unsubscribes cleanly', () => {
    const warnings: string[] = [];
    const s = shop().createSession({
      node: 'checkout',
      state: { cartCount: 2, authenticated: true },
      onWarn: (m) => warnings.push(m),
    });
    const seen: ConfirmRecord[] = [];
    const unsub = s.onConfirm((r) => seen.push(r));
    s.onConfirm(() => {
      throw new Error('exporter exploded');
    });

    s.confirmAsk('place-order');
    expect(seen).toHaveLength(1);
    expect(warnings.some((w) => w.includes('exporter exploded'))).toBe(true);

    // Deep copy: a listener mutating its row must not corrupt the journal.
    seen[0].receipts!.willDo.does = 'TAMPERED';
    expect(s.confirms()[0].receipts!.willDo.does).toBe('Place the order');

    unsub();
    s.declineConfirm('place-order');
    expect(seen).toHaveLength(1); // unsubscribed listener saw nothing new
    expect(s.confirms()).toHaveLength(2);
  });

  it('confirms() returns deep copies — mutating one row cannot corrupt the ledger', () => {
    const s = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
    s.confirmAsk('place-order');
    const rows = s.confirms();
    const originalLen = rows[0].receipts!.because.length;
    rows[0].receipts!.because.push({ key: 'INJECTED' } as never);
    rows[0].affordanceId = 'TAMPERED';
    const fresh = s.confirms();
    expect(fresh[0].receipts!.because).toHaveLength(originalLen);
    expect(fresh[0].receipts!.because.some((c) => (c as { key: string }).key === 'INJECTED')).toBe(false);
    expect(fresh[0].affordanceId).toBe('place-order');
  });
});

// ---------------------------------------------------------------------------
// Mode B serve layer — receipts serialize through doStep / doAction cleanly
// ---------------------------------------------------------------------------

describe('Mode B — receipts + decline over the serve layer', () => {
  it('a high-effect STEP returns needs-confirm carrying receipts + an askId', () => {
    const { asked } = atNeedsConfirm();
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm', step: 'checkout.place-order' });
    expect(typeof asked['askId']).toBe('string');
    const receipts = asked['receipts'] as ConfirmReceipts;
    expect(receipts.willDo).toMatchObject({ does: 'Place the order', writes: ['orders'] });
    expect(receipts.youAreOn).toBe('checkout');
    // the trail shows the steps that led here (authored ids only)
    expect(receipts.recentSteps.map((r) => r.what)).toContain('catalog.add-to-cart');
    expect(asked['howToAct']).toContain('confirm: true');
    expect(asked['howToAct']).toContain('decline: true');
    expect(asked['howToAct']).toContain('receipts');
  });

  it('confirm: true fires it and links the transition back to the ask', () => {
    const { session, port, asked } = atNeedsConfirm();
    const fired = port.call('shop.skill.purchase', { step: 'place-order', confirm: true });
    expect(fired['did']).toBe('checkout.place-order');

    const chain = session.confirms();
    expect(chain.map((c) => c.kind)).toEqual(['ask', 'approved']);
    expect(chain[1].askId).toBe(asked['askId']);
    expect(chain[1].transitionId).toBe(fired['transitionId']);
    const t = session.transitions().find((tr) => tr.id === fired['transitionId'])!;
    expect(t.askId).toBe(asked['askId']);
  });

  it('decline: true records the refusal and does NOT fire', () => {
    const { session, port } = atNeedsConfirm();
    const declined = port.call('shop.skill.purchase', { step: 'place-order', decline: true });
    expect(declined).toMatchObject({ ok: false, judgment: 'declined', step: 'checkout.place-order' });
    expect(session.confirms().map((c) => c.kind)).toEqual(['ask', 'declined']);
    // nothing fired: no place-order transition, no 'orders' write
    expect(session.transitions().some((t) => t.cause.affordanceId === 'checkout.place-order')).toBe(false);
    expect(session.state()['orders']).toBeUndefined();
  });

  it('do_action gates a high-effect action with receipts, confirm, and decline symmetrically', () => {
    const map = buildNavigationGraph('shop', {
      pages: { checkout: { tools: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } } } },
      skills: {},
    });
    // ask
    const s1 = map.createSession({ state: {} });
    const p1 = skillsAsTools(s1);
    const asked = p1.call('shop.do_action', { action: 'place-order' });
    expect(asked).toMatchObject({ ok: false, judgment: 'needs-confirm', action: 'checkout.place-order' });
    expect((asked['receipts'] as ConfirmReceipts).willDo.does).toBe('Place the order');
    // confirm fires + links
    const fired = p1.call('shop.do_action', { action: 'place-order', confirm: true });
    expect(fired['did']).toBe('checkout.place-order');
    expect(s1.confirms().map((c) => c.kind)).toEqual(['ask', 'approved']);
    // decline (fresh session)
    const s2 = map.createSession({ state: {} });
    const p2 = skillsAsTools(s2);
    p2.call('shop.do_action', { action: 'place-order' });
    const declined = p2.call('shop.do_action', { action: 'place-order', decline: true });
    expect(declined).toMatchObject({ ok: false, judgment: 'declined', action: 'checkout.place-order' });
    expect(s2.confirms().map((c) => c.kind)).toEqual(['ask', 'declined']);
  });

  it('a NON-high-effect edge is untouched — no ask, no receipts, no confirm rows', () => {
    const session = shopMap().createSession({ state: { cart: [] }, onWarn: () => undefined });
    const port = skillsAsTools(session);
    port.call('shop.skill.purchase', {});
    const step = port.call('shop.skill.purchase', { step: 'add-to-cart' }); // low-effect
    expect(step['did']).toBe('catalog.add-to-cart');
    expect(step).not.toHaveProperty('receipts');
    expect(step).not.toHaveProperty('askId');
    session.updateState({ cart: ['dress'] });
    const nav = port.call('shop.skill.purchase', { step: 'go-checkout' }); // low-effect
    expect(nav['did']).toBe('catalog.go-checkout');
    expect(session.confirms()).toHaveLength(0); // the confirm machinery never engaged
  });

  it('receipts + the confirm chain are JSON round-trip stable (they ride the wire)', () => {
    const { session, asked } = atNeedsConfirm();
    const receipts = asked['receipts'] as ConfirmReceipts;
    expect(JSON.parse(JSON.stringify(receipts))).toEqual(receipts);
    // whole needs-confirm result serializes cleanly (mcp-server JSON.stringifies it)
    expect(() => JSON.stringify(asked)).not.toThrow();
    session; // (chain asserted elsewhere)
    const chain = session.confirms();
    expect(JSON.parse(JSON.stringify(chain))).toEqual(chain);
  });
});
