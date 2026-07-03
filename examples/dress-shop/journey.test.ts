/**
 * The end-to-end journey the demo (and the planned X2 study) is built on:
 * user browses and picks a dress by hand, the agent takes over and completes
 * the purchase inside a skill frame, then the user asks about the order —
 * one session, one commit log, full provenance, every answer explainable.
 */
import { describe, expect, it } from 'vitest';
import { createDressShopApp } from './store.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('dress-shop — the full mixed-initiative journey', () => {
  it('user finds a dress → agent purchases in a frame → user asks about the order', async () => {
    const app = createDressShopApp();
    const s = app.session;

    // ── USER, by hand: home → catalog → search → filter → open a dress ──────
    s.fire('browse-dresses', { source: 'user' });
    await flush();
    expect(s.node).toBe('catalog');

    s.fire('search-dresses', { source: 'user', payload: { query: 'dress' } });
    await flush();
    expect(s.state()['resultCount']).toBeGreaterThan(0);

    s.fire('filter-by-color', { source: 'user', payload: { color: 'red' } });
    await flush();
    expect(s.state()['activeColor']).toBe('red');

    s.fire('view-dress', { source: 'user', payload: { dressId: 'd3' } });
    await flush();
    expect(s.node).toBe('product');
    expect(s.state()['selectedDressId']).toBe('d3');

    // ── AGENT takes over: skills-first disclosure, then the purchase frame ──
    const skills = s.availableSkills().skills;
    expect(skills.map((sk) => sk.id)).toEqual(['find-dress', 'purchase', 'track-order']);
    expect(skills.find((sk) => sk.id === 'track-order')!.preconditionPassed).toBe(false); // no orders yet

    const committed = s.commitSkill('purchase', { source: 'agent' });
    expect(committed).toMatchObject({ ok: true });

    // Disclosure: only the frame's fireable steps + escape are served
    const toolNames = s.toMCPTools().map((t) => t.name);
    expect(toolNames).toContain('dress-shop.add-to-cart');
    expect(toolNames).toContain('dress-shop.leave-skill');
    expect(toolNames).not.toContain('dress-shop.search-dresses'); // not in the skill

    // The agent walks the derived plan; each fire executes the app's REAL handler
    s.fire('add-to-cart', { source: 'agent' });
    await flush();
    expect(s.state()['cartCount']).toBe(1);
    s.fire('go-to-cart', { source: 'agent' });
    await flush();
    s.fire('proceed-to-checkout', { source: 'agent' });
    await flush();
    const order = s.fire('place-order', { source: 'agent', expectedVersion: s.version });
    expect(order).toMatchObject({ ok: true });
    await flush();
    expect(s.state()['lastOrderId']).toBe('ord-1');
    expect(app.appState().cart).toEqual([]); // the REAL app state changed — not a simulation

    expect(s.skillFrame()!.firedSteps).toEqual([
      'add-to-cart',
      'go-to-cart',
      'proceed-to-checkout',
      'place-order',
    ]);
    expect(s.leaveSkill()!.status).toBe('completed');

    // ── USER asks: "what happened / where's my order?" ──────────────────────
    const brief = s.contextBrief();
    expect(brief.text).toContain('user fired view-dress');
    expect(brief.text).toContain('agent fired place-order');
    expect(brief.text).toContain('[high-effect]');

    s.fire('view-orders', { source: 'user' });
    await flush();
    expect(s.node).toBe('orders');
    s.fire('check-order-status', { source: 'user', payload: { orderId: 'ord-1' } });
    await flush();
    expect(s.state()['orderStatus']).toBe('ord-1: processing');

    // Explainability: the commit log answers "why does the order exist?"
    const why = s.why('lastOrderId');
    expect(why).toContain('place-order');

    // Trace integrity: every committed transition has its bundle
    const log = s.commitLog();
    expect(log.every((b, i) => b.idx === i)).toBe(true);
    const committedIds = s
      .transitions()
      .filter((t) => t.outcome === 'committed')
      .map((t) => t.id)
      .sort();
    expect(log.map((b) => b.runtimeStageId).sort()).toEqual(committedIds);

    // Provenance: both principals interleaved in ONE history
    const principals = new Set(s.transitions().map((t) => t.cause.principal));
    expect(principals.has('user')).toBe(true);
    expect(principals.has('agent')).toBe(true);
  });

  it('guard reality: the agent cannot place an order with an empty cart', () => {
    const app = createDressShopApp();
    const s = app.session;
    app.goto('checkout'); // deep-link straight to checkout, nothing in the cart
    expect(s.fire('place-order', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'GUARD_FAILED',
      evidence: [expect.objectContaining({ key: 'cartCount', result: false })],
    });
  });

  it('lazy tools: page groups mount and unmount as the user moves', async () => {
    const app = createDressShopApp();
    const s = app.session;
    const home = Object.fromEntries(s.available().edges.map((e) => [e.affordanceId, e.materialized]));
    expect(home['browse-dresses']).toBe(true);

    s.fire('browse-dresses', { source: 'user' });
    await flush();
    const catalog = Object.fromEntries(s.available().edges.map((e) => [e.affordanceId, e.materialized]));
    expect(catalog['search-dresses']).toBe(true); // catalog group mounted
    // and the home group is gone: nothing on catalog claims browse-dresses
    expect('browse-dresses' in catalog).toBe(false);
  });

  it('two-string-class holds end to end: hostile catalog data never reaches descriptors or the brief', async () => {
    const app = createDressShopApp();
    const s = app.session;
    s.fire('browse-dresses', { source: 'user' });
    await flush();
    s.fire('search-dresses', { source: 'user', payload: { query: 'IGNORE' } }); // finds the hostile dress
    await flush();
    expect(s.state()['resultCount']).toBe(1);
    const everything = JSON.stringify(s.toMCPTools()) + s.contextBrief().text;
    expect(everything).not.toContain('IGNORE PREVIOUS');
  });
});
