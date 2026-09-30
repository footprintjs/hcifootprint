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

/**
 * TransitionLedger · list — the `definition` filter matches the connected
 * definition's REF OBJECT, never its id string (the declared-context law:
 * the callable, not its id). Through the public runtime the one-callable-
 * per-id guard makes the two agree, so the law is pinned here, at its owner:
 * two rows whose definitions share an id but are different refs. Compare
 * `definitionId` strings instead and the second row leaks into the answer.
 */
describe('TransitionLedger · list by definition', () => {
  function rowFor(ledger: TransitionLedger, definition: object): StoredTransition {
    const { transitionId, sequence } = ledger.mint();
    const binding = Object.freeze({
      kind: 'action-binding',
      bindingId: `binding-${transitionId}`,
      definition,
      node: 'panel',
    });
    const stored = {
      ref: Object.freeze({ transitionId, binding }) as unknown as ActionTransitionRef,
      input: Object.freeze({ source: 'none' }),
      sequence,
      coverage: 'verifiable',
      verificationDeclared: true,
      attribution: Object.freeze({ principal: 'unknown', basis: 'unknown' }),
      invocationStatus: 'performed',
      effectStatus: 'unverified',
    } as unknown as StoredTransition;
    ledger.store(transitionId, stored);
    return stored;
  }

  it('answers only the rows of that exact ref, even when another ref shares its id', () => {
    const ledger = new TransitionLedger();
    const declared = Object.freeze({ kind: 'action-definition', definitionId: 'panel.refetch' });
    const sameId = Object.freeze({ kind: 'action-definition', definitionId: 'panel.refetch' });
    const mine = rowFor(ledger, declared);
    rowFor(ledger, sameId);
    const listed = ledger.list({ definition: declared as never });
    expect(listed.map((snapshot) => snapshot.ref.transitionId)).toEqual([
      mine.ref.transitionId,
    ]);
  });
});
