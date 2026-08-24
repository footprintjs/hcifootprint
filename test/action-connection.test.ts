import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  connectAction,
  createActionBindingRuntime,
  defineAction,
  type ActionBindingRuntime,
  type ActionConnection,
  type ActionInvocation,
  type ActionOffer,
} from '../src/index.js';

function invokeOffer(
  runtime: ActionBindingRuntime,
  offer: ActionOffer,
  ...input: [] | [unknown]
): ActionInvocation<unknown> {
  return Reflect.apply(runtime.invoke, runtime, [offer, ...input]) as ActionInvocation<unknown>;
}

describe('connectAction — one definition, many exact live bindings', () => {
  it('captures each caller-owned connection option exactly once', async () => {
    const reads = new Map<string, number>();
    const changing = (name: string, first: unknown, later: unknown) => ({
      enumerable: true,
      get() {
        const count = (reads.get(name) ?? 0) + 1;
        reads.set(name, count);
        return count === 1 ? first : later;
      },
    });
    let observed = 0;
    const input = () => 'captured-input';
    const enabled = () => true;
    const busy = () => 'captured-busy';
    const locator = { kind: 'programmatic' as const, provider: 'captured' };
    const options = Object.defineProperties({}, {
      node: changing('node', 'captured-node', 42),
      instance: changing('instance', 'captured-instance', 42),
      input: changing('input', input, 42),
      enabled: changing('enabled', enabled, 42),
      busy: changing('busy', busy, 42),
      coverage: changing('coverage', 'verifiable', 'invalid'),
      locators: changing('locators', [locator], 42),
      humanReporting: changing('humanReporting', 'connection', 'invalid'),
      onInvocation: changing(
        'onInvocation',
        () => {
          observed += 1;
        },
        42,
      ),
      onInvocationError: changing('onInvocationError', () => undefined, 42),
    });
    const action = defineAction(
      'options.snapshot',
      { does: 'Use one options snapshot', invocation: 'scalar' },
      (value: string) => value,
    );
    const runtime = createActionBindingRuntime();
    const connection = Reflect.apply(connectAction, undefined, [
      runtime,
      action,
      options,
    ]) as ActionConnection<
      (value: string) => string,
      'options.snapshot',
      true,
      'scalar'
    >;

    expect(Object.fromEntries(reads)).toEqual({
      node: 1,
      instance: 1,
      input: 1,
      enabled: 1,
      busy: 1,
      coverage: 1,
      locators: 1,
      humanReporting: 1,
      onInvocation: 1,
      onInvocationError: 1,
    });
    expect(connection.binding).toMatchObject({
      node: 'captured-node',
      instance: 'captured-instance',
    });
    expect(runtime.bindingFor(connection.binding)).toMatchObject({
      enabled: true,
      busy: 'captured-busy',
      coverage: 'verifiable',
      locators: [locator],
      humanReporting: 'connection',
    });
    expect(await connection.invoke().whenInvoked).toMatchObject({
      status: 'performed',
      produced: 'captured-input',
    });
    expect(observed).toBe(1);
    expect([...reads.values()].every((count) => count === 1)).toBe(true);
  });

  it('keeps simultaneous instances independently addressable without string recovery', async () => {
    const calls: string[] = [];
    const archive = defineAction(
      'orders.archive',
      {
        does: 'Archive this order',
        invocation: 'scalar',
        writes: ['orders.openIds'],
      },
      ({ orderId }: { orderId: string }) => {
        calls.push(orderId);
        return { archived: orderId };
      },
    );
    const runtime = createActionBindingRuntime();
    const opaque = 'customer[west].order/#57|retry';
    const first = connectAction(runtime, archive, {
      node: 'orders.rows',
      instance: opaque,
      input: () => ({ orderId: opaque }),
    });
    const second = connectAction(runtime, archive, {
      node: 'orders.rows',
      instance: 'o-60',
      input: () => ({ orderId: 'o-60' }),
    });

    expect(first.binding.bindingId).not.toBe(second.binding.bindingId);
    expect(first.binding.instance).toBe(opaque);
    expect(runtime.bindings('orders.archive')).toHaveLength(2);

    const firstResult = await first.invoke().whenInvoked;
    const secondResult = await second.invoke().whenInvoked;
    expect(firstResult).toMatchObject({
      status: 'performed',
      produced: { archived: opaque },
    });
    expect(secondResult).toMatchObject({
      status: 'performed',
      produced: { archived: 'o-60' },
    });
    expect(calls).toEqual([opaque, 'o-60']);

    first.disconnect();
    first.disconnect();
    expect(runtime.bindings('orders.archive')).toHaveLength(1);
    expect(runtime.bindings('orders.archive')[0]?.ref).toBe(second.binding);
    second.update({ input: () => ({ orderId: 'o-61' }) });
    await second.invoke().whenInvoked;
    expect(calls.at(-1)).toBe('o-61');
  });

  it('reads the newest committed input lazily without replacing binding identity', async () => {
    const seen: string[] = [];
    const send = defineAction(
      'compose.send',
      { does: 'Send the message', invocation: 'scalar' },
      ({ message }: { message: string }) => seen.push(message),
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, send, {
      node: 'compose',
      input: () => ({ message: 'first' }),
    });
    const identity = connection.binding;

    await connection.invoke().whenInvoked;
    connection.update({ input: () => ({ message: 'second' }) });
    await connection.invoke().whenInvoked;

    expect(connection.binding).toBe(identity);
    expect(seen).toEqual(['first', 'second']);
  });

  it('keeps invocation completion and authoritative effect settlement on separate rails', async () => {
    const save = defineAction(
      'draft.save',
      {
        does: 'Save the draft',
        invocation: 'inputless',
        writes: ['draft.saved'],
      },
      () => 'handler-complete',
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, save, {
      node: 'draft',
      coverage: 'verifiable',
    });

    const invocation = connection.invoke();
    const invoked = await invocation.whenInvoked;
    expect(invoked.status).toBe('performed');
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'unverified',
    });

    let effectDelivered = false;
    void invocation.whenEffectSettled.then(() => {
      effectDelivered = true;
    });
    await Promise.resolve();
    expect(effectDelivered).toBe(false);

    const settled = connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { source: 'store', keys: ['draft.saved'] },
    });
    expect(settled.status).toBe('verified');
    expect(await invocation.whenEffectSettled).toEqual(settled);
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'verified',
    });
  });

  it('records invocation failure without laundering it into an effect verdict', async () => {
    const error = new Error('API unavailable');
    const fail = defineAction(
      'draft.fail',
      { does: 'Fail to save', invocation: 'inputless' },
      () => {
        throw error;
      },
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, fail, { node: 'draft' });

    const invocation = connection.invoke();
    expect(await invocation.whenInvoked).toEqual({
      status: 'failed',
      transition: invocation.transition,
      error,
    });
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'failed',
      effectStatus: 'unverified',
      error,
    });
  });

  it('can observe the authoritative effect before an async invocation finishes', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const action = defineAction(
      'draft.publish',
      { does: 'Publish the draft', invocation: 'inputless' },
      () => pending,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'draft',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();

    const verified = connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { source: 'subscription' },
    });
    expect(await invocation.whenEffectSettled).toBe(verified);
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'pending',
      effectStatus: 'verified',
    });

    release();
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(
      connection.settle(invocation.transition, {
        status: 'refused',
        reason: 'late contradictory report',
      }),
    ).toBe(verified);
  });

  it('offers only executable bindings and joins an invocation to the exact offer', async () => {
    const action = defineAction(
      'orders.archive',
      { does: 'Archive this order', invocation: 'inputless' },
      () => 'done',
    );
    const runtime = createActionBindingRuntime();
    const identityOnly = connectAction(runtime, action, {
      node: 'orders.rows',
      instance: 'identity-only',
      coverage: 'identity',
    });
    const executable = connectAction(runtime, action, {
      node: 'orders.rows',
      instance: 'executable',
      coverage: 'executable',
      locators: [
        {
          kind: 'element',
          locator: { role: 'button', name: 'Archive executable' },
          actuation: 'click',
        },
      ],
    });

    const offers = runtime.available(executable.definition);
    expect(Object.isFrozen(offers)).toBe(true);
    expect(offers).toHaveLength(1);
    expect(offers[0]?.ref.binding).toBe(executable.binding);
    expect(offers[0]?.locators).toEqual([
      {
        kind: 'element',
        locator: { role: 'button', name: 'Archive executable' },
        actuation: 'click',
      },
    ]);
    expect(Object.isFrozen(offers[0]?.ref)).toBe(true);
    expect(() => identityOnly.invoke()).toThrow(/not executable/);

    const invocation = invokeOffer(runtime, offers[0]!);
    await invocation.whenInvoked;
    expect(invocation.transition.offer).toBe(offers[0]?.ref);
  });

  it('distinguishes absence from disabledness', () => {
    const action = defineAction(
      'orders.archive',
      { does: 'Archive', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const disabled = connectAction(runtime, action, {
      node: 'orders',
      enabled: () => false,
    });

    expect(runtime.bindingFor(disabled.binding)).toMatchObject({
      present: true,
      enabled: false,
    });
    expect(runtime.available()).toEqual([]);
    expect(() => disabled.invoke()).toThrow(/disabled/);

    disabled.disconnect();
    expect(runtime.bindingFor(disabled.binding)).toBeUndefined();
  });

  it('uses token-owned attachments and projects locators from the surviving binding', () => {
    const action = defineAction(
      'orders.archive',
      { does: 'Archive', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, { node: 'orders' });
    const first = connection.attach({
      interactive: {},
      coverage: 'identity',
      humanReporting: 'sensor',
      locators: [
        { kind: 'element', locator: { role: 'button', name: 'Old' } },
      ],
    });
    const second = connection.attach({
      interactive: {},
      coverage: 'executable',
      humanReporting: 'connection',
      locators: [
        { kind: 'element', locator: { role: 'button', name: 'Current' } },
      ],
    });

    first.detach();
    first.detach();
    expect(runtime.bindingFor(connection.binding)).toMatchObject({
      attached: true,
      coverage: 'executable',
      locators: [
        { kind: 'element', locator: { role: 'button', name: 'Current' } },
      ],
      humanReporting: 'connection',
    });

    second.detach();
    expect(runtime.bindingFor(connection.binding)).toMatchObject({
      attached: false,
    });
  });

  it('disconnect releases the live binding but in-flight immutable refs remain settleable', async () => {
    let release!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const action = defineAction(
      'jobs.run',
      { does: 'Run the job', invocation: 'inputless' },
      () => pending,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'jobs',
      coverage: 'verifiable',
    });

    const invocation = connection.invoke();
    connection.disconnect();
    expect(runtime.bindingFor(connection.binding)).toBeUndefined();
    release('complete');
    expect(await invocation.whenInvoked).toMatchObject({
      status: 'performed',
      produced: 'complete',
    });
    expect(
      connection.settle(invocation.transition, {
        status: 'verified',
        evidence: { source: 'job-store' },
      }).status,
    ).toBe('verified');
    expect(runtime.transitionFor(invocation.transition)).not.toHaveProperty(
      'interactive',
    );
  });

  it('reuses offers for unchanged facts and rejects every stale revision', async () => {
    const seen: string[] = [];
    const action = defineAction(
      'orders.archive',
      { does: 'Archive the order', invocation: 'scalar' },
      ({ id }: { id: string }) => seen.push(id),
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'orders',
      input: () => ({ id: 'first' }),
    });

    const first = runtime.available(connection.definition)[0]!;
    expect(runtime.available(connection.definition)[0]).toBe(first);

    connection.update({ input: () => ({ id: 'second' }) });
    expect(() => invokeOffer(runtime, first)).toThrow(/stale|foreign|forged/);
    const second = runtime.available(connection.definition)[0]!;
    expect(second.ref).not.toBe(first.ref);
    expect(second.ref.revision).toBeGreaterThan(first.ref.revision);

    const attached = connection.attach({
      interactive: {},
      coverage: 'executable',
    });
    expect(() => invokeOffer(runtime, second)).toThrow(/stale|foreign|forged/);
    const third = runtime.available(connection.definition)[0]!;
    attached.detach();
    expect(() => invokeOffer(runtime, third)).toThrow(/stale|foreign|forged/);

    const current = runtime.available(connection.definition)[0]!;
    await invokeOffer(runtime, current).whenInvoked;
    expect(seen).toEqual(['second']);
    connection.disconnect();
    expect(runtime.available(connection.definition)).toEqual([]);
    expect(() => invokeOffer(runtime, current)).toThrow(/stale|foreign|forged/);
  });

  it('fails closed on invalid coverage at connect, update, and attach', () => {
    let calls = 0;
    const action = defineAction(
      'coverage.run',
      { does: 'Run', invocation: 'inputless' },
      () => {
        calls += 1;
      },
    );
    const runtime = createActionBindingRuntime();

    expect(() =>
      connectAction(runtime, action, {
        node: 'coverage',
        coverage: 'bogus' as never,
      }),
    ).toThrow(/invalid coverage/);
    expect(runtime.bindings(actionDefinitionOf(action)!.ref)).toEqual([]);

    const connection = connectAction(runtime, action, { node: 'coverage' });
    expect(() =>
      connection.update({ coverage: 'bogus' as never }),
    ).toThrow(/invalid coverage/);
    expect(() =>
      connection.attach({ interactive: {}, coverage: 'bogus' as never }),
    ).toThrow(/invalid coverage/);
    expect(calls).toBe(0);
  });

  it('requires explicit disclosure mode for contracts it cannot enforce', () => {
    const restricted = defineAction(
      'funds.transfer',
      {
        does: 'Transfer the balance',
        invocation: 'inputless',
        confirm: true,
        principalPolicy: {
          mayInvoke: ['human'],
          requiresHumanApproval: true,
        },
      },
      () => 'transferred',
    );

    const strict = createActionBindingRuntime();
    expect(strict.contractActivation).toBe('require-active');
    expect(() =>
      connectAction(strict, restricted, { node: 'funds' }),
    ).toThrow(/cannot activate/);
    expect(strict.bindings(actionDefinitionOf(restricted)!.ref)).toEqual([]);

    const disclosure = createActionBindingRuntime({
      contractActivation: 'disclosure',
    });
    expect(disclosure.contractActivation).toBe('disclosure');
    expect(() =>
      connectAction(disclosure, restricted, { node: 'funds' }),
    ).not.toThrow();

    const descriptive = defineAction(
      'funds.choose',
      {
        does: 'Choose the transfer',
        invocation: 'inputless',
        principalPolicy: { decisionOwner: 'human' },
        freshness: { readChanges: 'disclose' },
      },
      () => undefined,
    );
    expect(() =>
      connectAction(strict, descriptive, { node: 'funds' }),
    ).not.toThrow();
  });

  it('enforces inputSchema independently from the live input reader', () => {
    const action = defineAction(
      'search.run',
      {
        does: 'Search the catalogue',
        invocation: 'scalar',
        inputSchema: {
          safeParse: (value: unknown) => ({
            success:
              typeof value === 'object' &&
              value !== null &&
              typeof (value as { query?: unknown }).query === 'string',
          }),
        },
      },
      (input: { query: string }) => input.query,
    );
    const strict = createActionBindingRuntime();
    expect(() =>
      connectAction(strict, action, {
        node: 'search',
        input: () => ({ query: 'boots' }),
      }),
    ).not.toThrow();

    const disclosure = createActionBindingRuntime({
      contractActivation: 'disclosure',
    });
    expect(() =>
      connectAction(disclosure, action, {
        node: 'search',
        input: () => ({ query: 'boots' }),
      }),
    ).not.toThrow();
  });

  it('validates and snapshots settlement evidence before resolving the effect rail', async () => {
    const action = defineAction(
      'jobs.finish',
      { does: 'Finish the job', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'jobs',
      coverage: 'verifiable',
    });

    const invalid = connection.invoke();
    expect(() =>
      connection.settle(invalid.transition, {
        status: 'unknown',
      } as never),
    ).toThrow(/invalid effect settlement status/);
    expect(() =>
      connection.settle(invalid.transition, {
        status: 'verified',
        evidence: undefined,
      }),
    ).toThrow(/needs evidence/);
    expect(() =>
      connection.settle(invalid.transition, {
        status: 'refused',
        reason: undefined,
      }),
    ).toThrow(/needs a reason/);

    const evidence = { source: 'store', details: { ids: ['job-1'] } };
    const settled = connection.settle(invalid.transition, {
      status: 'verified',
      evidence,
    });
    evidence.source = 'mutated';
    evidence.details.ids.push('job-2');
    expect(settled).toMatchObject({
      status: 'verified',
      evidence: { source: 'store', details: { ids: ['job-1'] } },
    });
    expect(settled.status).toBe('verified');
    if (settled.status === 'verified') {
      expect(Object.isFrozen(settled.evidence)).toBe(true);
    }
    expect(await invalid.whenEffectSettled).toBe(settled);
  });

  it('preserves an own __proto__ evidence key without surfacing inherited claims', () => {
    const action = defineAction(
      'effect.prototype-key',
      { does: 'Snapshot a prototype-named evidence field', invocation: 'inputless' },
      () => undefined,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'effect',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    const evidence = JSON.parse(
      '{"__proto__":{"verified":true}}',
    ) as Record<string, unknown>;

    const settled = connection.settle(invocation.transition, {
      status: 'verified',
      evidence,
    });
    expect(settled.status).toBe('verified');
    if (settled.status !== 'verified') throw new Error('expected verified evidence');
    const snapshot = settled.evidence as Record<string, unknown>;
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    expect(Object.hasOwn(snapshot, '__proto__')).toBe(true);
    expect(snapshot['__proto__']).toEqual({ verified: true });
    expect(snapshot['verified']).toBeUndefined();
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('retains canonical definition identity for the whole runtime generation', () => {
    const first = defineAction(
      'shared.run',
      { does: 'Run', invocation: 'inputless' },
      () => 'first',
    );
    const second = defineAction(
      'shared.run',
      { does: 'Run', invocation: 'inputless' },
      () => 'second',
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, first, { node: 'shared' });
    connection.disconnect();

    expect(() =>
      connectAction(runtime, second, { node: 'shared' }),
    ).toThrow(/already belongs to another callable/);
  });

  it('preserves zero-argument and explicit-undefined call arity without sentinels', async () => {
    const arities: number[] = [];
    const readZeroArity: () => void = function () {
      arities.push(arguments.length);
    };
    const zero = defineAction(
      'arity.zero',
      { does: 'Read arity', invocation: 'inputless' },
      readZeroArity,
    );
    const runtime = createActionBindingRuntime();
    const zeroConnection = connectAction(runtime, zero, { node: 'arity' });
    const offer = runtime.available(zeroConnection.definition)[0]!;
    await zeroConnection.invoke().whenInvoked;
    await invokeOffer(runtime, offer).whenInvoked;
    expect(arities).toEqual([0, 0]);

    const received: Array<{ readonly arity: number; readonly value?: string }> = [];
    const readOptionalArity: (value?: string) => void = function (value?: string) {
      received.push({
        arity: arguments.length,
        ...(value !== undefined ? { value } : {}),
      });
    };
    const optional = defineAction(
      'arity.optional',
      {
        does: 'Read an optional input',
        invocation: 'scalar',
        inputSchema: { safeParse: () => ({ success: true as const }) },
      },
      readOptionalArity,
    );
    const optionalWithReader = connectAction(runtime, optional, {
      node: 'arity',
      input: () => 'reader',
    });
    await optionalWithReader.invoke().whenInvoked;
    const optionalConnection = connectAction(runtime, optional, {
      node: 'arity-open',
    });
    await optionalConnection.invoke(undefined).whenInvoked;
    const optionalOffer = runtime
      .available(optionalConnection.definition)
      .find((candidate) => candidate.ref.binding === optionalConnection.binding)!;
    await invokeOffer(runtime, optionalOffer, undefined).whenInvoked;
    expect(received).toEqual([
      { arity: 1, value: 'reader' },
      { arity: 1 },
      { arity: 1 },
    ]);
  });

  it('can explicitly release fully settled transition history', async () => {
    const action = defineAction(
      'history.run',
      { does: 'Run', invocation: 'inputless' },
      () => 'done',
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'history',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    expect(() => runtime.forgetTransition(invocation.transition)).toThrow(
      /still pending/,
    );
    await invocation.whenInvoked;
    connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { source: 'test' },
    });
    expect(runtime.forgetTransition(invocation.transition)).toBe(true);
    expect(runtime.transitionFor(invocation.transition)).toBeUndefined();
    expect(runtime.forgetTransition(invocation.transition)).toBe(false);
  });

  it('keeps strict contract activation immutable at runtime', () => {
    const restricted = defineAction(
      'policy.delete',
      { does: 'Delete the record', invocation: 'inputless', confirm: true },
      () => undefined,
    );
    const runtime = createActionBindingRuntime();

    expect(
      Reflect.set(
        runtime as unknown as Record<string, unknown>,
        'contractActivation',
        'disclosure',
      ),
    ).toBe(false);
    expect(() =>
      Object.defineProperty(runtime, 'contractActivation', {
        configurable: true,
        value: 'disclosure',
      }),
    ).toThrow(TypeError);
    expect(
      Reflect.deleteProperty(
        runtime as unknown as Record<string, unknown>,
        'contractActivation',
      ),
    ).toBe(false);
    expect(runtime.contractActivation).toBe('require-active');
    expect(() =>
      connectAction(runtime, restricted, { node: 'policy' }),
    ).toThrow(/cannot activate/);
  });

  it('requires verifiable coverage before accepting verified evidence', async () => {
    const action = defineAction(
      'effect.run',
      { does: 'Run the effect', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'effect',
      coverage: 'executable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;

    expect(() =>
      connection.settle(invocation.transition, {
        status: 'verified',
        evidence: { source: 'guess' },
      }),
    ).toThrow(/cannot be verified from executable coverage/);
    const refused = connection.settle(invocation.transition, {
      status: 'refused',
      reason: 'no authoritative observer',
    });
    expect(refused.status).toBe('refused');
  });

  it('claims settlement before reading getters and snapshots each branch exactly once', () => {
    const action = defineAction(
      'effect.snapshot',
      { does: 'Snapshot evidence', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'effect',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    let statusReads = 0;
    let evidenceReads = 0;
    let reentrant: unknown;
    const evidence = Object.defineProperty({}, 'source', {
      enumerable: true,
      get() {
        try {
          connection.settle(invocation.transition, {
            status: 'refused',
            reason: 'reentrant answer',
          });
        } catch (error) {
          reentrant = error;
        }
        return 'store';
      },
    });
    const settlement = {
      get status() {
        statusReads += 1;
        return statusReads === 1 ? 'verified' : 'refused';
      },
      get evidence() {
        evidenceReads += 1;
        return evidence;
      },
    } as never;

    const settled = connection.settle(invocation.transition, settlement);
    expect(settled).toMatchObject({
      status: 'verified',
      evidence: { source: 'store' },
    });
    expect(statusReads).toBe(1);
    expect(evidenceReads).toBe(1);
    expect(reentrant).toBeInstanceOf(Error);
    expect((reentrant as Error).message).toMatch(/already being settled/);
  });

  it('releases a failed settlement claim so the transition remains settleable', () => {
    const failure = new Error('evidence getter failed');
    const action = defineAction(
      'effect.retry',
      { does: 'Retry evidence', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'effect',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();

    expect(() =>
      connection.settle(
        invocation.transition,
        {
          status: 'verified',
          get evidence(): never {
            throw failure;
          },
        },
      ),
    ).toThrow(failure);
    expect(
      connection.settle(invocation.transition, {
        status: 'refused',
        reason: 'observer unavailable',
      }).status,
    ).toBe('refused');
  });

  it('invalidates an offer when disabledness is observed before returning true again', () => {
    let enabled = true;
    const action = defineAction(
      'offer.run',
      { does: 'Run the offer', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'offer',
      enabled: () => enabled,
    });
    const stale = runtime.available(connection.definition)[0]!;

    enabled = false;
    expect(() => invokeOffer(runtime, stale)).toThrow(/disabled/);
    enabled = true;
    expect(() => invokeOffer(runtime, stale)).toThrow(/stale|foreign|forged/);
    expect(runtime.available(connection.definition)[0]?.ref).not.toBe(stale.ref);
  });

  it('invalidates an offer when touch publishes transient disabledness', () => {
    let enabled = true;
    const readEnabled = () => enabled;
    const action = defineAction(
      'offer.transient',
      { does: 'Run the transient offer', invocation: 'inputless' },
      () => 1,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'offer',
      enabled: readEnabled,
    });
    const stale = runtime.available(connection.definition)[0]!;

    enabled = false;
    connection.touch();
    enabled = true;

    expect(() => invokeOffer(runtime, stale)).toThrow(/stale|foreign|forged/);
    expect(runtime.available(connection.definition)[0]?.ref.revision).toBeGreaterThan(
      stale.ref.revision,
    );
  });

  it('fails closed when committed readers mutate or disconnect their own binding', () => {
    let directCalls = 0;
    let direct!: ActionConnection<
      () => void,
      'race.direct',
      false,
      'inputless'
    >;
    const directAction = defineAction(
      'race.direct',
      { does: 'Run directly', invocation: 'inputless' },
      () => {
        directCalls += 1;
      },
    );
    const directRuntime = createActionBindingRuntime();
    direct = connectAction(directRuntime, directAction, {
      node: 'race',
      enabled: () => {
        direct.disconnect();
        return true;
      },
    });
    expect(() => direct.invoke()).toThrow(/disconnected while reading enabledness/);
    expect(directCalls).toBe(0);

    let offered!: ActionConnection<
      () => undefined,
      'race.offer',
      false,
      'inputless'
    >;
    const offeredRuntime = createActionBindingRuntime();
    const offeredAction = defineAction(
      'race.offer',
      { does: 'Expose an offer', invocation: 'inputless' },
      () => undefined,
    );
    offered = connectAction(offeredRuntime, offeredAction, {
      node: 'race',
      busy: () => {
        offered.disconnect();
        return 'leaving';
      },
    });
    expect(offeredRuntime.available()).toEqual([]);
    expect(offeredRuntime.bindings()).toEqual([]);

    let inputCalls = 0;
    let withInput!: ActionConnection<
      (value: string) => void,
      'race.input',
      true,
      'scalar'
    >;
    const inputRuntime = createActionBindingRuntime();
    const inputAction = defineAction(
      'race.input',
      { does: 'Read committed input', invocation: 'scalar' },
      (_value: string) => {
        inputCalls += 1;
      },
    );
    withInput = connectAction(inputRuntime, inputAction, {
      node: 'race',
      input: () => {
        withInput.disconnect();
        return 'stale';
      },
    });
    expect(() => withInput.invoke()).toThrow(/disconnected while reading input/);
    expect(inputCalls).toBe(0);
  });

  it('retries inspection readers without mixing binding revisions', () => {
    const oldLocator = {
      kind: 'programmatic' as const,
      provider: 'old',
    };
    const newLocator = {
      kind: 'programmatic' as const,
      provider: 'new',
    };
    let firstRead = true;
    let connection!: ActionConnection<
      () => undefined,
      'race.snapshot',
      false,
      'inputless'
    >;
    const action = defineAction(
      'race.snapshot',
      { does: 'Inspect the binding', invocation: 'inputless' },
      () => undefined,
    );
    const runtime = createActionBindingRuntime();
    connection = connectAction(runtime, action, {
      node: 'race',
      coverage: 'executable',
      locators: [oldLocator],
      enabled: () => {
        if (firstRead) {
          firstRead = false;
          connection.update({
            coverage: 'verifiable',
            locators: [newLocator],
          });
        }
        return true;
      },
    });

    expect(runtime.bindingFor(connection.binding)).toMatchObject({
      enabled: true,
      coverage: 'verifiable',
      locators: [newLocator],
    });
  });

  it('keeps an established input reader when update receives undefined', async () => {
    const seen: string[] = [];
    const action = defineAction(
      'input.stable',
      { does: 'Use stable input', invocation: 'scalar' },
      (value: string) => seen.push(value),
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'input',
      input: () => 'committed',
    });

    connection.update({ input: undefined });
    await connection.invoke().whenInvoked;
    expect(seen).toEqual(['committed']);

    const withoutReader = connectAction(runtime, action, {
      node: 'input-without-reader',
    });
    expect(() =>
      (
        withoutReader as unknown as {
          update(update: { input: () => string }): void;
        }
      ).update({ input: () => 'late' }),
    ).toThrow(/reconnect to add/);
  });

  it('validates an update completely before changing committed binding facts', () => {
    const oldLocator = {
      kind: 'programmatic' as const,
      provider: 'stable',
    };
    const action = defineAction(
      'update.atomic',
      { does: 'Keep the committed projection', invocation: 'inputless' },
      () => undefined,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'atomic',
      coverage: 'executable',
      enabled: () => true,
      locators: [oldLocator],
    });
    const offer = runtime.available(connection.definition)[0]!;

    expect(() =>
      connection.update({
        coverage: 'verifiable',
        enabled: () => false,
        locators: [{ kind: 'unsupported' } as never],
      }),
    ).toThrow(/unsupported or malformed binding locator/);

    expect(runtime.bindingFor(connection.binding)).toMatchObject({
      coverage: 'executable',
      enabled: true,
      locators: [oldLocator],
    });
    expect(runtime.available(connection.definition)[0]).toBe(offer);
  });

  it('does not publish an attachment when its projection disconnects the binding', () => {
    const action = defineAction(
      'attach.atomic',
      { does: 'Attach an exact host projection', invocation: 'inputless' },
      () => undefined,
    );
    const runtime = createActionBindingRuntime();
    let connection!: ActionConnection<
      () => undefined,
      'attach.atomic',
      false,
      'inputless'
    >;
    connection = connectAction(runtime, action, { node: 'atomic' });

    const projection = {
      get interactive() {
        connection.disconnect();
        return {};
      },
      coverage: 'executable' as const,
    };

    expect(() => connection.attach(projection)).toThrow(
      /disconnected while reading the attachment projection/,
    );
    expect(runtime.bindings()).toEqual([]);
  });

  it('fails closed instead of dropping positional arguments from untyped direct calls', () => {
    const received: unknown[][] = [];
    const action = defineAction(
      'arity.several',
      { does: 'Run a host listener with several arguments', invocation: 'host' },
      (left: string, right: number) => {
        received.push([left, right, 2]);
      },
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, { node: 'arity' });
    const invoke = connection.invoke as unknown as (...args: unknown[]) => unknown;

    expect(() => invoke('left')).toThrow(/host-only.*invokeContinuation/);
    expect(() => invoke('left', 2)).toThrow(/at most one payload slot/);

    expect(runtime.available(connection.definition)).toEqual([]);
    expect(runtime.available()).toEqual([]);
    expect(received).toEqual([]);
  });
});
