import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

type Completion = 'microtask' | 'authored-sync' | 'async';
const completions: Completion[] = ['microtask', 'authored-sync', 'async'];

function returning<T>(value: T, completion: Completion, errors: unknown[] = []) {
  const runtime = createActionRuntime();
  const action = defineAction('history.return', {
    does: 'Return the application value',
    invocation: 'inputless',
    ...(completion === 'authored-sync'
      ? { settle: { onReturn: () => undefined } }
      : {}),
    mutate: () => completion === 'async' ? Promise.resolve(value) : value,
  });
  const connection = connectAction(runtime, action, {
    node: 'history',
    onInvocationError: error => { errors.push(error); },
  });
  return { runtime, action, connection, invocation: connection.invoke() };
}

describe('action history captures data without changing application outcomes', () => {
  it('quotes an ordinary synchronous record before invoke returns without closing its microtask rail early', async () => {
    const value = { version: 1, nested: { count: 1 } };
    const { runtime, invocation } = returning(value, 'microtask');
    const pending = runtime.transitionFor(invocation.transition)!;
    expect(pending.invocationStatus).toBe('pending');
    expect(Object.hasOwn(pending, 'produced')).toBe(false);
    value.version = 2;
    value.nested.count = 2;
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The handler must perform.');
    expect(outcome.produced).toBe(value);
    expect(outcome.produced.version).toBe(2);
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual({ version: 1, nested: { count: 1 } });
  });

  it('quotes an ordinary synchronous array before the caller can mutate it', async () => {
    const value = [{ count: 1 }];
    const { runtime, invocation } = returning(value, 'microtask');
    value[0]!.count = 2;
    value.push({ count: 3 });
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The handler must perform.');
    expect(outcome.produced).toBe(value);
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual([{ count: 1 }]);
  });

  it.each(completions)('detaches nested returned data at %s completion', async completion => {
    const value = { status: 'accepted', rows: [{ count: 1 }], nested: { flag: true } };
    const { runtime, invocation } = returning(value, completion);
    if (completion === 'authored-sync') {
      expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe('performed');
    }
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The handler must perform.');
    const before = runtime.transitionFor(invocation.transition)!;
    expect(outcome.produced).toBe(value);
    expect(before.produced).not.toBe(value);
    expect(Object.isFrozen(before.produced)).toBe(true);
    expect(Object.isFrozen((before.produced as typeof value).rows[0])).toBe(true);
    expect(Object.isFrozen(value)).toBe(false);
    expect(Object.isFrozen(value.rows)).toBe(false);
    value.status = 'succeeded';
    value.rows[0]!.count = 2;
    value.rows.push({ count: 3 });
    value.nested.flag = false;
    const expected = { status: 'accepted', rows: [{ count: 1 }], nested: { flag: true } };
    expect(before.produced).toEqual(expected);
    expect(runtime.transitionFor(invocation.transition)?.produced).toBe(before.produced);
    expect(runtime.transitions()[0]?.produced).toEqual(expected);
    expect(outcome.produced).toBe(value);
    expect(outcome.produced.status).toBe('succeeded');
    expect(before).not.toHaveProperty('captureFailure');
  });

  it('captures an asynchronous value when it resolves, not when invocation starts', async () => {
    const value = { version: 1 };
    let release!: (result: typeof value) => void;
    const runtime = createActionRuntime();
    const action = defineAction('history.deferred', {
      does: 'Return a later value', invocation: 'inputless',
      mutate: () => new Promise<typeof value>(resolve => { release = resolve; }),
    });
    const connection = connectAction(runtime, action, { node: 'history' });
    const invocation = connection.invoke();
    expect(runtime.transitionFor(invocation.transition)?.invocationStatus).toBe('pending');
    value.version = 2;
    release(value);
    const outcome = await invocation.whenInvoked;
    expect(outcome).toMatchObject({ status: 'performed', produced: value });
    value.version = 3;
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual({ version: 2 });
  });

  it.each(completions)('preserves cyclic record/array structure in %s history', async completion => {
    const value: { name: string; self?: unknown; items: unknown[] } = { name: 'before', items: [] };
    value.self = value;
    value.items.push(value, value.items);
    const { runtime, invocation } = returning(value, completion);
    const outcome = await invocation.whenInvoked;
    const captured = runtime.transitionFor(invocation.transition)!.produced as typeof value;
    expect(captured === value).toBe(false);
    expect(captured.self).toBe(captured);
    expect(captured.items[0]).toBe(captured);
    expect(captured.items[1]).toBe(captured.items);
    expect(Object.isFrozen(captured.items)).toBe(true);
    value.name = 'after';
    value.items.push('later');
    expect(captured.name).toBe('before');
    expect(captured.items).toHaveLength(2);
    expect(outcome).toMatchObject({ status: 'performed' });
    if (outcome.status === 'performed') expect(outcome.produced).toBe(value);
  });

  it.each(['throw', 'reject'] as const)('captures a plain %s error but keeps the original failure outcome', async mode => {
    const error = { code: 'UNAVAILABLE', detail: { attempts: [1] } };
    const runtime = createActionRuntime();
    const action = defineAction('history.failure', {
      does: 'Fail with a data error', invocation: 'inputless',
      mutate: () => { if (mode === 'throw') throw error; return Promise.reject(error); },
    });
    const connection = connectAction(runtime, action, { node: 'history' });
    const invocation = connection.invoke();
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'failed') throw new Error('The handler must fail.');
    const before = runtime.transitionFor(invocation.transition)!;
    expect(outcome.error).toBe(error);
    expect(before.error).not.toBe(error);
    expect(Object.isFrozen(before.error)).toBe(true);
    error.code = 'CHANGED';
    error.detail.attempts.push(2);
    expect(before.error).toEqual({ code: 'UNAVAILABLE', detail: { attempts: [1] } });
    expect(runtime.transitionFor(invocation.transition)?.error).toBe(before.error);
    expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('unverified');
    expect(Object.isFrozen(error)).toBe(false);
    expect(before).not.toHaveProperty('captureFailure');
  });

  it('retains opaque values by identity rather than claiming to freeze their internals', async () => {
    class Opaque { count = 1; }
    const opaque = new Opaque();
    const error = new Error('original');
    const value = { opaque, error, callable: () => 'still callable' };
    const { runtime, invocation } = returning(value, 'microtask');
    await invocation.whenInvoked;
    const captured = runtime.transitionFor(invocation.transition)!.produced as typeof value;
    expect(captured).not.toBe(value);
    expect(captured.opaque).toBe(opaque);
    expect(captured.error).toBe(error);
    expect(captured.callable).toBe(value.callable);
    expect(Object.isFrozen(opaque)).toBe(false);
    opaque.count = 2;
    expect(captured.opaque.count).toBe(2);
  });

  it('preserves opaque thrown Error identity in both the outcome and history', async () => {
    const error = new Error('same error');
    const runtime = createActionRuntime();
    const action = defineAction('history.opaque-error', {
      does: 'Throw the original error', invocation: 'inputless', mutate: () => { throw error; },
    });
    const invocation = connectAction(runtime, action, { node: 'history' }).invoke();
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'failed') throw new Error('The handler must fail.');
    expect(outcome.error).toBe(error);
    expect(runtime.transitionFor(invocation.transition)?.error).toBe(error);
  });

  it('captures a returned top-level array without freezing the application array', async () => {
    const value = [{ count: 1 }];
    const { runtime, invocation } = returning(value, 'microtask');
    await invocation.whenInvoked;
    const before = runtime.transitionFor(invocation.transition)!;
    value[0]!.count = 2;
    value.push({ count: 3 });
    expect(before.produced).toEqual([{ count: 1 }]);
    expect(Object.isFrozen(before.produced)).toBe(true);
    expect(Object.isFrozen(value)).toBe(false);
  });

  it('keeps host-continuation outcomes raw while capturing their plain historical data', async () => {
    const value = { listener: 'before' };
    const runtime = createActionRuntime();
    const action = defineAction('history.host', {
      does: 'Observe a host callback', invocation: 'host', mutate: () => 'not called',
    });
    const connection = connectAction(runtime, action, { node: 'history' });
    const invocation = connection.invokeContinuation(() => value);
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The host callback must perform.');
    expect(outcome.produced).toBe(value);
    const before = runtime.transitionFor(invocation.transition)!;
    value.listener = 'after';
    expect(before.produced).toEqual({ listener: 'before' });
    expect(outcome.produced.listener).toBe('after');
  });

  it.each(completions)('keeps %s success when a returned field cannot be captured', async completion => {
    const captureError = new Error('getter cannot be read');
    let reads = 0;
    const value = { id: 'receipt', get detail(): never { reads++; throw captureError; } };
    const errors: unknown[] = [];
    const { runtime, invocation } = returning(value, completion, errors);
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('Capture must not change success.');
    expect(outcome.produced).toBe(value);
    const row = runtime.transitionFor(invocation.transition)!;
    expect(row).toMatchObject({ invocationStatus: 'performed', effectStatus: 'unverified', captureFailure: 'produced' });
    expect(Object.hasOwn(row, 'produced')).toBe(false);
    expect(errors).toEqual([captureError]);
    expect(errors[0]).toBe(captureError);
    runtime.transitionFor(invocation.transition);
    runtime.transitions();
    expect(reads).toBe(1);
    expect(Object.isFrozen(value)).toBe(false);
  });

  it.each(['throw', 'reject'] as const)('keeps the original %s failure when its error cannot be captured', async mode => {
    const captureError = new Error('error getter cannot be read');
    let reads = 0;
    const error = { code: 'APP_FAILED', get detail(): never { reads++; throw captureError; } };
    const errors: unknown[] = [];
    const runtime = createActionRuntime();
    const action = defineAction('history.uncapturable-error', {
      does: 'Fail with an unreadable data error', invocation: 'inputless',
      mutate: () => { if (mode === 'throw') throw error; return Promise.reject(error); },
    });
    const invocation = connectAction(runtime, action, { node: 'history', onInvocationError: failure => { errors.push(failure); } }).invoke();
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'failed') throw new Error('Capture must not change failure.');
    expect(outcome.error).toBe(error);
    const row = runtime.transitionFor(invocation.transition)!;
    expect(row).toMatchObject({ invocationStatus: 'failed', effectStatus: 'unverified', captureFailure: 'error' });
    expect(Object.hasOwn(row, 'error')).toBe(false);
    expect(errors).toEqual([captureError]);
    expect(errors[0]).toBe(captureError);
    expect(reads).toBe(1);
  });

  it('does not let a failing diagnostic sink change successful execution', async () => {
    const captureError = new Error('capture failed');
    const value = { get detail(): never { throw captureError; } };
    const runtime = createActionRuntime();
    const action = defineAction('history.bad-diagnostic', {
      does: 'Return despite a broken diagnostic sink', invocation: 'inputless', mutate: () => value,
    });
    const invocation = connectAction(runtime, action, {
      node: 'history', onInvocationError: () => { throw new Error('sink failed'); },
    }).invoke();
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(runtime.transitionFor(invocation.transition)).toHaveProperty('captureFailure', 'produced');
  });

  it('publishes a consistent unavailable field before reporting an uninspectable capture failure', async () => {
    const captureError = Object.create(null) as object;
    const value = { get detail(): never { throw captureError; } };
    const runtime = createActionRuntime();
    const action = defineAction('history.diagnostic-reentry', {
      does: 'Record an unreadable return', invocation: 'inputless', mutate: () => value,
    });
    let reported: unknown;
    let during: unknown;
    const invocation = connectAction(runtime, action, {
      node: 'history', onInvocationError: error => {
        reported = error;
        during = runtime.transitions()[0];
      },
    }).invoke();
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(reported).toBe(captureError);
    expect(during).toMatchObject({ invocationStatus: 'performed', effectStatus: 'unverified', captureFailure: 'produced' });
    expect(Object.hasOwn(during as object, 'produced')).toBe(false);
  });

  it('does not confuse a captured undefined return or thrown value with unavailable capture', async () => {
    const returned = returning(undefined, 'microtask');
    await returned.invocation.whenInvoked;
    const returnedRow = returned.runtime.transitionFor(returned.invocation.transition)!;
    expect(Object.hasOwn(returnedRow, 'produced')).toBe(true);
    expect(returnedRow.produced).toBeUndefined();
    expect(returnedRow).not.toHaveProperty('captureFailure');
    const runtime = createActionRuntime();
    const action = defineAction('history.undefined-error', {
      does: 'Throw undefined', invocation: 'inputless', mutate: () => { throw undefined; },
    });
    const invocation = connectAction(runtime, action, { node: 'history' }).invoke();
    await invocation.whenInvoked;
    const errorRow = runtime.transitionFor(invocation.transition)!;
    expect(Object.hasOwn(errorRow, 'error')).toBe(true);
    expect(errorRow.error).toBeUndefined();
    expect(errorRow).not.toHaveProperty('captureFailure');
  });

  it('keeps the raw value for the authored onReturn judge while preserving earlier captured data', async () => {
    const value = { status: 'before' };
    let judged: unknown;
    const runtime = createActionRuntime();
    const action = defineAction('history.return-judge', {
      does: 'Judge the original return', invocation: 'inputless',
      settle: { onReturn: outcome => {
        if (outcome.status === 'performed') { judged = outcome.produced; value.status = 'judge changed it'; }
        return undefined;
      } },
      mutate: () => value,
    });
    const invocation = connectAction(runtime, action, { node: 'history' }).invoke();
    expect(judged).toBe(value);
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual({ status: 'before' });
    const outcome = await invocation.whenInvoked;
    if (outcome.status === 'performed') expect(outcome.produced).toBe(value);
  });

  it('leaves a non-enumerable then accessor to native promise assimilation exactly once', async () => {
    const value = { version: 1 };
    let reads = 0;
    Object.defineProperty(value, 'then', {
      get() { reads++; return undefined; },
    });
    const { runtime, invocation } = returning(value, 'microtask');
    expect(reads).toBe(1);
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The handler must perform.');
    expect(outcome.produced).toBe(value);
    expect(reads).toBe(1);
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual({ version: 1 });
  });

  it('uses the real resolved output of a thenable with its original receiver and no extra then reads', async () => {
    const value = { version: 1 };
    const thenable = {} as PromiseLike<typeof value>;
    let reads = 0;
    let calls = 0;
    let receiver: unknown;
    Object.defineProperty(thenable, 'then', {
      get() {
        reads++;
        return function (this: unknown, resolve: (result: typeof value) => void) {
          calls++;
          receiver = this;
          resolve(value);
        };
      },
    });
    const { runtime, invocation } = returning(thenable, 'microtask');
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The handler must perform.');
    expect(outcome.produced).toBe(value);
    expect(reads).toBe(1);
    expect(calls).toBe(1);
    expect(receiver).toBe(thenable);
    value.version = 2;
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual({ version: 1 });
  });

  it('falls back to native completion when the early-quotation guard cannot inspect a value', async () => {
    const value = { version: 1 };
    let thenReads = 0;
    let hasChecks = 0;
    const returned = new Proxy(value, {
      get(target, key, receiver) {
        if (key === 'then') thenReads++;
        return Reflect.get(target, key, receiver);
      },
      has() { hasChecks++; throw new Error('guard reflection is unavailable'); },
    });
    const errors: unknown[] = [];
    const { runtime, invocation } = returning(returned, 'microtask', errors);
    const outcome = await invocation.whenInvoked;
    if (outcome.status !== 'performed') throw new Error('The handler must perform.');
    expect(outcome.produced).toBe(returned);
    expect(thenReads).toBe(1);
    expect(hasChecks).toBe(1);
    expect(errors).toEqual([]);
    expect(runtime.transitionFor(invocation.transition)?.produced).toEqual({ version: 1 });
  });

  it('publishes an early capture failure only when the existing invocation rail closes', async () => {
    const captureError = new Error('unreadable return');
    const value = { get detail(): never { throw captureError; } };
    const errors: unknown[] = [];
    const { runtime, invocation } = returning(value, 'microtask', errors);
    const pending = runtime.transitionFor(invocation.transition)!;
    expect(pending.invocationStatus).toBe('pending');
    expect(pending).not.toHaveProperty('captureFailure');
    expect(errors).toEqual([]);
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(runtime.transitionFor(invocation.transition)).toHaveProperty('captureFailure', 'produced');
    expect(errors[0]).toBe(captureError);
  });
});
