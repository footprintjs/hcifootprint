import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  defineAction,
  isDefinedAction,
} from '../src/index.js';

describe('defineAction — one callable definition, ordinary JavaScript behavior', () => {
  const defineUnchecked = (contract: unknown) =>
    defineAction(
      'unchecked.action',
      contract as Parameters<typeof defineAction>[1],
      () => undefined,
    );

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
      { does: 'Archive this order' },
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
    const action = defineAction('labels.make', { does: 'Make a label' }, label);

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
      { does: 'Return the promise' },
      () => promise,
    );
    expect(promised()).toBe(promise);

    const thenable = { then: () => undefined };
    const thenabled = defineAction(
      'jobs.thenable',
      { does: 'Return the thenable' },
      () => thenable,
    );
    expect(thenabled()).toBe(thenable);

    const error = new Error('exact failure');
    const throwing = defineAction(
      'jobs.throw',
      { does: 'Throw the error' },
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
      { does: 'Archive this order', writes },
      (input: { orderId: string }) => input.orderId,
    );
    writes.push('attacker.added');

    const definition = actionDefinitionOf(action);
    expect(definition).toMatchObject({
      ref: { kind: 'action-definition', definitionId: 'orders.archive' },
      contract: {
        does: 'Archive this order',
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
    const input = { safeParse: () => ({ success: true as const }) };
    const action = defineAction(
      'orders.choose',
      {
        does: 'Choose the order',
        enabledWhen,
        principalPolicy: { mayInvoke },
        humanDecides,
        input,
      },
      () => undefined,
    );

    enabledWhen.ready.eq = false;
    mayInvoke.push('agent');
    humanDecides.doneWhen.chosen.eq = false;
    const contract = actionDefinitionOf(action)!.contract;

    expect(contract.enabledWhen).toEqual({ ready: { eq: true } });
    expect(contract.principalPolicy?.mayInvoke).toEqual(['human']);
    expect(contract.humanDecides?.doneWhen).toEqual({ chosen: { eq: true } });
    expect(contract.input).toBe(input);
    expect(Object.isFrozen(contract.enabledWhen)).toBe(true);
    expect(Object.isFrozen(contract.enabledWhen?.ready)).toBe(true);
  });

  it('recognises the Symbol.for brand a second installed copy would read', () => {
    const original = defineAction(
      'shared.action',
      { does: 'Run the shared action' },
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
    Object.defineProperty(
      frozenMalformed,
      Symbol.for('hcifootprint.action-definition.v1'),
      {
        value: Object.freeze({
          ref: Object.freeze({
            kind: 'action-definition',
            definitionId: 'forged.frozen',
          }),
          contract: Object.freeze({
            does: 'Pretend to be frozen',
            confirm: 'yes',
          }),
        }),
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
      defineAction('   ', { does: 'No identity' }, () => undefined),
    ).toThrow(/non-empty definition id/);

    const action = defineAction('once', { does: 'Run once' }, () => undefined);
    expect(() =>
      defineAction('twice', { does: 'Wrap twice' }, action),
    ).toThrow(/already an action definition/);
  });

  it('rejects live-site binding and unknown fields presented through plain JavaScript', () => {
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        binding: { kind: 'programmatic', provider: 'orders' },
      }),
    ).toThrow(/live-site 'binding'.*connectAction\(\)\/attach\(\)/);

    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
        enabledWen: { ready: { eq: true } },
      }),
    ).toThrow(/unknown contract field 'enabledWen'/);

    const symbolField = Symbol('private-site-handle');
    expect(() =>
      defineUnchecked({
        does: 'Archive the order',
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
      { does: 'Archive the order' },
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
      { does: 'Archive the order', when: { ready: { equals: true } } },
      /unknown operator 'equals'/,
    ],
    [
      'empty enabledWhen',
      { does: 'Archive the order', enabledWhen: {} },
      /empty enabledWhen/,
    ],
    [
      'input schema',
      { does: 'Archive the order', input: { notAValidator: true } },
      /unrecognized input schema/,
    ],
    [
      'principal policy',
      {
        does: 'Archive the order',
        principalPolicy: { mayInvoke: ['user'] },
      },
      /write 'human'/,
    ],
    [
      'observability coherence',
      { does: 'Archive the order', observability: 'postcondition' },
      /does not declare.*verify/,
    ],
    [
      'freshness vocabulary',
      { does: 'Archive the order', freshness: { readsChanged: 'refuse' } },
      /unknown freshness axis 'readsChanged'/,
    ],
    [
      'concurrency vocabulary',
      { does: 'Archive the order', concurrency: { mode: 'single-fight' } },
      /concurrency mode 'single-fight'/,
    ],
    [
      'canonical role',
      { does: 'Archive the order', role: 'primary' },
      /role must be one of/,
    ],
  ])('rejects a malformed JS-shaped %s contract', (_name, contract, error) => {
    expect(() => defineUnchecked(contract)).toThrow(error);
  });

  it.each([
    ['when', { does: 'Archive the order', when: null }],
    ['writes', { does: 'Archive the order', writes: 'orders.openIds' }],
    ['goTo', { does: 'Archive the order', goTo: 42 }],
    ['confirm', { does: 'Archive the order', confirm: 'yes' }],
    ['freshness', { does: 'Archive the order', freshness: null }],
    ['concurrency', { does: 'Archive the order', concurrency: [] }],
  ])('rejects a wrong runtime shape for %s', (field, contract) => {
    expect(() => defineUnchecked(contract)).toThrow(
      new RegExp(`${field} must be`),
    );
  });
});
