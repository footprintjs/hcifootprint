import type { Binding, Principal } from '../atom/types.js';
import {
  ActionRegistry,
  type ActionHandler,
  type BindingRegistration,
} from '../registry/registry.js';
import { takesNoInput } from '../traverse/expects.js';
import { checkPrincipalPolicy } from '../traverse/principal-policy.js';
import { actionDefinitionOf } from './definition.js';
import type {
  KindCatalog,
  KindGovernanceReport,
} from './kinds.js';
import type {
  ChannelGap,
  SurfaceDeclaration,
  SurfaceHandle,
  SurfaceQuery,
} from './channels.js';
import { assertBindingCoverage } from './coverage.js';
import type {
  ActionDefinitionRef,
  ActionDefinitionRecord,
  ActionBindingRef,
  ActionRuntime,
  ActionRuntimeOptions,
  ActionBindingSnapshot,
  ActionBindingUpdate,
  ActionConnection,
  ActionContractActivation,
  ActionAbandonmentAuthority,
  ActionLateSettlement,
  ActionEffectSettlement,
  ActionEffectSettlementInput,
  ActionInvocation,
  ActionInvocationInput,
  ActionInvocationSettlement,
  ActionInvocationMode,
  ActionObservedInvocation,
  ActionLifecycle,
  ActionProgress,
  ActionProgressObservation,
  ActionProgressSnapshot,
  ActionInputRef,
  ActionInputSchemaAdapter,
  ActionInputSource,
  ActionInputValidationDisposition,
  ActionOffer,
  ActionOfferRef,
  ActionTransitionRef,
  ActionTransitionSnapshot,
  BindingCoverage,
  BindingProjection,
  ConnectActionOptions,
  DefinedAction,
  HumanReporting,
  PrincipalActionPort,
  ReadonlyActionDefinitionContract,
} from './types.js';

const COVERAGE_RANK: Readonly<Record<BindingCoverage, number>> = Object.freeze({
  identity: 0,
  semantic: 1,
  executable: 2,
  verifiable: 3,
});
const NO_BINDINGS: readonly Binding[] = Object.freeze([]);

interface AttachedFacts {
  readonly token: number;
  readonly coverage: BindingCoverage;
  readonly locators?: readonly Binding[];
  readonly humanReporting?: HumanReporting;
}

interface MutableBindingFacts<Input> {
  input?: () => Input;
  enabled?: () => boolean | undefined;
  busy?: () => string | undefined;
  coverage: BindingCoverage;
  locators: readonly Binding[];
  humanReporting?: HumanReporting;
}

interface StoredTransition {
  readonly ref: ActionTransitionRef;
  readonly input: ActionInvocationInput;
  readonly coverage: BindingCoverage;
  /** Whether the definition named an authoritative way to prove its effect. */
  readonly verificationDeclared: boolean;
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

interface TransitionProgress {
  readonly channel: ActionProgress;
  readonly lifecycle?: ActionLifecycle;
  snapshot(): ActionProgressSnapshot;
  close(): void;
}

interface CachedOffer {
  readonly revision: number;
  readonly enabled: boolean | undefined;
  readonly busy: string | undefined;
  readonly coverage: BindingCoverage;
  readonly locators: readonly Binding[];
  readonly offer: ActionOffer;
  readonly capturedInput?: unknown;
}

interface RuntimeBindingInvoker {
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

type FirstParameter<F extends (...args: any[]) => any> =
  Parameters<F> extends [] ? undefined : Parameters<F>[0];

const INVOCATION_OBSERVER_CAPTURE = Symbol(
  'hcifootprint.invocation-observer-capture',
);

/**
 * Internal adapter protocol for snapshotting a dynamic observer generation
 * before application behavior begins, without changing the public callback.
 * @internal
 */
export function withObserverCapture<
  Observer extends (...args: any[]) => unknown,
>(observer: Observer, capture: () => Observer | undefined): Observer {
  Object.defineProperty(observer, INVOCATION_OBSERVER_CAPTURE, {
    configurable: false,
    enumerable: false,
    value: capture,
    writable: false,
  });
  return observer;
}

/** Structured refusal produced when an exact invocation payload fails its declared schema. */
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

/** Create an isolated framework-neutral action-binding runtime. */
export function createActionRuntime(
  options: ActionRuntimeOptions = {},
): ActionRuntime {
  return new DefaultActionRuntime(options);
}

/**
 * Connect one stable live binding of an already-declared callable action.
 *
 * @param runtime Isolated owner of bindings, offers, and transitions.
 * @param definition Exact callable returned by `defineAction()`.
 * @param options Always requires `node`. The overload returning an
 * input-reader connection is scalar-only and requires `input: () => payload`;
 * inputless and host definitions forbid that reader.
 */
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
>(
  runtime: ActionRuntime,
  definition: DefinedAction<F, Id, Mode>,
  options: Mode extends 'scalar'
    ? ConnectActionOptions<Parameters<F>[0], Awaited<ReturnType<F>>, Id> & {
        readonly input: () => Parameters<F>[0];
      }
    : never,
): ActionConnection<F, Id, true, Mode>;
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
>(
  runtime: ActionRuntime,
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
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
>(
  runtime: ActionRuntime,
  definition: DefinedAction<F, Id, Mode>,
  options: ConnectActionOptions<
    Mode extends 'scalar' ? Parameters<F>[0] : undefined,
    Awaited<ReturnType<F>>,
    Id
  >,
): ActionConnection<F, Id, true, Mode> | ActionConnection<F, Id, false, Mode> {
  const connect = runtime.connect as (
    this: ActionRuntime,
    selected: DefinedAction<F, Id, Mode>,
    selectedOptions: ConnectActionOptions<
      Mode extends 'scalar' ? Parameters<F>[0] : undefined,
      Awaited<ReturnType<F>>,
      Id
    >,
  ) =>
    | ActionConnection<F, Id, true, Mode>
    | ActionConnection<F, Id, false, Mode>;
  return connect.call(runtime, definition, options);
}

class DefaultActionRuntime implements ActionRuntime {
  readonly #contractActivation: ActionContractActivation;
  readonly #inputSchemaAdapter: ActionInputSchemaAdapter | undefined;
  readonly #kinds: KindCatalog | undefined;
  /** A mounted catalog is immutable, so an answer is a fact forever — the
   *  runtime consults it once per kind, EVER, and an adapter's cost can
   *  never reach the offer-serving path. */
  readonly #kindMemo = new Map<string, boolean>();
  readonly #kindsSeen = new Set<string>();
  readonly #ungovernedKinds = new Set<string>();
  readonly #surfaces = new Map<string, SurfaceDeclaration>();
  readonly #channelGaps = new Map<string, { kind: string; channel: 'collects' | 'shows'; asks: number }>();
  readonly #registry = new ActionRegistry();
  readonly #offers = new Map<string, ActionOffer>();
  readonly #offerByBinding = new Map<string, Map<Principal, CachedOffer>>();
  readonly #invokers = new Map<string, RuntimeBindingInvoker>();
  readonly #transitions = new Map<string, StoredTransition>();
  readonly #definitions = new Map<string, DefinedAction>();
  readonly #definitionRecords = new Map<string, ActionDefinitionRecord>();
  #bindingSequence = 0;
  #offerSequence = 0;
  #inputSequence = 0;
  #transitionSequence = 0;

  constructor(options: ActionRuntimeOptions) {
    const activation = options.contractActivation ?? 'require-active';
    if (activation !== 'require-active' && activation !== 'disclosure') {
      throw new TypeError(
        `hcifootprint: invalid contractActivation '${String(activation)}'; expected require-active or disclosure.`,
      );
    }
    const inputSchemaAdapter = options.inputSchemaAdapter;
    const adapterSupports = inputSchemaAdapter?.supports;
    const adapterValidate = inputSchemaAdapter?.validate;
    if (
      inputSchemaAdapter !== undefined &&
      (inputSchemaAdapter === null ||
        typeof inputSchemaAdapter !== 'object' ||
        typeof adapterSupports !== 'function' ||
        typeof adapterValidate !== 'function')
    ) {
      throw new TypeError(
        'hcifootprint: inputSchemaAdapter needs synchronous supports() and validate() methods.',
      );
    }
    const kinds = options.kinds;
    if (
      kinds !== undefined &&
      (kinds === null ||
        typeof kinds !== 'object' ||
        typeof kinds.has !== 'function' ||
        typeof kinds.describe !== 'function')
    ) {
      throw new TypeError(
        'hcifootprint: kinds must be a KindCatalog with synchronous has() and describe() — declareKinds() builds the default.',
      );
    }
    this.#kinds = kinds;
    this.#contractActivation = activation;
    this.#inputSchemaAdapter =
      inputSchemaAdapter === undefined
        ? undefined
        : Object.freeze({
            supports: adapterSupports!.bind(inputSchemaAdapter),
            validate: adapterValidate!.bind(inputSchemaAdapter),
          });
    Object.defineProperty(this, 'contractActivation', {
      configurable: false,
      enumerable: false,
      value: activation,
      writable: false,
    });
  }

  get contractActivation(): ActionContractActivation {
    return this.#contractActivation;
  }

  kindGovernance(): KindGovernanceReport {
    return Object.freeze({
      mounted: this.#kinds !== undefined,
      ...(this.#kinds?.fingerprint !== undefined
        ? { fingerprint: this.#kinds.fingerprint }
        : {}),
      kindsSeen: Object.freeze([...this.#kindsSeen].sort()),
      ungoverned: Object.freeze([...this.#ungovernedKinds].sort()),
    });
  }

  /**
   * Connect-time kind enforcement — fail where the developer is looking,
   * not at match time three layers later. With no catalog mounted the
   * declaration is ACCEPTED and recorded as ungoverned: silently unchecked
   * would be the unarmed-check disease, and refusing outright would make
   * governance mandatory before anyone can try the feature. The report
   * (`kindGovernance()`) is the visible row either way.
   */
  #checkDeclaredKinds(record: ActionDefinitionRecord): void {
    const contract = record.contract as {
      readonly needs?: Readonly<Record<string, { readonly kind: string }>>;
      readonly produces?: { readonly kind: string };
    };
    const declared: string[] = [];
    if (contract.needs !== undefined) {
      for (const need of Object.values(contract.needs)) declared.push(need.kind);
    }
    if (contract.produces !== undefined) declared.push(contract.produces.kind);
    for (const kind of declared) {
      this.#governKind(kind, `'${record.ref.definitionId}' declares`);
    }
  }

  /** One kind through governance: seen always; refused when a mounted
   *  catalog does not hold it; recorded ungoverned when nothing is mounted.
   *  Memoized because a mounted catalog is immutable — consulted once per
   *  kind, ever. */
  #governKind(kind: string, owner: string): void {
    this.#kindsSeen.add(kind);
    if (this.#kinds === undefined) {
      this.#ungovernedKinds.add(kind);
      return;
    }
    let known = this.#kindMemo.get(kind);
    if (known === undefined) {
      known = this.#kinds.has(kind) === true;
      this.#kindMemo.set(kind, known);
    }
    if (!known) {
      throw new Error(
        `hcifootprint: ${owner} kind '${kind}', which the mounted catalog does not govern. Declare it in the catalog, or use a kind the catalog holds — matching is exact identity, and an unknown kind would make every future match a guess.`,
      );
    }
  }

  declareSurface(declaration: SurfaceDeclaration): SurfaceHandle {
    if (
      declaration === null ||
      typeof declaration !== 'object' ||
      typeof declaration.surface !== 'string' ||
      declaration.surface.trim().length === 0 ||
      typeof declaration.node !== 'string' ||
      declaration.node.trim().length === 0
    ) {
      throw new TypeError(
        'hcifootprint: declareSurface() needs a record with a non-empty surface id and node path.',
      );
    }
    if (this.#surfaces.has(declaration.surface)) {
      throw new Error(
        `hcifootprint: surface '${declaration.surface}' is already declared and live — one id, one surface. Retire the live one first, or name this one for what it actually is.`,
      );
    }
    const collects = Object.freeze([...(declaration.collects ?? [])]);
    const shows = Object.freeze([...(declaration.shows ?? [])]);
    for (const kind of collects) {
      this.#governKind(kind, `surface '${declaration.surface}' collects`);
    }
    for (const kind of shows) {
      this.#governKind(kind, `surface '${declaration.surface}' shows`);
    }
    const frozen: SurfaceDeclaration = Object.freeze({
      surface: declaration.surface,
      node: declaration.node,
      collects,
      shows,
    });
    this.#surfaces.set(frozen.surface, frozen);
    let live = true;
    return Object.freeze({
      declaration: frozen,
      retire: () => {
        // Idempotent and OWNED: only the surface this handle declared is
        // retired — a successor under the same id belongs to its own handle,
        // and a stale retire must never take it down.
        if (!live) return false;
        live = false;
        if (this.#surfaces.get(frozen.surface) === frozen) {
          this.#surfaces.delete(frozen.surface);
        }
        return true;
      },
    });
  }

  surfacesFor(query: SurfaceQuery): readonly SurfaceDeclaration[] {
    const collecting = 'collects' in query;
    const kind = collecting
      ? (query as { collects: string }).collects
      : (query as { shows: string }).shows;
    if (typeof kind !== 'string' || kind.trim().length === 0) {
      throw new TypeError(
        'hcifootprint: surfacesFor() needs { collects: kind } or { shows: kind } with a non-empty kind.',
      );
    }
    // A query is kind-governed like a declaration — otherwise the gap
    // record fills with typos and stops meaning anything.
    this.#governKind(kind, 'surfacesFor() asks about');
    const channel = collecting ? ('collects' as const) : ('shows' as const);
    const matches = [...this.#surfaces.values()].filter((surface) =>
      (collecting ? surface.collects : surface.shows)?.includes(kind),
    );
    if (matches.length === 0) {
      // THE DEGRADATION RECORD — the ask is a fact worth keeping. An empty
      // answer alone would be absence rendered as silence; the counted gap
      // is what turns a month of degraded turns into a backlog.
      const key = `${channel}:${kind}`;
      const row = this.#channelGaps.get(key);
      if (row === undefined) {
        this.#channelGaps.set(key, { kind, channel, asks: 1 });
      } else {
        row.asks += 1;
      }
    }
    return Object.freeze(matches);
  }

  channelGaps(): readonly ChannelGap[] {
    return Object.freeze(
      [...this.#channelGaps.values()]
        .map((row) => Object.freeze({ ...row }))
        .sort((a, b) =>
          a.kind === b.kind
            ? a.channel.localeCompare(b.channel)
            : a.kind.localeCompare(b.kind),
        ),
    );
  }

  forPrincipal<P extends Principal>(principal: P): PrincipalActionPort<P> {
    assertPrincipal(principal, 'forPrincipal()');
    const invoke = ((offer: ActionOffer, ...input: unknown[]) =>
      this.#invokeOffer(
        principal,
        offer,
        input,
      )) as PrincipalActionPort<P>['invoke'];
    const offers = ((definition?: ActionDefinitionRef | DefinedAction) =>
      this.#availableFor(
        principal,
        definition,
      )) as PrincipalActionPort<P>['offers'];
    return Object.freeze({ principal, invoke, offers });
  }

  connect<
    F extends (...args: any[]) => any,
    Id extends string,
    Mode extends ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
    options: ConnectActionOptions<
      FirstParameter<F>,
      Awaited<ReturnType<F>>,
      Id
    > & {
      readonly input: () => FirstParameter<F>;
    },
  ): ActionConnection<F, Id, true, Mode>;
  connect<
    F extends (...args: any[]) => any,
    Id extends string,
    Mode extends ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
    options: ConnectActionOptions<
      FirstParameter<F>,
      Awaited<ReturnType<F>>,
      Id
    >,
  ): ActionConnection<F, Id, false, Mode>;
  connect<
    F extends (...args: any[]) => any,
    Id extends string,
    Mode extends ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
    options: ConnectActionOptions<
      FirstParameter<F>,
      Awaited<ReturnType<F>>,
      Id
    >,
  ):
    | ActionConnection<F, Id, true, Mode>
    | ActionConnection<F, Id, false, Mode> {
    const record = actionDefinitionOf(definition);
    if (record === undefined) {
      throw new TypeError(
        'hcifootprint: connectAction() needs a callable created by defineAction().',
      );
    }
    this.#checkDeclaredKinds(record);
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options)
    ) {
      throw new TypeError(
        'hcifootprint: connectAction() needs a binding options record.',
      );
    }
    // Application options may be supplied through accessors or proxies. Read
    // every field exactly once, then validate and retain only these captured
    // values so one connection can never combine different answers.
    const node = options.node;
    const instance = options.instance;
    const input = options.input;
    const enabled = options.enabled;
    const busy = options.busy;
    const coverage = options.coverage;
    const locators = options.locators;
    const humanReporting = options.humanReporting;
    const onInvocation = options.onInvocation;
    const onInvocationError = options.onInvocationError;

    if (typeof node !== 'string' || node.trim().length === 0) {
      throw new TypeError(
        'hcifootprint: connectAction() needs a non-empty node path.',
      );
    }
    if (instance !== undefined && typeof instance !== 'string') {
      throw new TypeError(
        'hcifootprint: connectAction() instance must be an opaque string when supplied.',
      );
    }
    assertOptionalReader(input, 'input', 'connectAction()');
    assertOptionalReader(enabled, 'enabled', 'connectAction()');
    assertOptionalReader(busy, 'busy', 'connectAction()');
    assertOptionalReader(onInvocation, 'onInvocation', 'connectAction()');
    assertOptionalReader(
      onInvocationError,
      'onInvocationError',
      'connectAction()',
    );
    assertHumanReporting(humanReporting, 'connectAction()');
    const initialCoverage = coverage ?? 'executable';
    assertBindingCoverage(initialCoverage, 'connectAction()');
    const validationSchema = captureInputValidationSchema(
      record.contract.inputSchema,
    );
    const inputValidation = resolveInputValidation(
      validationSchema,
      this.#inputSchemaAdapter,
    );
    assertContractActivation(
      record.ref.definitionId,
      record.contract,
      this.#contractActivation,
      inputValidation,
    );
    const verificationDeclared = hasEvidenceBearingSettlement(
      record.contract.settle,
    );
    const canonical = this.#definitions.get(record.ref.definitionId);
    if (canonical !== undefined && canonical !== definition) {
      throw new TypeError(
        `hcifootprint: definition '${record.ref.definitionId}' already belongs to another callable in this runtime. Reuse the original defineAction() result or create a new runtime generation.`,
      );
    }

    const binding = Object.freeze({
      kind: 'action-binding' as const,
      bindingId: `binding#${(this.#bindingSequence += 1)}`,
      definition: record.ref,
      node,
      ...(instance !== undefined ? { instance } : {}),
    });
    const base: MutableBindingFacts<FirstParameter<F>> = {
      coverage: initialCoverage,
      locators: locators === undefined ? NO_BINDINGS : freezeBindings(locators),
      ...(input !== undefined ? { input } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(busy !== undefined ? { busy } : {}),
      ...(humanReporting !== undefined ? { humanReporting } : {}),
    };
    const inputReaderPresent = base.input !== undefined;
    const invocationMode = record.contract.invocation;
    if (inputReaderPresent && invocationMode !== 'scalar') {
      throw new TypeError(
        `hcifootprint: action definition '${record.ref.definitionId}' declares invocation: '${invocationMode}' and cannot connect a scalar input reader.`,
      );
    }
    const definitionTakesNoInput = invocationMode === 'inputless';

    this.#registry.registerBinding(
      binding.bindingId,
      binding,
      definition as unknown as ActionHandler,
      true,
      undefined,
      {
        coverage: base.coverage,
        attached: false,
        locators: base.locators,
        ...(base.input !== undefined ? { input: base.input } : {}),
        ...(base.enabled !== undefined ? { readEnabled: base.enabled } : {}),
        ...(base.busy !== undefined ? { readBusy: base.busy } : {}),
        ...(base.humanReporting !== undefined
          ? { humanReporting: base.humanReporting }
          : {}),
      },
    );
    // Definition identity is canonical for this runtime generation, including
    // after every live binding disconnects and while transitions remain.
    this.#definitions.set(record.ref.definitionId, definition);
    this.#definitionRecords.set(record.ref.definitionId, record);

    let connected = true;
    let attachmentSequence = 0;
    let attachment: AttachedFacts | undefined;
    const runtime = this;

    const assertConnected = (): BindingRegistration => {
      if (!connected) {
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is disconnected.`,
        );
      }
      const registration = this.#registry.registrationFor(binding);
      if (registration === undefined) {
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is no longer present.`,
        );
      }
      return registration;
    };

    const sync = (forceRevision = false): void => {
      if (!connected) return;
      const effective = attachment;
      const changed = this.#registry.updateBinding(binding, {
        coverage: effective?.coverage ?? base.coverage,
        attached: effective !== undefined,
        locators: effective?.locators ?? base.locators,
        humanReporting: effective?.humanReporting ?? base.humanReporting,
        input: base.input,
        readEnabled: base.enabled,
        readBusy: base.busy,
      });
      if (forceRevision && !changed) this.#registry.touchBinding(binding);
      if (changed || forceRevision) runtime.#invalidateOffers(binding);
    };

    const reportObserverError = (
      errorSink: typeof onInvocationError,
      error: unknown,
    ): void => {
      if (errorSink === undefined) return;
      try {
        void Promise.resolve(errorSink(error)).catch(() => undefined);
      } catch {
        // Instrumentation failures never replace the application result.
      }
    };

    const captureObserver = <Observer extends (...args: any[]) => unknown>(
      observer: Observer | undefined,
      onCaptureError: (error: unknown) => void = () => undefined,
    ): Observer | undefined => {
      if (observer === undefined) return undefined;
      const capture = (
        observer as Observer & {
          readonly [INVOCATION_OBSERVER_CAPTURE]?: () => Observer | undefined;
        }
      )[INVOCATION_OBSERVER_CAPTURE];
      if (capture === undefined) return observer;
      try {
        const captured = capture();
        if (captured === undefined || typeof captured === 'function') {
          return captured;
        }
        onCaptureError(
          new TypeError(
            'hcifootprint: an invocation observer capture must return a callback or undefined.',
          ),
        );
      } catch (error) {
        onCaptureError(error);
      }
      return undefined;
    };

    const publishInvocation = <
      Output,
      Behavior extends 'mutation' | 'host-continuation',
    >(
      invocation: ActionInvocation<Output, Id, Behavior>,
      observer: typeof onInvocation,
      reportInstrumentationError: (error: unknown) => void,
    ): ActionInvocation<Output, Id, Behavior> => {
      if (observer === undefined) return invocation;
      const settlement = Object.freeze({
        binding,
        settle: (effect: ActionEffectSettlementInput) =>
          runtime.#settle(invocation.transition, effect),
      });
      try {
        void Promise.resolve(
          observer(
            invocation as ActionObservedInvocation<
              Awaited<ReturnType<F>>,
              unknown,
              Id
            >,
            settlement,
          ),
        ).catch(reportInstrumentationError);
      } catch (error) {
        reportInstrumentationError(error);
      }
      return invocation;
    };

    const openInvocation = <
      Behavior extends 'mutation' | 'host-continuation',
      Output = Awaited<ReturnType<F>>,
    >(
      handler: ActionHandler,
      hasInput: boolean,
      input: unknown,
      offer: ActionOfferRef<Id> | undefined,
      behavior: Behavior,
      invocationInput: Behavior extends 'host-continuation'
        ? Extract<ActionInvocationInput, { readonly source: 'host' }>
        : Exclude<ActionInvocationInput, { readonly source: 'host' }>,
      coverage: BindingCoverage,
      phase: 'handler' | 'preflight' = 'handler',
    ): ActionInvocation<Output, Id, Behavior> => {
      const errorSink = captureObserver(onInvocationError);
      const reportInstrumentationError = (error: unknown): void =>
        reportObserverError(errorSink, error);
      const observer = captureObserver(
        onInvocation,
        reportInstrumentationError,
      );
      const invocation = runtime.#invoke<Output, Id, Behavior>(
        binding,
        handler,
        hasInput,
        input,
        offer,
        behavior,
        invocationInput,
        coverage,
        phase,
        verificationDeclared,
        record.contract.settle?.progress,
        reportInstrumentationError,
      );
      return publishInvocation(
        invocation,
        observer,
        reportInstrumentationError,
      );
    };

    const invokeSelected = (
      hasExplicitInput: boolean,
      input: FirstParameter<F> | undefined,
      offered: ActionOfferRef<Id> | undefined,
    ): ActionInvocation<Awaited<ReturnType<F>>, Id, 'mutation'> => {
      let registration = assertConnected();
      let enabled: boolean | undefined;
      try {
        enabled = readEnabled(registration);
        registration = runtime.#requireCurrent(
          binding,
          registration,
          'reading enabledness',
        );
      } catch (error) {
        runtime.#invalidateOffers(binding);
        throw error;
      }
      if (enabled === false) {
        runtime.#invalidateOffers(binding);
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is disabled.`,
        );
      }
      if (COVERAGE_RANK[registration.coverage] < COVERAGE_RANK.executable) {
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is not executable (coverage: ${registration.coverage}).`,
        );
      }
      const selectedOffer = runtime.#validateOffer(
        binding,
        offered,
        registration,
        enabled,
      );

      let capturedInput = input;
      let hasInput = hasExplicitInput;
      let inputRef:
        | ActionInputRef<'bound'>
        | ActionInputRef<'caller'>
        | undefined;
      if (selectedOffer?.offer.inputMode === 'bound') {
        if (hasExplicitInput) {
          throw new TypeError(
            `hcifootprint: offer '${selectedOffer.offer.ref.offerId}' already binds its exact input; invoke it without a replacement payload.`,
          );
        }
        capturedInput = selectedOffer.capturedInput as FirstParameter<F>;
        hasInput = true;
        inputRef = selectedOffer.offer.input;
      } else if (selectedOffer?.offer.inputMode === 'none') {
        if (hasExplicitInput) {
          throw new TypeError(
            `hcifootprint: offer '${selectedOffer.offer.ref.offerId}' takes no input.`,
          );
        }
      } else if (offered === undefined && registration.input !== undefined) {
        if (hasExplicitInput) {
          throw new TypeError(
            `hcifootprint: binding '${binding.bindingId}' owns a bound input reader; invoke it without a replacement payload.`,
          );
        }
        try {
          capturedInput = registration.input() as FirstParameter<F>;
        } catch (error) {
          registration = runtime.#requireCurrent(
            binding,
            registration,
            'reading input',
          );
          return openInvocation(
            () => {
              throw error;
            },
            false,
            undefined,
            undefined,
            'mutation',
            Object.freeze({ source: 'bound', provided: false }),
            registration.coverage,
            'preflight',
          );
        }
        hasInput = true;
        inputRef = runtime.#newInputRef('bound');
        registration = runtime.#requireCurrent(
          binding,
          registration,
          'reading input',
        );
      } else if (hasExplicitInput) {
        inputRef = runtime.#newInputRef('caller');
      }
      if (
        invocationMode === 'scalar' &&
        selectedOffer?.offer.inputMode !== 'bound' &&
        registration.input === undefined &&
        !hasExplicitInput
      ) {
        throw new TypeError(
          `hcifootprint: scalar action '${record.ref.definitionId}' requires exactly one deliberate input payload slot. Pass undefined explicitly when undefined is the intended value.`,
        );
      }
      const invocationInput: ActionInvocationInput =
        inputRef?.source === 'bound'
          ? Object.freeze({ source: 'bound', provided: true, ref: inputRef })
          : inputRef?.source === 'caller'
            ? Object.freeze({ source: 'caller', provided: true, ref: inputRef })
            : selectedOffer?.offer.inputMode === 'open' ||
                (offered === undefined && !definitionTakesNoInput)
              ? Object.freeze({ source: 'caller', provided: false })
              : Object.freeze({ source: 'none', provided: false });
      // A bound offer already validated this exact retained value when it was
      // minted. Do not execute an application-owned validator a second time at
      // invocation; open and direct doors still validate at their ingress.
      if (selectedOffer?.offer.inputMode !== 'bound') {
        let validationError: unknown;
        try {
          validateActionInput(
            binding,
            validationSchema,
            hasInput,
            capturedInput,
            inputRef?.source === 'bound' ? 'bound' : 'caller',
            runtime.#inputSchemaAdapter,
            inputValidation,
          );
        } catch (error) {
          validationError = error;
        }
        try {
          registration = runtime.#requireCurrent(
            binding,
            registration,
            'validating input',
          );
        } catch (error) {
          runtime.#invalidateOffers(binding);
          throw error;
        }
        if (validationError !== undefined) {
          return openInvocation(
            () => {
              throw validationError;
            },
            false,
            undefined,
            selectedOffer?.offer.ref as ActionOfferRef<Id> | undefined,
            'mutation',
            invocationInput,
            registration.coverage,
            'preflight',
          );
        }
      }
      return openInvocation(
        registration.handler,
        hasInput,
        capturedInput,
        selectedOffer?.offer.ref as ActionOfferRef<Id> | undefined,
        'mutation',
        invocationInput,
        registration.coverage,
      );
    };

    const assertDirectScalarDoor = (payloadSlots: number): void => {
      if (payloadSlots > 1) {
        throw new TypeError(
          'hcifootprint: direct action invocation accepts at most one payload slot; use invokeContinuation() for a host listener with several arguments.',
        );
      }
      if (invocationMode === 'host') {
        throw new TypeError(
          `hcifootprint: action definition '${record.ref.definitionId}' is host-only and cannot use the direct invocation door; use invokeContinuation().`,
        );
      }
      if (invocationMode === 'inputless' && payloadSlots > 0) {
        throw new TypeError(
          `hcifootprint: inputless action definition '${record.ref.definitionId}' cannot receive a payload slot.`,
        );
      }
    };

    const connection: ActionConnection<F, Id, true, Mode> = {
      definition: record.ref,
      binding,
      attach: (projection: BindingProjection) => {
        const beforeProjection = assertConnected();
        if (projection === null || typeof projection !== 'object') {
          throw new TypeError(
            'hcifootprint: attach() needs an already-resolved interactive host.',
          );
        }
        const interactive = projection.interactive;
        const valueElement = projection.valueElement;
        const projectedCoverage = projection.coverage;
        const projectedLocators = projection.locators;
        const projectedHumanReporting = projection.humanReporting;
        if (
          interactive === null ||
          (typeof interactive !== 'object' && typeof interactive !== 'function')
        ) {
          throw new TypeError(
            'hcifootprint: attach() needs an already-resolved interactive host.',
          );
        }
        if (
          valueElement !== undefined &&
          (valueElement === null ||
            (typeof valueElement !== 'object' &&
              typeof valueElement !== 'function'))
        ) {
          throw new TypeError(
            'hcifootprint: attach() valueElement must be an object when supplied.',
          );
        }
        assertBindingCoverage(projectedCoverage, 'attach()');
        assertHumanReporting(projectedHumanReporting, 'attach()');
        const frozenLocators =
          projectedLocators === undefined
            ? undefined
            : freezeBindings(projectedLocators);
        runtime.#requireCurrent(
          binding,
          beforeProjection,
          'reading the attachment projection',
        );
        const token = (attachmentSequence += 1);
        attachment = {
          token,
          coverage: projectedCoverage,
          ...(frozenLocators !== undefined ? { locators: frozenLocators } : {}),
          ...(projectedHumanReporting !== undefined
            ? { humanReporting: projectedHumanReporting }
            : {}),
        };
        sync(true);
        let detached = false;
        return Object.freeze({
          detach: (): void => {
            if (detached) return;
            detached = true;
            if (attachment?.token !== token) return;
            attachment = undefined;
            sync(true);
          },
        });
      },
      update: (update: ActionBindingUpdate<FirstParameter<F>>) => {
        const beforeUpdate = assertConnected();
        if (
          update === null ||
          typeof update !== 'object' ||
          Array.isArray(update)
        ) {
          throw new TypeError(
            'hcifootprint: update() needs a binding-facts record.',
          );
        }
        const hasInputUpdate = 'input' in update;
        const hasEnabledUpdate = 'enabled' in update;
        const hasBusyUpdate = 'busy' in update;
        const hasLocatorsUpdate = 'locators' in update;
        const hasHumanReportingUpdate = 'humanReporting' in update;
        const nextInput = hasInputUpdate ? update.input : undefined;
        const nextEnabled = hasEnabledUpdate ? update.enabled : undefined;
        const nextBusy = hasBusyUpdate ? update.busy : undefined;
        const nextCoverage = update.coverage;
        const nextLocators = hasLocatorsUpdate ? update.locators : undefined;
        const nextHumanReporting = hasHumanReportingUpdate
          ? update.humanReporting
          : undefined;

        if (hasInputUpdate) {
          if (nextInput === undefined) {
            throw new TypeError(
              `hcifootprint: binding '${binding.bindingId}' cannot remove its input reader through update(); reconnect to change that capability.`,
            );
          }
          assertOptionalReader(nextInput, 'input', 'update()');
        }
        if (hasEnabledUpdate) {
          assertOptionalReader(nextEnabled, 'enabled', 'update()');
        }
        if (hasBusyUpdate) {
          assertOptionalReader(nextBusy, 'busy', 'update()');
        }
        if (hasHumanReportingUpdate) {
          assertHumanReporting(nextHumanReporting, 'update()');
        }
        if (nextCoverage !== undefined) {
          assertBindingCoverage(nextCoverage, 'update()');
        }
        const frozenLocators = hasLocatorsUpdate
          ? nextLocators === undefined
            ? NO_BINDINGS
            : freezeBindings(nextLocators)
          : undefined;
        runtime.#requireCurrent(
          binding,
          beforeUpdate,
          'reading updated binding facts',
        );

        // Reader presence is stable for this connection's type-state. Replace
        // a reader in place; reconnect to add or remove the input capability.
        if (hasInputUpdate && nextInput !== undefined) {
          if (!inputReaderPresent) {
            throw new Error(
              `hcifootprint: binding '${binding.bindingId}' was connected without an input reader; reconnect to add that capability.`,
            );
          }
          base.input = nextInput;
        }
        if (hasEnabledUpdate) base.enabled = nextEnabled;
        if (hasBusyUpdate) base.busy = nextBusy;
        if (nextCoverage !== undefined) base.coverage = nextCoverage;
        if (hasLocatorsUpdate) {
          base.locators = frozenLocators as readonly Binding[];
        }
        if (hasHumanReportingUpdate) {
          base.humanReporting = nextHumanReporting;
        }
        sync();
      },
      touch: () => {
        assertConnected();
        // Explicitly publish that stable reader identities may now answer from
        // a different committed application generation. No reader is run.
        sync(true);
      },
      invoke: function (input?: FirstParameter<F>) {
        assertDirectScalarDoor(arguments.length);
        return invokeSelected(arguments.length > 0, input, undefined);
      } as ActionConnection<F, Id, true, Mode>['invoke'],
      invokeContinuation: <HostResult>(continuation: () => HostResult) => {
        const registration = assertConnected();
        if (typeof continuation !== 'function') {
          throw new TypeError(
            'hcifootprint: invokeContinuation() needs the exact application continuation.',
          );
        }
        if (COVERAGE_RANK[registration.coverage] < COVERAGE_RANK.executable) {
          throw new Error(
            `hcifootprint: binding '${binding.bindingId}' is not executable (coverage: ${registration.coverage}).`,
          );
        }
        // A host continuation reports an application occurrence that is
        // already happening. Enabledness gates offers/direct protocol invokes;
        // instrumentation must not suppress an existing custom-component
        // listener merely because its app-owned disabled reader says false.
        return openInvocation<'host-continuation', Awaited<HostResult>>(
          continuation as ActionHandler,
          false,
          undefined,
          undefined,
          'host-continuation',
          Object.freeze({ source: 'host', provided: false }),
          registration.coverage,
        );
      },
      settle: (
        transition: ActionTransitionRef<Id>,
        settlement: ActionEffectSettlementInput,
      ) => {
        if (
          transition.binding.bindingId !== binding.bindingId ||
          transition.binding.definition.definitionId !==
            binding.definition.definitionId
        ) {
          throw new Error(
            `hcifootprint: transition '${transition.transitionId}' belongs to another binding.`,
          );
        }
        return runtime.#settle(transition, settlement);
      },
      disconnect: () => {
        if (!connected) return;
        connected = false;
        attachment = undefined;
        runtime.#invalidateOffers(binding);
        runtime.#invokers.delete(binding.bindingId);
        this.#registry.unregisterBinding(binding);
        // A disconnected connection remains a settlement capability for its
        // immutable transitions, but it must not retain framework props through
        // committed reader closures.
        base.input = undefined;
        base.enabled = undefined;
        base.busy = undefined;
        base.locators = NO_BINDINGS;
        base.humanReporting = undefined;
      },
    };

    this.#invokers.set(binding.bindingId, {
      directScalar: invocationMode !== 'host',
      takesNoInput: definitionTakesNoInput,
      inputSchema: validationSchema,
      inputValidation,
      invoke: (offer, hasExplicitInput, input) => {
        assertDirectScalarDoor(hasExplicitInput ? 1 : 0);
        return invokeSelected(
          hasExplicitInput,
          input as FirstParameter<F> | undefined,
          offer as ActionOfferRef<Id>,
        );
      },
    });

    return Object.freeze(connection);
  }

  bindings(definition?: ActionDefinitionRef): ActionBindingSnapshot[] {
    if (definition !== undefined) {
      const canonical = this.#definitionRecords.get(definition.definitionId);
      if (canonical?.ref !== definition) {
        throw new Error(
          `hcifootprint: definition ref '${definition.definitionId}' is unknown or forged.`,
        );
      }
    }
    const rows =
      definition === undefined
        ? this.#registry.bindingRegistrations()
        : this.#registry.bindingsFor(definition);
    const snapshots: ActionBindingSnapshot[] = [];
    for (const row of rows) {
      const snapshot = this.#snapshotCurrentBinding(row);
      if (snapshot !== undefined) snapshots.push(snapshot);
    }
    return snapshots;
  }

  bindingFor(binding: ActionBindingRef): ActionBindingSnapshot | undefined {
    const row = this.#registry.registrationFor(binding);
    return row === undefined ? undefined : this.#snapshotCurrentBinding(row);
  }

  #invokeOffer(
    principal: Principal,
    offer: ActionOffer,
    input: readonly unknown[],
  ): ActionInvocation<unknown, string, 'mutation'> {
    if (offer === null || typeof offer !== 'object') {
      throw new TypeError(
        'hcifootprint: invoke() needs an exact offer returned for this principal authority.',
      );
    }
    const ref = (offer as Partial<ActionOffer>).ref;
    if (ref === undefined) {
      throw new Error(
        `hcifootprint: invoke() received something that is not an offer this runtime returned — offers are invoked exactly as handed out, never rebuilt.`,
      );
    }
    // REFUSAL AS RE-ORIENTATION, NOT A DEAD END — and never a false
    // accusation. Invalidation DELETES a retired offer from every map, so
    // "not in #offers" cannot distinguish a slow caller replaying a
    // yesterday-valid offer from a forgery; the old single message accused
    // both of the same crime. What the runtime CAN still establish, it says:
    //   • the binding serves a CURRENT offer → stale, and the refusal names
    //     the current offer's id — the next move, not a dead end. (Naming it
    //     leaks nothing: invoking needs the exact offer OBJECT this runtime
    //     returned, an id alone opens no door.)
    //   • the binding is registered but offerless → the surface moved on.
    //   • the binding is unknown → never ours, or its control has since
    //     detached — and the refusal admits it cannot tell which, because
    //     absence must be established, never assumed.
    // The valid branch requires BOTH maps to agree on the exact object —
    // byte-for-byte the same authority the old check enforced.
    const current = this.#offerByBinding
      .get(ref.binding.bindingId)
      ?.get(ref.principal)?.offer;
    if (current !== offer || this.#offers.get(ref.offerId) !== offer) {
      if (current !== undefined) {
        throw new Error(
          `hcifootprint: offer '${ref.offerId}' is stale — the facts it was exposed under have changed, and binding '${ref.binding.bindingId}' now serves offer '${current.ref.offerId}' to principal '${ref.principal}'. Re-read offers and invoke the current one; never retry a stale offer, its moment is gone.`,
        );
      }
      if (this.#registry.registrationFor(ref.binding) !== undefined) {
        throw new Error(
          `hcifootprint: offer '${ref.offerId}' is stale and binding '${ref.binding.bindingId}' no longer serves offers to principal '${ref.principal}' — its facts changed and nobody has re-read since. Re-read offers to see what is available now.`,
        );
      }
      throw new Error(
        `hcifootprint: offer '${ref.offerId}' is not a live offer of this runtime — either it was never returned here, or its control has since detached. Re-read offers; this refusal cannot tell those two apart and will not guess.`,
      );
    }
    if (ref.principal !== principal) {
      throw new Error(
        `hcifootprint: offer '${ref.offerId}' belongs to principal '${ref.principal}', not '${principal}'. Invoke it through authority for the principal that received it.`,
      );
    }
    const principalVerdict = verdictForPrincipal(
      offer.definition.contract,
      principal,
    );
    if (!principalVerdict.ok) {
      this.#invalidateOffers(ref.binding, principal);
      throw new Error(
        `hcifootprint: offer '${ref.offerId}' is no longer permitted for principal '${principal}'.`,
      );
    }
    if (input.length > 1) {
      throw new TypeError(
        'hcifootprint: principal invoke() accepts at most one payload slot.',
      );
    }
    if (offer.inputMode !== 'open' && input.length > 0) {
      throw new TypeError(
        offer.inputMode === 'bound'
          ? `hcifootprint: offer '${ref.offerId}' already binds its exact input; invoke it without a replacement payload.`
          : `hcifootprint: offer '${ref.offerId}' takes no input.`,
      );
    }
    if (offer.inputMode === 'open' && input.length !== 1) {
      throw new TypeError(
        `hcifootprint: open offer '${ref.offerId}' requires exactly one deliberate input payload slot. Pass undefined explicitly when undefined is the intended value.`,
      );
    }
    const invoker = this.#invokers.get(ref.binding.bindingId);
    if (invoker === undefined) {
      this.#invalidateOffers(ref.binding);
      throw new Error(
        `hcifootprint: binding '${ref.binding.bindingId}' is disconnected.`,
      );
    }
    return invoker.invoke(ref, input.length === 1, input[0]);
  }

  #availableFor<P extends Principal, Id extends string = string>(
    principal: P,
    definition?: ActionDefinitionRef<Id> | DefinedAction,
  ): readonly ActionOffer<Id, (...args: any[]) => any, P>[] {
    if (typeof definition === 'function') {
      const record = actionDefinitionOf(definition);
      if (record === undefined) {
        throw new TypeError(
          'hcifootprint: offers() received a function that was not created by defineAction().',
        );
      }
      const canonical = this.#definitions.get(record.ref.definitionId);
      if (canonical !== undefined && canonical !== definition) {
        throw new TypeError(
          `hcifootprint: definition '${record.ref.definitionId}' belongs to another callable in this runtime. Pass the exact defineAction() result that was connected.`,
        );
      }
    } else if (definition !== undefined) {
      const canonical = this.#definitionRecords.get(definition.definitionId);
      if (canonical?.ref !== definition) {
        throw new Error(
          `hcifootprint: definition ref '${definition.definitionId}' is unknown or forged.`,
        );
      }
    }
    const definitionRef =
      typeof definition === 'function'
        ? actionDefinitionOf(definition)?.ref
        : definition;
    const rows =
      definitionRef === undefined
        ? this.#registry.bindingRegistrations()
        : this.#registry.bindingsFor(definitionRef);
    const offers: ActionOffer<Id, (...args: any[]) => any, P>[] = [];
    for (const snapshot of rows) {
      assertBindingCoverage(
        snapshot.coverage,
        `binding '${snapshot.binding.bindingId}'`,
      );
      const definitionRecord = this.#definitionRecords.get(
        snapshot.binding.definition.definitionId,
      );
      if (
        !this.#definitions.has(snapshot.binding.definition.definitionId) ||
        definitionRecord === undefined
      ) {
        throw new Error(
          `hcifootprint: definition '${snapshot.binding.definition.definitionId}' is unavailable in this runtime generation.`,
        );
      }
      if (!verdictForPrincipal(definitionRecord.contract, principal).ok) {
        this.#invalidateOffers(snapshot.binding, principal);
        continue;
      }
      let enabled: boolean | undefined;
      try {
        enabled = readEnabled(snapshot);
      } catch (error) {
        this.#invalidateOffers(snapshot.binding);
        throw error;
      }
      let row = this.#currentIfUnchanged(snapshot.binding, snapshot);
      if (row === undefined) {
        this.#invalidateOffers(snapshot.binding);
        continue;
      }
      if (
        COVERAGE_RANK[row.coverage] < COVERAGE_RANK.executable ||
        enabled === false
      ) {
        this.#invalidateOffers(row.binding);
        continue;
      }
      let busy: string | undefined;
      try {
        busy = readBusy(row);
      } catch (error) {
        this.#invalidateOffers(row.binding);
        throw error;
      }
      const afterBusy = this.#currentIfUnchanged(row.binding, row);
      if (afterBusy === undefined) {
        this.#invalidateOffers(row.binding);
        continue;
      }
      row = afterBusy;
      const invoker = this.#invokers.get(row.binding.bindingId);
      if (invoker?.directScalar !== true) {
        this.#invalidateOffers(row.binding);
        continue;
      }
      let byPrincipal = this.#offerByBinding.get(row.binding.bindingId);
      const offerRevision = row.revision;
      const offerCoverage = row.coverage;
      const offerLocators = row.locators;
      const matchesGeneration = (candidate: CachedOffer): boolean =>
        candidate.revision === offerRevision &&
        candidate.enabled === enabled &&
        candidate.busy === busy &&
        candidate.coverage === offerCoverage &&
        candidate.locators === offerLocators;
      const cached = byPrincipal?.get(principal);
      if (cached !== undefined && matchesGeneration(cached)) {
        offers.push(
          cached.offer as ActionOffer<Id, (...args: any[]) => any, P>,
        );
        continue;
      }
      if (
        byPrincipal !== undefined &&
        [...byPrincipal.values()].some(
          (candidate) => !matchesGeneration(candidate),
        )
      ) {
        this.#invalidateOffers(row.binding);
        byPrincipal = undefined;
      }

      let inputMode: ActionOffer['inputMode'];
      let capturedInput: unknown;
      let inputRef: ActionInputRef | undefined;
      if (row.input !== undefined) {
        const shared = [...(byPrincipal?.values() ?? [])].find(
          (candidate) =>
            candidate.offer.inputMode === 'bound' &&
            matchesGeneration(candidate),
        );
        if (shared?.offer.inputMode === 'bound') {
          capturedInput = shared.capturedInput;
          inputRef = shared.offer.input;
        } else {
          try {
            capturedInput = row.input();
            row = this.#requireCurrent(
              row.binding,
              row,
              'capturing offered input',
            );
            validateActionInput(
              row.binding,
              invoker.inputSchema,
              true,
              capturedInput,
              'bound',
              this.#inputSchemaAdapter,
              invoker.inputValidation,
            );
            row = this.#requireCurrent(
              row.binding,
              row,
              'validating offered input',
            );
          } catch (error) {
            this.#invalidateOffers(row.binding);
            throw error;
          }
          inputRef = this.#newInputRef('bound');
        }
        inputMode = 'bound';
      } else if (
        this.#invokers.get(row.binding.bindingId)?.takesNoInput === true
      ) {
        inputMode = 'none';
      } else if (definitionRecord.contract.inputSchema === undefined) {
        // The direct connection still accepts its application-owned scalar
        // input, but a broker cannot ask a user/agent to construct an
        // undeclared payload honestly. A bound reader remains offerable above.
        continue;
      } else {
        inputMode = 'open';
      }
      const ref = Object.freeze({
        kind: 'action-offer' as const,
        offerId: `offer#${(this.#offerSequence += 1)}`,
        binding: row.binding,
        principal,
        revision: row.revision,
        ...(inputRef !== undefined ? { input: inputRef } : {}),
      });
      const offer = Object.freeze({
        ref,
        definition: definitionRecord,
        locators: row.locators,
        coverage: row.coverage,
        contractActivation: this.#contractActivation,
        inputValidation: invoker.inputValidation,
        inputMode,
        ...(inputMode === 'open' ? { inputRequired: true } : {}),
        ...(inputRef !== undefined ? { input: inputRef } : {}),
      }) as ActionOffer<Id, (...args: any[]) => any, P>;
      this.#offers.set(ref.offerId, offer);
      byPrincipal =
        this.#offerByBinding.get(row.binding.bindingId) ??
        new Map<Principal, CachedOffer>();
      byPrincipal.set(principal, {
        revision: row.revision,
        enabled,
        busy,
        coverage: row.coverage,
        locators: row.locators,
        offer,
        ...(inputMode === 'bound' ? { capturedInput } : {}),
      });
      this.#offerByBinding.set(row.binding.bindingId, byPrincipal);
      offers.push(offer);
    }
    return Object.freeze(offers);
  }

  transitionFor(
    transition: ActionTransitionRef,
  ): ActionTransitionSnapshot | undefined {
    const stored = this.#transitions.get(transition.transitionId);
    if (stored === undefined || stored.ref !== transition) {
      return undefined;
    }
    return snapshotTransition(stored);
  }

  forgetTransition(transition: ActionTransitionRef): boolean {
    const stored = this.#transitions.get(transition.transitionId);
    if (stored === undefined || stored.ref !== transition) return false;
    if (
      stored.invocationStatus === 'pending' ||
      stored.effectStatus === 'unverified'
    ) {
      throw new Error(
        `hcifootprint: transition '${transition.transitionId}' is still pending and cannot be forgotten.`,
      );
    }
    this.#transitions.delete(transition.transitionId);
    return true;
  }

  #validateOffer<Id extends string>(
    binding: ActionBindingRef<Id>,
    offer: ActionOfferRef<Id> | undefined,
    registration: BindingRegistration,
    enabled: boolean | undefined,
  ): CachedOffer | undefined {
    if (offer === undefined) return undefined;
    const stored = this.#offers.get(offer.offerId);
    const cached = this.#offerByBinding
      .get(binding.bindingId)
      ?.get(offer.principal);
    let busy: string | undefined;
    try {
      busy = readBusy(registration);
      this.#requireCurrent(binding, registration, 'reading busy state');
    } catch (error) {
      this.#invalidateOffers(binding);
      throw error;
    }
    if (
      stored?.ref !== offer ||
      offer.binding !== binding ||
      offer.binding.bindingId !== binding.bindingId ||
      offer.revision !== registration.revision ||
      cached?.offer.ref !== offer ||
      cached.revision !== registration.revision ||
      cached.enabled !== enabled ||
      cached.busy !== busy ||
      cached.coverage !== registration.coverage ||
      cached.locators !== registration.locators
    ) {
      this.#invalidateOffers(binding);
      throw new Error(
        `hcifootprint: offer '${offer.offerId}' does not select binding '${binding.bindingId}'.`,
      );
    }
    return cached;
  }

  #invalidateOffers(binding: ActionBindingRef, principal?: Principal): void {
    const byPrincipal = this.#offerByBinding.get(binding.bindingId);
    if (byPrincipal === undefined) return;
    if (principal !== undefined) {
      const cached = byPrincipal.get(principal);
      if (cached === undefined) return;
      this.#offers.delete(cached.offer.ref.offerId);
      byPrincipal.delete(principal);
      if (byPrincipal.size === 0) {
        this.#offerByBinding.delete(binding.bindingId);
      }
      return;
    }
    for (const cached of byPrincipal.values()) {
      this.#offers.delete(cached.offer.ref.offerId);
    }
    this.#offerByBinding.delete(binding.bindingId);
  }

  #newInputRef<Source extends ActionInputSource>(
    source: Source,
  ): ActionInputRef<Source> {
    return Object.freeze({
      kind: 'action-input' as const,
      inputId: `input#${(this.#inputSequence += 1)}`,
      source,
    });
  }

  #requireCurrent(
    binding: ActionBindingRef,
    expected: BindingRegistration,
    phase: string,
  ): BindingRegistration {
    const current = this.#registry.registrationFor(binding);
    if (current === undefined) {
      throw new Error(
        `hcifootprint: binding '${binding.bindingId}' disconnected while ${phase}.`,
      );
    }
    if (current.revision !== expected.revision) {
      throw new Error(
        `hcifootprint: binding '${binding.bindingId}' changed while ${phase}; retry against its current facts.`,
      );
    }
    return current;
  }

  #currentIfUnchanged(
    binding: ActionBindingRef,
    expected: BindingRegistration,
  ): BindingRegistration | undefined {
    const current = this.#registry.registrationFor(binding);
    return current !== undefined && current.revision === expected.revision
      ? current
      : undefined;
  }

  /**
   * Snapshot application-owned readers only when every other field still
   * belongs to the same committed revision. A reader may synchronously update
   * or disconnect its own binding; bounded retries can observe a stable
   * successor without ever mixing facts from two generations.
   */
  #snapshotCurrentBinding(
    initial: BindingRegistration,
  ): ActionBindingSnapshot | undefined {
    let expected = initial;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const enabled = readEnabled(expected);
      let current = this.#registry.registrationFor(expected.binding);
      if (current === undefined) return undefined;
      if (current.revision !== expected.revision) {
        expected = current;
        continue;
      }

      const busy = readBusy(current);
      const afterBusy = this.#registry.registrationFor(current.binding);
      if (afterBusy === undefined) return undefined;
      if (afterBusy.revision !== current.revision) {
        expected = afterBusy;
        continue;
      }
      return snapshotBindingFacts(afterBusy, enabled, busy);
    }
    return undefined;
  }

  #invoke<
    Output,
    Id extends string,
    Behavior extends 'mutation' | 'host-continuation',
  >(
    binding: ActionBindingRef<Id>,
    handler: ActionHandler,
    hasInput: boolean,
    input: unknown,
    offer: ActionOfferRef<Id> | undefined,
    behavior: Behavior,
    invocationInput: Behavior extends 'host-continuation'
      ? Extract<ActionInvocationInput, { readonly source: 'host' }>
      : Exclude<ActionInvocationInput, { readonly source: 'host' }>,
    coverage: BindingCoverage,
    phase: 'handler' | 'preflight' = 'handler',
    verificationDeclared = false,
    progressDeclaration?: NonNullable<
      ReadonlyActionDefinitionContract['settle']
    >['progress'],
    reportInstrumentationError: (error: unknown) => void = () => undefined,
  ): ActionInvocation<Output, Id, Behavior> {
    const transition = Object.freeze({
      kind: 'action-transition' as const,
      transitionId: `transition#${(this.#transitionSequence += 1)}`,
      binding,
      principal: offer?.principal ?? 'unknown',
      ...(offer !== undefined ? { offer } : {}),
      ...('ref' in invocationInput && invocationInput.ref !== undefined
        ? { input: invocationInput.ref }
        : {}),
    });
    let resolveEffect!: (settlement: ActionEffectSettlement<Id>) => void;
    const whenEffectSettled = new Promise<ActionEffectSettlement<Id>>(
      (resolve) => {
        resolveEffect = resolve;
      },
    );
    const progress =
      behavior === 'host-continuation' || progressDeclaration === undefined
        ? undefined
        : createTransitionProgress(
            transition,
            progressDeclaration,
            phase === 'handler',
            reportInstrumentationError,
          );
    const stored: StoredTransition = {
      ref: transition,
      input: invocationInput,
      coverage,
      verificationDeclared,
      invocationStatus: 'pending',
      effectStatus: 'unverified',
      ...(progress !== undefined ? { progress } : {}),
      resolveEffect: resolveEffect as (
        settlement: ActionEffectSettlement<any>,
      ) => void,
    };
    this.#transitions.set(transition.transitionId, stored);

    let produced: unknown;
    try {
      if (progress?.lifecycle !== undefined) {
        produced = hasInput
          ? Reflect.apply(handler, undefined, [input, progress.lifecycle])
          : Reflect.apply(handler, undefined, [progress.lifecycle]);
      } else {
        produced = hasInput ? handler(input) : handler();
      }
    } catch (error) {
      const status = phase === 'preflight' ? 'refused' : 'failed';
      stored.invocationStatus = status;
      stored.error = error;
      progress?.close();
      const outcome = Object.freeze({
        status,
        transition,
        error,
      }) as ActionInvocationSettlement<Output, Id>;
      const invocation = Object.freeze({
        transition,
        behavior,
        input: invocationInput,
        whenInvoked: Promise.resolve(outcome),
        whenEffectSettled,
        ...(progress !== undefined ? { progress: progress.channel } : {}),
      }) as ActionInvocation<Output, Id, Behavior>;
      if (phase === 'preflight') {
        this.#settle(transition, {
          status: 'refused',
          reason: Object.freeze({
            code: 'ACTION_NOT_ATTEMPTED',
            phase: 'preflight',
          }),
        });
      }
      return invocation;
    }

    const whenInvoked: Promise<ActionInvocationSettlement<Output, Id>> =
      Promise.resolve(produced as Output).then(
        (value) => {
          stored.invocationStatus = 'performed';
          stored.produced = value;
          progress?.close();
          return Object.freeze({
            status: 'performed' as const,
            transition,
            produced: value,
          });
        },
        (error: unknown) => {
          stored.invocationStatus = 'failed';
          stored.error = error;
          progress?.close();
          return Object.freeze({
            status: 'failed' as const,
            transition,
            error,
          });
        },
      );
    return Object.freeze({
      transition,
      behavior,
      input: invocationInput,
      whenInvoked,
      whenEffectSettled,
      ...(progress !== undefined ? { progress: progress.channel } : {}),
    }) as ActionInvocation<Output, Id, Behavior>;
  }

  #settle<Id extends string>(
    transition: ActionTransitionRef<Id>,
    input: ActionEffectSettlementInput,
  ): ActionEffectSettlement<Id> {
    const stored = this.#transitions.get(transition.transitionId);
    if (stored === undefined || stored.ref !== transition) {
      throw new Error(
        `hcifootprint: transition '${transition.transitionId}' is unknown or forged.`,
      );
    }
    if (stored.effectSettlement !== undefined) {
      // FIRST TERMINAL WINS, AND THE TERMINAL NEVER REOPENS — but the losing
      // settlement is KEPT AND MARKED LATE, never silently dropped. Before
      // this block recorded anything, a `verified` arriving after an
      // `abandoned` vanished into a return of the first settlement, and the
      // caller could not even tell its evidence went nowhere. The claim is
      // recorded as a QUOTATION (`claimed` is whatever status the caller
      // said, stringified, unvalidated): validating it as if it were being
      // accepted would be pretending it settled something, and adopting it
      // would reopen a terminal — both are the failure this exists to refuse.
      if (input !== null && typeof input === 'object') {
        const claimed = (input as { readonly status?: unknown }).status;
        const payload =
          claimed === 'verified'
            ? (input as { readonly evidence?: unknown }).evidence
            : claimed === 'refused'
              ? (input as { readonly reason?: unknown }).reason
              : undefined;
        (stored.late ??= []).push(
          Object.freeze({
            claimed: String(claimed),
            ...(payload !== undefined
              ? { payload: snapshotDeclaration(payload) }
              : {}),
          }),
        );
      }
      return stored.effectSettlement as ActionEffectSettlement<Id>;
    }
    if (stored.effectSettling === true) {
      throw new Error(
        `hcifootprint: transition '${transition.transitionId}' is already being settled.`,
      );
    }
    // Claim the rail before reading any application-owned property. Evidence
    // getters can re-enter; they must never publish a second, contradictory
    // answer while the first snapshot is in progress.
    stored.effectSettling = true;
    try {
      if (input === null || typeof input !== 'object') {
        throw new TypeError(
          'hcifootprint: settle() needs a settlement record.',
        );
      }
      const status = (input as { readonly status?: unknown }).status;
      if (
        status !== 'verified' &&
        status !== 'refused' &&
        status !== 'abandoned'
      ) {
        throw new TypeError(
          `hcifootprint: invalid effect settlement status '${String(status)}'.`,
        );
      }
      const payload =
        status === 'verified'
          ? (input as { readonly evidence?: unknown }).evidence
          : status === 'refused'
            ? (input as { readonly reason?: unknown }).reason
            : undefined;
      if (status !== 'abandoned' && payload === undefined) {
        throw new TypeError(
          status === 'verified'
            ? 'hcifootprint: a verified effect settlement needs evidence.'
            : 'hcifootprint: a refused effect settlement needs a reason.',
        );
      }
      const authority =
        status === 'abandoned'
          ? snapshotAbandonmentAuthority(
              (input as { readonly authority?: unknown }).authority,
            )
          : undefined;
      if (status === 'verified' && !stored.verificationDeclared) {
        throw new Error(
          `hcifootprint: transition '${transition.transitionId}' cannot be verified because its action definition declares no evidence-bearing settle contract. Declare writes, goTo, verify, or an observable evidence channel before reporting verified.`,
        );
      }
      if (status === 'verified' && stored.coverage !== 'verifiable') {
        throw new Error(
          `hcifootprint: transition '${transition.transitionId}' cannot be verified from ${stored.coverage} coverage; invoke under verifiable coverage first.`,
        );
      }
      const transitionRef = stored.ref as ActionTransitionRef<Id>;
      const settlement: ActionEffectSettlement<Id> =
        status === 'verified'
          ? Object.freeze({
              status: 'verified',
              transition: transitionRef,
              evidence: snapshotDeclaration(payload),
            })
          : status === 'refused'
            ? Object.freeze({
                status: 'refused',
                transition: transitionRef,
                reason: snapshotDeclaration(payload),
              })
            : Object.freeze({
                status: 'abandoned',
                transition: transitionRef,
                authority: authority as ActionAbandonmentAuthority,
              });
      stored.effectSettlement = settlement;
      stored.effectStatus = status;
      if (settlement.status === 'verified') {
        stored.evidence = settlement.evidence;
      } else if (settlement.status === 'refused') {
        stored.reason = settlement.reason;
      } else {
        stored.authority = settlement.authority;
      }
      const resolveEffect = stored.resolveEffect;
      stored.resolveEffect = undefined;
      resolveEffect?.(settlement);
      return settlement;
    } finally {
      stored.effectSettling = false;
    }
  }
}

function readEnabled(row: BindingRegistration): boolean | undefined {
  const value = row.readEnabled === undefined ? row.enabled : row.readEnabled();
  if (value !== undefined && typeof value !== 'boolean') {
    throw new TypeError(
      `hcifootprint: enabled reader for binding '${row.binding.bindingId}' returned ${typeof value}; expected boolean or undefined.`,
    );
  }
  return value;
}

function readBusy(row: BindingRegistration): string | undefined {
  const value = row.readBusy === undefined ? row.busy : row.readBusy();
  if (value !== undefined && typeof value !== 'string') {
    throw new TypeError(
      `hcifootprint: busy reader for binding '${row.binding.bindingId}' returned ${typeof value}; expected string or undefined.`,
    );
  }
  return value;
}

function snapshotBindingFacts(
  row: BindingRegistration,
  enabled: boolean | undefined,
  busy: string | undefined,
): ActionBindingSnapshot {
  return Object.freeze({
    ref: row.binding,
    present: true as const,
    attached: row.attached,
    enabled,
    ...(busy !== undefined ? { busy } : {}),
    coverage: row.coverage,
    locators: row.locators,
    ...(row.humanReporting !== undefined
      ? { humanReporting: row.humanReporting }
      : {}),
  });
}

function createTransitionProgress(
  transition: ActionTransitionRef,
  declaration: NonNullable<
    NonNullable<ReadonlyActionDefinitionContract['settle']>['progress']
  >,
  started: boolean,
  reportInstrumentationError: (error: unknown) => void,
): TransitionProgress {
  const declared = Object.freeze([...declaration.stages]);
  const allowed = new Set(declared);
  const observed: ActionProgressObservation[] = [];
  type ProgressListener = (snapshot: ActionProgressSnapshot) => void;
  const listeners = new Set<ProgressListener>();
  const pendingPublications: Array<{
    readonly snapshot: ActionProgressSnapshot;
    readonly recipients: readonly ProgressListener[];
  }> = [];
  let publishing = false;
  let open = started;
  let current: ActionProgressSnapshot = started
    ? Object.freeze({
        disposition: 'open' as const,
        declared,
        observed: Object.freeze([]) as readonly ActionProgressObservation[],
      })
    : Object.freeze({
        disposition: 'not-started' as const,
        declared,
        observed: Object.freeze([]) as readonly [],
      });

  const report = (error: unknown): void => {
    try {
      reportInstrumentationError(error);
    } catch {
      // A diagnostics sink is instrumentation too; neither rail owns app behavior.
    }
  };
  const deliver = (
    snapshot: ActionProgressSnapshot,
    recipients: readonly ProgressListener[],
  ): void => {
    pendingPublications.push({ snapshot, recipients });
    if (publishing) return;
    publishing = true;
    try {
      for (let index = 0; index < pendingPublications.length; index += 1) {
        const publication = pendingPublications[index]!;
        for (const listener of publication.recipients) {
          try {
            listener(publication.snapshot);
          } catch (error) {
            report(error);
          }
        }
      }
    } finally {
      pendingPublications.length = 0;
      publishing = false;
    }
  };
  const publish = (snapshot: ActionProgressSnapshot): void => {
    deliver(snapshot, [...listeners]);
  };
  const channel: ActionProgress = Object.freeze({
    snapshot: () => current,
    subscribe: (listener: (snapshot: ActionProgressSnapshot) => void) => {
      if (typeof listener !== 'function') {
        throw new TypeError(
          'hcifootprint: progress.subscribe() needs a snapshot listener.',
        );
      }
      let subscribed = open;
      if (subscribed) listeners.add(listener);
      deliver(current, [listener]);
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
  });
  const lifecycle: ActionLifecycle | undefined = started
    ? Object.freeze({
        transition,
        reportProgress(stage: string, detail?: unknown): void {
          try {
            if (!open) return;
            if (typeof stage !== 'string' || !allowed.has(stage)) {
              report(
                Object.freeze(
                  Object.assign(
                    new Error(
                      `hcifootprint: progress stage '${String(stage)}' is not declared for transition '${transition.transitionId}'.`,
                    ),
                    {
                      code: 'ACTION_PROGRESS_STAGE_UNKNOWN' as const,
                      stage,
                      transition,
                    },
                  ),
                ),
              );
              return;
            }
            let capturedDetail: unknown;
            let hasDetail = detail !== undefined;
            if (hasDetail) {
              try {
                capturedDetail = snapshotDeclaration(detail);
              } catch (error) {
                hasDetail = false;
                report(error);
              }
            }
            observed.push(
              Object.freeze({
                stage,
                ...(hasDetail ? { detail: capturedDetail } : {}),
              }),
            );
            current = Object.freeze({
              disposition: 'open' as const,
              declared,
              observed: Object.freeze([...observed]),
            });
            publish(current);
          } catch (error) {
            report(error);
          }
        },
      })
    : undefined;

  return Object.freeze({
    channel,
    ...(lifecycle !== undefined ? { lifecycle } : {}),
    snapshot: () => current,
    close: () => {
      if (!open) return;
      open = false;
      const seen = new Set(observed.map((entry) => entry.stage));
      const unreported = Object.freeze(
        declared.filter((stage) => !seen.has(stage)),
      );
      current = Object.freeze({
        disposition: 'closed' as const,
        declared,
        observed: Object.freeze([...observed]),
        unreported,
        ...(declaration.required === true && observed.length === 0
          ? { integrity: 'unmet' as const }
          : {}),
      });
      publish(current);
      listeners.clear();
    },
  });
}

function snapshotTransition(
  stored: StoredTransition,
): ActionTransitionSnapshot {
  return Object.freeze({
    ref: stored.ref,
    input: stored.input,
    coverage: stored.coverage,
    invocationStatus: stored.invocationStatus,
    effectStatus: stored.effectStatus,
    ...(stored.invocationStatus === 'performed'
      ? { produced: stored.produced }
      : {}),
    ...(stored.invocationStatus === 'refused' ||
    stored.invocationStatus === 'failed'
      ? { error: stored.error }
      : {}),
    ...(stored.effectStatus === 'verified'
      ? { evidence: stored.evidence }
      : {}),
    ...(stored.effectStatus === 'refused' ? { reason: stored.reason } : {}),
    ...(stored.effectStatus === 'abandoned'
      ? { authority: stored.authority }
      : {}),
    // Absent when none arrived — an empty list would claim "we watched and
    // none came", which a snapshot cannot know. Copied and frozen so a later
    // late arrival cannot mutate a snapshot already handed out.
    ...(stored.late !== undefined && stored.late.length > 0
      ? { lateSettlements: Object.freeze([...stored.late]) }
      : {}),
    ...(stored.progress !== undefined
      ? { progress: stored.progress.snapshot() }
      : {}),
  });
}

function freezeBindings(bindings: readonly Binding[]): readonly Binding[] {
  if (!Array.isArray(bindings)) {
    throw new TypeError('hcifootprint: binding locators must be an array.');
  }
  return Object.freeze(bindings.map((binding) => freezeBinding(binding)));
}

function freezeBinding(binding: Binding): Binding {
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

function assertOptionalReader(
  value: unknown,
  field: string,
  context: string,
): void {
  if (value !== undefined && typeof value !== 'function') {
    throw new TypeError(
      `hcifootprint: ${context} ${field} must be a function when supplied.`,
    );
  }
}

function assertPrincipal(
  value: unknown,
  context: string,
): asserts value is Principal {
  if (
    value !== 'user' &&
    value !== 'agent' &&
    value !== 'system' &&
    value !== 'unknown'
  ) {
    throw new TypeError(
      `hcifootprint: ${context} principal must be user, agent, system, or unknown.`,
    );
  }
}

function verdictForPrincipal(
  contract: ReadonlyActionDefinitionContract,
  principal: Principal,
): ReturnType<typeof checkPrincipalPolicy> {
  const declaration = contract.principal;
  const policy =
    declaration === undefined
      ? undefined
      : {
          ...(declaration.mayInvoke !== undefined
            ? { mayInvoke: [...declaration.mayInvoke] }
            : {}),
          ...(declaration.decisionOwner !== undefined
            ? { decisionOwner: declaration.decisionOwner }
            : {}),
          ...(declaration.requiresHumanApproval !== undefined
            ? {
                requiresHumanApproval: declaration.requiresHumanApproval,
              }
            : {}),
        };
  return checkPrincipalPolicy({ policy, principal, enforcing: true });
}

function assertHumanReporting(
  value: unknown,
  context: string,
): asserts value is HumanReporting | undefined {
  if (value !== undefined && value !== 'connection' && value !== 'sensor') {
    throw new TypeError(
      `hcifootprint: ${context} humanReporting must be connection or sensor.`,
    );
  }
}

/**
 * A `verified` verdict is meaningful only when the definition named what
 * authoritative evidence could prove the effect. Reads describe dependencies
 * and progress describes execution; neither proves that the effect settled.
 */
function hasEvidenceBearingSettlement(
  settle: ReadonlyActionDefinitionContract['settle'],
): boolean {
  if (settle === undefined) return false;
  if (settle.writes !== undefined && settle.writes.length > 0) return true;
  if (settle.goTo !== undefined) return true;
  if (settle.verify !== undefined) return true;
  return (
    settle.observability !== undefined &&
    settle.observability !== 'unobservable'
  );
}

function assertContractActivation(
  definitionId: string,
  contract: ReadonlyActionDefinitionContract,
  activation: ActionContractActivation,
  inputValidation: ActionInputValidationDisposition,
): void {
  if (activation === 'disclosure') return;
  const clauses: string[] = [];
  if (contract.guard?.when !== undefined) clauses.push('guard.when');
  if (contract.guard?.enabledWhen !== undefined) {
    clauses.push('guard.enabledWhen');
  }
  if (inputValidation === 'disclosure') {
    clauses.push('inputSchema');
  }
  if (contract.settle?.verify !== undefined) {
    clauses.push('settle.verify');
  }
  if (contract.principal?.requiresHumanApproval === true) {
    clauses.push('principal.requiresHumanApproval');
  }
  if (clauses.length === 0) return;
  throw new Error(
    `hcifootprint: action definition '${definitionId}' has enforceable contract clause(s) ${clauses.join(', ')} that this framework-neutral runtime cannot activate. Provide inputSchemaAdapter for a schema format without its own validator, use the graph Session surface for state/approval clauses, or createActionRuntime({ contractActivation: 'disclosure' }) to opt in visibly to metadata-only behavior.`,
  );
}

/** Capture the validator method once for this binding generation. */
function captureInputValidationSchema(schema: unknown): unknown {
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

function resolveInputValidation(
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
function validateActionInput(
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

  const validator = schema as {
    safeParse?: (value: unknown) => { success: boolean; error?: unknown };
    parse?: (value: unknown) => unknown;
  };
  let issues: unknown;
  try {
    if (typeof validator.safeParse === 'function') {
      const result = validator.safeParse(input);
      if (isThenable(result)) {
        silenceRejectedThenable(result);
        issues =
          'safeParse() must return synchronously, not a Promise/thenable';
      } else if (result?.success === true) {
        return;
      } else {
        issues = result?.error ?? 'validator returned success: false';
      }
    } else if (typeof validator.parse === 'function') {
      const result = validator.parse(input);
      if (isThenable(result)) {
        silenceRejectedThenable(result);
        issues = 'parse() must return synchronously, not a Promise/thenable';
      } else {
        return;
      }
    } else if (disposition === 'active' && inputSchemaAdapter !== undefined) {
      const checked = inputSchemaAdapter.validate(
        schema,
        input,
        Object.freeze({
          definition: binding.definition,
          binding,
          source,
        }),
      );
      if (isThenable(checked)) {
        silenceRejectedThenable(checked);
        issues =
          'inputSchemaAdapter.validate() must return synchronously, not a Promise/thenable';
      } else if (checked?.valid === true) {
        return;
      } else if (checked?.valid === false) {
        issues = checked.issues;
      } else {
        issues = 'inputSchemaAdapter returned a malformed validation result';
      }
    } else if (disposition === 'disclosure') {
      return;
    } else {
      issues = 'the declared schema has no active validation adapter';
    }
  } catch (error) {
    issues = error;
  }
  throw new ActionInputValidationError(
    binding.definition,
    binding,
    source,
    issues,
  );
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === 'object' && value !== null) ||
      typeof value === 'function') &&
    typeof (value as { readonly then?: unknown }).then === 'function'
  );
}

/** Prevent an invalid async validator's rejection from escaping as a process-level event. */
function silenceRejectedThenable(value: PromiseLike<unknown>): void {
  void Promise.resolve(value).catch(() => undefined);
}

function isSelfValidatingSchema(schema: unknown): boolean {
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

function snapshotAbandonmentAuthority(
  value: unknown,
): ActionAbandonmentAuthority {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(
      'hcifootprint: an abandoned effect settlement needs an explicit authority record.',
    );
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === 'cancelled') {
    const reason = (value as { readonly reason?: unknown }).reason;
    if (reason === undefined) {
      throw new TypeError(
        'hcifootprint: cancelled abandonment authority needs a reason.',
      );
    }
    return Object.freeze({
      kind,
      reason: snapshotDeclaration(reason),
    });
  }
  if (kind === 'deadline') {
    const deadlineAt = (value as { readonly deadlineAt?: unknown }).deadlineAt;
    if (typeof deadlineAt !== 'number' || !Number.isFinite(deadlineAt)) {
      throw new TypeError(
        'hcifootprint: deadline abandonment authority needs a finite deadlineAt.',
      );
    }
    if (deadlineAt > Date.now()) {
      throw new TypeError(
        'hcifootprint: a deadline cannot authorize abandonment before it has elapsed.',
      );
    }
    return Object.freeze({ kind, deadlineAt });
  }
  if (kind === 'evidence-exhausted') {
    const sources = (value as { readonly sources?: unknown }).sources;
    if (!Array.isArray(sources)) {
      throw new TypeError(
        'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
      );
    }
    const sourceCount = sources.length;
    if (!Number.isSafeInteger(sourceCount) || sourceCount <= 0) {
      throw new TypeError(
        'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
      );
    }
    const capturedSources: string[] = [];
    for (let index = 0; index < sourceCount; index += 1) {
      const source = sources[index];
      if (typeof source !== 'string' || source.trim().length === 0) {
        throw new TypeError(
          'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
        );
      }
      capturedSources.push(source);
    }
    return Object.freeze({
      kind,
      sources: Object.freeze(capturedSources),
    });
  }
  throw new TypeError(
    `hcifootprint: invalid abandonment authority '${String(kind)}'; expected cancelled, deadline, or evidence-exhausted.`,
  );
}

/**
 * Detach evidence-shaped arrays/plain records from application mutation while
 * retaining opaque objects (errors, DOM nodes, schema instances) by identity.
 */
function snapshotDeclaration<T>(value: T): T {
  return cloneDeclaration(value, new WeakMap<object, unknown>());
}

function cloneDeclaration<T>(value: T, seen: WeakMap<object, unknown>): T {
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
