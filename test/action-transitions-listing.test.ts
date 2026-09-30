import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
  type ActionTransitionRef,
} from '../src/index.js';

/**
 * LIST WHAT THE LEDGER HOLDS (2.6.0). `transitions(query?)` answers every
 * retained row, oldest INVOCATION first; `history: { keep }` releases the
 * oldest fully settled rows and never a pending one.
 */
const refetch = defineAction('panel.refetch-listing', {
  does: 'Re-run the series over the chosen range',
  invocation: 'scalar',
  settle: { writes: ['panel.rows'] },
  mutate: (range: string) => range,
});
const release = defineAction('panel.release-listing', {
  does: 'Stop the chosen range riding the next question',
  invocation: 'scalar',
  settle: { writes: ['panel.range'] },
  mutate: (range: string) => range,
});

function verifiable(runtime = createActionRuntime()) {
  const a = connectAction(runtime, refetch, {
    node: 'panel',
    instance: 'artifact-a',
    coverage: 'verifiable',
  });
  const b = connectAction(runtime, refetch, {
    node: 'panel',
    instance: 'artifact-b',
    coverage: 'verifiable',
  });
  const r = connectAction(runtime, release, {
    node: 'panel',
    instance: 'artifact-a',
    coverage: 'verifiable',
  });
  return { runtime, a, b, r };
}

const ids = (rows: readonly { readonly ref: ActionTransitionRef }[]) =>
  rows.map((row) => row.ref.transitionId);

describe('runtime.transitions()', () => {
  it('lists every retained transition in invocation order, not settlement order', async () => {
    const { runtime, a, b, r } = verifiable();
    const first = a.invoke('7d');
    const second = b.invoke('30d');
    const third = r.invoke('7d');
    await Promise.all([first.whenInvoked, second.whenInvoked, third.whenInvoked]);
    // Settled newest first — the listing does not care.
    r.settle(third.transition, { status: 'verified', evidence: 'released' });
    a.settle(first.transition, { status: 'verified', evidence: 'rows' });
    expect(ids(runtime.transitions())).toEqual(
      ids([first, second, third].map((i) => ({ ref: i.transition }))),
    );
    expect(Object.isFrozen(runtime.transitions())).toBe(true);
  });

  it('filters by definition (callable or ref), binding, instance and status — ANDed', async () => {
    const { runtime, a, b, r } = verifiable();
    const first = a.invoke('7d');
    const second = b.invoke('30d');
    const third = r.invoke('7d');
    await Promise.all([first.whenInvoked, second.whenInvoked, third.whenInvoked]);
    a.settle(first.transition, { status: 'verified', evidence: 'rows' });
    b.settle(second.transition, { status: 'refused', reason: 'upstream down' });

    expect(ids(runtime.transitions({ definition: refetch }))).toEqual([
      first.transition.transitionId,
      second.transition.transitionId,
    ]);
    expect(ids(runtime.transitions({ definition: a.definition }))).toHaveLength(2);
    expect(ids(runtime.transitions({ binding: b.binding }))).toEqual([
      second.transition.transitionId,
    ]);
    expect(ids(runtime.transitions({ instance: 'artifact-a' }))).toEqual([
      first.transition.transitionId,
      third.transition.transitionId,
    ]);
    expect(
      ids(
        runtime.transitions({
          definition: refetch,
          instance: 'artifact-a',
          effectStatus: 'verified',
        }),
      ),
    ).toEqual([first.transition.transitionId]);
    expect(
      ids(runtime.transitions({ effectStatus: ['refused', 'unverified'] })),
    ).toEqual([second.transition.transitionId, third.transition.transitionId]);
    expect(
      ids(runtime.transitions({ invocationStatus: 'performed' })),
    ).toHaveLength(3);
    expect(runtime.transitions({ invocationStatus: 'pending' })).toEqual([]);
  });

  it('refuses a malformed query instead of answering an empty list that reads as "none"', () => {
    const { runtime } = verifiable();
    expect(() => runtime.transitions({ effectStatus: 'verfied' as never })).toThrow(
      /effectStatus 'verfied' is not a status/,
    );
    expect(() =>
      runtime.transitions({ invocationStatus: ['performed', 'done' as never] }),
    ).toThrow(/invocationStatus 'done'/);
    expect(() => runtime.transitions({ status: 'verified' } as never)).toThrow(
      /unknown field 'status'/,
    );
    expect(() => runtime.transitions(null as never)).toThrow(/optional query record/);
    expect(() => runtime.transitions({ instance: 7 as never })).toThrow(
      /instance must be the opaque string/,
    );
    expect(() => runtime.transitions({ binding: {} as never })).toThrow(
      /binding must be an ActionBindingRef/,
    );
    expect(() =>
      runtime.transitions({
        definition: { kind: 'action-definition', definitionId: 'panel.refetch-listing' },
      }),
    ).toThrow(/unknown or forged/);
    expect(() => runtime.transitions({ definition: (() => 1) as never })).toThrow(
      /not created by defineAction/,
    );
    const twin = defineAction('panel.refetch-listing', {
      does: 'A second callable with the same id',
      invocation: 'scalar',
      mutate: (range: string) => range,
    });
    expect(() => runtime.transitions({ definition: twin })).toThrow(
      /belongs to another callable/,
    );
  });

  it('answers an unconnected definition with an empty list', () => {
    const runtime = createActionRuntime();
    expect(runtime.transitions({ definition: refetch })).toEqual([]);
  });
});

describe('history: { keep }', () => {
  it('releases the oldest fully settled rows past keep, and never a pending one', async () => {
    const { runtime, a } = verifiable(createActionRuntime({ history: { keep: 2 } }));
    const pending = a.invoke('1d'); // effect never settled
    const settled: { transition: ActionTransitionRef<'panel.refetch-listing'> }[] = [];
    for (const range of ['2d', '3d', '4d']) {
      const invocation = a.invoke(range);
      await invocation.whenInvoked;
      a.settle(invocation.transition, { status: 'verified', evidence: range });
      settled.push(invocation);
    }
    await pending.whenInvoked;
    expect(ids(runtime.transitions())).toEqual([
      pending.transition.transitionId,
      settled[1]!.transition.transitionId,
      settled[2]!.transition.transitionId,
    ]);
    expect(runtime.transitionFor(settled[0]!.transition)).toBeUndefined();
    // The released row is forgotten exactly as forgetTransition would: a
    // settlement for it now names an unknown transition.
    expect(() =>
      a.settle(settled[0]!.transition, { status: 'verified', evidence: 'late' }),
    ).toThrow(/unknown or forged/);
  });

  it('counts a row once both rails close, whichever closes last', async () => {
    const runtime = createActionRuntime({ history: { keep: 0 } });
    let finish!: (value: string) => void;
    const slow = defineAction('panel.slow-listing', {
      does: 'Refetch slowly',
      invocation: 'inputless',
      settle: { writes: ['panel.rows'] },
      mutate: () => new Promise<string>((resolve) => (finish = resolve)),
    });
    const connection = connectAction(runtime, slow, {
      node: 'panel',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    // Effect first, invocation still pending: the row is not yet releasable.
    connection.settle(invocation.transition, { status: 'verified', evidence: 'x' });
    expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe(
      'pending',
    );
    finish('rows');
    await invocation.whenInvoked;
    expect(runtime.transitionFor(invocation.transition)).toBeUndefined();
  });

  it('keeps forgetTransition and the bound consistent', async () => {
    const { runtime, a } = verifiable(createActionRuntime({ history: { keep: 1 } }));
    const first = a.invoke('1d');
    await first.whenInvoked;
    a.settle(first.transition, { status: 'verified', evidence: '1d' });
    expect(runtime.forgetTransition(first.transition)).toBe(true);
    const second = a.invoke('2d');
    await second.whenInvoked;
    a.settle(second.transition, { status: 'verified', evidence: '2d' });
    // One settled row retained; forgetting the first freed its slot.
    expect(ids(runtime.transitions())).toEqual([second.transition.transitionId]);
  });

  it('refuses a history record without a whole, non-negative keep', () => {
    for (const history of [{}, { keep: -1 }, { keep: 1.5 }, { keep: '3' }, null]) {
      expect(() => createActionRuntime({ history: history as never })).toThrow(
        /history needs \{ keep \}/,
      );
    }
  });

  it('property (exhaustive to 6 invocations): retained = every pending row + the newest `keep` settled rows, in invocation order', async () => {
    // Every settle pattern of length 0..6 under every keep 0..4 — the whole
    // small space, not a sample of it.
    for (let keep = 0; keep <= 4; keep += 1) {
      for (let length = 0; length <= 6; length += 1) {
        for (let mask = 0; mask < 2 ** length; mask += 1) {
          const settles = Array.from({ length }, (_, bit) => ((mask >> bit) & 1) === 1);
          const runtime = createActionRuntime({ history: { keep } });
          const connection = connectAction(runtime, refetch, {
            node: 'panel',
            coverage: 'verifiable',
          });
          const rows: { id: string; settled: boolean }[] = [];
          for (const [index, settle] of settles.entries()) {
            const invocation = connection.invoke(String(index));
            await invocation.whenInvoked;
            if (settle) {
              connection.settle(invocation.transition, {
                status: 'verified',
                evidence: index,
              });
            }
            rows.push({ id: invocation.transition.transitionId, settled: settle });
          }
          const settledIds = rows.filter((row) => row.settled).map((row) => row.id);
          const keptSettled = new Set(
            settledIds.slice(Math.max(0, settledIds.length - keep)),
          );
          const expected = rows
            .filter((row) => !row.settled || keptSettled.has(row.id))
            .map((row) => row.id);
          expect(ids(runtime.transitions())).toEqual(expected);
        }
      }
    }
  });
});
