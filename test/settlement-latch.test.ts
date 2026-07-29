/**
 * The settlement latch in isolation: resolve-once, pre-resolved, never-reject.
 * These are the guarantees `FireResult.whenSettled` is built on — a caller who
 * awaits it must get exactly one answer and must never be handed a rejection
 * they did not opt into.
 */
import { describe, expect, it } from 'vitest';
import { createSettlementLatch, settledNow } from '../src/traverse/settlement.js';
import type { FireSettlement } from '../src/index.js';

const settlement = (over: Partial<FireSettlement> = {}): FireSettlement => ({
  effectStatus: 'performed',
  outcome: 'committed',
  transition: {
    id: 't#0',
    cause: { kind: 'fired', principal: 'agent', affordanceId: 'a' },
    timestamp: 0,
    outcome: 'committed',
    fromNode: 'p',
    cursorVersion: 0,
  },
  ...over,
});

describe('createSettlementLatch() — one answer, delivered once', () => {
  it('resolves with the settlement it was given', async () => {
    const latch = createSettlementLatch();
    latch.settle(settlement({ effectStatus: 'performed' }));
    await expect(latch.promise).resolves.toMatchObject({
      effectStatus: 'performed',
      outcome: 'committed',
    });
  });

  it('ignores every settle after the first — first settlement wins', async () => {
    const latch = createSettlementLatch();
    latch.settle(settlement({ effectStatus: 'performed' }));
    latch.settle(settlement({ effectStatus: 'refused', outcome: 'rolled-back' }));
    const result = await latch.promise;
    expect(result.effectStatus).toBe('performed'); // the later compensation never rewrites it
    expect(result.outcome).toBe('committed');
  });

  it('stays unresolved until something settles it (the never-reported fire)', async () => {
    const latch = createSettlementLatch();
    const marker = Symbol('still-open');
    const raced = await Promise.race([latch.promise, Promise.resolve(marker)]);
    expect(raced).toBe(marker);
  });

  it('never rejects — a refusal arrives as data on the resolved value', async () => {
    const latch = createSettlementLatch();
    latch.settle(settlement({ effectStatus: 'refused', outcome: 'rejected', error: new Error('api down') }));
    const result = await latch.promise; // would throw here if the latch could reject
    expect(result.effectStatus).toBe('refused');
    expect(String((result as { error: unknown }).error)).toContain('api down');
  });
});

describe('settledNow() — the arms whose truth is known synchronously', () => {
  it('delivers on await without any further event', async () => {
    const latch = settledNow(settlement({ effectStatus: 'unobservable' }));
    await expect(latch.promise).resolves.toMatchObject({ effectStatus: 'unobservable' });
  });

  it('is already closed: a later settle cannot reopen it', async () => {
    const latch = settledNow(settlement({ effectStatus: 'unobservable' }));
    latch.settle(settlement({ effectStatus: 'performed' }));
    expect((await latch.promise).effectStatus).toBe('unobservable');
  });
});
