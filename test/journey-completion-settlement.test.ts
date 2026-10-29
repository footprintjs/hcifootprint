/**
 * A committed occurrence is not a completed journey while its handler is still
 * running. Exercise the public serving and Session doors together: the task word,
 * per-step counts and the settlement answer must describe the same attempt.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, contextful, serveToAgent } from '../src/index.js';
import type { ServeResult } from '../src/index.js';
import { FakeAnchor, humanClick } from './contextful-fixture.js';

function deferred() {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function oneStep(handler: () => unknown, opts: { confirm?: boolean; guarded?: boolean } = {}) {
  const graph = buildNavigationGraph('workflow', {
    pages: { home: { actions: { save: {
      does: 'Save the document',
      ...(opts.confirm ? { confirm: true } : {}),
      ...(opts.guarded ? { when: { allowed: { eq: true } } } : {}),
    } } } },
    journeys: { save: { does: 'Save the document', steps: ['save'] } },
  });
  const session = graph.createSession({
    node: 'home',
    state: { allowed: true },
    onWarn: () => undefined,
    ...(opts.confirm ? { requireHumanApproval: true } : {}),
  });
  session.registerActions('home', { handlers: { save: handler } });
  return { session, port: serveToAgent(session) };
}

function transitionId(result: ServeResult): string {
  expect(result['ok']).toBe(true);
  const id = result['transitionId'];
  if (typeof id !== 'string') throw new Error('expected an executed fire');
  return id;
}

function readyIds(result: ServeResult): string[] {
  const rows = result['readySteps'];
  if (!Array.isArray(rows)) throw new Error('expected an open journey frame');
  return rows.map(row => row.step as string);
}

describe('journey completion follows the current invocation, not an early commit', () => {
  it('a pending no-writes step is neither done nor offered for another fire', async () => {
    const task = deferred();
    const { session, port } = oneStep(() => task.promise);
    const fired = port.call('workflow.journey.save', { step: 'save' });
    const id = transitionId(fired);
    try {
      expect(fired).toMatchObject({ frame: 'open', standing: 'in-progress', effectStatus: 'pending' });
      expect(fired['awaitingSettlement']).toEqual([id]);
      expect(fired['settleWith']).toEqual({ tool: 'workflow.did_it_work', arg: 'transitionId' });
      expect(fired).not.toHaveProperty('awaitingState'); // this fire is waiting for its handler, not a state report
      expect(readyIds(fired)).not.toContain('home.save');
      const lookedAgain = port.call('workflow.journey.save');
      expect(lookedAgain['frame']).toBe('open');
      expect(lookedAgain['awaitingSettlement']).toEqual([id]);
      expect(lookedAgain['settleWith']).toEqual({ tool: 'workflow.did_it_work', arg: 'transitionId' });
      expect(lookedAgain['howToAct']).toContain('workflow.did_it_work');
      expect(lookedAgain['howToAct']).toContain('Do not perform them again');
      expect(lookedAgain['howToAct']).not.toContain('one of readySteps');
      expect(readyIds(lookedAgain)).not.toContain('home.save');
      expect(session.journeyStanding('save')).toMatchObject({
        standing: 'in-progress', evidence: { step: 'home.save', stepsDone: 0, stepsTotal: 1 },
      });
      expect(port.call('workflow.whats_here')['brief']).toContain('(0/1 steps done)');
      expect(session.frames()).toEqual([]);
      expect(port.call('workflow.did_it_work', { transitionId: id }))
        .toMatchObject({ settled: false, judgment: 'still-pending' });
    } finally {
      task.resolve();
      await session.settlementOf(id);
    }
  });

  it.each(['rejects', 'returns a refusal'] as const)('an async handler that %s leaves failed, never completed', async failure => {
    const task = deferred();
    const { session, port } = oneStep(() => task.promise);
    const id = transitionId(port.call('workflow.journey.save', { step: 'save' }));
    if (failure === 'rejects') task.reject(new Error('save failed'));
    else task.resolve({ ok: false, error: 'save refused' });
    await session.settlementOf(id);

    expect(port.call('workflow.did_it_work', { transitionId: id }))
      .toMatchObject({ settled: true, effectStatus: 'refused', outcome: 'rolled-back' });
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'failed', evidence: { step: 'home.save', transitionId: id, stepsDone: 0, stepsTotal: 1 },
    });
    expect(session.journeyFrame()?.status).toBe('open');
    expect(session.frames().some(frame => frame.status === 'completed')).toBe(false);
    expect(port.call('workflow.journey.save')).toMatchObject({ frame: 'open', standing: 'failed' });
  });

  it('normal handler completion finishes an unobservable contract without inventing verification', async () => {
    const task = deferred();
    const { session, port } = oneStep(() => task.promise);
    const id = transitionId(port.call('workflow.journey.save', { step: 'save' }));
    task.resolve('saved');
    await expect(session.settlementOf(id)).resolves.toMatchObject({
      effectStatus: 'performed', outcome: 'committed', transition: { effectVerified: 'unobservable' },
    });
    expect(session.journeyStanding('save')).toEqual({
      journeyId: 'save', standing: 'done', evidence: { stepsDone: 1, stepsTotal: 1 },
    });
    expect(port.call('workflow.journey.save')).toMatchObject({ frame: 'completed', standing: 'done', judgment: 'done' });
    expect(session.frames()).toHaveLength(1);
  });

  it('a fulfilled handler does not complete a step whose declared verification failed', async () => {
    const task = deferred();
    const graph = buildNavigationGraph('workflow', {
      pages: { home: { actions: { save: { does: 'Save', verify: { saved: { eq: true } } } } } },
      journeys: { save: { does: 'Save once', steps: ['save'] } },
    });
    const session = graph.createSession({ node: 'home', state: { saved: false }, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => task.promise } });
    const port = serveToAgent(session);
    const id = transitionId(port.call('workflow.journey.save', { step: 'save' }));
    task.resolve('handler returned, but the declared postcondition did not hold');
    await expect(session.settlementOf(id)).resolves.toMatchObject({ effectStatus: 'refused', verifyHeld: false });
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'failed', evidence: { transitionId: id, stepsDone: 0, stepsTotal: 1 },
    });
    expect(session.frames()).toEqual([]);
  });

  it.each(['unfired', 'pending'] as const)('explicit completion refuses an %s frame without closing it', async state => {
    const task = deferred();
    const { session } = oneStep(() => task.promise);
    session.commitJourney('save');
    const fired = state === 'pending' ? session.fire('home.save', { source: 'agent' }) : undefined;
    if (fired && !fired.ok) throw new Error('the save should have been fireable');
    try {
      expect(() => session.leaveJourney({ reason: 'completed' })).toThrow(/complete|pending|settle/i);
      expect(session.journeyFrame()?.status).toBe('open');
      expect(session.frames()).toEqual([]);
    } finally {
      task.resolve();
      if (fired?.ok) await fired.whenSettled;
    }
    if (fired?.ok) expect(session.leaveJourney({ reason: 'completed' })?.status).toBe('completed');
  });

  it('a new frame starts from zero even when an older pass completed', async () => {
    const next = deferred();
    let attempts = 0;
    const { session, port } = oneStep(() => ++attempts === 1 ? 'first saved' : next.promise);
    session.commitJourney('save');
    const first = session.fire('home.save', { source: 'agent' });
    if (!first.ok) throw new Error('the first save should be fireable');
    await first.whenSettled;
    expect(session.leaveJourney()?.status).toBe('completed');
    expect(port.call('workflow.journey.save')['frame']).toBe('open');
    const second = transitionId(port.call('workflow.journey.save', { step: 'save' }));
    try {
      expect(session.journeyStanding('save')).toMatchObject({
        standing: 'in-progress', evidence: { stepsDone: 0, stepsTotal: 1 },
      });
      expect(session.frames()).toHaveLength(1);
    } finally {
      next.resolve('second saved');
      await session.settlementOf(second);
    }
    expect(port.call('workflow.journey.save')['frame']).toBe('completed');
    expect(session.frames()).toHaveLength(2);
  });

  it('a late state report from a cancelled pass cannot complete the newly opened frame', async () => {
    const graph = buildNavigationGraph('workflow', {
      pages: { home: { actions: { save: { does: 'Save', writes: ['saved'] } } } },
      journeys: { save: { does: 'Save once', steps: ['save'] } },
    });
    const session = graph.createSession({ node: 'home', state: { saved: false }, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => undefined } });
    session.commitJourney('save');
    const old = session.fire('home.save', { source: 'agent' });
    if (!old.ok) throw new Error('the old save should have been fireable');
    expect(old.effectStatus).toBe('pending');
    session.leaveJourney({ reason: 'cancelled' });
    expect(session.commitJourney('save').ok).toBe(true);

    session.updateState({ saved: true }, { transitionId: old.transition.id });
    await old.whenSettled;
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'in-progress', evidence: { stepsDone: 0, stepsTotal: 1 },
    });
    expect(serveToAgent(session).call('workflow.journey.save')['frame']).toBe('open');
    expect(session.leaveJourney()?.status).toBe('cancelled');
    expect(session.frames().map(frame => frame.status)).toEqual(['cancelled', 'cancelled']);
  });

  it('a live rollback stops counting success without rewriting the first settlement receipt', async () => {
    const { session } = oneStep(() => 'saved');
    session.commitJourney('save');
    const fired = session.fire('home.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the save should have been fireable');
    const receipt = await fired.whenSettled;
    expect(receipt).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expect(session.journeyStanding('save').standing).toBe('done');

    session.reject(fired.transition.id);
    expect(session.settlementIfKnown(fired.transition.id)).toEqual(receipt);
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'failed', evidence: { transitionId: fired.transition.id, stepsDone: 0, stepsTotal: 1 },
    });
    expect(session.leaveJourney()?.status).toBe('cancelled');
  });

  it('a later inferred row cannot hide the actual declared-write attempt that rolled back', async () => {
    const graph = buildNavigationGraph('workflow', {
      pages: { home: { actions: { save: { does: 'Save', writes: ['saved'] } } } },
      journeys: { save: { does: 'Save once', steps: ['save'] } },
    });
    const session = graph.createSession({ node: 'home', state: { saved: false }, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => undefined } });
    session.commitJourney('save');
    const fired = session.fire('home.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the save should have been fireable');
    session.updateState({ saved: true }, { transitionId: fired.transition.id });
    const receipt = await fired.whenSettled;
    expect(receipt).toMatchObject({ effectStatus: 'performed', outcome: 'committed' });
    expect(session.journeyStanding('save').standing).toBe('done');

    session.reject(fired.transition.id);
    session.updateState({ saved: false }); // the signature match is an inference, not a successful new actual attempt
    expect(session.transitions().at(-1)?.cause.inferred).toBe(true);
    expect(session.settlementIfKnown(fired.transition.id)).toEqual(receipt);
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'failed', evidence: { transitionId: fired.transition.id, stepsDone: 0, stepsTotal: 1 },
    });
    expect(session.journeyPlan('save').steps[0].status).not.toBe('done');
    expect(session.journeyPlan('save').steps[0].status).not.toBe('inferred-done');
    expect(session.leaveJourney()?.status).toBe('cancelled');
  });

  it('a real pending or refused attempt supersedes an earlier inferred completion', async () => {
    const task = deferred();
    const graph = buildNavigationGraph('workflow', {
      pages: { home: { actions: { save: { does: 'Save', writes: ['saved'] } } } },
      journeys: { save: { does: 'Save once', steps: ['save'] } },
    });
    const session = graph.createSession({ node: 'home', state: { saved: false }, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => task.promise } });
    session.commitJourney('save');
    session.updateState({ saved: true });
    expect(session.journeyPlan('save').steps[0].status).toBe('inferred-done');
    const fired = session.fire('home.save', { source: 'agent' });
    if (!fired.ok) throw new Error('the real save should have been fireable');
    try {
      expect(fired.effectStatus).toBe('pending');
      expect(session.journeyStanding('save')).toMatchObject({
        standing: 'in-progress', evidence: { stepsDone: 0, stepsTotal: 1 },
      });
    } finally {
      task.resolve({ ok: false, error: 'the actual save was refused' });
      await fired.whenSettled;
    }
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'failed', evidence: { transitionId: fired.transition.id, stepsDone: 0, stepsTotal: 1 },
    });
    expect(session.frames()).toEqual([]);
  });

  it('two independently ready actions count only settled invocations and need no artificial order lock', async () => {
    const first = deferred(), second = deferred();
    const graph = buildNavigationGraph('workflow', {
      pages: { home: { actions: { prepare: { does: 'Prepare' }, save: { does: 'Save' } } } },
      journeys: { both: { does: 'Prepare and save', steps: ['prepare', 'save'] } },
    });
    const session = graph.createSession({ node: 'home', onWarn: () => undefined });
    session.registerActions('home', { handlers: { prepare: () => first.promise, save: () => second.promise } });
    const port = serveToAgent(session);
    const a = transitionId(port.call('workflow.journey.both', { step: 'prepare' }));
    const ready = port.call('workflow.journey.both');
    expect(readyIds(ready)).toContain('home.save'); // declared order remains preference, not a new execution gate
    const b = transitionId(port.call('workflow.journey.both', { step: 'save' }));
    try {
      expect(session.journeyStanding('both').evidence).toMatchObject({ stepsDone: 0, stepsTotal: 2 });
      expect(port.call('workflow.whats_here')['brief']).toContain('(0/2 steps done)');
      expect(readyIds(port.call('workflow.journey.both'))).toEqual([]);
      first.resolve();
      await session.settlementOf(a);
      expect(session.journeyStanding('both')).toMatchObject({
        standing: 'in-progress', evidence: { step: 'home.save', stepsDone: 1, stepsTotal: 2 },
      });
      expect(port.call('workflow.whats_here')['brief']).toContain('(1/2 steps done)');
    } finally {
      first.resolve();
      second.resolve();
      await Promise.all([session.settlementOf(a), session.settlementOf(b)]);
    }
    expect(session.journeyStanding('both')).toMatchObject({ standing: 'done', evidence: { stepsDone: 2, stepsTotal: 2 } });
  });

  it('inferred completion stays explicit and still counts under the existing contract', () => {
    const graph = buildNavigationGraph('workflow', {
      pages: { home: { actions: { save: { does: 'Save', writes: ['saved'] } } } },
      journeys: { save: { does: 'Save once', steps: ['save'] } },
    });
    const session = graph.createSession({ node: 'home', state: { saved: false }, onWarn: () => undefined });
    session.registerActions('home', { handlers: { save: () => undefined } });
    session.commitJourney('save');
    session.updateState({ saved: true });
    expect(session.journeyPlan('save').steps[0].status).toBe('inferred-done');
    expect(session.journeyStanding('save')).toMatchObject({ standing: 'done', evidence: { stepsDone: 1, stepsTotal: 1 } });
    expect(session.journeyFrame()?.inferredSteps).toEqual(['home.save']);
  });

  it('a sensed human click keeps its existing completed-unobservable meaning', async () => {
    let calls = 0;
    const { session } = oneStep(() => { calls++; });
    const anchor = new FakeAnchor();
    const release = session.sense('home.save', contextful.sense(anchor));
    try {
      session.commitJourney('save');
      humanClick(anchor);
      const row = session.transitions().find(transition => transition.cause.affordanceId === 'home.save');
      if (!row) throw new Error('the trusted click should have produced its record-only fire');
      expect(row.cause).toMatchObject({ kind: 'fired', principal: 'user', inferred: true });
      expect(row.attribution.basis).toBe('sensed-click');
      await expect(session.settlementOf(row.id)).resolves.toMatchObject({
        effectStatus: 'unobservable', outcome: 'committed',
      });
      expect(calls).toBe(0); // the sensor records the person's action; it never executes the handler
      expect(session.journeyPlan('save').steps[0].status).toBe('done');
      expect(session.journeyStanding('save')).toMatchObject({ standing: 'done', evidence: { stepsDone: 1, stepsTotal: 1 } });
      expect(session.leaveJourney()?.status).toBe('completed');
    } finally {
      release();
    }
  });

  it('an approval hold is neither successful completion nor an invocation failure', () => {
    let calls = 0;
    const { session, port } = oneStep(() => { calls++; }, { confirm: true });
    expect(port.call('workflow.journey.save', { step: 'save' })['judgment']).toBe('needs-confirm');
    expect(port.call('workflow.journey.save', { step: 'save', confirm: true })['reason']).toBe('APPROVAL_REQUIRED');
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'awaiting-human', evidence: { stepsDone: 0, stepsTotal: 1 },
    });
    expect(calls).toBe(0);
    expect(session.frames()).toEqual([]);
  });

  it('a guard refusal is a blocked step, not a failed or completed execution', () => {
    let calls = 0;
    const { session, port } = oneStep(() => { calls++; }, { guarded: true });
    port.call('workflow.journey.save');
    session.updateState({ allowed: false }, { principal: 'system' });
    expect(port.call('workflow.journey.save', { step: 'save' })['reason']).toBe('GUARD_FAILED');
    expect(session.journeyStanding('save')).toMatchObject({
      standing: 'blocked', evidence: { stepsDone: 0, stepsTotal: 1 },
    });
    expect(calls).toBe(0);
    expect(session.frames()).toEqual([]);
  });
});
