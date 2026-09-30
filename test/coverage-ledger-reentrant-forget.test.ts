import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * transition-ledger.ts · railClosed / forget — the settled-row counter that
 * `history: { keep }` trims by must count only rows the ledger still holds.
 *
 * The window: a transition whose EFFECT settled while its invocation was
 * still pending is fully settled the instant the invocation finishes — and
 * the progress channel's closing publication runs application listeners
 * before the ledger counts the row. A listener that forgets the transition
 * right there removes an UNCOUNTED row; the count that followed used to add
 * a phantom for it, and the next settled transition was evicted at once
 * although it was the only one kept.
 */
describe('a transition forgotten from inside its own closing publication', () => {
  it('is never counted afterwards, so retention keeps exactly what it promised', async () => {
    const runtime = createActionRuntime({ history: { keep: 1 } });

    let finish!: (value: string) => void;
    const slow = defineAction('coverage.forget-in-close', {
      does: 'Write the record later',
      invocation: 'scalar',
      settle: { progress: { stages: ['queued'] } },
      mutate: (_id: string) =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    });
    const slowConnection = connectAction(runtime, slow, {
      node: 'slow',
      coverage: 'verifiable',
    });
    const first = slowConnection.invoke('record-1');
    // The effect's terminal lands while the invocation is still pending.
    slowConnection.settle(first.transition, {
      status: 'abandoned',
      authority: { kind: 'cancelled', reason: 'the user left' },
    });
    const forgotten: boolean[] = [];
    first.progress!.subscribe((snapshot) => {
      if (snapshot.disposition === 'closed') {
        forgotten.push(runtime.forgetTransition(first.transition));
      }
    });
    finish('written');
    await first.whenInvoked;
    expect(forgotten).toEqual([true]);
    expect(runtime.transitionFor(first.transition)).toBeUndefined();

    const quick = defineAction('coverage.forget-in-close.next', {
      does: 'Write the record now',
      invocation: 'inputless',
      mutate: () => 'written',
    });
    const quickConnection = connectAction(runtime, quick, {
      node: 'quick',
      coverage: 'verifiable',
    });
    const second = quickConnection.invoke();
    await second.whenInvoked;
    quickConnection.settle(second.transition, {
      status: 'abandoned',
      authority: { kind: 'cancelled', reason: 'superseded' },
    });
    // keep: 1 — the one settled transition the ledger holds is retained.
    expect(runtime.transitionFor(second.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'abandoned',
    });
  });
});
