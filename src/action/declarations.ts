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

/**
 * THE ONE DETACHING STEP FOR A GOVERNED VALUE — `settle.evidence`.
 *
 * `snapshotDeclaration` copies plain records and arrays and keeps everything
 * else BY REFERENCE (an Error, a DOM node, a class instance): the right call
 * for a quoted reason or a late claim, which only has to be readable later.
 * It is the wrong call for a value the record says was CHECKED: an app that
 * still holds its class instance could change it after the kind's schema
 * passed it, and the record would keep saying "checked".
 *
 * So a governed value is detached ONCE — `structuredClone`, the wire bar the
 * rest of the library already holds data to (a declared-context entry is
 * promised structured-clone-safe) — then snapshotted (every part frozen),
 * and only THEN handed to the schema. The recorded bytes are the checked
 * bytes. A class instance comes back as its own data (a plain record).
 *
 * The recorded value is DATA ONLY — records, arrays and primitives — because
 * only data can be frozen. A Map, Set, Date, Error, RegExp or typed array
 * keeps its contents in internal slots `Object.freeze` does not reach, and
 * the record is SERVED, not copied per read: `settle()`'s return, every
 * snapshot and every fold reader hand out the recorded value itself. A fresh
 * Map would still be editable by whoever holds `settle()`'s return
 * (`returned.m.set(…)` edits what the schema checked). So such a value is
 * REFUSED (`refuseUnfrozen`, naming where it sits); the app records it as
 * data instead (an ISO string for a Date, entries for a Map).
 *
 * A value `structuredClone` refuses (a function anywhere inside, a Proxy, a
 * host object) is REFUSED too (`refuseUncloneable`), never kept by
 * reference: a reference fallback would leave the swap open for exactly the
 * values built to read differently each time (the
 * `traverse/bound-input.ts · boundInput` finding). Both refusals throw before
 * anything is written, so the terminal is not spent.
 */
export function detachGovernedValue<T>(
  value: T,
  refuse: {
    readonly uncloneable: (cause: unknown) => Error;
    readonly unfrozen: (path: string, found: string) => Error;
  },
): T {
  let detached: T;
  try {
    detached = structuredClone(value);
  } catch (error) {
    throw refuse.uncloneable(error);
  }
  const unfrozen = firstUnfreezable(detached, [], new WeakSet<object>());
  if (unfrozen !== undefined) {
    throw refuse.unfrozen(unfrozen.path, unfrozen.found);
  }
  return snapshotDeclaration(detached);
}

/**
 * The first part of a structured-clone result that is not a record, an array
 * or a primitive — the parts `snapshotDeclaration` would keep by reference.
 * `path` is dot-joined keys ('' for the value itself). Cycles survive
 * `structuredClone`, so a visited object is not walked twice.
 */
function firstUnfreezable(
  value: unknown,
  path: readonly string[],
  seen: WeakSet<object>,
): { readonly path: string; readonly found: string } | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return {
      path: path.join('.'),
      found: Object.prototype.toString.call(value).slice(8, -1),
    };
  }
  for (const [key, item] of Object.entries(value)) {
    const found = firstUnfreezable(item, [...path, key], seen);
    if (found !== undefined) return found;
  }
  return undefined;
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

