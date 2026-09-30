import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionRuntime,
  declareKinds,
  defineAction,
  type ActionConnection,
  type DeclaredContextEntry,
  type DefinedAction,
} from '../src/index.js';

/**
 * DECLARED CONTEXT (2.6.0) — "what the person set with a control, still
 * standing", folded by the library at settlement time. Each law of the
 * design (docs/design/2026-09-30-action-gaps.md, step 5) is one test here,
 * plus the scenario the asks came from and an order-independence property.
 */
interface DatasetVersion {
  readonly ref: string;
  readonly rootRef: string;
}

const refetch = defineAction('ctx.refetch-time-range', {
  does: 'Re-run the open series over the time range the person set',
  invocation: 'scalar',
  settle: { evidence: { kind: 'ctx.dataset-version' } },
  mutate: (range: string) => range,
});
const reopen = defineAction('ctx.reopen-dataset', {
  does: 'Reopen an earlier dataset version',
  invocation: 'scalar',
  settle: { evidence: { kind: 'ctx.dataset-version' } },
  mutate: (ref: string) => ref,
});
const releaseRange = defineAction('ctx.release-time-range', {
  does: 'Stop the chosen range riding the next question',
  invocation: 'scalar',
  settle: { writes: ['ctx.ranges'] },
  mutate: (ref: string) => ref,
});

type Scalar = ActionConnection<(input: string) => string, string, false, 'scalar'>;

function setup(options: Parameters<typeof createActionRuntime>[0] = {}) {
  const runtime = createActionRuntime(options);
  const control = connectAction(runtime, refetch, {
    node: 'data-panel',
    instance: 'artifact-1',
    coverage: 'verifiable',
    invokedBy: 'user',
  }) as unknown as Scalar;
  const releaser = connectAction(runtime, releaseRange, {
    node: 'data-panel',
    instance: 'artifact-1',
    coverage: 'verifiable',
    invokedBy: 'user',
  }) as unknown as Scalar;
  return { runtime, control, releaser };
}

function declare(runtime: ReturnType<typeof createActionRuntime>, id = 'ctx.time-ranges') {
  return runtime.declareContext({
    id,
    from: [refetch],
    key: (value) => (value as DatasetVersion).rootRef,
    identity: (value) => (value as DatasetVersion).ref,
    fold: 'latest-per-key',
    releasedBy: { action: releaseRange, identity: (evidence) => evidence as string },
  });
}

async function verified(connection: Scalar, input: string, evidence: unknown) {
  const invocation = connection.invoke(input);
  await invocation.whenInvoked;
  connection.settle(invocation.transition, { status: 'verified', evidence });
  return invocation.transition;
}

const view = (entries: readonly DeclaredContextEntry[]) =>
  entries.map((entry) => `${entry.key}=${entry.identity}`);

describe('declareContext — the scenario it was built for', () => {
  it('keeps the newest verified range per view, drops a released one, and says who set it', async () => {
    const { runtime, control, releaser } = setup();
    const ranges = declare(runtime);
    await verified(control, '7d', { ref: 'ds-2', rootRef: 'series-a' });
    await verified(control, '30d', { ref: 'ds-3', rootRef: 'series-b' });
    const newest = await verified(control, '1d', { ref: 'ds-4', rootRef: 'series-a' });
    expect(view(ranges.entries())).toEqual(['series-b=ds-3', 'series-a=ds-4']);

    const [entry] = ranges.entries().filter((e) => e.key === 'series-a');
    expect(entry).toEqual({
      context: 'ctx.time-ranges',
      kind: 'ctx.dataset-version',
      key: 'series-a',
      identity: 'ds-4',
      value: { ref: 'ds-4', rootRef: 'series-a' },
      transition: newest,
      binding: control.binding,
      attribution: { principal: 'user', basis: 'caller-asserted', certainty: 'observed' },
    });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(structuredClone(ranges.entries())).toEqual(ranges.entries());

    await verified(releaser, 'ds-3', 'ds-3');
    expect(view(ranges.entries())).toEqual(['series-a=ds-4']);
  });
});

describe('declareContext — the laws', () => {
  it('law 1: one live context per id; retire is idempotent and frees the id', () => {
    const { runtime } = setup();
    const first = declare(runtime);
    expect(() => declare(runtime)).toThrow(/context 'ctx\.time-ranges' is already declared and live/);
    expect(first.retire()).toBe(true);
    expect(first.retire()).toBe(false);
    expect(first.entries()).toEqual([]);
    expect(() => declare(runtime)).not.toThrow();
  });

  it('law 2: one kind per context; every from action must declare settle.evidence', () => {
    const { runtime } = setup();
    const otherKind = defineAction('ctx.other-kind', {
      does: 'Produce another kind',
      invocation: 'inputless',
      settle: { evidence: { kind: 'ctx.receipt' } },
      mutate: () => 1,
    });
    const noEvidence = defineAction('ctx.no-evidence', {
      does: 'Write a key',
      invocation: 'inputless',
      settle: { writes: ['ctx.k'] },
      mutate: () => 1,
    });
    const base = {
      id: 'ctx.kinds',
      key: String,
      identity: String,
      fold: 'latest-per-key' as const,
    };
    expect(() => runtime.declareContext({ ...base, from: [refetch, otherKind] })).toThrow(
      /folds one kind, but action 'ctx\.other-kind' proves its effect with 'ctx\.receipt'/,
    );
    expect(() => runtime.declareContext({ ...base, from: [noEvidence] })).toThrow(
      /a context folds governed evidence; declare settle\.evidence on action 'ctx\.no-evidence'/,
    );
    // Two actions of the same kind feed one context.
    expect(() => runtime.declareContext({ ...base, from: [refetch, reopen] })).not.toThrow();
  });

  it('law 3: only verified effects enter; a newer pending one does not displace an older verified one', async () => {
    const { runtime, control } = setup();
    const ranges = declare(runtime);
    await verified(control, '7d', { ref: 'ds-2', rootRef: 'a' });
    const pending = control.invoke('1d');
    await pending.whenInvoked;
    const refused = control.invoke('2d');
    await refused.whenInvoked;
    control.settle(refused.transition, { status: 'refused', reason: 'no data' });
    const abandoned = control.invoke('3d');
    control.settle(abandoned.transition, {
      status: 'abandoned',
      authority: { kind: 'cancelled', reason: 'closed' },
    });
    expect(view(ranges.entries())).toEqual(['a=ds-2']);
  });

  it('law 4: latest means latest INVOKED — an older refetch settling late does not displace a newer one', async () => {
    const { runtime, control } = setup();
    const ranges = declare(runtime);
    const older = control.invoke('7d');
    const newer = control.invoke('1d');
    await Promise.all([older.whenInvoked, newer.whenInvoked]);
    control.settle(newer.transition, { status: 'verified', evidence: { ref: 'new', rootRef: 'a' } });
    control.settle(older.transition, { status: 'verified', evidence: { ref: 'old', rootRef: 'a' } });
    expect(view(ranges.entries())).toEqual(['a=new']);
  });

  it('law 5: a release removes the entry it names and never resurrects an older one', async () => {
    const { runtime, control, releaser } = setup();
    const ranges = declare(runtime);
    await verified(control, '7d', { ref: 'ds-2', rootRef: 'a' });
    await verified(control, '1d', { ref: 'ds-3', rootRef: 'a' });
    await verified(releaser, 'ds-3', 'ds-3');
    expect(ranges.entries()).toEqual([]);
    // A release invoked BEFORE an entry does not remove it.
    const release = releaser.invoke('ds-9');
    const refetched = control.invoke('2d');
    await Promise.all([release.whenInvoked, refetched.whenInvoked]);
    control.settle(refetched.transition, {
      status: 'verified',
      evidence: { ref: 'ds-9', rootRef: 'b' },
    });
    releaser.settle(release.transition, { status: 'verified', evidence: 'ds-9' });
    expect(view(ranges.entries())).toEqual(['b=ds-9']);
    // An unverified release releases nothing.
    const refusedRelease = releaser.invoke('ds-9');
    await refusedRelease.whenInvoked;
    releaser.settle(refusedRelease.transition, { status: 'refused', reason: 'no' });
    expect(view(ranges.entries())).toEqual(['b=ds-9']);
  });

  it('law 6: folded once at declaration from retained history, then as settlements land; eviction cannot change it', async () => {
    const { runtime, control } = setup({ history: { keep: 1 } });
    await verified(control, '7d', { ref: 'ds-1', rootRef: 'a' });
    await verified(control, '30d', { ref: 'ds-2', rootRef: 'b' });
    // keep: 1 — only ds-2's row is retained, so the declaration folds that.
    const ranges = declare(runtime);
    expect(view(ranges.entries())).toEqual(['b=ds-2']);
    const third = await verified(control, '1d', { ref: 'ds-3', rootRef: 'c' });
    // ds-2's row is now evicted; its entry stands.
    expect(runtime.transitions().map((row) => row.ref)).toEqual([third]);
    expect(view(ranges.entries())).toEqual(['b=ds-2', 'c=ds-3']);
    const [b] = ranges.entries();
    expect(runtime.transitionFor(b!.transition)).toBeUndefined();
  });

  it('law 7: a reader that throws or answers a non-string skips that transition, counted — the settlement is untouched', async () => {
    const { runtime, control, releaser } = setup();
    const ranges = runtime.declareContext({
      id: 'ctx.readers',
      from: [refetch],
      key: (value) => {
        const rootRef = (value as { rootRef?: unknown }).rootRef;
        if (rootRef === 'boom') throw new Error('no root');
        return rootRef as string;
      },
      identity: (value) => (value as { ref?: unknown }).ref as string,
      fold: 'latest-per-key',
      releasedBy: { action: releaseRange, identity: (evidence) => evidence as string },
    });
    const thrown = await verified(control, '1d', { ref: 'x', rootRef: 'boom' });
    const numeric = await verified(control, '2d', { ref: 'y', rootRef: 7 });
    const noIdentity = await verified(control, '3d', { rootRef: 'c' });
    const badRelease = await verified(releaser, 'r', 42);
    await verified(control, '4d', { ref: 'z', rootRef: 'ok' });
    expect(view(ranges.entries())).toEqual(['ok=z']);
    expect(ranges.skipped()).toEqual([
      { transition: thrown, reader: 'key', reason: 'key reader threw: Error: no root' },
      { transition: numeric, reader: 'key', reason: 'key reader answered number, not a string' },
      {
        transition: noIdentity,
        reader: 'identity',
        reason: 'identity reader answered undefined, not a string',
      },
      {
        transition: badRelease,
        reader: 'releasedBy.identity',
        reason: 'releasedBy.identity reader answered number, not a string',
      },
    ]);
    expect(runtime.transitionFor(thrown)?.effectStatus).toBe('verified');
  });

  it('law 7: a reader throwing a value that cannot be printed is still a counted skip — a sibling context still folds, settle() still returns', async () => {
    const { runtime, control } = setup();
    const { proxy: revoked, revoke } = Proxy.revocable({}, {});
    revoke();
    const unprintable: readonly unknown[] = [
      Object.create(null),
      { toString: () => { throw new Error('no toString'); } },
      { [Symbol.toPrimitive]: () => { throw new Error('no primitive'); } },
      revoked,
    ];
    let next = 0;
    const hostile = runtime.declareContext({
      id: 'ctx.hostile',
      from: [refetch],
      key: () => {
        throw unprintable[next++];
      },
      identity: (value) => (value as DatasetVersion).ref,
      fold: 'latest-per-key',
    });
    const sibling = declare(runtime, 'ctx.sibling');
    const settled: string[] = [];
    for (let index = 0; index < unprintable.length; index += 1) {
      const invocation = control.invoke(`r${String(index)}`);
      await invocation.whenInvoked;
      const settlement = control.settle(invocation.transition, {
        status: 'verified',
        evidence: { ref: `v${String(index)}`, rootRef: `root${String(index)}` },
      });
      settled.push(settlement.status);
      expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe('verified');
    }
    expect(settled).toEqual(['verified', 'verified', 'verified', 'verified']);
    expect(view(sibling.entries())).toEqual(['root0=v0', 'root1=v1', 'root2=v2', 'root3=v3']);
    expect(hostile.entries()).toEqual([]);
    expect(hostile.skipped().map((skip) => skip.reason)).toEqual([
      'key reader threw: [object Object]',
      'key reader threw: [object Object]',
      'key reader threw: [object Object]',
      'key reader threw: an unprintable value',
    ]);
  });

  it('law 8: who set it rides along — the principal port stamps its own', async () => {
    const runtime = createActionRuntime();
    const agentControl = defineAction('ctx.agent-refetch', {
      does: 'Refetch on the agent’s behalf',
      invocation: 'inputless',
      settle: { evidence: { kind: 'ctx.dataset-version' } },
      mutate: () => 'rows',
    });
    const connection = connectAction(runtime, agentControl, {
      node: 'data-panel',
      coverage: 'verifiable',
    });
    const ranges = runtime.declareContext({
      id: 'ctx.agent',
      from: [agentControl],
      key: (value) => (value as DatasetVersion).rootRef,
      identity: (value) => (value as DatasetVersion).ref,
      fold: 'latest-per-key',
    });
    const port = runtime.forPrincipal('agent');
    const invocation = port.invoke(port.offers(agentControl)[0]!);
    await invocation.whenInvoked;
    connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { ref: 'v1', rootRef: 'r' },
    });
    const [entry] = ranges.entries();
    expect(entry?.attribution).toEqual({
      principal: 'agent',
      basis: 'caller-asserted',
      certainty: 'observed',
    });
    expect(entry?.binding).toBe(connection.binding);
  });

  it('ignores transitions of actions it does not name', async () => {
    const { runtime } = setup();
    const ranges = declare(runtime);
    const other = defineAction('ctx.unrelated', {
      does: 'Something else',
      invocation: 'inputless',
      settle: { evidence: { kind: 'ctx.dataset-version' } },
      mutate: () => 1,
    });
    const connection = connectAction(runtime, other, {
      node: 'elsewhere',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;
    connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { ref: 'q', rootRef: 'q' },
    });
    expect(ranges.entries()).toEqual([]);
    expect(ranges.skipped()).toEqual([]);
  });

  it('works with onReturn: a synchronous verdict enters the context before invoke() returns', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ 'ctx.version': {} }),
    });
    const instant = defineAction('ctx.instant-refetch', {
      does: 'Refetch from cache',
      invocation: 'scalar',
      settle: {
        evidence: { kind: 'ctx.version' },
        onReturn: (outcome) =>
          outcome.status === 'performed'
            ? { status: 'verified', evidence: outcome.produced }
            : undefined,
      },
      mutate: (rootRef: string): DatasetVersion => ({ ref: `${rootRef}-v2`, rootRef }),
    });
    const connection = connectAction(runtime, instant, {
      node: 'data-panel',
      coverage: 'verifiable',
      invokedBy: 'user',
    });
    const ranges = runtime.declareContext({
      id: 'ctx.instant',
      from: [instant],
      key: (value) => (value as DatasetVersion).rootRef,
      identity: (value) => (value as DatasetVersion).ref,
      fold: 'latest-per-key',
    });
    connection.invoke('a');
    expect(view(ranges.entries())).toEqual(['a=a-v2']);
  });
});

describe('declareContext — refusals at the declaration door', () => {
  it('teaches every malformed declaration', () => {
    const { runtime } = setup();
    const ok = {
      id: 'ctx.bad',
      from: [refetch],
      key: String,
      identity: String,
      fold: 'latest-per-key' as const,
    };
    const writesOnly = defineAction('ctx.writes-only', {
      does: 'Release without proof',
      invocation: 'inputless',
      principal: { mayInvoke: ['human'] },
      mutate: () => 1,
    });
    const twin = defineAction('ctx.refetch-time-range', {
      does: 'Another callable, same id',
      invocation: 'scalar',
      settle: { evidence: { kind: 'ctx.dataset-version' } },
      mutate: (range: string) => range,
    });
    const cases: [unknown, RegExp][] = [
      [null, /needs a declaration record/],
      [{ ...ok, id: ' ' }, /needs a non-empty id/],
      [{ ...ok, fold: 'all' }, /declares fold 'all'; the one fold is 'latest-per-key'/],
      [{ ...ok, key: 'rootRef' }, /needs key and identity readers/],
      [{ ...ok, from: [] }, /needs a non-empty from/],
      [{ ...ok, from: [() => 1] }, /from must name a callable created by defineAction/],
      [{ ...ok, from: [twin] }, /belongs to another callable in this runtime/],
      [{ ...ok, from: [refetch, refetch] }, /lists action 'ctx\.refetch-time-range' twice/],
      [{ ...ok, releasedBy: { action: releaseRange } }, /releasedBy needs \{ action, identity \}/],
      [
        { ...ok, releasedBy: { action: refetch, identity: String } },
        /cannot both feed and release the context/,
      ],
      [
        { ...ok, releasedBy: { action: writesOnly, identity: String } },
        /release action 'ctx\.writes-only' declares no evidence-bearing settle contract/,
      ],
    ];
    for (const [declaration, message] of cases) {
      expect(() => runtime.declareContext(declaration as never)).toThrow(message);
    }
  });

  it('captures the declaration frozen', () => {
    const { runtime } = setup();
    const from: DefinedAction[] = [refetch];
    const handle = runtime.declareContext({
      id: 'ctx.frozen',
      from,
      key: String,
      identity: String,
      fold: 'latest-per-key',
    });
    from.push(reopen);
    expect(handle.declaration.from).toEqual([refetch]);
    expect(Object.isFrozen(handle.declaration)).toBe(true);
    expect(handle.declaration).not.toHaveProperty('releasedBy');
  });
});

describe('declareContext — declared before connect: the callable, not its id', () => {
  // Declaring first is the natural order (an app connects each binding
  // lazily; a hot reload rebuilds the callable under the same id). A later
  // callable that reuses a declared id must never feed or release the
  // context — the fold admits rows by the declared definition's identity.
  const feed = () =>
    defineAction('ctx.early-feed', {
      does: 'The declared feed',
      invocation: 'scalar',
      settle: { evidence: { kind: 'ctx.dataset-version' } },
      mutate: (range: string) => range,
    });
  const ungoverned = () =>
    defineAction('ctx.early-feed', {
      does: 'Same id, no evidence contract',
      invocation: 'scalar',
      settle: { writes: ['z'] },
      mutate: (range: string) => range,
    });
  const connect = (runtime: ReturnType<typeof createActionRuntime>, action: DefinedAction) =>
    connectAction(runtime, action as never, {
      node: 'data-panel',
      coverage: 'verifiable',
    }) as unknown as Scalar;

  it('a same-id impostor connected later does not feed the context', async () => {
    const runtime = createActionRuntime();
    const real = feed();
    const context = runtime.declareContext({
      id: 'ctx.early',
      from: [real],
      key: (value) => (value as DatasetVersion).rootRef,
      identity: (value) => (value as DatasetVersion).ref,
      fold: 'latest-per-key',
    });
    const impostor = connect(runtime, ungoverned());
    await verified(impostor, 'x', { ref: 'EVIL', rootRef: 'series-a' });
    expect(context.entries()).toEqual([]);
    expect(context.skipped()).toEqual([]);
  });

  it('the declared callable, connected later, does feed it', async () => {
    const runtime = createActionRuntime();
    const real = feed();
    const context = runtime.declareContext({
      id: 'ctx.early',
      from: [real],
      key: (value) => (value as DatasetVersion).rootRef,
      identity: (value) => (value as DatasetVersion).ref,
      fold: 'latest-per-key',
    });
    await verified(connect(runtime, real), '7d', { ref: 'ds-1', rootRef: 'series-a' });
    expect(view(context.entries())).toEqual(['series-a=ds-1']);
    expect(context.entries()[0]?.kind).toBe('ctx.dataset-version');
  });

  it('a same-id impostor connected later does not release', async () => {
    const runtime = createActionRuntime();
    const real = feed();
    const release = defineAction('ctx.early-release', {
      does: 'The declared release',
      invocation: 'scalar',
      settle: { writes: ['ctx.ranges'] },
      mutate: (ref: string) => ref,
    });
    const context = runtime.declareContext({
      id: 'ctx.early',
      from: [real],
      key: (value) => (value as DatasetVersion).rootRef,
      identity: (value) => (value as DatasetVersion).ref,
      fold: 'latest-per-key',
      releasedBy: { action: release, identity: (evidence) => evidence as string },
    });
    await verified(connect(runtime, real), '7d', { ref: 'ds-1', rootRef: 'series-a' });
    const impostor = connect(
      runtime,
      defineAction('ctx.early-release', {
        does: 'Same id, another callable',
        invocation: 'scalar',
        settle: { writes: ['ctx.ranges'] },
        mutate: (ref: string) => ref,
      }),
    );
    await verified(impostor, 'ds-1', 'ds-1');
    expect(view(context.entries())).toEqual(['series-a=ds-1']);
  });

  it('transitions({ definition }) refuses the declared callable once a same-id impostor holds the id', async () => {
    const runtime = createActionRuntime();
    const real = feed();
    await verified(connect(runtime, ungoverned()), 'x', { ref: 'EVIL', rootRef: 'series-a' });
    expect(() => runtime.transitions({ definition: real as never })).toThrow(
      /belongs to another callable in this runtime/,
    );
  });
});

describe('declareContext — property: the fold is independent of settlement order', () => {
  // A seeded generator, so a failure names its seed and replays exactly.
  function prng(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
      return state / 2 ** 32;
    };
  }

  it('equals the reference fold over the verified set, for 300 random runs', async () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const random = prng(seed);
      const { runtime, control, releaser } = setup();
      const ranges = declare(runtime, `ctx.property-${seed}`);
      type Planned = {
        readonly kind: 'refetch' | 'release';
        readonly sequence: number;
        readonly evidence: unknown;
        readonly verify: boolean;
        readonly transition: ReturnType<Scalar['invoke']>['transition'];
        readonly connection: Scalar;
      };
      const planned: Planned[] = [];
      const count = 1 + Math.floor(random() * 10);
      for (let index = 0; index < count; index += 1) {
        const isRelease = random() < 0.3;
        const ref = `ds-${Math.floor(random() * 4)}`;
        const evidence = isRelease
          ? ref
          : { ref, rootRef: `root-${Math.floor(random() * 3)}` };
        const connection = isRelease ? releaser : control;
        const invocation = connection.invoke(ref);
        await invocation.whenInvoked;
        planned.push({
          kind: isRelease ? 'release' : 'refetch',
          sequence: index,
          evidence,
          verify: random() < 0.75,
          transition: invocation.transition,
          connection,
        });
      }
      // Settle in a shuffled order.
      const order = [...planned].sort(() => random() - 0.5);
      for (const row of order) {
        row.connection.settle(
          row.transition,
          row.verify
            ? { status: 'verified', evidence: row.evidence }
            : { status: 'refused', reason: 'no' },
        );
      }
      // Reference: newest verified refetch per key, dropped when a verified
      // release naming its identity was invoked after it.
      const verifiedRows = planned.filter((row) => row.verify);
      const newest = new Map<string, Planned>();
      for (const row of verifiedRows) {
        if (row.kind !== 'refetch') continue;
        const key = (row.evidence as DatasetVersion).rootRef;
        const current = newest.get(key);
        if (current === undefined || current.sequence < row.sequence) newest.set(key, row);
      }
      const expected = [...newest.values()]
        .filter(
          (row) =>
            !verifiedRows.some(
              (release) =>
                release.kind === 'release' &&
                release.evidence === (row.evidence as DatasetVersion).ref &&
                release.sequence > row.sequence,
            ),
        )
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => row.transition);
      expect(
        ranges.entries().map((entry) => entry.transition),
        `seed ${seed}`,
      ).toEqual(expected);
    }
  });
});
