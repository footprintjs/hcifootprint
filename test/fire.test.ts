/**
 * REACHING FOR A CONTROL — and being told the truth about what happened.
 *
 * `fire()` is the one door through which an act reaches the app, whoever takes
 * it. Everything hard about it is downstream of a single fact: THE LIBRARY DOES
 * NOT EXECUTE THE APP. It hands an act to a handler the app wrote, and then it
 * has to say honestly what it does and does not know about the result.
 *
 * THE HONESTY LAWS PINNED HERE:
 *
 * - EVERY REFUSAL TEACHES. A refusal names a typed reason and the material to
 *   act on it — what IS reachable, which condition failed, which version is
 *   current. A refusal a planner can only retry against is a loop.
 * - A CLAIM IS NEVER A FACT. `navigatesTo` says where the author believes an
 *   action goes, so the destination is stamped as CLAIMED. `writes` says what
 *   the author believes it changes, so when the report arrives the library
 *   checks the claim against it and records `effectVerified` either way. It
 *   never upgrades the app's word into an observation.
 * - AN UNANSWERABLE QUESTION STAYS OPEN. An action declaring no writes has no
 *   effect anyone could verify — that is `'unobservable'`, a real answer, and
 *   distinct from "verified false".
 * - AN ACT IS ATTRIBUTED, NEVER GUESSED AT SILENTLY. When a report cannot be
 *   matched exactly, the library still matches it — by order — and then FLAGS
 *   the result rather than presenting a guess as a fact. The mis-attribution is
 *   detectable by design, which is the difference between a heuristic that is
 *   honest and one that is quiet.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { shop, initialState, okUpdate, wire } from './fixture.js';

const binding = { kind: 'element', locator: { role: 'button', name: 'Go' } } as const;

describe('EVERY REFUSAL TEACHES: reaching for what cannot be acted on', () => {
  it('an action nobody declared is named as unknown, and answered with what IS reachable', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const r = s.fire('ghost', { source: 'agent' });
    expect(r).toMatchObject({ ok: false, reason: 'UNKNOWN_AFFORDANCE', available: ['login'] });
  });

  it('a plan made against a world that has since moved is refused, and told the current version', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const { version } = s.available();
    // the user acts while the agent is planning:
    s.updateState({ authenticated: true }, { principal: 'user' });
    const r = s.fire('login', { source: 'agent', expectedVersion: version });
    expect(r).toMatchObject({ ok: false, reason: 'STALE_CURSOR' });
    expect((r as { version: number }).version).toBe(s.version);
  });

  it('a guard is judged again at the moment of the act, even when nobody asked for a version check', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.updateState({ authenticated: true }, { stimulus: 'push' }); // login guard (eq:false) now fails
    const r = s.fire('login', { source: 'user' }); // no expectedVersion supplied
    expect(r).toMatchObject({ ok: false, reason: 'GUARD_FAILED' });
    expect((r as { evidence: unknown[] }).evidence).toEqual([
      expect.objectContaining({ key: 'authenticated', op: 'eq', result: false }),
    ]);
  });

  it('an action that exists but is not on this page is refused for that reason and no other', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true, cartCount: 1 } });
    expect(s.fire('place-order', { source: 'agent' })).toMatchObject({ ok: false, reason: 'NOT_ON_NODE' });
  });

  it('a payload the author’s own schema rejects is refused in that schema’s own words', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        save: { on: 'a', does: 'Save', binding, input: {
          safeParse: (v: unknown) =>
            typeof v === 'object' && v !== null && 'name' in (v as object)
              ? { success: true }
              : { success: false, error: 'name is required' },
        } },
      },
    });
    const s = g.createSession({ node: 'a' });
    expect(s.fire('save', { source: 'user', payload: {} })).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
      issues: expect.stringContaining('name is required'),
    });
    expect(s.fire('save', { source: 'user', payload: { name: 'x' } })).toMatchObject({ ok: true });
  });
});

describe('A CLAIM IS NEVER A FACT: how a fire comes to rest', () => {
  it('an action claiming to write waits for the app to report, then has its claim checked', () => {
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

  it('a declared write that never arrived settles anyway, recorded as an unmet claim', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    s.fire('add-to-cart', { source: 'user', payload: { productId: 'p1' } });
    const settled = okUpdate(s.updateState({ cart: [{ id: 'p1' }] })); // declared cartCount never arrived
    expect(settled.transition.effectVerified).toBe(false);
    expect(settled.transition.outcome).toBe('committed');
  });

  it('AN UNANSWERABLE QUESTION STAYS OPEN: an action claiming no writes is unobservable, not unverified', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, cartCount: 1 } });
    const r = s.fire('go-to-cart', { source: 'user' });
    expect(r).toMatchObject({ ok: true, settlement: 'settled' });
    expect(s.node).toBe('cart');
    const t = (r as { transition: { toNode?: string; toNodeClaimed?: boolean; effectVerified?: unknown } }).transition;
    expect(t.toNode).toBe('cart');
    expect(t.toNodeClaimed).toBe(true); // declared, not observed — sync() records reality
    expect(t.effectVerified).toBe('unobservable'); // no writes declared
  });

});

describe('AN ACT IS ATTRIBUTED, NEVER GUESSED AT SILENTLY', () => {
  it('a report the library cannot even copy is refused without losing the fire it was for', () => {
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

  it('a change the app says nobody fired for is never credited to a waiting act', () => {
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

  it('an app that names the fire it is reporting for is believed exactly, out of order and all', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        'save-name': { on: 'a', does: 'Save name', binding, writes: ['name'] },
        'save-email': { on: 'a', does: 'Save email', binding, writes: ['email'] },
      },
    });
    // stateTap: this session HAS a reporting tap (it just starts empty) — the
    // pending/attribution machinery below is exactly the with-tap contract.
    const s = g.createSession({ node: 'a', stateTap: true });
    const a = s.fire('save-name', { source: 'user' }) as { transition: { id: string } };
    const b = s.fire('save-email', { source: 'user' }) as { transition: { id: string } };

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

  it('an app that names nothing is matched by order — and the mismatch is FLAGGED, never quiet', () => {
    const g = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        'save-name': { on: 'a', does: 'Save name', binding, writes: ['name'] },
        'save-email': { on: 'a', does: 'Save email', binding, writes: ['email'] },
      },
    });
    const s = g.createSession({ node: 'a', stateTap: true });
    s.fire('save-name', { source: 'user' });
    s.fire('save-email', { source: 'user' });
    const first = okUpdate(s.updateState({ email: 'a@b.c' })); // arrives out of order
    const second = okUpdate(s.updateState({ name: 'ada' }));
    expect(first.transition.cause.affordanceId).toBe('save-name'); // FIFO mis-attribution…
    expect(first.transition.effectVerified).toBe(false); // …flagged, not silent
    expect(second.transition.effectVerified).toBe(false);
  });

});

describe('the app taking it back — a fire the world refused after the fact', () => {
  it('rolling back an open fire writes no effect, and later reports are not credited to it', () => {
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

  it('a fire that already settled can still be marked taken back, and the revert stands on its own', () => {
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

});

describe('REDACTION HOLDS ON THE PERMANENT RECORD, not only on what is served', () => {
  it('a hidden key’s value never reaches the transition the fire wrote', () => {
    const s = shop().createSession({
      node: 'catalog',
      state: { ...initialState, authenticated: true },
      redactedKeys: ['authenticated'],
    });
    const r = s.fire('add-to-cart', { source: 'user', payload: { productId: 'p1' } });
    const t = (r as { transition: { evidence?: { redacted: boolean; actualSummary: string }[] } }).transition;
    expect(t.evidence?.[0]).toMatchObject({ redacted: true, actualSummary: '[REDACTED]' });
  });

});

describe('one ledger, and it always says who acted', () => {
  it('a human act and an agent act land on the same log, each naming its own principal', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    wire(s, 'add-to-cart'); // the agent needs a real binding to act through
    s.fire('login', { source: 'user' });
    s.updateState({ authenticated: true, user: { name: 'ada' } });
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 });
    const causes = s.transitions().map((t) => `${t.cause.kind}:${t.cause.principal}:${t.cause.affordanceId}`);
    expect(causes).toEqual(['fired:user:login', 'fired:agent:add-to-cart']);
  });
});
