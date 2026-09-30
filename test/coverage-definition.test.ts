import { describe, expect, it } from 'vitest';
import {
  GraphValidationError,
  actionDefinitionOf,
  defineAction,
  isDefinedAction,
} from '../src/index.js';

/**
 * defineAction / actionDefinitionOf (src/action/definition.ts) — the
 * authoring refusals the main suite (test/action-definition.test.ts) does not
 * reach, and the SECOND door into the same laws: a branded record carried by
 * a function from another installed copy. `isRecord` re-runs
 * `validateActionDefinitionContract` over such a record, so a lookalike that
 * breaks one law is not recognised as an action — even though it carries the
 * brand and the "validated" attestation. Each lookalike below differs from a
 * recognised control by exactly one field, so the refusal is that law's.
 */

const defineUnchecked = (definitionId: string, options: unknown) =>
  Reflect.apply(defineAction, undefined, [definitionId, options]);

const BRAND = Symbol.for('hcifootprint.action-definition.v2');
const VALIDATED = Symbol.for('hcifootprint.action-definition.validated.v2');

/** A function carrying a frozen, attested record — what another copy would mint. */
function lookalike(contract: object): () => string {
  const record = {
    ref: Object.freeze({
      kind: 'action-definition',
      definitionId: 'foreign.action',
    }),
    contract: Object.isFrozen(contract) ? contract : Object.freeze(contract),
  };
  Object.defineProperty(record, VALIDATED, { value: true, enumerable: false });
  Object.freeze(record);
  const carrier = () => 'foreign';
  Object.defineProperty(carrier, BRAND, { value: record, enumerable: false });
  return carrier;
}

const CONTROL = { does: 'Run the foreign action', invocation: 'scalar' } as const;

describe('actionDefinitionOf — a non-function is never an action', () => {
  it('answers undefined for records, strings and null without reading anything', () => {
    for (const value of [{ [BRAND]: {} }, 'orders.archive', null, 7]) {
      expect(actionDefinitionOf(value)).toBeUndefined();
      expect(isDefinedAction(value)).toBe(false);
    }
  });
});

describe('a branded lookalike is re-judged by the authoring laws', () => {
  it('control: a lookalike that obeys every law IS recognised', () => {
    const carrier = lookalike({ ...CONTROL });
    expect(isDefinedAction(carrier)).toBe(true);
    expect(actionDefinitionOf(carrier)?.ref.definitionId).toBe('foreign.action');
  });

  it('refuses a contract that is a class instance rather than a plain record', () => {
    class Contract {
      readonly does = CONTROL.does;
      readonly invocation = CONTROL.invocation;
    }
    expect(isDefinedAction(lookalike(new Contract()))).toBe(false);
  });

  it('refuses a contract field that is non-enumerable or an accessor', () => {
    const hidden = { ...CONTROL };
    Object.defineProperty(hidden, 'role', { value: 'next', enumerable: false });
    expect(isDefinedAction(lookalike(hidden))).toBe(false);

    const accessor = { ...CONTROL };
    Object.defineProperty(accessor, 'role', {
      get: () => 'next',
      enumerable: true,
    });
    expect(isDefinedAction(lookalike(accessor))).toBe(false);

    const control = { ...CONTROL, role: 'next' };
    expect(isDefinedAction(lookalike(control))).toBe(true);
  });

  it("refuses a live-site 'binding' or an 'input' reader carried in the contract", () => {
    expect(
      isDefinedAction(lookalike({ ...CONTROL, binding: { kind: 'url', href: '/x' } })),
    ).toBe(false);
    expect(isDefinedAction(lookalike({ ...CONTROL, input: () => 'value' }))).toBe(
      false,
    );
  });

  it('refuses a settle.progress that is not a plain record, or carries an unknown field', () => {
    const inputless = { does: CONTROL.does, invocation: 'inputless' };
    expect(
      isDefinedAction(lookalike({ ...inputless, settle: { progress: { stages: ['a'] } } })),
    ).toBe(true);
    expect(
      isDefinedAction(lookalike({ ...inputless, settle: { progress: ['a'] } })),
    ).toBe(false);
    expect(
      isDefinedAction(
        lookalike({
          ...inputless,
          settle: { progress: { stages: ['a'], weight: 2 } },
        }),
      ),
    ).toBe(false);
  });

  it('refuses a settle.evidence that is not a plain { kind }, or names a schema beside the kind', () => {
    class Evidence {
      readonly kind = 'receipt';
    }
    expect(
      isDefinedAction(lookalike({ ...CONTROL, settle: { evidence: { kind: 'receipt' } } })),
    ).toBe(true);
    expect(
      isDefinedAction(lookalike({ ...CONTROL, settle: { evidence: new Evidence() } })),
    ).toBe(false);
    expect(
      isDefinedAction(
        lookalike({ ...CONTROL, settle: { evidence: { kind: 'receipt', schema: {} } } }),
      ),
    ).toBe(false);
  });

  it('refuses needs that is not a record, and a channel declaration that is not a plain kind', () => {
    expect(
      isDefinedAction(lookalike({ ...CONTROL, needs: { doc: { kind: 'doc' } } })),
    ).toBe(true);
    expect(isDefinedAction(lookalike({ ...CONTROL, needs: [{ kind: 'doc' }] }))).toBe(
      false,
    );
    expect(isDefinedAction(lookalike({ ...CONTROL, produces: 'receipt' }))).toBe(
      false,
    );
    // `from` names a source for an INPUT; an output has no source to name.
    expect(
      isDefinedAction(
        lookalike({ ...CONTROL, produces: { kind: 'receipt', from: 'somewhere' } }),
      ),
    ).toBe(false);
  });
});

describe('defineAction — options and does', () => {
  it('refuses options that are not a record', () => {
    for (const options of [null, 'mutate', [() => undefined]]) {
      expect(() => defineUnchecked('options.shape', options)).toThrow(
        "hcifootprint: defineAction('options.shape') needs an options record containing mutate.",
      );
    }
  });

  it('refuses a blank or missing does sentence as a TypeError', () => {
    for (const does of ['   ', undefined, 7]) {
      let thrown: unknown;
      try {
        defineUnchecked('does.blank', {
          ...(does !== undefined ? { does } : {}),
          invocation: 'inputless',
          mutate: () => undefined,
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect((thrown as Error).message).toBe(
        "hcifootprint: defineAction('does.blank') needs a non-empty authored 'does' sentence.",
      );
    }
  });
});

describe('defineAction — positional slots name the lifecycle slot when progress is declared', () => {
  const progress = { stages: ['uploading'] };

  it('inputless with progress allows one slot, and says so when there are two', () => {
    expect(() =>
      defineUnchecked('slots.inputless', {
        does: 'Upload',
        invocation: 'inputless',
        settle: { progress },
        mutate: (_a: unknown, _b: unknown) => undefined,
      }),
    ).toThrow(
      "hcifootprint: action definition 'slots.inputless' declares invocation: 'inputless', but mutate exposes 2 positional slot(s). Only the optional lifecycle slot is supported.",
    );
  });

  it('scalar with progress allows payload plus lifecycle, and says so when there are three', () => {
    expect(() =>
      defineUnchecked('slots.scalar', {
        does: 'Upload',
        invocation: 'scalar',
        settle: { progress },
        mutate: (_a: unknown, _b: unknown, _c: unknown) => undefined,
      }),
    ).toThrow(
      "hcifootprint: action definition 'slots.scalar' declares invocation: 'scalar', but mutate exposes 3 positional slots. Scalar actions accept one payload plus the optional lifecycle; declare host invocation for listener-shaped functions.",
    );
  });
});

describe('defineAction — guard and settle clause laws', () => {
  const base = { does: 'Run it', invocation: 'inputless', mutate: () => undefined };
  const refusal = (id: string, extra: object) => {
    let thrown: unknown;
    try {
      defineUnchecked(id, { ...base, ...extra });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GraphValidationError);
    return (thrown as Error).message;
  };

  it('refuses a guard.when that is not a filter object', () => {
    for (const when of ['open', [{ open: true }]]) {
      expect(refusal('guard.when', { guard: { when } })).toBe(
        "hcifootprint: action definition 'guard.when': guard.when must be a filter object over projected state.",
      );
    }
  });

  it('accepts a null-prototype guard record as plain authored data', () => {
    const guard = Object.create(null) as Record<string, unknown>;
    guard.when = { open: { eq: true } };
    const action = defineUnchecked('guard.null-proto', { ...base, guard });
    expect(actionDefinitionOf(action)?.contract.guard?.when).toEqual({ open: { eq: true } });
  });

  it('keeps an object blockedBecause as a frozen copy', () => {
    const blockedBecause = { says: 'Waiting for the upload', clearedBy: 'app' };
    const action = defineUnchecked('blocked.object', {
      ...base,
      guard: { enabledWhen: { ready: { eq: true } }, blockedBecause },
    });
    const retained = actionDefinitionOf(action)!.contract.guard!.blockedBecause;
    expect(retained).toEqual(blockedBecause);
    expect(retained).not.toBe(blockedBecause);
    expect(Object.isFrozen(retained)).toBe(true);
    blockedBecause.says = 'changed later';
    expect(retained).toEqual({ says: 'Waiting for the upload', clearedBy: 'app' });
  });

  it('refuses an object blockedBecause with a blank sentence or without clearedBy', () => {
    expect(
      refusal('blocked.says', {
        guard: { enabledWhen: { ready: { eq: true } }, blockedBecause: { says: ' ', clearedBy: 'app' } },
      }),
    ).toMatch(/^hcifootprint: action definition 'blocked\.says': blockedBecause\.says is empty/);
    expect(
      refusal('blocked.cleared', {
        guard: { enabledWhen: { ready: { eq: true } }, blockedBecause: { says: 'Waiting' } },
      }),
    ).toMatch(
      /^hcifootprint: action definition 'blocked\.cleared': blockedBecause\.clearedBy must be one of 'app', 'user', 'invalid'/,
    );
  });

  it('refuses a blank or non-string settle.goTo', () => {
    for (const goTo of ['   ', 7]) {
      expect(refusal('settle.goto', { settle: { goTo } })).toBe(
        "hcifootprint: action definition 'settle.goto': settle.goTo must be a non-empty page id string.",
      );
    }
  });

  it('refuses progress stages that are empty or blank, and a non-boolean required', () => {
    for (const stages of [[], [' '], ['ok', 3]]) {
      expect(refusal('progress.stages', { settle: { progress: { stages } } })).toBe(
        "hcifootprint: action definition 'progress.stages': settle.progress.stages must be a non-empty array of non-empty stage strings.",
      );
    }
    expect(
      refusal('progress.required', {
        settle: { progress: { stages: ['a'], required: 'yes' } },
      }),
    ).toBe(
      "hcifootprint: action definition 'progress.required': settle.progress.required must be true or false when supplied.",
    );
  });

  it('refuses a blank needs name and a blank needs.from', () => {
    expect(refusal('needs.name', { needs: { '  ': { kind: 'doc' } } })).toBe(
      "hcifootprint: action definition 'needs.name': needs keys must be non-empty names.",
    );
    expect(refusal('needs.from', { needs: { doc: { kind: 'doc', from: ' ' } } })).toBe(
      "hcifootprint: action definition 'needs.from': needs.doc.from must be a non-empty string when supplied.",
    );
  });
});

describe('defineAction — authored trees are detached element by element', () => {
  const base = { does: 'Run it', invocation: 'inputless', mutate: () => undefined };

  it('refuses a sparse array: a hole is not an authored element', () => {
    const writes = ['orders.a', , 'orders.b'];
    expect(() => defineUnchecked('tree.sparse', { ...base, settle: { writes } })).toThrow(
      'hcifootprint: action definition contract.settle.writes[1] must be a data element; sparse/accessor arrays are not authored declarations.',
    );
  });

  it('refuses an array carrying a named (non-index) field', () => {
    const writes = Object.assign(['orders.a'], { note: 'hidden' });
    expect(() => defineUnchecked('tree.expando', { ...base, settle: { writes } })).toThrow(
      "hcifootprint: action definition contract.settle.writes array declares unknown field 'note'.",
    );
  });

  it('a subtree shared twice stays ONE frozen copy; a non-plain value is kept by reference', () => {
    class Example {
      constructor(readonly text: string) {}
    }
    const example = new Example('o-57');
    const shared = { type: 'string', examples: [example] };
    const inputSchema = {
      type: 'object',
      properties: { orderId: shared, parentId: shared },
    };
    const action = defineUnchecked('tree.shared', {
      does: 'Archive',
      invocation: 'scalar',
      inputSchema,
      mutate: (_input: unknown) => undefined,
    });
    const retained = actionDefinitionOf(action)!.contract.inputSchema as {
      properties: {
        orderId: { examples: unknown[] };
        parentId: { examples: unknown[] };
      };
    };
    expect(retained).not.toBe(inputSchema);
    expect(retained.properties.orderId).not.toBe(shared);
    expect(retained.properties.orderId).toBe(retained.properties.parentId);
    expect(Object.isFrozen(retained.properties.orderId)).toBe(true);
    expect(retained.properties.orderId.examples[0]).toBe(example);
  });
});

/**
 * BUG (reported by the coverage pass, not fixed here — src/ is out of scope):
 * `definition.ts · snapshotActionDefinitionOptions` carries two teaching
 * refusals — a live-site `binding` and an `input` reader belong to
 * connectAction()/useActionBinding(), not to the definition. They can never
 * fire: the `captureAuthoredRecord(owner, options, ACTION_OPTION_FIELDS)` call
 * just before them already refuses both keys as "declares unknown field",
 * because ACTION_OPTION_FIELDS (the contract fields plus `mutate`) contains
 * neither. An author who writes the most likely mistake gets the generic
 * sentence instead of the one written for it. These pin the intended words;
 * they flip to passing once the named checks run before the generic one.
 */
describe('defineAction — the teaching refusals for binding/input (BUG: unreachable)', () => {
  const base = { does: 'Run it', invocation: 'inputless', mutate: () => undefined };

  it.fails("TODO(bug): a 'binding' option should be refused with the live-site sentence", () => {
    expect(() =>
      defineUnchecked('teach.binding', { ...base, binding: { kind: 'url', href: '/x' } }),
    ).toThrow(/declares a live-site 'binding'/);
  });

  it.fails("TODO(bug): an 'input' option should be refused with the inputSchema-vs-input sentence", () => {
    expect(() => defineUnchecked('teach.input', { ...base, input: () => 'v' })).toThrow(
      /Callable action definitions use 'inputSchema' for the payload contract/,
    );
  });
});
