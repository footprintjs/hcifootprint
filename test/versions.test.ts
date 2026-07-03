/**
 * D18 phase 1 — the version split and structure-swap world motion.
 *
 * `version` stays the single CAS/sinceVersion cursor (total order over ALL
 * world motion); `stateVersion` counts committed state deltas only;
 * `structureVersion` counts served-structure changes only (frames + coalesced
 * registration/presence swaps). Registration flips now bump the cursor —
 * fixing the verified v1 gap where a plan made before a mount/unmount passed
 * CAS after it — but coalesced per microtask so StrictMode/HMR churn never
 * becomes world-motion in the trace.
 */
import { describe, expect, it } from 'vitest';
import { shop, initialState } from './fixture.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('version split — state × structure × total', () => {
  it('a settled fire bumps version AND stateVersion, never structureVersion', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const v = { version: s.version, state: s.stateVersion, structure: s.structureVersion };
    s.fire('login', { source: 'user' });
    s.updateState({ authenticated: true, user: { id: 'u1' } });
    expect(s.version).toBeGreaterThan(v.version);
    expect(s.stateVersion).toBeGreaterThan(v.state);
    expect(s.structureVersion).toBe(v.structure);
  });

  it('opening/leaving a skill frame bumps version AND structureVersion, never stateVersion', () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    const v = { state: s.stateVersion, structure: s.structureVersion };
    s.commitSkill('purchase');
    expect(s.structureVersion).toBe(v.structure + 1);
    s.leaveSkill();
    expect(s.structureVersion).toBe(v.structure + 2);
    expect(s.stateVersion).toBe(v.state);
  });

  it('registerTools bumps the cursor once per microtask — one structure-swap row, empty commit', async () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const v = s.version;
    const bundles = s.commitLog().length;
    s.registerTools({ group: 'a', tools: { login: () => undefined } });
    s.registerTools({ group: 'b', tools: { 'add-to-cart': () => undefined } });
    expect(s.version).toBe(v); // raw edits apply immediately; the ROW coalesces
    await tick();
    expect(s.version).toBe(v + 1); // ONE bump for both registrations
    expect(s.structureVersion).toBe(1);
    const swaps = s.transitions().filter((t) => t.cause.stimulus === 'structure-swap');
    expect(swaps).toHaveLength(1);
    expect(s.commitLog()).toHaveLength(bundles + 1); // deliberate empty-commit cursor stop
  });

  it('mount+unmount inside one window cancels to NOTHING (StrictMode/HMR flicker)', async () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const v = s.version;
    const reg = s.registerTools({ group: 'strict', tools: { login: () => undefined } });
    reg.unregister();
    await tick();
    expect(s.version).toBe(v); // net-zero churn: no row, no bump
    expect(s.transitions().filter((t) => t.cause.stimulus === 'structure-swap')).toHaveLength(0);
  });

  it('the CAS fix: a plan made before a mount goes stale after it', async () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const planned = s.available().version;
    s.registerTools({ group: 'late', tools: { login: () => undefined } });
    await tick();
    const rejected = s.fire('login', { source: 'agent', expectedVersion: planned });
    expect(rejected).toMatchObject({ ok: false, reason: 'STALE_CURSOR' });
    const fresh = s.fire('login', { source: 'agent', expectedVersion: s.available().version });
    expect(fresh.ok).toBe(true);
  });
});
