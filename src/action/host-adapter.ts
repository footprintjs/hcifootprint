import type { Binding } from '../atom/types.js';
import { assertBindingCoverage } from './coverage.js';
import type { BindingCoverage } from './types.js';

/** Why a committed host did not resolve to one exact interactive target. */
export type ActionHostUnresolvedReason =
  | 'absent'
  | 'ambiguous'
  | 'unsupported';

/** The commit-time result returned by an adapter that found its target. */
export interface ResolvedActionHostTarget<
  Interactive extends object,
  ValueElement extends object = Interactive,
> {
  readonly kind: 'resolved';
  /** The element that actually receives the interaction, not necessarily the ref host. */
  readonly interactive: Interactive;
  /** The independently resolved focus/value owner, when the component has one. */
  readonly valueElement?: ValueElement;
}

/** An honest failure to find one exact interactive target. */
export interface UnresolvedActionHostTarget {
  readonly kind: 'unresolved';
  readonly reason: ActionHostUnresolvedReason;
}

/** What an adapter's commit-time resolver can substantiate. */
export type ActionHostTargetResolution<
  Interactive extends object,
  ValueElement extends object = Interactive,
> =
  | ResolvedActionHostTarget<Interactive, ValueElement>
  | UnresolvedActionHostTarget;

/**
 * The context explicit fact readers receive after one target has resolved.
 * It is ephemeral adapter state; connections retain only their projection.
 */
export interface ActionHostContext<
  Props,
  Host,
  Interactive extends object,
  ValueElement extends object = Interactive,
> {
  readonly props: Readonly<Props>;
  readonly host: Host;
  readonly interactive: Interactive;
  readonly valueElement: ValueElement | undefined;
}

/**
 * A framework-neutral component adapter.
 *
 * `composeInvocation` deliberately has no Host argument: a framework may call
 * it while rendering, before any ref has committed. `resolve` and all live fact
 * readers belong to the later host-commit phase. None of the optional readers
 * has a heuristic fallback; an omitted reader produces `undefined`.
 */
export interface ActionHostAdapter<
  Props,
  Host,
  Interactive extends object,
  ValueElement extends object = Interactive,
  Invocation = unknown,
  ComposedProps = Readonly<Props>,
  Locator = Binding,
> {
  composeInvocation(
    props: Readonly<Props>,
    invoke: Invocation,
  ): ComposedProps;

  resolve(
    props: Readonly<Props>,
    host: Host,
  ): ActionHostTargetResolution<Interactive, ValueElement>;

  readEnabled?(
    context: ActionHostContext<Props, Host, Interactive, ValueElement>,
  ): boolean | undefined;

  readBusy?(
    context: ActionHostContext<Props, Host, Interactive, ValueElement>,
  ): string | undefined;

  readCoverage?(
    context: ActionHostContext<Props, Host, Interactive, ValueElement>,
  ): BindingCoverage | undefined;

  projectLocators?(
    context: ActionHostContext<Props, Host, Interactive, ValueElement>,
  ): readonly Locator[] | undefined;
}

/** One exact committed target and only the facts its adapter explicitly read. */
export interface ResolvedActionHost<
  Host,
  Interactive extends object,
  ValueElement extends object = Interactive,
  Locator = Binding,
> {
  readonly kind: 'resolved';
  readonly host: Host;
  readonly interactive: Interactive;
  readonly valueElement: ValueElement | undefined;
  readonly enabled: boolean | undefined;
  readonly busy: string | undefined;
  readonly coverage: BindingCoverage | undefined;
  readonly locators: readonly Locator[] | undefined;
}

/** A committed wrapper with no exact interactive descendant. */
export interface UnresolvedActionHost<Host> {
  readonly kind: 'unresolved';
  readonly host: Host;
  readonly reason: ActionHostUnresolvedReason;
}

/** The framework-neutral result of resolving a host after commit. */
export type ActionHostResolution<
  Host,
  Interactive extends object,
  ValueElement extends object = Interactive,
  Locator = Binding,
> =
  | ResolvedActionHost<Host, Interactive, ValueElement, Locator>
  | UnresolvedActionHost<Host>;

/**
 * Resolve one committed host and snapshot only explicitly supplied facts.
 *
 * Successful element resolution does not imply enabledness, busy state,
 * semantic coverage, value ownership, or a locator. Unresolved targets do not
 * call fact readers at all, so absence can never be laundered into disabledness.
 */
export function resolveActionHost<
  Props,
  Host,
  Interactive extends object,
  ValueElement extends object,
  Invocation,
  ComposedProps,
  Locator,
>(
  adapter: ActionHostAdapter<
    Props,
    Host,
    Interactive,
    ValueElement,
    Invocation,
    ComposedProps,
    Locator
  >,
  props: Readonly<Props>,
  host: Host,
): ActionHostResolution<Host, Interactive, ValueElement, Locator> {
  const resolve =
    adapter !== null && typeof adapter === 'object'
      ? adapter.resolve
      : undefined;
  if (
    adapter === null ||
    typeof adapter !== 'object' ||
    typeof resolve !== 'function'
  ) {
    throw new TypeError(
      'hcifootprint: resolveActionHost() needs an adapter with resolve().',
    );
  }
  const target = Reflect.apply(resolve, adapter, [props, host]) as
    ActionHostTargetResolution<Interactive, ValueElement>;
  if (target === null || typeof target !== 'object') {
    throw new TypeError(
      'hcifootprint: an action host resolver must return a resolution record.',
    );
  }
  const targetKind = (target as { readonly kind?: unknown }).kind;
  if (targetKind === 'unresolved') {
    const reason = (target as UnresolvedActionHostTarget).reason;
    if (
      reason !== 'absent' &&
      reason !== 'ambiguous' &&
      reason !== 'unsupported'
    ) {
      throw new TypeError(
        `hcifootprint: invalid unresolved action host reason '${String(reason)}'.`,
      );
    }
    return Object.freeze({
      kind: 'unresolved' as const,
      host,
      reason,
    });
  }
  if (targetKind !== 'resolved') {
    throw new TypeError(
      `hcifootprint: invalid action host resolution kind '${String(targetKind)}'.`,
    );
  }
  const resolvedTarget = target as ResolvedActionHostTarget<
    Interactive,
    ValueElement
  >;
  const interactive = resolvedTarget.interactive;
  const valueElement = resolvedTarget.valueElement;
  if (
    interactive === null ||
    (typeof interactive !== 'object' && typeof interactive !== 'function')
  ) {
    throw new TypeError(
      'hcifootprint: a resolved action host needs one interactive object.',
    );
  }
  if (
    valueElement !== undefined &&
    (valueElement === null ||
      (typeof valueElement !== 'object' &&
        typeof valueElement !== 'function'))
  ) {
    throw new TypeError(
      'hcifootprint: a resolved action host valueElement must be an object when supplied.',
    );
  }

  const context: ActionHostContext<
    Props,
    Host,
    Interactive,
    ValueElement
  > = Object.freeze({
    props,
    host,
    interactive,
    valueElement,
  });
  const projected = adapter.projectLocators?.(context);
  if (projected !== undefined && !Array.isArray(projected)) {
    throw new TypeError(
      'hcifootprint: an action host locator projection must be an array.',
    );
  }
  const locators =
    projected === undefined
      ? undefined
      : (Object.freeze([...projected]) as readonly Locator[]);
  const enabled = adapter.readEnabled?.(context);
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw new TypeError(
      'hcifootprint: an action host enabled reader must return boolean or undefined.',
    );
  }
  const busy = adapter.readBusy?.(context);
  if (busy !== undefined && typeof busy !== 'string') {
    throw new TypeError(
      'hcifootprint: an action host busy reader must return string or undefined.',
    );
  }
  const coverage = adapter.readCoverage?.(context);
  if (coverage !== undefined) {
    assertBindingCoverage(coverage, 'resolveActionHost()');
  }

  return Object.freeze({
    kind: 'resolved' as const,
    host,
    interactive,
    valueElement,
    enabled,
    busy,
    coverage,
    locators,
  });
}

/** A host listener whose receiver and arguments are owned by its framework. */
export type ActionHostListener<
  This,
  Args extends readonly unknown[],
  Result,
> = (this: This, ...args: Args) => Result;

/**
 * One invocation door around an existing listener.
 *
 * The middleware calls `proceed()` to execute the existing application
 * listener. Returning or rethrowing that result preserves the listener's exact
 * observable behavior while allowing the binding runtime to open its
 * transition first.
 */
export type ActionInvocationMiddleware<
  This,
  Args extends readonly unknown[],
  Result,
> = (this: This, proceed: () => Result, ...args: Args) => Result;

/**
 * Compose a host-free invocation door without duplicating application work.
 *
 * The middleware is entered exactly once. Its `proceed` continuation closes
 * over the original receiver and arguments and is token-owned: repeated calls
 * return the exact first value or rethrow the exact first error instead of
 * executing the existing listener again.
 */
export function composeActionInvocation<
  This,
  Args extends readonly unknown[],
  Result,
>(
  existing: ActionHostListener<This, Args, Result>,
  invoke: ActionInvocationMiddleware<This, Args, Result>,
): ActionHostListener<This, Args, Result> {
  return function (this: This, ...args: Args): Result {
    let state: 'idle' | 'running' | 'returned' | 'threw' = 'idle';
    let returned!: Result;
    let thrown: unknown;

    const proceed = (): Result => {
      if (state === 'returned') return returned;
      if (state === 'threw') throw thrown;
      if (state === 'running') {
        throw new Error(
          'hcifootprint: an action host listener cannot re-enter its invocation continuation.',
        );
      }

      state = 'running';
      try {
        returned = Reflect.apply(existing, this, args) as Result;
        state = 'returned';
        return returned;
      } catch (error) {
        thrown = error;
        state = 'threw';
        throw error;
      }
    };

    return Reflect.apply(invoke, this, [proceed, ...args]) as Result;
  };
}
