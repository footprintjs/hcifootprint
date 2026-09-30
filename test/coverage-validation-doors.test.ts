import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  connectAction,
  createActionRuntime,
  declareKinds,
  defineAction,
  isDefinedAction,
  type ActionInputSchemaAdapter,
} from '../src/index.js';

/**
 * The validation gates, held to their fail-closed promise: a validator that
 * answers asynchronously, an adapter that answers nonsense, diagnostics that
 * cannot be copied, and a schema that stops being a validator between the
 * connect-time decision and the settle-time check are all REFUSALS, never a
 * silent pass (input-validation.ts · schemaVerdict /
 * ActionInputValidationError / isSelfValidatingSchema). And a definition
 * branded by another copy is re-checked on the bytes it reads NOW
 * (definition.ts · isRecord → validateActionDefinitionContract).
 */

function scalarWith(id: string, inputSchema: unknown) {
  return defineAction(id, {
    does: 'Accept one checked value',
    invocation: 'scalar',
    inputSchema: inputSchema as never,
    mutate: (_value: unknown) => 'ran',
  });
}

describe('input validation — every unusable answer is a refusal', () => {
  it('a safeParse that answers with a promise refuses, and the rejection never escapes', async () => {
    const action = scalarWith('coverage.async-safe-parse', {
      safeParse: () => Promise.reject(new Error('late verdict')),
    });
    const connection = connectAction(createActionRuntime(), action, {
      node: 'form',
    });
    const invocation = connection.invoke('value');
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'refused',
      error: {
        code: 'ACTION_INPUT_INVALID',
        source: 'caller',
        issuesDisposition: 'included',
        issues: 'safeParse() must return synchronously, not a Promise/thenable',
      },
    });
  });

  it('diagnostics that cannot be copied are marked unavailable, and the refusal still stands', async () => {
    const hostileIssues = {
      get path(): string {
        throw new Error('diagnostic getter exploded');
      },
    };
    const action = scalarWith('coverage.hostile-issues', {
      safeParse: () => ({ success: false, error: hostileIssues }),
    });
    const connection = connectAction(createActionRuntime(), action, {
      node: 'form',
    });
    const invocation = connection.invoke('value');
    const result = await invocation.whenInvoked;
    expect(result).toMatchObject({
      status: 'refused',
      error: {
        code: 'ACTION_INPUT_INVALID',
        source: 'caller',
        issuesDisposition: 'unavailable',
      },
    });
    expect((result as { error: { issues?: unknown } }).error.issues).toBeUndefined();
  });

  describe('through an inputSchemaAdapter', () => {
    const shape = { type: 'string' };
    const runtimeWith = (validate: ActionInputSchemaAdapter['validate']) =>
      createActionRuntime({
        inputSchemaAdapter: { supports: () => true, validate },
      });

    it('an adapter that answers with a promise refuses', async () => {
      const connection = connectAction(
        runtimeWith(() => Promise.reject(new Error('late')) as never),
        scalarWith('coverage.async-adapter', shape),
        { node: 'form' },
      );
      await expect(connection.invoke('value').whenInvoked).resolves.toMatchObject({
        status: 'refused',
        error: {
          issues:
            'inputSchemaAdapter.validate() must return synchronously, not a Promise/thenable',
        },
      });
    });

    it('an adapter that answers neither valid nor invalid refuses as malformed', async () => {
      const connection = connectAction(
        runtimeWith(() => ({ valid: 'maybe' }) as never),
        scalarWith('coverage.malformed-adapter', shape),
        { node: 'form' },
      );
      await expect(connection.invoke('value').whenInvoked).resolves.toMatchObject({
        status: 'refused',
        error: {
          issues: 'inputSchemaAdapter returned a malformed validation result',
        },
      });
    });
  });
});

describe('evidence validation — a catalog schema is a validator, or it is disclosure', () => {
  function evidenceAction(id: string) {
    return defineAction(id, {
      does: 'Open the new dataset',
      invocation: 'inputless',
      settle: { evidence: { kind: 'dataset.version' } },
      mutate: () => 'opened',
    });
  }

  it('a primitive schema is not a validator: the active runtime refuses to connect on it', () => {
    const runtime = createActionRuntime({
      kinds: declareKinds({ 'dataset.version': { schema: 'a dataset id' } }),
    });
    expect(() =>
      connectAction(runtime, evidenceAction('coverage.primitive-schema'), {
        node: 'panel',
        coverage: 'verifiable',
      }),
    ).toThrow(/settle\.evidence \(the catalog schema of kind 'dataset\.version'\)/);
  });

  it('a schema that stops being a validator after connect fails closed at settle', async () => {
    let reads = 0;
    const flipping = {
      get safeParse(): unknown {
        reads += 1;
        return reads === 1 ? () => ({ success: true }) : undefined;
      },
    };
    const runtime = createActionRuntime({
      kinds: declareKinds({ 'dataset.version': { schema: flipping } }),
    });
    const connection = connectAction(
      runtime,
      evidenceAction('coverage.flipping-schema'),
      { node: 'panel', coverage: 'verifiable' },
    );
    const invocation = connection.invoke();
    await invocation.whenInvoked;
    let refusal: unknown;
    try {
      connection.settle(invocation.transition, {
        status: 'verified',
        evidence: { id: 'ds-2' },
      });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(TypeError);
    expect((refusal as Error).message).toMatch(
      /cannot be verified — its evidence is not a valid 'dataset\.version'/,
    );
    expect((refusal as Error).cause).toBe(
      'the declared schema has no active validation adapter',
    );
    expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe(
      'unverified',
    );
  });
});

describe("a copied definition is re-checked on what it reads NOW — 'does' included", () => {
  const BRAND = Symbol.for('hcifootprint.action-definition.v2');
  const ATTESTED = Symbol.for('hcifootprint.action-definition.validated.v2');

  /** A contract whose `does` is not an own property: a Proxy may answer it
   *  differently on every read, so only the recheck's own read counts. */
  function lookalike(readDoes: () => string): () => undefined {
    const target = Object.freeze({ invocation: 'inputless' });
    const contract = new Proxy(target, {
      get: (object, key, receiver) =>
        key === 'does' ? readDoes() : Reflect.get(object, key, receiver),
    });
    const record = {
      ref: Object.freeze({ kind: 'action-definition', definitionId: 'copy.does' }),
      contract,
    };
    Object.defineProperty(record, ATTESTED, { value: true, enumerable: false });
    Object.freeze(record);
    const callable = (): undefined => undefined;
    Object.defineProperty(callable, BRAND, { value: record, enumerable: false });
    return callable;
  }

  it('the steady lookalike is recognised — so the refusal below is the does law alone', () => {
    const steady = lookalike(() => 'Run the copied action');
    expect(isDefinedAction(steady)).toBe(true);
    expect(actionDefinitionOf(steady)?.ref.definitionId).toBe('copy.does');
  });

  it("a 'does' that reads blank at the recheck is refused, even though the first look passed", () => {
    let reads = 0;
    const blanking = lookalike(() => {
      reads += 1;
      // isRecord's first look reads it twice (type, then trim); every read
      // after that belongs to the authored law's recheck — and gets nothing.
      return reads <= 2 ? 'Run the copied action' : '   ';
    });
    expect(isDefinedAction(blanking)).toBe(false);
    expect(reads).toBeGreaterThan(2);
  });
});
