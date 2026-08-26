import { describe, expect, it } from 'vitest';
import {
  REQUEST_LIFECYCLE,
  createActionRuntime,
  declareKinds,
} from '../src/index.js';

/**
 * REQUEST — the HITL input lifecycle. Two laws proven in the reference app
 * before they were library features: the OFFERED-SET LAW (an answer outside
 * the offered list refuses, names the list, and the request STAYS OPEN) and
 * ABSENCE IS ESTABLISHED, NEVER ASSUMED (a request ends by answer, decline,
 * withdrawal, or explicit authority — never by inference from silence).
 */

const governedRuntime = () =>
  createActionRuntime({
    kinds: declareKinds({ 'deploy.environment': { docs: 'where it lands' } }),
  });

const ask = (runtime = governedRuntime()) =>
  runtime.requestInput({
    question: 'Which environment should this deploy land in?',
    of: 'deploy.environment',
    from: 'user',
    offered: ['staging', 'production'],
  });

describe('the offered-set law', () => {
  it('refuses an unoffered value NAMING the list, and the request stays open for the real answer', () => {
    const request = ask();
    expect(() => request.answer('prod', 'user')).toThrow(
      /'prod' was never offered .* offered values are: 'staging', 'production'.* still open/s,
    );
    // The refused attempt cost nothing — the real answer still lands.
    expect(request.snapshot().state).toBe('open');
    const settled = request.answer('production', 'user');
    expect(settled.state).toBe('answered');
    expect(settled.answer).toBe('production');
  });

  it('duplicate offered values and label-only choices are refused at open', () => {
    const runtime = governedRuntime();
    expect(() =>
      runtime.requestInput({
        question: 'q',
        of: 'deploy.environment',
        from: 'user',
        offered: ['staging', 'staging'],
      }),
    ).toThrow(/offers 'staging' twice/);
    expect(() =>
      runtime.requestInput({
        question: 'q',
        of: 'deploy.environment',
        from: 'user',
        offered: [{ value: '', label: 'Staging' }],
      }),
    ).toThrow(/a label alone resumes nothing/);
  });
});

describe('who may settle, and how', () => {
  it('only the asked principal answers or declines; the requester door is withdraw()', () => {
    const request = ask();
    expect(() => request.answer('staging', 'agent')).toThrow(
      /asks 'user' — an answer from 'agent' is not that person's answer/,
    );
    expect(() => request.decline('agent', 'not my call')).toThrow(
      /only they may decline it. The requester's door is withdraw\(\)/,
    );
    const settled = request.decline('user', 'neither — we froze deploys today');
    expect(settled.state).toBe('declined');
    expect(settled.declineReason).toBe('neither — we froze deploys today');
  });

  it('decline and withdraw both require a reason; abandon requires an explicit authority', () => {
    expect(() => ask().decline('user', '')).toThrow(/needs a reason/);
    expect(() => ask().withdraw('')).toThrow(
      /the person mid-decision deserves to know why the question left/,
    );
    // Silence is never established by inference.
    expect(() => (ask() as any).abandon(undefined)).toThrow(
      /needs an explicit authority/,
    );
    const settled = ask().abandon({
      kind: 'deadline',
      detail: 'turn budget exhausted after 120s',
    });
    expect(settled.state).toBe('abandoned');
    expect(settled.authority?.kind).toBe('deadline');
  });

  it('whenSettled resolves with the terminal snapshot, whichever terminal it is', async () => {
    const request = ask();
    const settling = request.whenSettled;
    request.withdraw('the plan changed before you answered');
    const settled = await settling;
    expect(settled.state).toBe('withdrawn');
    expect(settled.withdrawReason).toBe('the plan changed before you answered');
  });
});

describe('first terminal wins — and the loser is KEPT', () => {
  it('a late answer after the terminal is quoted, never adopted, never reopening', () => {
    const request = ask();
    request.answer('staging', 'user');
    const after = request.answer('production', 'user');
    expect(after.state).toBe('answered');
    expect(after.answer).toBe('staging');
    expect(after.lateAnswers).toHaveLength(1);
    expect(after.lateAnswers?.[0]?.claimed).toBe('answered');
    expect(after.lateAnswers?.[0]?.payload).toBe('production');
    // Absent-not-empty: a request with no late answers does not claim it watched.
    expect(ask().snapshot().lateAnswers).toBeUndefined();
  });
});

describe('governance and routing', () => {
  it('the asked-for kind is governed exactly like every other kind', () => {
    expect(() =>
      governedRuntime().requestInput({
        question: 'q',
        of: 'deploy.enviroment',
        from: 'user',
        offered: ['staging'],
      }),
    ).toThrow(/which the mounted catalog does not govern/);
  });

  it('surface routing is recorded at open; a miss is a counted gap, never a blocked question', () => {
    const runtime = governedRuntime();
    // No surface collects the kind yet — the request proceeds, the gap counts.
    const unrouted = ask(runtime);
    expect(unrouted.snapshot().surfaces).toEqual([]);
    expect(
      runtime.channelGaps().find((gap) => gap.kind === 'deploy.environment')
        ?.asks,
    ).toBe(1);
    unrouted.withdraw('routing test done');

    const handle = runtime.declareSurface({
      surface: 'deploy.picker',
      node: 'deploy',
      collects: ['deploy.environment'],
    });
    const routed = ask(runtime);
    expect(routed.snapshot().surfaces.map((s) => s.surface)).toEqual([
      'deploy.picker',
    ]);
    routed.withdraw('routing test done');
    handle.retire();
  });

  it('openRequests() lists only the still-open, oldest first', () => {
    const runtime = governedRuntime();
    const first = ask(runtime);
    const second = ask(runtime);
    expect(runtime.openRequests().map((r) => r.ref.requestId)).toEqual([
      first.ref.requestId,
      second.ref.requestId,
    ]);
    first.answer('staging', 'user');
    expect(runtime.openRequests().map((r) => r.ref.requestId)).toEqual([
      second.ref.requestId,
    ]);
    second.withdraw('done listing');
    expect(runtime.openRequests()).toEqual([]);
  });
});

describe('the chart is published — the same table the mover enforces', () => {
  it('REQUEST_LIFECYCLE names the states, terminals, and edges tests and surfaces read', () => {
    expect(REQUEST_LIFECYCLE.states[0]).toBe('open');
    expect(REQUEST_LIFECYCLE.terminals).toEqual([
      'answered',
      'declined',
      'withdrawn',
      'abandoned',
    ]);
    // Every edge leaves 'open' — four doors out, none back in.
    expect(REQUEST_LIFECYCLE.edges.every((edge) => edge.from === 'open')).toBe(
      true,
    );
  });
});
