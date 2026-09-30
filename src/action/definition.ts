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
  validateObservability,
  validatePrincipalPolicy,
} from '../graph/guards.js';
import { takesNoInput } from '../traverse/expects.js';
import type {
  ActionDefinitionContract,
  ActionDefinitionRecord,
  ActionGuardContract,
  ActionInvocationMode,
  ActionLifecycle,
  ActionProgressDeclaration,
  ActionSettleContract,
  DefinedAction,
  ReadonlyActionDefinitionContract,
} from './types.js';

// The grouped 2.0 record has a different byte shape from the pre-release v1
// draft, so its Symbol.for key is versioned independently. Cross-copy readers
// may share v2 records; they never reinterpret a v1 record as v2.
const ACTION_DEFINITION = Symbol.for('hcifootprint.action-definition.v2');
// Cross-copy recognition must not re-run application-owned validators. This
// frozen attestation says the record passed this brand version's authoring laws
// when it was created; like the public brand, it is a capability marker rather
// than a security boundary.
const ACTION_DEFINITION_VALIDATED = Symbol.for(
  'hcifootprint.action-definition.validated.v2',
);

/** The complete v2 callable-definition vocabulary. */
const ACTION_CONTRACT_FIELD_LIST = [
  'does',
  'invocation',
  'inputSchema',
  'guard',
  'settle',
  'principal',
  'needs',
  'produces',
  'role',
] as const satisfies readonly (keyof ActionDefinitionContract)[];
const ACTION_CONTRACT_FIELDS = new Set<PropertyKey>(ACTION_CONTRACT_FIELD_LIST);

const ACTION_OPTION_FIELDS = new Set([...ACTION_CONTRACT_FIELDS, 'mutate']);
const GUARD_FIELDS = new Set<keyof ActionGuardContract>([
  'when',
  'enabledWhen',
  'blockedBecause',
]);
const SETTLE_FIELDS = new Set<keyof ActionSettleContract>([
  'writes',
  'reads',
  'goTo',
  'verify',
  'observability',
  'progress',
  'evidence',
  'onReturn',
]);
const EVIDENCE_FIELDS = new Set(['kind']);
const PRINCIPAL_FIELDS = new Set([
  'mayInvoke',
  'decisionOwner',
  'requiresHumanApproval',
]);
const PROGRESS_FIELDS = new Set<keyof ActionProgressDeclaration>([
  'stages',
  'required',
]);

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
  } satisfies Record<NonNullable<ActionDefinitionContract['role']>, true>),
);

function isRecord(value: unknown): value is ActionDefinitionRecord {
  if (typeof value !== 'object' || value === null) return false;
  try {
    const candidate = value as Partial<ActionDefinitionRecord> &
      Record<symbol, unknown>;
    if (
      !(
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
      )
    ) {
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
 * @param options The grouped declaration and its exact application `mutate`
 * callable. The callable is not copied into the branded contract.
 */
/** @inline */
type DefinitionBaseOptions = Omit<
  ActionDefinitionContract,
  'invocation' | 'inputSchema' | 'settle'
>;
/** @inline */
type SettleWithoutProgress<Output = any> = ActionSettleContract<
  readonly string[],
  Output
> & {
  readonly progress?: never;
};
/** @inline */
type SettleWithProgress<Stages extends readonly string[], Output = any> = Omit<
  ActionSettleContract<readonly string[], Output>,
  'progress'
> & {
  readonly progress: ActionProgressDeclaration<Stages>;
};
/** @inline */
type HostSettle = SettleWithoutProgress & { readonly onReturn?: never };
/** @inline */
type NoReceiver<F extends (...args: any[]) => any> =
  unknown extends ThisParameterType<F> ? F : never;
/** @inline */
type InputlessMutation<F extends (...args: any[]) => any> =
  Parameters<F> extends [] ? NoReceiver<F> : never;
/** @inline */
type ScalarMutation<F extends (...args: any[]) => any> =
  Parameters<F> extends []
    ? never
    : Parameters<F> extends [unknown]
      ? NoReceiver<F>
      : never;
/** @inline */
type ScalarProgressMutation<
  F extends (...args: any[]) => any,
  Input,
  Output,
  Id extends string,
  Stage extends string,
> = F &
  NoReceiver<F> &
  ((input: Input, lifecycle?: ActionLifecycle<Id, Stage>) => Output) &
  (Parameters<F> extends [unknown] | [unknown, unknown?] ? unknown : never);

/**
 * The complete options record accepted by one `defineAction()` overload.
 * `Mode` selects the invocation door and `HasProgress` selects whether the
 * mutation receives the narrow lifecycle capability.
 */
export type DefineActionOptions<
  Mode extends ActionInvocationMode,
  HasProgress extends boolean,
  F extends (...args: any[]) => any,
  Id extends string = string,
  Stages extends readonly string[] = readonly string[],
  Input = unknown,
  Output = ReturnType<F>,
> = DefinitionBaseOptions &
  (Mode extends 'inputless'
    ? HasProgress extends true
      ? {
          readonly invocation: 'inputless';
          readonly inputSchema?: 'none';
          readonly settle: SettleWithProgress<Stages, Awaited<Output>>;
          readonly mutate: (
            lifecycle?: ActionLifecycle<Id, Stages[number]>,
          ) => Output;
        }
      : {
          readonly invocation: 'inputless';
          readonly inputSchema?: 'none';
          readonly settle?: SettleWithoutProgress<Awaited<ReturnType<F>>>;
          readonly mutate: F & InputlessMutation<F>;
        }
    : Mode extends 'scalar'
      ? HasProgress extends true
        ? {
            readonly invocation: 'scalar';
            readonly inputSchema?: object;
            readonly settle: SettleWithProgress<Stages, Awaited<Output>>;
            readonly mutate: ScalarProgressMutation<
              F,
              Input,
              Output,
              Id,
              Stages[number]
            >;
          }
        : {
            readonly invocation: 'scalar';
            readonly inputSchema?: object;
            readonly settle?: SettleWithoutProgress<Awaited<ReturnType<F>>>;
            readonly mutate: F & ScalarMutation<F>;
          }
      : Mode extends 'host'
        ? HasProgress extends true
          ? never
          : {
              readonly invocation: 'host';
              readonly inputSchema?: never;
              readonly settle?: HostSettle;
              readonly mutate: F;
            }
        : never);

export function defineAction<
  const Id extends string,
  const Stages extends readonly string[],
  Output,
>(
  definitionId: Id,
  options: DefineActionOptions<'inputless', true, () => Output, Id, Stages>,
): DefinedAction<() => Output, Id, 'inputless'>;
export function defineAction<
  const Id extends string,
  const Stages extends readonly string[],
  Input,
  Output,
  F extends (
    input: Input,
    lifecycle?: ActionLifecycle<Id, Stages[number]>,
  ) => Output,
>(
  definitionId: Id,
  options: DefineActionOptions<'scalar', true, F, Id, Stages, Input, Output>,
): DefinedAction<(input: Parameters<F>[0]) => ReturnType<F>, Id, 'scalar'>;
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  options: DefineActionOptions<'inputless', false, F, Id>,
): DefinedAction<F, Id, 'inputless'>;
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  options: DefineActionOptions<'scalar', false, F, Id>,
): DefinedAction<F, Id, 'scalar'>;
export function defineAction<
  const Id extends string,
  F extends (...args: any[]) => any,
>(
  definitionId: Id,
  options: DefineActionOptions<'host', false, F, Id>,
): DefinedAction<F, Id, 'host'>;
export function defineAction(
  definitionId: string,
  options: ActionDefinitionContract & {
    readonly mutate: (...args: any[]) => any;
  },
): DefinedAction<(...args: any[]) => any, string, ActionInvocationMode> {
  if (typeof definitionId !== 'string' || definitionId.trim().length === 0) {
    throw new TypeError(
      'hcifootprint: defineAction() needs a non-empty definition id.',
    );
  }
  if (arguments.length !== 2) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') takes exactly two arguments: the id and an options record containing mutate.`,
    );
  }
  const captured = snapshotActionDefinitionOptions(definitionId, options);
  const { mutate } = captured;
  if (isDefinedAction(mutate)) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') received a function that is already an action definition — reuse it instead of creating two identities.`,
    );
  }
  const capturedContract = captured.contract;
  const frozenContract = freezeContract(capturedContract);
  const hasProgress = frozenContract.settle?.progress !== undefined;
  if (
    frozenContract.invocation === 'inputless' &&
    mutate.length > (hasProgress ? 1 : 0)
  ) {
    throw new GraphValidationError(
      `action definition '${definitionId}' declares invocation: 'inputless', but mutate exposes ${mutate.length} positional slot(s). ${hasProgress ? 'Only the optional lifecycle slot is supported.' : 'Declare settle.progress for an optional lifecycle slot, or scalar/host invocation for application input.'}`,
    );
  }
  if (
    frozenContract.invocation === 'scalar' &&
    mutate.length > (hasProgress ? 2 : 1)
  ) {
    throw new GraphValidationError(
      `action definition '${definitionId}' declares invocation: 'scalar', but mutate exposes ${mutate.length} positional slots. Scalar actions accept one payload${hasProgress ? ' plus the optional lifecycle' : ''}; declare host invocation for listener-shaped functions.`,
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
    return Reflect.apply(mutate, this, args);
  };

  // Function `name` and `length` are configurable on ordinary functions. Keep
  // the debugger/stack and arity signals the implementation already carried.
  Object.defineProperty(callable, 'name', {
    value: mutate.name,
    configurable: true,
  });
  Object.defineProperty(callable, 'length', {
    value: mutate.length,
    configurable: true,
  });
  Object.defineProperty(callable, ACTION_DEFINITION, {
    value: definition,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return callable as DefinedAction<
    (...args: any[]) => any,
    string,
    ActionInvocationMode
  >;
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

  if (typeof contract.does !== 'string' || contract.does.trim().length === 0) {
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

  const guard = contract.guard;
  validateNonEmptyGroup(owner, 'guard', guard);
  if (guard?.when !== undefined) {
    validateFilter(owner, 'guard.when', guard.when);
  }
  if (guard?.enabledWhen !== undefined) {
    validateFilter(owner, 'guard.enabledWhen', guard.enabledWhen);
  }
  if (
    guard?.blockedBecause !== undefined &&
    typeof guard.blockedBecause !== 'function'
  ) {
    validateBlockedBecause(owner, guard.blockedBecause);
  }

  const settle = contract.settle;
  validateNonEmptyGroup(owner, 'settle', settle);
  if (settle?.verify !== undefined && typeof settle.verify !== 'function') {
    validateFilter(owner, 'settle.verify', settle.verify);
  }
  validateStringList(owner, 'settle.writes', settle?.writes);
  validateStringList(owner, 'settle.reads', settle?.reads);
  validateProgressDeclaration(owner, settle?.progress, contract.invocation);
  validateEvidenceDeclaration(owner, settle?.evidence);
  validateOnReturn(owner, settle?.onReturn, contract.invocation);
  validateChannelDeclarations(owner, contract.needs, contract.produces);

  if (
    settle?.goTo !== undefined &&
    (typeof settle.goTo !== 'string' || settle.goTo.trim().length === 0)
  ) {
    throw new GraphValidationError(
      `${owner}: settle.goTo must be a non-empty page id string.`,
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
  if (contract.principal !== undefined) {
    validateNonEmptyGroup(owner, 'principal', contract.principal);
    validatePrincipalPolicy(owner, contract.principal);
  }
  if (settle?.observability !== undefined) {
    validateObservability(owner, settle.observability, {
      verify: settle.verify !== undefined,
      destination: settle.goTo !== undefined,
    });
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

function validateNonEmptyGroup(
  owner: string,
  field: 'guard' | 'settle' | 'principal',
  value: unknown,
): void {
  if (value === undefined) return;
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).every(
      (key) => (value as Record<string, unknown>)[key] === undefined,
    )
  ) {
    throw new GraphValidationError(
      `${owner}: ${field} must declare at least one clause; omit the group when it has none.`,
    );
  }
}

function validateProgressDeclaration(
  owner: string,
  progress: ActionProgressDeclaration | undefined,
  invocation: ActionInvocationMode,
): void {
  if (progress === undefined) return;
  if (
    typeof progress !== 'object' ||
    progress === null ||
    Array.isArray(progress) ||
    !isPlainRecord(progress)
  ) {
    throw new GraphValidationError(
      `${owner}: settle.progress must be a plain { stages, required? } declaration.`,
    );
  }
  for (const key of Reflect.ownKeys(progress)) {
    if (key !== 'stages' && key !== 'required') {
      throw new GraphValidationError(
        `${owner}: settle.progress declares unknown field '${String(key)}'.`,
      );
    }
  }
  if (
    !Array.isArray(progress.stages) ||
    progress.stages.length === 0 ||
    progress.stages.some(
      (stage) => typeof stage !== 'string' || stage.trim().length === 0,
    )
  ) {
    throw new GraphValidationError(
      `${owner}: settle.progress.stages must be a non-empty array of non-empty stage strings.`,
    );
  }
  if (new Set(progress.stages).size !== progress.stages.length) {
    throw new GraphValidationError(
      `${owner}: settle.progress.stages must be unique; one stage identity may be declared only once.`,
    );
  }
  if (
    progress.required !== undefined &&
    typeof progress.required !== 'boolean'
  ) {
    throw new GraphValidationError(
      `${owner}: settle.progress.required must be true or false when supplied.`,
    );
  }
  if (invocation === 'host') {
    throw new GraphValidationError(
      `${owner}: host invocation cannot declare settle.progress because an exact host continuation has no lifecycle parameter. Use scalar/inputless mutation or report the host occurrence without progress.`,
    );
  }
}

function validateFilter(
  owner: string,
  field: 'guard.when' | 'guard.enabledWhen' | 'settle.verify',
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
  field: 'settle.writes' | 'settle.reads',
  value: unknown,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new GraphValidationError(
      `${owner}: ${field} must be a non-empty array of unique, non-blank state-key strings.`,
    );
  }
  if (
    value.length === 0 ||
    value.some(
      (entry) => typeof entry !== 'string' || entry.trim().length === 0,
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new GraphValidationError(
      `${owner}: ${field} must be a non-empty array of unique, non-blank state-key strings.`,
    );
  }
}

function validateOnReturn(
  owner: string,
  onReturn: unknown,
  invocation: ActionInvocationMode,
): void {
  if (onReturn === undefined) return;
  if (typeof onReturn !== 'function') {
    throw new GraphValidationError(
      `${owner}: settle.onReturn must be a function (outcome) => settlement | undefined.`,
    );
  }
  if (invocation === 'host') {
    throw new GraphValidationError(
      `${owner}: host invocation cannot declare settle.onReturn — a host continuation runs the listener, not mutate, so there is no definition-owned return to judge. Settle it from onInvocation instead.`,
    );
  }
}

function validateEvidenceDeclaration(owner: string, evidence: unknown): void {
  if (evidence === undefined) return;
  if (
    typeof evidence !== 'object' ||
    evidence === null ||
    Array.isArray(evidence) ||
    !isPlainRecord(evidence)
  ) {
    throw new GraphValidationError(
      `${owner}: settle.evidence must be a plain { kind } declaration.`,
    );
  }
  for (const key of Reflect.ownKeys(evidence)) {
    if (!EVIDENCE_FIELDS.has(key as string)) {
      throw new GraphValidationError(
        `${owner}: settle.evidence declares unknown field '${String(key)}'. It names the governed kind only — the schema lives on the kind, in the catalog.`,
      );
    }
  }
  const kind = (evidence as { readonly kind?: unknown }).kind;
  if (typeof kind !== 'string' || kind.trim().length === 0) {
    throw new GraphValidationError(
      `${owner}: settle.evidence.kind must be a non-empty kind string.`,
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
      validateChannelDeclaration(owner, `needs.${name}`, declaration, true);
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
  const allowed = new Set(
    allowFrom ? ['kind', 'schema', 'from'] : ['kind', 'schema'],
  );
  for (const key of Reflect.ownKeys(declaration)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      throw new GraphValidationError(
        `${owner}: ${field} declares unknown field '${String(key)}'.`,
      );
    }
  }
  const candidate = declaration as { kind?: unknown; from?: unknown };
  if (
    typeof candidate.kind !== 'string' ||
    candidate.kind.trim().length === 0
  ) {
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

/**
 * Snapshot caller-owned options once. No authored accessor is executed, and
 * mutate is deliberately separated before the branded contract is minted.
 */
function snapshotActionDefinitionOptions(
  definitionId: string,
  options: unknown,
): {
  readonly contract: ActionDefinitionContract;
  readonly mutate: (...args: any[]) => any;
} {
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') needs an options record containing mutate.`,
    );
  }
  const owner = `action definition '${definitionId}' options`;
  const captured = captureAuthoredRecord(owner, options, ACTION_OPTION_FIELDS);
  for (const field of Reflect.ownKeys(captured)) {
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
  }
  const authoredMutate = captured.mutate;
  if (typeof authoredMutate !== 'function') {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') needs options.mutate to be a function.`,
    );
  }
  const mutate = authoredMutate as (...args: any[]) => any;
  const contract = Object.create(null) as Record<string, unknown>;
  for (const field of ACTION_CONTRACT_FIELD_LIST) {
    if (!Object.hasOwn(captured, field)) continue;
    Object.defineProperty(contract, field, {
      value: captured[field],
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  Object.freeze(contract);

  if (typeof contract.does !== 'string' || contract.does.trim().length === 0) {
    throw new TypeError(
      `hcifootprint: defineAction('${definitionId}') needs a non-empty authored 'does' sentence.`,
    );
  }
  return {
    contract: contract as unknown as ActionDefinitionContract,
    mutate,
  };
}

/**
 * Detach and freeze declaration containers before validation, so validation
 * and branding see the same bytes. Predicates, readers, and schemas remain
 * application-owned capabilities and retain exact identity.
 */
function freezeContract(
  contract: ActionDefinitionContract,
): ReadonlyActionDefinitionContract {
  const owner = 'action definition contract';
  const copy = Object.create(null) as Record<string, unknown>;
  for (const field of ACTION_CONTRACT_FIELD_LIST) {
    if (!Object.hasOwn(contract, field)) continue;
    let value: unknown = contract[field];
    if (field === 'guard' && value !== undefined) {
      value = freezeGuard(value, `${owner}.guard`);
    } else if (field === 'settle' && value !== undefined) {
      value = freezeSettle(value, `${owner}.settle`);
    } else if (field === 'principal' && value !== undefined) {
      value = freezePrincipal(value, `${owner}.principal`);
    } else if (field === 'needs' && value !== undefined) {
      value = freezeNeeds(value, `${owner}.needs`);
    } else if (field === 'produces' && value !== undefined) {
      value = freezeChannelDeclaration(value, `${owner}.produces`, false);
    }
    if (
      field === 'inputSchema' &&
      value !== undefined &&
      !isOpaqueInputValidator(value)
    ) {
      value = freezeAuthoredTree(value, `${owner}.inputSchema`);
    }
    Object.defineProperty(copy, field, {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(copy) as ReadonlyActionDefinitionContract;
}

function freezeGuard(value: unknown, owner: string): ActionGuardContract {
  const captured = captureAuthoredRecord(owner, value, GUARD_FIELDS);
  const copy: Record<string, unknown> = {};
  for (const field of GUARD_FIELDS) {
    if (!Object.hasOwn(captured, field)) continue;
    const authored = captured[field];
    const frozen =
      field === 'blockedBecause' && typeof authored === 'function'
        ? authored
        : field === 'blockedBecause'
          ? freezeBlockedBecause(authored, `${owner}.${field}`)
          : freezeAuthoredTree(authored, `${owner}.${field}`);
    defineFrozenField(copy, field, frozen);
  }
  return Object.freeze(copy) as unknown as ActionGuardContract;
}

function freezeBlockedBecause(value: unknown, owner: string): unknown {
  const captured = captureAuthoredRecord(
    owner,
    value,
    new Set(['says', 'clearedBy']),
  );
  const copy: Record<string, unknown> = {};
  for (const field of ['says', 'clearedBy'] as const) {
    if (Object.hasOwn(captured, field)) {
      defineFrozenField(copy, field, captured[field]);
    }
  }
  return Object.freeze(copy);
}

function freezeSettle(value: unknown, owner: string): ActionSettleContract {
  const captured = captureAuthoredRecord(owner, value, SETTLE_FIELDS);
  const copy: Record<string, unknown> = {};
  for (const field of SETTLE_FIELDS) {
    if (!Object.hasOwn(captured, field)) continue;
    const authored = captured[field];
    let frozen = authored;
    if (
      (field === 'verify' || field === 'onReturn') &&
      typeof authored === 'function'
    ) {
      frozen = authored;
    } else if (field === 'progress' && authored !== undefined) {
      const progress = captureAuthoredRecord(
        `${owner}.progress`,
        authored,
        PROGRESS_FIELDS,
      );
      const progressCopy: Record<string, unknown> = {};
      for (const progressField of PROGRESS_FIELDS) {
        if (!Object.hasOwn(progress, progressField)) continue;
        defineFrozenField(
          progressCopy,
          progressField,
          freezeAuthoredTree(
            progress[progressField],
            `${owner}.progress.${progressField}`,
          ),
        );
      }
      frozen = Object.freeze(progressCopy);
    } else if (field === 'writes' || field === 'reads' || field === 'verify') {
      frozen = freezeAuthoredTree(authored, `${owner}.${field}`);
    } else if (field === 'evidence' && authored !== undefined) {
      frozen = captureAuthoredRecord(
        `${owner}.evidence`,
        authored,
        EVIDENCE_FIELDS,
      );
    }
    defineFrozenField(copy, field, frozen);
  }
  return Object.freeze(copy) as unknown as ActionSettleContract;
}

function freezePrincipal(
  value: unknown,
  owner: string,
): ActionDefinitionContract['principal'] {
  const captured = captureAuthoredRecord(owner, value, PRINCIPAL_FIELDS);
  const copy: Record<string, unknown> = {};
  for (const field of PRINCIPAL_FIELDS) {
    if (!Object.hasOwn(captured, field)) continue;
    defineFrozenField(
      copy,
      field,
      field === 'mayInvoke'
        ? freezeAuthoredTree(captured[field], `${owner}.${field}`)
        : captured[field],
    );
  }
  return Object.freeze(
    copy,
  ) as unknown as ActionDefinitionContract['principal'];
}

function freezeNeeds(
  value: unknown,
  owner: string,
): ActionDefinitionContract['needs'] {
  const captured = captureAuthoredRecord(owner, value);
  const copy: Record<string, unknown> = {};
  for (const name of Object.keys(captured)) {
    defineFrozenField(
      copy,
      name,
      freezeChannelDeclaration(captured[name], `${owner}.${name}`, true),
    );
  }
  return Object.freeze(copy) as ActionDefinitionContract['needs'];
}

function freezeChannelDeclaration(
  value: unknown,
  owner: string,
  allowFrom: boolean,
): ActionDefinitionContract['produces'] {
  const fields = new Set(
    allowFrom ? ['kind', 'schema', 'from'] : ['kind', 'schema'],
  );
  const captured = captureAuthoredRecord(owner, value, fields);
  const copy: Record<string, unknown> = {};
  for (const field of fields) {
    if (!Object.hasOwn(captured, field)) continue;
    // A channel schema is also an application-owned schema capability. Freeze
    // the declaration around it, never the schema itself.
    defineFrozenField(copy, field, captured[field]);
  }
  return Object.freeze(copy) as ActionDefinitionContract['produces'];
}

function isOpaqueInputValidator(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const validator = value as { safeParse?: unknown; parse?: unknown };
  return (
    typeof validator.safeParse === 'function' ||
    typeof validator.parse === 'function'
  );
}

function captureAuthoredRecord(
  owner: string,
  value: unknown,
  allowed?: ReadonlySet<PropertyKey>,
): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !isPlainRecord(value)
  ) {
    throw new GraphValidationError(`${owner} must be a plain authored object.`);
  }
  const copy: Record<string, unknown> = {};
  for (const field of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !('value' in descriptor)
    ) {
      throw new GraphValidationError(
        `${owner} field '${String(field)}' must be an enumerable data property.`,
      );
    }
    if (
      typeof field !== 'string' ||
      (allowed !== undefined && !allowed.has(field))
    ) {
      throw new GraphValidationError(
        `${owner} declares unknown field '${String(field)}'.`,
      );
    }
    defineFrozenField(copy, field, descriptor.value);
  }
  return Object.freeze(copy);
}

function freezeAuthoredTree<T>(
  value: T,
  owner: string,
  seen = new WeakMap<object, unknown>(),
): T {
  if (typeof value !== 'object' || value === null) return value;
  const prior = seen.get(value);
  if (prior !== undefined) return prior as T;
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !('value' in descriptor)) {
        throw new GraphValidationError(
          `${owner}[${index}] must be a data element; sparse/accessor arrays are not authored declarations.`,
        );
      }
      copy.push(
        freezeAuthoredTree(descriptor.value, `${owner}[${index}]`, seen),
      );
    }
    for (const key of Reflect.ownKeys(value)) {
      if (
        key === 'length' ||
        (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key))
      ) {
        continue;
      }
      throw new GraphValidationError(
        `${owner} array declares unknown field '${String(key)}'.`,
      );
    }
    return Object.freeze(copy) as T;
  }
  if (!isPlainRecord(value)) return value;
  const captured = captureAuthoredRecord(owner, value);
  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const key of Object.keys(captured)) {
    defineFrozenField(
      copy,
      key,
      freezeAuthoredTree(captured[key], `${owner}.${key}`, seen),
    );
  }
  return Object.freeze(copy) as T;
}

function defineFrozenField(
  target: Record<string, unknown>,
  field: string,
  value: unknown,
): void {
  Object.defineProperty(target, field, {
    value,
    enumerable: true,
    configurable: false,
    writable: false,
  });
}
