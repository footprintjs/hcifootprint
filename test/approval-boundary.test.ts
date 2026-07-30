/**
 * WHERE THE GATE REACHES, AND WHERE IT DELIBERATELY DOES NOT.
 *
 * An undocumented trust boundary is how audits fail, so every edge of this option
 * is pinned by a test rather than left to be discovered. Two halves:
 *
 *  1. PATH ESCAPE — the same unapproved high-effect fire must refuse identically
 *     through every door that can execute one. `#invokeHandler` is the only thing
 *     that executes and all four of its call sites are inside `fire()`, so one
 *     gate covers all of them; these tests are what keeps that true as doors are
 *     added.
 *  2. THE DOCUMENTED HOLES — a port built with `source: 'user'` disarms the gate
 *     BY DESIGN (the app-self-report tier), and so does the record-only sensor.
 *     Pinned so the exemption can never widen, and can never vanish, without
 *     somebody deciding to.
 *
 * Mutation proofs: drop the `source === 'agent'` clause from the gate and the
 * two exemption tests fail (real human motion starts being refused); drop the
 * `opts.invoke !== false` clause and the sensor test fails the same way; break
 * the options spread in InteractionSession's constructor and the propagation
 * test fails while nothing else does.
 */
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { InteractionSession, buildNavigationGraph, skillsAsTools } from '../src/index.js';
import { mcpServer } from '../src/mcp.js';
import { testApp } from '../src/testing/index.js';
import type { NavigationGraph, Session } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      checkout: { tools: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } } },
    },
    skills: { purchase: { does: 'Buy it', steps: ['place-order'] } },
  });
}

function strictSession(): Session {
  const session = shopMap().createSession({
    node: 'checkout',
    state: {},
    requireHumanApproval: true,
    onWarn: () => undefined,
  });
  session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
  return session;
}

/** Did the action actually happen? The only question that matters here. */
const executed = (session: Session): boolean =>
  session.transitions().some((t) => t.cause.affordanceId === 'checkout.place-order');

describe('path escape — one gate, every door', () => {
  it('base Session.fire', () => {
    const session = strictSession();
    expect(session.fire('checkout.place-order', { source: 'agent' })).toMatchObject({
      ok: false,
      reason: 'APPROVAL_REQUIRED',
    });
    expect(executed(session)).toBe(false);
  });

  it('InteractionSession.fire — the tree layer gates then delegates, it does not duplicate', () => {
    const session = strictSession();
    expect(session).toBeInstanceOf(InteractionSession);
    // Through the tree's own override (instance/overlay/visibility gates first).
    expect(session.fire('checkout.place-order', { source: 'agent', instance: undefined })).toMatchObject({
      reason: 'APPROVAL_REQUIRED',
    });
  });

  it('Mode B skill', async () => {
    const session = strictSession();
    const port = skillsAsTools(session);
    port.call('shop.skill.purchase', {});
    const fired = port.call('shop.skill.purchase', { step: 'place-order', confirm: true });
    await tick();
    expect(fired).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
    expect(executed(session)).toBe(false);
  });

  it('Mode B do_action', async () => {
    const session = strictSession();
    const fired = skillsAsTools(session).call('shop.do_action', { action: 'place-order', confirm: true });
    await tick();
    expect(fired).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
    expect(executed(session)).toBe(false);
  });

  it('the MCP server — it wraps the Mode B port, so it inherits the gate with no logic of its own', async () => {
    const session = strictSession();
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const server = mcpServer(session);
    await server.connect(serverT);
    const client = new Client({ name: 'test-host', version: '0.0.0' });
    await client.connect(clientT);

    const result = (await client.callTool({
      name: 'shop.do_action',
      arguments: { action: 'place-order', confirm: true },
    })) as { content: Array<{ text: string }> };
    const body = JSON.parse(result.content[0].text) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
    expect(executed(session)).toBe(false);
  });

  it('the hcifootprint/testing agent door — it routes through the port', async () => {
    const session = strictSession();
    // The bring-your-own-session door, so the harness drives the ENFORCING
    // session rather than one of its own making.
    const app = testApp({ session: session as InteractionSession });
    const result = await app.agent.do('place-order', { confirm: true });
    expect(result).toMatchObject({ ok: false, reason: 'APPROVAL_REQUIRED' });
    expect(executed(session)).toBe(false);
  });

  it('and every one of them lands the SAME pair of ledger rows', async () => {
    const session = strictSession();
    skillsAsTools(session).call('shop.do_action', { action: 'place-order', confirm: true });
    session.fire('checkout.place-order', { source: 'agent' });
    await tick();
    expect(session.gaps().filter((g) => g.rejectionReason === 'APPROVAL_REQUIRED')).toHaveLength(2);
    expect(session.confirms().filter((r) => r.kind === 'refused')).toHaveLength(2);
  });
});

describe('option propagation — the tree layer inherits by SPREAD, and nothing else holds it', () => {
  it('createSession forwards the option into the base session', () => {
    expect(shopMap().createSession({ node: 'checkout', requireHumanApproval: true }).requiresHumanApproval).toBe(true);
  });

  it('a hand-constructed InteractionSession inherits it through the same spread', () => {
    // nav-session.ts passes `{ ...(opts ?? {}), node }` to super — that spread is
    // the ONLY thing carrying every SessionOption into the tree layer.
    const session = new InteractionSession(shopMap(), {
      node: 'checkout',
      requireHumanApproval: true,
      onWarn: () => undefined,
    });
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
    expect(session.requiresHumanApproval).toBe(true);
    expect(session.fire('checkout.place-order', { source: 'agent' })).toMatchObject({ reason: 'APPROVAL_REQUIRED' });
  });

  it('and the clock rides the same spread without disturbing the tree’s own grace timers', () => {
    let clock = 5_000;
    const session = shopMap().createSession({
      node: 'checkout',
      requireHumanApproval: { expiresAfterMs: 10 },
      now: () => clock,
      onWarn: () => undefined,
    });
    session.registerToolGroup('checkout', { handlers: { 'place-order': () => undefined } });
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent' });
    expect(session.confirms()[0].timestamp).toBe(5_000);
    session.approveAsk(askId, { by: 'alice@ops' });
    clock = 5_100;
    expect(session.fire('checkout.place-order', { source: 'agent', askId })).toMatchObject({
      reason: 'APPROVAL_STALE',
    });
  });
});

describe('what remains possible BY DESIGN — named, so it can never change silently', () => {
  it('a port constructed with source:"user" disarms the gate — hand a model one and you have disarmed it', async () => {
    const session = strictSession();
    // The same sentence README already uses about the never-trap gate: the
    // guarantee keys off source 'agent', so a port built with a non-agent source
    // is the app reporting its own motion, and the library will not call that a
    // forgery.
    const disarmed = skillsAsTools(session, { source: 'user' });
    const fired = disarmed.call('shop.do_action', { action: 'place-order', confirm: true });
    await tick();
    expect(fired).toMatchObject({ ok: true, did: 'checkout.place-order' });
    expect(executed(session)).toBe(true);
  });

  it('a direct source:"user" or "system" fire is the app-self-report tier, and passes', async () => {
    const session = strictSession();
    expect(session.fire('checkout.place-order', { source: 'user' }).ok).toBe(true);
    expect(session.fire('checkout.place-order', { source: 'system' }).ok).toBe(true);
    await tick();
    // Real motion, recorded — and under enforcement it links to no approval,
    // because none authorized it. The library states what it knows, and no more.
    expect(session.transitions().filter((t) => t.askId !== undefined)).toHaveLength(0);
    expect(session.confirms()).toHaveLength(0);
  });

  it('the record-only sensor tier (invoke:false) passes — the browser already ran the app’s onClick', () => {
    const session = strictSession();
    expect(session.fire('checkout.place-order', { source: 'agent', invoke: false }).ok).toBe(true);
  });

  it('a LOW-effect action is never gated: the author’s confirm flag is what declares the boundary', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { checkout: { tools: { search: { does: 'Search', writes: ['n'] } } } },
    });
    const session = map.createSession({ node: 'checkout', state: {}, requireHumanApproval: true, onWarn: () => undefined });
    session.registerToolGroup('checkout', { handlers: { search: () => undefined } });
    expect(session.fire('checkout.search', { source: 'agent' }).ok).toBe(true);
    await tick();
    expect(session.confirms()).toHaveLength(0);
  });

  it('WHO the human is stays the host’s claim — `by` is a string the library records, never verifies', () => {
    const session = strictSession();
    const { askId } = session.confirmAsk('checkout.place-order', { source: 'agent' });
    const approved = session.approveAsk(askId, { by: 'definitely-not-alice' });
    if (!approved.ok) throw new Error('unreachable');
    // The library proves a 'user'-principal row exists. It does not, and says it
    // does not, prove that a particular person authenticated.
    expect(approved.record).toMatchObject({ principal: 'user', by: 'definitely-not-alice' });
    expect(session.fire('checkout.place-order', { source: 'agent', askId }).ok).toBe(true);
  });
});
