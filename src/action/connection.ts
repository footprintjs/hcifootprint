import type { Binding, Principal } from '../atom/types.js';
import {
  ActionRegistry,
  type ActionHandler,
  type BindingRegistration,
} from '../registry/registry.js';
import { takesNoInput } from '../traverse/expects.js';
import { checkPrincipalPolicy } from '../traverse/principal-policy.js';
import { actionDefinitionOf } from './definition.js';
import { COVERAGE_RANK, NO_BINDINGS } from './stored.js';
import type {
  AttachedFacts,
  CachedOffer,
  MutableBindingFacts,
  RuntimeBindingInvoker,
  StoredTransition,
} from './stored.js';
import { createTransitionProgress } from './progress-ledger.js';
import type { TransitionProgress } from './progress-ledger.js';
import { INVOCATION_OBSERVER_CAPTURE, withObserverCapture } from './observer-capture.js';
import { readBusy, readEnabled, snapshotBindingFacts } from './binding-facts.js';
import { snapshotAbandonmentAuthority, snapshotTransition } from './settlement.js';
import {
  cloneDeclaration,
  freezeBinding,
  freezeBindings,
  snapshotDeclaration,
} from './declarations.js';
import { assertPrincipal, verdictForPrincipal } from './principals.js';
import {
  assertContractActivation,
  assertHumanReporting,
  assertOptionalReader,
  hasEvidenceBearingSettlement,
} from './authoring.js';
import {
  ActionInputValidationError,
  captureInputValidationSchema,
  isSelfValidatingSchema,
  isThenable,
  resolveInputValidation,
  silenceRejectedThenable,
  validateActionInput,
} from './input-validation.js';

// Compatibility re-exports: these names were born in this file and the
// barrel and tests address them here; the implementations now live with
// their concerns.
export { withObserverCapture } from './observer-capture.js';
export { ActionInputValidationError } from './input-validation.js';

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
import { KindGovernor } from './kind-governor.js';
import { TransitionLedger } from './transition-ledger.js';
import { buildConnection, type ConnectionCore } from './connection-builder.js';
import { SurfaceBoard } from './surface-board.js';
import { RequestDesk } from './request.js';
import type { InputRequestHandle, InputRequestSnapshot, RequestChoice } from './request.js';
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

type FirstParameter<F extends (...args: any[]) => any> =
  Parameters<F> extends [] ? undefined : Parameters<F>[0];

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
  readonly #governor: KindGovernor;
  readonly #core: ConnectionCore;
  readonly #requests: RequestDesk;
  readonly #board: SurfaceBoard;
  readonly #registry = new ActionRegistry();
  readonly #offers = new Map<string, ActionOffer>();
  readonly #offerByBinding = new Map<string, Map<Principal, CachedOffer>>();
  readonly #invokers = new Map<string, RuntimeBindingInvoker>();
  readonly #ledger = new TransitionLedger();
  readonly #definitions = new Map<string, DefinedAction>();
  readonly #definitionRecords = new Map<string, ActionDefinitionRecord>();
  #bindingSequence = 0;
  #offerSequence = 0;
  #inputSequence = 0;

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
    this.#governor = new KindGovernor(kinds);
    this.#board = new SurfaceBoard(this.#governor);
    this.#requests = new RequestDesk(this.#governor, this.#board);

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

    // The builder's whole seam, spelled out — a capability not on this
    // object is one buildConnection provably does not use.
    this.#core = Object.freeze({
      registry: this.#registry,
      definitions: this.#definitions,
      definitionRecords: this.#definitionRecords,
      invokers: this.#invokers,
      inputSchemaAdapter: this.#inputSchemaAdapter,
      contractActivation: this.#contractActivation,
      nextBindingSequence: () => (this.#bindingSequence += 1),
      newInputRef: (source) => this.#newInputRef(source),
      settle: (transition, input) => this.#settle(transition, input),
      requireCurrent: (binding, expected, phase) =>
        this.#requireCurrent(binding, expected, phase),
      invalidateOffers: (binding, principal) =>
        this.#invalidateOffers(binding, principal),
      validateOffer: (binding, offer, registration, enabled) =>
        this.#validateOffer(binding, offer, registration, enabled),
      invoke: (...args) => (this.#invoke as (...a: unknown[]) => never)(...args),
    } satisfies ConnectionCore as ConnectionCore);
  }

  get contractActivation(): ActionContractActivation {
    return this.#contractActivation;
  }

  kindGovernance(): KindGovernanceReport {
    return this.#governor.report();
  }

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
    this.#governor.govern(kind, owner);
  }

  declareSurface(declaration: SurfaceDeclaration): SurfaceHandle {
    return this.#board.declare(declaration);
  }

  surfacesFor(query: SurfaceQuery): readonly SurfaceDeclaration[] {
    return this.#board.surfacesFor(query);
  }

  channelGaps(): readonly ChannelGap[] {
    return this.#board.gaps();
  }

  requestInput(input: {
    readonly question: string;
    readonly of: string;
    readonly from: Principal;
    readonly offered: readonly (RequestChoice | string)[];
  }): InputRequestHandle {
    return this.#requests.open(input);
  }

  openRequests(): readonly InputRequestSnapshot[] {
    return this.#requests.openRequests();
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
    return buildConnection(this.#core, definition, options, record) as
      | ActionConnection<F, Id, true, Mode>
      | ActionConnection<F, Id, false, Mode>;

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
    return this.#ledger.snapshotFor(transition);
  }

  forgetTransition(transition: ActionTransitionRef): boolean {
    return this.#ledger.forget(transition);
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
      transitionId: this.#ledger.nextId(),
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
    this.#ledger.store(transition.transitionId, stored);

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
    return this.#ledger.settle(transition, input);
  }
}
