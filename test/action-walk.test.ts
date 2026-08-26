import { describe, expect, it } from 'vitest';
import {
  beginWalk,
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * LAYER 2 — the walk. Many actions as one correlated route, admitted up
 * front, executed with no model call between steps, and answered with a
 * MANIFEST because screen actions cannot be rolled back: partial execution
 * must be legible, never summarized as "failed".
 */

describe('walk admission — checked from declarations, before anything runs', () => {
  it('an agent may not pre-plan a decision it does not own — refused at plan time, with nothing executed', async () => {
    let performed = 0;
    const choose = defineAction('walk.human-owned', {
      does: 'A choice whose owner is the person',
      invocation: 'inputless',
      principal: { decisionOwner: 'human' },
      mutate: () => {
        performed += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, choose, { node: 'walk' });

    const walk = beginWalk(runtime, 'agent');
    await expect(walk.run([{ action: choose }])).rejects.toThrow(
      /may not pre-plan a decision it does not own/,
    );
    expect(performed).toBe(0);

    // The same step is ADMITTED for the principal that owns the decision —
    // the law is about ownership, not about batching being dangerous.
    const owner = beginWalk(runtime, 'user');
    const manifest = await owner.run([{ action: choose }]);
    expect(manifest.completed).toBe(true);
    expect(performed).toBe(1);
  });

  it('a carry must come from a DECLARED output of an earlier step — never both stated and carried', async () => {
    const bare = defineAction('walk.no-produces', {
      does: 'Produces nothing on the record',
      invocation: 'inputless',
      mutate: () => 'accidental value',
    });
    const eats = defineAction('walk.consumer', {
      does: 'Consumes a payload',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (value: unknown) => value,
    });
    const runtime = createActionRuntime();
    connectAction(runtime, bare, { node: 'walk' });
    connectAction(runtime, eats, { node: 'walk' });
    const walk = beginWalk(runtime, 'agent');

    await expect(
      walk.run([{ action: bare }, { action: eats, carry: { from: 0 } }]),
    ).rejects.toThrow(/declares no produces/);
    await expect(
      walk.run([{ action: bare }, { action: eats, carry: { from: 1 } }]),
    ).rejects.toThrow(/not an EARLIER step/);
    await expect(
      walk.run([
        { action: bare },
        { action: eats, carry: { from: 0 }, input: 'also stated' },
      ]),
    ).rejects.toThrow(/stated or carried, never both/);
  });

  it('mayInvoke is refused at plan time rather than at step three of a half-executed screen', async () => {
    const humanOnly = defineAction('walk.human-only', {
      does: 'Only a person may fire this',
      invocation: 'inputless',
      principal: { mayInvoke: ['human'] },
      mutate: () => 'done',
    });
    const runtime = createActionRuntime();
    connectAction(runtime, humanOnly, { node: 'walk' });
    await expect(
      beginWalk(runtime, 'agent').run([{ action: humanOnly }]),
    ).rejects.toThrow(/refused at plan time/i);
  });
});

describe('walk execution — every step re-derives its own truth', () => {
  it('chains three steps, carrying a declared output, into one completed manifest', async () => {
    const seen: string[] = [];
    const find = defineAction('walk.find', {
      does: 'Find the subject',
      invocation: 'inputless',
      produces: { kind: 'walk.subject' },
      mutate: () => 'subject-57',
      settle: { writes: ['walk.subject'] },
    });
    const open = defineAction('walk.open', {
      does: 'Open what was found',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (subject: string) => {
        seen.push(`open:${subject}`);
        return subject;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, find, { node: 'walk', coverage: 'verifiable' });
    connectAction(runtime, open, { node: 'walk' });

    const walk = beginWalk(runtime, 'agent', { walkId: 'walk#test-chain' });
    const manifest = await walk.run([
      { action: find },
      { action: open, carry: { from: 0 } },
    ]);

    expect(manifest.walk.walkId).toBe('walk#test-chain');
    expect(manifest.completed).toBe(true);
    expect(manifest.counts).toEqual({
      planned: 2,
      ran: 2,
      refused: 0,
      neverReached: 0,
    });
    expect(seen).toEqual(['open:subject-57']);
    // Every ran row points at a real transition — the walk holds its
    // transitions; no transition knows its walk.
    for (const row of manifest.rows) {
      expect(runtime.transitionFor(row.transition!)).toBeDefined();
    }
  });

  it('a guard that stopped holding mid-plan is a refused ROW, the rest never-reached — and the manifest never throws', async () => {
    const runtime = createActionRuntime();
    const second = defineAction('walk.second', {
      does: 'The step whose surface vanishes',
      invocation: 'inputless',
      mutate: () => 'never',
    });
    const secondConnection = connectAction(runtime, second, { node: 'walk' });
    const first = defineAction('walk.first', {
      does: 'Running this withdraws the next step',
      invocation: 'inputless',
      mutate: () => secondConnection.disconnect(),
    });
    connectAction(runtime, first, { node: 'walk' });
    const third = defineAction('walk.third', {
      does: 'Never reached',
      invocation: 'inputless',
      mutate: () => 'never',
    });
    connectAction(runtime, third, { node: 'walk' });

    const walk = beginWalk(runtime, 'agent');
    const manifest = await walk.run([
      { action: first },
      { action: second },
      { action: third },
    ]);

    expect(manifest.completed).toBe(false);
    expect(manifest.rows.map((row) => row.status)).toEqual([
      'ran',
      'refused',
      'never-reached',
    ]);
    expect(manifest.rows[1]!.refusal).toMatch(/no offer is currently served/);

    // A refused step means the caller REPLANS — under the same walk, whose
    // record then holds the route actually taken across both plans.
    const replanned = await walk.run([{ action: third }]);
    expect(replanned.completed).toBe(true);
    const record = walk.record();
    expect(record.manifests).toHaveLength(2);
    expect(record.manifests[0]!.completed).toBe(false);
    expect(record.manifests[1]!.completed).toBe(true);
  });

  it('two live bindings without an instance is a refusal naming them — a plan never guesses', async () => {
    const focus = defineAction('walk.focus', {
      does: 'Focus one row',
      invocation: 'inputless',
      mutate: () => 'focused',
    });
    const runtime = createActionRuntime();
    connectAction(runtime, focus, { node: 'rows', instance: 'row-1' });
    connectAction(runtime, focus, { node: 'rows', instance: 'row-2' });

    const walk = beginWalk(runtime, 'agent');
    const ambiguous = await walk.run([{ action: focus }]);
    expect(ambiguous.rows[0]!.status).toBe('refused');
    expect(ambiguous.rows[0]!.refusal).toMatch(/name the instance/);
    expect(ambiguous.rows[0]!.refusal).toContain('row-1');

    const exact = await walk.run([{ action: focus, instance: 'row-2' }]);
    expect(exact.completed).toBe(true);
  });

  it('payload laws are refused rows in the offer mode vocabulary, not guesses', async () => {
    const openAction = defineAction('walk.open-needs-payload', {
      does: 'An open offer needs its one payload',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (value: string) => value,
    });
    const boundAction = defineAction('walk.bound-owns-input', {
      does: 'A bound offer captured its input at mint',
      invocation: 'scalar',
      mutate: (value: string) => value,
    });
    const runtime = createActionRuntime();
    connectAction(runtime, openAction, { node: 'walk' });
    connectAction(runtime, boundAction, {
      node: 'walk',
      input: () => 'captured',
    });

    const walk = beginWalk(runtime, 'agent');
    const missing = await walk.run([{ action: openAction }]);
    expect(missing.rows[0]!.status).toBe('refused');
    expect(missing.rows[0]!.refusal).toMatch(/OPEN offer needing one payload/);

    const overfed = await walk.run([
      { action: boundAction, input: 'not yours to state' },
    ]);
    expect(overfed.rows[0]!.status).toBe('refused');
    expect(overfed.rows[0]!.refusal).toMatch(/captured? .*input|takes no caller payload/i);

    const right = await walk.run([{ action: openAction, input: 'stated' }]);
    expect(right.completed).toBe(true);
  });
});
