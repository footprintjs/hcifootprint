import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * transition-ledger.ts · settle — the two arms of "first terminal wins" and
 * the one refusal that must not spend the terminal. Driven through the public
 * connection, whose `settle` reaches the ledger unchanged.
 */

async function invoked() {
  const action = defineAction('ledger.cover', {
    does: 'Record one transition to settle',
    invocation: 'inputless',
    mutate: () => 'done',
    settle: { writes: ['ledger.subject'] },
  });
  const runtime = createActionRuntime();
  const connection = connectAction(runtime, action, {
    node: 'ledger',
    coverage: 'verifiable',
  });
  const invocation = connection.invoke();
  await invocation.whenInvoked;
  return { runtime, connection, transition: invocation.transition };
}

describe('settle() needs a settlement record — and refusing one spends nothing', () => {
  it('null or a bare status string is refused, and the rail still settles afterwards', async () => {
    const { runtime, connection, transition } = await invoked();
    for (const input of [null, 'verified']) {
      expect(() => connection.settle(transition, input as never)).toThrow(
        /settle\(\) needs a settlement record/,
      );
    }
    expect(runtime.transitionFor(transition)?.effectStatus).toBe('unverified');

    const settled = connection.settle(transition, {
      status: 'refused',
      reason: 'the store said no',
    });
    expect(settled.status).toBe('refused');
    expect(runtime.transitionFor(transition)?.effectStatus).toBe('refused');
  });
});

describe('after the terminal, late arrivals are quoted — only records are quotable', () => {
  it('a late non-record is not a claim: nothing is recorded and the first terminal is returned', async () => {
    const { runtime, connection, transition } = await invoked();
    const first = connection.settle(transition, {
      status: 'refused',
      reason: 'first word',
    });
    for (const input of [null, 'verified', 7]) {
      expect(connection.settle(transition, input as never)).toBe(first);
    }
    expect(runtime.transitionFor(transition)?.lateSettlements).toBeUndefined();
  });

  it("a late 'abandoned' is quoted by its status alone — it carries no payload to quote", async () => {
    const { runtime, connection, transition } = await invoked();
    const first = connection.settle(transition, {
      status: 'refused',
      reason: 'first word',
    });
    expect(
      connection.settle(transition, {
        status: 'abandoned',
        authority: { kind: 'cancelled', reason: 'operator stopped waiting' },
      }),
    ).toBe(first);
    const late = runtime.transitionFor(transition)?.lateSettlements;
    expect(late).toEqual([{ claimed: 'abandoned' }]);
    expect(Object.hasOwn(late![0]!, 'payload')).toBe(false);
    expect(runtime.transitionFor(transition)?.effectStatus).toBe('refused');
  });
});
