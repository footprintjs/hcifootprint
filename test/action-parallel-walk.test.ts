import { describe, expect, expectTypeOf, it } from 'vitest';
import { beginWalk, connectAction, createActionRuntime, defineAction } from '../src/index.js';
import type {
  ActionParallelStep, ActionPlanManifest, ActionPlanRow, ActionRuntime,
  ActionWalk, ActionWalkWithParallel, DefinedAction,
} from '../src/index.js';

function deferred() {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function connected(runtime: ActionRuntime, id: string, mutate: () => unknown, node = 'parallel') {
  const action = defineAction(id, { does: id, invocation: 'inputless', mutate });
  const connection = connectAction(runtime, action, { node });
  return { action, connection };
}

/** Deliberately bypass TypeScript only for malformed, external input cases. */
function unchecked(walk: ActionWalkWithParallel, steps: unknown, options?: unknown): Promise<ActionPlanManifest> {
  return Reflect.apply(walk.parallel, walk, [steps, options]) as Promise<ActionPlanManifest>;
}

describe('parallel plans admit independent actions before any dispatch', () => {
  it.each(['decision', 'principal'] as const)('a forbidden %s anywhere in the plan prevents every invocation', async kind => {
    const runtime = createActionRuntime();
    let calls = 0;
    const first = connected(runtime, 'parallel.first', () => { calls++; });
    const forbidden = defineAction('parallel.forbidden', {
      does: 'Must be admitted before any work starts', invocation: 'inputless',
      principal: kind === 'decision' ? { decisionOwner: 'human' } : { mayInvoke: ['human'] },
      mutate: () => { calls++; },
    });
    connectAction(runtime, forbidden, { node: 'elsewhere' });
    const walk = beginWalk(runtime, 'agent');
    await expect(walk.parallel([{ action: first.action }, { action: forbidden }])).rejects.toThrow(
      kind === 'decision' ? /decision.*own|decisionOwner/i : /plan time|may.*invoke/i,
    );
    expect(calls).toBe(0);
    expect(runtime.transitions()).toEqual([]);
    expect(walk.record().manifests).toEqual([]);
  });

  it('the owning human can admit the same human-owned action', async () => {
    const runtime = createActionRuntime();
    const action = defineAction('parallel.human-choice', {
      does: 'The human owns this decision', invocation: 'inputless',
      principal: { decisionOwner: 'human' }, mutate: () => 'chosen',
    });
    connectAction(runtime, action, { node: 'choice' });
    expect((await beginWalk(runtime, 'user').parallel([{ action }])).completed).toBe(true);
  });

  it('carry is rejected before any dispatch, even when its producer declares an output', async () => {
    const runtime = createActionRuntime();
    let calls = 0;
    const producer = defineAction('parallel.producer', {
      does: 'Has an output, but this is not a serial plan', invocation: 'inputless',
      produces: { kind: 'parallel.output' }, mutate: () => { calls++; return 'value'; },
    });
    connectAction(runtime, producer, { node: 'parallel' });
    const walk = beginWalk(runtime, 'agent');
    await expect(unchecked(walk, [{ action: producer }, { action: producer, carry: { from: 0 } }]))
      .rejects.toThrow(/carry|independent/i);
    expect(calls).toBe(0);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2', null])('refuses invalid concurrency %s before executing', async concurrency => {
    const runtime = createActionRuntime();
    let calls = 0;
    const step = connected(runtime, 'parallel.options', () => { calls++; });
    await expect(unchecked(beginWalk(runtime, 'agent'), [{ action: step.action }], { concurrency }))
      .rejects.toThrow(/concurrency|positive|safe integer/i);
    expect(calls).toBe(0);
  });

  it.each([[], null, [null], [1], [{ action: () => 'not a definition' }]])('refuses an invalid independent plan (%#)', async steps => {
    const runtime = createActionRuntime();
    await expect(unchecked(beginWalk(runtime, 'agent'), steps)).rejects.toThrow();
    expect(runtime.transitions()).toEqual([]);
  });

  it.each([null, [], 1])('refuses malformed parallel options (%#)', async options => {
    const runtime = createActionRuntime();
    let calls = 0;
    const step = connected(runtime, 'parallel.bad-options-record', () => { calls++; });
    await expect(unchecked(beginWalk(runtime, 'agent'), [{ action: step.action }], options)).rejects.toThrow(/options.*record/i);
    expect(calls).toBe(0);
  });

  it('rejects an invalid row observer before dispatch and releases the walk for a corrected plan', async () => {
    const runtime = createActionRuntime();
    let calls = 0;
    const step = connected(runtime, 'parallel.bad-observer', () => { calls++; });
    const walk = beginWalk(runtime, 'agent');
    await expect(unchecked(walk, [{ action: step.action }], { onRow: 1 })).rejects.toThrow(/onRow.*function/i);
    expect(calls).toBe(0);
    expect((await walk.parallel([{ action: step.action }])).completed).toBe(true);
  });
});

describe('parallel invocation scheduling and manifests', () => {
  it('starts all actions by default, streams rows in completion order and returns them in input order', async () => {
    const runtime = createActionRuntime();
    const tasks = [deferred(), deferred(), deferred()];
    const landed = [deferred(), deferred(), deferred()];
    const started: number[] = [], events: number[] = [];
    const steps = tasks.map((task, index) => connected(runtime, `parallel.order-${index}`, () => {
      started.push(index); return task.promise;
    }));
    const walk = beginWalk(runtime, 'agent', { walkId: 'walk#parallel-order' });
    const pending = walk.parallel(steps.map(step => ({ action: step.action })), {
      onRow: row => { events.push(row.step); landed[row.step]!.resolve(); },
    });
    expect(started).toEqual([0, 1, 2]);
    tasks[2]!.resolve('third'); await landed[2]!.promise;
    tasks[0]!.resolve('first'); await landed[0]!.promise;
    tasks[1]!.resolve('second');
    const manifest = await pending;
    expect(events).toEqual([2, 0, 1]);
    expect(manifest.rows.map(row => row.step)).toEqual([0, 1, 2]);
    expect(manifest.completed).toBe(true);
    expect(manifest.execution).toEqual({ mode: 'parallel', concurrency: 3 });
    expect(manifest.counts).toEqual({ planned: 3, ran: 3, refused: 0, neverReached: 0 });
    expect(manifest.walk.walkId).toBe('walk#parallel-order');
    expect(walk.record().manifests).toEqual([manifest]);
    for (const item of [manifest, manifest.rows, ...manifest.rows, manifest.counts, manifest.execution, walk.record().manifests]) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });

  it('holds the supplied limit while draining the queue, without serializing independent in-flight work', async () => {
    const runtime = createActionRuntime();
    const tasks = [deferred(), deferred(), deferred(), deferred()];
    const starts = tasks.map(() => deferred());
    let live = 0, highWater = 0;
    const actions = tasks.map((task, index) => connected(runtime, `parallel.limit-${index}`, () => {
      live++; highWater = Math.max(highWater, live); starts[index]!.resolve();
      return task.promise.finally(() => { live--; });
    }));
    const pending = beginWalk(runtime, 'agent').parallel(actions.map(step => ({ action: step.action })), { concurrency: 2 });
    expect(live).toBe(2);
    tasks[1]!.resolve(); await starts[2]!.promise;
    expect(live).toBe(2);
    tasks[0]!.resolve(); await starts[3]!.promise;
    tasks[2]!.resolve(); tasks[3]!.resolve();
    const manifest = await pending;
    expect(highWater).toBe(2);
    expect(manifest.execution).toEqual({ mode: 'parallel', concurrency: 2 });
    expect(manifest.completed).toBe(true);
  });

  it('clamps an oversized positive concurrency to the actual plan length', async () => {
    const runtime = createActionRuntime();
    const one = connected(runtime, 'parallel.clamped', () => 'done');
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action: one.action }], { concurrency: 99 });
    expect(manifest.execution).toEqual({ mode: 'parallel', concurrency: 1 });
  });

  it.each(['sync', 'async'] as const)('%s invocation failure is collected without cancelling independent siblings', async mode => {
    const runtime = createActionRuntime();
    const first = connected(runtime, 'parallel.failed', () => {
      if (mode === 'sync') throw new Error('deliberate invocation failure');
      return Promise.reject(new Error('deliberate invocation failure'));
    });
    let siblingCalls = 0;
    const sibling = connected(runtime, 'parallel.sibling', () => { siblingCalls++; return 'ok'; });
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action: first.action }, { action: sibling.action }], { concurrency: 1 });
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'ran']);
    expect(manifest.completed).toBe(false);
    expect(siblingCalls).toBe(1);
    expect(runtime.transitionFor(manifest.rows[0]!.transition!)?.invocationStatus).toBe('failed');
    expect(runtime.transitionFor(manifest.rows[1]!.transition!)?.invocationStatus).toBe('performed');
  });

  it('a throwing observer cannot stop scheduling or change the manifest', async () => {
    const runtime = createActionRuntime();
    let calls = 0;
    const action = connected(runtime, 'parallel.observer', () => { calls++; });
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action: action.action }, { action: action.action }], {
      concurrency: 1, onRow: () => { throw new Error('observer failure'); },
    });
    expect(calls).toBe(2);
    expect(manifest.completed).toBe(true);
  });

  it('uses invocation receipts even when bounded history has already evicted every transition', async () => {
    const runtime = createActionRuntime({ history: { keep: 0 } });
    const action = defineAction('parallel.evicted', {
      does: 'Finish the declared effect as well as the invocation', invocation: 'inputless',
      settle: { writes: ['saved'], onReturn: () => ({ status: 'verified', evidence: 'saved' }) },
      mutate: () => 'done',
    });
    connectAction(runtime, action, { node: 'parallel', coverage: 'verifiable' });
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action }, { action }]);
    expect(runtime.transitions()).toEqual([]);
    expect(manifest.rows.every(row => runtime.transitionFor(row.transition!) === undefined)).toBe(true);
    expect(manifest.completed).toBe(true);
    expect(manifest.counts.ran).toBe(2);
  });
});

describe('each dispatch uses current offers, inputs and application availability', () => {
  it.each([undefined, 1])('a synchronous disconnect is respected before B dispatches (concurrency %s), and C still runs', async concurrency => {
    const runtime = createActionRuntime();
    const seen: string[] = [];
    const b = connected(runtime, 'parallel.page-b', () => { seen.push('B'); }, 'other-page');
    const a = connected(runtime, 'parallel.page-a', () => { seen.push('A'); b.connection.disconnect(); }, 'current-page');
    const c = connected(runtime, 'parallel.page-c', () => { seen.push('C'); }, 'current-page');
    const manifest = await beginWalk(runtime, 'agent').parallel(
      [{ action: a.action }, { action: b.action }, { action: c.action }], { concurrency },
    );
    expect(seen).toEqual(['A', 'C']);
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'refused', 'ran']);
    expect(manifest.rows[1]!.refusal).toMatch(/no offer/i);
    expect(manifest.counts).toEqual({ planned: 3, ran: 2, refused: 1, neverReached: 0 });
    expect(manifest.completed).toBe(false);
  });

  it('node labels alone do not make a mounted control on another page unavailable', async () => {
    const runtime = createActionRuntime();
    const seen: string[] = [];
    const a = connected(runtime, 'parallel.visible', () => { seen.push('visible'); }, 'visible-page');
    const b = connected(runtime, 'parallel.hidden-mounted', () => { seen.push('hidden-mounted'); }, 'hidden-page');
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action: a.action }, { action: b.action }]);
    expect(seen).toEqual(['visible', 'hidden-mounted']);
    expect(manifest.completed).toBe(true);
  });

  it('the app can explicitly gate an inactive page, and a prior synchronous action changes that live gate', async () => {
    const runtime = createActionRuntime();
    let activePage = 'second', bCalls = 0;
    const b = defineAction('parallel.page-gated', { does: 'Only on the active page', invocation: 'inputless', mutate: () => { bCalls++; } });
    connectAction(runtime, b, { node: 'second', enabled: () => activePage === 'second' });
    const a = connected(runtime, 'parallel.navigate', () => { activePage = 'first'; }, 'first');
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action: a.action }, { action: b }]);
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'refused']);
    expect(bCalls).toBe(0);
  });

  it('an offer reader throwing at dispatch becomes one refused row and the queue continues', async () => {
    const runtime = createActionRuntime();
    let broken = false, cCalls = 0;
    const b = defineAction('parallel.offer-throws', { does: 'A reader that stops working', invocation: 'inputless', mutate: () => 'must not run' });
    connectAction(runtime, b, { node: 'parallel', enabled: () => { if (broken) throw new Error('fresh offer reader failed'); return true; } });
    const a = connected(runtime, 'parallel.break-reader', () => { broken = true; });
    const c = connected(runtime, 'parallel.after-reader-error', () => { cCalls++; });
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action: a.action }, { action: b }, { action: c.action }], { concurrency: 1 });
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'refused', 'ran']);
    expect(manifest.rows[1]!.refusal).toContain('fresh offer reader failed');
    expect(cCalls).toBe(1);
  });

  it('validates each open payload with the real action schema while other independent inputs proceed', async () => {
    const runtime = createActionRuntime();
    const seen: number[] = [];
    const action = defineAction('parallel.schema', {
      does: 'Accept a number', invocation: 'scalar',
      inputSchema: { safeParse: (value: unknown) => typeof value === 'number'
        ? { success: true as const, data: value }
        : { success: false as const, error: { issues: [{ message: 'Expected a number' }] } } },
      mutate: (value: number) => { seen.push(value); },
    });
    connectAction(runtime, action, { node: 'parallel' });
    const manifest = await beginWalk(runtime, 'agent').parallel([{ action, input: 'wrong' }, { action, input: 7 }]);
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'ran']); // the schema refusal owns a real L1 transition
    expect(runtime.transitionFor(manifest.rows[0]!.transition!)?.invocationStatus).toBe('refused');
    expect(manifest.completed).toBe(false);
    expect(seen).toEqual([7]);
  });

  it('ambiguous bindings and a missing open payload refuse independently; a named instance still runs', async () => {
    const runtime = createActionRuntime();
    const action = defineAction('parallel.instance', {
      does: 'Act on a known row', invocation: 'scalar',
      inputSchema: { safeParse: (value: unknown) => ({ success: true as const, data: value }) }, mutate: (value: unknown) => value,
    });
    connectAction(runtime, action, { node: 'rows', instance: 'one' });
    connectAction(runtime, action, { node: 'rows', instance: 'two' });
    const manifest = await beginWalk(runtime, 'agent').parallel([
      { action, input: 'ambiguous' }, { action, instance: 'one' }, { action, instance: 'two', input: 'right' },
    ]);
    expect(manifest.rows.map(row => row.status)).toEqual(['refused', 'refused', 'ran']);
    expect(manifest.rows[0]!.refusal).toMatch(/instance/i);
    expect(manifest.rows[1]!.refusal).toMatch(/payload|input/i);
  });

  it('disconnecting after both invocations dispatch cannot undo their active work', async () => {
    const runtime = createActionRuntime();
    const a = deferred(), b = deferred();
    const first = connected(runtime, 'parallel.running-a', () => a.promise, 'first-page');
    const second = connected(runtime, 'parallel.running-b', () => b.promise, 'second-page');
    const pending = beginWalk(runtime, 'agent').parallel([{ action: first.action }, { action: second.action }]);
    second.connection.disconnect();
    a.resolve(); b.resolve();
    const manifest = await pending;
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'ran']);
    expect(manifest.completed).toBe(true);
  });

  it('snapshots plan structure but preserves the application payload value by reference', async () => {
    const runtime = createActionRuntime();
    const firstGate = deferred();
    const first = connected(runtime, 'parallel.snapshot-first', () => firstGate.promise);
    let observed: unknown;
    const take = defineAction('parallel.snapshot-input', {
      does: 'Use the planned input', invocation: 'scalar',
      inputSchema: { safeParse: (value: unknown) => ({ success: true as const, data: value }) },
      mutate: (value: unknown) => { observed = value; },
    });
    connectAction(runtime, take, { node: 'parallel', instance: 'original' });
    let wrongCalls = 0;
    const wrong = connected(runtime, 'parallel.snapshot-wrong', () => { wrongCalls++; });
    const payload = { value: 'before' };
    const second: { action: DefinedAction; instance: string; input: unknown } = { action: take, instance: 'original', input: payload };
    const steps = [{ action: first.action }, second];
    const pending = beginWalk(runtime, 'agent').parallel(steps, { concurrency: 1 });
    second.action = wrong.action; second.instance = 'changed'; second.input = { value: 'replacement' };
    steps.pop();
    payload.value = 'after';
    firstGate.resolve();
    const manifest = await pending;
    expect(manifest.counts.planned).toBe(2);
    expect(manifest.completed).toBe(true);
    expect(observed).toBe(payload);
    expect(observed).toEqual({ value: 'after' });
    expect(wrongCalls).toBe(0);
  });
});

describe('parallel interruption and reentrancy', () => {
  it('an interrupt armed before dispatch leaves every row never-reached', async () => {
    const runtime = createActionRuntime();
    let calls = 0;
    const a = connected(runtime, 'parallel.armed', () => { calls++; });
    const walk = beginWalk(runtime, 'agent');
    walk.interrupt({ by: 'user', reason: 'Do not start this batch' });
    const manifest = await walk.parallel([{ action: a.action }, { action: a.action }]);
    expect(calls).toBe(0);
    expect(manifest.rows.map(row => row.status)).toEqual(['never-reached', 'never-reached']);
    expect(manifest.interrupted).toEqual({ by: 'user', reason: 'Do not start this batch', beforeStep: 0 });
  });

  it('stops undispatched work, drains active calls, and preserves a second interrupt for the next plan', async () => {
    const runtime = createActionRuntime();
    const tasks = [deferred(), deferred()];
    const stopped = deferred();
    let cCalls = 0;
    const a = connected(runtime, 'parallel.stop-a', () => tasks[0]!.promise);
    const b = connected(runtime, 'parallel.stop-b', () => tasks[1]!.promise);
    const c = connected(runtime, 'parallel.stop-c', () => { cCalls++; });
    const walk = beginWalk(runtime, 'agent');
    const pending = walk.parallel([{ action: a.action }, { action: b.action }, { action: c.action }], {
      concurrency: 2, onRow: row => { if (row.step === 2) stopped.resolve(); },
    });
    walk.interrupt({ by: 'user', reason: 'First stop' });
    tasks[0]!.resolve(); await stopped.promise;
    expect(walk.interrupt({ by: 'user', reason: 'Next plan also needs review' })).toBe(true);
    expect(cCalls).toBe(0);
    tasks[1]!.resolve();
    const first = await pending;
    expect(first.rows.map(row => row.status)).toEqual(['ran', 'ran', 'never-reached']);
    expect(first.interrupted).toMatchObject({ reason: 'First stop', beforeStep: 2 });
    const next = await walk.parallel([{ action: c.action }]);
    expect(next.interrupted).toMatchObject({ reason: 'Next plan also needs review', beforeStep: 0 });
    expect(cCalls).toBe(0);
    expect((await walk.parallel([{ action: c.action }])).completed).toBe(true);
  });

  it('an interrupt arriving after every step dispatched remains armed for the next plan', async () => {
    const runtime = createActionRuntime();
    const task = deferred();
    const a = connected(runtime, 'parallel.all-dispatched', () => task.promise);
    const walk = beginWalk(runtime, 'agent');
    const pending = walk.parallel([{ action: a.action }]);
    walk.interrupt({ by: 'user', reason: 'Stop the next dispatch' });
    task.resolve();
    const first = await pending;
    expect(first.completed).toBe(true);
    expect(first.interrupted).toBeUndefined();
    const next = await walk.parallel([{ action: a.action }]);
    expect(next.rows[0]!.status).toBe('never-reached');
    expect(next.interrupted?.reason).toBe('Stop the next dispatch');
  });

  it.each(['enabled', 'input', 'throwing input'] as const)('an interrupt from B’s %s reader stops B before dispatch while A drains', async reader => {
    const runtime = createActionRuntime();
    const task = deferred();
    let walk: ActionWalkWithParallel | undefined;
    let asked = false, aCalls = 0, bCalls = 0, cCalls = 0;
    const stop = () => {
      if (walk && !asked) { asked = true; walk.interrupt({ by: 'user', reason: 'Stop before B dispatches' }); }
    };
    const a = connected(runtime, 'parallel.reader-stop-a', () => { aCalls++; return task.promise; });
    const b = defineAction('parallel.reader-stop-b', {
      does: 'Select a bound input without beginning the action', invocation: 'scalar', mutate: (_value: string) => { bCalls++; },
    });
    connectAction(runtime, b, {
      node: 'parallel',
      enabled: () => { if (reader === 'enabled') stop(); return true; },
      input: () => {
        if (reader !== 'enabled') stop();
        if (reader === 'throwing input' && asked) throw new Error('reader stopped and failed');
        return 'bound';
      },
    });
    const c = connected(runtime, 'parallel.reader-stop-c', () => { cCalls++; });
    walk = beginWalk(runtime, 'agent');
    const pending = walk.parallel([{ action: a.action }, { action: b }, { action: c.action }], { concurrency: 2 });
    let manifest: ActionPlanManifest;
    try {
      expect(aCalls).toBe(1);
      expect(bCalls).toBe(0);
      expect(cCalls).toBe(0);
      const marker = Symbol('A is still running');
      expect(await Promise.race([pending, Promise.resolve(marker)])).toBe(marker);
    } finally {
      task.resolve();
      manifest = await pending;
    }
    expect(manifest.rows.map(row => row.status)).toEqual(['ran', 'never-reached', 'never-reached']);
    expect(manifest.interrupted).toEqual({ by: 'user', reason: 'Stop before B dispatches', beforeStep: 1 });
  });

  it.each(['run', 'parallel'] as const)('rejects a parallel overlap with an existing %s on the same walk', async mode => {
    const runtime = createActionRuntime();
    const task = deferred();
    const a = connected(runtime, 'parallel.overlap', () => task.promise);
    const walk = beginWalk(runtime, 'agent');
    const pending = walk[mode]([{ action: a.action }]);
    try {
      await expect(walk.parallel([{ action: a.action }])).rejects.toThrow(/active|overlap|running|flight/i);
      if (mode === 'parallel') await expect(walk.run([{ action: a.action }])).rejects.toThrow(/active|overlap|running|flight/i);
    } finally { task.resolve(); await pending; }
    expect((await walk.parallel([{ action: a.action }])).completed).toBe(true);
  });

  it('retains the legacy allowance for two serial run calls on the same walk', async () => {
    const runtime = createActionRuntime();
    const task = deferred();
    const a = connected(runtime, 'parallel.legacy-run-a', () => task.promise);
    const b = connected(runtime, 'parallel.legacy-run-b', () => 'done');
    const walk = beginWalk(runtime, 'agent');
    const pending = walk.run([{ action: a.action }]);
    try { expect((await walk.run([{ action: b.action }])).completed).toBe(true); }
    finally { task.resolve(); await pending; }
  });

  it('an observer cannot re-enter a parallel walk before the current manifest has landed', async () => {
    const runtime = createActionRuntime();
    const a = connected(runtime, 'parallel.observer-reentry', () => 'done');
    const walk = beginWalk(runtime, 'agent');
    let nested: Promise<unknown> | undefined;
    const manifest = await walk.parallel([{ action: a.action }], {
      onRow: () => { nested = walk.parallel([{ action: a.action }]).catch(error => error); },
    });
    expect(await nested).toBeInstanceOf(Error);
    expect(manifest.completed).toBe(true);
    expect(runtime.transitions()).toHaveLength(1);
    expect(walk.record().manifests).toHaveLength(1);
  });
});

describe('the existing serial turn boundaries remain unchanged', () => {
  it('dispatches the next synchronous action before an app change queued two microtasks later', async () => {
    const runtime = createActionRuntime();
    const events: string[] = [];
    let enabled = true;
    const a = connected(runtime, 'parallel.serial-timing-a', () => { events.push('A'); });
    const b = defineAction('parallel.serial-timing-b', {
      does: 'Still enabled at its original turn', invocation: 'inputless', mutate: () => { events.push('B'); },
    });
    connectAction(runtime, b, { node: 'parallel', enabled: () => enabled });
    const running = beginWalk(runtime, 'agent').run([{ action: a.action }, { action: b }], {
      onRow: row => { events.push(`row${row.step}:${row.status}`); },
    });
    Promise.resolve().then(() => {
      Promise.resolve().then(() => { enabled = false; events.push('disabled B'); });
    });
    const manifest = await running;
    expect(events).toEqual(['A', 'row0:ran', 'B', 'disabled B', 'row1:ran']);
    expect(manifest.completed).toBe(true);
    expect(manifest.execution).toBeUndefined();
  });

  it('publishes a synchronous protocol refusal before the serial caller continues', async () => {
    const runtime = createActionRuntime();
    const action = defineAction('parallel.serial-missing-payload', {
      does: 'An open call requires a payload', invocation: 'scalar',
      inputSchema: { safeParse: (value: unknown) => ({ success: true as const, data: value }) },
      mutate: (value: unknown) => value,
    });
    connectAction(runtime, action, { node: 'parallel' });
    const events: string[] = [];
    const running = beginWalk(runtime, 'agent').run([{ action }], { onRow: () => { events.push('row'); } });
    events.push('caller');
    const manifest = await running;
    expect(events).toEqual(['row', 'caller']);
    expect(manifest.rows[0]!.status).toBe('refused');
    expect(manifest.completed).toBe(false);
  });

  it('a throwing serial observer getter remains isolated after the action runs', async () => {
    const runtime = createActionRuntime();
    let calls = 0, observerReads = 0;
    const action = connected(runtime, 'parallel.serial-observer-getter', () => { calls++; });
    const walk = beginWalk(runtime, 'agent');
    const manifest = await walk.run([{ action: action.action }], {
      get onRow(): never { observerReads++; throw new Error('broken observer getter'); },
    });
    expect(calls).toBe(1);
    expect(observerReads).toBe(1);
    expect(manifest.completed).toBe(true);
    expect(manifest.rows[0]!.status).toBe('ran');
    expect(walk.record().manifests).toEqual([manifest]);
  });
});

describe('progress and effect evidence stay on their own rails', () => {
  it('finishes the manifest at invocation completion while declared effects remain unverified', async () => {
    const runtime = createActionRuntime();
    const task = deferred();
    const observedStages: string[] = [];
    let reportSaved: (() => void) | undefined;
    const action = defineAction('parallel.progress', {
      does: 'Write with declared progress', invocation: 'inputless',
      settle: { writes: ['saved'], progress: { stages: ['working', 'finished'] } },
      mutate: lifecycle => {
        lifecycle?.reportProgress('working');
        return task.promise.then(() => { lifecycle?.reportProgress('finished'); return 'invoked'; });
      },
    });
    connectAction(runtime, action, {
      node: 'parallel', coverage: 'verifiable',
      onInvocation: (invocation, settlement) => {
        reportSaved = () => { settlement.settle({ status: 'verified', evidence: 'the application reported saved' }); };
        invocation.progress?.subscribe(snapshot => {
          for (const row of snapshot.observed) if (!observedStages.includes(row.stage)) observedStages.push(row.stage);
        });
      },
    });
    const pending = beginWalk(runtime, 'agent').parallel([{ action }]);
    expect(observedStages).toEqual(['working']);
    task.resolve();
    const manifest = await pending;
    expect(manifest.completed).toBe(true);
    expect(observedStages).toEqual(['working', 'finished']);
    const ref = manifest.rows[0]!.transition!;
    expect(runtime.transitionFor(ref)?.effectStatus).toBe('unverified');
    expect(runtime.transitionFor(ref)?.progress?.disposition).toBe('closed');
    if (!reportSaved) throw new Error('the invocation observer should own its settlement handle');
    reportSaved();
    expect(runtime.transitionFor(ref)?.effectStatus).toBe('verified');
  });

  it('adds a typed parallel capability without requiring it on legacy ActionWalk implementations', () => {
    const runtime = createActionRuntime();
    const walk = beginWalk(runtime, 'agent');
    expectTypeOf(walk).toExtend<ActionWalkWithParallel>();
    expectTypeOf(walk).toExtend<ActionWalk>();
    const action = connected(runtime, 'parallel.types', () => 'done').action;
    const valid: readonly ActionParallelStep[] = [{ action, instance: 'known', input: { value: 1 } }];
    const compileOnly = () => {
      void walk.parallel(valid, { concurrency: 2, onRow: (_row: ActionPlanRow) => undefined });
      // @ts-expect-error Independent parallel steps do not carry earlier outputs.
      void walk.parallel([{ action, carry: { from: 0 } }]);
      const serial = { action, carry: { from: 0 } };
      // @ts-expect-error The exclusion also holds for a predeclared variable, not only fresh literals.
      void walk.parallel([serial]);
      const legacy: ActionWalk = { ref: walk.ref, run: walk.run, interrupt: walk.interrupt, record: walk.record };
      void legacy;
    };
    expect(typeof compileOnly).toBe('function'); // compile-time probes above deliberately never dispatch
  });
});
