/**
 * binding-facts — read what a live binding is claiming RIGHT NOW.
 *
 * Readers, never snapshots: enabled and busy are asked at the moment they
 * matter, and the answer is committed facts published by the skin.
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
import type { AttachedFacts, MutableBindingFacts } from './stored.js';

export function readEnabled(row: BindingRegistration): boolean | undefined {
  const value = row.readEnabled === undefined ? row.enabled : row.readEnabled();
  if (value !== undefined && typeof value !== 'boolean') {
    throw new TypeError(
      `hcifootprint: enabled reader for binding '${row.binding.bindingId}' returned ${typeof value}; expected boolean or undefined.`,
    );
  }
  return value;
}

export function readBusy(row: BindingRegistration): string | undefined {
  const value = row.readBusy === undefined ? row.busy : row.readBusy();
  if (value !== undefined && typeof value !== 'string') {
    throw new TypeError(
      `hcifootprint: busy reader for binding '${row.binding.bindingId}' returned ${typeof value}; expected string or undefined.`,
    );
  }
  return value;
}

export function snapshotBindingFacts(
  row: BindingRegistration,
  enabled: boolean | undefined,
  busy: string | undefined,
): ActionBindingSnapshot {
  return Object.freeze({
    ref: row.binding,
    present: true as const,
    attached: row.attached,
    enabled,
    ...(busy !== undefined ? { busy } : {}),
    coverage: row.coverage,
    locators: row.locators,
    ...(row.humanReporting !== undefined
      ? { humanReporting: row.humanReporting }
      : {}),
  });
}

