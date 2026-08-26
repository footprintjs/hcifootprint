/**
 * authoring — refusals at the declaration door.
 *
 * Teaching sentences for authoring mistakes: a reader that is not a
 * function, a human-reporting record with the wrong shape, a contract
 * activation this runtime cannot honour. Caught where the developer is
 * looking, not three layers later.
 * @internal
 */
import type {
  ActionAbandonmentAuthority,
  ActionBindingRef,
  ActionBindingSnapshot,
  ActionContractActivation,
  ActionDefinitionRecord,
  ActionEffectSettlement,
  ActionInvocation,
  ActionInvocationInput,
  ActionLateSettlement,
  ActionOffer,
  ActionOfferRef,
  ActionProgress,
  ActionProgressSnapshot,
  ActionTransitionRef,
  ActionTransitionSnapshot,
  BindingCoverage,
  DefinedAction,
} from './types.js';
import type { Binding, Principal } from '../atom/types.js';
import type { HumanReporting, ReadonlyActionDefinitionContract, ActionInputValidationDisposition, ActionDefinitionRef, ActionLifecycle, ActionInputSource } from './types.js';
import type { BindingRegistration } from '../registry/registry.js';

export function assertOptionalReader(
  value: unknown,
  field: string,
  context: string,
): void {
  if (value !== undefined && typeof value !== 'function') {
    throw new TypeError(
      `hcifootprint: ${context} ${field} must be a function when supplied.`,
    );
  }
}

export function assertHumanReporting(
  value: unknown,
  context: string,
): asserts value is HumanReporting | undefined {
  if (value !== undefined && value !== 'connection' && value !== 'sensor') {
    throw new TypeError(
      `hcifootprint: ${context} humanReporting must be connection or sensor.`,
    );
  }
}

/**
 * A `verified` verdict is meaningful only when the definition named what
 * authoritative evidence could prove the effect. Reads describe dependencies
 * and progress describes execution; neither proves that the effect settled.
 */
export function hasEvidenceBearingSettlement(
  settle: ReadonlyActionDefinitionContract['settle'],
): boolean {
  if (settle === undefined) return false;
  if (settle.writes !== undefined && settle.writes.length > 0) return true;
  if (settle.goTo !== undefined) return true;
  if (settle.verify !== undefined) return true;
  return (
    settle.observability !== undefined &&
    settle.observability !== 'unobservable'
  );
}

export function assertContractActivation(
  definitionId: string,
  contract: ReadonlyActionDefinitionContract,
  activation: ActionContractActivation,
  inputValidation: ActionInputValidationDisposition,
): void {
  if (activation === 'disclosure') return;
  const clauses: string[] = [];
  if (contract.guard?.when !== undefined) clauses.push('guard.when');
  if (contract.guard?.enabledWhen !== undefined) {
    clauses.push('guard.enabledWhen');
  }
  if (inputValidation === 'disclosure') {
    clauses.push('inputSchema');
  }
  if (contract.settle?.verify !== undefined) {
    clauses.push('settle.verify');
  }
  if (contract.principal?.requiresHumanApproval === true) {
    clauses.push('principal.requiresHumanApproval');
  }
  if (clauses.length === 0) return;
  throw new Error(
    `hcifootprint: action definition '${definitionId}' has enforceable contract clause(s) ${clauses.join(', ')} that this framework-neutral runtime cannot activate. Provide inputSchemaAdapter for a schema format without its own validator, use the graph Session surface for state/approval clauses, or createActionRuntime({ contractActivation: 'disclosure' }) to opt in visibly to metadata-only behavior.`,
  );
}

/** Capture the validator method once for this binding generation. */
