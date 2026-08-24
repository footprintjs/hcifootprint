/**
 * Callable action definitions.
 *
 * The wrapper is deliberately a normal, non-async function. `Reflect.apply`
 * preserves the caller's `this`, arguments, exact return value, thenable
 * identity, and thrown value. The declaration lives under `Symbol.for`, so a
 * second installed copy of HCIFootprint recognises the same function without a
 * mutable side table or a package-local `instanceof` check.
 */
import { detectSchema } from 'footprintjs';
import {
  GraphValidationError,
  validateBlockedBecause,
  validateGuardShape,
  validateHumanDecides,
  validateObservability,
  validatePrincipalPolicy,
} from '../graph/guards.js';
import { takesNoInput } from '../traverse/expects.js';
import { validateFreshness } from '../traverse/freshness.js';
import { validateConcurrency } from '../traverse/single-flight.js';
import type {
  ActionDefinitionContract,
  ActionDefinitionRecord,
  DefinedAction,
  ReadonlyActionDefinitionContract,
} from './types.js';

const ACTION_DEFINITION = Symbol.for('hcifootprint.action-definition.v1');

/**
 * The definition half of ActionDef, total over its type so a newly-added field
 * cannot quietly bypass this runtime authoring door.
 */
const ACTION_CONTRACT_FIELDS = new Set(
  Object.keys({
    does: true,
    when: true,
    enabledWhen: true,
    blockedBecause: true,
    writes: true,
    reads: true,
    goTo: true,
    confirm: true,
    inputSchema: true,
    verify: true,
    humanDecides: true,
    principalPolicy: true,
    observability: true,
    freshness: true,
    concurrency: true,
    role: true,
  } satisfies Record<keyof ActionDefinitionContract, true>),
);

const ACTION_ROLES = new Set(
  Object.keys({
    next: true,
    prev: true,
    submit: true,
    cancel: true,
    back: true,
    open: true,
    close: true,
    action: true,
  } satisfies Record<
    NonNullable<ActionDefinitionContract['role']>,
    true
  >),
);

function isRecord(value: unknown): value is ActionDefinitionRecord {
  if (typeof value !== 'object' || value === null) return false;
  try {
    const candidate = value as Partial<ActionDefinitionRecord>;
    if (!(
      Object.isFrozen(value) &&
      Object.isFrozen(candidate.ref) &&
      Object.isFrozen(candidate.contract) &&
      candidate.ref?.kind === 'action-definition' &&
      typeof candidate.ref.definitionId === 'string' &&
      candidate.ref.definitionId.trim().length > 0 &&
      typeof candidate.contract?.does === 'string' &&
      candidate.contract.does.trim().length > 0
    )) {
      return false;
    }
    validateActionDefinitionContract(
      candidate.ref.definitionId,
      candidate.contract as ActionDefinitionContract,
    );
    return true;
  } catch {
    // Symbol.for is a cross-copy capability marker, not a security boundary.
    // Frozen but malformed lookalikes remain ordinary functions.
    return false;
  }
}

/** Read the definition carried by a callable, including one branded by another package copy. */
export function actionDefinitionOf<
  F extends (...args: any[]) => any,
  Id extends string,
>(value: DefinedAction<F, Id>): ActionDefinitionRecord<Id>;
export function actionDefinitionOf(
  value: unknown,
): ActionDefinitionRecord | undefined;
export function actionDefinitionOf(
  value: unknown,
): ActionDefinitionRecord | undefined {
  if (typeof value !== 'function') return undefined;
  try {
    const branded = (value as unknown as Record<symbol, unknown>)[
      ACTION_DEFINITION
    ];
    return isRecord(branded) ? branded : undefined;
  } catch {
    return undefined;
  }
}

/** Whether a value is a callable action definition. */
export function isDefinedAction(
  value: unknown,
): value is DefinedAction<(...args: any[]) => any> {
  return actionDefinitionOf(value) !== undefined;
}

/**
 * Declare an application action once while keeping it an ordinary callable.
 * Reachability, instances, enabledness, and hosts are deliberately absent: they
 * belong to each live Action Binding, not to this one definition.
 */
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  contract: ActionDefinitionContract,
  implementation: F,
): DefinedAction<F, Id> {
  if (typeof definitionId !== 'string' || definitionId.trim().length === 0) {
    throw new TypeError(
      'hcifootprint: defineAction() needs a non-empty definition id.',
    );
  }
  if (typeof implementation !== 'function') {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') needs an implementation function.`,
    );
  }
  if (isDefinedAction(implementation)) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') received a function that is already an action definition — reuse it instead of creating two identities.`,
    );
  }
  // Own every authored byte before validation. Re-reading a caller-owned
  // accessor after validation could otherwise brand a different contract from
  // the one that passed the authoring laws.
  const capturedContract = snapshotActionDefinitionContract(
    definitionId,
    contract,
  );
  const frozenContract = freezeContract(capturedContract);
  validateActionDefinitionContract(
    definitionId,
    frozenContract as ActionDefinitionContract,
  );

  const ref = Object.freeze({
    kind: 'action-definition' as const,
    definitionId,
  });
  const definition = Object.freeze({ ref, contract: frozenContract });

  const callable = function (this: unknown, ...args: unknown[]): unknown {
    return Reflect.apply(implementation, this, args);
  };

  // Function `name` and `length` are configurable on ordinary functions. Keep
  // the debugger/stack and arity signals the implementation already carried.
  Object.defineProperty(callable, 'name', {
    value: implementation.name,
    configurable: true,
  });
  Object.defineProperty(callable, 'length', {
    value: implementation.length,
    configurable: true,
  });
  Object.defineProperty(callable, ACTION_DEFINITION, {
    value: definition,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return callable as DefinedAction<F, Id>;
}

/**
 * Runtime validation matters here even though the TypeScript contract is
 * narrow: definitions commonly cross JavaScript, JSON, and framework seams.
 * Reuse the graph's authoring laws so the same malformed declaration cannot be
 * accepted by one door and rejected by another.
 */
function validateActionDefinitionContract(
  definitionId: string,
  contract: ActionDefinitionContract,
): void {
  const owner = `action definition '${definitionId}'`;

  const prototype = Object.getPrototypeOf(contract);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new GraphValidationError(
      `${owner} contract must be a plain authored object.`,
    );
  }

  for (const field of Reflect.ownKeys(contract)) {
    const descriptor = Object.getOwnPropertyDescriptor(contract, field);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !('value' in descriptor)
    ) {
      throw new GraphValidationError(
        `${owner} contract field '${String(field)}' must be an enumerable data property.`,
      );
    }
    if (field === 'binding') {
      throw new GraphValidationError(
        `${owner} declares a live-site 'binding'. A callable definition describes what the action does; ` +
          `connectAction()/attach() own where each live binding exists. Remove 'binding' from the definition contract.`,
      );
    }
    if (field === 'input') {
      throw new GraphValidationError(
        `${owner} declares 'input'. Callable action definitions use 'inputSchema' for the payload contract; ` +
          `connectAction()/useActionBinding() use 'input' for the live invocation-time value reader.`,
      );
    }
    if (typeof field !== 'string' || !ACTION_CONTRACT_FIELDS.has(field)) {
      throw new GraphValidationError(
        `${owner} declares unknown contract field '${String(field)}'.`,
      );
    }
  }

  if (
    typeof contract.does !== 'string' ||
    contract.does.trim().length === 0
  ) {
    throw new GraphValidationError(
      `${owner} needs a non-empty authored 'does' sentence.`,
    );
  }

  if (contract.when !== undefined) {
    validateFilter(owner, 'when', contract.when);
  }
  if (contract.enabledWhen !== undefined) {
    validateFilter(owner, 'enabledWhen', contract.enabledWhen);
  }
  if (contract.verify !== undefined && typeof contract.verify !== 'function') {
    validateFilter(owner, 'verify', contract.verify);
  }
  if (
    contract.blockedBecause !== undefined &&
    typeof contract.blockedBecause !== 'function'
  ) {
    validateBlockedBecause(owner, contract.blockedBecause);
  }

  validateStringList(owner, 'writes', contract.writes);
  validateStringList(owner, 'reads', contract.reads);

  if (
    contract.goTo !== undefined &&
    (typeof contract.goTo !== 'string' || contract.goTo.trim().length === 0)
  ) {
    throw new GraphValidationError(
      `${owner}: goTo must be a non-empty page id string.`,
    );
  }
  if (contract.confirm !== undefined && typeof contract.confirm !== 'boolean') {
    throw new GraphValidationError(
      `${owner}: confirm must be true or false.`,
    );
  }
  if (
    contract.inputSchema !== undefined &&
    !takesNoInput(contract.inputSchema) &&
    detectSchema(contract.inputSchema) === 'none'
  ) {
    throw new GraphValidationError(
      `${owner} has an unrecognized input schema — pass a Zod schema, a JSON Schema object, ` +
        `a validator with .safeParse/.parse, or the string 'none' for an action that takes no input.`,
    );
  }
  if (contract.humanDecides !== undefined) {
    validateHumanDecides(owner, contract.humanDecides);
  }
  if (contract.principalPolicy !== undefined) {
    validatePrincipalPolicy(owner, contract.principalPolicy);
  }
  if (contract.observability !== undefined) {
    validateObservability(owner, contract.observability, {
      verify: contract.verify !== undefined,
      destination: contract.goTo !== undefined,
    });
  }
  if (contract.freshness !== undefined) {
    validatePlainPolicy(owner, 'freshness', contract.freshness);
    validateFreshness(owner, contract.freshness);
  }
  if (contract.concurrency !== undefined) {
    validatePlainPolicy(owner, 'concurrency', contract.concurrency);
    validateConcurrency(owner, contract.concurrency);
  }
  if (
    contract.role !== undefined &&
    (typeof contract.role !== 'string' || !ACTION_ROLES.has(contract.role))
  ) {
    throw new GraphValidationError(
      `${owner}: role must be one of ${[...ACTION_ROLES].join(', ')}.`,
    );
  }
}

function validateFilter(
  owner: string,
  field: 'when' | 'enabledWhen' | 'verify',
  value: unknown,
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GraphValidationError(
      `${owner}: ${field} must be a filter object over projected state.`,
    );
  }
  if (Object.keys(value).length === 0) {
    throw new GraphValidationError(
      `${owner} has an empty ${field} {} — footprint's evaluator deliberately NEVER matches an empty ` +
        `filter (anti-vacuous-truth). Omit '${field}' entirely instead.`,
    );
  }
  validateGuardShape(`${owner} ${field}`, value as Record<string, unknown>);
}

function validateStringList(
  owner: string,
  field: 'writes' | 'reads',
  value: unknown,
): void {
  if (
    value !== undefined &&
    (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
  ) {
    throw new GraphValidationError(
      `${owner}: ${field} must be an array of state-key strings.`,
    );
  }
}

function validatePlainPolicy(
  owner: string,
  field: 'freshness' | 'concurrency',
  value: unknown,
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GraphValidationError(
      `${owner}: ${field} must be a policy object.`,
    );
  }
}

/**
 * Snapshot a caller-owned contract once, rejecting accessor/non-enumerable
 * fields before any value can be re-read during validation and freezing.
 */
function snapshotActionDefinitionContract(
  definitionId: string,
  contract: unknown,
): ActionDefinitionContract {
  if (
    contract === null ||
    typeof contract !== 'object' ||
    Array.isArray(contract)
  ) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') needs a contract record.`,
    );
  }
  const prototype = Object.getPrototypeOf(contract);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new GraphValidationError(
      `action definition '${definitionId}' contract must be a plain authored object.`,
    );
  }

  const fields: Array<readonly [PropertyKey, unknown]> = [];
  for (const field of Reflect.ownKeys(contract)) {
    const descriptor = Object.getOwnPropertyDescriptor(contract, field);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !('value' in descriptor)
    ) {
      throw new GraphValidationError(
        `action definition '${definitionId}' contract field '${String(field)}' must be an enumerable data property.`,
      );
    }
    if (field === 'binding') {
      throw new GraphValidationError(
        `action definition '${definitionId}' declares a live-site 'binding'. A callable definition describes what the action does; ` +
          `connectAction()/attach() own where each live binding exists. Remove 'binding' from the definition contract.`,
      );
    }
    if (field === 'input') {
      throw new GraphValidationError(
        `action definition '${definitionId}' declares 'input'. Callable action definitions use 'inputSchema' for the payload contract; ` +
          `connectAction()/useActionBinding() use 'input' for the live invocation-time value reader.`,
      );
    }
    if (typeof field !== 'string' || !ACTION_CONTRACT_FIELDS.has(field)) {
      throw new GraphValidationError(
        `action definition '${definitionId}' declares unknown contract field '${String(field)}'.`,
      );
    }
    fields.push([field, descriptor.value]);
  }

  const copy = Object.create(null) as Record<PropertyKey, unknown>;
  for (const [field, value] of fields) {
    Object.defineProperty(copy, field, {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  Object.freeze(copy);

  if (typeof copy.does !== 'string' || copy.does.trim().length === 0) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') needs a non-empty authored 'does' sentence.`,
    );
  }
  return copy as unknown as ActionDefinitionContract;
}

/**
 * Detach declaration-shaped containers before validating them, so validation
 * and branding see the same bytes. Input validators/schemas and functions are
 * deliberately opaque and keep their application identity.
 */
function freezeContract(
  contract: ActionDefinitionContract,
): ReadonlyActionDefinitionContract {
  const copy: ActionDefinitionContract = {
    ...contract,
    ...(contract.when !== undefined
      ? { when: freezePlainDeclaration(contract.when) }
      : {}),
    ...(contract.enabledWhen !== undefined
      ? { enabledWhen: freezePlainDeclaration(contract.enabledWhen) }
      : {}),
    ...(contract.blockedBecause !== undefined &&
    typeof contract.blockedBecause !== 'function'
      ? { blockedBecause: freezePlainDeclaration(contract.blockedBecause) }
      : {}),
    ...(contract.writes !== undefined
      ? { writes: freezePlainDeclaration(contract.writes) }
      : {}),
    ...(contract.reads !== undefined
      ? { reads: freezePlainDeclaration(contract.reads) }
      : {}),
    ...(contract.principalPolicy !== undefined
      ? {
          principalPolicy: freezePlainDeclaration(contract.principalPolicy),
        }
      : {}),
    ...(contract.humanDecides !== undefined
      ? { humanDecides: freezePlainDeclaration(contract.humanDecides) }
      : {}),
    ...(contract.verify !== undefined && typeof contract.verify !== 'function'
      ? { verify: freezePlainDeclaration(contract.verify) }
      : {}),
    ...(contract.freshness !== undefined
      ? { freshness: freezePlainDeclaration(contract.freshness) }
      : {}),
    ...(contract.concurrency !== undefined
      ? { concurrency: freezePlainDeclaration(contract.concurrency) }
      : {}),
  };
  return Object.freeze(copy) as ReadonlyActionDefinitionContract;
}

/**
 * Clone/freeze declaration-shaped arrays and plain records. Opaque validators,
 * class instances, and functions remain application-owned by reference.
 */
function clonePlain<T>(value: T, seen: WeakMap<object, unknown>): T {
  if (typeof value !== 'object' || value === null) return value;
  const prior = seen.get(value);
  if (prior !== undefined) return prior as T;

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const entry of value) copy.push(clonePlain(entry, seen));
    return Object.freeze(copy) as T;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, entry] of Object.entries(value)) {
    copy[key] = clonePlain(entry, seen);
  }
  return Object.freeze(copy) as T;
}

function freezePlainDeclaration<T>(value: T): T {
  return clonePlain(value, new WeakMap<object, unknown>());
}
