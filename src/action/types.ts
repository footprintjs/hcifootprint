import type { WhereFilter } from 'footprintjs';
import type {
  Attribution,
  Binding,
  BlockedBecause,
  CanonicalRole,
  Observability,
  Principal,
  PrincipalPolicy,
  VerifyContract,
} from '../atom/types.js';

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
export interface ActionOfferRef<
  Id extends string = string,
  P extends Principal = Principal,
> {
  readonly kind: 'action-offer';
  readonly offerId: string;
  readonly binding: ActionBindingRef<Id>;
  /** The reader authority under which this exact capability was exposed. */
  readonly principal: P;
  /** The committed binding-fact generation this offer describes. */
  readonly revision: number;
  /** Opaque identity for an input captured as part of this exact offer. */
  readonly input?: ActionInputRef<'bound'>;
}

/**
 * Where the payload used by an invocation came from.
 * @inline
 */
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
  /** Who requested this invocation, or `unknown` for an unscoped/direct occurrence. */
  readonly principal: Principal;
  readonly offer?: ActionOfferRef<Id>;
  /** The exact payload receipt used by this invocation, when it had one. */
  readonly input?: ActionInputRef;
}

/** Which invocation doors an authored callable deliberately supports. */
export type ActionInvocationMode = 'inputless' | 'scalar' | 'host';

/** @inline */
interface ActionGuardFields {
  /** Projected-state condition for presence. */
  readonly when?: WhereFilter;
  /** Projected-state condition for enabledness. */
  readonly enabledWhen?: WhereFilter;
  /** The app-authored explanation served while the action is unavailable. */
  readonly blockedBecause?: BlockedBecause | (() => BlockedBecause | undefined);
}

/** Grouped, declarative availability metadata owned by one action definition. */
export type ActionGuardContract = ActionGuardFields &
  (
    | { readonly when: WhereFilter }
    | { readonly enabledWhen: WhereFilter }
    | {
        readonly blockedBecause: NonNullable<
          ActionGuardFields['blockedBecause']
        >;
      }
  );

/** Ordered progress vocabulary for one transition. */
export interface ActionProgressDeclaration<
  Stages extends readonly string[] = readonly string[],
> {
  readonly stages: Stages;
  /** A started invocation that reports no stage closes with unmet integrity. */
  readonly required?: boolean;
}

/**
 * "A verified settlement's evidence is a value of this governed kind." The
 * proof of an effect that makes a NEW thing (a dataset, a receipt, a created
 * record) — distinct from the top-level `produces`, which is what the
 * handler RETURNS (the value a walk carries to the next step).
 */
export interface ActionEvidenceDeclaration {
  readonly kind: string;
}

/**
 * What `settle.onReturn` judges: the two arms of an invocation in which the
 * application handler RAN — it returned (`performed`) or threw/rejected
 * (`failed`). A preflight refusal never reaches it; the runtime settled that
 * effect `refused` itself.
 */
export type ActionReturnOutcome<Output = unknown, Id extends string = string> =
  Extract<
    ActionInvocationSettlement<Output, Id>,
    { readonly status: 'performed' | 'failed' }
  >;

/** @inline */
interface ActionSettleFields<
  Stages extends readonly string[] = readonly string[],
  Output = any,
> {
  readonly writes?: readonly string[];
  readonly reads?: readonly string[];
  readonly goTo?: string;
  readonly verify?: VerifyContract;
  readonly observability?: Observability;
  readonly progress?: ActionProgressDeclaration<Stages>;
  /** The effect is proven by a value of this governed kind — an
   *  evidence-bearing clause, kind-checked at connect, schema-checked at settle. */
  readonly evidence?: ActionEvidenceDeclaration;
  /**
   * The definition's AUTHORED verdict on its own return: what in the handler's
   * outcome counts as proof. Runs when the handler returns or fails; the
   * verdict goes through the one settle funnel (coverage gate, evidence gate,
   * the kind check, first terminal wins). `undefined` = the return proves
   * nothing, and the effect stays open for an observer or external report. A
   * synchronous return settles before `invoke()` returns. Synchronous; a
   * throw is instrumentation, routed to `onInvocationError`. Refused on
   * `'host'` actions — a host continuation runs the listener, not `mutate`.
   */
  onReturn?(
    outcome: ActionReturnOutcome<Output>,
  ): ActionEffectSettlementInput | undefined;
}

/** Grouped effect, evidence, and progress declarations for one action. */
export type ActionSettleContract<
  Stages extends readonly string[] = readonly string[],
  Output = any,
> = ActionSettleFields<Stages, Output> &
  (
    | { readonly writes: readonly string[] }
    | { readonly reads: readonly string[] }
    | { readonly goTo: string }
    | { readonly verify: VerifyContract }
    | { readonly observability: Observability }
    | { readonly progress: ActionProgressDeclaration<Stages> }
    | { readonly evidence: ActionEvidenceDeclaration }
    | {
        onReturn(
          outcome: ActionReturnOutcome<Output>,
        ): ActionEffectSettlementInput | undefined;
      }
  );

/** @inline */
type ActionSettleWithoutProgress = ActionSettleContract & {
  readonly progress?: never;
  readonly onReturn?: never;
};

/** @inline */
type ActionPrincipalContract = PrincipalPolicy &
  (
    | {
        readonly mayInvoke: NonNullable<PrincipalPolicy['mayInvoke']>;
      }
    | {
        readonly decisionOwner: NonNullable<PrincipalPolicy['decisionOwner']>;
      }
    | {
        readonly requiresHumanApproval: NonNullable<
          PrincipalPolicy['requiresHumanApproval']
        >;
      }
  );

/** @inline */
interface ActionDefinitionCommonContract {
  /** Stable, app-authored sentence describing the action's meaning. */
  readonly does: string;
  readonly guard?: ActionGuardContract;
  /** Invocation authority and decision ownership. */
  readonly principal?: ActionPrincipalContract;
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
  readonly role?: CanonicalRole;
}

/**
 * Authored semantics carried by a definition. Reachability belongs to a live
 * binding, and each invocation branch states its payload/progress laws.
 * @inlineType ActionPrincipalContract
 */
export type ActionDefinitionContract = ActionDefinitionCommonContract &
  (
    | {
        /** Direct and brokered invocation exposes no payload slot. */
        readonly invocation: 'inputless';
        /** The explicit no-input marker is the only legal schema value. */
        readonly inputSchema?: 'none';
        readonly settle?: ActionSettleContract;
      }
    | {
        /** Direct and brokered invocation exposes one deliberate payload slot. */
        readonly invocation: 'scalar';
        /** Definition-side payload schema; never a live value reader. */
        readonly inputSchema?: object;
        readonly settle?: ActionSettleContract;
      }
    | {
        /** Host invocation preserves the exact receiver/listener arguments. */
        readonly invocation: 'host';
        readonly inputSchema?: never;
        /** Host continuations have no lifecycle parameter. */
        readonly settle?: ActionSettleWithoutProgress;
      }
  );

/**
 * The declaration view exposed by a defined action. Functions and opaque
 * validators keep their identity; declaration-shaped containers are readonly.
 * @inlineType DeepReadonly
 */
export type ReadonlyActionDefinitionContract =
  DeepReadonly<ActionDefinitionContract>;

/**
 * Recursively make declaration containers readonly while retaining callable
 * validators and readers as their original function types.
 * @inline
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
   * a principal port's `offers()` reads and retains it while minting an exact
   * bound offer.
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
  settle(settlement: ActionEffectSettlementInput): ActionEffectSettlement<Id>;
}

/** Facts supplied when opening one live binding. */
export interface ConnectActionOptions<
  Input,
  Output = unknown,
  Id extends string = string,
> extends ActionBindingUpdate<Input> {
  readonly node: string;
  readonly instance?: string;
  /**
   * Observe every invocation without pretending a host listener returns the
   * action mutation's output. Core does not own the host callback type, so its
   * host branch is deliberately `unknown`; framework bindings may refine it.
   */
  readonly onInvocation?: (
    invocation: ActionObservedInvocation<Output, unknown, Id>,
    settlement: ActionSettlementCapability<Id>,
  ) => void | PromiseLike<void>;
  /** Optional sink for observer failures; neither observer can replace app behavior. */
  readonly onInvocationError?: (error: unknown) => void | PromiseLike<void>;
  /**
   * Who invokes THIS connection through its direct doors (`invoke`,
   * `invokeContinuation`). Declared, never inferred: `humanReporting` says
   * which subsystem reports a person's interaction, not who called `invoke()`.
   * Checked against the definition's `principal.mayInvoke` at connect, so it
   * can never file an invocation under a principal the definition refuses.
   * Absent: direct invocations stay `'unknown'`. A caller other than this
   * one uses the principal port (`runtime.forPrincipal`), which stamps its own.
   */
  readonly invokedBy?: Exclude<Principal, 'unknown'>;
}

export interface ActionAttachment {
  detach(): void;
}

export type ActionInvocationSettlement<Output, Id extends string = string> =
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
      /** The governed kind the evidence is a value of — present exactly when
       *  the definition declared `settle.evidence`. */
      readonly evidenceKind?: string;
    }
  | {
      readonly status: 'refused';
      readonly transition: ActionTransitionRef<Id>;
      readonly reason: unknown;
    }
  | {
      /** Authoritative evidence can no longer arrive for this transition. */
      readonly status: 'abandoned';
      readonly transition: ActionTransitionRef<Id>;
      readonly authority: ActionAbandonmentAuthority;
    };

/** The explicit fact that authorizes an `abandoned` effect terminal. */
export type ActionAbandonmentAuthority =
  | {
      readonly kind: 'cancelled';
      readonly reason: unknown;
    }
  | {
      readonly kind: 'deadline';
      readonly deadlineAt: number;
    }
  | {
      readonly kind: 'evidence-exhausted';
      readonly sources: readonly string[];
    };

export type ActionEffectSettlementInput =
  | { readonly status: 'verified'; readonly evidence: unknown }
  | { readonly status: 'refused'; readonly reason: unknown }
  | {
      readonly status: 'abandoned';
      readonly authority: ActionAbandonmentAuthority;
    };

/** One retained progress report from the application handler. */
export interface ActionProgressObservation {
  readonly stage: string;
  readonly detail?: unknown;
}

/** What is knowable about declared progress at this instant. */
export type ActionProgressSnapshot =
  | {
      readonly disposition: 'open';
      readonly declared: readonly string[];
      readonly observed: readonly ActionProgressObservation[];
    }
  | {
      /** The application handler never started, so no stage was owed. */
      readonly disposition: 'not-started';
      readonly declared: readonly string[];
      readonly observed: readonly [];
    }
  | {
      readonly disposition: 'closed';
      readonly declared: readonly string[];
      readonly observed: readonly ActionProgressObservation[];
      /** Declared stages with no retained observation when invocation closed. */
      readonly unreported: readonly string[];
      /** Present only when `required` was declared and no stage was observed. */
      readonly integrity?: 'unmet';
    };

/** Retained and live progress for one exact transition. */
export interface ActionProgress {
  snapshot(): ActionProgressSnapshot;
  /** Immediately replays the current snapshot, then streams changes until closed. */
  subscribe(listener: (snapshot: ActionProgressSnapshot) => void): () => void;
}

/** Narrow, transition-owned capability optionally passed to an opted-in handler. */
export interface ActionLifecycle<
  Id extends string = string,
  Stage extends string = string,
> {
  readonly transition: ActionTransitionRef<Id>;
  /** Report one declared stage. Instrumentation failures never replace app behavior. */
  reportProgress(stage: Stage, detail?: unknown): void;
}

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

export interface ActionInvocation<
  Output,
  Id extends string = string,
  Behavior extends 'mutation' | 'host-continuation' =
    | 'mutation'
    | 'host-continuation',
> {
  readonly transition: ActionTransitionRef<Id>;
  /** Which application behavior this occurrence executed. */
  readonly behavior: Behavior;
  /** Auditable input origin; the payload value itself is deliberately not disclosed. */
  readonly input: Behavior extends 'host-continuation'
    ? Extract<ActionInvocationInput, { readonly source: 'host' }>
    : Behavior extends 'mutation'
      ? Exclude<ActionInvocationInput, { readonly source: 'host' }>
      : ActionInvocationInput;
  /** Invocation outcome. This promise always resolves; refusal/failure are data. */
  readonly whenInvoked: Promise<ActionInvocationSettlement<Output, Id>>;
  /** Authoritative effect observation. Handler completion never settles it. */
  readonly whenEffectSettled: Promise<ActionEffectSettlement<Id>>;
  /** Present only for a mutation whose definition declared progress stages. */
  readonly progress?: Behavior extends 'host-continuation'
    ? never
    : ActionProgress;
}

/**
 * Observer view of a connection occurrence. Direct/brokered calls produce the
 * action mutation's output; host continuations produce their own independent
 * listener result. `behavior` is the honest discriminator between them.
 */
export type ActionObservedInvocation<
  ActionOutput,
  HostOutput = unknown,
  Id extends string = string,
> =
  | ActionInvocation<ActionOutput, Id, 'mutation'>
  | ActionInvocation<HostOutput, Id, 'host-continuation'>;

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

/**
 * Whether this runtime will enforce the offer's declared input contract.
 * @inline
 */
export type ActionInputValidationDisposition =
  | 'not-declared'
  | 'active'
  | 'disclosure';

/** An offer whose invocation payload was captured from its live binding. */
export interface BoundActionOffer<
  Id extends string = string,
  F extends (...args: any[]) => any = (...args: any[]) => any,
  P extends Principal = Principal,
> {
  readonly ref: ActionOfferRef<Id, P> & {
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
  P extends Principal = Principal,
> {
  readonly ref: ActionOfferRef<Id, P> & { readonly input?: never };
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
  P extends Principal = Principal,
> {
  readonly ref: ActionOfferRef<Id, P> & { readonly input?: never };
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
  P extends Principal = Principal,
> =
  | BoundActionOffer<Id, F, P>
  | OpenActionOffer<Id, F, P>
  | InputlessActionOffer<Id, F, P>;

/** Offers possible for one known callable signature. */
export type ActionOfferFor<
  F extends (...args: any[]) => any,
  Id extends string = string,
  Mode extends ActionInvocationMode = ActionInvocationMode,
  P extends Principal = Principal,
> = Mode extends 'host'
  ? never
  : Mode extends 'inputless'
    ? InputlessActionOffer<Id, F, P>
    : Mode extends 'scalar'
      ? BoundActionOffer<Id, F, P> | OpenActionOffer<Id, F, P>
      : never;

/**
 * A settlement that arrived after this transition's terminal was already
 * decided — kept and marked late, never adopted and never silently dropped.
 *
 * First terminal wins, and the terminal never reopens. But the losing
 * evidence is still a FACT: a `verified` that arrived after an `abandoned`
 * is exactly the record an operator needs when deciding whether the
 * abandonment deadline is too aggressive. `claimed` is what the late caller
 * SAID — recorded as a claim, deliberately not validated as if it had been
 * accepted, because validation is a property of settlement and this was
 * never one.
 */
export interface ActionLateSettlement {
  /** The status the late caller claimed — a quotation, not a verdict. */
  readonly claimed: string;
  /** The evidence or reason it carried, snapshotted; absent when it carried none. */
  readonly payload?: unknown;
}

export interface ActionTransitionSnapshot {
  readonly ref: ActionTransitionRef;
  readonly input: ActionInvocationInput;
  readonly coverage: BindingCoverage;
  readonly invocationStatus: 'pending' | 'performed' | 'refused' | 'failed';
  readonly effectStatus: 'unverified' | 'verified' | 'refused' | 'abandoned';
  readonly produced?: unknown;
  readonly error?: unknown;
  readonly evidence?: unknown;
  /** Present exactly when the definition declared `settle.evidence` and the
   *  effect verified: the governed kind `evidence` is a value of. */
  readonly evidenceKind?: string;
  readonly reason?: unknown;
  readonly authority?: ActionAbandonmentAuthority;
  readonly progress?: ActionProgressSnapshot;
  /** Settlements that arrived after the terminal, in arrival order. Absent
   *  when none did — an empty list would claim "we watched and none came",
   *  which this snapshot cannot know. */
  readonly lateSettlements?: readonly ActionLateSettlement[];
  /**
   * Who this invocation is filed under, and what that claim is worth. Present
   * on every snapshot — "nobody claimed it" is information. A principal port
   * or a connection's `invokedBy` gives `'caller-asserted'` (the library
   * watched the call come through its own door; who stood behind it is the
   * integrator's word); neither gives basis and principal `'unknown'`.
   */
  readonly attribution: Attribution;
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
    ? () => ActionInvocation<Awaited<ReturnType<F>>, Id, 'mutation'>
    : Mode extends 'scalar'
      ? HasInputReader extends true
        ? () => ActionInvocation<Awaited<ReturnType<F>>, Id, 'mutation'>
        : (
            input: Parameters<F>[0],
          ) => ActionInvocation<Awaited<ReturnType<F>>, Id, 'mutation'>
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
  update<
    Update extends ActionBindingUpdate<
      Parameters<F> extends [] ? undefined : Parameters<F>[0]
    >,
  >(
    update: Update &
      (HasInputReader extends true
        ? Update extends { readonly input: undefined }
          ? never
          : unknown
        : 'input' extends keyof Update
          ? never
          : unknown),
  ): void;
  /** Publish a new committed fact generation when stable readers changed meaning. */
  touch(): void;
  readonly invoke: ActionInvoke<F, Id, HasInputReader, Mode>;
  /**
   * Open an invocation around a host listener continuation. The definition's
   * implementation is not also called: the continuation is this occurrence's
   * exact application behavior, so listener composition remains one act.
   */
  invokeContinuation<HostResult>(
    continuation: () => HostResult,
  ): ActionInvocation<Awaited<HostResult>, Id, 'host-continuation'>;
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
  /** `'evidence'` (2.6.0): the value is a verified settlement's evidence,
   *  checked against its governed kind's catalog schema. */
  readonly source: 'bound' | 'caller' | 'evidence';
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

/**
 * Which transitions to list — every filter optional, all of them ANDed.
 * `definition` takes the two forms `offers()` accepts; `binding` matches the
 * exact ref object; `instance` compares the opaque string, never parses it.
 */
export interface ActionTransitionQuery {
  readonly definition?: DefinedAction | ActionDefinitionRef;
  readonly binding?: ActionBindingRef;
  readonly instance?: string;
  readonly invocationStatus?:
    | ActionTransitionSnapshot['invocationStatus']
    | readonly ActionTransitionSnapshot['invocationStatus'][];
  readonly effectStatus?:
    | ActionTransitionSnapshot['effectStatus']
    | readonly ActionTransitionSnapshot['effectStatus'][];
}

/**
 * How much settled history the runtime keeps. `keep` counts FULLY settled
 * transitions (both rails terminal); past it the oldest are released, the
 * way `forgetTransition` would. A pending row is never counted and never
 * released.
 */
export interface ActionHistoryPolicy {
  readonly keep: number;
}

export interface ActionRuntimeOptions {
  /**
   * `require-active` (default) rejects clauses this small runtime cannot
   * enforce. Self-validating and adapter-supported input schemas are enforced;
   * unsupported formats are rejected in strict mode or disclosure-only when
   * `disclosure` is selected explicitly.
   */
  readonly contractActivation?: ActionContractActivation;
  /** Optional validator for schema formats that are otherwise disclosure-only. */
  readonly inputSchemaAdapter?: ActionInputSchemaAdapter;
  /**
   * The kind vocabulary this runtime is governed by — `declareKinds()` builds
   * the default; any object with synchronous `has()`/`describe()` serves.
   * Unmounted is a CHOICE the runtime keeps visible: declarations are then
   * accepted and reported ungoverned by `kindGovernance()`, never silently
   * unchecked. A mounted catalog must be immutable — answers are memoized.
   */
  readonly kinds?: import('./kinds.js').KindCatalog;
  /** Bound the settled history. Absent: every transition is kept until
   *  `forgetTransition` releases it (the pre-2.6 behaviour). */
  readonly history?: ActionHistoryPolicy;
}

/**
 * Principal-scoped offer and invocation authority. The principal belongs to
 * the reader, never to a live binding: one control may be offered to a person
 * while being withheld from an agent.
 */
export interface PrincipalActionPort<P extends Principal = Principal> {
  readonly principal: P;
  /** Invoke an exact retained bound or inputless offer minted for this principal. */
  invoke<F extends (...args: any[]) => any, Id extends string = string>(
    offer: BoundActionOffer<Id, F, P> | InputlessActionOffer<Id, F, P>,
  ): ActionInvocation<Awaited<ReturnType<F>>, Id, 'mutation'>;
  /** Invoke an exact retained open offer with its one required caller payload. */
  invoke<F extends (...args: any[]) => any, Id extends string = string>(
    offer: OpenActionOffer<Id, F, P>,
    input: Parameters<F>[0],
  ): ActionInvocation<Awaited<ReturnType<F>>, Id, 'mutation'>;
  /** Enumerate exact retained offers this principal is permitted to invoke. */
  offers<
    F extends (...args: any[]) => any,
    Id extends string = string,
    Mode extends ActionInvocationMode = ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
  ): readonly ActionOfferFor<DefinedAction<F, Id, Mode>, Id, Mode, P>[];
  offers<Ref extends ActionDefinitionRef>(
    definition: Ref,
  ): readonly ActionOffer<Ref['definitionId'], (...args: any[]) => any, P>[];
  offers(): readonly ActionOffer<string, (...args: any[]) => any, P>[];
}

/** Framework-neutral store and execution port for connected actions. */
export interface ActionRuntime {
  readonly contractActivation: ActionContractActivation;
  /** What this runtime can say about its own kind governance — mounted or
   *  not, the fingerprint, every kind seen, and the ungoverned remainder. */
  kindGovernance(): import('./kinds.js').KindGovernanceReport;
  /** Declare what one frontend surface can serve — collects and shows, by
   *  kind, governed by the mounted catalog. One live surface per id. */
  declareSurface(
    declaration: import('./channels.js').SurfaceDeclaration,
  ): import('./channels.js').SurfaceHandle;
  /** Who can collect this kind, or show it — and a MISS is recorded, not
   *  just returned empty: the degradation record is the backlog written by
   *  actual usage. */
  surfacesFor(
    query: import('./channels.js').SurfaceQuery,
  ): readonly import('./channels.js').SurfaceDeclaration[];
  /** Every kind somebody needed served and nothing could, counted. */
  channelGaps(): readonly import('./channels.js').ChannelGap[];
  /** Ask a person for one value of a governed kind, from an offered list —
   *  the HITL request lifecycle, offered-set law included. */
  requestInput(input: {
    readonly question: string;
    readonly of: string;
    readonly from: import('../atom/types.js').Principal;
    readonly offered: readonly (import('./request.js').RequestChoice | string)[];
  }): import('./request.js').InputRequestHandle;
  /** Every request still open, oldest first — what a surface renders. */
  openRequests(): readonly import('./request.js').InputRequestSnapshot[];
  /** Bind offer generation and invocation to one explicit reader principal. */
  forPrincipal<P extends Principal>(principal: P): PrincipalActionPort<P>;
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
      ? ConnectActionOptions<Parameters<F>[0], Awaited<ReturnType<F>>, Id> & {
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
    options: Omit<
      ConnectActionOptions<
        Mode extends 'scalar' ? Parameters<F>[0] : undefined,
        Awaited<ReturnType<F>>,
        Id
      >,
      'input'
    > & {
      readonly input?: never;
    },
  ): ActionConnection<F, Id, false, Mode>;
  bindings(definition?: ActionDefinitionRef): ActionBindingSnapshot[];
  bindingFor(binding: ActionBindingRef): ActionBindingSnapshot | undefined;
  transitionFor(
    transition: ActionTransitionRef,
  ): ActionTransitionSnapshot | undefined;
  /** Release a fully settled transition from runtime history. */
  forgetTransition(transition: ActionTransitionRef): boolean;
  /**
   * Every retained transition matching the query, OLDEST INVOCATION FIRST —
   * the order transitions were minted, which is the order a person or agent
   * asked for them (not the order they settled).
   */
  transitions(query?: ActionTransitionQuery): readonly ActionTransitionSnapshot[];
}
