import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  defineAction,
  isDefinedAction,
} from '../src/index.js';

describe('defineAction — grouped v2 declaration and exact callable behavior', () => {
  const defineUnchecked = (options: unknown) =>
    Reflect.apply(defineAction, undefined, ['unchecked.action', options]);

  it('preserves this, arguments, return identity, name, and arity', () => {
    const result = { exact: true };
    function archive(
      this: { prefix: string },
      orderId: string,
      reason: string,
    ) {
      expect(this.prefix).toBe('orders');
      expect(orderId).toBe('o-57');
      expect(reason).toBe('duplicate');
      return result;
    }

    const action = defineAction('orders.archive', {
      does: 'Archive this order',
      invocation: 'host',
      mutate: archive,
    });

    expect(action.call({ prefix: 'orders' }, 'o-57', 'duplicate')).toBe(result);
    expect(action.apply({ prefix: 'orders' }, ['o-57', 'duplicate'])).toBe(
      result,
    );
    expect(action.bind({ prefix: 'orders' })('o-57', 'duplicate')).toBe(result);
    expect(action.name).toBe(archive.name);
    expect(action.length).toBe(archive.length);
    expect(Object.getPrototypeOf(action)).toBe(Object.getPrototypeOf(archive));
    expect(Object.hasOwn(action, 'call')).toBe(false);
  });

  it('returns exact promises and thenables, and rethrows the exact error', () => {
    const promise = Promise.resolve('done');
    const promised = defineAction('jobs.promise', {
      does: 'Return the promise',
      invocation: 'inputless',
      mutate: () => promise,
    });
    expect(promised()).toBe(promise);

    const thenable = { then: () => undefined };
    const thenabled = defineAction('jobs.thenable', {
      does: 'Return the thenable',
      invocation: 'inputless',
      mutate: () => thenable,
    });
    expect(thenabled()).toBe(thenable);

    const error = new Error('exact failure');
    const throwing = defineAction('jobs.throw', {
      does: 'Throw the error',
      invocation: 'inputless',
      mutate: () => {
        throw error;
      },
    });
    expect(() => throwing()).toThrow(error);
  });

  it('brands a frozen contract that excludes mutate and all live binding facts', () => {
    const writes = ['orders.openIds'];
    const mutate = (input: { orderId: string }) => input.orderId;
    const action = defineAction('orders.archive', {
      does: 'Archive this order',
      invocation: 'scalar',
      settle: { writes },
      mutate,
    });
    writes.push('attacker.added');

    const definition = actionDefinitionOf(action)!;
    expect(definition).toMatchObject({
      ref: { kind: 'action-definition', definitionId: 'orders.archive' },
      contract: {
        does: 'Archive this order',
        invocation: 'scalar',
        settle: { writes: ['orders.openIds'] },
      },
    });
    expect('mutate' in definition.contract).toBe(false);
    expect('currentBinding' in action).toBe(false);
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.ref)).toBe(true);
    expect(Object.isFrozen(definition.contract)).toBe(true);
    expect(Object.isFrozen(definition.contract.settle)).toBe(true);
    expect(Object.isFrozen(definition.contract.settle?.writes)).toBe(true);
    expect(Object.keys(action)).toEqual([]);
    expect(isDefinedAction(action)).toBe(true);
    expect(isDefinedAction(mutate)).toBe(false);
  });

  it('owns grouped declarations while retaining reader, predicate, and schema identities', () => {
    const when = { page: { eq: 'orders' } };
    const blockedBecause = () => ({
      says: 'Wait for the archive job',
      clearedBy: 'app' as const,
    });
    const verify = () => true;
    const inputSchema = { safeParse: () => ({ success: true as const }) };
    const channelSchema = { type: 'string' };
    const mayInvoke: Array<'human' | 'agent'> = ['human'];

    const action = defineAction('orders.archive-owned', {
      does: 'Archive this order',
      invocation: 'scalar',
      inputSchema,
      guard: { when, blockedBecause },
      settle: {
        verify,
        progress: { stages: ['queued', 'stored'], required: true },
      },
      principal: { mayInvoke },
      needs: { subject: { kind: 'order', schema: channelSchema } },
      produces: { kind: 'archive-receipt', schema: channelSchema },
      mutate: (input: string) => input,
    });

    when.page.eq = 'attacker';
    mayInvoke.push('agent');
    const contract = actionDefinitionOf(action)!.contract;
    expect(contract.guard?.when).toEqual({ page: { eq: 'orders' } });
    expect(contract.principal?.mayInvoke).toEqual(['human']);
    expect(contract.inputSchema).toBe(inputSchema);
    expect(contract.guard?.blockedBecause).toBe(blockedBecause);
    expect(contract.settle?.verify).toBe(verify);
    expect(contract.needs?.subject.schema).toBe(channelSchema);
    expect(contract.produces?.schema).toBe(channelSchema);
    expect(Object.isFrozen(contract.guard)).toBe(true);
    expect(Object.isFrozen(contract.guard?.when)).toBe(true);
    expect(Object.isFrozen(contract.principal)).toBe(true);
    expect(Object.isFrozen(contract.settle?.progress)).toBe(true);
    expect(Object.isFrozen(contract.settle?.progress?.stages)).toBe(true);
    expect(Object.isFrozen(inputSchema)).toBe(false);
    expect(Object.isFrozen(channelSchema)).toBe(false);
  });

  it('owns a plain JSON Schema and preserves an own __proto__ key safely', () => {
    const inputSchema = JSON.parse(
      '{"type":"object","properties":{"__proto__":{"type":"string","polluted":true}}}',
    ) as Record<string, unknown>;
    const action = defineAction('schemas.prototype-key', {
      does: 'Accept a prototype-named field',
      invocation: 'scalar',
      inputSchema,
      mutate: (_input: unknown) => undefined,
    });

    const retained = actionDefinitionOf(action)!.contract.inputSchema as {
      properties: Record<string, unknown>;
    };
    expect(retained).not.toBe(inputSchema);
    expect(Object.hasOwn(retained.properties, '__proto__')).toBe(true);
    expect(retained.properties.polluted).toBeUndefined();
    expect(Object.isFrozen(retained)).toBe(true);
    expect(Object.isFrozen(retained.properties)).toBe(true);
  });

  it('recognises a frozen Symbol.for brand from a second installed copy', () => {
    const original = defineAction('shared.action', {
      does: 'Run the shared action',
      invocation: 'inputless',
      mutate: () => 'ok',
    });
    const foreignCopy = () => 'ok';
    Object.defineProperty(
      foreignCopy,
      Symbol.for('hcifootprint.action-definition.v2'),
      { value: actionDefinitionOf(original), enumerable: false },
    );

    expect(isDefinedAction(foreignCopy)).toBe(true);
    expect(actionDefinitionOf(foreignCopy)?.ref.definitionId).toBe(
      'shared.action',
    );
  });

  it('rejects mutable or malformed branded lookalikes and hostile brand readers', () => {
    const forged = () => 'not-defined';
    Object.defineProperty(
      forged,
      Symbol.for('hcifootprint.action-definition.v2'),
      {
        value: {
          ref: { kind: 'action-definition', definitionId: 'forged.action' },
          contract: {
            does: 'Pretend to be an action',
            invocation: 'inputless',
          },
        },
      },
    );
    expect(isDefinedAction(forged)).toBe(false);

    const frozenMalformed = () => 'still-not-defined';
    const malformedRecord = {
      ref: Object.freeze({
        kind: 'action-definition',
        definitionId: 'forged.frozen',
      }),
      contract: Object.freeze({
        does: 'Pretend to be frozen',
        invocation: 'inputless',
        confirm: true,
      }),
    };
    Object.defineProperty(
      malformedRecord,
      Symbol.for('hcifootprint.action-definition.validated.v2'),
      { value: true, enumerable: false },
    );
    Object.freeze(malformedRecord);
    Object.defineProperty(
      frozenMalformed,
      Symbol.for('hcifootprint.action-definition.v2'),
      { value: malformedRecord },
    );
    expect(isDefinedAction(frozenMalformed)).toBe(false);

    const hostile = new Proxy(() => undefined, {
      get(target, property, receiver) {
        if (property === Symbol.for('hcifootprint.action-definition.v2')) {
          throw new Error('hostile brand getter');
        }
        return Reflect.get(target, property, receiver);
      },
    });
    expect(isDefinedAction(hostile)).toBe(false);
    expect(actionDefinitionOf(hostile)).toBeUndefined();
  });

  it('requires one id plus one options record with mutate, and refuses double wrapping', () => {
    expect(() =>
      defineAction('   ', {
        does: 'No identity',
        invocation: 'inputless',
        mutate: () => undefined,
      }),
    ).toThrow(/non-empty definition id/);
    expect(() =>
      defineUnchecked({ does: 'Missing mutate', invocation: 'inputless' }),
    ).toThrow(/options\.mutate to be a function/);
    expect(() =>
      Reflect.apply(defineAction, undefined, [
        'legacy.three-arguments',
        { does: 'Old contract', invocation: 'inputless' },
        () => undefined,
      ]),
    ).toThrow(/takes exactly two arguments/);

    const action = defineAction('once', {
      does: 'Run once',
      invocation: 'inputless',
      mutate: () => undefined,
    });
    expect(() =>
      defineAction('twice', {
        does: 'Wrap twice',
        invocation: 'inputless',
        mutate: action,
      }),
    ).toThrow(/already an action definition/);
  });

  it.each([
    'when',
    'writes',
    'verify',
    'principalPolicy',
    'confirm',
    'humanDecides',
    'freshness',
    'concurrency',
  ])('rejects removed or flat v1 field %s', (field) => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        mutate: () => undefined,
        [field]: field === 'writes' ? [] : {},
      }),
    ).toThrow(new RegExp(`unknown field '${field}'`));
  });

  it('rejects unknown and accessor fields at every authored record boundary', () => {
    let reads = 0;
    const guard = Object.defineProperty({}, 'when', {
      enumerable: true,
      get() {
        reads += 1;
        return { ready: { eq: true } };
      },
    });
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        guard,
        mutate: () => undefined,
      }),
    ).toThrow(
      /contract\.guard field 'when' must be an enumerable data property/,
    );
    expect(reads).toBe(0);

    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        settle: { writes: [], guessed: true },
        mutate: () => undefined,
      }),
    ).toThrow(/contract\.settle declares unknown field 'guessed'/);

    const blockedBecause = Object.defineProperty(
      { says: 'Wait', clearedBy: 'app' },
      'extra',
      { value: true, enumerable: true },
    );
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        guard: { blockedBecause },
        mutate: () => undefined,
      }),
    ).toThrow(/blockedBecause.*unknown field 'extra'/);

    const symbolField = Symbol('private-site-handle');
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        mutate: () => undefined,
        [symbolField]: {},
      }),
    ).toThrow(/unknown field 'Symbol\(private-site-handle\)'/);
  });

  it.each([
    ['guard', { guard: {} }],
    ['settle', { settle: {} }],
    ['principal', { principal: {} }],
    ['guard with only undefined', { guard: { when: undefined } }],
    ['settle with only undefined', { settle: { writes: undefined } }],
    [
      'principal with only undefined',
      { principal: { decisionOwner: undefined } },
    ],
  ])('rejects an empty %s group at the JavaScript door', (_name, extra) => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        mutate: () => undefined,
        ...extra,
      }),
    ).toThrow(/must declare at least one clause; omit the group/);
  });

  it('accepts non-empty unique write and read key declarations', () => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        settle: {
          writes: ['orders.archived'],
          reads: ['orders.selection'],
        },
        mutate: () => undefined,
      }),
    ).not.toThrow();
  });

  it.each([
    ['empty writes', { writes: [] }],
    ['empty reads', { reads: [] }],
    ['blank writes', { writes: [' '] }],
    ['blank reads', { reads: ['orders.selection', '\t'] }],
    ['duplicate writes', { writes: ['orders.archived', 'orders.archived'] }],
    ['duplicate reads', { reads: ['orders.selection', 'orders.selection'] }],
    ['non-string writes', { writes: ['orders.archived', 42] }],
    ['non-array reads', { reads: 'orders.selection' }],
  ])('rejects %s', (_name, settle) => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        settle,
        mutate: () => undefined,
      }),
    ).toThrow(/non-empty array of unique, non-blank state-key strings/);
  });

  it.each([
    [
      'guard operator',
      { guard: { when: { ready: { equals: true } } } },
      /unknown operator 'equals'/,
    ],
    [
      'empty enabledWhen',
      { guard: { enabledWhen: {} } },
      /empty guard\.enabledWhen/,
    ],
    [
      'input schema',
      { inputSchema: { notAValidator: true } },
      /unrecognized input schema/,
    ],
    [
      'principal policy',
      { principal: { mayInvoke: ['user'] } },
      /write 'human'/,
    ],
    [
      'observability coherence',
      { settle: { observability: 'postcondition' } },
      /does not declare.*verify/,
    ],
    ['canonical role', { role: 'primary' }, /role must be one of/],
    ['empty needs', { needs: {} }, /needs must name at least one input/],
    [
      'need vocabulary',
      { needs: { subject: { kind: 'order', source: 'selection' } } },
      /needs\.subject declares unknown field 'source'/,
    ],
    [
      'produces kind',
      { produces: { kind: '' } },
      /produces\.kind must be a non-empty string/,
    ],
    [
      'duplicate progress',
      { settle: { progress: { stages: ['sent', 'sent'] } } },
      /stages must be unique/,
    ],
  ])('rejects a malformed JS-shaped %s contract', (_name, extra, error) => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        mutate: () => undefined,
        ...extra,
      }),
    ).toThrow(error);
  });

  it('enforces invocation, schema, and lifecycle laws at the JavaScript door', () => {
    expect(() =>
      defineUnchecked({ does: 'Missing invocation', mutate: () => undefined }),
    ).toThrow(/invocation must be inputless, scalar, or host/);
    expect(() =>
      defineUnchecked({
        does: 'Contradict a visible slot',
        invocation: 'inputless',
        mutate: (_value: unknown) => undefined,
      }),
    ).toThrow(/inputless.*mutate exposes 1 positional slot/);
    expect(() =>
      defineUnchecked({
        does: 'Contradict several slots',
        invocation: 'scalar',
        mutate: (_left: unknown, _right: unknown) => undefined,
      }),
    ).toThrow(/scalar.*mutate exposes 2 positional slots/);
    expect(() =>
      defineUnchecked({
        does: 'Allow an opted-in lifecycle',
        invocation: 'inputless',
        settle: { progress: { stages: ['sent'] } },
        mutate: (_lifecycle: unknown) => undefined,
      }),
    ).not.toThrow();
    expect(() =>
      defineUnchecked({
        does: 'Forbid lifecycle without progress',
        invocation: 'inputless',
        mutate: (_lifecycle: unknown) => undefined,
      }),
    ).toThrow(/Declare settle\.progress/);
    expect(() =>
      defineUnchecked({
        does: 'Contradict inputless schema',
        invocation: 'inputless',
        inputSchema: { safeParse: () => ({ success: true }) },
        mutate: () => undefined,
      }),
    ).toThrow(/inputless invocation with an input schema/);
    expect(() =>
      defineUnchecked({
        does: 'Contradict scalar schema',
        invocation: 'scalar',
        inputSchema: 'none',
        mutate: (_value: unknown) => undefined,
      }),
    ).toThrow(/scalar invocation with inputSchema: 'none'/);
    expect(() =>
      defineUnchecked({
        does: 'Contradict host schema',
        invocation: 'host',
        inputSchema: { safeParse: () => ({ success: true }) },
        mutate: (_value: unknown) => undefined,
      }),
    ).toThrow(/host invocation with an input schema/);
    expect(() =>
      defineUnchecked({
        does: 'Host cannot receive a lifecycle',
        invocation: 'host',
        settle: { progress: { stages: ['sent'] } },
        mutate: (_value: unknown) => undefined,
      }),
    ).toThrow(/host invocation cannot declare settle\.progress/);
  });
});
