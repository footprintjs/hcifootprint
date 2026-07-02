import { describe, expect, it } from 'vitest';
import { skillGraph } from '../src/index.js';
import { shop, initialState, okUpdate } from './fixture.js';

const binding = { kind: 'element', locator: { role: 'button', name: 'Go' } } as const;

describe('fire() — transitions with provenance, CAS, and settlement', () => {
  it('unknown affordance → UNKNOWN_AFFORDANCE listing what IS available', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const r = s.fire('ghost', { source: 'agent' });
    expect(r).toMatchObject({ ok: false, reason: 'UNKNOWN_AFFORDANCE', available: ['login'] });
  });

  it('stale expectedVersion → STALE_CURSOR (the agent must replan on a fresh slice)', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const { version } = s.available();
    // the user acts while the agent is planning:
    s.updateState({ authenticated: true }, { principal: 'user' });
    const r = s.fire('login', { source: 'agent', expectedVersion: version });
    expect(r).toMatchObject({ ok: false, reason: 'STALE_CURSOR' });
    expect((r as { version: number }).version).toBe(s.version);
  });

  it('guards are re-evaluated at fire time even without CAS', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.updateState({ authenticated: true }, { stimulus: 'push' }); // login guard (eq:false) now fails
    const r = s.fire('login', { source: 'user' }); // no expectedVersion supplied
    expect(r).toMatchObject({ ok: false, reason: 'GUARD_FAILED' });
    expect((r as { evidence: unknown[] }).evidence).toEqual([
      expect.objectContaining({ key: 'authenticated', op: 'eq', result: false }),
    ]);
  });

  it('off-node affordance → NOT_ON_NODE', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true, cartCount: 1 } });
    expect(s.fire('place-order', { source: 'agent' })).toMatchObject({ ok: false, reason: 'NOT_ON_NODE' });
  });

  it('declared writes → awaiting-state; updateState settles FIFO with effectVerified', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const r = s.fire('login', { source: 'user' });
    expect(r).toMatchObject({ ok: true, settlement: 'awaiting-state' });
    const t = (r as { transition: { outcome: string; timestamp: number } }).transition;
    expect(t.outcome).toBe('pending');
    expect(t.timestamp).toBeGreaterThan(0);
    expect(s.pending()).toMatchObject([{ affordanceId: 'login' }]);

    const settled = okUpdate(s.updateState({ authenticated: true, user: { name: 'ada' } }));
    expect(settled.attributed).toBe(true);
    expect(settled.transition.outcome).toBe('committed');
    expect(settled.transition.effectVerified).toBe(true); // declared [authenticated, user] ⊆ delta
    expect(s.state()['authenticated']).toBe(true);
    expect(s.pending()).toEqual([]);
  });

  it('a missing declared write settles with effectVerified=false — the effect claim lied', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    const settled = okUpdate(s.updateState({ cart: [{ id: 'p1' }] })); // declared cartCount never arrived
    expect(settled.transition.effectVerified).toBe(false);
    expect(settled.transition.outcome).toBe('committed');
  });

  it('navigation-only affordances settle immediately; toNode is flagged as a CLAIM', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, cartCount: 1 } });
    const r = s.fire('go-to-cart', { source: 'user' });
    expect(r).toMatchObject({ ok: true, settlement: 'settled' });
    expect(s.node).toBe('cart');
    const t = (r as { transition: { toNode?: string; toNodeClaimed?: boolean; effectVerified?: unknown } }).transition;
    expect(t.toNode).toBe('cart');
    expect(t.toNodeClaimed).toBe(true); // declared, not observed — sync() records reality
    expect(t.effectVerified).toBe('unobservable'); // no writes declared
  });

  it('a non-cloneable delta value rejects with a typed result and PRESERVES the pending queue', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const fired = s.fire('login', { source: 'user' });
    const id = (fired as { transition: { id: string } }).transition.id;

    const bad = s.updateState({ authenticated: true, onRetry: () => 1 });
    expect(bad).toMatchObject({ ok: false, reason: 'UNCLONEABLE_DELTA' });
    expect(s.pending().map((p) => p.id)).toEqual([id]); // still settleable

    const retry = okUpdate(s.updateState({ authenticated: true, user: { name: 'ada' } }));
    expect(retry.attributed).toBe(true);
    expect(retry.transition.id).toBe(id);
    expect(retry.transition.outcome).toBe('committed');
  });

  it('an explicitly-marked stimulus delta is NEVER hijacked by a pending transition', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const fired = s.fire('login', { source: 'user' }); // pending
    const push = okUpdate(s.updateState({ notifications: 3 }, { stimulus: 'push' }));
    expect(push.attributed).toBe(false);
    expect(push.transition.cause).toMatchObject({ kind: 'stimulus', stimulus: 'push', principal: 'system' });

    // login is still pending and settles with its own delta afterwards
    const settled = okUpdate(s.updateState({ authenticated: true, user: {} }));
    expect(settled.transition.id).toBe((fired as { transition: { id: string } }).transition.id);
    expect(settled.transition.effectVerified).toBe(true);
  });

  it('transitionId settles a specific pending precisely; UNKNOWN_TRANSITION lists the queue', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('save-name', { on: 'a', description: 'Save name', binding, effect: { writes: ['name'] } })
      .affordance('save-email', { on: 'a', description: 'Save email', binding, effect: { writes: ['email'] } })
      .build();
    const s = g.createSession({ node: 'a' });
    const a = s.fire('save-name', { source: 'agent' }) as { transition: { id: string } };
    const b = s.fire('save-email', { source: 'agent' }) as { transition: { id: string } };

    // email handler resolves first — precise attribution beats FIFO
    const settledB = okUpdate(s.updateState({ email: 'a@b.c' }, { transitionId: b.transition.id }));
    expect(settledB.transition.cause.affordanceId).toBe('save-email');
    expect(settledB.transition.effectVerified).toBe(true);

    const unknown = s.updateState({ x: 1 }, { transitionId: 'nope#99' });
    expect(unknown).toMatchObject({ ok: false, reason: 'UNKNOWN_TRANSITION', pending: [a.transition.id] });

    const settledA = okUpdate(s.updateState({ name: 'ada' }));
    expect(settledA.transition.cause.affordanceId).toBe('save-name');
    expect(settledA.transition.effectVerified).toBe(true);
  });

  it('bare-FIFO with swapped deltas mis-attributes — and effectVerified=false is the designed detector', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('save-name', { on: 'a', description: 'Save name', binding, effect: { writes: ['name'] } })
      .affordance('save-email', { on: 'a', description: 'Save email', binding, effect: { writes: ['email'] } })
      .build();
    const s = g.createSession({ node: 'a' });
    s.fire('save-name', { source: 'agent' });
    s.fire('save-email', { source: 'agent' });
    const first = okUpdate(s.updateState({ email: 'a@b.c' })); // arrives out of order
    const second = okUpdate(s.updateState({ name: 'ada' }));
    expect(first.transition.cause.affordanceId).toBe('save-name'); // FIFO mis-attribution…
    expect(first.transition.effectVerified).toBe(false); // …flagged, not silent
    expect(second.transition.effectVerified).toBe(false);
  });

  it('validates payloads against a parseable schema → PAYLOAD_INVALID', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('save', {
        on: 'a',
        description: 'Save',
        binding,
        schema: {
          safeParse: (v: unknown) =>
            typeof v === 'object' && v !== null && 'name' in (v as object)
              ? { success: true }
              : { success: false, error: 'name is required' },
        },
      })
      .build();
    const s = g.createSession({ node: 'a' });
    expect(s.fire('save', { source: 'agent', payload: {} })).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
      issues: expect.stringContaining('name is required'),
    });
    expect(s.fire('save', { source: 'agent', payload: { name: 'x' } })).toMatchObject({ ok: true });
  });

  it('reject() on a pending: no bundle, version bumps, later deltas are not attributed to it', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const r = s.fire('login', { source: 'user' });
    const id = (r as { transition: { id: string } }).transition.id;
    const bundlesBefore = s.commitLog().length;
    const versionBefore = s.version;
    const rejected = s.reject(id, { outcome: 'rolled-back' });
    expect(rejected.outcome).toBe('rolled-back');
    expect(s.version).toBe(versionBefore + 1); // stale plans must not survive a rollback
    expect(s.commitLog()).toHaveLength(bundlesBefore); // no bundle for a rolled-back effect
    expect(s.state()['authenticated']).toBe(false);
    const u = okUpdate(s.updateState({ authenticated: true }));
    expect(u.attributed).toBe(false);
  });

  it('reject() on an already-SETTLED transition marks it rolled-back (server rejected after optimistic apply)', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const r = s.fire('login', { source: 'user' });
    const id = (r as { transition: { id: string } }).transition.id;
    okUpdate(s.updateState({ authenticated: true, user: {} })); // optimistic apply reported
    const rolled = s.reject(id); // server says no
    expect(rolled.outcome).toBe('rolled-back');
    // the compensating revert arrives as its own honest stimulus write:
    const revert = okUpdate(s.updateState({ authenticated: false, user: null }, { stimulus: 'push' }));
    expect(revert.attributed).toBe(false);
  });

  it('fire-time guard evidence over a redacted key is persisted redacted in the record', () => {
    const s = shop().createSession({
      node: 'catalog',
      state: { ...initialState, authenticated: true },
      redactedKeys: ['authenticated'],
    });
    const r = s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    const t = (r as { transition: { evidence?: { redacted: boolean; actualSummary: string }[] } }).transition;
    expect(t.evidence?.[0]).toMatchObject({ redacted: true, actualSummary: '[REDACTED]' });
  });

  it('every transition carries cause with principal — user and agent interleave in one log', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.fire('login', { source: 'user' });
    s.updateState({ authenticated: true, user: { name: 'ada' } });
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 });
    const causes = s.transitions().map((t) => `${t.cause.kind}:${t.cause.principal}:${t.cause.affordanceId}`);
    expect(causes).toEqual(['fired:user:login', 'fired:agent:add-to-cart']);
  });
});
