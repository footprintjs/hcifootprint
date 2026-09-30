import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  connectAction,
  createActionRuntime,
  declareKinds,
  defineAction,
  type ActionInputSchemaAdapter,
} from '../src/index.js';

/**
 * THE EFFECT IS PROVEN BY A GOVERNED VALUE (2.6.0). `settle.evidence: { kind }`
 * is an evidence-bearing clause — `verified` is admitted without a pretend
 * state key — governed at connect like `needs`/`produces`, schema-checked at
 * settle when the catalog gives the kind a schema, and stamped on the record.
 */
interface DatasetVersion {
  readonly ref: string;
  readonly rootRef: string;
}

const isDataset = (value: unknown): value is DatasetVersion =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { ref?: unknown }).ref === 'string' &&
  typeof (value as { rootRef?: unknown }).rootRef === 'string';

const datasetSchema = {
  safeParse: (value: unknown) =>
    isDataset(value)
      ? { success: true }
      : { success: false, error: 'not a dataset version' },
};

function refetchAction(id = 'panel.refetch-evidence') {
  return defineAction(id, {
    does: 'Re-run the series over the chosen range and open the new dataset',
    invocation: 'scalar',
    settle: { evidence: { kind: 'panel.dataset-version' } },
    mutate: (range: string) => ({ status: 'refetched' as const, range }),
  });
}

describe('settle.evidence — declaration', () => {
  it('is evidence-bearing: verified is admitted with no writes/goTo/verify', async () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    const settled = connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { ref: 'ds-2', rootRef: 'ds-1' },
    });
    expect(settled).toMatchObject({
      status: 'verified',
      evidenceKind: 'panel.dataset-version',
      evidence: { ref: 'ds-2', rootRef: 'ds-1' },
    });
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      effectStatus: 'verified',
      evidenceKind: 'panel.dataset-version',
      evidence: { ref: 'ds-2', rootRef: 'ds-1' },
    });
  });

  it('still verifies only from verifiable coverage', () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, refetchAction(), { node: 'panel' });
    const invocation = connection.invoke('7d');
    expect(() =>
      connection.settle(invocation.transition, {
        status: 'verified',
        evidence: { ref: 'ds-2', rootRef: 'ds-1' },
      }),
    ).toThrow(/cannot be verified from executable coverage/);
  });

  it('stamps no evidenceKind when the definition did not declare it, or the effect did not verify', async () => {
    const runtime = createActionRuntime();
    const plain = defineAction('panel.plain-evidence', {
      does: 'Write the range',
      invocation: 'scalar',
      settle: { writes: ['panel.range'] },
      mutate: (range: string) => range,
    });
    const a = connectAction(runtime, plain, { node: 'panel', coverage: 'verifiable' });
    const b = connectAction(runtime, refetchAction(), {
      node: 'panel',
      coverage: 'verifiable',
    });
    const first = a.invoke('7d');
    const second = b.invoke('7d');
    await Promise.all([first.whenInvoked, second.whenInvoked]);
    expect(
      a.settle(first.transition, { status: 'verified', evidence: 1 }),
    ).not.toHaveProperty('evidenceKind');
    b.settle(second.transition, { status: 'refused', reason: 'upstream down' });
    expect(runtime.transitionFor(first.transition)).not.toHaveProperty('evidenceKind');
    expect(runtime.transitionFor(second.transition)).not.toHaveProperty('evidenceKind');
  });

  it('refuses malformed declarations at defineAction', () => {
    const base = {
      does: 'Refetch',
      invocation: 'scalar' as const,
      mutate: (range: string) => range,
    };
    expect(() =>
      defineAction('panel.bad-1', { ...base, settle: { evidence: { kind: '' } } }),
    ).toThrow(/settle\.evidence\.kind must be a non-empty kind string/);
    expect(() =>
      defineAction('panel.bad-2', {
        ...base,
        settle: { evidence: { kind: 'k', schema: {} } as never },
      }),
    ).toThrow(/unknown field 'schema'/);
    expect(() =>
      defineAction('panel.bad-3', { ...base, settle: { evidence: 'k' as never } }),
    ).toThrow(/must be a plain authored object/);
  });

  it('freezes the declaration with the rest of the contract', () => {
    const authored = { kind: 'panel.dataset-version' };
    const action = defineAction('panel.frozen-evidence', {
      does: 'Refetch',
      invocation: 'scalar',
      settle: { evidence: authored },
      mutate: (range: string) => range,
    });
    const declared = actionDefinitionOf(action).contract.settle?.evidence;
    expect(declared).toEqual({ kind: 'panel.dataset-version' });
    expect(declared).not.toBe(authored);
    expect(Object.isFrozen(declared)).toBe(true);
  });
});

describe('settle.evidence — governance at connect', () => {
  it('refuses a kind the mounted catalog does not govern', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ 'panel.time-window': {} }),
    });
    expect(() => connectAction(runtime, refetchAction(), { node: 'panel' })).toThrow(
      /declares kind 'panel\.dataset-version', which the mounted catalog does not govern/,
    );
  });

  it('reports the kind ungoverned when no catalog is mounted', () => {
    const runtime = createActionRuntime();
    connectAction(runtime, refetchAction(), { node: 'panel' });
    expect(runtime.kindGovernance()).toMatchObject({
      mounted: false,
      ungoverned: ['panel.dataset-version'],
    });
  });

  it('carries a kind schema this runtime cannot enforce only under disclosure', async () => {
    const kinds = declareKinds({
      'panel.dataset-version': { schema: { type: 'object' } },
    });
    expect(() =>
      connectAction(createActionRuntime({ kinds }), refetchAction(), { node: 'panel' }),
    ).toThrow(/settle\.evidence \(the catalog schema of kind 'panel\.dataset-version'\)/);

    const runtime = createActionRuntime({ kinds, contractActivation: 'disclosure' });
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    // Disclosure: the kind is governed, the value is recorded as given.
    expect(
      connection.settle(invocation.transition, { status: 'verified', evidence: 42 }),
    ).toMatchObject({ evidence: 42, evidenceKind: 'panel.dataset-version' });
  });
});

describe('settle.evidence — the schema check at settle', () => {
  function checked(adapter?: ActionInputSchemaAdapter) {
    const runtime = createActionRuntime({
      kinds: declareKinds({ 'panel.dataset-version': { schema: datasetSchema } }),
      ...(adapter !== undefined ? { inputSchemaAdapter: adapter } : {}),
    });
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      coverage: 'verifiable',
    });
    return { runtime, connection };
  }

  it('refuses evidence that is not a value of the kind, and does not spend the terminal', async () => {
    const { runtime, connection } = checked();
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    let refusal: unknown;
    try {
      connection.settle(invocation.transition, {
        status: 'verified',
        evidence: { ref: 'ds-2' },
      });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(TypeError);
    expect((refusal as Error).message).toMatch(
      /cannot be verified — its evidence is not a valid 'panel\.dataset-version'/,
    );
    expect((refusal as Error).cause).toBe('not a dataset version');
    expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe(
      'unverified',
    );
    // The corrected value still lands.
    expect(
      connection.settle(invocation.transition, {
        status: 'verified',
        evidence: { ref: 'ds-2', rootRef: 'ds-1' },
      }).status,
    ).toBe('verified');
  });

  it('checks only verified evidence — refused and abandoned are untouched', async () => {
    const { connection } = checked();
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    expect(
      connection.settle(invocation.transition, { status: 'refused', reason: 42 }).status,
    ).toBe('refused');
  });

  it('quotes a late verified claim without validating it', async () => {
    const { runtime, connection } = checked();
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    connection.settle(invocation.transition, { status: 'refused', reason: 'gone' });
    connection.settle(invocation.transition, { status: 'verified', evidence: 'junk' });
    expect(runtime.transitionFor(invocation.transition)?.lateSettlements).toEqual([
      { claimed: 'verified', payload: 'junk' },
    ]);
  });

  it('runs an adapter-supported kind schema with source evidence', async () => {
    const seen: unknown[] = [];
    const jsonSchema = { type: 'dataset' };
    const adapter: ActionInputSchemaAdapter = {
      supports: (schema) => schema === jsonSchema,
      validate: (_schema, value, context) => {
        seen.push(context.source);
        return isDataset(value) ? { valid: true } : { valid: false, issues: ['no ref'] };
      },
    };
    const runtime = createActionRuntime({
      kinds: declareKinds({ 'panel.dataset-version': { schema: jsonSchema } }),
      inputSchemaAdapter: adapter,
    });
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    expect(() =>
      connection.settle(invocation.transition, { status: 'verified', evidence: {} }),
    ).toThrow(TypeError);
    connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { ref: 'a', rootRef: 'a' },
    });
    expect(seen).toEqual(['evidence', 'evidence']);
  });

  it('accepts a .parse validator and treats a thrown parse as the refusal', async () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({
        'panel.dataset-version': {
          schema: {
            parse: (value: unknown) => {
              if (!isDataset(value)) throw new Error('bad dataset');
              return value;
            },
          },
        },
      }),
    });
    const connection = connectAction(runtime, refetchAction(), {
      node: 'panel',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    expect(() =>
      connection.settle(invocation.transition, { status: 'verified', evidence: 1 }),
    ).toThrow(/not a valid 'panel\.dataset-version'/);
  });

  it('validates the recorded snapshot, so the checked bytes are the recorded bytes', async () => {
    const { runtime, connection } = checked();
    const invocation = connection.invoke('7d');
    await invocation.whenInvoked;
    const evidence = { ref: 'ds-2', rootRef: 'ds-1' };
    connection.settle(invocation.transition, { status: 'verified', evidence });
    evidence.ref = 'mutated-after';
    expect(runtime.transitionFor(invocation.transition)?.evidence).toEqual({
      ref: 'ds-2',
      rootRef: 'ds-1',
    });
  });
});
