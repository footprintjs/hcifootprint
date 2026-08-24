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
  /** Opaque identity for an input captured as part of this exact offer. */
  readonly input?: ActionInputRef<'bound'>;
}

/** Where the payload used by an invocation came from. */
export type ActionInputSource = 'bound' | 'caller';

/**
 * Auditable identity for one invocation payload without disclosing its value.
 * A bound offer and every transition invoked from it carry the same ref.
 */
export interface ActionInputRef<
  Source extends ActionInputSource = ActionInputSource,
> {
  readonly kind: 'action-input';
  readonly inputId: string;
  readonly source: Source;
}

/** Which particular invocation of one exact binding occurred? */
export interface ActionTransitionRef<Id extends string = string> {
  readonly kind: 'action-transition';
  readonly transitionId: string;
  readonly binding: ActionBindingRef<Id>;
  readonly offer?: ActionOfferRef<Id>;
  /** The exact payload receipt used by this invocation, when it had one. */
  readonly input?: ActionInputRef;
}

/** Which invocation doors an authored callable deliberately supports. */
export type ActionInvocationMode = 'inputless' | 'scalar' | 'host';

/** Authored semantics carried by a definition. Reachability belongs to a live binding. */
export type ActionDefinitionContract = Omit<ActionDef, 'binding' | 'input'> & {
  /**
   * Explicit runtime call shape. `inputless` and `scalar` may be invoked
   * directly and brokered; `host` is recordable only through the exact host
   * continuation, preserving receivers and multi-argument listener calls.
   */
  readonly invocation: ActionInvocationMode;
  /**
   * Inert, named inputs reserved for a future channel broker. Layer 1 stores
   * these declarations but never matches a surface, collects a value, or
   * changes action availability from them.
   */
  readonly needs?: Readonly<
    Record<
      string,
      {
        readonly kind: string;
        readonly schema?: unknown;
        readonly from?: string;
      }
    >
  >;
  /**
   * Inert output declaration reserved for a future channel broker. Layer 1
   * records it without routing or rendering it.
   */
  readonly produces?: {
    readonly kind: string;
    readonly schema?: unknown;
  };
  /**
   * Definition-side payload contract: Zod, JSON Schema, a `.safeParse`/`.parse`
   * validator, or `'none'`. Omission means the shape is not declared. The
   * Action Binding runtime enforces parseable schemas before the handler
   * runs. Other formats need `inputSchemaAdapter` or explicit disclosure mode.
   * Bound values are checked while minting an offer and caller values are
   * checked by `runtime.invoke()`. Live binding values use `input` readers.
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
export interface ActionDefinitionRecord<
  Id extends string = string,
  Mode extends ActionInvocationMode = ActionInvocationMode,
> {
  readonly ref: ActionDefinitionRef<Id>;
  readonly contract: ReadonlyActionDefinitionContract & {
    readonly invocation: Mode;
  };
}

declare const DEFINED_ACTION_TYPE: unique symbol;

/**
 * A callable carrying an action-definition identity. The marker is type-only;
 * runtime recognition uses a non-enumerable `Symbol.for` property.
 */
export type DefinedAction<
  F extends (...args: any[]) => any = (...args: any[]) => any,
  Id extends string = string,
  Mode extends ActionInvocationMode = ActionInvocationMode,
> = F & {
  readonly [DEFINED_ACTION_TYPE]: {
    readonly definitionId: Id;
    readonly invocation: Mode;
  };
};

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
  /**
   * Live value reader. Direct connection invocation reads it at invocation;
   * `available()` reads and retains it while minting an exact bound offer.
   * The definition-side payload shape is `inputSchema`.
   */
  readonly input?: () => Input;
  readonly enabled?: () => boolean | undefined;
  readonly busy?: () => string | undefined;
  readonly coverage?: BindingCoverage;
  readonly locators?: readonly Binding[];
  readonly humanReporting?: HumanReporting;
}

/** The only connection authority exposed to an invocation observer. */
export interface ActionSettlementCapability<Id extends string = string> {
  readonly binding: ActionBindingRef<Id>;
  settle(
    settlement: ActionEffectSettlementInput,
  ): ActionEffectSettlement<Id>;
}

/** Facts supplied when opening one live binding. */
export interface ConnectActionOptions<
  Input,
  Output = unknown,
  Id extends string = string,
>
  extends ActionBindingUpdate<Input> {
  readonly node: string;
  readonly instance?: string;
  /** Observe every direct, brokered, or host-continuation invocation. */
  readonly onInvocation?: (
    invocation: ActionInvocation<Output, Id>,
    settlement: ActionSettlementCapability<Id>,
  ) => void | PromiseLike<void>;
  /** Optional sink for observer failures; neither observer can replace app behavior. */
  readonly onInvocationError?: (error: unknown) => void | PromiseLike<void>;
}

export interface ActionAttachment {
  detach(): void;
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
      /** The application handler never started. */
      readonly status: 'refused';
      readonly transition: ActionTransitionRef<Id>;
      readonly error: unknown;
    }
  | {
      /** The application handler started but threw or rejected. */
      readonly status: 'failed';
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

/** Non-secret provenance for the payload rail of one invocation. */
export type ActionInvocationInput =
  | { readonly source: 'none'; readonly provided: false }
  | {
      readonly source: 'bound';
      readonly provided: true;
      readonly ref: ActionInputRef<'bound'>;
    }
  | {
      readonly source: 'bound';
      readonly provided: false;
    }
  | {
      readonly source: 'caller';
      readonly provided: true;
      readonly ref: ActionInputRef<'caller'>;
    }
  | { readonly source: 'caller'; readonly provided: false }
  | { readonly source: 'host'; readonly provided: false };

export interface ActionInvocation<Output, Id extends string = string> {
  readonly transition: ActionTransitionRef<Id>;
  /** Auditable input origin; the payload value itself is deliberately not disclosed. */
  readonly input: ActionInvocationInput;
  /** Invocation outcome. This promise always resolves; refusal/failure are data. */
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

declare const ACTION_OFFER_CALLABLE_TYPE: unique symbol;

/** Whether this runtime will enforce the offer's declared input contract. */
export type ActionInputValidationDisposition =
  | 'not-declared'
  | 'active'
  | 'disclosure';

/** An offer whose invocation payload was captured from its live binding. */
export interface BoundActionOffer<
  Id extends string = string,
  F extends (...args: any[]) => any = (...args: any[]) => any,
> {
  readonly ref: ActionOfferRef<Id> & {
    readonly input: ActionInputRef<'bound'>;
  };
  /** Immutable authored meaning and payload schema for an in-process consumer. */
  readonly definition: ActionDefinitionRecord<Id, 'scalar'>;
  readonly locators: readonly Binding[];
  readonly coverage: BindingCoverage;
  /** Whether enforceable clauses were active or carried only for disclosure. */
  readonly contractActivation: ActionContractActivation;
  readonly inputValidation: ActionInputValidationDisposition;
  readonly inputMode: 'bound';
  readonly input: ActionInputRef<'bound'>;
  /** @internal Type-only link back to the callable selected by this offer. */
  readonly [ACTION_OFFER_CALLABLE_TYPE]?: F;
}

/** An offer waiting for its caller (for example, a rendered HITL form) to supply input. */
export interface OpenActionOffer<
  Id extends string = string,
  F extends (...args: any[]) => any = (...args: any[]) => any,
> {
  readonly ref: ActionOfferRef<Id> & { readonly input?: never };
  /** Immutable authored meaning and payload schema for an in-process consumer. */
  readonly definition: ActionDefinitionRecord<Id, 'scalar'>;
  readonly locators: readonly Binding[];
  readonly coverage: BindingCoverage;
  /** Whether enforceable clauses were active or carried only for disclosure. */
  readonly contractActivation: ActionContractActivation;
  readonly inputValidation: ActionInputValidationDisposition;
  readonly inputMode: 'open';
  /** Open offers always require exactly one deliberate caller payload slot. */
  readonly inputRequired: true;
  /** @internal Type-only link back to the callable selected by this offer. */
  readonly [ACTION_OFFER_CALLABLE_TYPE]?: F;
}

/** An offer for a callable that takes no direct payload. */
export interface InputlessActionOffer<
  Id extends string = string,
  F extends (...args: any[]) => any = (...args: any[]) => any,
> {
  readonly ref: ActionOfferRef<Id> & { readonly input?: never };
  /** Immutable authored meaning and payload schema for an in-process consumer. */
  readonly definition: ActionDefinitionRecord<Id, 'inputless'>;
  readonly locators: readonly Binding[];
  readonly coverage: BindingCoverage;
  /** Whether enforceable clauses were active or carried only for disclosure. */
  readonly contractActivation: ActionContractActivation;
  readonly inputValidation: ActionInputValidationDisposition;
  readonly inputMode: 'none';
  /** @internal Type-only link back to the callable selected by this offer. */
  readonly [ACTION_OFFER_CALLABLE_TYPE]?: F;
}

/**
 * A retained in-process capability. Across a transport, keep it beside the
 * runtime and send only an opaque handle plus a serializable projection.
 */
export type ActionOffer<
  Id extends string = string,
  F extends (...args: any[]) => any = (...args: any[]) => any,
> =
  | BoundActionOffer<Id, F>
  | OpenActionOffer<Id, F>
  | InputlessActionOffer<Id, F>;

/** Offers possible for one known callable signature. */
export type ActionOfferFor<
  F extends (...args: any[]) => any,
  Id extends string = string,
  Mode extends ActionInvocationMode = ActionInvocationMode,
> = Mode extends 'host'
  ? never
  : Mode extends 'inputless'
    ? InputlessActionOffer<Id, F>
    : Mode extends 'scalar'
      ? BoundActionOffer<Id, F> | OpenActionOffer<Id, F>
      : never;

export interface ActionTransitionSnapshot {
  readonly ref: ActionTransitionRef;
  readonly input: ActionInvocationInput;
  readonly coverage: BindingCoverage;
  readonly invocationStatus: 'pending' | 'performed' | 'refused' | 'failed';
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
  Mode extends ActionInvocationMode = ActionInvocationMode,
> = Mode extends 'host'
  ? never
  : Mode extends 'inputless'
    ? () => ActionInvocation<Awaited<ReturnType<F>>, Id>
    : Mode extends 'scalar'
      ? HasInputReader extends true
        ? () => ActionInvocation<Awaited<ReturnType<F>>, Id>
        : (
            input: Parameters<F>[0],
          ) => ActionInvocation<Awaited<ReturnType<F>>, Id>
      : never;

export interface ActionConnection<
  F extends (...args: any[]) => any = (...args: any[]) => any,
  Id extends string = string,
  HasInputReader extends boolean = false,
  Mode extends ActionInvocationMode = ActionInvocationMode,
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
  /** Publish a new committed fact generation when stable readers changed meaning. */
  touch(): void;
  readonly invoke: ActionInvoke<F, Id, HasInputReader, Mode>;
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

/** Context handed to an application-owned synchronous schema validator. */
export interface ActionInputSchemaContext<Id extends string = string> {
  readonly definition: ActionDefinitionRef<Id>;
  readonly binding: ActionBindingRef<Id>;
  readonly source: 'bound' | 'caller';
}

/** Result returned by an application-owned input-schema adapter. */
export type ActionInputSchemaResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: unknown };

/**
 * Synchronous enforcement port for declaration formats without their own
 * `.safeParse`/`.parse` method, such as JSON Schema plus an Ajv instance.
 */
export interface ActionInputSchemaAdapter {
  supports(schema: unknown): boolean;
  validate(
    schema: unknown,
    input: unknown,
    context: ActionInputSchemaContext,
  ): ActionInputSchemaResult;
}

export interface ActionBindingRuntimeOptions {
  /**
   * `require-active` (default) rejects clauses this small runtime cannot
   * enforce. Self-validating and adapter-supported input schemas are enforced;
   * unsupported formats are rejected in strict mode or disclosure-only when
   * `disclosure` is selected explicitly.
   */
  readonly contractActivation?: ActionContractActivation;
  /** Optional validator for schema formats that are otherwise disclosure-only. */
  readonly inputSchemaAdapter?: ActionInputSchemaAdapter;
}

/** Framework-neutral store and execution port for connected actions. */
export interface ActionBindingRuntime {
  readonly contractActivation: ActionContractActivation;
  /**
   * Connect a scalar binding whose exact payload is owned by a required live
   * `options.input` reader.
   */
  connect<
    F extends (...args: any[]) => any,
    Id extends string = string,
    Mode extends ActionInvocationMode = ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
    options: Mode extends 'scalar'
      ? ConnectActionOptions<
          Parameters<F>[0],
          Awaited<ReturnType<F>>,
          Id
        > & {
          readonly input: () => Parameters<F>[0];
        }
      : never,
  ): ActionConnection<F, Id, true, Mode>;
  /**
   * Connect without a bound input reader. Scalar definitions keep a required
   * direct payload door; inputless/host definitions forbid `options.input`.
   */
  connect<
    F extends (...args: any[]) => any,
    Id extends string = string,
    Mode extends ActionInvocationMode = ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
    options: Mode extends 'scalar'
      ? ConnectActionOptions<
          Parameters<F>[0],
          Awaited<ReturnType<F>>,
          Id
        >
      : Omit<
          ConnectActionOptions<undefined, Awaited<ReturnType<F>>, Id>,
          'input'
        > & {
          readonly input?: never;
        },
  ): ActionConnection<F, Id, false, Mode>;
  bindings(definition?: ActionDefinitionRef | string): ActionBindingSnapshot[];
  bindingFor(
    binding: ActionBindingRef | string,
  ): ActionBindingSnapshot | undefined;
  /** Invoke the exact full offer previously returned by `available()`. */
  invoke<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    offer: BoundActionOffer<Id, F> | InputlessActionOffer<Id, F>,
  ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
  /**
   * Invoke an exact retained open offer with one mandatory caller payload
   * slot. The payload is validated before the handler starts; rejection is a
   * structured `refused` invocation rather than an application failure.
   */
  invoke<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    offer: OpenActionOffer<Id, F>,
    input: Parameters<F>[0],
  ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
  /**
   * Enumerate exact retained offers for current executable bindings. Host-only,
   * disabled, insufficient-coverage, and unschematized open bindings are
   * withheld. Minting a bound offer executes and validates its input reader;
   * unchanged generations reuse the same offer and retained value.
   */
  available<
    F extends (...args: any[]) => any,
    Id extends string = string,
    Mode extends ActionInvocationMode = ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
  ): readonly ActionOfferFor<DefinedAction<F, Id, Mode>, Id, Mode>[];
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
