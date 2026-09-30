/**
 * input-validation — one deliberate payload, validated before the handler.
 *
 * Owns ActionInputValidationError and the schema capture/resolve/validate
 * path: a schema is captured at declaration, resolved per runtime posture,
 * and a payload that fails is a structured refusal BEFORE application code
 * runs — never after it half-ran.
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
import { snapshotDeclaration } from './declarations.js';
import { takesNoInput } from '../traverse/expects.js';
import type { HumanReporting, ReadonlyActionDefinitionContract, ActionDefinitionRef, ActionLifecycle, ActionInputSource } from './types.js';
import type { BindingRegistration } from '../registry/registry.js';
import type { ActionInputSchemaAdapter, ActionInputSchemaContext, ActionInputValidationDisposition, ActionInputSchemaResult } from './types.js';

export class ActionInputValidationError extends TypeError {
  readonly code = 'ACTION_INPUT_INVALID' as const;
  readonly definition: ActionDefinitionRef;
  readonly binding: ActionBindingRef;
  readonly source: 'bound' | 'caller';
  readonly issuesDisposition: 'included' | 'redacted' | 'unavailable';
  readonly issues?: unknown;

  constructor(
    definition: ActionDefinitionRef,
    binding: ActionBindingRef,
    source: 'bound' | 'caller',
    issues: unknown,
  ) {
    super(
      `hcifootprint: input for action '${definition.definitionId}' does not satisfy inputSchema.`,
    );
    this.name = 'ActionInputValidationError';
    this.definition = definition;
    this.binding = binding;
    this.source = source;
    if (source === 'bound') {
      // A validator may echo the submitted value inside its diagnostics. Bound
      // payloads are deliberately private, so their details never cross this
      // error boundary.
      this.issuesDisposition = 'redacted';
    } else {
      try {
        this.issues = snapshotDeclaration(issues);
        this.issuesDisposition = 'included';
      } catch {
        // Diagnostics are instrumentation. A hostile getter must not replace
        // the stable validation refusal with an unrelated thrown value.
        this.issuesDisposition = 'unavailable';
      }
    }
    Object.freeze(this);
  }
}

export function captureInputValidationSchema(schema: unknown): unknown {
  if (schema === null || typeof schema !== 'object') return schema;
  const validator = schema as {
    safeParse?: unknown;
    parse?: unknown;
  };
  const safeParse = validator.safeParse;
  if (typeof safeParse === 'function') {
    return Object.freeze({ safeParse: safeParse.bind(schema) });
  }
  const parse = validator.parse;
  if (typeof parse === 'function') {
    return Object.freeze({ parse: parse.bind(schema) });
  }
  return schema;
}

export function resolveInputValidation(
  schema: unknown,
  inputSchemaAdapter: ActionInputSchemaAdapter | undefined,
): ActionInputValidationDisposition {
  if (schema === undefined) return 'not-declared';
  if (takesNoInput(schema) || isSelfValidatingSchema(schema)) return 'active';
  return inputSchemaAdapter?.supports(schema) === true
    ? 'active'
    : 'disclosure';
}

/** Gate a direct payload without replacing it with a parser transformation. */
export function validateActionInput(
  binding: ActionBindingRef,
  schema: unknown,
  hasInput: boolean,
  input: unknown,
  source: 'bound' | 'caller',
  inputSchemaAdapter: ActionInputSchemaAdapter | undefined,
  disposition: ActionInputValidationDisposition,
): void {
  if (schema === undefined) return;
  if (takesNoInput(schema)) {
    if (hasInput) {
      throw new ActionInputValidationError(
        binding.definition,
        binding,
        source,
        'inputSchema declares no input',
      );
    }
    return;
  }

  const verdict = schemaVerdict(
    schema,
    input,
    inputSchemaAdapter,
    disposition,
    Object.freeze({ definition: binding.definition, binding, source }),
  );
  if (verdict === SCHEMA_PASSED) return;
  throw new ActionInputValidationError(
    binding.definition,
    binding,
    source,
    verdict.issues,
  );
}

/** The one pass/fail answer every schema check in this module shares. */
const SCHEMA_PASSED = Symbol('schema-passed');

/**
 * Run one declared schema over one value — self-validating `.safeParse` /
 * `.parse`, else the runtime's adapter when active, else pass under
 * `disclosure`. Shared by the payload gate and the evidence gate so the two
 * can never disagree about what "satisfies a schema" means. Synchronous by
 * law: a thenable is an issue, and its rejection is silenced.
 */
function schemaVerdict(
  schema: unknown,
  value: unknown,
  inputSchemaAdapter: ActionInputSchemaAdapter | undefined,
  disposition: ActionInputValidationDisposition,
  context: ActionInputSchemaContext,
): typeof SCHEMA_PASSED | { readonly issues: unknown } {
  const validator = schema as {
    safeParse?: (value: unknown) => { success: boolean; error?: unknown };
    parse?: (value: unknown) => unknown;
  };
  let issues: unknown;
  try {
    if (typeof validator.safeParse === 'function') {
      const result = validator.safeParse(value);
      if (isThenable(result)) {
        silenceRejectedThenable(result);
        issues =
          'safeParse() must return synchronously, not a Promise/thenable';
      } else if (result?.success === true) {
        return SCHEMA_PASSED;
      } else {
        issues = result?.error ?? 'validator returned success: false';
      }
    } else if (typeof validator.parse === 'function') {
      const result = validator.parse(value);
      if (isThenable(result)) {
        silenceRejectedThenable(result);
        issues = 'parse() must return synchronously, not a Promise/thenable';
      } else {
        return SCHEMA_PASSED;
      }
    } else if (disposition === 'active' && inputSchemaAdapter !== undefined) {
      const checked = inputSchemaAdapter.validate(schema, value, context);
      if (isThenable(checked)) {
        silenceRejectedThenable(checked);
        issues =
          'inputSchemaAdapter.validate() must return synchronously, not a Promise/thenable';
      } else if (checked?.valid === true) {
        return SCHEMA_PASSED;
      } else if (checked?.valid === false) {
        issues = checked.issues;
      } else {
        issues = 'inputSchemaAdapter returned a malformed validation result';
      }
    } else if (disposition === 'disclosure') {
      return SCHEMA_PASSED;
    } else {
      issues = 'the declared schema has no active validation adapter';
    }
  } catch (error) {
    issues = error;
  }
  return { issues };
}

/**
 * Whether this runtime can enforce a governed kind's catalog schema over
 * verified evidence. Unlike a payload schema there is no `'none'` marker:
 * evidence always exists, so only a validator or an adapter makes it active.
 */
export function resolveEvidenceValidation(
  schema: unknown,
  inputSchemaAdapter: ActionInputSchemaAdapter | undefined,
): ActionInputValidationDisposition {
  if (schema === undefined) return 'not-declared';
  if (isSelfValidatingSchema(schema)) return 'active';
  return inputSchemaAdapter?.supports(schema) === true ? 'active' : 'disclosure';
}

/**
 * Build the settle-time evidence gate for one binding, or undefined when
 * there is nothing to enforce (no schema, or a disclosure-only one). The
 * returned check throws a teaching TypeError — the refused settle() call
 * does not consume the terminal, so a corrected value can still land.
 */
export function evidenceCheckFor(
  binding: ActionBindingRef,
  kind: string,
  schema: unknown,
  inputSchemaAdapter: ActionInputSchemaAdapter | undefined,
  disposition: ActionInputValidationDisposition,
): ((transitionId: string, evidence: unknown) => void) | undefined {
  if (disposition !== 'active') return undefined;
  const captured = captureInputValidationSchema(schema);
  const context: ActionInputSchemaContext = Object.freeze({
    definition: binding.definition,
    binding,
    source: 'evidence',
  });
  return (transitionId, evidence) => {
    const verdict = schemaVerdict(
      captured,
      evidence,
      inputSchemaAdapter,
      disposition,
      context,
    );
    if (verdict === SCHEMA_PASSED) return;
    throw new TypeError(
      `hcifootprint: transition '${transitionId}' cannot be verified — its evidence is not a valid '${kind}' (the catalog's schema for that kind refused it; the refusal is this error's cause). The effect is still unverified: settle again with evidence of that kind.`,
      { cause: verdict.issues },
    );
  };
}

export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === 'object' && value !== null) ||
      typeof value === 'function') &&
    typeof (value as { readonly then?: unknown }).then === 'function'
  );
}

/** Prevent an invalid async validator's rejection from escaping as a process-level event. */
export function silenceRejectedThenable(value: PromiseLike<unknown>): void {
  void Promise.resolve(value).catch(() => undefined);
}

export function isSelfValidatingSchema(schema: unknown): boolean {
  if (schema === null || typeof schema !== 'object') return false;
  const validator = schema as {
    safeParse?: unknown;
    parse?: unknown;
  };
  return (
    typeof validator.safeParse === 'function' ||
    typeof validator.parse === 'function'
  );
}

