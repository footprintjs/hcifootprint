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
    ...(options?.instance !== undefined ? { instance: options.instance } : {}),
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
      predicateVerification: true,
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
    (row) => row.definition.definitionId === definitionId && row.kind === kind,
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
      principal: { mayInvoke: ['human'] },
    });

    const inert = checkActionContracts(
      [action],
      environment({
        runtime: {
          complete: true,
          principalEnforcement: false,
          humanApprovalGate: true,
          predicateVerification: true,
        },
      }),
    );
    expect(
      result(inert, 'orders.archive', 'principal-may-invoke'),
    ).toMatchObject({
      disposition: 'inert',
      reason: 'principal-enforcement-disabled',
    });
    expect(inert.ok).toBe(false);
    expect(inert.conclusive).toBe(true);

    const active = checkActionContracts([action], environment());
    expect(
      result(active, 'orders.archive', 'principal-may-invoke'),
    ).toMatchObject({
      disposition: 'active',
      reason: 'principal-enforcement-active',
    });
    expect(active.ok).toBe(true);
  });

  it('keeps decision ownership disclosure-only and requires both approval switches', () => {
    const action = declaration('orders.transfer', {
      does: 'Transfer the balance',
      invocation: 'inputless',
      principal: {
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
          predicateVerification: true,
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
      guard: { enabledWhen: { ready: { eq: true } } },
      settle: { verify: { saved: { eq: true } } },
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

  it('checks guard.when against availability evidence even without enabledWhen', () => {
    const action = declaration('orders.list', {
      does: 'Show the order list',
      invocation: 'inputless',
      guard: { when: { page: { eq: 'orders' } } },
    });

    const missing = checkActionContracts([action], environment());
    expect(result(missing, 'orders.list', 'guard-when')).toMatchObject({
      disposition: 'inert',
      reason: 'evidence-producer-missing',
      keys: ['page'],
    });
    expect(
      missing.contracts.some((contract) => contract.kind === 'enabled-when'),
    ).toBe(false);

    const active = checkActionContracts(
      [action],
      environment({
        evidence: {
          complete: true,
          producers: [
            {
              kind: 'state',
              producerId: 'router-state',
              keys: ['page'],
              stages: ['availability'],
            },
          ],
        },
      }),
    );
    expect(result(active, 'orders.list', 'guard-when')).toMatchObject({
      disposition: 'active',
      reason: 'evidence-producer-present',
    });
  });

  it('uses the explicit predicate executor posture without running the predicate', () => {
    let predicateCalls = 0;
    const action = declaration('draft.publish', {
      does: 'Publish the draft',
      invocation: 'inputless',
      settle: {
        observability: 'postcondition',
        verify: () => {
          predicateCalls += 1;
          return true;
        },
      },
    });
    const verificationBinding = binding(action.ref, {
      coverage: 'verifiable',
      requestedCapabilities: ['high-effect-verification'],
    });

    const active = checkActionContracts(
      [action],
      environment({
        bindings: { complete: true, rows: [verificationBinding] },
      }),
    );
    expect(result(active, 'draft.publish', 'verify')).toMatchObject({
      disposition: 'active',
      reason: 'predicate-verification-active',
    });
    expect(
      result(active, 'draft.publish', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'active',
      reason: 'predicate-verification-active',
    });

    const disabled = checkActionContracts(
      [action],
      environment({
        runtime: {
          complete: true,
          principalEnforcement: true,
          humanApprovalGate: true,
          predicateVerification: false,
        },
        bindings: { complete: true, rows: [verificationBinding] },
      }),
    );
    expect(result(disabled, 'draft.publish', 'verify')).toMatchObject({
      disposition: 'inert',
      reason: 'predicate-verification-disabled',
    });
    expect(
      result(disabled, 'draft.publish', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'inert',
      reason: 'predicate-verification-disabled',
    });

    const unknown = checkActionContracts(
      [action],
      environment({
        runtime: { complete: false },
        bindings: { complete: true, rows: [verificationBinding] },
      }),
    );
    expect(result(unknown, 'draft.publish', 'verify')).toMatchObject({
      disposition: 'unresolved',
      reason: 'predicate-verification-unresolved',
    });
    expect(
      result(unknown, 'draft.publish', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'unresolved',
      reason: 'predicate-verification-unresolved',
    });
    expect(unknown.conclusive).toBe(false);
    expect(predicateCalls).toBe(0);
  });

  it('leaves inputSchema activation to ActionRuntime and scopes ok to emitted checks', () => {
    const schemaOnly = declaration('orders.rename', {
      does: 'Rename the order',
      invocation: 'scalar',
      inputSchema: {
        type: 'string',
        minLength: 1,
      },
    });

    const report = checkActionContracts([schemaOnly], environment());

    expect(report.contracts).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.conclusive).toBe(true);
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
    expect(
      result(identityOnly, 'orders.archive', 'agent-execution'),
    ).toMatchObject({
      disposition: 'inert',
      reason: 'coverage-insufficient',
      requiredCoverage: 'executable',
      actualCoverage: 'identity',
    });

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
    expect(
      result(executable, 'orders.archive', 'agent-execution'),
    ).toMatchObject({
      disposition: 'active',
      reason: 'coverage-sufficient',
    });
  });

  it('requires verifiable coverage and a usable authoritative path for high-effect verification', () => {
    const action = declaration('payments.charge', {
      does: 'Charge the card',
      invocation: 'inputless',
      settle: { observability: 'external' },
    });
    const row = binding(action.ref, {
      coverage: 'executable',
      requestedCapabilities: ['high-effect-verification'],
    });
    const insufficient = checkActionContracts(
      [action],
      environment({
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

    const navigate = declaration('checkout.finish', {
      does: 'Finish checkout',
      invocation: 'inputless',
      settle: { observability: 'navigation', goTo: 'receipt' },
    });
    const navigation = checkActionContracts(
      [navigate],
      environment({
        bindings: {
          complete: true,
          rows: [
            binding(navigate.ref, {
              coverage: 'verifiable',
              requestedCapabilities: ['high-effect-verification'],
            }),
          ],
        },
        evidence: {
          complete: true,
          producers: [
            {
              kind: 'navigation',
              producerId: 'router',
              definitionId: 'checkout.finish',
            },
          ],
        },
      }),
    );
    expect(
      result(navigation, 'checkout.finish', 'high-effect-verification'),
    ).toMatchObject({
      disposition: 'active',
      reason: 'verification-path-active',
    });
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
      principal: { decisionOwner: 'human' },
    });
    const zulu = declaration('zulu', {
      does: 'Zulu',
      invocation: 'inputless',
      principal: { mayInvoke: ['agent'] },
    });
    const declarations = [zulu, alpha];
    const before = [...declarations];

    const first = checkActionContracts(declarations, environment());
    const second = checkActionContracts(
      [...declarations].reverse(),
      environment(),
    );

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
