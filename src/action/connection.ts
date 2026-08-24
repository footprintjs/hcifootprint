import type { Binding } from '../atom/types.js';
import {
  ActionRegistry,
  type ActionHandler,
  type BindingRegistration,
} from '../registry/registry.js';
import { takesNoInput } from '../traverse/expects.js';
import { actionDefinitionOf } from './definition.js';
import { assertBindingCoverage } from './coverage.js';
import type {
  ActionDefinitionRef,
  ActionDefinitionRecord,
  ActionBindingRef,
  ActionBindingRuntime,
  ActionBindingRuntimeOptions,
  ActionBindingSnapshot,
  ActionBindingUpdate,
  ActionConnection,
  ActionContractActivation,
  ActionEffectSettlement,
  ActionEffectSettlementInput,
  ActionInvocation,
  ActionInvocationInput,
  ActionInvocationSettlement,
  ActionInvocationMode,
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
  BoundActionOffer,
  ConnectActionOptions,
  DefinedAction,
  HumanReporting,
  InputlessActionOffer,
  OpenActionOffer,
  ReadonlyActionDefinitionContract,
  ActionOfferFor,
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
  invocationStatus: 'pending' | 'performed' | 'refused' | 'failed';
  effectStatus: 'unverified' | 'verified' | 'refused';
  effectSettling?: boolean;
  produced?: unknown;
  error?: unknown;
  evidence?: unknown;
  reason?: unknown;
  effectSettlement?: ActionEffectSettlement;
  resolveEffect?: (settlement: ActionEffectSettlement<any>) => void;
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
  ) => ActionInvocation<unknown>;
}

type FirstParameter<F extends (...args: any[]) => any> = Parameters<F> extends []
  ? undefined
  : Parameters<F>[0];

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
export function createActionBindingRuntime(
  options: ActionBindingRuntimeOptions = {},
): ActionBindingRuntime {
  return new DefaultActionBindingRuntime(options);
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
  runtime: ActionBindingRuntime,
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
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
>(
  runtime: ActionBindingRuntime,
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
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
>(
  runtime: ActionBindingRuntime,
  definition: DefinedAction<F, Id, Mode>,
  options: ConnectActionOptions<
    Mode extends 'scalar' ? Parameters<F>[0] : undefined,
    Awaited<ReturnType<F>>,
    Id
  >,
):
  | ActionConnection<F, Id, true, Mode>
  | ActionConnection<F, Id, false, Mode> {
  const connect = runtime.connect as (
    this: ActionBindingRuntime,
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

class DefaultActionBindingRuntime implements ActionBindingRuntime {
  readonly #contractActivation: ActionContractActivation;
  readonly #inputSchemaAdapter: ActionInputSchemaAdapter | undefined;
  readonly #registry = new ActionRegistry();
  readonly #offers = new Map<string, ActionOffer>();
  readonly #offerByBinding = new Map<string, CachedOffer>();
  readonly #invokers = new Map<string, RuntimeBindingInvoker>();
  readonly #transitions = new Map<string, StoredTransition>();
  readonly #definitions = new Map<string, DefinedAction>();
  readonly #definitionRecords = new Map<string, ActionDefinitionRecord>();
  #bindingSequence = 0;
  #offerSequence = 0;
  #inputSequence = 0;
  #transitionSequence = 0;

  constructor(options: ActionBindingRuntimeOptions) {
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
      locators:
        locators === undefined ? NO_BINDINGS : freezeBindings(locators),
      ...(input !== undefined ? { input } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(busy !== undefined ? { busy } : {}),
      ...(humanReporting !== undefined
        ? { humanReporting }
        : {}),
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
        humanReporting:
          effective?.humanReporting ?? base.humanReporting,
        input: base.input,
        readEnabled: base.enabled,
        readBusy: base.busy,
      });
      if (forceRevision && !changed) this.#registry.touchBinding(binding);
      if (changed || forceRevision) runtime.#invalidateOffers(binding);
    };

    const reportObserverError = (error: unknown): void => {
      if (onInvocationError === undefined) return;
      try {
        void Promise.resolve(onInvocationError(error)).catch(() => undefined);
      } catch {
        // Instrumentation failures never replace the application result.
      }
    };

    const publishInvocation = (
      invocation: ActionInvocation<Awaited<ReturnType<F>>, Id>,
    ): ActionInvocation<Awaited<ReturnType<F>>, Id> => {
      if (onInvocation === undefined) return invocation;
      const settlement = Object.freeze({
        binding,
        settle: (effect: ActionEffectSettlementInput) =>
          runtime.#settle(invocation.transition, effect),
      });
      try {
        void Promise.resolve(onInvocation(invocation, settlement)).catch(
          reportObserverError,
        );
      } catch (error) {
        reportObserverError(error);
      }
      return invocation;
    };

    const openInvocation = (
      handler: ActionHandler,
      hasInput: boolean,
      input: unknown,
      offer: ActionOfferRef<Id> | undefined,
      invocationInput: ActionInvocationInput,
      coverage: BindingCoverage,
      phase: 'handler' | 'preflight' = 'handler',
    ): ActionInvocation<Awaited<ReturnType<F>>, Id> =>
      publishInvocation(
        runtime.#invoke<Awaited<ReturnType<F>>, Id>(
          binding,
          handler,
          hasInput,
          input,
          offer,
          invocationInput,
          coverage,
          phase,
        ),
      );

    const invokeSelected = (
      hasExplicitInput: boolean,
      input: FirstParameter<F> | undefined,
      offered: ActionOfferRef<Id> | undefined,
    ): ActionInvocation<Awaited<ReturnType<F>>, Id> => {
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
          (typeof interactive !== 'object' &&
            typeof interactive !== 'function')
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
          ...(frozenLocators !== undefined
            ? { locators: frozenLocators }
            : {}),
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
          throw new TypeError('hcifootprint: update() needs a binding-facts record.');
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

        if (hasInputUpdate && nextInput !== undefined) {
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
      invoke: (function (
        input?: FirstParameter<F>,
      ) {
        assertDirectScalarDoor(arguments.length);
        return invokeSelected(arguments.length > 0, input, undefined);
      }) as ActionConnection<F, Id, true, Mode>['invoke'],
      invokeContinuation: (continuation: () => ReturnType<F>) => {
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
        return openInvocation(
          continuation as ActionHandler,
          false,
          undefined,
          undefined,
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

  bindings(
    definition?: { readonly definitionId: string } | string,
  ): ActionBindingSnapshot[] {
    const definitionId =
      typeof definition === 'string' ? definition : definition?.definitionId;
    const rows =
      definitionId === undefined
        ? this.#registry.bindingRegistrations()
        : this.#registry.bindingsFor(definitionId);
    const snapshots: ActionBindingSnapshot[] = [];
    for (const row of rows) {
      const snapshot = this.#snapshotCurrentBinding(row);
      if (snapshot !== undefined) snapshots.push(snapshot);
    }
    return snapshots;
  }

  bindingFor(
    binding: ActionBindingRef | string,
  ): ActionBindingSnapshot | undefined {
    const row = this.#registry.registrationFor(binding);
    return row === undefined ? undefined : this.#snapshotCurrentBinding(row);
  }

  invoke<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    offer: BoundActionOffer<Id, F> | InputlessActionOffer<Id, F>,
  ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
  invoke<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    offer: OpenActionOffer<Id, F>,
    input: Parameters<F>[0],
  ): ActionInvocation<Awaited<ReturnType<F>>, Id>;
  invoke<
    F extends (...args: any[]) => any,
    Id extends string = string,
  >(
    offer: ActionOffer<Id, F>,
    ...input: [input?: Parameters<F> extends [] ? never : Parameters<F>[0]]
  ): ActionInvocation<Awaited<ReturnType<F>>, Id> {
    if (offer === null || typeof offer !== 'object') {
      throw new TypeError(
        'hcifootprint: runtime.invoke() needs an exact offer returned by available().',
      );
    }
    const ref = (offer as Partial<ActionOffer>).ref;
    if (
      ref === undefined ||
      this.#offers.get(ref.offerId) !== offer ||
      this.#offerByBinding.get(ref.binding.bindingId)?.offer !== offer
    ) {
      throw new Error(
        `hcifootprint: offer '${ref?.offerId ?? 'unknown'}' is stale, foreign, or forged.`,
      );
    }
    if (input.length > 1) {
      throw new TypeError(
        'hcifootprint: runtime.invoke() accepts at most one payload slot.',
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
    return invoker.invoke(ref, input.length === 1, input[0]) as ActionInvocation<
      Awaited<ReturnType<F>>,
      Id
    >;
  }

  available<
    F extends (...args: any[]) => any,
    Id extends string,
    Mode extends ActionInvocationMode,
  >(
    definition: DefinedAction<F, Id, Mode>,
  ): readonly ActionOfferFor<DefinedAction<F, Id, Mode>, Id, Mode>[];
  available<Ref extends ActionDefinitionRef>(
    definition: Ref,
  ): readonly ActionOffer<Ref['definitionId']>[];
  available<Id extends string>(definition: Id): readonly ActionOffer<Id>[];
  available(): readonly ActionOffer[];
  available<Id extends string = string>(
    definition?: ActionDefinitionRef<Id> | DefinedAction | Id,
  ): readonly ActionOffer<Id>[] {
    if (typeof definition === 'function') {
      const record = actionDefinitionOf(definition);
      if (record === undefined) {
        throw new TypeError(
          'hcifootprint: available() received a function that was not created by defineAction().',
        );
      }
      const canonical = this.#definitions.get(record.ref.definitionId);
      if (canonical !== undefined && canonical !== definition) {
        throw new TypeError(
          `hcifootprint: definition '${record.ref.definitionId}' belongs to another callable in this runtime. Pass the exact defineAction() result that was connected.`,
        );
      }
    }
    const definitionId = resolveDefinitionId(definition);
    const rows =
      definitionId === undefined
        ? this.#registry.bindingRegistrations()
        : this.#registry.bindingsFor(definitionId);
    const offers: ActionOffer<Id>[] = [];
    for (const snapshot of rows) {
      assertBindingCoverage(
        snapshot.coverage,
        `binding '${snapshot.binding.bindingId}'`,
      );
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
      const cached = this.#offerByBinding.get(row.binding.bindingId);
      if (
        cached !== undefined &&
        cached.revision === row.revision &&
        cached.enabled === enabled &&
        cached.busy === busy &&
        cached.coverage === row.coverage &&
        cached.locators === row.locators
      ) {
        offers.push(cached.offer as ActionOffer<Id>);
        continue;
      }
      this.#invalidateOffers(row.binding);
      const callable = this.#definitions.get(row.binding.definition.definitionId);
      const definition = this.#definitionRecords.get(
        row.binding.definition.definitionId,
      );
      if (callable === undefined || definition === undefined) {
        throw new Error(
          `hcifootprint: definition '${row.binding.definition.definitionId}' is unavailable in this runtime generation.`,
        );
      }

      let inputMode: ActionOffer['inputMode'];
      let capturedInput: unknown;
      let inputRef: ActionInputRef | undefined;
      if (row.input !== undefined) {
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
        inputMode = 'bound';
        inputRef = this.#newInputRef('bound');
      } else if (
        this.#invokers.get(row.binding.bindingId)?.takesNoInput === true
      ) {
        inputMode = 'none';
      } else if (definition.contract.inputSchema === undefined) {
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
        revision: row.revision,
        ...(inputRef !== undefined ? { input: inputRef } : {}),
      });
      const offer = Object.freeze({
        ref,
        definition,
        locators: row.locators,
        coverage: row.coverage,
        contractActivation: this.#contractActivation,
        inputValidation: invoker.inputValidation,
        inputMode,
        ...(inputMode === 'open' ? { inputRequired: true } : {}),
        ...(inputRef !== undefined ? { input: inputRef } : {}),
      }) as ActionOffer;
      this.#offers.set(ref.offerId, offer);
      this.#offerByBinding.set(row.binding.bindingId, {
        revision: row.revision,
        enabled,
        busy,
        coverage: row.coverage,
        locators: row.locators,
        offer,
        ...(inputMode === 'bound' ? { capturedInput } : {}),
      });
      offers.push(offer as ActionOffer<Id>);
    }
    return Object.freeze(offers);
  }

  transitionFor(
    transition: ActionTransitionRef | string,
  ): ActionTransitionSnapshot | undefined {
    const transitionId =
      typeof transition === 'string' ? transition : transition.transitionId;
    const stored = this.#transitions.get(transitionId);
    if (
      stored === undefined ||
      (typeof transition !== 'string' && stored.ref !== transition)
    ) {
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
    const cached = this.#offerByBinding.get(binding.bindingId);
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

  #invalidateOffers(binding: ActionBindingRef): void {
    const cached = this.#offerByBinding.get(binding.bindingId);
    if (cached === undefined) return;
    this.#offers.delete(cached.offer.ref.offerId);
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

  #invoke<Output, Id extends string>(
    binding: ActionBindingRef<Id>,
    handler: ActionHandler,
    hasInput: boolean,
    input: unknown,
    offer: ActionOfferRef<Id> | undefined,
    invocationInput: ActionInvocationInput,
    coverage: BindingCoverage,
    phase: 'handler' | 'preflight' = 'handler',
  ): ActionInvocation<Output, Id> {
    const transition = Object.freeze({
      kind: 'action-transition' as const,
      transitionId: `transition#${(this.#transitionSequence += 1)}`,
      binding,
      ...(offer !== undefined ? { offer } : {}),
      ...('ref' in invocationInput && invocationInput.ref !== undefined
        ? { input: invocationInput.ref }
        : {}),
    });
    let resolveEffect!: (settlement: ActionEffectSettlement<Id>) => void;
    const whenEffectSettled = new Promise<ActionEffectSettlement<Id>>((resolve) => {
      resolveEffect = resolve;
    });
    const stored: StoredTransition = {
      ref: transition,
      input: invocationInput,
      coverage,
      invocationStatus: 'pending',
      effectStatus: 'unverified',
      resolveEffect: resolveEffect as (
        settlement: ActionEffectSettlement<any>,
      ) => void,
    };
    this.#transitions.set(transition.transitionId, stored);

    let produced: unknown;
    try {
      produced = hasInput ? handler(input) : handler();
    } catch (error) {
      const status = phase === 'preflight' ? 'refused' : 'failed';
      stored.invocationStatus = status;
      stored.error = error;
      const outcome = Object.freeze({
        status,
        transition,
        error,
      }) as ActionInvocationSettlement<Output, Id>;
      const invocation = Object.freeze({
        transition,
        input: invocationInput,
        whenInvoked: Promise.resolve(outcome),
        whenEffectSettled,
      });
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
          return Object.freeze({
            status: 'performed' as const,
            transition,
            produced: value,
          });
        },
        (error: unknown) => {
          stored.invocationStatus = 'failed';
          stored.error = error;
          return Object.freeze({
            status: 'failed' as const,
            transition,
            error,
          });
        },
      );
    return Object.freeze({
      transition,
      input: invocationInput,
      whenInvoked,
      whenEffectSettled,
    });
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
        throw new TypeError('hcifootprint: settle() needs a settlement record.');
      }
      const status = (input as { readonly status?: unknown }).status;
      if (status !== 'verified' && status !== 'refused') {
        throw new TypeError(
          `hcifootprint: invalid effect settlement status '${String(status)}'.`,
        );
      }
      const payload =
        status === 'verified'
          ? (input as { readonly evidence?: unknown }).evidence
          : (input as { readonly reason?: unknown }).reason;
      if (payload === undefined) {
        throw new TypeError(
          status === 'verified'
            ? 'hcifootprint: a verified effect settlement needs evidence.'
            : 'hcifootprint: a refused effect settlement needs a reason.',
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
          : Object.freeze({
              status: 'refused',
              transition: transitionRef,
              reason: snapshotDeclaration(payload),
            });
      stored.effectSettlement = settlement;
      stored.effectStatus = status;
      if (settlement.status === 'verified') {
        stored.evidence = settlement.evidence;
      } else {
        stored.reason = settlement.reason;
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
  const value =
    row.readEnabled === undefined ? row.enabled : row.readEnabled();
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

function snapshotTransition(stored: StoredTransition): ActionTransitionSnapshot {
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
    ...(stored.effectStatus === 'verified' ? { evidence: stored.evidence } : {}),
    ...(stored.effectStatus === 'refused' ? { reason: stored.reason } : {}),
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
        ![
          'click',
          'type',
          'select',
          'hover',
          'drag',
          'press',
        ].includes(binding.actuation))
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
  if (
    binding.kind === 'programmatic' &&
    typeof binding.provider === 'string'
  ) {
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

function assertContractActivation(
  definitionId: string,
  contract: ReadonlyActionDefinitionContract,
  activation: ActionContractActivation,
  inputValidation: ActionInputValidationDisposition,
): void {
  if (activation === 'disclosure') return;
  const clauses: string[] = [];
  if (contract.when !== undefined) clauses.push('when');
  if (contract.enabledWhen !== undefined) clauses.push('enabledWhen');
  if (contract.confirm === true) clauses.push('confirm');
  if (inputValidation === 'disclosure') {
    clauses.push('inputSchema');
  }
  if (contract.verify !== undefined) clauses.push('verify');
  if (contract.principalPolicy?.mayInvoke !== undefined) {
    clauses.push('principalPolicy.mayInvoke');
  }
  if (contract.principalPolicy?.requiresHumanApproval === true) {
    clauses.push('principalPolicy.requiresHumanApproval');
  }
  if (
    contract.freshness !== undefined &&
    Object.values(contract.freshness).some(
      (response) => response !== undefined && response !== 'disclose',
    )
  ) {
    clauses.push('freshness');
  }
  if (
    contract.concurrency !== undefined &&
    contract.concurrency.mode !== 'parallel'
  ) {
    clauses.push('concurrency');
  }
  if (clauses.length === 0) return;
  throw new Error(
    `hcifootprint: action definition '${definitionId}' has enforceable contract clause(s) ${clauses.join(', ')} that this framework-neutral runtime cannot activate. Provide inputSchemaAdapter for a schema format without its own validator, use the graph Session surface for state/principal/approval clauses, or createActionBindingRuntime({ contractActivation: 'disclosure' }) to opt in visibly to metadata-only behavior.`,
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

function resolveDefinitionId(
  definition: ActionDefinitionRef | DefinedAction | string | undefined,
): string | undefined {
  if (definition === undefined || typeof definition === 'string') {
    return definition;
  }
  if (typeof definition === 'function') {
    const record = actionDefinitionOf(definition);
    if (record === undefined) {
      throw new TypeError(
        'hcifootprint: available() received a function that was not created by defineAction().',
      );
    }
    return record.ref.definitionId;
  }
  return definition.definitionId;
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
        issues = 'safeParse() must return synchronously, not a Promise/thenable';
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
    } else if (
      disposition === 'active' &&
      inputSchemaAdapter !== undefined
    ) {
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
    (typeof value === 'object' && value !== null) ||
    typeof value === 'function'
  ) && typeof (value as { readonly then?: unknown }).then === 'function';
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
