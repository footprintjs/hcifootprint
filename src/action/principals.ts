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
  const declaration = contract.principal;
  const policy =
    declaration === undefined
      ? undefined
      : {
          ...(declaration.mayInvoke !== undefined
            ? { mayInvoke: [...declaration.mayInvoke] }
            : {}),
          ...(declaration.decisionOwner !== undefined
            ? { decisionOwner: declaration.decisionOwner }
            : {}),
          ...(declaration.requiresHumanApproval !== undefined
            ? {
                requiresHumanApproval: declaration.requiresHumanApproval,
              }
            : {}),
        };
  return checkPrincipalPolicy({ policy, principal, enforcing: true });
}

