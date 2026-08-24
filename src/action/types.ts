import type { ActionDef } from '../tree/types.js';
import type { Binding } from '../atom/types.js';

/** The strongest evidence a live binding can substantiate. */
export type BindingCoverage =
  | 'identity'
  | 'semantic'
  | 'executable'
  | 'verifiable';

/** What capability is this? */
export interface ActionDefinitionRef<Id extends string = string> {
  readonly kind: 'action-definition';
  /** Existing string identity, retained as the compatibility/display projection. */
  readonly definitionId: Id;
}

/** Where, and for which live instance, is the definition connected? */
export interface ActionBindingRef<Id extends string = string> {
  readonly kind: 'action-binding';
  readonly bindingId: string;
  readonly definition: ActionDefinitionRef<Id>;
  readonly node: string;
  /** Opaque application data. It is never encoded into or recovered from another id. */
  readonly instance?: string;
}

/** Under which application facts was one exact binding exposed? */
export interface ActionOfferRef<Id extends string = string> {
  readonly kind: 'action-offer';
  readonly offerId: string;
  readonly binding: ActionBindingRef<Id>;
  /** The committed binding-fact generation this offer describes. */
  readonly revision: number;
}

/** Which particular invocation of one exact binding occurred? */
export interface ActionTransitionRef<Id extends string = string> {
  readonly kind: 'action-transition';
  readonly transitionId: string;
  readonly binding: ActionBindingRef<Id>;
  readonly offer?: ActionOfferRef<Id>;
}

/** Authored semantics carried by a definition. Reachability belongs to a live binding. */
export type ActionDefinitionContract = Omit<ActionDef, 'binding' | 'input'> & {
  /**
   * Definition-side payload contract: Zod, JSON Schema, a `.safeParse`/`.parse`
   * validator, or `'none'`. Omission means the shape is not declared. The
   * framework-neutral runtime cannot enforce this clause: supply an enforcing
   * port or opt visibly into `contractActivation: 'disclosure'`. Live binding
   * values use invocation-time `input` readers instead.
   */
  readonly inputSchema?: ActionDef['input'];
};

/**
 * The declaration view exposed by a defined action. Functions and opaque
 * validators keep their identity; declaration-shaped containers are readonly.
 */
export type ReadonlyActionDefinitionContract = DeepReadonly<
  ActionDefinitionContract
>;

/**
 * Recursively make declaration containers readonly while retaining callable
 * validators and readers as their original function types.
 */
export type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

/** The immutable metadata carried under the callable definition's Symbol.for brand. */
export interface ActionDefinitionRecord<Id extends string = string> {
  readonly ref: ActionDefinitionRef<Id>;
  readonly contract: ReadonlyActionDefinitionContract;
}

declare const DEFINED_ACTION_TYPE: unique symbol;

/**
 * A callable carrying an action-definition identity. The marker is type-only;
 * runtime recognition uses a non-enumerable `Symbol.for` property.
 */
export type DefinedAction<
  F extends (...args: any[]) => any = (...args: any[]) => any,
  Id extends string = string,
> = F & { readonly [DEFINED_ACTION_TYPE]: Id };

/** Which subsystem owns reporting a human-originated interaction. */
export type HumanReporting = 'connection' | 'sensor';

/** A host adapter's already-resolved, commit-time projection. */
export interface BindingProjection {
  readonly interactive: object;
  readonly valueElement?: object;
  readonly coverage: BindingCoverage;
  readonly locators?: readonly Binding[];
  readonly humanReporting?: HumanReporting;
}

/** Mutable committed facts for one stable connection identity. */
export interface ActionBindingUpdate<Input> {
  /** Invocation-time value reader; the definition-side shape is `inputSchema`. */
  readonly input?: () => Input;
  readonly enabled?: () => boolean | undefined;
  readonly busy?: () => string | undefined;
  readonly coverage?: BindingCoverage;
  readonly locators?: readonly Binding[];
  readonly humanReporting?: HumanReporting;
}

/** Facts supplied when opening one live binding. */
export interface ConnectActionOptions<Input>
  extends ActionBindingUpdate<Input> {
  readonly node: string;
  readonly instance?: string;
}

export interface ActionAttachment {
  detach(): void;
}

export interface ActionInvokeOptions<Id extends string = string> {
  readonly offer: ActionOfferRef<Id>;
}

export type ActionInvocationSettlement<
  Output,
  Id extends string = string,
> =
  | {
      readonly status: 'performed';
      readonly transition: ActionTransitionRef<Id>;
      readonly produced: Output;
    }
  | {
      readonly status: 'refused';
      readonly transition: ActionTransitionRef<Id>;
      readonly error: unknown;
    };

export type ActionEffectSettlement<Id extends string = string> =
  | {
      readonly status: 'verified';
      readonly transition: ActionTransitionRef<Id>;
      readonly evidence: unknown;
    }
  | {
      readonly status: 'refused';
      readonly transition: ActionTransitionRef<Id>;
      readonly reason: unknown;
    };

export type ActionEffectSettlementInput =
  | { readonly status: 'verified'; readonly evidence: unknown }
  | { readonly status: 'refused'; readonly reason: unknown };

export interface ActionInvocation<Output, Id extends string = string> {
  readonly transition: ActionTransitionRef<Id>;
  /** Application handler completion. This promise resolves; failure is data. */
  readonly whenInvoked: Promise<ActionInvocationSettlement<Output, Id>>;
  /** Authoritative effect observation. Handler completion never settles it. */
  readonly whenEffectSettled: Promise<ActionEffectSettlement<Id>>;
}

export interface ActionBindingSnapshot<Id extends string = string> {
  readonly ref: ActionBindingRef<Id>;
  readonly present: true;
  readonly attached: boolean;
  readonly enabled: boolean | undefined;
  readonly busy?: string;
  readonly coverage: BindingCoverage;
  readonly locators: readonly Binding[];
  readonly humanReporting?: HumanReporting;
}

export interface ActionOffer<Id extends string = string> {
  readonly ref: ActionOfferRef<Id>;
  readonly locators: readonly Binding[];
}

export interface ActionTransitionSnapshot {
  readonly ref: ActionTransitionRef;
  readonly coverage: BindingCoverage;
  readonly invocationStatus: 'pending' | 'performed' | 'refused';
  readonly effectStatus: 'unverified' | 'verified' | 'refused';
  readonly produced?: unknown;
  readonly error?: unknown;
  readonly evidence?: unknown;
  readonly reason?: unknown;
}

/**
 * Direct invocation is intentionally a scalar-payload door. Host listeners
 * with a receiver or several arguments use `invokeContinuation`, which keeps
 * their exact call/apply semantics inside the host adapter.
 */
export type ActionInvoke<
  F extends (...args: any[]) => any,
  Id extends string = string,
  HasInputReader extends boolean = false,
> = unknown extends ThisParameterType<F>
  ? Parameters<F> extends [] | [unknown] | [unknown?]
    ? Parameters<F> extends []
      ? () => ActionInvocation<Awaited<ReturnType<F>>, Id>
      : [] extends Parameters<F>
        ? {
            (): ActionInvocation<Awaited<ReturnType<F>>, Id>;
            (
              input: Parameters<F>[0],
            ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
          }
        : HasInputReader extends true
          ? {
              (): ActionInvocation<Awaited<ReturnType<F>>, Id>;
              (
                input: Parameters<F>[0],
              ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
            }
          : (
              input: Parameters<F>[0],
            ) => ActionInvocation<Awaited<ReturnType<F>>, Id>
    : never
  : never;

export type ActionOfferedInvoke<
  F extends (...args: any[]) => any,
  Id extends string = string,
  HasInputReader extends boolean = false,
> = unknown extends ThisParameterType<F>
  ? Parameters<F> extends [] | [unknown] | [unknown?]
    ? Parameters<F> extends []
      ? (
          options: ActionInvokeOptions<Id>,
        ) => ActionInvocation<Awaited<ReturnType<F>>, Id>
      : [] extends Parameters<F>
        ? {
            (
              options: ActionInvokeOptions<Id>,
            ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
            (
              options: ActionInvokeOptions<Id>,
              input: Parameters<F>[0],
            ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
          }
        : HasInputReader extends true
          ? {
              (
                options: ActionInvokeOptions<Id>,
              ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
              (
                options: ActionInvokeOptions<Id>,
                input: Parameters<F>[0],
              ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
            }
          : (
              options: ActionInvokeOptions<Id>,
              input: Parameters<F>[0],
            ) => ActionInvocation<Awaited<ReturnType<F>>, Id>
    : never
  : never;

export interface ActionConnection<
  F extends (...args: any[]) => any = (...args: any[]) => any,
  Id extends string = string,
  HasInputReader extends boolean = false,
> {
  readonly definition: ActionDefinitionRef<Id>;
  readonly binding: ActionBindingRef<Id>;
  attach(projection: BindingProjection): ActionAttachment;
  update(
    update: HasInputReader extends true
      ? ActionBindingUpdate<
          Parameters<F> extends [] ? undefined : Parameters<F>[0]
        >
      : Omit<
          ActionBindingUpdate<
            Parameters<F> extends [] ? undefined : Parameters<F>[0]
          >,
          'input'
        > & {
          readonly input?: undefined;
        },
  ): void;
  readonly invoke: ActionInvoke<F, Id, HasInputReader>;
  /** Invoke under one exact previously exposed offer, without an argument-slot sentinel. */
  readonly invokeOffered: ActionOfferedInvoke<F, Id, HasInputReader>;
  /**
   * Open an invocation around a host listener continuation. The definition's
   * implementation is not also called: the continuation is this occurrence's
   * exact application behavior, so listener composition remains one act.
   */
  invokeContinuation(
    continuation: () => ReturnType<F>,
  ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
  settle(
    transition: ActionTransitionRef<Id>,
    settlement: ActionEffectSettlementInput,
  ): ActionEffectSettlement<Id>;
  disconnect(): void;
}

/** How the framework-neutral runtime treats enforceable authored clauses. */
export type ActionContractActivation = 'require-active' | 'disclosure';

export interface ActionBindingRuntimeOptions {
  /**
   * `require-active` (default) rejects clauses this small runtime cannot
   * enforce. `disclosure` is an explicit opt-in to carry them as metadata.
   */
  readonly contractActivation?: ActionContractActivation;
}

/** Framework-neutral store and execution port for connected actions. */
export interface ActionBindingRuntime {
  readonly contractActivation: ActionContractActivation;
  connect<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    definition: DefinedAction<F, Id>,
    options: Parameters<F> extends []
      ? never
      : ConnectActionOptions<Parameters<F>[0]> & {
          readonly input: () => Parameters<F>[0];
        },
  ): ActionConnection<F, Id, true>;
  connect<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    definition: DefinedAction<F, Id>,
    options: Parameters<F> extends []
      ? Omit<ConnectActionOptions<undefined>, 'input'> & {
          readonly input?: never;
        }
      : ConnectActionOptions<Parameters<F>[0]>,
  ): ActionConnection<F, Id, false>;
  bindings(definition?: ActionDefinitionRef | string): ActionBindingSnapshot[];
  bindingFor(
    binding: ActionBindingRef | string,
  ): ActionBindingSnapshot | undefined;
  available<Ref extends ActionDefinitionRef>(
    definition: Ref,
  ): readonly ActionOffer<Ref['definitionId']>[];
  available<Id extends string>(definition: Id): readonly ActionOffer<Id>[];
  available(): readonly ActionOffer[];
  transitionFor(
    transition: ActionTransitionRef | string,
  ): ActionTransitionSnapshot | undefined;
  /** Release a fully settled transition from runtime history. */
  forgetTransition(transition: ActionTransitionRef): boolean;
}
