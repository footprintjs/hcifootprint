/**
 * stored — the runtime's internal DATA shapes, and nothing else.
 *
 * Data separated from logic on purpose: these are the records the runtime
 * keeps between calls (a stored transition, a cached offer, the facts a
 * binding committed), and every file that OPERATES on them imports the
 * shape from here instead of redeclaring its own idea of it. One shape,
 * one owner, many operators.
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
import type { Attribution, Binding, Principal } from '../atom/types.js';
import type { HumanReporting, ReadonlyActionDefinitionContract, ActionInputValidationDisposition, ActionDefinitionRef, ActionLifecycle, ActionInputSource } from './types.js';
import type { BindingRegistration } from '../registry/registry.js';
import type { TransitionProgress } from './progress-ledger.js';

export const COVERAGE_RANK: Readonly<Record<BindingCoverage, number>> = Object.freeze({
  identity: 0,
  semantic: 1,
  executable: 2,
  verifiable: 3,
});
export const NO_BINDINGS: readonly Binding[] = Object.freeze([]);

export interface AttachedFacts {
  readonly token: number;
  readonly coverage: BindingCoverage;
  readonly locators?: readonly Binding[];
  readonly humanReporting?: HumanReporting;
}

export interface MutableBindingFacts<Input> {
  input?: () => Input;
  enabled?: () => boolean | undefined;
  busy?: () => string | undefined;
  coverage: BindingCoverage;
  locators: readonly Binding[];
  humanReporting?: HumanReporting;
}

export interface StoredTransition {
  readonly ref: ActionTransitionRef;
  readonly input: ActionInvocationInput;
  readonly coverage: BindingCoverage;
  /** Whether the definition named an authoritative way to prove its effect. */
  readonly verificationDeclared: boolean;
  /** Who the invocation is filed under — minted once, with `attributionOf`. */
  readonly attribution: Attribution;
  invocationStatus: 'pending' | 'performed' | 'refused' | 'failed';
  effectStatus: 'unverified' | 'verified' | 'refused' | 'abandoned';
  effectSettling?: boolean;
  produced?: unknown;
  error?: unknown;
  evidence?: unknown;
  reason?: unknown;
  authority?: ActionAbandonmentAuthority;
  progress?: TransitionProgress;
  effectSettlement?: ActionEffectSettlement;
  /** Settlements that arrived after the terminal — see ActionLateSettlement. */
  late?: ActionLateSettlement[];
  resolveEffect?: (settlement: ActionEffectSettlement<any>) => void;
}

export interface CachedOffer {
  readonly revision: number;
  readonly enabled: boolean | undefined;
  readonly busy: string | undefined;
  readonly coverage: BindingCoverage;
  readonly locators: readonly Binding[];
  readonly offer: ActionOffer;
  readonly capturedInput?: unknown;
}

export interface RuntimeBindingInvoker {
  readonly directScalar: boolean;
  readonly takesNoInput: boolean;
  readonly inputSchema: unknown;
  readonly inputValidation: ActionInputValidationDisposition;
  readonly invoke: (
    offer: ActionOfferRef,
    hasExplicitInput: boolean,
    input: unknown,
  ) => ActionInvocation<unknown, string, 'mutation'>;
}

