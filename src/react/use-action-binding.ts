import { useCallback, useInsertionEffect, useMemo, useRef } from 'react';
import type { Binding } from '../atom/types.js';
import { connectAction, withObserverCapture } from '../action/connection.js';
import { resolveActionHost } from '../action/host-adapter.js';
import type {
  ActionHostAdapter,
  ActionHostContext,
  ActionInvocationMiddleware,
} from '../action/host-adapter.js';
import type {
  ActionAttachment,
  ActionBindingRef,
  ActionRuntime,
  ActionConnection,
  ActionInvocationMode,
  ActionObservedInvocation,
  ActionSettlementCapability,
  BindingCoverage,
  ConnectActionOptions,
  DefinedAction,
} from '../action/types.js';

type FirstParameter<F extends (...args: any[]) => any> =
  Parameters<F> extends [] ? undefined : Parameters<F>[0];

/** The exact interactive-element projection understood by a physical root. */
export interface ActionBindingProjection<
  Interactive extends object,
  Id extends string = string,
> {
  readonly binding: ActionBindingRef<Id>;
  readonly element: Interactive;
}

/**
 * Optional sensor ownership port for the interactive element's physical root.
 * `BindingAwarePageWatch` satisfies this structurally without entering React's
 * runtime dependency graph.
 */
export interface ActionBindingProjector<
  Interactive extends object,
  Id extends string = string,
> {
  projectBinding(
    projection: ActionBindingProjection<Interactive, Id>,
  ): ActionAttachment;
}

/** Stable identity, host facts, and explicit input ownership for one React binding. */
export type UseActionBindingOptions<
  Props,
  Input,
  Interactive extends object,
  Id extends string = string,
  ActionOutput = unknown,
  HostOutput = unknown,
> = {
  readonly node: string;
  readonly instance?: string;
  /** Explicit fallback when coverage belongs to the call site rather than the adapter. */
  readonly coverage?: BindingCoverage;
  /**
   * A deliberate ref-identity key for props that change descendant resolution,
   * projected coverage, or locators. Ordinary props do not reattach.
   */
  readonly attachmentKey?: unknown;
  /**
   * Committed generation for adapter-owned enabled/busy readers. Change it
   * whenever those facts can change. Without it, bindings with either reader
   * conservatively publish a new revision after every committed render.
   * Supplying it when the adapter has neither reader is a configuration error.
   */
  readonly availabilityKey?: unknown;
  /** The watcher/projector that owns a portal's physical interactive root. */
  readonly projector?: ActionBindingProjector<Interactive, Id> | null;
  /**
   * Receive the exact transition plus a narrow effect-settlement capability.
   * Errors from this observer never replace the host listener's own result.
   */
  readonly onInvocation?: (
    invocation: ActionObservedInvocation<ActionOutput, HostOutput, Id>,
    settlement: ActionSettlementCapability<Id>,
  ) => void | PromiseLike<void>;
  /** Optional sink for an `onInvocation` observer failure. */
  readonly onInvocationError?: (error: unknown) => void | PromiseLike<void>;
} & (
  | { readonly input?: undefined; readonly inputKey?: never }
  | {
      /** Application-owned payload selected by this live binding. */
      readonly input: (props: Readonly<Props>) => Input;
      /**
       * Opaque semantic generation for `input`. Keep it stable while the
       * reader means the same value; change it whenever that value can change.
       */
      readonly inputKey: unknown;
    }
);

/** React 18-compatible callback ref; null is the teardown door. */
export type ActionBindingRefCallback<Host> = (host: Host | null) => void;

/** Render output plus a read-only accessor for the currently committed identity. */
export interface UseActionBindingResult<
  Host,
  ComposedProps,
  Id extends string = string,
> {
  readonly ref: ActionBindingRefCallback<Host>;
  readonly hostProps: ComposedProps;
  /**
   * The last committed identity. Undefined before the first host commit, on
   * SSR, after teardown, or when resolution is an honest failure.
   */
  readonly getBinding: () => ActionBindingRef<Id> | undefined;
}

interface HeldBinding<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
> {
  readonly owner: object;
  readonly connection:
    | ActionConnection<F, Id, true, Mode>
    | ActionConnection<F, Id, false, Mode>;
  readonly attachment: ActionAttachment;
  readonly projection?: ActionAttachment;
  readonly inputKey?: unknown;
  readonly availabilityKeyPresent: boolean;
  readonly availabilityKey?: unknown;
}

interface LatestRender<
  Props,
  Input,
  ActionOutput,
  HostOutput,
  Id extends string,
> {
  readonly props: Readonly<Props>;
  readonly input: ((props: Readonly<Props>) => Input) | undefined;
  readonly inputKey?: unknown;
  readonly availabilityKeyPresent: boolean;
  readonly availabilityKey?: unknown;
  readonly onInvocation:
    | ((
        invocation: ActionObservedInvocation<ActionOutput, HostOutput, Id>,
        settlement: ActionSettlementCapability<Id>,
      ) => void | PromiseLike<void>)
    | undefined;
  readonly onInvocationError:
    | ((error: unknown) => void | PromiseLike<void>)
    | undefined;
}

type ContinuationOutcome<Result> =
  | { readonly kind: 'none' }
  | { readonly kind: 'returned'; readonly value: Result }
  | { readonly kind: 'threw'; readonly error: unknown };

/**
 * Connect a callable action to one committed React host.
 *
 * Render only composes props. The callback ref owns resolve/connect/attach and
 * their exact inverse; an insertion effect publishes the newest committed prop
 * readers without touching a host or changing binding identity.
 */
export function useActionBinding<
  F extends (...args: any[]) => any,
  Id extends string,
  Mode extends ActionInvocationMode,
  Props,
  Host,
  Interactive extends object,
  ValueElement extends object,
  This,
  EventArgs extends readonly unknown[],
  HostResult,
  ComposedProps,
>(
  runtime: ActionRuntime,
  definition: DefinedAction<F, Id, Mode>,
  props: Readonly<Props>,
  adapter: ActionHostAdapter<
    Props,
    Host,
    Interactive,
    ValueElement,
    ActionInvocationMiddleware<This, EventArgs, HostResult>,
    ComposedProps,
    Binding
  >,
  options: UseActionBindingOptions<
    Props,
    Mode extends 'scalar' ? Parameters<F>[0] : undefined,
    Interactive,
    Id,
    Awaited<ReturnType<F>>,
    Awaited<HostResult>
  > &
    (Mode extends 'scalar'
      ? unknown
      : { readonly input?: never; readonly inputKey?: never }),
): UseActionBindingResult<Host, ComposedProps, Id> {
  const held = useRef<HeldBinding<F, Id, Mode> | null>(null);
  const latest = useRef<
    LatestRender<
      Props,
      FirstParameter<F>,
      Awaited<ReturnType<F>>,
      Awaited<HostResult>,
      Id
    >
  >({
    props,
    input: options.input,
    ...('inputKey' in options ? { inputKey: options.inputKey } : {}),
    availabilityKeyPresent: Object.prototype.hasOwnProperty.call(
      options,
      'availabilityKey',
    ),
    ...('availabilityKey' in options
      ? { availabilityKey: options.availabilityKey }
      : {}),
    onInvocation: options.onInvocation,
    onInvocationError: options.onInvocationError,
  });

  const release = useCallback((owner?: object): void => {
    const current = held.current;
    if (current === null) return;
    if (owner !== undefined && current.owner !== owner) return;
    held.current = null;

    // Each release is idempotent in its own subsystem. The nesting guarantees
    // the core binding disappears even if an application-supplied projector has
    // a broken cleanup implementation.
    try {
      current.projection?.detach();
    } finally {
      try {
        current.attachment.detach();
      } finally {
        current.connection.disconnect();
      }
    }
  }, []);

  const hasInput = options.input !== undefined;
  const hasInputKey = Object.prototype.hasOwnProperty.call(options, 'inputKey');
  if (hasInput !== hasInputKey) {
    throw new TypeError(
      'hcifootprint: useActionBinding() requires input and inputKey together; inputKey names the committed semantic input generation.',
    );
  }
  const hasAvailabilityReaders =
    adapter.readEnabled !== undefined || adapter.readBusy !== undefined;
  const hasAvailabilityKey = Object.prototype.hasOwnProperty.call(
    options,
    'availabilityKey',
  );
  if (hasAvailabilityKey && !hasAvailabilityReaders) {
    throw new TypeError(
      'hcifootprint: useActionBinding() availabilityKey requires an adapter readEnabled/readBusy reader.',
    );
  }
  const projector = options.projector ?? null;
  const { attachmentKey, coverage, instance, node } = options;

  // One opaque owner per ref identity. It owns both the callback ref and the
  // listener middleware, so a stale composed callback can never report through
  // a successor binding.
  const owner = useMemo(
    () => ({}),
    [
      runtime,
      definition,
      adapter,
      node,
      instance,
      coverage,
      hasInput,
      hasAvailabilityKey,
      attachmentKey,
      projector,
    ],
  );

  // Commit the newest observers and, only when the semantic input key changes,
  // atomically replace the bound reader with one owned by this exact render.
  // An abandoned render never reaches this barrier.
  useInsertionEffect(() => {
    const rendered: LatestRender<
      Props,
      FirstParameter<F>,
      Awaited<ReturnType<F>>,
      Awaited<HostResult>,
      Id
    > = {
      props,
      input: options.input,
      ...(hasInputKey ? { inputKey: options.inputKey } : {}),
      availabilityKeyPresent: hasAvailabilityKey,
      ...(hasAvailabilityKey
        ? { availabilityKey: options.availabilityKey }
        : {}),
      onInvocation: options.onInvocation,
      onInvocationError: options.onInvocationError,
    };
    const current = held.current;
    let nextHeld = current;
    let publishedRevision = false;
    if (
      hasInput &&
      current !== null &&
      current.owner === owner &&
      !Object.is(current.inputKey, options.inputKey)
    ) {
      const readInput = () =>
        rendered.input?.(rendered.props) as FirstParameter<F>;
      try {
        (current.connection as ActionConnection<F, Id, true, Mode>).update({
          input: readInput,
        });
      } catch (error) {
        release(owner);
        throw error;
      }
      nextHeld = {
        ...current,
        inputKey: options.inputKey,
      };
      publishedRevision = true;
    }
    if (
      current !== null &&
      current.owner === owner &&
      hasAvailabilityReaders &&
      (!hasAvailabilityKey ||
        current.availabilityKeyPresent !== true ||
        !Object.is(current.availabilityKey, options.availabilityKey))
    ) {
      try {
        if (!publishedRevision) current.connection.touch();
      } catch (error) {
        release(owner);
        throw error;
      }
      nextHeld = {
        ...(nextHeld ?? current),
        availabilityKeyPresent: hasAvailabilityKey,
        ...(hasAvailabilityKey
          ? { availabilityKey: options.availabilityKey }
          : {}),
      };
    }
    if (nextHeld !== current) held.current = nextHeld;
    latest.current = rendered;
  });

  const invocation = useCallback(
    function (
      this: This,
      proceed: () => HostResult,
      ..._eventArgs: EventArgs
    ): HostResult {
      const current = held.current;
      if (current === null || current.owner !== owner) return proceed();
      const connection = current.connection;

      const captured: {
        outcome: ContinuationOutcome<HostResult>;
      } = { outcome: { kind: 'none' } };
      connection.invokeContinuation(() => {
        try {
          const value = proceed();
          captured.outcome = { kind: 'returned', value };
          return value;
        } catch (error) {
          captured.outcome = { kind: 'threw', error };
          throw error;
        }
      });
      const outcome = captured.outcome;
      if (outcome.kind === 'returned') return outcome.value;
      if (outcome.kind === 'threw') throw outcome.error;
      throw new Error(
        'hcifootprint: invokeContinuation() returned without executing the host continuation.',
      );
    },
    [owner],
  );

  const hostProps = adapter.composeInvocation(props, invocation);

  const ref = useCallback(
    (host: Host | null): void => {
      if (host === null) {
        release(owner);
        return;
      }

      // A replacement ref may arrive without an observable gap. Release the old
      // owner first, then either establish this exact target or remain absent.
      release();
      const committed = latest.current;
      const resolved = resolveActionHost(adapter, committed.props, host);
      if (resolved.kind === 'unresolved') return;

      // Coverage is evidence, not a heuristic. Successful element resolution
      // alone cannot create an identity-only or executable claim.
      const bindingCoverage = coverage ?? resolved.coverage;
      if (bindingCoverage === undefined) return;
      // This hook owns an invocation door. Identity/semantic-only adapters use
      // the record-only sensor hook instead; wrapping them here would turn
      // instrumentation into a blocker for the existing listener.
      if (bindingCoverage === 'identity' || bindingCoverage === 'semantic') {
        return;
      }
      // Any unknown runtime value deliberately continues into connectAction(),
      // the protocol's canonical fail-closed coverage ingress.

      const context = (): ActionHostContext<
        Props,
        Host,
        Interactive,
        ValueElement
      > => ({
        props: latest.current.props,
        host,
        interactive: resolved.interactive,
        valueElement: resolved.valueElement,
      });

      const deliverInvocation = (
        committedObservers: LatestRender<
          Props,
          FirstParameter<F>,
          Awaited<ReturnType<F>>,
          Awaited<HostResult>,
          Id
        >,
        opened: ActionObservedInvocation<Awaited<ReturnType<F>>, unknown, Id>,
        settlement: ActionSettlementCapability<Id>,
      ): void => {
        // The observer and its error sink are one committed pair for this
        // invocation. An async failure from an old render/binding must never be
        // delivered to a successor render's sink.
        const observer = committedObservers.onInvocation;
        const errorSink = committedObservers.onInvocationError;
        if (observer === undefined) return;
        const report = (error: unknown): void => {
          if (errorSink === undefined) return;
          try {
            void Promise.resolve(errorSink(error)).catch(() => undefined);
          } catch {
            // Observer diagnostics never replace application behavior.
          }
        };
        try {
          void Promise.resolve(
            observer(
              opened as ActionObservedInvocation<
                Awaited<ReturnType<F>>,
                Awaited<HostResult>,
                Id
              >,
              settlement,
            ),
          ).catch(report);
        } catch (error) {
          report(error);
        }
      };
      const observeInvocation = withObserverCapture(
        (
          opened: ActionObservedInvocation<Awaited<ReturnType<F>>, unknown, Id>,
          settlement: ActionSettlementCapability<Id>,
        ): void => deliverInvocation(latest.current, opened, settlement),
        () => {
          const committedObservers = latest.current;
          return (opened, settlement): void =>
            deliverInvocation(committedObservers, opened, settlement);
        },
      );
      const observeInvocationError = withObserverCapture(
        (error: unknown): void | PromiseLike<void> | undefined =>
          latest.current.onInvocationError?.(error),
        () => latest.current.onInvocationError,
      );

      const connectOptions: ConnectActionOptions<
        FirstParameter<F>,
        Awaited<ReturnType<F>>,
        Id
      > = {
        node,
        ...(instance !== undefined ? { instance } : {}),
        coverage: bindingCoverage,
        ...(resolved.locators !== undefined
          ? { locators: resolved.locators }
          : {}),
        humanReporting: 'connection',
        onInvocation: observeInvocation,
        onInvocationError: observeInvocationError,
        ...(hasInput
          ? {
              input: () =>
                committed.input?.(committed.props) as FirstParameter<F>,
            }
          : {}),
        ...(adapter.readEnabled !== undefined
          ? { enabled: () => adapter.readEnabled?.(context()) }
          : {}),
        ...(adapter.readBusy !== undefined
          ? { busy: () => adapter.readBusy?.(context()) }
          : {}),
      };

      let connection:
        | ActionConnection<F, Id, true, Mode>
        | ActionConnection<F, Id, false, Mode>
        | undefined;
      let attachment: ActionAttachment | undefined;
      let projected: ActionAttachment | undefined;
      try {
        const connectCommitted = connectAction as (
          selectedRuntime: ActionRuntime,
          selectedDefinition: DefinedAction<F, Id, Mode>,
          selectedOptions: ConnectActionOptions<
            FirstParameter<F>,
            Awaited<ReturnType<F>>,
            Id
          >,
        ) =>
          | ActionConnection<F, Id, true, Mode>
          | ActionConnection<F, Id, false, Mode>;
        connection = connectCommitted(runtime, definition, connectOptions);
        attachment = connection.attach({
          interactive: resolved.interactive,
          ...(resolved.valueElement !== undefined
            ? { valueElement: resolved.valueElement }
            : {}),
          coverage: bindingCoverage,
          ...(resolved.locators !== undefined
            ? { locators: resolved.locators }
            : {}),
          humanReporting: 'connection',
        });
        projected = projector?.projectBinding({
          binding: connection.binding,
          element: resolved.interactive,
        });
        held.current = {
          owner,
          connection,
          attachment,
          ...(hasInputKey ? { inputKey: committed.inputKey } : {}),
          availabilityKeyPresent: committed.availabilityKeyPresent,
          ...(committed.availabilityKeyPresent
            ? { availabilityKey: committed.availabilityKey }
            : {}),
          ...(projected !== undefined ? { projection: projected } : {}),
        };
      } catch (error) {
        try {
          projected?.detach();
        } finally {
          try {
            attachment?.detach();
          } finally {
            connection?.disconnect();
          }
        }
        throw error;
      }
    },
    [owner, release],
  );

  const getBinding = useCallback(
    (): ActionBindingRef<Id> | undefined => held.current?.connection.binding,
    [],
  );

  return { ref, hostProps, getBinding };
}
