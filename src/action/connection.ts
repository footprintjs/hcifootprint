import type { Binding } from '../atom/types.js';
import {
  ActionRegistry,
  type ActionHandler,
  type BindingRegistration,
} from '../registry/registry.js';
import { actionDefinitionOf } from './definition.js';
import { assertBindingCoverage } from './coverage.js';
import type {
  ActionDefinitionRef,
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
  ActionInvocationSettlement,
  ActionInvokeOptions,
  ActionOffer,
  ActionOfferRef,
  ActionTransitionRef,
  ActionTransitionSnapshot,
  BindingCoverage,
  BindingProjection,
  ConnectActionOptions,
  DefinedAction,
  HumanReporting,
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
  readonly coverage: BindingCoverage;
  invocationStatus: 'pending' | 'performed' | 'refused';
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
}

type FirstParameter<F extends (...args: any[]) => any> = Parameters<F> extends []
  ? undefined
  : Parameters<F>[0];

/** Create an isolated framework-neutral action-binding runtime. */
export function createActionBindingRuntime(
  options: ActionBindingRuntimeOptions = {},
): ActionBindingRuntime {
  return new DefaultActionBindingRuntime(options);
}

/** Connect one stable live binding of an already-declared callable action. */
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
>(
  runtime: ActionBindingRuntime,
  definition: DefinedAction<F, Id>,
  options: Parameters<F> extends []
    ? never
    : ConnectActionOptions<Parameters<F>[0]> & {
        readonly input: () => Parameters<F>[0];
      },
): ActionConnection<F, Id, true>;
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
>(
  runtime: ActionBindingRuntime,
  definition: DefinedAction<F, Id>,
  options: Parameters<F> extends []
    ? Omit<ConnectActionOptions<undefined>, 'input'> & {
        readonly input?: never;
      }
    : ConnectActionOptions<Parameters<F>[0]>,
): ActionConnection<F, Id, false>;
export function connectAction<
  F extends (...args: any[]) => any,
  Id extends string,
>(
  runtime: ActionBindingRuntime,
  definition: DefinedAction<F, Id>,
  options: ConnectActionOptions<
    Parameters<F> extends [] ? undefined : Parameters<F>[0]
  >,
): ActionConnection<F, Id, true> | ActionConnection<F, Id, false> {
  const connect = runtime.connect as (
    this: ActionBindingRuntime,
    selected: DefinedAction<F, Id>,
    selectedOptions: ConnectActionOptions<FirstParameter<F>>,
  ) => ActionConnection<F, Id, true> | ActionConnection<F, Id, false>;
  return connect.call(runtime, definition, options);
}

class DefaultActionBindingRuntime implements ActionBindingRuntime {
  readonly #contractActivation: ActionContractActivation;
  readonly #registry = new ActionRegistry();
  readonly #offers = new Map<string, ActionOfferRef>();
  readonly #offerByBinding = new Map<string, CachedOffer>();
  readonly #transitions = new Map<string, StoredTransition>();
  readonly #definitions = new Map<string, DefinedAction>();
  #bindingSequence = 0;
  #offerSequence = 0;
  #transitionSequence = 0;

  constructor(options: ActionBindingRuntimeOptions) {
    const activation = options.contractActivation ?? 'require-active';
    if (activation !== 'require-active' && activation !== 'disclosure') {
      throw new TypeError(
        `hcifootprint: invalid contractActivation '${String(activation)}'; expected require-active or disclosure.`,
      );
    }
    this.#contractActivation = activation;
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

  connect<F extends (...args: any[]) => any, Id extends string>(
    definition: DefinedAction<F, Id>,
    options: ConnectActionOptions<FirstParameter<F>> & {
      readonly input: () => FirstParameter<F>;
    },
  ): ActionConnection<F, Id, true>;
  connect<F extends (...args: any[]) => any, Id extends string>(
    definition: DefinedAction<F, Id>,
    options: ConnectActionOptions<FirstParameter<F>>,
  ): ActionConnection<F, Id, false>;
  connect<F extends (...args: any[]) => any, Id extends string>(
    definition: DefinedAction<F, Id>,
    options: ConnectActionOptions<FirstParameter<F>>,
  ): ActionConnection<F, Id, true> | ActionConnection<F, Id, false> {
    const record = actionDefinitionOf(definition);
    if (record === undefined) {
      throw new TypeError(
        'hcifootprint: connectAction() needs a callable created by defineAction().',
      );
    }
    if (typeof options?.node !== 'string' || options.node.trim().length === 0) {
      throw new TypeError(
        'hcifootprint: connectAction() needs a non-empty node path.',
      );
    }
    if (options.instance !== undefined && typeof options.instance !== 'string') {
      throw new TypeError(
        'hcifootprint: connectAction() instance must be an opaque string when supplied.',
      );
    }
    assertOptionalReader(options.input, 'input', 'connectAction()');
    assertOptionalReader(options.enabled, 'enabled', 'connectAction()');
    assertOptionalReader(options.busy, 'busy', 'connectAction()');
    assertHumanReporting(options.humanReporting, 'connectAction()');
    const initialCoverage = options.coverage ?? 'executable';
    assertBindingCoverage(initialCoverage, 'connectAction()');
    assertContractActivation(
      record.ref.definitionId,
      record.contract,
      this.#contractActivation,
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
      node: options.node,
      ...(options.instance !== undefined ? { instance: options.instance } : {}),
    });
    const base: MutableBindingFacts<FirstParameter<F>> = {
      coverage: initialCoverage,
      locators:
        options.locators === undefined
          ? NO_BINDINGS
          : freezeBindings(options.locators),
      ...(options.input !== undefined ? { input: options.input } : {}),
      ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
      ...(options.busy !== undefined ? { busy: options.busy } : {}),
      ...(options.humanReporting !== undefined
        ? { humanReporting: options.humanReporting }
        : {}),
    };
    const inputReaderPresent = base.input !== undefined;
    // JavaScript erases tuple and explicit-receiver types. Function.length can
    // still prove the unsafe multi-positional case; capture it once so callers
    // cannot redefine the public callable's length after connecting.
    const declaredPositionalArity = definition.length;

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
      const offer = runtime.#validateOffer(
        binding,
        offered,
        registration,
        enabled,
      );

      let capturedInput = input;
      let hasInput = hasExplicitInput;
      if (!hasExplicitInput && registration.input !== undefined) {
        try {
          capturedInput = registration.input() as FirstParameter<F>;
        } catch (error) {
          registration = runtime.#requireCurrent(
            binding,
            registration,
            'reading input',
          );
          return runtime.#invoke<Awaited<ReturnType<F>>, Id>(
            binding,
            () => {
              throw error;
            },
            false,
            undefined,
            offer,
            registration.coverage,
          );
        }
        hasInput = true;
        registration = runtime.#requireCurrent(
          binding,
          registration,
          'reading input',
        );
      }
      return runtime.#invoke<Awaited<ReturnType<F>>, Id>(
        binding,
        registration.handler,
        hasInput,
        capturedInput,
        offer,
        registration.coverage,
      );
    };

    const assertDirectScalarDoor = (payloadSlots: number): void => {
      if (payloadSlots > 1) {
        throw new TypeError(
          'hcifootprint: direct action invocation accepts at most one payload slot; use invokeContinuation() for a host listener with several arguments.',
        );
      }
      if (declaredPositionalArity > 1) {
        throw new TypeError(
          `hcifootprint: action definition '${record.ref.definitionId}' declares several positional parameters and cannot use the direct scalar invocation door; use invokeContinuation().`,
        );
      }
    };

    const connection: ActionConnection<F, Id, true> = {
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
        // A successful public update publishes a fresh binding revision even
        // when its reader identities are unchanged. The reader may have
        // observed transient state between publications, so retaining an old
        // offer here would make that offer appear continuously valid.
        sync(true);
      },
      invoke: (function (
        input?: FirstParameter<F>,
      ) {
        assertDirectScalarDoor(arguments.length);
        return invokeSelected(arguments.length > 0, input, undefined);
      }) as ActionConnection<F, Id, true>['invoke'],
      invokeOffered: (function (
        invokeOptions: ActionInvokeOptions<Id>,
        input?: FirstParameter<F>,
      ) {
        const offered =
          invokeOptions !== null && typeof invokeOptions === 'object'
            ? invokeOptions.offer
            : undefined;
        if (
          invokeOptions === null ||
          typeof invokeOptions !== 'object' ||
          offered === undefined
        ) {
          throw new TypeError(
            'hcifootprint: invokeOffered() needs an exact offer.',
          );
        }
        assertDirectScalarDoor(arguments.length - 1);
        return invokeSelected(
          arguments.length > 1,
          input,
          offered,
        );
      }) as ActionConnection<F, Id, true>['invokeOffered'],
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
        return runtime.#invoke<Awaited<ReturnType<F>>, Id>(
          binding,
          continuation as ActionHandler,
          false,
          undefined,
          undefined,
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

  available<Ref extends ActionDefinitionRef>(
    definition: Ref,
  ): readonly ActionOffer<Ref['definitionId']>[];
  available<Id extends string>(definition: Id): readonly ActionOffer<Id>[];
  available(): readonly ActionOffer[];
  available<Id extends string = string>(
    definition?: ActionDefinitionRef<Id> | Id,
  ): readonly ActionOffer<Id>[] {
    const definitionId =
      typeof definition === 'string' ? definition : definition?.definitionId;
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
      const ref = Object.freeze({
        kind: 'action-offer' as const,
        offerId: `offer#${(this.#offerSequence += 1)}`,
        binding: row.binding,
        revision: row.revision,
      });
      this.#offers.set(ref.offerId, ref);
      const offer = Object.freeze({ ref, locators: row.locators });
      this.#offerByBinding.set(row.binding.bindingId, {
        revision: row.revision,
        enabled,
        busy,
        coverage: row.coverage,
        locators: row.locators,
        offer,
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
  ): ActionOfferRef<Id> | undefined {
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
      stored !== offer ||
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
    return offer;
  }

  #invalidateOffers(binding: ActionBindingRef): void {
    const cached = this.#offerByBinding.get(binding.bindingId);
    if (cached === undefined) return;
    this.#offers.delete(cached.offer.ref.offerId);
    this.#offerByBinding.delete(binding.bindingId);
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
    coverage: BindingCoverage,
  ): ActionInvocation<Output, Id> {
    const transition = Object.freeze({
      kind: 'action-transition' as const,
      transitionId: `transition#${(this.#transitionSequence += 1)}`,
      binding,
      ...(offer !== undefined ? { offer } : {}),
    });
    let resolveEffect!: (settlement: ActionEffectSettlement<Id>) => void;
    const whenEffectSettled = new Promise<ActionEffectSettlement<Id>>((resolve) => {
      resolveEffect = resolve;
    });
    const stored: StoredTransition = {
      ref: transition,
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
      stored.invocationStatus = 'refused';
      stored.error = error;
      const refused = Object.freeze({
        status: 'refused' as const,
        transition,
        error,
      });
      return Object.freeze({
        transition,
        whenInvoked: Promise.resolve(refused),
        whenEffectSettled,
      });
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
          stored.invocationStatus = 'refused';
          stored.error = error;
          return Object.freeze({
            status: 'refused' as const,
            transition,
            error,
          });
        },
      );
    return Object.freeze({ transition, whenInvoked, whenEffectSettled });
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
    coverage: stored.coverage,
    invocationStatus: stored.invocationStatus,
    effectStatus: stored.effectStatus,
    ...(stored.invocationStatus === 'performed'
      ? { produced: stored.produced }
      : {}),
    ...(stored.invocationStatus === 'refused' ? { error: stored.error } : {}),
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
): void {
  if (activation === 'disclosure') return;
  const clauses: string[] = [];
  if (contract.when !== undefined) clauses.push('when');
  if (contract.enabledWhen !== undefined) clauses.push('enabledWhen');
  if (contract.confirm === true) clauses.push('confirm');
  if (contract.input !== undefined) clauses.push('input');
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
    `hcifootprint: action definition '${definitionId}' has enforceable contract clause(s) ${clauses.join(', ')} that this framework-neutral runtime cannot activate. Supply an enforcing session/port, or createActionBindingRuntime({ contractActivation: 'disclosure' }) to opt in visibly to metadata-only behavior.`,
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
    copy[key] = cloneDeclaration(item, seen);
  }
  return Object.freeze(copy) as T;
}
