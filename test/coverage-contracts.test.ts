import { describe, expect, it } from 'vitest';
import {
  checkActionContracts,
  type ActionBindingContractRow,
  type ActionContractDeclaration,
  type ActionContractEnvironment,
  type ActionContractKind,
  type ActionContractReport,
  type ActionEvidenceSnapshot,
} from '../src/testing/index.js';
import type {
  ActionBindingRef,
  ActionDefinitionContract,
  BindingCoverage,
} from '../src/index.js';

/**
 * checkActionContracts (src/action/contracts.ts) — the corners the main
 * suite (test/action-contracts.test.ts) does not reach: malformed inventory
 * rows, partially known runtime switches, every high-effect verification
 * path, and the deterministic ordering of duplicated/instanced rows.
 *
 * The checker is a pure function over declarations as DATA (they may come
 * from JSON or another package copy), so these tests hand it records
 * directly rather than going through defineAction's authoring laws.
 */

function declaration(
  definitionId: string,
  contract: Partial<ActionDefinitionContract>,
): ActionContractDeclaration {
  return {
    ref: { kind: 'action-definition', definitionId },
    contract: {
      does: `Run ${definitionId}`,
      invocation: 'inputless',
      ...contract,
    } as ActionDefinitionContract,
  };
}

function row(
  definitionId: string,
  options: {
    bindingId?: string;
    instance?: string;
    coverage?: BindingCoverage;
    requestedCapabilities?: unknown;
    requiresInteractiveHost?: unknown;
    interactiveHost?: unknown;
  } = {},
): ActionBindingContractRow {
  const ref: ActionBindingRef = {
    kind: 'action-binding',
    bindingId: options.bindingId ?? 'binding#1',
    definition: { kind: 'action-definition', definitionId },
    node: 'orders',
    ...(options.instance !== undefined ? { instance: options.instance } : {}),
  };
  const built: Record<string, unknown> = {
    ref,
    coverage: options.coverage ?? 'verifiable',
  };
  for (const key of [
    'requestedCapabilities',
    'requiresInteractiveHost',
    'interactiveHost',
  ] as const) {
    if (key in options) built[key] = options[key];
  }
  return built as unknown as ActionBindingContractRow;
}

function environment(
  overrides: Partial<ActionContractEnvironment> = {},
): ActionContractEnvironment {
  return {
    runtime: {
      complete: true,
      principalEnforcement: true,
      humanApprovalGate: true,
      predicateVerification: true,
    },
    bindings: { complete: true, rows: [] },
    evidence: { complete: true, producers: [] },
    ...overrides,
  };
}

function only(report: ActionContractReport, kind: ActionContractKind) {
  const found = report.contracts.filter((result) => result.kind === kind);
  expect(found).toHaveLength(1);
  return found[0]!;
}

describe('checkActionContracts — a malformed inventory row is refused, never classified', () => {
  const decl = declaration('orders.archive', {});

  it('refuses a requestedCapabilities that is not an array, or names an unknown capability', () => {
    for (const requestedCapabilities of ['pointing', ['pointing', 'teleport']]) {
      expect(() =>
        checkActionContracts(
          [decl],
          environment({
            bindings: {
              complete: true,
              rows: [row('orders.archive', { requestedCapabilities })],
            },
          }),
        ),
      ).toThrow(
        "hcifootprint: contract-check binding 'binding#1' has an invalid requested capability.",
      );
    }
  });

  it('refuses a requiresInteractiveHost that is not a boolean', () => {
    expect(() =>
      checkActionContracts(
        [decl],
        environment({
          bindings: {
            complete: true,
            rows: [row('orders.archive', { requiresInteractiveHost: 'yes' })],
          },
        }),
      ),
    ).toThrow(
      "hcifootprint: contract-check binding 'binding#1' requiresInteractiveHost must be boolean.",
    );
  });

  it('refuses an interactiveHost resolution outside the four committed words', () => {
    expect(() =>
      checkActionContracts(
        [decl],
        environment({
          bindings: {
            complete: true,
            rows: [row('orders.archive', { interactiveHost: 'probably' })],
          },
        }),
      ),
    ).toThrow(
      "hcifootprint: contract-check binding 'binding#1' has an invalid interactiveHost value.",
    );
  });
});

describe('checkActionContracts — a runtime switch nobody reported is UNRESOLVED, not assumed', () => {
  it('mayInvoke with principal enforcement unknown is unresolved', () => {
    const report = checkActionContracts(
      [declaration('orders.archive', { principal: { mayInvoke: ['human'] } })],
      environment({ runtime: { complete: false } }),
    );
    const result = only(report, 'principal-may-invoke');
    expect(result.disposition).toBe('unresolved');
    expect(result.reason).toBe('runtime-policy-unresolved');
    expect(result.message).toBe(
      "Whether 'orders.archive' enforces its principal policy is unknown.",
    );
    expect(result.remedy).toBe('Provide a complete runtime-policy snapshot.');
    expect(report.conclusive).toBe(false);
    expect(report.ok).toBe(false);
  });

  it('human approval with one gate on and the other unknown is unresolved', () => {
    const report = checkActionContracts(
      [
        declaration('orders.refund', {
          principal: { requiresHumanApproval: true },
        }),
      ],
      environment({
        runtime: { complete: false, principalEnforcement: true },
      }),
    );
    const result = only(report, 'principal-human-approval');
    expect(result.disposition).toBe('unresolved');
    expect(result.reason).toBe('runtime-policy-unresolved');
    expect(result.message).toBe(
      "Whether 'orders.refund' enforces human approval is unknown.",
    );
    expect(result.remedy).toBe('Provide both effective runtime gate values.');
  });
});

describe('checkActionContracts — state contracts', () => {
  it('an EMPTY state contract (possible in data from outside defineAction) is inert, and says so', () => {
    const report = checkActionContracts(
      [declaration('orders.archive', { guard: { when: {} } })],
      environment(),
    );
    const result = only(report, 'guard-when');
    expect(result.disposition).toBe('inert');
    expect(result.reason).toBe('empty-state-contract');
    expect(result.keys).toEqual([]);
    expect(result.message).toBe(
      "Action 'orders.archive' carries an empty when contract.",
    );
    expect(result.remedy).toBe(
      'Declare at least one condition, or remove the empty contract.',
    );
  });

  it("a state producer publishing at stage 'both' serves an availability contract", () => {
    const report = checkActionContracts(
      [declaration('orders.archive', { guard: { when: { open: { eq: true } } } })],
      environment({
        evidence: {
          complete: true,
          producers: [
            {
              kind: 'state',
              producerId: 'store',
              keys: ['open'],
              stages: ['both'],
            },
          ],
        },
      }),
    );
    const result = only(report, 'guard-when');
    expect(result.disposition).toBe('active');
    expect(result.reason).toBe('evidence-producer-present');
  });
});

describe('checkActionContracts — requested capabilities on a binding', () => {
  it('pointing needs only identity coverage; several requests are deduplicated and ordered', () => {
    const report = checkActionContracts(
      [declaration('orders.archive', {})],
      environment({
        bindings: {
          complete: true,
          rows: [
            row('orders.archive', {
              coverage: 'identity',
              requestedCapabilities: ['pointing', 'agent-execution', 'pointing'],
            }),
          ],
        },
      }),
    );
    expect(report.contracts.map((result) => result.kind)).toEqual([
      'pointing',
      'agent-execution',
    ]);
    const pointing = only(report, 'pointing');
    expect(pointing.disposition).toBe('active');
    expect(pointing.reason).toBe('coverage-sufficient');
    expect(pointing.requiredCoverage).toBe('identity');
    expect(pointing.message).toBe(
      "Binding 'binding#1' has identity coverage, sufficient for pointing.",
    );
    expect(only(report, 'agent-execution').disposition).toBe('inert');
  });
});

describe('checkActionContracts — interactive host resolutions', () => {
  function hostReport(interactiveHost: unknown) {
    return only(
      checkActionContracts(
        [declaration('orders.archive', {})],
        environment({
          bindings: {
            complete: true,
            rows: [
              row('orders.archive', {
                requiresInteractiveHost: true,
                ...(interactiveHost !== undefined ? { interactiveHost } : {}),
              }),
            ],
          },
        }),
      ),
      'interactive-host',
    );
  }

  it("'resolved' is active: the adapter committed a usable host", () => {
    const result = hostReport('resolved');
    expect(result.disposition).toBe('active');
    expect(result.reason).toBe('interactive-host-resolved');
    expect(result.message).toBe(
      "Binding 'binding#1' has a usable interactive host.",
    );
    expect(result.remedy).toBe('No change is required.');
  });

  it("'not-required' contradicts requiresInteractiveHost: true — inert, with the contradiction named", () => {
    const result = hostReport('not-required');
    expect(result.disposition).toBe('inert');
    expect(result.reason).toBe('interactive-host-missing');
    expect(result.message).toBe(
      "Binding 'binding#1' requires an interactive host but its snapshot marks one as not required.",
    );
    expect(result.remedy).toBe(
      'Resolve the real interactive descendant, or set requiresInteractiveHost to false.',
    );
  });

  it("'unknown' (or no resolution at all) is unresolved", () => {
    for (const value of ['unknown', undefined]) {
      const result = hostReport(value);
      expect(result.disposition).toBe('unresolved');
      expect(result.reason).toBe('interactive-host-unresolved');
      expect(result.message).toBe(
        "Interactive-host resolution for binding 'binding#1' is unknown.",
      );
      expect(result.remedy).toBe(
        'Run the adapter resolution step and include its committed result.',
      );
    }
  });
});

describe('checkActionContracts — high-effect verification paths', () => {
  function highEffect(
    contract: Partial<ActionDefinitionContract>,
    evidence: ActionEvidenceSnapshot,
    runtime: ActionContractEnvironment['runtime'] = environment().runtime,
  ) {
    return only(
      checkActionContracts(
        [declaration('orders.refund', contract)],
        environment({
          runtime,
          evidence,
          bindings: {
            complete: true,
            rows: [
              row('orders.refund', {
                coverage: 'verifiable',
                requestedCapabilities: ['high-effect-verification'],
              }),
            ],
          },
        }),
      ),
      'high-effect-verification',
    );
  }
  const noProducers = (complete: boolean): ActionEvidenceSnapshot => ({
    complete,
    producers: [],
  });
  const UNRESOLVED_MESSAGE =
    "The authoritative verification path for binding 'binding#1' is not completely known.";
  const MISSING_MESSAGE =
    "Binding 'binding#1' has no usable authoritative verification path.";
  const PATH_REMEDY =
    'Provide the declared postcondition, navigation, or external-effect producer.';

  it('postcondition with no verify clause: unresolved while the inventory is partial, inert once complete', () => {
    const partial = highEffect(
      { settle: { observability: 'postcondition' } } as never,
      noProducers(false),
    );
    expect(partial.disposition).toBe('unresolved');
    expect(partial.reason).toBe('verification-path-unresolved');
    expect(partial.message).toBe(UNRESOLVED_MESSAGE);
    expect(partial.remedy).toBe(PATH_REMEDY);

    const complete = highEffect(
      { settle: { observability: 'postcondition' } } as never,
      noProducers(true),
    );
    expect(complete.disposition).toBe('inert');
    expect(complete.reason).toBe('verification-path-missing');
    expect(complete.message).toBe(MISSING_MESSAGE);
    expect(complete.remedy).toBe(PATH_REMEDY);
  });

  it('postcondition with a verify FILTER follows the settlement-stage producers of its keys', () => {
    const contract = {
      settle: { observability: 'postcondition', verify: { refunded: true } },
    } as never;

    const active = highEffect(contract, {
      complete: true,
      producers: [
        {
          kind: 'state',
          producerId: 'ledger',
          keys: ['refunded'],
          stages: ['settlement'],
        },
      ],
    });
    expect(active.disposition).toBe('active');
    expect(active.reason).toBe('verification-path-active');
    expect(active.message).toBe(
      "Binding 'binding#1' has a usable authoritative verification path.",
    );
    expect(active.remedy).toBe('No change is required.');

    const unresolved = highEffect(contract, noProducers(false));
    expect(unresolved.disposition).toBe('unresolved');
    expect(unresolved.reason).toBe('verification-path-unresolved');

    const inert = highEffect(contract, noProducers(true));
    expect(inert.disposition).toBe('inert');
    expect(inert.reason).toBe('verification-path-missing');
  });

  it('navigation with a producer scoped to ANOTHER definition is no path; partial inventory leaves it open', () => {
    const contract = {
      settle: { observability: 'navigation', goTo: 'receipt' },
    } as never;
    const elsewhere: ActionEvidenceSnapshot = {
      complete: false,
      producers: [
        { kind: 'navigation', producerId: 'router', definitionId: 'other' },
      ],
    };
    const result = highEffect(contract, elsewhere);
    expect(result.disposition).toBe('unresolved');
    expect(result.reason).toBe('verification-path-unresolved');
    expect(result.message).toBe(UNRESOLVED_MESSAGE);
  });

  it('no observability at all: the DECLARATION is insufficient, so it is inert even when the inventory is partial', () => {
    const result = highEffect({ settle: { writes: ['x'] } }, noProducers(false));
    expect(result.disposition).toBe('inert');
    expect(result.reason).toBe('verification-path-missing');
    expect(result.message).toBe(MISSING_MESSAGE);
  });

  it('a verify predicate under a disabled executor is named as such, with its own remedy', () => {
    const contract = {
      settle: { observability: 'postcondition', verify: () => true },
    } as never;
    const disabled = highEffect(contract, noProducers(true), {
      complete: true,
      principalEnforcement: true,
      humanApprovalGate: true,
      predicateVerification: false,
    });
    expect(disabled.disposition).toBe('inert');
    expect(disabled.reason).toBe('predicate-verification-disabled');
    expect(disabled.message).toBe(
      "Binding 'binding#1' declares a verify predicate, but runtime predicate verification is disabled.",
    );
    expect(disabled.remedy).toBe(
      'Enable predicate verification for this runtime.',
    );
  });
});

describe('checkActionContracts — deterministic order over duplicated and instanced rows', () => {
  it('orders rows by definition, binding id, then instance, and keeps the instance on the frozen ref', () => {
    const report = checkActionContracts(
      [declaration('b.second', {}), declaration('a.first', {})],
      environment({
        bindings: {
          complete: true,
          rows: [
            row('b.second', { bindingId: 'binding#1', requestedCapabilities: ['pointing'] }),
            row('a.first', {
              bindingId: 'binding#2',
              instance: 'row-2',
              requestedCapabilities: ['pointing'],
            }),
            row('a.first', {
              bindingId: 'binding#2',
              instance: 'row-1',
              requestedCapabilities: ['pointing'],
            }),
            row('a.first', {
              bindingId: 'binding#2',
              requestedCapabilities: ['pointing'],
            }),
            row('a.first', {
              bindingId: 'binding#1',
              requestedCapabilities: ['pointing'],
            }),
          ],
        },
      }),
    );
    expect(
      report.contracts.map((result) => [
        result.definition.definitionId,
        result.binding?.bindingId,
        result.binding?.instance,
      ]),
    ).toEqual([
      ['a.first', 'binding#1', undefined],
      ['a.first', 'binding#2', undefined],
      ['a.first', 'binding#2', 'row-1'],
      ['a.first', 'binding#2', 'row-2'],
      ['b.second', 'binding#1', undefined],
    ]);
    const instanced = report.contracts[2]!.binding!;
    expect(Object.isFrozen(instanced)).toBe(true);
    expect(Object.hasOwn(report.contracts[0]!.binding!, 'instance')).toBe(false);
    expect(report.bindingsChecked).toBe(5);
  });

  it('two rows for the SAME binding that disagree are both reported, ordered by reason', () => {
    const report = checkActionContracts(
      [declaration('orders.archive', {})],
      environment({
        bindings: {
          complete: true,
          rows: [
            row('orders.archive', {
              coverage: 'executable',
              requestedCapabilities: ['agent-execution'],
            }),
            row('orders.archive', {
              coverage: 'identity',
              requestedCapabilities: ['agent-execution'],
            }),
          ],
        },
      }),
    );
    expect(report.contracts.map((result) => result.reason)).toEqual([
      'coverage-insufficient',
      'coverage-sufficient',
    ]);
    expect(report.ok).toBe(false);
  });
});
