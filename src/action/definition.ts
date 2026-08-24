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
  ActionInvocationMode,
  DefinedAction,
  ReadonlyActionDefinitionContract,
} from './types.js';

// This is the first public branded-record shape. It names the definition-side
// payload contract `inputSchema`; the pre-public branch had no consumers whose
// bytes need a compatibility reader.
const ACTION_DEFINITION = Symbol.for('hcifootprint.action-definition.v1');
// Cross-copy recognition must not re-run application-owned validators. This
// frozen attestation says the record passed this brand version's authoring laws
// when it was created; like the public brand, it is a capability marker rather
// than a security boundary.
const ACTION_DEFINITION_VALIDATED = Symbol.for(
  'hcifootprint.action-definition.validated.v1',
);

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
    invocation: true,
    needs: true,
    produces: true,
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
    const candidate = value as Partial<ActionDefinitionRecord> &
      Record<symbol, unknown>;
    if (!(
      Object.isFrozen(value) &&
      candidate[ACTION_DEFINITION_VALIDATED] === true &&
      typeof candidate.ref === 'object' &&
      candidate.ref !== null &&
      Object.isFrozen(candidate.ref) &&
      typeof candidate.contract === 'object' &&
      candidate.contract !== null &&
      Object.isFrozen(candidate.contract) &&
      candidate.ref?.kind === 'action-definition' &&
      typeof candidate.ref.definitionId === 'string' &&
      candidate.ref.definitionId.trim().length > 0 &&
      typeof candidate.contract?.does === 'string' &&
      candidate.contract.does.trim().length > 0 &&
      (candidate.contract.invocation === 'inputless' ||
        candidate.contract.invocation === 'scalar' ||
        candidate.contract.invocation === 'host')
    )) {
      return false;
    }
    // Recheck every immutable authored law so an attestation marker cannot
    // bless malformed bytes. The only excluded check is recognition of the
    // application-owned validator method itself: that capability is captured
    // and validated when a binding connects, and may mutate afterward without
    // erasing the definition's identity.
    validateActionDefinitionContract(
      candidate.ref.definitionId,
      candidate.contract as ActionDefinitionContract,
      { validateInputSchemaShape: false },
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
  Mode extends ActionInvocationMode,
>(value: DefinedAction<F, Id, Mode>): ActionDefinitionRecord<Id, Mode>;
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
 *
 * @param definitionId Stable capability name inside a runtime generation.
 * @param contract Must explicitly declare `invocation`: `inputless` permits
 * only `inputSchema: 'none'`, `scalar` accepts an object input schema, and
 * `host` forbids a broker input schema.
 * @param implementation Exact application callable; direct JavaScript behavior
 * is preserved.
 * @param invalidArity Type-only compile-time arity guard; callers never supply
 * this argument.
 */
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  contract: Omit<ActionDefinitionContract, 'invocation' | 'inputSchema'> & {
    readonly invocation: 'inputless';
    readonly inputSchema?: 'none';
  },
  implementation: F,
  ...invalidArity: unknown extends ThisParameterType<F>
    ? Parameters<F> extends []
      ? []
      : [never]
    : [never]
): DefinedAction<F, Id, 'inputless'>;
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  contract: Omit<ActionDefinitionContract, 'invocation' | 'inputSchema'> & {
    readonly invocation: 'scalar';
    readonly inputSchema?: object;
  },
  implementation: F,
  ...invalidArity: unknown extends ThisParameterType<F>
    ? Parameters<F> extends []
      ? [never]
      : Parameters<F> extends [unknown] | [unknown?]
        ? []
        : [never]
    : [never]
): DefinedAction<F, Id, 'scalar'>;
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  contract: Omit<ActionDefinitionContract, 'invocation' | 'inputSchema'> & {
    readonly invocation: 'host';
    readonly inputSchema?: never;
  },
  implementation: F,
): DefinedAction<F, Id, 'host'>;
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  contract: ActionDefinitionContract,
  implementation: F,
): DefinedAction<F, Id, ActionInvocationMode> {
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
  if (frozenContract.invocation === 'inputless' && implementation.length > 0) {
    throw new GraphValidationError(
      `action definition '${definitionId}' declares invocation: 'inputless', but its implementation exposes ${implementation.length} positional input slot(s). Declare scalar or host invocation instead.`,
    );
  }
  if (frozenContract.invocation === 'scalar' && implementation.length > 1) {
    throw new GraphValidationError(
      `action definition '${definitionId}' declares invocation: 'scalar', but its implementation exposes ${implementation.length} positional input slots. Scalar actions accept exactly one payload slot; declare host invocation for listener-shaped functions.`,
    );
  }
  validateActionDefinitionContract(
    definitionId,
    frozenContract as ActionDefinitionContract,
  );

  const ref = Object.freeze({
    kind: 'action-definition' as const,
    definitionId,
  });
  const definitionRecord = { ref, contract: frozenContract };
  Object.defineProperty(definitionRecord, ACTION_DEFINITION_VALIDATED, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  const definition = Object.freeze(definitionRecord);

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

  return callable as DefinedAction<F, Id, ActionInvocationMode>;
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
  options: { readonly validateInputSchemaShape?: boolean } = {},
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

  if (
    contract.invocation !== 'inputless' &&
    contract.invocation !== 'scalar' &&
    contract.invocation !== 'host'
  ) {
    throw new GraphValidationError(
      `${owner}: invocation must be inputless, scalar, or host.`,
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
  validateChannelDeclarations(owner, contract.needs, contract.produces);

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
    options.validateInputSchemaShape !== false &&
    contract.inputSchema !== undefined &&
    !takesNoInput(contract.inputSchema) &&
    detectSchema(contract.inputSchema) === 'none'
  ) {
    throw new GraphValidationError(
      `${owner} has an unrecognized input schema — pass a Zod schema, a JSON Schema object, ` +
        `a validator with .safeParse/.parse, or the string 'none' for an action that takes no input.`,
    );
  }
  if (
    contract.invocation === 'inputless' &&
    contract.inputSchema !== undefined &&
    !takesNoInput(contract.inputSchema)
  ) {
    throw new GraphValidationError(
      `${owner} declares inputless invocation with an input schema. Remove the schema or declare scalar invocation.`,
    );
  }
  if (
    contract.invocation === 'scalar' &&
    contract.inputSchema !== undefined &&
    takesNoInput(contract.inputSchema)
  ) {
    throw new GraphValidationError(
      `${owner} declares scalar invocation with inputSchema: 'none'. Declare an input schema or inputless invocation.`,
    );
  }
  if (contract.invocation === 'host' && contract.inputSchema !== undefined) {
    throw new GraphValidationError(
      `${owner} declares host invocation with an input schema. Host continuations preserve their own arguments and are not broker payload doors.`,
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

function validateChannelDeclarations(
  owner: string,
  needs: ActionDefinitionContract['needs'],
  produces: ActionDefinitionContract['produces'],
): void {
  if (needs !== undefined) {
    if (
      typeof needs !== 'object' ||
      needs === null ||
      Array.isArray(needs) ||
      !isPlainRecord(needs)
    ) {
      throw new GraphValidationError(
        `${owner}: needs must be a record of named kind declarations.`,
      );
    }
    const entries = Object.entries(needs);
    if (entries.length === 0) {
      throw new GraphValidationError(
        `${owner}: needs must name at least one input; omit it when the action needs none.`,
      );
    }
    for (const [name, declaration] of entries) {
      if (name.trim().length === 0) {
        throw new GraphValidationError(
          `${owner}: needs keys must be non-empty names.`,
        );
      }
      validateChannelDeclaration(
        owner,
        `needs.${name}`,
        declaration,
        true,
      );
    }
  }
  if (produces !== undefined) {
    validateChannelDeclaration(owner, 'produces', produces, false);
  }
}

function validateChannelDeclaration(
  owner: string,
  field: string,
  declaration: unknown,
  allowFrom: boolean,
): void {
  if (
    typeof declaration !== 'object' ||
    declaration === null ||
    Array.isArray(declaration) ||
    !isPlainRecord(declaration)
  ) {
    throw new GraphValidationError(
      `${owner}: ${field} must be a plain kind declaration.`,
    );
  }
  const allowed = new Set(allowFrom ? ['kind', 'schema', 'from'] : ['kind', 'schema']);
  for (const key of Reflect.ownKeys(declaration)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      throw new GraphValidationError(
        `${owner}: ${field} declares unknown field '${String(key)}'.`,
      );
    }
  }
  const candidate = declaration as { kind?: unknown; from?: unknown };
  if (typeof candidate.kind !== 'string' || candidate.kind.trim().length === 0) {
    throw new GraphValidationError(
      `${owner}: ${field}.kind must be a non-empty string.`,
    );
  }
  if (
    allowFrom &&
    candidate.from !== undefined &&
    (typeof candidate.from !== 'string' || candidate.from.trim().length === 0)
  ) {
    throw new GraphValidationError(
      `${owner}: ${field}.from must be a non-empty string when supplied.`,
    );
  }
}

function isPlainRecord(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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
    ...(contract.needs !== undefined
      ? { needs: freezePlainDeclaration(contract.needs) }
      : {}),
    ...(contract.produces !== undefined
      ? { produces: freezePlainDeclaration(contract.produces) }
      : {}),
    ...(contract.inputSchema !== undefined &&
    !isOpaqueInputValidator(contract.inputSchema)
      ? { inputSchema: freezePlainDeclaration(contract.inputSchema) }
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

function isOpaqueInputValidator(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const validator = value as { safeParse?: unknown; parse?: unknown };
  return (
    typeof validator.safeParse === 'function' ||
    typeof validator.parse === 'function'
  );
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
    Object.defineProperty(copy, key, {
      value: clonePlain(entry, seen),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(copy) as T;
}

function freezePlainDeclaration<T>(value: T): T {
  return clonePlain(value, new WeakMap<object, unknown>());
}
