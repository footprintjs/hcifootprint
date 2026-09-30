/**
 * principals — who is asking, and what that principal may be offered.
 *
 * The principal belongs to the READER, never to a binding: one control may
 * be offered to a person while withheld from an agent. The verdict is
 * computed here so offer generation and invocation re-checking cannot
 * drift apart.
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
import { checkPrincipalPolicy } from '../traverse/principal-policy.js';
import type { HumanReporting, ReadonlyActionDefinitionContract, ActionInputValidationDisposition, ActionDefinitionRef, ActionLifecycle, ActionInputSource } from './types.js';
import type { BindingRegistration } from '../registry/registry.js';

export function assertPrincipal(
  value: unknown,
  context: string,
): asserts value is Principal {
  if (
    value !== 'user' &&
    value !== 'agent' &&
    value !== 'system' &&
    value !== 'unknown'
  ) {
    throw new TypeError(
      `hcifootprint: ${context} principal must be user, agent, system, or unknown.`,
    );
  }
}

export function verdictForPrincipal(
  contract: ReadonlyActionDefinitionContract,
  principal: Principal,
): ReturnType<typeof checkPrincipalPolicy> {
  // The verdict reads ONE field (principal-policy.ts · checkPrincipalPolicy):
  // decisionOwner is disclosure that enforcement never reads, and
  // requiresHumanApproval is its own gate (needsRecordedApproval). Handing it
  // only mayInvoke is the whole question, not a narrowed one.
  const mayInvoke = contract.principal?.mayInvoke;
  const policy =
    mayInvoke === undefined ? undefined : { mayInvoke: [...mayInvoke] };
  return checkPrincipalPolicy({ policy, principal, enforcing: true });
}

