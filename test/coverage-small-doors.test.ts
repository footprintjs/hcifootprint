import { describe, expect, it } from 'vitest';
import {
  composeActionInvocation,
  connectAction,
  createActionRuntime,
  declareKinds,
  declareLifecycle,
  defineAction,
  resolveActionHost,
} from '../src/index.js';

/**
 * The small doors of the action layer, each held to what it promises a
 * caller who gets it wrong: host resolution (host-adapter.ts ·
 * resolveActionHost / composeActionInvocation), the kind catalog
 * (kinds.ts · declareKinds), a lifecycle chart's refusal sentence
 * (lifecycle.ts · declareLifecycle), the progress channel
 * (progress-ledger.ts · createTransitionProgress), the request desk
 * (request.ts · RequestDesk.open), abandonment authority
 * (settlement.ts · snapshotAbandonmentAuthority) and the surface board
 * (surface-board.ts · SurfaceBoard).
 */

describe('resolveActionHost — what an adapter must hand back', () => {
  const props = Object.freeze({});
  const host = Object.freeze({ id: 'host' });

  it('refuses an adapter that is not an object with resolve()', () => {
    for (const adapter of [null, 'adapter', {}]) {
      expect(() =>
        resolveActionHost(adapter as never, props, host),
      ).toThrow(/resolveActionHost\(\) needs an adapter with resolve\(\)/);
    }
  });

  it('refuses a resolved interactive that is a primitive, not an object', () => {
    const adapter = {
      resolve: () => ({ kind: 'resolved' as const, interactive: 'button' }),
    };
    expect(() => resolveActionHost(adapter as never, props, host)).toThrow(
      'hcifootprint: a resolved action host needs one interactive object.',
    );
  });

  it('refuses a supplied valueElement that is not an object', () => {
    for (const valueElement of [null, 'input']) {
      const adapter = {
        resolve: () => ({
          kind: 'resolved' as const,
          interactive: {},
          valueElement,
        }),
      };
      expect(() => resolveActionHost(adapter as never, props, host)).toThrow(
        'hcifootprint: a resolved action host valueElement must be an object when supplied.',
      );
    }
  });
});

describe('composeActionInvocation — the continuation runs the listener once', () => {
  it('refuses a listener that re-enters its own continuation, and the refusal is what the host sees', () => {
    let continuation: (() => unknown) | undefined;
    let listenerCalls = 0;
    const existing = function (): unknown {
      listenerCalls += 1;
      return continuation!();
    };
    const composed = composeActionInvocation(existing, function (proceed) {
      continuation = proceed;
      return proceed();
    });
    expect(() => composed()).toThrow(
      'hcifootprint: an action host listener cannot re-enter its invocation continuation.',
    );
    // The listener ran once; the re-entry never started a second run.
    expect(listenerCalls).toBe(1);
  });
});

describe('declareKinds — a catalog is built from real contributions', () => {
  it('refuses an empty call — an empty catalog governs nothing', () => {
    expect(() => declareKinds()).toThrow(
      /declareKinds\(\) needs at least one contribution/,
    );
  });

  it('refuses a contribution that is not a record, naming its position', () => {
    for (const contribution of [null, 'kinds', [{ docs: 'x' }]]) {
      expect(() =>
        declareKinds({ ok: {} }, contribution as never),
      ).toThrow(
        'hcifootprint: declareKinds() contribution 1 must be a record of kind declarations.',
      );
    }
  });

  it('refuses a blank kind name, naming its contribution', () => {
    expect(() => declareKinds({ '  ': { docs: 'nothing' } })).toThrow(
      'hcifootprint: declareKinds() contribution 0 declares an empty kind name.',
    );
  });
});

describe('declareLifecycle — a refused move says why there is no way on', () => {
  it('names a non-terminal state with no outgoing edge as a dead end, not a terminal', () => {
    const chart = declareLifecycle({
      name: 'intake',
      states: ['open', 'parked', 'closed'],
      terminals: ['closed'],
      edges: [
        { from: 'open', to: 'parked' },
        { from: 'open', to: 'closed' },
      ],
    });
    expect(() => chart.assertMove('parked', 'closed')).toThrow(
      "hcifootprint: lifecycle 'intake' has no move 'parked' → 'closed'. 'parked' is a dead end in this chart.",
    );
    expect(() => chart.assertMove('closed', 'open')).toThrow(
      /'closed' is terminal — it never reopens/,
    );
  });
});

describe('progress — the channel a transition hands out', () => {
  function progressRun() {
    const errors: unknown[] = [];
    let lifecycle:
      | { reportProgress(stage: string, detail?: unknown): void }
      | undefined;
    const action = defineAction('coverage.progress', {
      does: 'Write the queued record',
      invocation: 'scalar',
      settle: { progress: { stages: ['queued', 'written'] } },
      mutate: (_id: string, handed) => {
        lifecycle = handed;
        return new Promise<string>(() => undefined);
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'progress',
      onInvocationError: (error) => {
        errors.push(error);
      },
    });
    const invocation = connection.invoke('record-1');
    return { invocation, lifecycle: lifecycle!, errors };
  }

  it('refuses a subscriber that is not a function', () => {
    const { invocation } = progressRun();
    expect(() =>
      invocation.progress!.subscribe('listener' as never),
    ).toThrow('hcifootprint: progress.subscribe() needs a snapshot listener.');
  });

  it('a spent unsubscribe cannot remove a later subscription of the same listener', () => {
    const { invocation, lifecycle } = progressRun();
    const seen: string[] = [];
    const listener = (snapshot: { observed: readonly { stage: string }[] }) => {
      seen.push(snapshot.observed.map((entry) => entry.stage).join(','));
    };
    const first = invocation.progress!.subscribe(listener);
    first();
    invocation.progress!.subscribe(listener);
    seen.length = 0;
    // The first handle is spent: calling it again must not reach the second.
    first();
    lifecycle.reportProgress('queued');
    expect(seen).toEqual(['queued']);
  });

  it('a detail that cannot be copied is reported, and the stage still lands without it', () => {
    const { invocation, lifecycle, errors } = progressRun();
    const hostile = {
      get position(): number {
        throw new Error('detail getter exploded');
      },
    };
    lifecycle.reportProgress('queued', hostile);
    expect(invocation.progress!.snapshot().observed).toEqual([
      { stage: 'queued' },
    ]);
    expect(errors).toHaveLength(1);
  });

  it('a stage that cannot even be named is reported, never thrown into the handler', () => {
    const { invocation, lifecycle, errors } = progressRun();
    const unnameable = {
      toString(): string {
        throw new Error('no name');
      },
    };
    expect(() => lifecycle.reportProgress(unnameable as never)).not.toThrow();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('no name');
    expect(invocation.progress!.snapshot().observed).toEqual([]);
  });

  it('a subscriber that arrives after the close gets the final snapshot once and is not kept', async () => {
    let lifecycle:
      | { reportProgress(stage: string, detail?: unknown): void }
      | undefined;
    const action = defineAction('coverage.progress-late-subscriber', {
      does: 'Write the record at once',
      invocation: 'scalar',
      settle: { progress: { stages: ['queued'] } },
      mutate: (_id: string, handed) => {
        lifecycle = handed;
        return 'done';
      },
    });
    const connection = connectAction(createActionRuntime(), action, {
      node: 'progress',
    });
    const invocation = connection.invoke('record-1');
    await invocation.whenInvoked;
    const seen: string[] = [];
    const unsubscribe = invocation.progress!.subscribe((snapshot) => {
      seen.push(snapshot.disposition);
    });
    expect(seen).toEqual(['closed']);
    lifecycle!.reportProgress('queued');
    unsubscribe();
    expect(seen).toEqual(['closed']);
  });

  it('a report after the transition closed changes nothing and reports nothing', async () => {
    const errors: unknown[] = [];
    let lifecycle:
      | { reportProgress(stage: string, detail?: unknown): void }
      | undefined;
    const action = defineAction('coverage.progress-closed', {
      does: 'Write the record at once',
      invocation: 'scalar',
      settle: { progress: { stages: ['queued'] } },
      mutate: (_id: string, handed) => {
        lifecycle = handed;
        return 'done';
      },
    });
    const connection = connectAction(createActionRuntime(), action, {
      node: 'progress',
      onInvocationError: (error) => {
        errors.push(error);
      },
    });
    const invocation = connection.invoke('record-1');
    await invocation.whenInvoked;
    const closed = invocation.progress!.snapshot();
    expect(closed.disposition).toBe('closed');
    lifecycle!.reportProgress('queued');
    expect(invocation.progress!.snapshot()).toBe(closed);
    expect(errors).toEqual([]);
  });
});

describe('requestInput — the request desk refuses a question it cannot ask', () => {
  const runtime = () =>
    createActionRuntime({
      kinds: declareKinds({ 'deploy.environment': { docs: 'where it lands' } }),
    });

  it('refuses a missing or blank question', () => {
    for (const input of [
      null,
      { question: '   ', of: 'deploy.environment', from: 'user', offered: ['a'] },
    ]) {
      expect(() => runtime().requestInput(input as never)).toThrow(
        /requestInput\(\) needs a non-empty question/,
      );
    }
  });

  it('refuses a request that does not name the kind it asks for', () => {
    expect(() =>
      runtime().requestInput({
        question: 'Where?',
        of: ' ',
        from: 'user',
        offered: ['staging'],
      }),
    ).toThrow(/requestInput\(\) needs `of`/);
  });

  it('refuses an empty offered list', () => {
    expect(() =>
      runtime().requestInput({
        question: 'Where?',
        of: 'deploy.environment',
        from: 'user',
        offered: [],
      }),
    ).toThrow(/requestInput\(\) needs a non-empty offered list/);
  });

  it('keeps a choice label when one is given and adds no label key when none is', () => {
    const request = runtime().requestInput({
      question: 'Where?',
      of: 'deploy.environment',
      from: 'user',
      offered: [{ value: 'staging', label: 'Staging' }, { value: 'production' }],
    });
    const offered = request.snapshot().offered;
    expect(offered).toEqual([
      { value: 'staging', label: 'Staging' },
      { value: 'production' },
    ]);
    expect('label' in offered[1]!).toBe(false);
  });
});

describe('abandonment authority — each kind needs its own fact', () => {
  async function performed() {
    const action = defineAction('coverage.abandon', {
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
    await invocation.whenInvoked;
    return { runtime, connection, transition: invocation.transition };
  }

  it.each([
    [
      'a cancellation without a reason',
      { kind: 'cancelled' },
      'hcifootprint: cancelled abandonment authority needs a reason.',
    ],
    [
      'a deadline that is not a finite time',
      { kind: 'deadline', deadlineAt: 'soon' },
      'hcifootprint: deadline abandonment authority needs a finite deadlineAt.',
    ],
    [
      'evidence exhaustion without a source list',
      { kind: 'evidence-exhausted', sources: 'the api' },
      'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
    ],
    [
      'evidence exhaustion with an empty source list',
      { kind: 'evidence-exhausted', sources: [] },
      'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
    ],
    [
      'evidence exhaustion naming a blank source',
      { kind: 'evidence-exhausted', sources: ['the api', ' '] },
      'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
    ],
    [
      'an authority of no known kind',
      { kind: 'gave-up' },
      "hcifootprint: invalid abandonment authority 'gave-up'; expected cancelled, deadline, or evidence-exhausted.",
    ],
  ])('refuses %s, and the effect stays unverified', async (_name, authority, message) => {
    const { runtime, connection, transition } = await performed();
    expect(() =>
      connection.settle(transition, {
        status: 'abandoned',
        authority: authority as never,
      }),
    ).toThrow(message);
    expect(runtime.transitionFor(transition)?.effectStatus).toBe('unverified');
  });
});

describe('the surface board — a malformed ask is refused, and gaps sort by kind then channel', () => {
  it('refuses a surface declaration without a surface id and node path', () => {
    const runtime = createActionRuntime();
    for (const declaration of [
      null,
      { surface: ' ', node: 'panel' },
      { surface: 'monitor', node: '' },
    ]) {
      expect(() => runtime.declareSurface(declaration as never)).toThrow(
        'hcifootprint: declareSurface() needs a record with a non-empty surface id and node path.',
      );
    }
  });

  it('refuses a query without a kind', () => {
    const runtime = createActionRuntime();
    for (const query of [{ collects: ' ' }, { shows: 42 }]) {
      expect(() => runtime.surfacesFor(query as never)).toThrow(
        /surfacesFor\(\) needs \{ collects: kind \} or \{ shows: kind \}/,
      );
    }
  });

  it('two gaps of one kind are ordered by channel', () => {
    const runtime = createActionRuntime();
    runtime.surfacesFor({ shows: 'array' });
    runtime.surfacesFor({ collects: 'array' });
    expect(runtime.channelGaps()).toEqual([
      { kind: 'array', channel: 'collects', asks: 1 },
      { kind: 'array', channel: 'shows', asks: 1 },
    ]);
  });
});
