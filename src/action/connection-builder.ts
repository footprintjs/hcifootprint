/**
 * connection-builder — the ~700-line heart of connect(), as its own unit.
 *
 * This is where one live connection is assembled: options captured exactly
 * once, the binding registered, and the closure web built — attach, update,
 * disconnect, the invocation doors — all sharing per-connection state BY
 * DESIGN. The closures cannot be split further without turning shared
 * locals into a context object, which would be a rewrite wearing a
 * refactor's clothes; what CAN be separated is this whole unit from the
 * runtime, which now hands it a narrow core of capabilities instead of
 * hosting it inside a 2,600-line class.
 *
 * `ConnectionCore` is that seam: everything the builder may do to the
 * runtime, spelled out. A capability not listed here is a capability the
 * builder provably does not use.
 * @internal
 */
import type { Binding, Principal } from '../atom/types.js';
import type {
  ActionBindingRef,
  ActionConnection,
  ActionContractActivation,
  ActionDefinitionRecord,
  ActionEffectSettlement,
  ActionEffectSettlementInput,
  ActionInputRef,
  ActionInputSchemaAdapter,
  ActionInputSource,
  ActionInvocation,
  ActionInvocationInput,
  ActionInvocationMode,
  ActionObservedInvocation,
  ActionBindingUpdate,
  BindingProjection,
  ActionOfferRef,
  ActionTransitionRef,
  BindingCoverage,
  ConnectActionOptions,
  DefinedAction,
  ReadonlyActionDefinitionContract,
} from './types.js';
import type { ActionHandler, ActionRegistry, BindingRegistration } from '../registry/registry.js';
import { COVERAGE_RANK, NO_BINDINGS } from './stored.js';
import type { AttachedFacts, CachedOffer, MutableBindingFacts, RuntimeBindingInvoker } from './stored.js';
import { assertContractActivation, assertHumanReporting, assertOptionalReader, hasEvidenceBearingSettlement } from './authoring.js';
import { assertPrincipal, verdictForPrincipal } from './principals.js';
import { assertBindingCoverage } from './coverage.js';
import { readEnabled } from './binding-facts.js';
import { captureInputValidationSchema, resolveInputValidation, validateActionInput } from './input-validation.js';
import { freezeBindings, snapshotDeclaration } from './declarations.js';
import { INVOCATION_OBSERVER_CAPTURE, withObserverCapture } from './observer-capture.js';
import { takesNoInput } from '../traverse/expects.js';

type FirstParameter<F extends (...args: any[]) => any> =
  Parameters<F> extends [] ? undefined : Parameters<F>[0];

/** Everything the builder may do to the runtime — the whole seam, spelled out. */
export interface ConnectionCore {
  readonly registry: ActionRegistry;
  readonly definitions: Map<string, DefinedAction>;
  readonly definitionRecords: Map<string, ActionDefinitionRecord>;
  readonly invokers: Map<string, RuntimeBindingInvoker>;
  readonly inputSchemaAdapter: ActionInputSchemaAdapter | undefined;
  readonly contractActivation: ActionContractActivation;
  nextBindingSequence(): number;
  newInputRef<Source extends ActionInputSource>(
    source: Source,
  ): ActionInputRef<Source>;
  settle<Id extends string>(
    transition: ActionTransitionRef<Id>,
    input: ActionEffectSettlementInput,
  ): ActionEffectSettlement<Id>;
  requireCurrent(
    binding: ActionBindingRef,
    expected: BindingRegistration,
    phase: string,
  ): BindingRegistration;
  invalidateOffers(binding: ActionBindingRef, principal?: Principal): void;
  validateOffer<Id extends string>(
    binding: ActionBindingRef<Id>,
    offer: ActionOfferRef<Id> | undefined,
    registration: BindingRegistration,
    enabled: boolean | undefined,
  ): CachedOffer | undefined;
  invoke<
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
    phase?: 'handler' | 'preflight',
    verificationDeclared?: boolean,
    progressDeclaration?: NonNullable<
      ReadonlyActionDefinitionContract['settle']
    >['progress'],
    reportInstrumentationError?: (error: unknown) => void,
    invokedBy?: Principal,
  ): ActionInvocation<Output, Id, Behavior>;
}

export function buildConnection<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
>(
  core: ConnectionCore,
  definition: DefinedAction<F, Id, Mode>,
  options: ConnectActionOptions<
    FirstParameter<F>,
    Awaited<ReturnType<F>>,
    Id
  >,
  record: ActionDefinitionRecord<Id, Mode>,
):
  | ActionConnection<F, Id, true, Mode>
  | ActionConnection<F, Id, false, Mode> {
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
    const invokedBy = options.invokedBy as Principal | undefined;

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
    assertInvokedBy(record, invokedBy);
    const initialCoverage = coverage ?? 'executable';
    assertBindingCoverage(initialCoverage, 'connectAction()');
    const validationSchema = captureInputValidationSchema(
      record.contract.inputSchema,
    );
    const inputValidation = resolveInputValidation(
      validationSchema,
      core.inputSchemaAdapter,
    );
    assertContractActivation(
      record.ref.definitionId,
      record.contract,
      core.contractActivation,
      inputValidation,
    );
    const verificationDeclared = hasEvidenceBearingSettlement(
      record.contract.settle,
    );
    const canonical = core.definitions.get(record.ref.definitionId);
    if (canonical !== undefined && canonical !== definition) {
      throw new TypeError(
        `hcifootprint: definition '${record.ref.definitionId}' already belongs to another callable in this runtime. Reuse the original defineAction() result or create a new runtime generation.`,
      );
    }

    const binding = Object.freeze({
      kind: 'action-binding' as const,
      bindingId: `binding#${core.nextBindingSequence()}`,
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

    core.registry.registerBinding(
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
    core.definitions.set(record.ref.definitionId, definition);
    core.definitionRecords.set(record.ref.definitionId, record);

    let connected = true;
    let attachmentSequence = 0;
    let attachment: AttachedFacts | undefined;
    const runtime = core;

    const assertConnected = (): BindingRegistration => {
      if (!connected) {
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is disconnected.`,
        );
      }
      const registration = core.registry.registrationFor(binding);
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
      const changed = core.registry.updateBinding(binding, {
        coverage: effective?.coverage ?? base.coverage,
        attached: effective !== undefined,
        locators: effective?.locators ?? base.locators,
        humanReporting: effective?.humanReporting ?? base.humanReporting,
        input: base.input,
        readEnabled: base.enabled,
        readBusy: base.busy,
      });
      if (forceRevision && !changed) core.registry.touchBinding(binding);
      if (changed || forceRevision) runtime.invalidateOffers(binding);
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
          runtime.settle(invocation.transition, effect),
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
      const invocation = runtime.invoke<Output, Id, Behavior>(
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
        invokedBy,
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
        registration = runtime.requireCurrent(
          binding,
          registration,
          'reading enabledness',
        );
      } catch (error) {
        runtime.invalidateOffers(binding);
        throw error;
      }
      if (enabled === false) {
        runtime.invalidateOffers(binding);
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is disabled.`,
        );
      }
      if (COVERAGE_RANK[registration.coverage] < COVERAGE_RANK.executable) {
        throw new Error(
          `hcifootprint: binding '${binding.bindingId}' is not executable (coverage: ${registration.coverage}).`,
        );
      }
      const selectedOffer = runtime.validateOffer(
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
          registration = runtime.requireCurrent(
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
        inputRef = runtime.newInputRef('bound');
        registration = runtime.requireCurrent(
          binding,
          registration,
          'reading input',
        );
      } else if (hasExplicitInput) {
        inputRef = runtime.newInputRef('caller');
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
            runtime.inputSchemaAdapter,
            inputValidation,
          );
        } catch (error) {
          validationError = error;
        }
        try {
          registration = runtime.requireCurrent(
            binding,
            registration,
            'validating input',
          );
        } catch (error) {
          runtime.invalidateOffers(binding);
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
        runtime.requireCurrent(
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
        runtime.requireCurrent(
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
        return runtime.settle(transition, settlement);
      },
      disconnect: () => {
        if (!connected) return;
        connected = false;
        attachment = undefined;
        runtime.invalidateOffers(binding);
        runtime.invokers.delete(binding.bindingId);
        core.registry.unregisterBinding(binding);
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

    core.invokers.set(binding.bindingId, {
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

    return Object.freeze(connection);  }

/**
 * A connection's declared caller, checked ONCE where the developer is looking.
 * The contract is frozen and the principal fixed, so one verdict at connect is
 * sound; without it `invokedBy` would be a door past `principal.mayInvoke`.
 * `'unknown'` is refused: absence already says it, and one fact gets one way
 * to be said.
 */
function assertInvokedBy(
  record: ActionDefinitionRecord,
  invokedBy: Principal | undefined,
): void {
  if (invokedBy === undefined) return;
  assertPrincipal(invokedBy, 'connectAction() invokedBy');
  if (invokedBy === 'unknown') {
    throw new TypeError(
      "hcifootprint: connectAction() invokedBy 'unknown' says nothing — omit invokedBy, and direct invocations are filed under 'unknown' already.",
    );
  }
  const verdict = verdictForPrincipal(record.contract, invokedBy);
  if (!verdict.ok) {
    throw new Error(
      `hcifootprint: connectAction() declares invokedBy '${invokedBy}', but action definition '${record.ref.definitionId}' may be invoked only by ${verdict.required.join(', ')}. A connection cannot file its invocations under a principal the definition refuses — connect it for an allowed principal, or offer it through runtime.forPrincipal() to the caller who may.`,
    );
  }
}
