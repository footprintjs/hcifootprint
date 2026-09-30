import { describe, expect, it } from 'vitest';
import {
  beginWalk,
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';

/**
 * walk.ts · the admission laws and the refused-row sentences a plan answers
 * with, plus describe-thrown.ts · thrownMessage for an Error whose message is
 * not a sentence. Companion to test/action-walk.test.ts: each case here pins
 * one arm that file does not reach.
 */

const inputless = (id: string, extra: object = {}) =>
  defineAction(id, {
    does: `Run ${id}`,
    invocation: 'inputless',
    mutate: () => 'done',
    ...extra,
  } as never) as unknown as ReturnType<typeof defineAction>;

describe('walk admission — who owns a declared decision', () => {
  it("decisionOwner 'either' admits the person and the agent, and nobody else", async () => {
    const pick = inputless('walk.either-owned', {
      principal: { decisionOwner: 'either' },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, pick, { node: 'walk' });

    expect((await beginWalk(runtime, 'user').run([{ action: pick }])).completed).toBe(true);
    expect((await beginWalk(runtime, 'agent').run([{ action: pick }])).completed).toBe(true);
    await expect(
      beginWalk(runtime, 'system').run([{ action: pick }]),
    ).rejects.toThrow(
      /decisionOwner is 'either' — principal 'system' may not pre-plan a decision it does not own/,
    );
  });

  it("decisionOwner 'agent' admits the agent and refuses the person", async () => {
    let performed = 0;
    const pick = inputless('walk.agent-owned', {
      principal: { decisionOwner: 'agent' },
      mutate: () => {
        performed += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, pick, { node: 'walk' });

    await expect(
      beginWalk(runtime, 'user').run([{ action: pick }]),
    ).rejects.toThrow(/decisionOwner is 'agent' — principal 'user' may not pre-plan/);
    expect(performed).toBe(0);
    expect((await beginWalk(runtime, 'agent').run([{ action: pick }])).completed).toBe(true);
    expect(performed).toBe(1);
  });
});

describe('walk admission — the plan itself', () => {
  it('an empty plan, or no list at all, is refused before anything runs', async () => {
    const walk = beginWalk(createActionRuntime(), 'agent');
    for (const steps of [[], undefined, { 0: 'not a list' }]) {
      await expect(walk.run(steps as never)).rejects.toThrow(
        /walk\.run\(\) needs at least one planned step — an empty plan is not a shorter walk/,
      );
    }
    expect(walk.record().manifests).toEqual([]);
  });

  it('a step whose action is not a defined action is refused, naming its index', async () => {
    let performed = 0;
    const real = inputless('walk.real', {
      mutate: () => {
        performed += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, real, { node: 'walk' });
    await expect(
      beginWalk(runtime, 'agent').run([
        { action: real },
        { action: (() => 'look-alike') as never },
      ]),
    ).rejects.toThrow(
      /plan step 1 is not a defined action — pass the callable defineAction\(\) returned/,
    );
    // Admission is atomic: step 0 was valid and still never ran.
    expect(performed).toBe(0);
  });

  it("a producer that is no longer a defined action when its carry is judged is named 'that step'", async () => {
    // The step object is the caller's; admission reads `steps[from].action`
    // again when it judges the carry. An accessor that answers differently
    // the second time is refused in words that name no id it cannot read.
    const producer = inputless('walk.producer', {
      produces: { kind: 'walk.subject' },
    });
    const consumer = defineAction('walk.consumer', {
      does: 'Consume the subject',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (value: unknown) => value,
    });
    const runtime = createActionRuntime();
    connectAction(runtime, producer, { node: 'walk' });
    connectAction(runtime, consumer, { node: 'walk' });
    let reads = 0;
    const shifting = {
      get action() {
        reads += 1;
        return reads === 1 ? producer : (() => 'plain');
      },
    };
    await expect(
      beginWalk(runtime, 'agent').run([
        shifting as never,
        { action: consumer, carry: { from: 0 } },
      ]),
    ).rejects.toThrow(
      /carries step 0's output, but 'that step' declares no produces/,
    );
  });
});

describe('walk execution — refused rows say exactly what was missing', () => {
  it('a named instance with no live offer is refused, and the sentence names the instance', async () => {
    const focus = inputless('walk.focus-row');
    const runtime = createActionRuntime();
    connectAction(runtime, focus, { node: 'rows', instance: 'row-1' });

    const manifest = await beginWalk(runtime, 'agent').run([
      { action: focus, instance: 'row-9' },
    ]);
    expect(manifest.rows[0]).toMatchObject({ status: 'refused' });
    expect(manifest.rows[0]!.refusal).toBe(
      "no offer is currently served for 'walk.focus-row' (instance 'row-9') to principal 'agent' — its guard does not hold, or no control is connected. The plan stopped here; re-read and replan.",
    );
    expect(manifest.completed).toBe(false);
  });

  it("two live bindings with no instance at all are listed as '(none)', never guessed between", async () => {
    const send = inputless('walk.send-twice');
    const runtime = createActionRuntime();
    connectAction(runtime, send, { node: 'walk' });
    connectAction(runtime, send, { node: 'walk' });

    const manifest = await beginWalk(runtime, 'agent').run([{ action: send }]);
    expect(manifest.rows[0]!.status).toBe('refused');
    expect(manifest.rows[0]!.refusal).toBe(
      "2 live bindings serve 'walk.send-twice' (instances: (none), (none)) — name the instance; a plan never guesses which control was meant.",
    );
  });

  it('an inputless offer given a payload is refused in the inputless vocabulary', async () => {
    let performed = 0;
    const send = inputless('walk.inputless-overfed', {
      mutate: () => {
        performed += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, send, { node: 'walk' });

    const manifest = await beginWalk(runtime, 'agent').run([
      { action: send, input: 'not taken' },
    ]);
    expect(manifest.rows[0]!.status).toBe('refused');
    expect(manifest.rows[0]!.refusal).toBe(
      "hcifootprint: 'walk.inputless-overfed' serves a 'none' offer, which takes no caller payload — inputless offers take nothing; drop this step's input.",
    );
    expect(performed).toBe(0);
  });

  it('a step that RAN but did not perform stops the plan: its row points at the failure, the rest never run', async () => {
    let second = 0;
    const breaks = inputless('walk.breaks', {
      mutate: () => {
        throw new Error('the screen refused');
      },
    });
    const after = inputless('walk.after', {
      mutate: () => {
        second += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, breaks, { node: 'walk' });
    connectAction(runtime, after, { node: 'walk' });

    const manifest = await beginWalk(runtime, 'agent').run([
      { action: breaks },
      { action: after },
    ]);
    expect(manifest.rows.map((row) => row.status)).toEqual(['ran', 'never-reached']);
    expect(runtime.transitionFor(manifest.rows[0]!.transition!)?.invocationStatus).toBe(
      'failed',
    );
    expect(second).toBe(0);
    expect(manifest.completed).toBe(false);
    expect(manifest.counts).toEqual({ planned: 2, ran: 1, refused: 0, neverReached: 1 });
  });
});

describe('describe-thrown · thrownMessage — an Error whose message is not a sentence', () => {
  it('is described whole, never answered with a non-string', async () => {
    const error = new Error('placeholder');
    Object.defineProperty(error, 'message', { value: 42 });
    const action = inputless('walk.numeric-message');
    const runtime = createActionRuntime();
    let reads = 0;
    connectAction(runtime, action, {
      node: 'walk',
      enabled: () => {
        reads += 1;
        if (reads > 1) throw error;
        return true;
      },
    });
    const manifest = await beginWalk(runtime, 'agent').run([{ action }]);
    expect(manifest.rows[0]!.status).toBe('refused');
    // The refusal is `String(error)`: the Error's own rendering, a string.
    expect(manifest.rows[0]!.refusal).toBe('Error: 42');
  });
});
