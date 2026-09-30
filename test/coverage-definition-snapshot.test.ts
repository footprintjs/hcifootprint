import { describe, expect, it } from 'vitest';
import {
  actionDefinitionOf,
  defineAction,
  isDefinedAction,
} from '../src/index.js';

/**
 * definition.ts · the authoring laws a definition is held to, at BOTH doors:
 *
 * - `defineAction` (the JavaScript door, where authored options are captured
 *   and frozen before they are judged), and
 * - `actionDefinitionOf` / `isDefinedAction` recognising a branded record
 *   minted by ANOTHER installed copy of the package (`isRecord`). There the
 *   attestation marker says "this passed the laws when it was made", and the
 *   law is that a marker can never bless malformed bytes: every authored law
 *   is re-checked, and a lookalike that breaks one is an ordinary function.
 *
 * Several refusals in `validateActionDefinitionContract` are pre-empted at
 * the JavaScript door by the freeze step (`captureAuthoredRecord` refuses a
 * non-plain or unknown-field record first), so the recognising door is the
 * only one where they can speak. Each lookalike below is a VALID record with
 * exactly one law broken, and the valid baseline is asserted recognised
 * first — so a `false` names that one law, not an accident of the fixture.
 */

const defineUnchecked = (id: string, options: unknown) =>
  Reflect.apply(defineAction, undefined, [id, options]);

const BRAND = Symbol.for('hcifootprint.action-definition.v2');
const ATTESTED = Symbol.for('hcifootprint.action-definition.validated.v2');

/** A callable branded the way a second installed copy would brand it. */
function lookalike(contract: object): () => undefined {
  const record = {
    ref: Object.freeze({
      kind: 'action-definition',
      definitionId: 'copy.action',
    }),
    contract: Object.freeze(contract),
  };
  Object.defineProperty(record, ATTESTED, { value: true, enumerable: false });
  Object.freeze(record);
  const callable = (): undefined => undefined;
  Object.defineProperty(callable, BRAND, { value: record, enumerable: false });
  return callable;
}

const base = { does: 'Run the copied action', invocation: 'inputless' };

describe('actionDefinitionOf — only a function can carry a definition', () => {
  it.each([
    ['null', null],
    ['a plain record', { does: 'Not callable' }],
    ['a string', 'orders.archive'],
  ])('%s is no definition at all', (_name, value) => {
    expect(actionDefinitionOf(value)).toBeUndefined();
    expect(isDefinedAction(value)).toBe(false);
  });
});

describe('a lookalike from another copy is recognised only when every authored law holds', () => {
  it('the valid baselines ARE recognised — so each refusal below is its one broken law', () => {
    for (const contract of [
      base,
      { ...base, settle: { progress: { stages: ['queued'] } } },
      { ...base, settle: { writes: ['orders'], evidence: { kind: 'receipt' } } },
      { ...base, needs: { subject: { kind: 'order', from: 'selection' } } },
      { ...base, produces: { kind: 'order' } },
    ]) {
      expect(isDefinedAction(lookalike(contract))).toBe(true);
    }
  });

  it('refuses a contract that is not a plain authored object', () => {
    const classed = Object.assign(Object.create({ inherited: true }), base);
    expect(isDefinedAction(lookalike(classed))).toBe(false);
  });

  it('refuses a contract field that is an accessor or not enumerable', () => {
    const accessor = { ...base };
    Object.defineProperty(accessor, 'role', {
      get: () => 'submit',
      enumerable: true,
    });
    expect(isDefinedAction(lookalike(accessor))).toBe(false);

    const hidden = { ...base };
    Object.defineProperty(hidden, 'role', { value: 'submit', enumerable: false });
    expect(isDefinedAction(lookalike(hidden))).toBe(false);
  });

  it("refuses a live-site 'binding' and a live 'input' reader on a definition", () => {
    expect(
      isDefinedAction(lookalike({ ...base, binding: { kind: 'element' } })),
    ).toBe(false);
    expect(isDefinedAction(lookalike({ ...base, input: () => 'value' }))).toBe(
      false,
    );
  });

  it('refuses a progress declaration that is not a plain record, or names an unknown field', () => {
    expect(
      isDefinedAction(lookalike({ ...base, settle: { progress: ['queued'] } })),
    ).toBe(false);
    expect(
      isDefinedAction(
        lookalike({
          ...base,
          settle: { progress: { stages: ['queued'], order: 'strict' } },
        }),
      ),
    ).toBe(false);
  });

  it('refuses an evidence declaration that is not a plain record, or carries more than its kind', () => {
    expect(
      isDefinedAction(
        lookalike({ ...base, settle: { writes: ['orders'], evidence: ['receipt'] } }),
      ),
    ).toBe(false);
    expect(
      isDefinedAction(
        lookalike({
          ...base,
          settle: { writes: ['orders'], evidence: { kind: 'receipt', schema: {} } },
        }),
      ),
    ).toBe(false);
  });

  it('refuses needs that are not a record, a channel that is not a declaration, and a field the channel does not take', () => {
    expect(
      isDefinedAction(lookalike({ ...base, needs: [{ kind: 'order' }] })),
    ).toBe(false);
    expect(isDefinedAction(lookalike({ ...base, produces: 'order' }))).toBe(
      false,
    );
    // `from` names where a NEED is read from; an output has no source.
    expect(
      isDefinedAction(
        lookalike({ ...base, produces: { kind: 'order', from: 'selection' } }),
      ),
    ).toBe(false);
  });
});

describe('defineAction — refusals the JavaScript door speaks itself', () => {
  it('needs an options record, not null, a string, or an array', () => {
    for (const options of [null, 'mutate', [() => undefined]]) {
      expect(() => defineUnchecked('shape.options', options)).toThrow(
        /defineAction\('shape\.options'\) needs an options record containing mutate/,
      );
    }
  });

  it("needs its own 'does' sentence before anything else is judged", () => {
    expect(() =>
      defineUnchecked('shape.no-does', {
        invocation: 'inputless',
        mutate: () => undefined,
      }),
    ).toThrow(/needs a non-empty authored 'does' sentence/);
    expect(() =>
      defineUnchecked('shape.blank-does', {
        does: '   ',
        invocation: 'inputless',
        mutate: () => undefined,
      }),
    ).toThrow(/needs a non-empty authored 'does' sentence/);
  });

  it("a live-site 'binding' or 'input' on the options is refused as a field the definition does not have", () => {
    for (const field of ['binding', 'input']) {
      expect(() =>
        defineUnchecked('shape.live-site', {
          does: 'Carry a live-site field',
          invocation: 'inputless',
          mutate: () => undefined,
          [field]: {},
        }),
      ).toThrow(new RegExp(`declares unknown field '${field}'`));
    }
  });

  it('accepts a null-prototype options record — it is still a plain authored record', () => {
    const options = Object.assign(Object.create(null), {
      does: 'Authored without a prototype',
      invocation: 'inputless',
      mutate: () => 'ok',
    });
    const action = defineUnchecked('shape.null-proto', options);
    expect(actionDefinitionOf(action)?.contract.does).toBe(
      'Authored without a prototype',
    );
  });

  it('names the lifecycle slot when a progress-declaring mutation exposes too many slots', () => {
    expect(() =>
      defineUnchecked('slots.inputless-progress', {
        does: 'Too many slots for a lifecycle',
        invocation: 'inputless',
        settle: { progress: { stages: ['sent'] } },
        mutate: (_lifecycle: unknown, _extra: unknown) => undefined,
      }),
    ).toThrow(/exposes 2 positional slot\(s\)\. Only the optional lifecycle slot is supported\./);
    expect(() =>
      defineUnchecked('slots.scalar-progress', {
        does: 'Too many slots for a payload and a lifecycle',
        invocation: 'scalar',
        inputSchema: { safeParse: () => ({ success: true }) },
        settle: { progress: { stages: ['sent'] } },
        mutate: (_value: unknown, _lifecycle: unknown, _extra: unknown) =>
          undefined,
      }),
    ).toThrow(/Scalar actions accept one payload plus the optional lifecycle;/);
  });
});

describe('defineAction — declaration laws reached through the frozen copy', () => {
  const inputless = (extra: object) => ({
    does: 'Archive the order',
    invocation: 'inputless',
    mutate: () => undefined,
    ...extra,
  });

  it('a declarative blockedBecause is kept as a frozen copy and judged by the guard law', () => {
    const authored = { says: 'The order is locked by finance.', clearedBy: 'app' };
    const action = defineUnchecked(
      'blocked.declared',
      inputless({ guard: { blockedBecause: authored } }),
    );
    const kept = actionDefinitionOf(action)?.contract.guard?.blockedBecause;
    expect(kept).toEqual(authored);
    expect(kept).not.toBe(authored);
    expect(Object.isFrozen(kept)).toBe(true);

    expect(() =>
      defineUnchecked(
        'blocked.empty-says',
        inputless({ guard: { blockedBecause: { says: ' ', clearedBy: 'app' } } }),
      ),
    ).toThrow(/blockedBecause\.says is empty/);
    expect(() =>
      defineUnchecked(
        'blocked.unknown-mover',
        inputless({
          guard: { blockedBecause: { says: 'Locked.', clearedBy: 'nobody' } },
        }),
      ),
    ).toThrow(/blockedBecause\.clearedBy must be one of 'app', 'user', 'invalid'/);
    // A clause left out stays out of the copy — never filled with undefined —
    // so the law judges exactly what was authored.
    expect(() =>
      defineUnchecked(
        'blocked.no-mover',
        inputless({ guard: { blockedBecause: { says: 'Locked.' } } }),
      ),
    ).toThrow(/blockedBecause\.clearedBy must be one of 'app', 'user', 'invalid'/);
  });

  it('a filter must be an object over projected state', () => {
    for (const when of ['ready', ['ready']]) {
      expect(() =>
        defineUnchecked('filter.shape', inputless({ guard: { when } })),
      ).toThrow(/guard\.when must be a filter object over projected state/);
    }
  });

  it('settle.goTo must name a page', () => {
    for (const goTo of ['  ', 7]) {
      expect(() =>
        defineUnchecked('goto.blank', inputless({ settle: { goTo } })),
      ).toThrow(/settle\.goTo must be a non-empty page id string/);
    }
  });

  it('progress stages must be a non-empty list of named stages, and required a boolean', () => {
    for (const stages of [[], ['sent', ' '], 'sent']) {
      expect(() =>
        defineUnchecked('progress.stages', inputless({ settle: { progress: { stages } } })),
      ).toThrow(/settle\.progress\.stages must be a non-empty array of non-empty stage strings/);
    }
    expect(() =>
      defineUnchecked(
        'progress.required',
        inputless({ settle: { progress: { stages: ['sent'], required: 'yes' } } }),
      ),
    ).toThrow(/settle\.progress\.required must be true or false/);
  });

  it('a need needs a name, and its source must be named when given', () => {
    expect(() =>
      defineUnchecked('needs.blank', inputless({ needs: { '  ': { kind: 'order' } } })),
    ).toThrow(/needs keys must be non-empty names/);
    expect(() =>
      defineUnchecked(
        'needs.from',
        inputless({ needs: { subject: { kind: 'order', from: ' ' } } }),
      ),
    ).toThrow(/needs\.subject\.from must be a non-empty string when supplied/);
  });

  it('an authored list may not be sparse, hold an accessor, or carry an expando', () => {
    const sparse = ['orders', , 'lines'];
    expect(() =>
      defineUnchecked('list.sparse', inputless({ settle: { writes: sparse } })),
    ).toThrow(/writes\[1\] must be a data element; sparse\/accessor arrays/);

    const accessor = ['orders'];
    Object.defineProperty(accessor, '1', { get: () => 'lines', enumerable: true });
    expect(() =>
      defineUnchecked('list.accessor', inputless({ settle: { writes: accessor } })),
    ).toThrow(/writes\[1\] must be a data element/);

    const expando = Object.assign(['orders'], { note: 'extra' });
    expect(() =>
      defineUnchecked('list.expando', inputless({ settle: { writes: expando } })),
    ).toThrow(/writes array declares unknown field 'note'/);
  });

  it('a node shared inside an authored schema stays ONE frozen copy, and a non-plain node keeps its identity', () => {
    class Hint {
      readonly label = 'kept by identity';
    }
    const hint = new Hint();
    const text = { type: 'string' };
    const inputSchema = {
      type: 'object',
      properties: { first: text, second: text },
      'x-hint': hint,
    };
    const action = defineUnchecked('schema.shared', {
      does: 'Take two names',
      invocation: 'scalar',
      inputSchema,
      mutate: (_value: unknown) => undefined,
    });
    const kept = actionDefinitionOf(action)?.contract.inputSchema as {
      properties: { first: object; second: object };
      'x-hint': unknown;
    };
    expect(kept.properties.first).toBe(kept.properties.second);
    expect(kept.properties.first).not.toBe(text);
    expect(Object.isFrozen(kept.properties.first)).toBe(true);
    // A class instance is an application-owned value, not an authored record:
    // it is carried as is, never copied or frozen.
    expect(kept['x-hint']).toBe(hint);
    expect(Object.isFrozen(hint)).toBe(false);
  });
});
