import { describe, expect, it } from 'vitest';
import {
  checkActionContracts,
  type ActionBindingContractRow,
  type ActionContractDeclaration,
  type ActionContractEnvironment,
  type ActionContractKind,
  type ActionContractReport,
} from '../src/action/contracts.js';
import type {
  ActionBindingRef,
  ActionDefinitionContract,
  ActionDefinitionRef,
  BindingCoverage,
} from '../src/action/types.js';
import { checkActionContracts as checkFromTesting } from '../src/testing/index.js';
import { checkActionContracts as checkFromLint } from '../src/testing/lint.js';

function declaration(
  definitionId: string,
  contract: ActionDefinitionContract,
): ActionContractDeclaration {
  return {
    ref: { kind: 'action-definition', definitionId },
    contract,
  };
}

function binding(
  definition: ActionDefinitionRef,
  options?: {
    bindingId?: string;
    instance?: string;
    coverage?: BindingCoverage;
    requestedCapabilities?: ActionBindingContractRow['requestedCapabilities'];
    requiresInteractiveHost?: boolean;
    interactiveHost?: ActionBindingContractRow['interactiveHost'];
  },
): ActionBindingContractRow {
  const ref: ActionBindingRef = {
    kind: 'action-binding',
    bindingId: options?.bindingId ?? 'binding#1',
    definition,
    node: 'orders',
    ...(options?.instance !== undefined
      ? { instance: options.instance }
      : {}),
  };
  return {
    ref,
    coverage: options?.coverage ?? 'executable',
    ...(options?.requestedCapabilities !== undefined
      ? { requestedCapabilities: options.requestedCapabilities }
      : {}),
    ...(options?.requiresInteractiveHost !== undefined
      ? { requiresInteractiveHost: options.requiresInteractiveHost }
      : {}),
    ...(options?.interactiveHost !== undefined
      ? { interactiveHost: options.interactiveHost }
      : {}),
  };
}

function environment(
  overrides?: Partial<ActionContractEnvironment>,
): ActionContractEnvironment {
  return {
    runtime: {
      complete: true,
      principalEnforcement: true,
      humanApprovalGate: true,
      concurrencyEnforcement: true,
      highEffectVerification: false,
    },
    bindings: { complete: true, rows: [] },
    evidence: { complete: true, producers: [] },
    ...overrides,
  };
}

function result(
  report: ActionContractReport,
  definitionId: string,
  kind: ActionContractKind,
) {
  const found = report.contracts.find(
    (row) =>
      row.definition.definitionId === definitionId && row.kind === kind,
  );
  expect(found).toBeDefined();
  return found!;
}

describe('checkActionContracts — a declaration is not mistaken for activation', () => {
  it('ships from both testing barrels without entering the main runtime barrel', () => {
    expect(checkFromTesting).toBe(checkActionContracts);
    expect(checkFromLint).toBe(checkActionContracts);
  });

  it('marks an unenforced principal policy inert, and the same policy active when enforcement is on', () => {
    const action = declaration('orders.archive', {
      does: 'Archive the order',
      invocation: 'inputless',
      principalPolicy: { mayInvoke: ['human'] },
    });

    const inert = checkActionContracts(
      [action],
      environment({
        runtime: {
          complete: true,
          principalEnforcement: false,
          humanApprovalGate: true,
          concurrencyEnforcement: true,
          highEffectVerification: false,
        },
      }),
    );
    expect(result(inert, 'orders.archive', 'principal-may-invoke')).toMatchObject(
      {
        disposition: 'inert',
        reason: 'principal-enforcement-disabled',
      },
    );
    expect(inert.ok).toBe(false);
    expect(inert.conclusive).toBe(true);

    const active = checkActionContracts([action], environment());
    expect(result(active, 'orders.archive', 'principal-may-invoke')).toMatchObject(
      {
        disposition: 'active',
        reason: 'principal-enforcement-active',
      },
    );
    expect(active.ok).toBe(true);
  });

  it('keeps decision ownership disclosure-only and requires both approval switches', () => {
    const action = declaration('orders.transfer', {
      does: 'Transfer the balance',
      invocation: 'inputless',
      principalPolicy: {
        decisionOwner: 'human',
        requiresHumanApproval: true,
      },
    });
    const approvalOff = checkActionContracts(
      [action],
      environment({
        runtime: {
          complete: true,
          principalEnforcement: true,
          humanApprovalGate: false,
          concurrencyEnforcement: true,
          highEffectVerification: false,
        },
      }),
    );

    expect(
      result(approvalOff, 'orders.transfer', 'principal-decision-owner'),
    ).toMatchObject({
      disposition: 'disclosure-only',
      reason: 'decision-owner-is-disclosure',
    });
    expect(
      result(approvalOff, 'orders.transfer', 'principal-human-approval'),
    ).toMatchObject({
      disposition: 'inert',
      reason: 'human-approval-disabled',
    });

    const approvalOn = checkActionContracts([action], environment());
    expect(
      result(approvalOn, 'orders.transfer', 'principal-human-approval'),
    ).toMatchObject({
      disposition: 'active',
      reason: 'human-approval-active',
    });
  });

  it('distinguishes missing evidence from an incomplete evidence inventory', () => {
    const action = declaration('draft.save', {
      does: 'Save the draft',
      invocation: 'inputless',
      enabledWhen: { ready: { eq: true } },
      verify: { saved: { eq: true } },
    });

    const missing = checkActionContracts([action], environment());
    expect(result(missing, 'draft.save', 'enabled-when')).toMatchObject({
      disposition: 'inert',
      reason: 'evidence-producer-missing',
      keys: ['ready'],
    });
    expect(result(missing, 'draft.save', 'verify')).toMatchObject({
      disposition: 'inert',
      reason: 'evidence-producer-missing',
      keys: ['saved'],
    });

    const unknown = checkActionContracts(
      [action],
      environment({ evidence: { complete: false, producers: [] } }),
    );
    expect(result(unknown, 'draft.save', 'enabled-when')).toMatchObject({
      disposition: 'unresolved',
      reason: 'evidence-inventory-incomplete',
    });
    expect(result(unknown, 'draft.save', 'verify')).toMatchObject({
      disposition: 'unresolved',
      reason: 'evidence-inventory-incomplete',
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.conclusive).toBe(false);

    const active = checkActionContracts(
      [action],
      environment({
        evidence: {
          complete: true,
          producers: [
            {
              kind: 'state',
              producerId: 'store',
              keys: ['ready'],
              stages: ['availability'],
            },
            {
              kind: 'state',
              producerId: 'state-tap',
              keys: ['saved'],
              stages: ['settlement'],
            },
          ],
        },
      }),
    );
    expect(result(active, 'draft.save', 'enabled-when').disposition).toBe(
      'active',
    );
    expect(result(active, 'draft.save', 'verify').disposition).toBe('active');
  });

  it('marks instance-scoped concurrency inert without binding identity', () => {
    const action = declaration('orders.archive', {
      does: 'Archive the order',
      invocation: 'inputless',
      concurrency: { mode: 'single-flight', scope: 'instance' },
    });

    const withoutInstance = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: true,
          rows: [binding(action.ref)],
        },
      }),
    );
    expect(result(withoutInstance, 'orders.archive', 'concurrency')).toMatchObject(
      {
        disposition: 'inert',
        reason: 'instance-binding-missing',
      },
    );

    const withInstance = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: true,
          rows: [binding(action.ref, { instance: 'o-57' })],
        },
      }),
    );
    expect(result(withInstance, 'orders.archive', 'concurrency')).toMatchObject(
      {
        disposition: 'active',
        reason: 'instance-binding-present',
      },
    );

    const incomplete = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: false,
          rows: [binding(action.ref, { instance: 'o-57' })],
        },
      }),
    );
    expect(result(incomplete, 'orders.archive', 'concurrency')).toMatchObject({
      disposition: 'unresolved',
      reason: 'binding-inventory-incomplete',
    });
  });

  it('requires an explicit runtime concurrency gate before certifying non-parallel policy', () => {
    const action = declaration('jobs.run', {
      does: 'Run the job',
      invocation: 'inputless',
      concurrency: { mode: 'single-flight' },
    });
    const disabled = checkActionContracts(
      [action],
      environment({
        runtime: {
          complete: true,
          principalEnforcement: true,
          humanApprovalGate: true,
          concurrencyEnforcement: false,
          highEffectVerification: false,
        },
      }),
    );
    expect(result(disabled, 'jobs.run', 'concurrency')).toMatchObject({
      disposition: 'inert',
      reason: 'runtime-concurrency-disabled',
    });

    const unknown = checkActionContracts(
      [action],
      environment({
        runtime: { complete: false },
      }),
    );
    expect(result(unknown, 'jobs.run', 'concurrency')).toMatchObject({
      disposition: 'unresolved',
      reason: 'runtime-policy-unresolved',
    });
  });

  it('refuses identity-only agent execution and activates executable coverage', () => {
    const action = declaration('orders.archive', {
      does: 'Archive the order',
      invocation: 'inputless',
    });
    const identityOnly = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: true,
          rows: [
            binding(action.ref, {
              coverage: 'identity',
              requestedCapabilities: ['agent-execution'],
            }),
          ],
        },
      }),
    );
    expect(result(identityOnly, 'orders.archive', 'agent-execution')).toMatchObject(
      {
        disposition: 'inert',
        reason: 'coverage-insufficient',
        requiredCoverage: 'executable',
        actualCoverage: 'identity',
      },
    );

    const executable = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: true,
          rows: [
            binding(action.ref, {
              coverage: 'executable',
              requestedCapabilities: ['agent-execution'],
            }),
          ],
        },
      }),
    );
    expect(result(executable, 'orders.archive', 'agent-execution')).toMatchObject(
      {
        disposition: 'active',
        reason: 'coverage-sufficient',
      },
    );
  });

  it('requires verifiable coverage and a usable authoritative path for high-effect verification', () => {
    const action = declaration('payments.charge', {
      does: 'Charge the card',
      invocation: 'inputless',
      confirm: true,
      observability: 'external',
    });
    const row = binding(action.ref, {
      coverage: 'executable',
      requestedCapabilities: ['high-effect-verification'],
    });
    const verificationRuntime = {
      complete: true as const,
      principalEnforcement: true,
      humanApprovalGate: true,
      concurrencyEnforcement: true,
      highEffectVerification: true,
    };

    const insufficient = checkActionContracts(
      [action],
      environment({
        runtime: verificationRuntime,
        bindings: { complete: true, rows: [row] },
      }),
    );
    expect(
      result(insufficient, 'payments.charge', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'inert',
      reason: 'coverage-insufficient',
      requiredCoverage: 'verifiable',
    });

    const verified = checkActionContracts(
      [action],
      environment({
        runtime: verificationRuntime,
        bindings: {
          complete: true,
          rows: [
            binding(action.ref, {
              coverage: 'verifiable',
              requestedCapabilities: ['high-effect-verification'],
            }),
          ],
        },
        evidence: {
          complete: true,
          producers: [
            {
              kind: 'external-effect',
              producerId: 'stripe-webhook',
              definitionId: 'payments.charge',
            },
          ],
        },
      }),
    );
    expect(
      result(verified, 'payments.charge', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'active',
      reason: 'verification-path-active',
    });
  });

  it('reports a confirmation contract inert when high-effect verification is disabled', () => {
    const action = declaration('payments.refund', {
      does: 'Refund the payment',
      invocation: 'inputless',
      confirm: true,
    });
    const report = checkActionContracts([action], environment());

    expect(
      result(report, 'payments.refund', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'inert',
      reason: 'high-effect-verification-disabled',
    });
    expect(report.ok).toBe(false);
  });

  it('reports an adapter that cannot resolve its required interactive host', () => {
    const action = declaration('dialog.submit', {
      does: 'Submit the dialog',
      invocation: 'inputless',
    });
    const report = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: true,
          rows: [
            binding(action.ref, {
              requiresInteractiveHost: true,
              interactiveHost: 'missing',
            }),
          ],
        },
      }),
    );
    expect(result(report, 'dialog.submit', 'interactive-host')).toMatchObject({
      disposition: 'inert',
      reason: 'interactive-host-missing',
    });
  });

  it('rejects a contradictory not-required interactive-host snapshot', () => {
    const action = declaration('dialog.confirm', {
      does: 'Confirm',
      invocation: 'inputless',
    });
    const report = checkActionContracts(
      [action],
      environment({
        bindings: {
          complete: true,
          rows: [
            binding(action.ref, {
              requiresInteractiveHost: true,
              interactiveHost: 'not-required',
            }),
          ],
        },
      }),
    );
    expect(result(report, 'dialog.confirm', 'interactive-host')).toMatchObject({
      disposition: 'inert',
      reason: 'interactive-host-missing',
    });
    expect(report.ok).toBe(false);
  });

  it('is deterministic, freezes its report, and never reorders caller arrays', () => {
    const alpha = declaration('alpha', {
      does: 'Alpha',
      invocation: 'inputless',
      principalPolicy: { decisionOwner: 'human' },
    });
    const zulu = declaration('zulu', {
      does: 'Zulu',
      invocation: 'inputless',
      principalPolicy: { mayInvoke: ['agent'] },
    });
    const declarations = [zulu, alpha];
    const before = [...declarations];

    const first = checkActionContracts(declarations, environment());
    const second = checkActionContracts([...declarations].reverse(), environment());

    expect(first).toEqual(second);
    expect(declarations).toEqual(before);
    expect(first.contracts.map((row) => row.definition.definitionId)).toEqual([
      'alpha',
      'zulu',
    ]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.contracts)).toBe(true);
    expect(Object.isFrozen(first.contracts[0])).toBe(true);
    expect(Object.isFrozen(first.counts)).toBe(true);
    expect(Object.isFrozen(first.byDisposition.active)).toBe(true);
  });

  it('fails closed on malformed coverage at the public checker boundary', () => {
    const action = declaration('coverage.invalid', {
      does: 'Run',
      invocation: 'inputless',
    });
    expect(() =>
      checkActionContracts(
        [action],
        environment({
          bindings: {
            complete: true,
            rows: [
              binding(action.ref, {
                coverage: 'more-than-verifiable' as never,
                requestedCapabilities: ['agent-execution'],
              }),
            ],
          },
        }),
      ),
    ).toThrow(/invalid coverage/);

    expect(() =>
      checkActionContracts(
        [action],
        environment({
          bindings: {
            complete: true,
            rows: [
              {
                ...binding(action.ref),
                requestedCapabilities: ['teleport'] as never,
              },
            ],
          },
        }),
      ),
    ).toThrow(/invalid requested capability/);
  });
});
