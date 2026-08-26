/**
 * declarations — freeze and snapshot what the application declared.
 *
 * A declaration is retained exactly as captured: frozen, cloned where the
 * caller could otherwise mutate what the record already promised.
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

export function freezeBindings(bindings: readonly Binding[]): readonly Binding[] {
  if (!Array.isArray(bindings)) {
    throw new TypeError('hcifootprint: binding locators must be an array.');
  }
  return Object.freeze(bindings.map((binding) => freezeBinding(binding)));
}

export function freezeBinding(binding: Binding): Binding {
  if (binding === null || typeof binding !== 'object') {
    throw new TypeError('hcifootprint: each binding locator must be a record.');
  }
  if (binding.kind === 'element') {
    if (
      binding.locator === null ||
      typeof binding.locator !== 'object' ||
      typeof binding.locator.role !== 'string' ||
      typeof binding.locator.name !== 'string' ||
      (binding.actuation !== undefined &&
        !['click', 'type', 'select', 'hover', 'drag', 'press'].includes(
          binding.actuation,
        ))
    ) {
      throw new TypeError(
        'hcifootprint: an element locator needs string role/name fields and a supported actuation.',
      );
    }
    return Object.freeze({
      ...binding,
      locator: Object.freeze({ ...binding.locator }),
    });
  }
  if (binding.kind === 'keychord' && typeof binding.chord === 'string') {
    return Object.freeze({ ...binding });
  }
  if (binding.kind === 'programmatic' && typeof binding.provider === 'string') {
    return Object.freeze({ ...binding });
  }
  if (binding.kind === 'url' && typeof binding.href === 'string') {
    return Object.freeze({ ...binding });
  }
  if (binding.kind === 'tab' && typeof binding.target === 'string') {
    return Object.freeze({ ...binding });
  }
  throw new TypeError(
    `hcifootprint: unsupported or malformed binding locator '${String((binding as { kind?: unknown }).kind)}'.`,
  );
}

export function snapshotDeclaration<T>(value: T): T {
  return cloneDeclaration(value, new WeakMap<object, unknown>());
}

export function cloneDeclaration<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (typeof value !== 'object' || value === null) return value;
  const existing = seen.get(value);
  if (existing !== undefined) return existing as T;
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) copy.push(cloneDeclaration(item, seen));
    return Object.freeze(copy) as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, item] of Object.entries(value)) {
    Object.defineProperty(copy, key, {
      value: cloneDeclaration(item, seen),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(copy) as T;
}

