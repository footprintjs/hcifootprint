import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  declareKinds,
  defineAction,
  type ActionEffectSettlementInput,
  type ActionReturnOutcome,
} from '../src/index.js';

/**
 * SETTLE WHEN THE ACTION RETURNS (2.6.0). `settle.onReturn` is the
 * definition's AUTHORED verdict on its own return — the same for every
 * binding — run through the one settle funnel. A definition declaring it
 * settles a synchronous return before `invoke()` returns.
 */
type Reply =
  | { readonly status: 'refetched'; readonly dataset: { ref: string; rootRef: string } }
  | { readonly status: 'refused'; readonly reason: string };

const judge = (
  outcome: ActionReturnOutcome<Reply>,
): ActionEffectSettlementInput | undefined =>
  outcome.status === 'failed'
    ? { status: 'refused', reason: String(outcome.error) }
    : outcome.produced.status === 'refetched'
      ? { status: 'verified', evidence: outcome.produced.dataset }
      : { status: 'refused', reason: outcome.produced.reason };

function refetchAction(
  mutate: (range: string) => Reply | Promise<Reply>,
  id = 'panel.refetch-on-return',
) {
  return defineAction(id, {
    does: 'Re-run the series over the chosen range and open the new dataset',
    invocation: 'scalar',
    settle: { evidence: { kind: 'panel.dataset-version' }, onReturn: judge },
    mutate,
  });
}

const dataset = { ref: 'ds-2', rootRef: 'ds-1' };

describe('settle.onReturn', () => {
  it('settles a synchronous return before invoke() returns', async () => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      refetchAction(() => ({ status: 'refetched', dataset })),
      { node: 'panel', coverage: 'verifiable' },
    );
    const invocation = connection.invoke('7d');
    // The very next line — no await.
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'verified',
      evidence: dataset,
      evidenceKind: 'panel.dataset-version',
    });
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(await invocation.whenEffectSettled).toMatchObject({ status: 'verified' });
  });

  it('keeps the microtask close for definitions that do not declare it', () => {
    const runtime = createActionRuntime();
    const plain = defineAction('panel.plain-on-return', {
      does: 'Write the range',
      invocation: 'scalar',
      settle: { writes: ['panel.range'] },
      mutate: (range: string) => range,
    });
    const connection = connectAction(runtime, plain, { node: 'panel' });
    const invocation = connection.invoke('7d');
    expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe(
      'pending',
    );
  });

  it('judges an asynchronous return when it resolves, before whenInvoked is observed', async () => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      refetchAction(async () => ({ status: 'refused', reason: 'upstream down' })),
      { node: 'panel', coverage: 'verifiable' },
    );
    const invocation = connection.invoke('7d');
    expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe(
      'pending',
    );
    await invocation.whenInvoked;
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'refused',
      reason: 'upstream down',
    });
  });

  it('judges a failed handler — thrown synchronously or rejected', async () => {
    const runtime = createActionRuntime();
    const throwing = connectAction(
      runtime,
      refetchAction(() => {
        throw new Error('boom');
      }, 'panel.refetch-throws'),
      { node: 'panel', coverage: 'verifiable' },
    );
    const rejecting = connectAction(
      runtime,
      refetchAction(async () => {
        throw new Error('later boom');
      }, 'panel.refetch-rejects'),
      { node: 'panel', coverage: 'verifiable' },
    );
    const first = throwing.invoke('7d');
    expect(runtime.transitionFor(first.transition)).toMatchObject({
      invocationStatus: 'failed',
      effectStatus: 'refused',
      reason: 'Error: boom',
    });
    const second = rejecting.invoke('7d');
    await second.whenInvoked;
    expect(runtime.transitionFor(second.transition)).toMatchObject({
      invocationStatus: 'failed',
      effectStatus: 'refused',
      reason: 'Error: later boom',
    });
  });

  it('is not called for a preflight refusal — the runtime already settled that effect', () => {
    let calls = 0;
    const runtime = createActionRuntime();
    const guarded = defineAction('panel.refetch-preflight', {
      does: 'Refetch',
      invocation: 'scalar',
      inputSchema: { safeParse: (value: unknown) => ({ success: value === 'ok' }) },
      settle: {
        onReturn: () => {
          calls += 1;
          return undefined;
        },
      },
      mutate: (range: string) => range,
    });
    const connection = connectAction(runtime, guarded, { node: 'panel' });
    const invocation = connection.invoke('bad');
    expect(calls).toBe(0);
    expect(runtime.transitionFor(invocation.transition)?.reason).toEqual({
      code: 'ACTION_NOT_ATTEMPTED',
      phase: 'preflight',
    });
  });

  it('leaves the effect open when the verdict is undefined', () => {
    const runtime = createActionRuntime();
    const quiet = defineAction('panel.refetch-quiet', {
      does: 'Refetch',
      invocation: 'inputless',
      settle: { writes: ['panel.rows'], onReturn: () => undefined },
      mutate: () => 1,
    });
    const connection = connectAction(runtime, quiet, {
      node: 'panel',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'unverified',
    });
    // An observer or external report can still settle it.
    expect(
      connection.settle(invocation.transition, { status: 'verified', evidence: 1 })
        .status,
    ).toBe('verified');
  });

  it('meets every gate: a verdict a gate refuses goes to onInvocationError and the effect stays open', async () => {
    const errors: unknown[] = [];
    const runtime = createActionRuntime({
      kinds: declareKinds({
        'panel.dataset-version': {
          schema: {
            safeParse: (value: unknown) => ({
              success: typeof (value as { ref?: unknown })?.ref === 'string',
            }),
          },
        },
      }),
    });
    const executable = connectAction(
      runtime,
      refetchAction(() => ({ status: 'refetched', dataset }), 'panel.gate-coverage'),
      { node: 'panel', onInvocationError: (error) => void errors.push(error) },
    );
    const first = executable.invoke('7d');
    expect(runtime.transitionFor(first.transition)?.effectStatus).toBe('unverified');

    const badEvidence = connectAction(
      runtime,
      refetchAction(
        () => ({ status: 'refetched', dataset: { rootRef: 'x' } as never }),
        'panel.gate-evidence',
      ),
      {
        node: 'panel',
        coverage: 'verifiable',
        onInvocationError: (error) => void errors.push(error),
      },
    );
    const second = badEvidence.invoke('7d');
    expect(runtime.transitionFor(second.transition)?.effectStatus).toBe('unverified');
    await Promise.resolve();
    expect(errors.map((error) => (error as Error).message)).toEqual([
      expect.stringMatching(/cannot be verified from executable coverage/),
      expect.stringMatching(/not a valid 'panel\.dataset-version'/),
    ]);
  });

  it('routes a throwing or thenable verdict to onInvocationError without touching the invocation', async () => {
    const errors: unknown[] = [];
    const runtime = createActionRuntime();
    const throwing = defineAction('panel.verdict-throws', {
      does: 'Refetch',
      invocation: 'inputless',
      settle: {
        writes: ['panel.rows'],
        onReturn: () => {
          throw new Error('verdict broke');
        },
      },
      mutate: () => 'rows',
    });
    const thenable = defineAction('panel.verdict-thenable', {
      does: 'Refetch',
      invocation: 'inputless',
      settle: {
        writes: ['panel.rows'],
        onReturn: (() => Promise.reject(new Error('nope'))) as never,
      },
      mutate: () => 'rows',
    });
    const onInvocationError = (error: unknown) => void errors.push(error);
    const a = connectAction(runtime, throwing, { node: 'panel', onInvocationError });
    const b = connectAction(runtime, thenable, { node: 'panel', onInvocationError });
    const first = a.invoke();
    const second = b.invoke();
    expect(await first.whenInvoked).toMatchObject({ status: 'performed', produced: 'rows' });
    expect(await second.whenInvoked).toMatchObject({ status: 'performed', produced: 'rows' });
    expect(runtime.transitionFor(first.transition)?.effectStatus).toBe('unverified');
    expect(runtime.transitionFor(second.transition)?.effectStatus).toBe('unverified');
    expect(errors.map((error) => (error as Error).message)).toEqual([
      'verdict broke',
      expect.stringMatching(/must return its verdict synchronously/),
    ]);
  });

  it("makes an observer's own settle a late settlement — first terminal wins, the loser is quoted", async () => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      refetchAction(() => ({ status: 'refetched', dataset })),
      {
        node: 'panel',
        coverage: 'verifiable',
        onInvocation: async (invocation, settlement) => {
          await invocation.whenInvoked;
          settlement.settle({ status: 'refused', reason: 'observer disagrees' });
        },
      },
    );
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    await Promise.resolve();
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'verified',
      lateSettlements: [{ claimed: 'refused', payload: 'observer disagrees' }],
    });
  });

  it('does not judge a host continuation of a mutation definition', async () => {
    let calls = 0;
    const runtime = createActionRuntime();
    const action = defineAction('panel.continuation-on-return', {
      does: 'Refetch',
      invocation: 'inputless',
      settle: {
        writes: ['panel.rows'],
        onReturn: () => {
          calls += 1;
          return undefined;
        },
      },
      mutate: () => 1,
    });
    const connection = connectAction(runtime, action, { node: 'panel' });
    await connection.invokeContinuation(() => 'listener result').whenInvoked;
    expect(calls).toBe(0);
  });

  it('is refused at declaration for host actions and for a non-function', () => {
    expect(() =>
      defineAction('panel.host-on-return', {
        does: 'Press',
        invocation: 'host',
        settle: { onReturn: () => undefined } as never,
        mutate: (_event: unknown) => undefined,
      }),
    ).toThrow(/host invocation cannot declare settle\.onReturn/);
    expect(() =>
      defineAction('panel.not-a-function', {
        does: 'Refetch',
        invocation: 'inputless',
        settle: { onReturn: 'verified' as never },
        mutate: () => 1,
      }),
    ).toThrow(/settle\.onReturn must be a function/);
  });
});
