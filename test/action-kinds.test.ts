import { describe, expect, it } from 'vitest';
import {
  beginWalk,
  connectAction,
  createActionRuntime,
  declareKinds,
  defineAction,
} from '../src/index.js';

/**
 * KIND GOVERNANCE — the vocabulary the channel layer will match on, governed
 * before matching exists. The law lives in the library (opaque names, exact
 * identity, unknown = refusal); the world lives in the mounted catalog.
 */

describe('declareKinds — teams own contributions, the runtime owns the merge', () => {
  it('merges contributions and refuses a duplicate naming BOTH contributors', () => {
    const estate = { array: { docs: 'a Monitor estate array' } };
    const storage = { 'powermax.array': { docs: 'a PowerMax frame' } };
    const catalog = declareKinds(estate, storage);
    expect(catalog.has('array')).toBe(true);
    expect(catalog.has('powermax.array')).toBe(true);

    // The motivating collision is live in the reference app: two worlds,
    // one word. The refusal names both contributions so the two teams find
    // each other instead of last-writer silently winning.
    expect(() =>
      declareKinds(estate, { array: { docs: 'a PowerMax frame, also' } }),
    ).toThrow(/declared twice — by contribution 0 and again by contribution 1/);
  });

  it('describe() answers exactly when has() does, with frozen stable records', () => {
    const catalog = declareKinds({ finding: { revision: 2, docs: 'one row' } });
    expect(catalog.has('finding')).toBe(true);
    expect(catalog.describe('finding')).toBeDefined();
    expect(catalog.describe('finding')).toBe(catalog.describe('finding'));
    expect(Object.isFrozen(catalog.describe('finding'))).toBe(true);
    expect(catalog.has('unheard-of')).toBe(false);
    expect(catalog.describe('unheard-of')).toBeUndefined();
    expect(catalog.list().map((record) => record.kind)).toEqual(['finding']);
  });

  it('the fingerprint is stable across contribution order and moves with a revision', () => {
    const a = declareKinds({ array: {} }, { finding: { revision: 1 } });
    const b = declareKinds({ finding: { revision: 1 } }, { array: {} });
    expect(a.fingerprint).toBe(b.fingerprint);
    // Kind names are forever; MEANINGS evolve. The revision rides the
    // fingerprint so two sides holding different meanings of one name can
    // refuse loudly at a seam instead of matching silently.
    const revised = declareKinds({ array: {} }, { finding: { revision: 2 } });
    expect(revised.fingerprint).not.toBe(a.fingerprint);
  });
});

describe('connect-time enforcement — fail where the developer is looking', () => {
  it('an unknown kind is refused at connect, in the catalog vocabulary', () => {
    const analyse = defineAction('kinds.analyse', {
      does: 'Needs a subject the catalog has never heard of',
      invocation: 'inputless',
      needs: { subject: { kind: 'arary' } },
      mutate: () => 'done',
    });
    const runtime = createActionRuntime({
      kinds: declareKinds({ array: {} }),
    });
    expect(() => connectAction(runtime, analyse, { node: 'kinds' })).toThrow(
      /declares kind 'arary', which the mounted catalog does not govern/,
    );
  });

  it('governed kinds connect, are memoized, and appear in the report', () => {
    let asked = 0;
    const catalog = {
      fingerprint: 'test-catalog',
      has: (kind: string) => {
        asked += 1;
        return kind === 'array';
      },
      describe: (kind: string) =>
        kind === 'array' ? { kind: 'array' } : undefined,
    };
    const one = defineAction('kinds.one', {
      does: 'First consumer of array',
      invocation: 'inputless',
      needs: { subject: { kind: 'array' } },
      mutate: () => 1,
    });
    const two = defineAction('kinds.two', {
      does: 'Second consumer of array',
      invocation: 'inputless',
      produces: { kind: 'array' },
      mutate: () => 2,
    });
    const runtime = createActionRuntime({ kinds: catalog });
    connectAction(runtime, one, { node: 'kinds' });
    connectAction(runtime, two, { node: 'kinds' });
    // A mounted catalog is immutable, so it is consulted once per kind EVER
    // — an adapter's cost can never reach the offer-serving path.
    expect(asked).toBe(1);

    const report = runtime.kindGovernance();
    expect(report.mounted).toBe(true);
    expect(report.fingerprint).toBe('test-catalog');
    expect(report.kindsSeen).toEqual(['array']);
    expect(report.ungoverned).toEqual([]);
  });

  it('no catalog mounted is a VISIBLE state, never a silent pass', () => {
    const free = defineAction('kinds.ungoverned', {
      does: 'Declares kinds with nobody governing them',
      invocation: 'inputless',
      needs: { subject: { kind: 'array' } },
      produces: { kind: 'analysis.summary' },
      mutate: () => 'done',
    });
    const runtime = createActionRuntime();
    connectAction(runtime, free, { node: 'kinds' });

    // Accepted — governance is not mandatory before anyone can try the
    // feature — but REPORTED, because an unarmed check indistinguishable
    // from a passing one is the disease this family keeps curing.
    const report = runtime.kindGovernance();
    expect(report.mounted).toBe(false);
    expect(report.fingerprint).toBeUndefined();
    expect(report.kindsSeen).toEqual(['analysis.summary', 'array']);
    expect(report.ungoverned).toEqual(['analysis.summary', 'array']);
  });

  it('a governed walk still chains — L2 pays nothing for governance', async () => {
    const catalog = declareKinds({ 'walk.subject': { revision: 1 } });
    const find = defineAction('kinds.find', {
      does: 'Find the subject',
      invocation: 'inputless',
      produces: { kind: 'walk.subject' },
      mutate: () => 'S-9',
    });
    const open = defineAction('kinds.open', {
      does: 'Open what was found',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (subject: string) => `opened:${subject}`,
    });
    const runtime = createActionRuntime({ kinds: catalog });
    connectAction(runtime, find, { node: 'kinds' });
    connectAction(runtime, open, { node: 'kinds' });
    const manifest = await beginWalk(runtime, 'agent').run([
      { action: find },
      { action: open, carry: { from: 0 } },
    ]);
    expect(manifest.completed).toBe(true);
  });
});
