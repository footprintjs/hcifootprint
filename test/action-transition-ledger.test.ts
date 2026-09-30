import { describe, expect, it } from 'vitest';
import { TransitionLedger } from '../src/action/transition-ledger.js';
import type { StoredTransition } from '../src/action/stored.js';
import type { ActionTransitionRef } from '../src/action/types.js';

/**
 * TransitionLedger · announceVerified — a settlement that happened is never
 * failed by a listener, and one listener's failure never starves another.
 * The listeners are the library's own folds (declared context), which
 * isolate the app code they run; this pins the second guard, for a fold
 * that fails anyway.
 */
function row(ledger: TransitionLedger): StoredTransition {
  const { transitionId, sequence } = ledger.mint();
  const stored = {
    ref: Object.freeze({ transitionId }) as unknown as ActionTransitionRef,
    sequence,
    coverage: 'verifiable',
    verificationDeclared: true,
    invocationStatus: 'performed',
    effectStatus: 'unverified',
  } as unknown as StoredTransition;
  ledger.store(transitionId, stored);
  return stored;
}

describe('TransitionLedger · verified listeners', () => {
  it('a throwing listener neither fails the settlement nor starves the next listener', () => {
    const ledger = new TransitionLedger();
    const heard: string[] = [];
    ledger.onVerified(() => {
      throw new Error('a broken fold');
    });
    ledger.onVerified((stored) => heard.push(stored.ref.transitionId));
    const stored = row(ledger);
    const settlement = ledger.settle(stored.ref, { status: 'verified', evidence: { ok: true } });
    expect(settlement.status).toBe('verified');
    expect(stored.effectStatus).toBe('verified');
    expect(heard).toEqual([stored.ref.transitionId]);
  });
});
