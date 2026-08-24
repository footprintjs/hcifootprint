import { useCallback, useInsertionEffect, useMemo, useRef } from 'react';
import type { Binding } from '../atom/types.js';
import { connectAction } from '../action/connection.js';
import { resolveActionHost } from '../action/host-adapter.js';
import type {
  ActionHostAdapter,
  ActionHostContext,
  ActionInvocationMiddleware,
} from '../action/host-adapter.js';
import type {
  ActionAttachment,
  ActionBindingRef,
  ActionBindingRuntime,
  ActionConnection,
  ActionEffectSettlement,
  ActionEffectSettlementInput,
  ActionInvocation,
  ActionTransitionRef,
  BindingCoverage,
  ConnectActionOptions,
  DefinedAction,
} from '../action/types.js';

type FirstParameter<F extends (...args: any[]) => any> = Parameters<F> extends []
  ? undefined
  : Parameters<F>[0];

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

/** Stable identity and explicit host facts for one React binding. */
export interface UseActionBindingOptions<
  Props,
  Input,
  Interactive extends object,
  Id extends string = string,
  Output = unknown,
> {
  readonly node: string;
  readonly instance?: string;
  /** Explicit fallback when coverage belongs to the call site rather than the adapter. */
  readonly coverage?: BindingCoverage;
  /** Application-owned input for direct agent invocation; never scraped from the host. */
  readonly input?: (props: Readonly<Props>) => Input;
  /**
   * A deliberate ref-identity key for props that change descendant resolution,
   * projected coverage, or locators. Ordinary props do not reattach.
   */
  readonly attachmentKey?: unknown;
  /** The watcher/projector that owns a portal's physical interactive root. */
  readonly projector?: ActionBindingProjector<Interactive, Id> | null;
  /**
   * Receive the exact transition plus a narrow effect-settlement capability.
   * Errors from this observer never replace the host listener's own result.
   */
  readonly onInvocation?: (
    invocation: ActionInvocation<Output, Id>,
    settlement: ActionSettlementCapability<Id>,
  ) => void | PromiseLike<void>;
  /** Optional sink for an `onInvocation` observer failure. */
  readonly onInvocationError?: (error: unknown) => void | PromiseLike<void>;
}

/** The only connection authority exposed to an effect observer. */
export interface ActionSettlementCapability<Id extends string = string> {
  readonly binding: ActionBindingRef<Id>;
  settle(
    transition: ActionTransitionRef<Id>,
    settlement: ActionEffectSettlementInput,
  ): ActionEffectSettlement<Id>;
}

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
> {
  readonly owner: object;
  readonly connection:
    | ActionConnection<F, Id, true>
    | ActionConnection<F, Id, false>;
  readonly attachment: ActionAttachment;
  readonly projection?: ActionAttachment;
}

interface LatestRender<Props, Input, Output, Id extends string> {
  readonly props: Readonly<Props>;
  readonly input: ((props: Readonly<Props>) => Input) | undefined;
  readonly onInvocation:
    | ((
        invocation: ActionInvocation<Output, Id>,
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
  Props,
  Host,
  Interactive extends object,
  ValueElement extends object,
  This,
  EventArgs extends readonly unknown[],
  ComposedProps,
>(
  runtime: ActionBindingRuntime,
  definition: DefinedAction<F, Id>,
  props: Readonly<Props>,
  adapter: ActionHostAdapter<
    Props,
    Host,
    Interactive,
    ValueElement,
    ActionInvocationMiddleware<This, EventArgs, ReturnType<F>>,
    ComposedProps,
    Binding
  >,
  options: Parameters<F> extends []
    ? Omit<
        UseActionBindingOptions<
          Props,
          undefined,
          Interactive,
          Id,
          Awaited<ReturnType<F>>
        >,
        'input'
      > & { readonly input?: never }
    : UseActionBindingOptions<
        Props,
        Parameters<F>[0],
        Interactive,
        Id,
        Awaited<ReturnType<F>>
      >,
): UseActionBindingResult<Host, ComposedProps, Id> {
  const held = useRef<HeldBinding<F, Id> | null>(null);
  const latest = useRef<
    LatestRender<
      Props,
      FirstParameter<F>,
      Awaited<ReturnType<F>>,
      Id
    >
  >({
    props,
    input: options.input,
    onInvocation: options.onInvocation,
    onInvocationError: options.onInvocationError,
  });

  // No host work belongs here. This is only the commit barrier for lazy facts:
  // an abandoned render can compose props, but it never becomes readable by a
  // live connection.
  useInsertionEffect(() => {
    latest.current = {
      props,
      input: options.input,
      onInvocation: options.onInvocation,
      onInvocationError: options.onInvocationError,
    };
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
      attachmentKey,
      projector,
    ],
  );

  // The stable input reader below closes over `latest`. Once a same-owner
  // render commits, publish a fresh binding generation so an offer minted
  // against the previous committed props cannot read this commit's input.
  // Input stays lazy: neither commit nor availability executes the reader.
  useInsertionEffect(() => {
    const current = held.current;
    if (!hasInput || current === null || current.owner !== owner) return;
    current.connection.update({});
  });

  const invocation = useCallback(
    function (
      this: This,
      proceed: () => ReturnType<F>,
      ..._eventArgs: EventArgs
    ): ReturnType<F> {
      const current = held.current;
      if (current === null || current.owner !== owner) return proceed();
      const connection = current.connection;

      const captured: {
        outcome: ContinuationOutcome<ReturnType<F>>;
      } = { outcome: { kind: 'none' } };
      const opened = connection.invokeContinuation(() => {
        try {
          const value = proceed();
          captured.outcome = { kind: 'returned', value };
          return value;
        } catch (error) {
          captured.outcome = { kind: 'threw', error };
          throw error;
        }
      });
      const settlementCapability: ActionSettlementCapability<Id> = Object.freeze({
        binding: connection.binding,
        settle: (
          transition: ActionTransitionRef<Id>,
          settlement: ActionEffectSettlementInput,
        ): ActionEffectSettlement<Id> => {
          if (transition !== opened.transition) {
            throw new Error(
              `hcifootprint: this settlement capability belongs to transition '${opened.transition.transitionId}', not '${transition.transitionId}'.`,
            );
          }
          return connection.settle(transition, settlement);
        },
      });
      const committedObserver = latest.current;
      const observer = committedObserver.onInvocation;
      if (observer !== undefined) {
        const reportObserverError = (error: unknown): void => {
          const sink = committedObserver.onInvocationError;
          if (sink === undefined) return;
          try {
            // A rejected async error sink is instrumentation failure too. Mark it
            // handled without letting it become an unhandled rejection.
            void Promise.resolve(sink(error)).catch(() => undefined);
          } catch {
            // Instrumentation observers never replace the application
            // listener's own return value or thrown value.
          }
        };
        try {
          void Promise.resolve(observer(opened, settlementCapability)).catch(
            reportObserverError,
          );
        } catch (error) {
          reportObserverError(error);
        }
      }

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
      if (
        bindingCoverage === 'identity' ||
        bindingCoverage === 'semantic'
      ) {
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

      const connectOptions: ConnectActionOptions<FirstParameter<F>> = {
        node,
        ...(instance !== undefined ? { instance } : {}),
        coverage: bindingCoverage,
        ...(resolved.locators !== undefined
          ? { locators: resolved.locators }
          : {}),
        humanReporting: 'connection',
        ...(hasInput
          ? {
              input: () =>
                latest.current.input?.(latest.current.props) as FirstParameter<F>,
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
        | ActionConnection<F, Id, true>
        | ActionConnection<F, Id, false>
        | undefined;
      let attachment: ActionAttachment | undefined;
      let projected: ActionAttachment | undefined;
      try {
        const connectCommitted = connectAction as (
          selectedRuntime: ActionBindingRuntime,
          selectedDefinition: DefinedAction<F, Id>,
          selectedOptions: ConnectActionOptions<FirstParameter<F>>,
        ) =>
          | ActionConnection<F, Id, true>
          | ActionConnection<F, Id, false>;
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
