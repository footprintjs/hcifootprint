/**
 * D18 phase 1 — the two verified v1 rung-killers, fixed with honesty markers.
 *
 * 1. Guards over never-reported state keys used to silently hide tools (and
 *    make availableSkills lie). Now: served WITH `guardUnevaluated`.
 * 2. A declared-writes fire on a session with no state tap stayed pending
 *    forever. Now: settles on handler completion (or immediately when nothing
 *    executes) with effectVerified 'unobservable'.
 *
 * Both fixes let ONE authored graph work at every rung of the adoption ladder
 * (L0 router-only → L2 full state tap) without a second stripped copy.
 */
import { describe, expect, it } from 'vitest';
import { skillGraph } from '../src/index.js';
import type { Binding } from '../src/index.js';
import { shop, initialState } from './fixture.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function taplessGraph() {
  return skillGraph('g')
    .page('a')
    .affordance('save', { on: 'a', description: 'Save', binding, effect: { writes: ['saved'] } })
    .affordance('guarded', { on: 'a', description: 'G', binding, guard: { vip: { eq: true } }, effect: { writes: ['x'] } })
    .skill('flow', { description: 'Flow', steps: ['save'], precondition: { ready: { eq: true } } })
    .build();
}

describe('rung-killer 1 — unevaluable guards serve with a marker', () => {
  it('no state at all (L0): every guarded edge is offered, marked, and fireable', () => {
    const s = taplessGraph().createSession({ node: 'a' });
    const edge = s.available().edges.find((e) => e.affordanceId === 'guarded')!;
    expect(edge.guardUnevaluated).toEqual(['vip']);
    const fired = s.fire('guarded', { source: 'agent' });
    expect(fired.ok).toBe(true); // the app is the enforcer at this rung
    // …and the RECORD says which conditions were taken on faith:
    expect((fired as { transition: { guardUnevaluated?: string[] } }).transition.guardUnevaluated).toEqual(['vip']);
  });

  it('availableSkills reports preconditionUnevaluable instead of lying pre=false', () => {
    const s = taplessGraph().createSession({ node: 'a' });
    const skill = s.availableSkills().skills[0];
    expect(skill.preconditionPassed).toBe(true); // evaluable part (empty) passes
    expect(skill.preconditionUnevaluable).toEqual(['ready']);
  });

  it('skillPlan marks unevaluable steps ready-with-marker, not blocked', () => {
    const s = taplessGraph().createSession({ node: 'a' });
    s.commitSkill('flow');
    const step = s.skillPlan('flow').steps[0];
    expect(step.status).toBe('ready');
  });

  it('a PRESENT key still evaluates for real — partial state narrows honestly', () => {
    const s = taplessGraph().createSession({ node: 'a', state: { vip: false } });
    // vip is reported (false) → real evaluation hides the edge; no marker.
    expect(s.available().edges.map((e) => e.affordanceId)).toEqual(['save']);
    expect(s.fire('guarded', { source: 'agent' })).toMatchObject({ ok: false, reason: 'GUARD_FAILED' });
  });

  it('a mixed guard: evaluable conditions decide, absent keys are listed', () => {
    const g = skillGraph('g')
      .page('a')
      .affordance('both', {
        on: 'a',
        description: 'B',
        binding,
        guard: { present: { eq: true }, missing: { gt: 3 } },
      })
      .build();
    const s = g.createSession({ node: 'a', state: { present: true } });
    const edge = s.available().edges[0];
    expect(edge.affordanceId).toBe('both');
    expect(edge.guardUnevaluated).toEqual(['missing']);
    // flip the evaluable condition → hidden for the REAL reason
    s.updateState({ present: false }, { stimulus: 'push' });
    expect(s.available().edges).toEqual([]);
  });
});

describe('rung-killer 2 — tapless sessions settle instead of pending forever', () => {
  it('no tap, no handler: a declared-writes fire settles immediately as unobservable', () => {
    const s = taplessGraph().createSession({ node: 'a' });
    const fired = s.fire('save', { source: 'agent' });
    expect(fired).toMatchObject({ ok: true, settlement: 'settled' });
    expect((fired as { transition: { outcome: string; effectVerified?: unknown } }).transition).toMatchObject({
      outcome: 'committed',
      effectVerified: 'unobservable',
    });
    expect(s.pending()).toEqual([]);
  });

  it('no tap, WITH handler: settles on handler completion — frames can finish', async () => {
    const s = taplessGraph().createSession({ node: 'a' });
    let ran = false;
    s.registerTools({ group: 'g', tools: { save: async () => { ran = true; } } });
    const fired = s.fire('save', { source: 'agent' });
    expect(fired).toMatchObject({ ok: true, settlement: 'awaiting-state' });
    expect(s.pending()).toHaveLength(1);
    await tick();
    expect(ran).toBe(true);
    expect(s.pending()).toEqual([]); // handler completion WAS the settlement signal
    const record = s.transitions().find((t) => t.cause.affordanceId === 'save')!;
    expect(record.outcome).toBe('committed');
    expect(record.effectVerified).toBe('unobservable');
  });

  it('no tap, handler THROWS: still rejects — a failed action never lies committed', async () => {
    const s = taplessGraph().createSession({ node: 'a', onWarn: () => undefined });
    s.registerTools({ group: 'g', tools: { save: () => { throw new Error('boom'); } } });
    s.fire('save', { source: 'agent' });
    await tick();
    const record = s.transitions().find((t) => t.cause.affordanceId === 'save')!;
    expect(record.outcome).toBe('rejected');
  });

  it('providing state implies a tap (v1 behavior unchanged); stateTap:false overrides', () => {
    const withState = shop().createSession({ node: 'catalog', state: initialState });
    withState.fire('login', { source: 'user' });
    expect(withState.pending()).toHaveLength(1); // classic awaiting-updateState

    const optedOut = shop().createSession({ node: 'catalog', state: initialState, stateTap: false });
    optedOut.fire('login', { source: 'user' });
    expect(optedOut.pending()).toEqual([]); // settled unobservably
  });
});
