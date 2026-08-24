import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  defineAction,
  isDefinedAction,
} from '../src/index.js';

describe('defineAction — one callable definition, ordinary JavaScript behavior', () => {
  const defineUnchecked = (contract: unknown) =>
    Reflect.apply(defineAction, undefined, [
      'unchecked.action',
      contract,
      () => undefined,
    ]);

  it('preserves this, arguments, return identity, name, and arity', () => {
    const result = { exact: true };
    function archive(this: { prefix: string }, orderId: string, reason: string) {
      expect(this.prefix).toBe('orders');
      expect(orderId).toBe('o-57');
      expect(reason).toBe('duplicate');
      return result;
    }

    const action = defineAction(
      'orders.archive',
      { does: 'Archive this order', invocation: 'host' },
      archive,
    );

    expect(action.call({ prefix: 'orders' }, 'o-57', 'duplicate')).toBe(result);
    expect(action.name).toBe(archive.name);
    expect(action.length).toBe(archive.length);
    expect(Object.getPrototypeOf(action)).toBe(Object.getPrototypeOf(archive));
  });

  it('leaves native call, apply, and bind untouched', () => {
    function label(this: { prefix: string }, value: string) {
      return `${this.prefix}:${value}`;
    }
    const action = defineAction(
      'labels.make',
      { does: 'Make a label', invocation: 'host' },
      label,
    );

    expect(action.call({ prefix: 'call' }, 'x')).toBe('call:x');
    expect(action.apply({ prefix: 'apply' }, ['y'])).toBe('apply:y');
    expect(action.bind({ prefix: 'bind' })('z')).toBe('bind:z');
    expect(Object.hasOwn(action, 'call')).toBe(false);
    expect(Object.hasOwn(action, 'apply')).toBe(false);
    expect(Object.hasOwn(action, 'bind')).toBe(false);
  });

  it('returns the exact Promise or thenable and rethrows the exact error', () => {
    const promise = Promise.resolve('done');
    const promised = defineAction(
      'jobs.promise',
      { does: 'Return the promise', invocation: 'inputless' },
      () => promise,
    );
    expect(promised()).toBe(promise);

    const thenable = { then: () => undefined };
    const thenabled = defineAction(
      'jobs.thenable',
      { does: 'Return the thenable', invocation: 'inputless' },
      () => thenable,
    );
    expect(thenabled()).toBe(thenable);

    const error = new Error('exact failure');
    const throwing = defineAction(
      'jobs.throw',
      { does: 'Throw the error', invocation: 'inputless' },
      () => {
        throw error;
      },
    );
    expect(() => throwing()).toThrow(error);
  });

  it('carries one frozen, non-enumerable definition — never a mutable current binding', () => {
    const writes = ['orders.openIds'];
    const action = defineAction(
      'orders.archive',
      { does: 'Archive this order', invocation: 'scalar', writes },
      (input: { orderId: string }) => input.orderId,
    );
    writes.push('attacker.added');

    const definition = actionDefinitionOf(action);
    expect(definition).toMatchObject({
      ref: { kind: 'action-definition', definitionId: 'orders.archive' },
      contract: {
        does: 'Archive this order',
        invocation: 'scalar',
        writes: ['orders.openIds'],
      },
    });
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.ref)).toBe(true);
    expect(Object.isFrozen(definition.contract)).toBe(true);
    expect(Object.keys(action)).toEqual([]);
    expect('currentBinding' in action).toBe(false);
    expect(isDefinedAction(action)).toBe(true);
    expect(isDefinedAction(() => undefined)).toBe(false);
  });

  it('owns nested declaration records while leaving opaque validators by reference', () => {
    const enabledWhen = { ready: { eq: true } };
    const mayInvoke: Array<'human' | 'agent'> = ['human'];
    const humanDecides = {
      about: 'which order',
      doneWhen: { chosen: { eq: true } },
    };
    const inputSchema = { safeParse: () => ({ success: true as const }) };
    const action = defineAction(
      'orders.choose',
      {
        does: 'Choose the order',
        invocation: 'scalar',
        enabledWhen,
        principalPolicy: { mayInvoke },
        humanDecides,
        inputSchema,
      },
      (_input?: unknown) => undefined,
    );

    enabledWhen.ready.eq = false;
    mayInvoke.push('agent');
    humanDecides.doneWhen.chosen.eq = false;
    const contract = actionDefinitionOf(action)!.contract;

    expect(contract.enabledWhen).toEqual({ ready: { eq: true } });
    expect(contract.principalPolicy?.mayInvoke).toEqual(['human']);
    expect(contract.humanDecides?.doneWhen).toEqual({ chosen: { eq: true } });
    expect(contract.inputSchema).toBe(inputSchema);
    expect(Object.isFrozen(contract.enabledWhen)).toBe(true);
    expect(Object.isFrozen(contract.enabledWhen?.ready)).toBe(true);
  });

  it('owns and freezes inert channel declarations and plain input schemas', () => {
    const needs = {
      subject: {
        kind: 'order',
        schema: { type: 'string', minLength: 1 },
        from: 'selection',
      },
    };
    const produces = {
      kind: 'archive-receipt',
      schema: { type: 'object', required: ['orderId'] },
    };
    const inputSchema = {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    };
    const action = defineAction(
      'orders.archive-declarations',
      {
        does: 'Archive an order',
        invocation: 'scalar',
        needs,
        produces,
        inputSchema,
      },
      ({ orderId }: { orderId: string }) => orderId,
    );

    needs.subject.kind = 'attacker-kind';
    needs.subject.schema.type = 'number';
    produces.kind = 'attacker-output';
    produces.schema.required.push('attacker');
    inputSchema.properties.orderId.type = 'number';
    inputSchema.required.push('attacker');

    const contract = actionDefinitionOf(action)!.contract;
    expect(contract.needs).toEqual({
      subject: {
        kind: 'order',
        schema: { type: 'string', minLength: 1 },
        from: 'selection',
      },
    });
    expect(contract.produces).toEqual({
      kind: 'archive-receipt',
      schema: { type: 'object', required: ['orderId'] },
    });
    expect(contract.inputSchema).toEqual({
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    });
    expect(Object.isFrozen(contract.needs)).toBe(true);
    expect(Object.isFrozen(contract.needs?.subject)).toBe(true);
    expect(Object.isFrozen(contract.needs?.subject.schema)).toBe(true);
    expect(Object.isFrozen(contract.produces)).toBe(true);
    expect(Object.isFrozen(contract.produces?.schema)).toBe(true);
    expect(Object.isFrozen(contract.inputSchema)).toBe(true);
    const frozenInputSchema = contract.inputSchema as {
      readonly properties: {
        readonly orderId: { readonly type: string };
      };
      readonly required: readonly string[];
    };
    expect(Object.isFrozen(frozenInputSchema.properties)).toBe(true);
    expect(Object.isFrozen(frozenInputSchema.properties.orderId)).toBe(true);
    expect(Object.isFrozen(frozenInputSchema.required)).toBe(true);
    const frozenProducedSchema = contract.produces?.schema as {
      readonly required: readonly string[];
    };
    expect(Object.isFrozen(frozenProducedSchema.required)).toBe(true);
  });

  it('preserves an own __proto__ schema key without turning it into the clone prototype', () => {
    const inputSchema = JSON.parse(
      '{"type":"object","properties":{"__proto__":{"type":"string","polluted":true}}}',
    ) as Record<string, unknown>;
    const action = defineAction(
      'schemas.prototype-key',
      { does: 'Accept a prototype-named field', invocation: 'scalar', inputSchema },
      (_input: unknown) => undefined,
    );

    const frozenSchema = actionDefinitionOf(action)!.contract.inputSchema as {
      readonly properties: Record<string, unknown>;
    };
    expect(Object.getPrototypeOf(frozenSchema.properties)).toBe(Object.prototype);
    expect(Object.hasOwn(frozenSchema.properties, '__proto__')).toBe(true);
    expect(frozenSchema.properties['__proto__']).toEqual({
      type: 'string',
      polluted: true,
    });
    expect(frozenSchema.properties['polluted']).toBeUndefined();
    expect(Object.isFrozen(frozenSchema.properties)).toBe(true);
  });

  it('recognises the Symbol.for brand a second installed copy would read', () => {
    const original = defineAction(
      'shared.action',
      { does: 'Run the shared action', invocation: 'inputless' },
      () => 'ok',
    );
    const foreignCopy = () => 'ok';
    Object.defineProperty(
      foreignCopy,
      Symbol.for('hcifootprint.action-definition.v1'),
      {
        value: actionDefinitionOf(original),
        enumerable: false,
      },
    );

    expect(isDefinedAction(foreignCopy)).toBe(true);
    expect(actionDefinitionOf(foreignCopy)?.ref.definitionId).toBe('shared.action');
  });

  it('rejects a mutable lookalike brand while accepting frozen cross-copy bytes', () => {
    const forged = () => 'not-defined';
    Object.defineProperty(
      forged,
      Symbol.for('hcifootprint.action-definition.v1'),
      {
        value: {
          ref: { kind: 'action-definition', definitionId: 'forged.action' },
          contract: { does: 'Pretend to be an action' },
        },
      },
    );

    expect(isDefinedAction(forged)).toBe(false);
    expect(actionDefinitionOf(forged)).toBeUndefined();

    const frozenMalformed = () => 'still-not-defined';
    const malformedRecord = {
      ref: Object.freeze({
        kind: 'action-definition',
        definitionId: 'forged.frozen',
      }),
      contract: Object.freeze({
        does: 'Pretend to be frozen',
        invocation: 'inputless',
        confirm: 'yes',
      }),
    };
    Object.defineProperty(
      malformedRecord,
      Symbol.for('hcifootprint.action-definition.validated.v1'),
      {
        value: true,
        enumerable: false,
      },
    );
    Object.freeze(malformedRecord);
    Object.defineProperty(
      frozenMalformed,
      Symbol.for('hcifootprint.action-definition.v1'),
      {
        value: malformedRecord,
      },
    );
    expect(isDefinedAction(frozenMalformed)).toBe(false);
    expect(actionDefinitionOf(frozenMalformed)).toBeUndefined();

    const hostile = new Proxy(() => undefined, {
      get(target, property, receiver) {
        if (property === Symbol.for('hcifootprint.action-definition.v1')) {
          throw new Error('hostile brand getter');
        }
        return Reflect.get(target, property, receiver);
      },
    });
    expect(isDefinedAction(hostile)).toBe(false);
    expect(actionDefinitionOf(hostile)).toBeUndefined();
  });

  it('refuses empty ids and double wrapping instead of creating two identities', () => {
    expect(() =>
      defineAction(
        '   ',
        { does: 'No identity', invocation: 'inputless' },
        () => undefined,
      ),
    ).toThrow(/non-empty definition id/);

    const action = defineAction(
      'once',
      { does: 'Run once', invocation: 'inputless' },
      () => undefined,
    );
    expect(() =>
      defineAction(
        'twice',
        { does: 'Wrap twice', invocation: 'inputless' },
        action,
      ),
    ).toThrow(/already an action definition/);
  });

  it('rejects live-site binding and unknown fields presented through plain JavaScript', () => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        binding: { kind: 'programmatic', provider: 'orders' },
      }),
    ).toThrow(/live-site 'binding'.*connectAction\(\)\/attach\(\)/);

    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        enabledWen: { ready: { eq: true } },
      }),
    ).toThrow(/unknown contract field 'enabledWen'/);

    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        input: { safeParse: () => ({ success: true }) },
      }),
    ).toThrow(/definitions use 'inputSchema'.*live invocation-time value reader/);

    const symbolField = Symbol('private-site-handle');
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        invocation: 'inputless',
        [symbolField]: {},
      }),
    ).toThrow(/unknown contract field 'Symbol\(private-site-handle\)'/);
  });

  it('rejects accessor and hidden contract fields before branding a callable', () => {
    let doesReads = 0;
    const accessorContract = Object.defineProperty({}, 'does', {
      enumerable: true,
      get() {
        doesReads += 1;
        return doesReads < 3 ? 'A changing sentence' : 42;
      },
    });

    expect(() => defineUnchecked(accessorContract)).toThrow(
      /contract field 'does' must be an enumerable data property/,
    );
    expect(doesReads).toBe(0);

    const hiddenContract = Object.defineProperty(
      { does: 'Archive the order', invocation: 'inputless' },
      'writes',
      { value: ['orders.openIds'], enumerable: false },
    );
    expect(() => defineUnchecked(hiddenContract)).toThrow(
      /contract field 'writes' must be an enumerable data property/,
    );
  });

  it.each([
    [
      'guard operator',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        when: { ready: { equals: true } },
      },
      /unknown operator 'equals'/,
    ],
    [
      'empty enabledWhen',
      { does: 'Archive the order', invocation: 'inputless', enabledWhen: {} },
      /empty enabledWhen/,
    ],
    [
      'input schema',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        inputSchema: { notAValidator: true },
      },
      /unrecognized input schema/,
    ],
    [
      'principal policy',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        principalPolicy: { mayInvoke: ['user'] },
      },
      /write 'human'/,
    ],
    [
      'observability coherence',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        observability: 'postcondition',
      },
      /does not declare.*verify/,
    ],
    [
      'freshness vocabulary',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        freshness: { readsChanged: 'refuse' },
      },
      /unknown freshness axis 'readsChanged'/,
    ],
    [
      'concurrency vocabulary',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        concurrency: { mode: 'single-fight' },
      },
      /concurrency mode 'single-fight'/,
    ],
    [
      'canonical role',
      { does: 'Archive the order', invocation: 'inputless', role: 'primary' },
      /role must be one of/,
    ],
    [
      'empty needs',
      { does: 'Archive the order', invocation: 'inputless', needs: {} },
      /needs must name at least one input/,
    ],
    [
      'need kind',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        needs: { subject: { kind: ' ' } },
      },
      /needs\.subject\.kind must be a non-empty string/,
    ],
    [
      'need vocabulary',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        needs: { subject: { kind: 'order', source: 'selection' } },
      },
      /needs\.subject declares unknown field 'source'/,
    ],
    [
      'produces kind',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        produces: { kind: '' },
      },
      /produces\.kind must be a non-empty string/,
    ],
  ])('rejects a malformed JS-shaped %s contract', (_name, contract, error) => {
    expect(() => defineUnchecked(contract)).toThrow(error);
  });

  it.each([
    [
      'when',
      { does: 'Archive the order', invocation: 'inputless', when: null },
    ],
    [
      'writes',
      {
        does: 'Archive the order',
        invocation: 'inputless',
        writes: 'orders.openIds',
      },
    ],
    [
      'goTo',
      { does: 'Archive the order', invocation: 'inputless', goTo: 42 },
    ],
    [
      'confirm',
      { does: 'Archive the order', invocation: 'inputless', confirm: 'yes' },
    ],
    [
      'freshness',
      { does: 'Archive the order', invocation: 'inputless', freshness: null },
    ],
    [
      'concurrency',
      { does: 'Archive the order', invocation: 'inputless', concurrency: [] },
    ],
  ])('rejects a wrong runtime shape for %s', (field, contract) => {
    expect(() => defineUnchecked(contract)).toThrow(
      new RegExp(`${field} must be`),
    );
  });

  it('rejects contradictory invocation declarations through plain JavaScript', () => {
    expect(() =>
      defineUnchecked({ does: 'Missing an invocation declaration' }),
    ).toThrow(/invocation must be inputless, scalar, or host/);

    expect(() =>
      defineUnchecked({
        does: 'Use an unknown invocation declaration',
        invocation: 'automatic',
      }),
    ).toThrow(/invocation must be inputless, scalar, or host/);

    expect(() =>
      Reflect.apply(defineAction, undefined, [
        'unchecked.inputless-slot',
        { does: 'Contradict a visible slot', invocation: 'inputless' },
        (_value: unknown) => undefined,
      ]),
    ).toThrow(/declares invocation: 'inputless'.*1 positional input slot/);

    expect(() =>
      Reflect.apply(defineAction, undefined, [
        'unchecked.scalar-slots',
        { does: 'Contradict several slots', invocation: 'scalar' },
        (_left: unknown, _right: unknown) => undefined,
      ]),
    ).toThrow(/declares invocation: 'scalar'.*2 positional input slots/);

    expect(() =>
      defineUnchecked({
        does: 'Contradict inputless schema',
        invocation: 'inputless',
        inputSchema: { safeParse: () => ({ success: true }) },
      }),
    ).toThrow(/inputless invocation with an input schema/);

    expect(() =>
      Reflect.apply(defineAction, undefined, [
        'unchecked.scalar-none',
        {
          does: 'Contradict scalar schema',
          invocation: 'scalar',
          inputSchema: 'none',
        },
        (_value: unknown) => undefined,
      ]),
    ).toThrow(/scalar invocation with inputSchema: 'none'/);

    expect(() =>
      Reflect.apply(defineAction, undefined, [
        'unchecked.host-schema',
        {
          does: 'Contradict host schema',
          invocation: 'host',
          inputSchema: { safeParse: () => ({ success: true }) },
        },
        (_value: unknown) => undefined,
      ]),
    ).toThrow(/host invocation with an input schema/);
  });
});
