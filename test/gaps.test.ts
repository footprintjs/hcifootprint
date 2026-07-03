/**
 * D17 — the gap ledger: unmet demand as structured, token-lean rows, with a
 * live export hook. Rejected fires record automatically; unserved asks are
 * reported explicitly; consumers pipe rows to their own triage.
 */
import { describe, expect, it } from 'vitest';
import { shop, initialState } from './fixture.js';
import type { GapRecord } from '../src/index.js';

describe('gap ledger — unmet demand', () => {
  it('a rejected fire records a row automatically, with reason and context names', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } }); // guard fails (not authenticated)
    s.fire('ghost-action', { source: 'agent' }); // unknown id — the ATTEMPT is the signal

    const gaps = s.gaps();
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'GUARD_FAILED',
      affordanceId: 'add-to-cart',
      principal: 'agent',
      node: 'catalog',
    });
    expect(gaps[0].evidence).toEqual([
      expect.objectContaining({ key: 'authenticated', result: false }),
    ]);
    expect(gaps[1]).toMatchObject({ kind: 'fire-rejected', rejectionReason: 'UNKNOWN_AFFORDANCE', affordanceId: 'ghost-action' });
    // context is NAMES ONLY — token-lean, injection-safe:
    expect(gaps[0].availableActions).toEqual(['login']);
    expect(gaps[0].availableSkills).toEqual(['purchase']);
  });

  it('reportGap records an unserved ask, length-capped, with reason', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    const row = s.reportGap({
      request: 'where is my refund from March?' + 'x'.repeat(600),
      reason: 'needs-backend-data',
      principal: 'agent',
    });
    expect(row.kind).toBe('reported');
    expect(row.reason).toBe('needs-backend-data');
    expect(row.request!.length).toBe(500); // capped — rows stay cheap for batch triage
    expect(row.availableActions).toEqual(['login']);
    expect(s.gaps()).toHaveLength(1);
  });

  it('onGap fires per row, unsubscribes cleanly, and a throwing listener never breaks the session', () => {
    const warnings: string[] = [];
    const s = shop().createSession({ node: 'catalog', state: initialState, onWarn: (m) => warnings.push(m) });
    const seen: GapRecord[] = [];
    const unsubscribe = s.onGap((gap) => seen.push(gap));
    s.onGap(() => {
      throw new Error('consumer pipeline exploded');
    });

    const result = s.fire('ghost', { source: 'user' });
    expect(result.ok).toBe(false); // the rejection still returns normally
    expect(seen).toHaveLength(1);
    expect(warnings.some((w) => w.includes('consumer pipeline exploded'))).toBe(true);

    unsubscribe();
    s.reportGap({ request: 'bulk-order 50 dresses' });
    expect(seen).toHaveLength(1); // unsubscribed listener saw nothing new
    expect(s.gaps()).toHaveLength(2);
  });

  it('gap rows are DEEP copies — nested arrays and evidence objects cannot corrupt the ledger', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    // guard rejection: FireResult.evidence and the ledger must NOT share objects
    const rejected = s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
    (rejected as { evidence: { result: boolean }[] }).evidence[0].result = true; // caller annotates its copy
    expect(s.gaps()[0].evidence?.[0].result).toBe(false); // ledger unchanged

    s.reportGap({ request: 'gift wrap?' });
    const rows = s.gaps();
    rows[0].request = 'tampered';
    rows[1].availableActions.push('INJECTED');
    expect(s.gaps()[0].request).toBeUndefined(); // fire-rejected row has no request
    expect(s.gaps()[1].availableActions).not.toContain('INJECTED');

    // a listener trimming its copy in place must not wipe the stored row
    s.onGap((gap) => {
      gap.availableActions.length = 0;
    });
    s.reportGap({ request: 'bulk order?' });
    expect(s.gaps()[2].availableActions.length).toBeGreaterThan(0);
  });

  it('successful fires do NOT create gap rows', () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.fire('login', { source: 'user' });
    expect(s.gaps()).toHaveLength(0);
  });
});
