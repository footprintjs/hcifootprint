import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
  type ActionEffectSettlementInput,
  type ActionProgress,
} from '../src/index.js';

function progressOf(invocation: {
  readonly progress?: ActionProgress;
}): ActionProgress {
  if (invocation.progress === undefined) {
    throw new Error(
      'expected this declared-progress invocation to expose progress',
    );
  }
  return invocation.progress;
}

describe('action progress — one transition owns one lifecycle', () => {
  it('replays synchronous progress and closes with declared, observed, and unreported stages', async () => {
    let finish!: () => void;
    const action = defineAction('progress.replay', {
      does: 'Write the queued record',
      invocation: 'scalar',
      settle: {
        progress: { stages: ['queued', 'written'] },
      },
      mutate: (_recordId: string, lifecycle) => {
        if (lifecycle === undefined) {
          throw new Error(
            'the runtime did not supply the transition lifecycle',
          );
        }
        lifecycle.reportProgress('queued', { position: 1 });
        return new Promise<string>((resolve) => {
          finish = () => resolve('done');
        });
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'progress' });

    const invocation = connection.invoke('record-1');
    const progress = progressOf(invocation);
    expect(progress.snapshot()).toEqual({
      disposition: 'open',
      declared: ['queued', 'written'],
      observed: [{ stage: 'queued', detail: { position: 1 } }],
    });
    expect('unreported' in progress.snapshot()).toBe(false);

    const replayed: unknown[] = [];
    const unsubscribe = progress.subscribe((snapshot) => {
      replayed.push(snapshot);
    });
    expect(replayed).toEqual([
      {
        disposition: 'open',
        declared: ['queued', 'written'],
        observed: [{ stage: 'queued', detail: { position: 1 } }],
      },
    ]);

    finish();
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'done',
    });
    expect(progress.snapshot()).toEqual({
      disposition: 'closed',
      declared: ['queued', 'written'],
      observed: [{ stage: 'queued', detail: { position: 1 } }],
      unreported: ['written'],
    });
    expect(replayed.at(-1)).toEqual(progress.snapshot());
    unsubscribe();
  });

  it('reports an undeclared stage as instrumentation without replacing the handler result', async () => {
    const observerErrors: unknown[] = [];
    const action = defineAction('progress.unknown-stage', {
      does: 'Report an application stage',
      invocation: 'scalar',
      settle: {
        progress: { stages: ['queued', 'written'] },
      },
      mutate: (_recordId: string, lifecycle) => {
        if (lifecycle === undefined) {
          throw new Error(
            'the runtime did not supply the transition lifecycle',
          );
        }
        const reportUnchecked = lifecycle.reportProgress as (
          stage: string,
          detail?: unknown,
        ) => void;
        reportUnchecked('undeclared', { shouldNotBecomeObserved: true });
        return 'handler-result';
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'progress',
      onInvocationError(error) {
        observerErrors.push(error);
      },
    });

    const invocation = connection.invoke('record-1');
    const progress = progressOf(invocation);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'handler-result',
    });
    expect(progress.snapshot()).toMatchObject({
      disposition: 'closed',
      declared: ['queued', 'written'],
      observed: [],
      unreported: ['queued', 'written'],
    });
    expect(observerErrors).toHaveLength(1);
    expect(observerErrors[0]).toMatchObject({
      code: 'ACTION_PROGRESS_STAGE_UNKNOWN',
      stage: 'undeclared',
    });
  });

  it('isolates a throwing progress listener and continues delivering progress', async () => {
    let reportWritten!: () => void;
    let finish!: () => void;
    const listenerFailure = new Error('listener failed');
    const observerErrors: unknown[] = [];
    const action = defineAction('progress.listener-failure', {
      does: 'Publish progress despite one broken listener',
      invocation: 'scalar',
      settle: {
        progress: { stages: ['queued', 'written'] },
      },
      mutate: (_recordId: string, lifecycle) => {
        if (lifecycle === undefined) {
          throw new Error(
            'the runtime did not supply the transition lifecycle',
          );
        }
        lifecycle.reportProgress('queued');
        reportWritten = () => lifecycle.reportProgress('written');
        return new Promise<string>((resolve) => {
          finish = () => resolve('handler-result');
        });
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'progress',
      onInvocationError(error) {
        observerErrors.push(error);
      },
    });

    const invocation = connection.invoke('record-1');
    const progress = progressOf(invocation);
    expect(() =>
      progress.subscribe(() => {
        throw listenerFailure;
      }),
    ).not.toThrow();
    const delivered: unknown[] = [];
    progress.subscribe((snapshot) => {
      delivered.push(snapshot);
    });

    reportWritten();
    finish();
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'handler-result',
    });
    expect(observerErrors).toContain(listenerFailure);
    expect(delivered.at(-1)).toEqual({
      disposition: 'closed',
      declared: ['queued', 'written'],
      observed: [{ stage: 'queued' }, { stage: 'written' }],
      unreported: [],
    });
  });

  it('commits terminal invocation facts before publishing closed progress', async () => {
    const pending = new Map<
      string,
      {
        resolve(value: string): void;
        reject(error: unknown): void;
      }
    >();
    const failure = new Error('mutation failed');
    const action = defineAction('progress.terminal-publication', {
      does: 'Publish terminal progress atomically',
      invocation: 'scalar',
      settle: {
        progress: { stages: ['started'] },
      },
      mutate: (key: string, lifecycle) => {
        if (lifecycle === undefined) {
          throw new Error(
            'the runtime did not supply the transition lifecycle',
          );
        }
        lifecycle.reportProgress('started');
        return new Promise<string>((resolve, reject) => {
          pending.set(key, { resolve, reject });
        });
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'progress' });
    const performed = connection.invoke('performed');
    const failed = connection.invoke('failed');
    const seenAtClose: unknown[] = [];

    progressOf(performed).subscribe((snapshot) => {
      if (snapshot.disposition === 'closed') {
        seenAtClose.push(runtime.transitionFor(performed.transition));
      }
    });
    progressOf(failed).subscribe((snapshot) => {
      if (snapshot.disposition === 'closed') {
        seenAtClose.push(runtime.transitionFor(failed.transition));
      }
    });

    pending.get('performed')!.resolve('done');
    await expect(performed.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'done',
    });
    pending.get('failed')!.reject(failure);
    await expect(failed.whenInvoked).resolves.toMatchObject({
      status: 'failed',
      error: failure,
    });

    expect(seenAtClose).toEqual([
      expect.objectContaining({
        invocationStatus: 'performed',
        produced: 'done',
      }),
      expect.objectContaining({
        invocationStatus: 'failed',
        error: failure,
      }),
    ]);
  });

  it('serializes reentrant progress reports for every subscriber', async () => {
    let report!: (stage: 'first' | 'second') => void;
    let finish!: () => void;
    const action = defineAction('progress.reentrant-publication', {
      does: 'Publish progress in one order for every subscriber',
      invocation: 'inputless',
      settle: {
        progress: { stages: ['first', 'second'] },
      },
      mutate: (lifecycle) => {
        if (lifecycle === undefined) {
          throw new Error(
            'the runtime did not supply the transition lifecycle',
          );
        }
        report = (stage) => lifecycle.reportProgress(stage);
        return new Promise<string>((resolve) => {
          finish = () => resolve('done');
        });
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'progress' });
    const invocation = connection.invoke();
    const progress = progressOf(invocation);
    let reportedSecond = false;
    const secondSubscriber: string[][] = [];

    progress.subscribe((snapshot) => {
      if (
        !reportedSecond &&
        snapshot.disposition === 'open' &&
        snapshot.observed.at(-1)?.stage === 'first'
      ) {
        reportedSecond = true;
        report('second');
      }
    });
    progress.subscribe((snapshot) => {
      secondSubscriber.push(snapshot.observed.map((entry) => entry.stage));
    });

    report('first');
    expect(secondSubscriber).toEqual([[], ['first'], ['first', 'second']]);

    finish();
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'done',
    });
  });

  it('marks a preflight schema refusal not-started rather than all-unreported', async () => {
    let calls = 0;
    const action = defineAction('progress.preflight-refusal', {
      does: 'Validate before starting progress',
      invocation: 'scalar',
      inputSchema: {
        safeParse: () => ({ success: false as const, error: 'invalid' }),
      },
      settle: {
        progress: { stages: ['queued', 'written'], required: true },
      },
      mutate: (_recordId: string, _lifecycle) => {
        calls += 1;
        return 'must-not-run';
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, { node: 'progress' });
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected an open offer');

    const invocation = runtime.forPrincipal('system').invoke(offer, 'invalid');
    const progress = progressOf(invocation);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'refused',
    });
    expect(calls).toBe(0);
    expect(progress.snapshot()).toEqual({
      disposition: 'not-started',
      declared: ['queued', 'written'],
      observed: [],
    });
    expect('unreported' in progress.snapshot()).toBe(false);
    await expect(invocation.whenEffectSettled).resolves.toMatchObject({
      status: 'refused',
    });
  });

  it('records unmet required progress without replacing a successful handler result', async () => {
    const action = defineAction('progress.required', {
      does: 'Complete an action with required progress',
      invocation: 'scalar',
      settle: {
        progress: { stages: ['queued', 'written'], required: true },
      },
      mutate: (_recordId: string, _lifecycle) => 'handler-result',
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'progress' });

    const invocation = connection.invoke('record-1');
    const progress = progressOf(invocation);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'handler-result',
    });
    expect(progress.snapshot()).toEqual({
      disposition: 'closed',
      declared: ['queued', 'written'],
      observed: [],
      unreported: ['queued', 'written'],
      integrity: 'unmet',
    });
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'performed',
      progress: {
        disposition: 'closed',
        declared: ['queued', 'written'],
        observed: [],
        unreported: ['queued', 'written'],
        integrity: 'unmet',
      },
    });
  });
});

describe('action abandonment — explicit authority closes the effect rail', () => {
  const authorities = [
    { kind: 'cancelled', reason: 'operator cancelled' },
    { kind: 'deadline', deadlineAt: Date.UTC(2000, 0, 1) },
    {
      kind: 'evidence-exhausted',
      sources: ['application-store', 'host-observer'],
    },
  ] as const;

  it.each(authorities)(
    'accepts the explicit $kind abandonment authority',
    async (authority) => {
      const action = defineAction(`abandonment.${authority.kind}`, {
        does: 'Open an abandonable transition',
        invocation: 'inputless',
        mutate: () => 'handler-result',
      });
      const runtime = createActionRuntime();
      const connection = connectAction(runtime, action, {
        node: 'abandonment',
        coverage: 'verifiable',
      });
      const invocation = connection.invoke();
      await expect(invocation.whenInvoked).resolves.toMatchObject({
        status: 'performed',
      });

      const settlement = connection.settle(invocation.transition, {
        status: 'abandoned',
        authority,
      });
      expect(settlement).toEqual({
        status: 'abandoned',
        transition: invocation.transition,
        authority,
      });
      await expect(invocation.whenEffectSettled).resolves.toBe(settlement);
      expect(runtime.transitionFor(invocation.transition)).toMatchObject({
        effectStatus: 'abandoned',
        authority,
      });
      expect(runtime.forgetTransition(invocation.transition)).toBe(true);
    },
  );

  it('rejects a future deadline without consuming the effect terminal', async () => {
    const action = defineAction('abandonment.future-deadline', {
      does: 'Keep waiting until the declared deadline elapses',
      invocation: 'inputless',
      settle: { writes: ['abandonment.persisted'] },
      mutate: () => 'handler-result',
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'abandonment',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;

    expect(() =>
      connection.settle(invocation.transition, {
        status: 'abandoned',
        authority: {
          kind: 'deadline',
          deadlineAt: Date.now() + 60_000,
        },
      }),
    ).toThrow(/deadline.*before.*elapsed/i);
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'unverified',
    });

    const verified = connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { persisted: true },
    });
    await expect(invocation.whenEffectSettled).resolves.toBe(verified);
  });

  it('captures evidence sources once without consulting a custom iterator', async () => {
    const action = defineAction('abandonment.sources-snapshot', {
      does: 'Retain the exact exhausted evidence sources',
      invocation: 'inputless',
      mutate: () => 'handler-result',
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'abandonment',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;
    const backing = ['application-store', 'host-observer'];
    let lengthReads = 0;
    let iteratorReads = 0;
    const elementReads: PropertyKey[] = [];
    const sources = new Proxy(backing, {
      get(target, property, receiver) {
        if (property === 'length') lengthReads += 1;
        if (property === '0' || property === '1') elementReads.push(property);
        if (property === Symbol.iterator) {
          iteratorReads += 1;
          return function* forgedIterator(): Generator<string> {
            yield 'forged-after-validation';
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const settlement = connection.settle(invocation.transition, {
      status: 'abandoned',
      authority: { kind: 'evidence-exhausted', sources },
    });
    if (
      settlement.status !== 'abandoned' ||
      settlement.authority.kind !== 'evidence-exhausted'
    ) {
      throw new Error('expected evidence-exhausted abandonment');
    }

    expect(settlement.authority.sources).toEqual([
      'application-store',
      'host-observer',
    ]);
    expect(lengthReads).toBe(1);
    expect(elementReads).toEqual(['0', '1']);
    expect(iteratorReads).toBe(0);
    backing[0] = 'mutated-after-settlement';
    expect(settlement.authority.sources[0]).toBe('application-store');
  });

  it('keeps the first terminal when verified evidence arrives after abandonment', async () => {
    const action = defineAction('abandonment.first-terminal', {
      does: 'Keep one effect answer',
      invocation: 'inputless',
      settle: { writes: ['abandonment.written'] },
      mutate: () => 'handler-result',
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'abandonment',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;

    const abandoned = connection.settle(invocation.transition, {
      status: 'abandoned',
      authority: { kind: 'cancelled', reason: 'operator cancelled' },
    });
    const lateEvidence = connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { written: true },
    });

    expect(lateEvidence).toBe(abandoned);
    expect(await invocation.whenEffectSettled).toBe(abandoned);
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'abandoned',
      authority: { kind: 'cancelled', reason: 'operator cancelled' },
    });
  });

  it('does not treat attachment cleanup or disconnect as abandonment', async () => {
    let finish!: () => void;
    const action = defineAction('abandonment.disconnect', {
      does: 'Outlive the live binding',
      invocation: 'inputless',
      mutate: () =>
        new Promise<string>((resolve) => {
          finish = () => resolve('handler-result');
        }),
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'abandonment',
      coverage: 'verifiable',
    });
    const attachment = connection.attach({
      interactive: {},
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();

    attachment.detach();
    connection.disconnect();
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'unverified',
    });
    let effectDelivered = false;
    void invocation.whenEffectSettled.then(() => {
      effectDelivered = true;
    });
    await Promise.resolve();
    expect(effectDelivered).toBe(false);

    finish();
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'handler-result',
    });
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'unverified',
    });

    const settled = connection.settle(invocation.transition, {
      status: 'abandoned',
      authority: {
        kind: 'evidence-exhausted',
        sources: ['application-store', 'host-observer'],
      },
    });
    await expect(invocation.whenEffectSettled).resolves.toBe(settled);
  });

  it('requires an explicit authority for abandonment', async () => {
    const action = defineAction('abandonment.authority-required', {
      does: 'Require abandonment authority',
      invocation: 'inputless',
      mutate: () => 'handler-result',
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'abandonment',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;

    expect(() =>
      connection.settle(invocation.transition, {
        status: 'abandoned',
      } as unknown as ActionEffectSettlementInput),
    ).toThrow(/abandon.*authority/i);
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'unverified',
    });
  });
});
