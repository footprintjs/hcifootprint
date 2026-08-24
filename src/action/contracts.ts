/**
 * Pure action-contract activation projection.
 *
 * A declaration says what should be enforced; a binding/evidence snapshot says
 * whether the selected runtime can actually enforce it. This module joins those
 * two facts without reading a Session, invoking application code, or importing
 * any runtime engine. Missing facts remain unresolved unless the corresponding
 * inventory explicitly says it is complete. Input-schema activation is not part
 * of this environment model; ActionRuntime owns that validation boundary.
 */
import type {
  ActionBindingRef,
  ActionDefinitionRef,
  BindingCoverage,
  ReadonlyActionDefinitionContract,
} from './types.js';
import { assertBindingCoverage } from './coverage.js';

export type ActionContractDisposition =
  | 'active'
  | 'disclosure-only'
  | 'unresolved'
  | 'inert';

export type ActionContractKind =
  | 'principal-may-invoke'
  | 'principal-decision-owner'
  | 'principal-human-approval'
  | 'guard-when'
  | 'enabled-when'
  | 'verify'
  | 'pointing'
  | 'agent-execution'
  | 'high-effect-verification'
  | 'interactive-host';

export type ActionContractReason =
  | 'principal-enforcement-active'
  | 'principal-enforcement-disabled'
  | 'runtime-policy-unresolved'
  | 'decision-owner-is-disclosure'
  | 'human-approval-active'
  | 'human-approval-disabled'
  | 'evidence-producer-present'
  | 'evidence-producer-missing'
  | 'evidence-inventory-incomplete'
  | 'predicate-verification-active'
  | 'predicate-verification-disabled'
  | 'predicate-verification-unresolved'
  | 'empty-state-contract'
  | 'coverage-sufficient'
  | 'coverage-insufficient'
  | 'interactive-host-resolved'
  | 'interactive-host-missing'
  | 'interactive-host-unresolved'
  | 'verification-path-active'
  | 'verification-path-missing'
  | 'verification-path-unresolved';

/** The immutable definition projection accepted by the checker. */
export interface ActionContractDeclaration<Id extends string = string> {
  readonly ref: ActionDefinitionRef<Id>;
  readonly contract: ReadonlyActionDefinitionContract;
}

/** A capability an integration explicitly asks one binding to provide. */
export type ActionBindingCapability =
  | 'pointing'
  | 'agent-execution'
  | 'high-effect-verification';

export type InteractiveHostResolution =
  | 'resolved'
  | 'missing'
  | 'unknown'
  | 'not-required';

/** One row from the canonical live-binding inventory. */
export interface ActionBindingContractRow<Id extends string = string> {
  readonly ref: ActionBindingRef<Id>;
  readonly coverage: BindingCoverage;
  readonly requestedCapabilities?: readonly ActionBindingCapability[];
  /** Whether this adapter must resolve a real interactive descendant. */
  readonly requiresInteractiveHost?: boolean;
  /** The adapter's committed resolution result, never inferred from a locator. */
  readonly interactiveHost?: InteractiveHostResolution;
}

export interface ActionBindingContractSnapshot {
  /** False means absent rows are unknown, never proof that a binding is missing. */
  readonly complete: boolean;
  readonly rows: readonly ActionBindingContractRow[];
}

export type ActionEvidenceStage = 'availability' | 'settlement' | 'both';

/** An authoritative application rail the checker may rely on. */
export type ActionEvidenceProducer =
  | {
      readonly kind: 'state';
      readonly producerId: string;
      readonly keys: readonly string[];
      readonly stages: readonly ActionEvidenceStage[];
      /** Omitted means this producer is shared by every definition. */
      readonly definitionId?: string;
    }
  | {
      readonly kind: 'navigation';
      readonly producerId: string;
      /** Omitted means the router observation rail is shared. */
      readonly definitionId?: string;
    }
  | {
      readonly kind: 'external-effect';
      readonly producerId: string;
      /** Omitted means the observation rail accepts every definition. */
      readonly definitionId?: string;
    };

export interface ActionEvidenceSnapshot {
  /** False means a producer not listed here may still exist. */
  readonly complete: boolean;
  readonly producers: readonly ActionEvidenceProducer[];
}

/**
 * Normalized runtime switches. A complete snapshot carries every effective
 * boolean; a partial snapshot may omit facts the caller cannot currently know.
 */
export type ActionContractRuntimeSnapshot =
  | {
      readonly complete: true;
      readonly principalEnforcement: boolean;
      readonly humanApprovalGate: boolean;
      /** Whether this environment will execute function-valued settle.verify clauses. */
      readonly predicateVerification: boolean;
    }
  | {
      readonly complete: false;
      readonly principalEnforcement?: boolean;
      readonly humanApprovalGate?: boolean;
      /** Omitted when predicate-executor activation is not yet known. */
      readonly predicateVerification?: boolean;
    };

export interface ActionContractEnvironment {
  readonly runtime: ActionContractRuntimeSnapshot;
  readonly bindings: ActionBindingContractSnapshot;
  readonly evidence: ActionEvidenceSnapshot;
}

export interface ActionContractResult {
  readonly definition: ActionDefinitionRef;
  readonly binding?: ActionBindingRef;
  readonly kind: ActionContractKind;
  readonly disposition: ActionContractDisposition;
  readonly reason: ActionContractReason;
  readonly keys?: readonly string[];
  readonly requiredCoverage?: BindingCoverage;
  readonly actualCoverage?: BindingCoverage;
  readonly message: string;
  readonly remedy: string;
}

export interface ActionContractReport {
  /** True only when every emitted activation check is active or disclosure-only. */
  readonly ok: boolean;
  /** False whenever at least one contract could not be decided from the snapshot. */
  readonly conclusive: boolean;
  readonly declarationsChecked: number;
  readonly bindingsChecked: number;
  readonly contracts: readonly ActionContractResult[];
  readonly counts: Readonly<Record<ActionContractDisposition, number>>;
  readonly byDisposition: Readonly<
    Record<ActionContractDisposition, readonly ActionContractResult[]>
  >;
  readonly summary: string;
}

const COVERAGE_RANK: Readonly<Record<BindingCoverage, number>> = Object.freeze({
  identity: 0,
  semantic: 1,
  executable: 2,
  verifiable: 3,
});

const KIND_ORDER: Readonly<Record<ActionContractKind, number>> = Object.freeze({
  'principal-may-invoke': 0,
  'principal-decision-owner': 1,
  'principal-human-approval': 2,
  'guard-when': 3,
  'enabled-when': 4,
  verify: 5,
  pointing: 6,
  'agent-execution': 7,
  'high-effect-verification': 8,
  'interactive-host': 9,
});

const DISPOSITIONS: readonly ActionContractDisposition[] = Object.freeze([
  'active',
  'disclosure-only',
  'unresolved',
  'inert',
]);

interface ResultInput {
  readonly definition: ActionDefinitionRef;
  readonly binding?: ActionBindingRef;
  readonly kind: ActionContractKind;
  readonly disposition: ActionContractDisposition;
  readonly reason: ActionContractReason;
  readonly keys?: readonly string[];
  readonly requiredCoverage?: BindingCoverage;
  readonly actualCoverage?: BindingCoverage;
  readonly message: string;
  readonly remedy: string;
}

interface StateContractVerdict {
  readonly disposition: Extract<
    ActionContractDisposition,
    'active' | 'unresolved' | 'inert'
  >;
  readonly reason: Extract<
    ActionContractReason,
    | 'evidence-producer-present'
    | 'evidence-producer-missing'
    | 'evidence-inventory-incomplete'
    | 'empty-state-contract'
  >;
  readonly keys: readonly string[];
}

interface VerificationPathVerdict {
  readonly disposition: Extract<
    ActionContractDisposition,
    'active' | 'unresolved' | 'inert'
  >;
  readonly reason: Extract<
    ActionContractReason,
    | 'verification-path-active'
    | 'verification-path-missing'
    | 'verification-path-unresolved'
    | 'predicate-verification-active'
    | 'predicate-verification-disabled'
    | 'predicate-verification-unresolved'
  >;
}

interface PredicateVerificationVerdict {
  readonly disposition: Extract<
    ActionContractDisposition,
    'active' | 'unresolved' | 'inert'
  >;
  readonly reason: Extract<
    ActionContractReason,
    | 'predicate-verification-active'
    | 'predicate-verification-disabled'
    | 'predicate-verification-unresolved'
  >;
}

/**
 * Classify every activation clause modeled by the supplied runtime, binding,
 * and evidence snapshots, plus capabilities explicitly requested by binding
 * rows. `ok` covers only the checks this function emits. In particular,
 * input-schema activation belongs to ActionRuntime and is not modeled here.
 */
export function checkActionContracts(
  declarations: readonly ActionContractDeclaration[],
  environment: ActionContractEnvironment,
): ActionContractReport {
  for (const row of environment.bindings.rows) {
    assertBindingCoverage(
      row.coverage,
      `contract-check binding '${row.ref.bindingId}'`,
    );
    if (
      row.requestedCapabilities !== undefined &&
      (!Array.isArray(row.requestedCapabilities) ||
        row.requestedCapabilities.some(
          (capability) =>
            capability !== 'pointing' &&
            capability !== 'agent-execution' &&
            capability !== 'high-effect-verification',
        ))
    ) {
      throw new TypeError(
        `hcifootprint: contract-check binding '${row.ref.bindingId}' has an invalid requested capability.`,
      );
    }
    if (
      row.requiresInteractiveHost !== undefined &&
      typeof row.requiresInteractiveHost !== 'boolean'
    ) {
      throw new TypeError(
        `hcifootprint: contract-check binding '${row.ref.bindingId}' requiresInteractiveHost must be boolean.`,
      );
    }
    if (
      row.interactiveHost !== undefined &&
      row.interactiveHost !== 'resolved' &&
      row.interactiveHost !== 'missing' &&
      row.interactiveHost !== 'unknown' &&
      row.interactiveHost !== 'not-required'
    ) {
      throw new TypeError(
        `hcifootprint: contract-check binding '${row.ref.bindingId}' has an invalid interactiveHost value.`,
      );
    }
  }
  const pending: ResultInput[] = [];
  const definitions = [...declarations].sort((left, right) =>
    compare(left.ref.definitionId, right.ref.definitionId),
  );
  const bindings = [...environment.bindings.rows].sort(compareBindings);

  for (const declaration of definitions) {
    const definition = declaration.ref;
    const contract = declaration.contract;
    const definitionBindings = bindings.filter(
      (row) => row.ref.definition.definitionId === definition.definitionId,
    );

    const principal = contract.principal;
    if (principal?.mayInvoke !== undefined) {
      const enabled = environment.runtime.principalEnforcement;
      if (enabled === true) {
        pending.push({
          definition,
          kind: 'principal-may-invoke',
          disposition: 'active',
          reason: 'principal-enforcement-active',
          message: `Principal enforcement is active for '${definition.definitionId}'.`,
          remedy: 'No change is required.',
        });
      } else if (enabled === false) {
        pending.push({
          definition,
          kind: 'principal-may-invoke',
          disposition: 'inert',
          reason: 'principal-enforcement-disabled',
          message: `Action '${definition.definitionId}' declares who may invoke it, but principal enforcement is disabled.`,
          remedy:
            'Enable principal enforcement for this runtime, or treat the declaration as disclosure rather than a gate.',
        });
      } else {
        pending.push({
          definition,
          kind: 'principal-may-invoke',
          disposition: 'unresolved',
          reason: 'runtime-policy-unresolved',
          message: `Whether '${definition.definitionId}' enforces its principal policy is unknown.`,
          remedy: 'Provide a complete runtime-policy snapshot.',
        });
      }
    }

    if (principal?.decisionOwner !== undefined) {
      pending.push({
        definition,
        kind: 'principal-decision-owner',
        disposition: 'disclosure-only',
        reason: 'decision-owner-is-disclosure',
        message: `Decision ownership for '${definition.definitionId}' is intentionally descriptive.`,
        remedy:
          'Declare mayInvoke when ownership must also constrain who can execute the action.',
      });
    }

    if (principal?.requiresHumanApproval === true) {
      const principalGate = environment.runtime.principalEnforcement;
      const approvalGate = environment.runtime.humanApprovalGate;
      if (principalGate === false || approvalGate === false) {
        pending.push({
          definition,
          kind: 'principal-human-approval',
          disposition: 'inert',
          reason: 'human-approval-disabled',
          message: `Action '${definition.definitionId}' requires human approval, but at least one runtime gate is disabled.`,
          remedy:
            'Enable both principal enforcement and the runtime human-approval gate.',
        });
      } else if (principalGate === true && approvalGate === true) {
        pending.push({
          definition,
          kind: 'principal-human-approval',
          disposition: 'active',
          reason: 'human-approval-active',
          message: `Human approval is enforced for '${definition.definitionId}'.`,
          remedy: 'No change is required.',
        });
      } else {
        pending.push({
          definition,
          kind: 'principal-human-approval',
          disposition: 'unresolved',
          reason: 'runtime-policy-unresolved',
          message: `Whether '${definition.definitionId}' enforces human approval is unknown.`,
          remedy: 'Provide both effective runtime gate values.',
        });
      }
    }

    if (contract.guard?.when !== undefined) {
      const verdict = checkStateContract(
        definition.definitionId,
        Object.keys(contract.guard.when),
        'availability',
        environment.evidence,
      );
      pending.push({
        definition,
        kind: 'guard-when',
        disposition: verdict.disposition,
        reason: verdict.reason,
        keys: verdict.keys,
        message: stateMessage(definition.definitionId, 'when', verdict),
        remedy: stateRemedy(verdict),
      });
    }

    if (contract.guard?.enabledWhen !== undefined) {
      const verdict = checkStateContract(
        definition.definitionId,
        Object.keys(contract.guard.enabledWhen),
        'availability',
        environment.evidence,
      );
      pending.push({
        definition,
        kind: 'enabled-when',
        disposition: verdict.disposition,
        reason: verdict.reason,
        keys: verdict.keys,
        message: stateMessage(definition.definitionId, 'enabledWhen', verdict),
        remedy: stateRemedy(verdict),
      });
    }

    if (contract.settle?.verify !== undefined) {
      if (typeof contract.settle.verify === 'function') {
        pending.push(
          predicateVerificationResult(definition, environment.runtime),
        );
      } else {
        const verdict = checkStateContract(
          definition.definitionId,
          Object.keys(contract.settle.verify),
          'settlement',
          environment.evidence,
        );
        pending.push({
          definition,
          kind: 'verify',
          disposition: verdict.disposition,
          reason: verdict.reason,
          keys: verdict.keys,
          message: stateMessage(definition.definitionId, 'verify', verdict),
          remedy: stateRemedy(verdict),
        });
      }
    }

    for (const row of definitionBindings) {
      const requested = [...new Set(row.requestedCapabilities ?? [])].sort(
        (left, right) => compare(left, right),
      );
      for (const capability of requested) {
        if (capability === 'pointing') {
          pending.push(coverageResult(definition, row, 'pointing', 'identity'));
        } else if (capability === 'agent-execution') {
          pending.push(
            coverageResult(definition, row, 'agent-execution', 'executable'),
          );
        } else {
          pending.push(
            highEffectResult(
              declaration,
              row,
              environment.evidence,
              environment.runtime,
            ),
          );
        }
      }

      if (row.requiresInteractiveHost === true) {
        pending.push(hostResult(definition, row));
      }
    }
  }

  pending.sort(compareResults);
  const contracts = Object.freeze(pending.map(freezeResult));
  const counts = countDispositions(contracts);
  const byDisposition = groupDispositions(contracts);
  const ok = contracts.every(
    ({ disposition }) =>
      disposition === 'active' || disposition === 'disclosure-only',
  );
  const conclusive = counts.unresolved === 0;
  const summary =
    `Action contracts — ${counts.active} active, ` +
    `${counts['disclosure-only']} disclosure-only, ` +
    `${counts.unresolved} unresolved, ${counts.inert} inert ` +
    `(${definitions.length} declaration${definitions.length === 1 ? '' : 's'}, ` +
    `${bindings.length} binding${bindings.length === 1 ? '' : 's'} checked).`;

  return Object.freeze({
    ok,
    conclusive,
    declarationsChecked: definitions.length,
    bindingsChecked: bindings.length,
    contracts,
    counts,
    byDisposition,
    summary,
  });
}

function checkStateContract(
  definitionId: string,
  rawKeys: readonly string[],
  stage: Exclude<ActionEvidenceStage, 'both'>,
  evidence: ActionEvidenceSnapshot,
): StateContractVerdict {
  const keys = uniqueSorted(rawKeys);
  if (keys.length === 0) {
    return {
      disposition: 'inert',
      reason: 'empty-state-contract',
      keys,
    };
  }
  const missing = keys.filter(
    (key) => !hasStateProducer(evidence, definitionId, key, stage),
  );
  if (missing.length === 0) {
    return {
      disposition: 'active',
      reason: 'evidence-producer-present',
      keys,
    };
  }
  return evidence.complete
    ? {
        disposition: 'inert',
        reason: 'evidence-producer-missing',
        keys: Object.freeze(missing),
      }
    : {
        disposition: 'unresolved',
        reason: 'evidence-inventory-incomplete',
        keys: Object.freeze(missing),
      };
}

function predicateVerificationResult(
  definition: ActionDefinitionRef,
  runtime: ActionContractRuntimeSnapshot,
): ResultInput {
  const verdict = predicateVerificationVerdict(runtime);
  if (verdict.disposition === 'active') {
    return {
      definition,
      kind: 'verify',
      ...verdict,
      message: `The runtime predicate executor is active for '${definition.definitionId}'.`,
      remedy: 'No change is required.',
    };
  }
  if (verdict.disposition === 'inert') {
    return {
      definition,
      kind: 'verify',
      ...verdict,
      message: `Action '${definition.definitionId}' declares a verify predicate, but runtime predicate verification is disabled.`,
      remedy:
        'Enable predicate verification for this runtime, or treat the predicate as disclosure rather than an active check.',
    };
  }
  return {
    definition,
    kind: 'verify',
    ...verdict,
    message: `Whether '${definition.definitionId}' can execute its verify predicate is unknown.`,
    remedy: 'Provide the effective predicate-verification runtime value.',
  };
}

function predicateVerificationVerdict(
  runtime: ActionContractRuntimeSnapshot,
): PredicateVerificationVerdict {
  if (runtime.predicateVerification === true) {
    return {
      disposition: 'active',
      reason: 'predicate-verification-active',
    };
  }
  if (runtime.predicateVerification === false) {
    return {
      disposition: 'inert',
      reason: 'predicate-verification-disabled',
    };
  }
  return {
    disposition: 'unresolved',
    reason: 'predicate-verification-unresolved',
  };
}

function hasStateProducer(
  evidence: ActionEvidenceSnapshot,
  definitionId: string,
  key: string,
  stage: Exclude<ActionEvidenceStage, 'both'>,
): boolean {
  return evidence.producers.some(
    (producer) =>
      producer.kind === 'state' &&
      appliesTo(producer.definitionId, definitionId) &&
      producer.keys.includes(key) &&
      (producer.stages.includes(stage) || producer.stages.includes('both')),
  );
}

function coverageResult(
  definition: ActionDefinitionRef,
  row: ActionBindingContractRow,
  kind: Extract<ActionContractKind, 'pointing' | 'agent-execution'>,
  requiredCoverage: BindingCoverage,
): ResultInput {
  const sufficient =
    COVERAGE_RANK[row.coverage] >= COVERAGE_RANK[requiredCoverage];
  return {
    definition,
    binding: row.ref,
    kind,
    disposition: sufficient ? 'active' : 'inert',
    reason: sufficient ? 'coverage-sufficient' : 'coverage-insufficient',
    requiredCoverage,
    actualCoverage: row.coverage,
    message: sufficient
      ? `Binding '${row.ref.bindingId}' has ${row.coverage} coverage, sufficient for ${kind}.`
      : `Binding '${row.ref.bindingId}' has ${row.coverage} coverage, below the ${requiredCoverage} coverage required for ${kind}.`,
    remedy: sufficient
      ? 'No change is required.'
      : `Raise this binding to ${requiredCoverage} coverage or stop requesting ${kind}.`,
  };
}

function hostResult(
  definition: ActionDefinitionRef,
  row: ActionBindingContractRow,
): ResultInput {
  if (row.interactiveHost === 'resolved') {
    return {
      definition,
      binding: row.ref,
      kind: 'interactive-host',
      disposition: 'active',
      reason: 'interactive-host-resolved',
      message: `Binding '${row.ref.bindingId}' has a usable interactive host.`,
      remedy: 'No change is required.',
    };
  }
  if (row.interactiveHost === 'not-required') {
    return {
      definition,
      binding: row.ref,
      kind: 'interactive-host',
      disposition: 'inert',
      reason: 'interactive-host-missing',
      message: `Binding '${row.ref.bindingId}' requires an interactive host but its snapshot marks one as not required.`,
      remedy:
        'Resolve the real interactive descendant, or set requiresInteractiveHost to false.',
    };
  }
  if (row.interactiveHost === 'missing') {
    return {
      definition,
      binding: row.ref,
      kind: 'interactive-host',
      disposition: 'inert',
      reason: 'interactive-host-missing',
      message: `The adapter could not resolve the interactive host for binding '${row.ref.bindingId}'.`,
      remedy:
        'Fix the adapter to resolve the real interactive descendant, or do not request a host-dependent capability.',
    };
  }
  return {
    definition,
    binding: row.ref,
    kind: 'interactive-host',
    disposition: 'unresolved',
    reason: 'interactive-host-unresolved',
    message: `Interactive-host resolution for binding '${row.ref.bindingId}' is unknown.`,
    remedy: 'Run the adapter resolution step and include its committed result.',
  };
}

function highEffectResult(
  declaration: ActionContractDeclaration,
  row: ActionBindingContractRow,
  evidence: ActionEvidenceSnapshot,
  runtime: ActionContractRuntimeSnapshot,
): ResultInput {
  if (COVERAGE_RANK[row.coverage] < COVERAGE_RANK.verifiable) {
    return {
      definition: declaration.ref,
      binding: row.ref,
      kind: 'high-effect-verification',
      disposition: 'inert',
      reason: 'coverage-insufficient',
      requiredCoverage: 'verifiable',
      actualCoverage: row.coverage,
      message: `Binding '${row.ref.bindingId}' cannot provide verified high-effect execution with ${row.coverage} coverage.`,
      remedy:
        'Connect an authoritative effect rail and classify the binding as verifiable, or stop requesting verified execution.',
    };
  }

  const path = verificationPath(declaration, evidence, runtime);
  return {
    definition: declaration.ref,
    binding: row.ref,
    kind: 'high-effect-verification',
    disposition: path.disposition,
    reason: path.reason,
    requiredCoverage: 'verifiable',
    actualCoverage: row.coverage,
    message: verificationPathMessage(row.ref.bindingId, path),
    remedy: verificationPathRemedy(path),
  };
}

function verificationPath(
  declaration: ActionContractDeclaration,
  evidence: ActionEvidenceSnapshot,
  runtime: ActionContractRuntimeSnapshot,
): VerificationPathVerdict {
  const contract = declaration.contract;
  const definitionId = declaration.ref.definitionId;
  if (contract.settle?.observability === 'postcondition') {
    if (contract.settle.verify === undefined) {
      return missingVerificationPath(evidence);
    }
    if (typeof contract.settle.verify === 'function') {
      return predicateVerificationVerdict(runtime);
    }
    const state = checkStateContract(
      definitionId,
      Object.keys(contract.settle.verify),
      'settlement',
      evidence,
    );
    return state.disposition === 'active'
      ? { disposition: 'active', reason: 'verification-path-active' }
      : state.disposition === 'unresolved'
        ? {
            disposition: 'unresolved',
            reason: 'verification-path-unresolved',
          }
        : { disposition: 'inert', reason: 'verification-path-missing' };
  }

  if (
    contract.settle?.observability === 'navigation' &&
    contract.settle.goTo !== undefined
  ) {
    return producerPath(evidence, definitionId, 'navigation');
  }
  if (contract.settle?.observability === 'external') {
    return producerPath(evidence, definitionId, 'external-effect');
  }
  return missingVerificationPath(evidence, true);
}

function verificationPathMessage(
  bindingId: string,
  path: VerificationPathVerdict,
): string {
  if (path.reason === 'predicate-verification-disabled') {
    return `Binding '${bindingId}' declares a verify predicate, but runtime predicate verification is disabled.`;
  }
  if (path.reason === 'predicate-verification-unresolved') {
    return `Whether binding '${bindingId}' can execute its verify predicate is unknown.`;
  }
  return path.disposition === 'active'
    ? `Binding '${bindingId}' has a usable authoritative verification path.`
    : path.disposition === 'unresolved'
      ? `The authoritative verification path for binding '${bindingId}' is not completely known.`
      : `Binding '${bindingId}' has no usable authoritative verification path.`;
}

function verificationPathRemedy(path: VerificationPathVerdict): string {
  if (path.disposition === 'active') return 'No change is required.';
  if (path.reason === 'predicate-verification-disabled') {
    return 'Enable predicate verification for this runtime.';
  }
  if (path.reason === 'predicate-verification-unresolved') {
    return 'Provide the effective predicate-verification runtime value.';
  }
  return 'Provide the declared postcondition, navigation, or external-effect producer.';
}

function producerPath(
  evidence: ActionEvidenceSnapshot,
  definitionId: string,
  kind: Extract<
    ActionEvidenceProducer['kind'],
    'navigation' | 'external-effect'
  >,
): VerificationPathVerdict {
  const present = evidence.producers.some(
    (producer) =>
      producer.kind === kind && appliesTo(producer.definitionId, definitionId),
  );
  if (present) {
    return {
      disposition: 'active',
      reason: 'verification-path-active',
    };
  }
  return missingVerificationPath(evidence);
}

function missingVerificationPath(
  evidence: ActionEvidenceSnapshot,
  declarationItselfIsInsufficient = false,
): VerificationPathVerdict {
  if (declarationItselfIsInsufficient || evidence.complete) {
    return {
      disposition: 'inert',
      reason: 'verification-path-missing',
    };
  }
  return {
    disposition: 'unresolved',
    reason: 'verification-path-unresolved',
  };
}

function appliesTo(
  producerDefinitionId: string | undefined,
  definitionId: string,
): boolean {
  return (
    producerDefinitionId === undefined || producerDefinitionId === definitionId
  );
}

function stateMessage(
  definitionId: string,
  name: 'when' | 'enabledWhen' | 'verify',
  verdict: StateContractVerdict,
): string {
  if (verdict.disposition === 'active') {
    return `Every ${name} key for '${definitionId}' has an authoritative producer.`;
  }
  const listed = verdict.keys.map((key) => `'${key}'`).join(', ');
  if (verdict.reason === 'empty-state-contract') {
    return `Action '${definitionId}' carries an empty ${name} contract.`;
  }
  return verdict.disposition === 'inert'
    ? `Action '${definitionId}' has ${name} key(s) with no evidence producer: ${listed}.`
    : `Evidence inventory is incomplete for ${name} key(s) on '${definitionId}': ${listed}.`;
}

function stateRemedy(verdict: StateContractVerdict): string {
  if (verdict.disposition === 'active') return 'No change is required.';
  if (verdict.reason === 'empty-state-contract') {
    return 'Declare at least one condition, or remove the empty contract.';
  }
  return verdict.disposition === 'inert'
    ? 'Publish every named key through the required application evidence stage.'
    : 'Provide a complete evidence snapshot before treating this contract as active.';
}

function freezeResult(input: ResultInput): ActionContractResult {
  const definition = freezeDefinitionRef(input.definition);
  const binding =
    input.binding === undefined
      ? undefined
      : freezeBindingRef(input.binding, definition);
  return Object.freeze({
    definition,
    ...(binding !== undefined ? { binding } : {}),
    kind: input.kind,
    disposition: input.disposition,
    reason: input.reason,
    ...(input.keys !== undefined
      ? { keys: Object.freeze(uniqueSorted(input.keys)) }
      : {}),
    ...(input.requiredCoverage !== undefined
      ? { requiredCoverage: input.requiredCoverage }
      : {}),
    ...(input.actualCoverage !== undefined
      ? { actualCoverage: input.actualCoverage }
      : {}),
    message: input.message,
    remedy: input.remedy,
  });
}

function freezeDefinitionRef(ref: ActionDefinitionRef): ActionDefinitionRef {
  return Object.freeze({
    kind: 'action-definition' as const,
    definitionId: ref.definitionId,
  });
}

function freezeBindingRef(
  ref: ActionBindingRef,
  definition: ActionDefinitionRef,
): ActionBindingRef {
  return Object.freeze({
    kind: 'action-binding' as const,
    bindingId: ref.bindingId,
    definition,
    node: ref.node,
    ...(ref.instance !== undefined ? { instance: ref.instance } : {}),
  });
}

function countDispositions(
  contracts: readonly ActionContractResult[],
): Readonly<Record<ActionContractDisposition, number>> {
  const counts: Record<ActionContractDisposition, number> = {
    active: 0,
    'disclosure-only': 0,
    unresolved: 0,
    inert: 0,
  };
  for (const contract of contracts) counts[contract.disposition] += 1;
  return Object.freeze(counts);
}

function groupDispositions(
  contracts: readonly ActionContractResult[],
): Readonly<
  Record<ActionContractDisposition, readonly ActionContractResult[]>
> {
  const grouped: Record<ActionContractDisposition, ActionContractResult[]> = {
    active: [],
    'disclosure-only': [],
    unresolved: [],
    inert: [],
  };
  for (const contract of contracts)
    grouped[contract.disposition].push(contract);
  for (const disposition of DISPOSITIONS) {
    Object.freeze(grouped[disposition]);
  }
  return Object.freeze(grouped);
}

function compareBindings(
  left: ActionBindingContractRow,
  right: ActionBindingContractRow,
): number {
  return (
    compare(
      left.ref.definition.definitionId,
      right.ref.definition.definitionId,
    ) ||
    compare(left.ref.bindingId, right.ref.bindingId) ||
    compare(left.ref.instance ?? '', right.ref.instance ?? '')
  );
}

function compareResults(left: ResultInput, right: ResultInput): number {
  return (
    compare(left.definition.definitionId, right.definition.definitionId) ||
    compare(left.binding?.bindingId ?? '', right.binding?.bindingId ?? '') ||
    compare(left.binding?.instance ?? '', right.binding?.instance ?? '') ||
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    compare(left.reason, right.reason)
  );
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compare));
}
