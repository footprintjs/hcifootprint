/**
 * THE NON-BREAKING PROOF — with the option absent, 0.6 behaviour byte for byte.
 *
 * `requireHumanApproval` adds a gate, four journal kinds, four doors and a field
 * on the receipts. None of it may reach a consumer who did not ask for it, and
 * "none of it" is a claim that has to be TESTED rather than asserted — so this
 * file replays what the previous release did, including the parts that are now
 * known to be a hole. The reproduction of the finding is deliberate: it is what a
 * 0.6 consumer signed up for, and it is why the flag is opt-in rather than on.
 *
 * MUTATION PROOF: make the option default to `true` (drop the `=== undefined`
 * arm in the Session constructor) and every describe below goes red at once —
 * the forged fire refuses, the supersede test finds two ask ids, the 'approved'
 * row carries 'user' instead of the firing principal, and approveAsk stops
 * answering NOT_ENFORCED. Verified by running it.
 *
 * WHAT THIS FILE MISSED THE FIRST TIME, kept here because it is the lesson: a
 * non-breaking proof is only as wide as the cases it exercises. Every ask below
 * was made with NO input, so all of them asserted a true fact about a case the
 * change never touched — while the served path, which always has the model's
 * `input` argument, had started carrying user payloads into the receipts and into
 * the exported journal. The tests marked F5 are that case, and they exist because
 * "byte-identical" is a claim about the path consumers actually use.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import { shop, wire } from './fixture.js';
import type { ConfirmRecord, NavigationGraph } from '../src/index.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function shopMap(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: { checkout: { actions: { 'place-order': { does: 'Place the order', confirm: true, writes: ['orders'] } } } },
  });
}

function plainPort() {
  const session = shopMap().createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
  session.registerActions('checkout', { handlers: { 'place-order': () => undefined } });
  return { session, port: serveToAgent(session) };
}

/** A flat-graph session on the shared fixture, at the high-effect edge. */
function atCheckout() {
  const session = shop().createSession({ node: 'checkout', state: { cartCount: 2, authenticated: true } });
  wire(session, 'place-order');
  return session;
}

describe('the three probes that documented the hole still behave exactly as they did', () => {
  it('[A] served confirm:true on the FIRST call executes, and the journal stays empty', async () => {
    const { session, port } = plainPort();
    const fired = port.call('shop.do_action', { action: 'place-order', confirm: true });
    await tick();
    expect(fired).toMatchObject({ ok: true, did: 'checkout.place-order' });
    expect(session.confirms()).toHaveLength(0);
    expect(session.transitions().filter((t) => t.cause.affordanceId === 'checkout.place-order')).toHaveLength(1);
  });

  it('[B] a direct fire with confirm smuggled into the options bag succeeds — the field is dropped', () => {
    const session = atCheckout();
    const wireShape = { source: 'agent' as const, confirm: true };
    expect(session.fire('place-order', wireShape).ok).toBe(true);
    expect(session.confirms()).toHaveLength(0);
  });

  it('[C] two agent fires on ONE ask both succeed, against a single approved row', async () => {
    const session = atCheckout();
    session.confirmAsk('place-order', { source: 'agent' });
    const a = session.fire('place-order', { source: 'agent' });
    const b = session.fire('place-order', { source: 'agent' });
    await tick();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(session.confirms().map((r) => r.kind)).toEqual(['ask', 'approved']);
  });
});

describe('every confirm behaviour that shipped before this gate existed', () => {
  it('a confirmed fire closes the ask as approved and stamps askId on the transition', () => {
    const session = atCheckout();
    const { askId } = session.confirmAsk('place-order', { source: 'agent' });
    const fired = session.fire('place-order', { source: 'agent' });
    if (!fired.ok) throw new Error('unreachable');
    expect(fired.transition.askId).toBe(askId);
    expect(session.confirms()[1]).toMatchObject({ kind: 'approved', askId, transitionId: fired.transition.id });
  });

  it("the 'approved' row still carries the FIRING principal, not the human's", () => {
    const session = atCheckout();
    session.confirmAsk('place-order', { source: 'agent' });
    session.fire('place-order', { source: 'agent' });
    expect(session.confirms()[1].principal).toBe('agent');
    // And no enforcement stamp anywhere: this row is an audit trail, and the
    // library does not dress it up as anything more.
    expect(session.confirms().every((r) => r.enforced === undefined)).toBe(true);
  });

  it('asking twice while an ask is open SUPERSEDES it (one open ask per edge)', () => {
    const session = atCheckout();
    const first = session.confirmAsk('place-order').askId;
    const second = session.confirmAsk('place-order').askId;
    expect(second).toBe(first);
    session.fire('place-order', { source: 'agent' });
    expect(session.confirms().map((r) => r.kind)).toEqual(['ask', 'ask', 'approved']);
  });

  it('an ask + a decline still yields gaps().length === 0 (the journal is not the demand ledger)', () => {
    const session = atCheckout();
    session.confirmAsk('place-order');
    session.declineConfirm('place-order');
    expect(session.confirms()).toHaveLength(2);
    expect(session.gaps()).toHaveLength(0);
  });

  it('a decline still CLOSES the ask, and a pre-emptive one still mints a standalone id', () => {
    const session = atCheckout();
    const { askId } = session.confirmAsk('place-order');
    expect(session.declineConfirm('place-order', { by: 'ops@acme', note: 'over budget' })).toMatchObject({
      kind: 'declined',
      askId,
      by: 'ops@acme',
      note: 'over budget',
      principal: 'user',
    });
    // Closed: a later fire finds nothing to approve.
    session.fire('place-order', { source: 'agent' });
    expect(session.confirms().map((r) => r.kind)).toEqual(['ask', 'declined']);

    const fresh = atCheckout();
    expect(fresh.declineConfirm('place-order').askId).toMatch(/^ask#/);
  });

  it('confirms() still deep-copies — mutating a row cannot corrupt the ledger', () => {
    const session = atCheckout();
    session.confirmAsk('place-order');
    const rows = session.confirms();
    rows[0].affordanceId = 'TAMPERED';
    rows[0].receipts!.willDo.does = 'TAMPERED';
    expect(session.confirms()[0].affordanceId).toBe('place-order');
    expect(session.confirms()[0].receipts!.willDo.does).toBe('Place the order');
  });

  it('the receipts pack is unchanged when nothing tells the ask what will be sent', () => {
    const session = atCheckout();
    const { receipts } = session.confirmAsk('place-order');
    // willUse is ABSENT, not an empty object a reader would take for "sends nothing".
    expect('willUse' in receipts).toBe(false);
    expect(Object.keys(receipts).sort()).toEqual(['because', 'recentSteps', 'version', 'willDo', 'youAreOn']);
  });

  /**
   * ATTACK F5 — the case the test above cannot reach.
   *
   * It asks with NO input, and so did the served-path test below it, so both
   * asserted a true fact about a case the change never touched. The served path
   * DOES have an input — a model's `input` argument — and `askData` was handing it
   * to `confirmAsk` unconditionally. So a 0.6 consumer who upgraded and turned
   * nothing on started finding `receipts.willUse` in every high-effect ask AND in
   * the `'ask'` row of the confirm journal they export to an audit sink: user
   * payloads on a path that had never carried them.
   *
   * The input is now passed only where it BINDS something. An app that wants the
   * card to show it either way calls confirmAsk with it, which the last test here
   * proves still works.
   *
   * MUTATION PROOF: drop the `sessionEnforces` guard in askData and both of these
   * fail; nothing else in the suite notices, which is how it shipped.
   */
  it('F5: a served ask WITH an input still carries no willUse — not in the result, not in the journal', () => {
    const { session, port } = plainPort();
    const asked = port.call('shop.do_action', {
      action: 'place-order',
      input: { total: 42, cardNumber: '4111 1111 1111 1111' },
    }) as { receipts: Record<string, unknown> };

    expect(Object.keys(asked.receipts).sort()).toEqual([
      'because',
      'recentSteps',
      'version',
      'willDo',
      'youAreOn',
    ]);
    expect(session.confirms()[0].receipts!.willUse).toBeUndefined();
    // Said plainly because it is the reason the guard exists: nothing on the
    // default path carries the caller's payload into an export.
    expect(JSON.stringify(session.confirms())).not.toContain('4111');
  });

  it('F5: a journey step’s served ask is the same — one guard, both doors', () => {
    const session = shopMap().createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    session.registerActions('checkout', { handlers: { 'place-order': () => undefined } });
    const port = serveToAgent(session);
    const asked = port.call('shop.do_action', { action: 'place-order', input: { total: 42 } }) as {
      receipts: Record<string, unknown>;
    };
    expect(asked.receipts['willUse']).toBeUndefined();
  });

  it('F5: and an app that WANTS the input on its card still gets it, by asking for it', () => {
    const session = atCheckout();
    const { receipts } = session.confirmAsk('place-order', { input: { total: 42 } });
    expect(receipts.willUse).toEqual({ input: { total: 42 } });
  });

  it('groundTruth still says exactly one thing about an open ask', () => {
    const session = atCheckout();
    const { askId } = session.confirmAsk('place-order');
    const facts = session.groundTruth().text;
    expect(facts).toContain(`Awaiting the human's decision: place-order (${askId}).`);
    expect(facts).not.toContain('Approved by the human');
    expect(facts).not.toContain('The human declined');
  });
});

describe('none of the new machinery can appear without the option', () => {
  it("no 'used', 'refused', 'always-approved' or 'revoked' row can ever land", async () => {
    const { session, port } = plainPort();
    port.call('shop.do_action', { action: 'place-order' }); // ask
    port.call('shop.do_action', { action: 'place-order', confirm: true }); // fire
    port.call('shop.do_action', { action: 'place-order', confirm: true }); // again
    session.declineConfirm('checkout.place-order', { principal: 'agent' });
    await tick();

    const seen = new Set(session.confirms().map((r) => r.kind));
    for (const forbidden of ['used', 'refused', 'always-approved', 'revoked'] as ConfirmRecord['kind'][]) {
      expect(seen.has(forbidden)).toBe(false);
    }
    expect([...seen].sort()).toEqual(['approved', 'ask', 'declined']);
  });

  it('every human-side door refuses NOT_ENFORCED, and records nothing', () => {
    const session = atCheckout();
    const { askId } = session.confirmAsk('place-order');
    const before = session.confirms().length;
    expect(session.approveAsk(askId, { by: 'alice@ops' })).toMatchObject({ ok: false, reason: 'NOT_ENFORCED' });
    expect(session.declineAsk(askId, { by: 'alice@ops' })).toMatchObject({ ok: false, reason: 'NOT_ENFORCED' });
    expect(session.alwaysApprove('place-order', { by: 'alice@ops' })).toMatchObject({ reason: 'NOT_ENFORCED' });
    expect(session.revokeAlwaysApprove('place-order', { by: 'alice@ops' })).toMatchObject({ reason: 'NOT_ENFORCED' });
    expect(session.confirms()).toHaveLength(before);
  });

  /**
   * The gate now hands the handler the copy it proved, so that what a person
   * approved is what runs. That is a change to what a handler RECEIVES, and it
   * must not reach anyone who did not turn enforcement on — a 0.6 handler is
   * entitled to the caller's own object, identity and all, and an app that reads
   * back a live reference (or a payload carrying a class instance, a function, a
   * DOM node) keeps working exactly as it did.
   *
   * MUTATION PROOF: move the binding above the `#holdsFiresFrom` arm in fire()
   * so it applies to every fire, and both assertions below go red at once.
   */
  it('a handler still receives the CALLER’S OWN payload object, not a copy of it', async () => {
    const seen: unknown[] = [];
    const session = shopMap().createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    session.registerActions('checkout', { handlers: { 'place-order': (p: unknown) => void seen.push(p) } });

    // A Map survives only by reference — it is exactly what a copy would lose,
    // so this is the assertion an app with a rich payload would feel first.
    const payload = { total: 10, notes: new Map([['gift', true]]) };
    session.fire('checkout.place-order', { source: 'agent', payload });
    await tick();

    expect(seen[0]).toBe(payload); // the same object, not an equal one
    expect((seen[0] as typeof payload).notes.get('gift')).toBe(true);
  });

  /**
   * And the hole itself, reproduced — deliberately, like the three probes above.
   * With the option absent the payload stays live all the way to the handler, so
   * a post-fire mutation still lands. That is 0.6 behaviour; the gate is what
   * makes it stop, and the gate is opt-in.
   */
  it('a payload mutated after fire() still reaches the handler — 0.6 behaviour, reproduced', async () => {
    const seen: unknown[] = [];
    const session = shopMap().createSession({ node: 'checkout', state: {}, onWarn: () => undefined });
    session.registerActions('checkout', { handlers: { 'place-order': (p: unknown) => void seen.push(p) } });

    const payload = { total: 10 };
    session.fire('checkout.place-order', { source: 'agent', payload });
    payload.total = 999_999;
    await tick();

    expect(seen).toEqual([{ total: 999_999 }]);
  });

  it('the session reports honestly that it does not enforce', () => {
    expect(atCheckout().requiresHumanApproval).toBe(false);
    expect(shopMap().createSession({ node: 'checkout', requireHumanApproval: false }).requiresHumanApproval).toBe(false);
  });

  it('the served tool array is byte-identical to what a 0.6 port published', () => {
    const { port } = plainPort();
    const doAction = port.tools().find((t) => t.name === 'shop.do_action')!;
    const schema = doAction.inputSchema as {
      properties: Record<string, { description: string }>;
      additionalProperties: boolean;
    };
    expect(schema.properties.confirm.description).toBe(
      'Required true to proceed with a high-effect step (after the human approves the receipts).',
    );
    // Every served description, not just the one that gained a second mode:
    // `decline` grew an enforced wording too, and a byte-identical claim has to
    // cover the text a model actually reads.
    expect(schema.properties.decline.description).toBe(
      'Set true to record that the human refused a high-effect step (closes the ask; nothing fires).',
    );
    // No new model-facing argument, and the door stays closed to invented ones.
    expect(Object.keys(schema.properties).sort()).toEqual(['action', 'confirm', 'decline', 'input', 'instance']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('the needs-confirm result reads exactly as it did', () => {
    const { port } = plainPort();
    const asked = port.call('shop.do_action', { action: 'place-order' });
    expect(asked['howToAct']).toBe(
      'Show the human what this will do (see receipts), then call again with confirm: true to proceed — or decline: true if they refuse.',
    );
    expect('recordedAs' in asked).toBe(false);
  });

  it('an agent decline over the port still CLOSES the ask (the 0.6 relay behaviour)', () => {
    const { session, port } = plainPort();
    port.call('shop.do_action', { action: 'place-order' });
    const declined = port.call('shop.do_action', { action: 'place-order', decline: true });
    expect(declined).toMatchObject({ ok: false, judgment: 'declined' });
    expect('why' in declined).toBe(false);
    expect(session.groundTruth().text).not.toContain("Awaiting the human's decision");
  });
});
