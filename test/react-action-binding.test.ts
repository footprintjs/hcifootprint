import { Fragment, StrictMode, createElement } from 'react';
import type { ReactElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { createActionRuntime } from '../src/action/connection.js';
import { defineAction } from '../src/action/definition.js';
import {
  composeActionInvocation,
  type ActionHostAdapter,
  type ActionInvocationMiddleware,
} from '../src/action/host-adapter.js';
import type {
  ActionBindingRef,
  ActionRuntime,
  ActionConnection,
  ActionInvocation,
  ActionObservedInvocation,
  ActionOffer,
  BoundActionOffer,
  BindingCoverage,
  DefinedAction,
  InputlessActionOffer,
} from '../src/action/types.js';
import type { Principal } from '../src/atom/types.js';
import {
  useActionBinding,
  type ActionBindingProjector,
  type ActionSettlementCapability,
  type UseActionBindingOptions,
  type UseActionBindingResult,
} from '../src/react/index.js';
// Reuse the React test environment flag and its once-only renderer notice.
import './react-fixture.js';

interface PressEvent {
  readonly id: string;
}

interface Receiver {
  readonly name: string;
}

interface Interactive {
  readonly kind: 'button';
  readonly id: string;
}

interface ValueElement {
  readonly kind: 'input';
  readonly id: string;
}

function closedOffer<
  Id extends string,
  F extends (...args: any[]) => any,
  P extends Principal,
>(
  offer: ActionOffer<Id, F, P>,
): BoundActionOffer<Id, F, P> | InputlessActionOffer<Id, F, P> {
  if (offer.inputMode === 'open') {
    throw new Error(
      'Expected an offer whose invocation input is already closed.',
    );
  }
  return offer;
}

interface Host {
  readonly kind: 'wrapper';
  readonly interactive: Interactive;
  readonly valueElement: ValueElement;
}

type Resolution = 'resolved' | 'absent' | 'ambiguous' | 'unsupported';

interface HostProps<Result> {
  readonly enabled: boolean;
  readonly busy?: string;
  readonly resolution?: Resolution;
  readonly onPress: (this: Receiver, event: PressEvent) => Result;
}

type TestAction<Result> = DefinedAction<
  (this: Receiver, event: PressEvent) => Result,
  string
>;

type TestAdapter<Result> = ActionHostAdapter<
  HostProps<Result>,
  Host,
  Interactive,
  ValueElement,
  ActionInvocationMiddleware<Receiver, [PressEvent], Result>,
  HostProps<Result>
>;

function hostAdapter<Result>(): TestAdapter<Result> {
  return {
    composeInvocation(props, invoke) {
      return {
        ...props,
        onPress: composeActionInvocation(props.onPress, invoke),
      };
    },
    resolve(props, host) {
      const resolution = props.resolution ?? 'resolved';
      if (resolution !== 'resolved') {
        return { kind: 'unresolved', reason: resolution };
      }
      return {
        kind: 'resolved',
        interactive: host.interactive,
        valueElement: host.valueElement,
      };
    },
    readEnabled(context) {
      return context.props.enabled;
    },
    readBusy(context) {
      return context.props.busy;
    },
    readCoverage() {
      return 'executable';
    },
    projectLocators(context) {
      return [
        {
          kind: 'element',
          locator: { role: 'button', name: context.interactive.id },
          actuation: 'click',
        },
      ];
    },
  };
}

interface BoundProps<Result> {
  readonly runtime: ActionRuntime;
  readonly action: TestAction<Result>;
  readonly adapter: TestAdapter<Result>;
  readonly host: Host;
  readonly actionProps: HostProps<Result>;
  readonly node?: string;
  readonly instance?: string;
  readonly coverage?: BindingCoverage;
  readonly projector?: ActionBindingProjector<Interactive>;
  readonly attachmentKey?: unknown;
  readonly input?: (props: Readonly<HostProps<Result>>) => PressEvent;
  readonly inputKey?: unknown;
  readonly availabilityKey?: unknown;
  readonly onInvocation?: (
    invocation: ActionInvocation<Awaited<Result>>,
    settlement: ActionSettlementCapability,
  ) => void | PromiseLike<void>;
  readonly onInvocationError?: (error: unknown) => void | PromiseLike<void>;
  readonly expose?: (
    binding: UseActionBindingResult<Host, HostProps<Result>, string>,
  ) => void;
}

function Bound<Result>(props: BoundProps<Result>): ReactElement {
  const options = {
    node: props.node ?? 'screen.actions',
    ...(props.instance !== undefined ? { instance: props.instance } : {}),
    ...(props.coverage !== undefined ? { coverage: props.coverage } : {}),
    ...(props.projector !== undefined ? { projector: props.projector } : {}),
    ...(props.attachmentKey !== undefined
      ? { attachmentKey: props.attachmentKey }
      : {}),
    ...(props.input !== undefined
      ? { input: props.input, inputKey: props.inputKey }
      : {}),
    ...(props.availabilityKey !== undefined
      ? { availabilityKey: props.availabilityKey }
      : {}),
    ...(props.onInvocation !== undefined
      ? { onInvocation: props.onInvocation }
      : {}),
    ...(props.onInvocationError !== undefined
      ? { onInvocationError: props.onInvocationError }
      : {}),
  } as UseActionBindingOptions<
    HostProps<Result>,
    PressEvent,
    Interactive,
    string,
    Awaited<Result>
  >;
  const binding = useActionBinding(
    props.runtime,
    props.action,
    props.actionProps,
    props.adapter,
    options,
  );
  props.expose?.(binding);
  return createElement('div', {
    ...binding.hostProps,
    ref: binding.ref,
    node: props.host,
  });
}

function bound<Result>(props: BoundProps<Result>): ReactElement {
  return createElement(Bound<Result>, props);
}

interface Mounted {
  readonly renderer: ReactTestRenderer;
  render(element: ReactElement): void;
  unmount(): void;
}

function mount(element: ReactElement, provideHosts = true): Mounted {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element, {
      createNodeMock: (rendered) =>
        provideHosts
          ? ((rendered.props as { node?: object }).node ?? null)
          : null,
    });
  });
  return {
    renderer,
    render(next) {
      act(() => renderer.update(next));
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

function wrapper(id: string): Host {
  return {
    kind: 'wrapper',
    interactive: { kind: 'button', id },
    valueElement: { kind: 'input', id: `${id}-value` },
  };
}

function press<Result>(
  renderer: ReactTestRenderer,
  receiver: Receiver,
  event: PressEvent,
  index = 0,
): Result {
  const element = renderer.root.findAllByType('div')[index];
  return (element?.props as HostProps<Result>).onPress.call(receiver, event);
}

function Probe(props: { readonly read: () => void }): null {
  props.read();
  return null;
}

describe('useActionBinding', () => {
  it('keeps render pure and executes the existing branded listener once with its exact behavior', async () => {
    const runtime = createActionRuntime();
    const host = wrapper('Save');
    const receiver = { name: 'toolbar' };
    const event = { id: 'press-1' };
    const exact = { saved: true };
    let calls = 0;
    let observed: ActionInvocation<typeof exact> | undefined;
    const action = defineAction('draft.save', {
      does: 'Save the draft',
      invocation: 'host',
      mutate: function (this: Receiver, received: PressEvent) {
        calls += 1;
        expect(this).toBe(receiver);
        expect(received).toBe(event);
        return exact;
      },
    });
    const adapter = hostAdapter<typeof exact>();
    let exposed:
      | UseActionBindingResult<Host, HostProps<typeof exact>, string>
      | undefined;
    let bindingsDuringRender = -1;

    const tree = mount(
      createElement(
        Fragment,
        null,
        bound({
          runtime,
          action,
          adapter,
          host,
          actionProps: { enabled: true, onPress: action },
          onInvocation(invocation) {
            observed = invocation;
          },
          expose: (binding) => {
            exposed = binding;
          },
        }),
        createElement(Probe, {
          read: () => {
            bindingsDuringRender = runtime.bindings().length;
          },
        }),
      ),
    );

    expect(bindingsDuringRender).toBe(0);
    expect(runtime.bindings()).toHaveLength(1);
    expect(exposed?.getBinding()).toBe(runtime.bindings()[0]?.ref);
    expect(press(tree.renderer, receiver, event)).toBe(exact);
    expect(calls).toBe(1);
    await Promise.resolve();
    expect(runtime.transitionFor(observed!.transition)).toMatchObject({
      invocationStatus: 'performed',
      produced: exact,
      effectStatus: 'unverified',
    });
  });

  it('keeps a host listener result independent from the action mutation result', async () => {
    const runtime = createActionRuntime();
    const host = wrapper('Independent outputs');
    const exact = { saved: true as const };
    let mutationCalls = 0;
    let listenerCalls = 0;
    const action = defineAction('draft.independent-host-result', {
      does: 'Save through either application behavior',
      invocation: 'inputless',
      mutate: async () => {
        mutationCalls += 1;
        return exact;
      },
    });
    type Props = { readonly onPress: () => void };
    const adapter: ActionHostAdapter<
      Props,
      Host,
      Interactive,
      ValueElement,
      ActionInvocationMiddleware<void, readonly [], void>,
      Props
    > = {
      composeInvocation(props, invoke) {
        return {
          onPress: composeActionInvocation(props.onPress, invoke),
        };
      },
      resolve(_props, committedHost) {
        return {
          kind: 'resolved',
          interactive: committedHost.interactive,
          valueElement: committedHost.valueElement,
        };
      },
    };
    const observed: Array<
      ActionObservedInvocation<
        typeof exact,
        void,
        'draft.independent-host-result'
      >
    > = [];

    function IndependentResultBinding(): ReactElement {
      const props: Props = {
        onPress: () => {
          listenerCalls += 1;
        },
      };
      const binding = useActionBinding(runtime, action, props, adapter, {
        node: 'draft',
        coverage: 'executable',
        onInvocation(invocation) {
          observed.push(invocation);
        },
      });
      return createElement('div', {
        ...binding.hostProps,
        ref: binding.ref,
        node: host,
      });
    }

    const tree = mount(createElement(IndependentResultBinding));
    const hostResult = (
      tree.renderer.root.findByType('div').props as Props
    ).onPress();
    expect(hostResult).toBeUndefined();
    expect(listenerCalls).toBe(1);
    expect(mutationCalls).toBe(0);
    expect(observed[0]?.behavior).toBe('host-continuation');
    await expect(observed[0]?.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: undefined,
    });

    const offer = runtime.forPrincipal('agent').offers(action)[0]!;
    const brokered = runtime.forPrincipal('agent').invoke(offer);
    expect(observed[1]).toBe(brokered);
    expect(observed[1]?.behavior).toBe('mutation');
    await expect(brokered.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: exact,
    });
    expect(mutationCalls).toBe(1);
    expect(listenerCalls).toBe(1);
    tree.unmount();
  });

  it('exposes only a frozen, invocation-exact effect settlement capability', async () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.verify-save', {
      does: 'Save and verify the draft',
      invocation: 'inputless',
      settle: { writes: ['draft.savedRevision'] },
      mutate: () => 'saved',
    });
    let observed: ActionInvocation<string> | undefined;
    let capability: ActionSettlementCapability | undefined;
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<string>(),
        host: wrapper('Verify save'),
        actionProps: { enabled: true, onPress: action },
        coverage: 'verifiable',
        onInvocation(invocation, settlement) {
          observed = invocation;
          capability = settlement;
        },
      }),
    );

    expect(press(tree.renderer, { name: 'toolbar' }, { id: 'save' })).toBe(
      'saved',
    );
    expect(observed).toBeDefined();
    expect(capability).toBeDefined();
    expect(Object.isFrozen(capability)).toBe(true);
    expect(Object.keys(capability!).sort()).toEqual(['binding', 'settle']);
    expect(capability).not.toHaveProperty('disconnect');
    expect(capability?.binding).toBe(observed?.transition.binding);

    const settled = capability!.settle({
      status: 'verified',
      evidence: { source: 'application-store' },
    });
    await expect(observed!.whenEffectSettled).resolves.toBe(settled);
    expect(settled).toMatchObject({
      status: 'verified',
      evidence: { source: 'application-store' },
    });
    expect(settled.transition).toBe(observed!.transition);
  });

  it('delivers an agent-brokered offer to the same React effect observer', async () => {
    const runtime = createActionRuntime();
    let calls = 0;
    const action = defineAction('draft.verify-agent-save', {
      does: 'Save and verify through the broker',
      invocation: 'inputless',
      settle: { writes: ['draft.savedRevision'] },
      mutate: () => {
        calls += 1;
        return 'saved-by-agent';
      },
    });
    let observed: ActionInvocation<string> | undefined;
    let capability: ActionSettlementCapability | undefined;
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<string>(),
        host: wrapper('Verify agent save'),
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'available',
        coverage: 'verifiable',
        onInvocation(invocation, settlement) {
          observed = invocation;
          capability = settlement;
        },
      }),
    );
    const offer = runtime.forPrincipal('system').offers(action)[0]!;

    const invocation = runtime.forPrincipal('system').invoke(offer);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'saved-by-agent',
    });
    expect(calls).toBe(1);
    expect(observed).toBe(invocation);
    expect(capability?.binding).toBe(invocation.transition.binding);
    const settled = capability!.settle({
      status: 'verified',
      evidence: { source: 'react-store' },
    });
    await expect(invocation.whenEffectSettled).resolves.toBe(settled);
    tree.unmount();
  });

  it('routes a retained broker offer through the latest committed React observers', async () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.latest-agent-observer', {
      does: 'Use the latest committed observer',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Latest agent observer');
    const observerError = new Error('latest observer failed');
    const observed: string[] = [];
    const reported: Array<{ generation: string; error: unknown }> = [];
    const view = (generation: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'stable',
        onInvocation() {
          observed.push(generation);
          throw observerError;
        },
        onInvocationError(error) {
          reported.push({ generation, error });
        },
      });

    const tree = mount(view('first'));
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    tree.render(view('second'));
    expect(runtime.forPrincipal('system').offers(action)[0]).toBe(offer);

    const invocation = runtime.forPrincipal('system').invoke(offer);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'saved',
    });
    expect(observed).toEqual(['second']);
    expect(reported).toEqual([{ generation: 'second', error: observerError }]);

    tree.unmount();
    expect(() => runtime.forPrincipal('system').invoke(offer)).toThrow(
      /stale|no longer serves|not a live offer/,
    );
  });

  it('keeps a transition with the observer generation present when its host behavior began', async () => {
    const runtime = createActionRuntime();
    const observerError = new Error('first observer failed');
    const observed: string[] = [];
    const reported: Array<{ generation: string; error: unknown }> = [];
    let tree!: Mounted;
    const action = defineAction('draft.sync-observer-generation', {
      does: 'Close the current generation',
      invocation: 'inputless',
      mutate: () => {
        tree.render(view('second'));
        return 'closed';
      },
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Synchronous observer generation');
    const view = (generation: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'stable',
        onInvocation() {
          observed.push(generation);
          throw observerError;
        },
        onInvocationError(error) {
          reported.push({ generation, error });
        },
      });

    tree = mount(view('first'));
    expect(press(tree.renderer, { name: 'dialog' }, { id: 'close' })).toBe(
      'closed',
    );
    await Promise.resolve();
    expect(observed).toEqual(['first']);
    expect(reported).toEqual([{ generation: 'first', error: observerError }]);
    tree.unmount();
  });

  it('keeps a broker transition with the observer generation present when its mutation began', async () => {
    const runtime = createActionRuntime();
    const observed: string[] = [];
    let tree!: Mounted;
    const action = defineAction('draft.sync-broker-observer-generation', {
      does: 'Replace the current generation through the broker',
      invocation: 'inputless',
      mutate: () => {
        tree.render(view('second'));
        return 'replaced';
      },
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Synchronous broker observer generation');
    const view = (generation: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'stable',
        onInvocation() {
          observed.push(generation);
        },
      });

    tree = mount(view('first'));
    const system = runtime.forPrincipal('system');
    const invocation = system.invoke(system.offers(action)[0]!);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'replaced',
    });
    expect(observed).toEqual(['first']);
    tree.unmount();
  });

  it('keeps broker progress diagnostics with the error sink present when its mutation began', async () => {
    const runtime = createActionRuntime();
    const reported: Array<{ generation: string; error: unknown }> = [];
    let tree!: Mounted;
    const action = defineAction('draft.sync-progress-error-generation', {
      does: 'Report progress while replacing the current generation',
      invocation: 'inputless',
      settle: { progress: { stages: ['started'], required: true } },
      mutate: (lifecycle) => {
        tree.render(view('second'));
        lifecycle?.reportProgress('unknown' as 'started');
        return 'replaced';
      },
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Synchronous progress error generation');
    const view = (generation: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'stable',
        onInvocationError(error) {
          reported.push({ generation, error });
        },
      });

    tree = mount(view('first'));
    const system = runtime.forPrincipal('system');
    const invocation = system.invoke(system.offers(action)[0]!);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'performed',
      produced: 'replaced',
    });
    expect(reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      generation: 'first',
      error: { code: 'ACTION_PROGRESS_STAGE_UNKNOWN', stage: 'unknown' },
    });
    tree.unmount();
  });

  it("keeps each async observer failure with that invocation's committed error sink", async () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.async-observer-generation', {
      does: 'Keep observer diagnostics generation-owned',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Async observer generation');
    const observerError = new Error('old observer rejected');
    let rejectObserver!: (error: unknown) => void;
    let reportError!: (reported: {
      generation: string;
      error: unknown;
    }) => void;
    const reported = new Promise<{ generation: string; error: unknown }>(
      (resolve) => {
        reportError = resolve;
      },
    );
    const view = (instance: string, generation: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        instance,
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'stable',
        onInvocation() {
          if (generation !== 'first') return;
          return new Promise<void>((_resolve, reject) => {
            rejectObserver = reject;
          });
        },
        onInvocationError(error) {
          reportError({ generation, error });
        },
      });

    const tree = mount(view('draft-1', 'first'));
    const invocation = runtime
      .forPrincipal('system')
      .invoke(runtime.forPrincipal('system').offers(action)[0]!);
    await invocation.whenInvoked;
    tree.render(view('draft-2', 'second'));
    expect(runtime.bindings()[0]?.ref.instance).toBe('draft-2');

    rejectObserver(observerError);
    await expect(reported).resolves.toEqual({
      generation: 'first',
      error: observerError,
    });
    tree.unmount();
  });

  it.each(['synchronous', 'asynchronous'] as const)(
    'severs a %s invocation-observer error from the listener result and transition',
    async (mode) => {
      const runtime = createActionRuntime();
      const observerError = new Error(`${mode} observer failed`);
      const sinkError = new Error('observer error sink failed');
      let reportObserverError!: (error: unknown) => void;
      const reported = new Promise<unknown>((resolve) => {
        reportObserverError = resolve;
      });
      let calls = 0;
      const action = defineAction(`observer.${mode}`, {
        does: 'Keep observer failure off the application path',
        invocation: 'inputless',
        mutate: () => {
          calls += 1;
          return 'application-result';
        },
      });
      const failObserver =
        mode === 'synchronous'
          ? () => {
              throw observerError;
            }
          : async () => {
              throw observerError;
            };
      let observed: ActionInvocation<string> | undefined;
      const tree = mount(
        bound({
          runtime,
          action,
          adapter: hostAdapter<string>(),
          host: wrapper(mode),
          actionProps: { enabled: true, onPress: action },
          onInvocation(invocation) {
            observed = invocation;
            return failObserver();
          },
          onInvocationError(error) {
            reportObserverError(error);
            throw sinkError;
          },
        }),
      );

      expect(press(tree.renderer, { name: 'toolbar' }, { id: mode })).toBe(
        'application-result',
      );
      expect(calls).toBe(1);
      await expect(reported).resolves.toBe(observerError);
      await Promise.resolve();
      expect(runtime.transitionFor(observed!.transition)).toMatchObject({
        invocationStatus: 'performed',
        produced: 'application-result',
      });
    },
  );

  it('rethrows the exact listener failure after the runtime records it once', () => {
    const runtime = createActionRuntime();
    const error = new Error('exact application failure');
    let calls = 0;
    let observed: ActionInvocation<never> | undefined;
    const action = defineAction('draft.fail', {
      does: 'Fail to save',
      invocation: 'inputless',
      mutate: () => {
        calls += 1;
        throw error;
      },
    });
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<never>(),
        host: wrapper('Fail'),
        actionProps: { enabled: true, onPress: action },
        onInvocation(invocation) {
          observed = invocation;
        },
      }),
    );

    expect(() =>
      press(tree.renderer, { name: 'toolbar' }, { id: 'press' }),
    ).toThrow(error);
    expect(calls).toBe(1);
    expect(runtime.transitionFor(observed!.transition)).toMatchObject({
      invocationStatus: 'failed',
      error,
      effectStatus: 'unverified',
    });
  });

  it('projects the actual interactive descendant to the physical-root owner and cleans it token-safely', () => {
    const runtime = createActionRuntime();
    const host = wrapper('Portal Save');
    const action = defineAction('portal.save', {
      does: 'Save',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    let projected:
      | { readonly binding: ActionBindingRef; readonly element: Interactive }
      | undefined;
    let liveToken = 0;
    let detachCalls = 0;
    const projector: ActionBindingProjector<Interactive> = {
      projectBinding(projection) {
        projected = projection;
        const token = (liveToken += 1);
        return {
          detach() {
            if (liveToken !== token) return;
            detachCalls += 1;
            liveToken = 0;
          },
        };
      },
    };

    const tree = mount(
      createElement(
        StrictMode,
        null,
        bound({
          runtime,
          action,
          adapter: hostAdapter<string>(),
          host,
          actionProps: { enabled: true, onPress: action },
          projector,
        }),
      ),
    );

    expect(runtime.bindings()).toHaveLength(1);
    expect(projected?.element).toBe(host.interactive);
    expect(projected?.element).not.toBe(host as unknown);
    expect(projected?.binding).toBe(runtime.bindings()[0]?.ref);
    tree.unmount();
    expect(runtime.bindings()).toEqual([]);
    expect(liveToken).toBe(0);
    expect(detachCalls).toBeGreaterThan(0);
  });

  it.each(['absent', 'ambiguous', 'unsupported'] as const)(
    'creates no live binding when the committed target is %s',
    (resolution) => {
      const runtime = createActionRuntime();
      const action = defineAction('missing.save', {
        does: 'Save',
        invocation: 'inputless',
        mutate: () => 'saved',
      });
      let exposed:
        | UseActionBindingResult<Host, HostProps<string>, string>
        | undefined;

      mount(
        bound({
          runtime,
          action,
          adapter: hostAdapter<string>(),
          host: wrapper('Missing'),
          actionProps: { enabled: true, resolution, onPress: action },
          expose: (binding) => {
            exposed = binding;
          },
        }),
      );

      expect(runtime.bindings()).toEqual([]);
      expect(exposed?.getBinding()).toBeUndefined();
    },
  );

  it('does not turn successful element resolution into inferred executable coverage', () => {
    const runtime = createActionRuntime();
    let calls = 0;
    const action = defineAction('unknown.save', {
      does: 'Save',
      invocation: 'inputless',
      mutate: () => {
        calls += 1;
        return 'saved';
      },
    });
    const { readCoverage: _omitted, ...withoutCoverage } =
      hostAdapter<string>();
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: withoutCoverage,
        host: wrapper('Unknown coverage'),
        actionProps: { enabled: true, onPress: action },
      }),
    );

    expect(runtime.bindings()).toEqual([]);
    expect(press(tree.renderer, { name: 'toolbar' }, { id: 'press' })).toBe(
      'saved',
    );
    expect(
      calls,
      'the unconnected host still keeps its application behavior',
    ).toBe(1);
  });

  it.each(['identity', 'semantic'] as const)(
    'preserves the existing listener and creates no binding for %s-only coverage',
    (coverage) => {
      const runtime = createActionRuntime();
      let calls = 0;
      let projectionCalls = 0;
      const action = defineAction(`coverage.${coverage}`, {
        does: 'Keep the application listener',
        invocation: 'inputless',
        mutate: () => {
          calls += 1;
          return coverage;
        },
      });
      const projector: ActionBindingProjector<Interactive> = {
        projectBinding() {
          projectionCalls += 1;
          return { detach() {} };
        },
      };
      const tree = mount(
        bound({
          runtime,
          action,
          adapter: hostAdapter<string>(),
          host: wrapper(coverage),
          actionProps: { enabled: true, onPress: action },
          coverage,
          projector,
        }),
      );

      expect(runtime.bindings()).toEqual([]);
      expect(
        press(tree.renderer, { name: 'toolbar' }, { id: `press-${coverage}` }),
      ).toBe(coverage);
      expect(calls).toBe(1);
      expect(projectionCalls).toBe(0);
    },
  );

  it('creates no binding when a server-shaped renderer supplies no host refs', () => {
    const runtime = createActionRuntime();
    const action = defineAction('ssr.save', {
      does: 'Save',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<string>(),
        host: wrapper('SSR'),
        actionProps: { enabled: true, onPress: action },
      }),
      false,
    );

    expect(runtime.bindings()).toEqual([]);
    tree.unmount();
    expect(runtime.bindings()).toEqual([]);
  });

  it('reads the latest committed enabled and busy props without replacing binding identity', () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.save', {
      does: 'Save',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Save');
    let duringRender = -1;
    let exposed:
      | UseActionBindingResult<Host, HostProps<string>, string>
      | undefined;
    const view = (enabled: boolean, busy?: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: {
          enabled,
          ...(busy !== undefined ? { busy } : {}),
          onPress: action,
        },
        expose: (binding) => {
          exposed = binding;
        },
      });

    const tree = mount(view(true));
    const identity = exposed?.getBinding();

    tree.render(
      createElement(
        Fragment,
        null,
        view(false, 'Saving now'),
        createElement(Probe, {
          read: () => {
            duringRender = runtime.forPrincipal('system').offers().length;
          },
        }),
      ),
    );

    expect(
      duringRender,
      'the in-flight render must not leak into live readers',
    ).toBe(1);
    expect(exposed?.getBinding()).toBe(identity);
    expect(runtime.bindingFor(identity!)).toMatchObject({
      enabled: false,
      busy: 'Saving now',
    });
    expect(runtime.forPrincipal('system').offers()).toEqual([]);
  });

  it('retires an offer across unobserved enabled and busy round trips', () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.transient-availability', {
      does: 'Save after transient availability',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Transient availability');
    const view = (enabled: boolean, busy?: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: {
          enabled,
          ...(busy !== undefined ? { busy } : {}),
          onPress: action,
        },
      });

    const tree = mount(view(true));
    const beforeEnabledRoundTrip = runtime.forPrincipal('system').offers()[0]!;
    tree.render(view(false));
    tree.render(view(true));
    expect(() =>
      runtime
        .forPrincipal('system')
        .invoke(closedOffer(beforeEnabledRoundTrip)),
    ).toThrow(/stale|no longer serves|not a live offer/);

    const beforeBusyRoundTrip = runtime.forPrincipal('system').offers()[0]!;
    tree.render(view(true, 'Saving'));
    tree.render(view(true));
    expect(() =>
      runtime.forPrincipal('system').invoke(closedOffer(beforeBusyRoundTrip)),
    ).toThrow(/stale|no longer serves|not a live offer/);
  });

  it('uses availabilityKey as the exact committed availability generation', () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.keyed-availability', {
      does: 'Save under keyed availability',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Keyed availability');
    const view = (availabilityKey: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey,
      });

    const tree = mount(view('generation-1'));
    const first = runtime.forPrincipal('system').offers()[0]!;
    tree.render(view('generation-1'));
    expect(runtime.forPrincipal('system').offers()[0]).toBe(first);
    tree.render(view('generation-2'));
    expect(() =>
      runtime.forPrincipal('system').invoke(closedOffer(first)),
    ).toThrow(/stale|no longer serves|not a live offer/);
    expect(runtime.forPrincipal('system').offers()[0]!.ref.revision).toBe(
      first.ref.revision + 1,
    );
  });

  it('retires an offer before a committed render can replace the input it selects', async () => {
    const runtime = createActionRuntime();
    const seen: string[] = [];
    let inputReads = 0;
    const action = defineAction('orders.archive-from-react', {
      does: 'Archive this order',
      invocation: 'scalar',
      mutate: (event: PressEvent) => {
        seen.push(event.id);
        return event.id;
      },
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Archive');
    const view = (orderId: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        input: () => {
          inputReads += 1;
          return { id: orderId };
        },
        inputKey: orderId,
      });

    const tree = mount(view('o-57'));
    const binding = runtime.bindings()[0]!.ref;
    const first = runtime.forPrincipal('system').offers()[0]!;
    if (first.inputMode !== 'bound') throw new Error('expected bound input');
    let duringRender: unknown;
    expect(inputReads).toBe(1);

    tree.render(
      createElement(
        Fragment,
        null,
        view('o-58'),
        createElement(Probe, {
          read: () => {
            duringRender = runtime.forPrincipal('system').offers()[0];
          },
        }),
      ),
    );

    expect(duringRender).toBe(first);
    expect(runtime.bindings()[0]?.ref).toBe(binding);
    expect(inputReads).toBe(1);
    expect(() => runtime.forPrincipal('system').invoke(first)).toThrow(
      /stale|no longer serves|not a live offer/,
    );
    expect(inputReads).toBe(1);
    const second = runtime.forPrincipal('system').offers()[0]!;
    if (second.inputMode !== 'bound') throw new Error('expected bound input');
    expect(second.ref.revision).toBeGreaterThan(first.ref.revision);
    expect(inputReads).toBe(2);
    const invocation = runtime.forPrincipal('system').invoke(second);
    await invocation.whenInvoked;
    expect(seen).toEqual(['o-58']);
    expect(inputReads).toBe(2);
    expect(invocation.input).toEqual({
      source: 'bound',
      provided: true,
      ref: second.ref.input,
    });
  });

  it('reuses a captured input offer across unrelated commits with the same input key', async () => {
    const runtime = createActionRuntime();
    const seen: string[] = [];
    let reads = 0;
    const action = defineAction('orders.archive-stable-react', {
      does: 'Archive this order',
      invocation: 'scalar',
      mutate: (event: PressEvent) => seen.push(event.id),
    });
    const adapter = hostAdapter<number>();
    const host = wrapper('Archive stable');
    const view = (): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        input: () => {
          reads += 1;
          return { id: 'o-57' };
        },
        inputKey: 'o-57',
        availabilityKey: 'available',
      });

    const tree = mount(view());
    const offer = runtime.forPrincipal('system').offers()[0]!;
    if (offer.inputMode !== 'bound') throw new Error('expected bound input');
    tree.render(view());

    expect(runtime.forPrincipal('system').offers()[0]).toBe(offer);
    expect(reads).toBe(1);
    await runtime.forPrincipal('system').invoke(offer).whenInvoked;
    expect(reads).toBe(1);
    expect(seen).toEqual(['o-57']);
  });

  it('publishes one changed input generation under StrictMode without replacing the binding', async () => {
    const runtime = createActionRuntime();
    const seen: string[] = [];
    let reads = 0;
    const action = defineAction('orders.archive-strict-react', {
      does: 'Archive this order',
      invocation: 'scalar',
      mutate: (event: PressEvent) => seen.push(event.id),
    });
    const adapter = hostAdapter<number>();
    const host = wrapper('Archive strict');
    const view = (orderId: string): ReactElement =>
      createElement(
        StrictMode,
        null,
        bound({
          runtime,
          action,
          adapter,
          host,
          actionProps: { enabled: true, onPress: action },
          input: () => {
            reads += 1;
            return { id: orderId };
          },
          inputKey: orderId,
          availabilityKey: orderId,
        }),
      );

    const tree = mount(view('o-57'));
    const binding = runtime.bindings()[0]!.ref;
    const first = runtime.forPrincipal('system').offers()[0]!;
    if (first.inputMode !== 'bound') throw new Error('expected bound input');

    tree.render(view('o-58'));
    const second = runtime.forPrincipal('system').offers()[0]!;
    if (second.inputMode !== 'bound') throw new Error('expected bound input');

    expect(runtime.bindings()).toHaveLength(1);
    expect(runtime.bindings()[0]?.ref).toBe(binding);
    expect(second.ref.revision).toBe(first.ref.revision + 1);
    expect(reads).toBe(2);
    await runtime.forPrincipal('system').invoke(second).whenInvoked;
    expect(seen).toEqual(['o-58']);
  });

  it('disconnects fail-closed when an input-generation publication fails', () => {
    const failure = new Error('publication failed');
    const baseRuntime = createActionRuntime();
    let rejectUpdates = false;
    const runtime = new Proxy(baseRuntime, {
      get(target, property) {
        const value = Reflect.get(target, property, target) as unknown;
        if (property === 'connect' && typeof value === 'function') {
          return (...args: unknown[]) => {
            const opened = Reflect.apply(
              value,
              target,
              args,
            ) as ActionConnection<(event: PressEvent) => number, string, true>;
            return Object.freeze({
              ...opened,
              update(update: Parameters<typeof opened.update>[0]) {
                if (rejectUpdates) throw failure;
                opened.update(update);
              },
            });
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as ActionRuntime;
    const action = defineAction('orders.archive-failed-react', {
      does: 'Archive this order',
      invocation: 'scalar',
      mutate: (_event: PressEvent) => 1,
    });
    const adapter = hostAdapter<number>();
    const host = wrapper('Archive failed');
    const view = (orderId: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        input: () => ({ id: orderId }),
        inputKey: orderId,
      });

    const tree = mount(view('o-57'));
    const oldOffer = runtime.forPrincipal('system').offers()[0]!;
    if (oldOffer.inputMode !== 'bound') throw new Error('expected bound input');
    rejectUpdates = true;

    expect(() => tree.render(view('o-58'))).toThrow(failure);
    expect(baseRuntime.bindings()).toEqual([]);
    expect(() =>
      baseRuntime.forPrincipal('system').invoke(closedOffer(oldOffer)),
    ).toThrow(/stale|no longer serves|not a live offer/);
  });

  it('disconnects fail-closed when an availability-generation publication fails', () => {
    const failure = new Error('availability publication failed');
    const baseRuntime = createActionRuntime();
    let rejectTouches = false;
    const runtime = new Proxy(baseRuntime, {
      get(target, property) {
        const value = Reflect.get(target, property, target) as unknown;
        if (property === 'connect' && typeof value === 'function') {
          return (...args: unknown[]) => {
            const opened = Reflect.apply(
              value,
              target,
              args,
            ) as ActionConnection<() => string, string, false, 'inputless'>;
            return Object.freeze({
              ...opened,
              touch() {
                if (rejectTouches) throw failure;
                opened.touch();
              },
            });
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as ActionRuntime;
    const action = defineAction('draft.failed-availability-publication', {
      does: 'Publish availability',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Failed availability');
    const view = (availabilityKey: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey,
      });

    const tree = mount(view('generation-1'));
    const oldOffer = runtime.forPrincipal('system').offers()[0]!;
    rejectTouches = true;
    expect(() => tree.render(view('generation-2'))).toThrow(failure);
    expect(baseRuntime.bindings()).toEqual([]);
    expect(() =>
      baseRuntime.forPrincipal('system').invoke(closedOffer(oldOffer)),
    ).toThrow(/stale|no longer serves|not a live offer/);
  });

  it('reuses an offer across a same-owner commit with no input reader', () => {
    const runtime = createActionRuntime();
    const action = defineAction('draft.save', {
      does: 'Save',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Save');
    const view = (): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        availabilityKey: 'available',
      });

    const tree = mount(view());
    const first = runtime.forPrincipal('system').offers()[0]!;
    tree.render(view());
    expect(runtime.forPrincipal('system').offers()[0]).toBe(first);
  });

  it('records a custom host occurrence without suppressing its listener when app-owned enabledness is false', async () => {
    const runtime = createActionRuntime();
    const exact = { saved: 'despite-custom-disabled-state' };
    let calls = 0;
    let observed: ActionInvocation<typeof exact> | undefined;
    const action = defineAction('custom-output.save', {
      does: 'Record the custom component output',
      invocation: 'inputless',
      mutate: () => {
        calls += 1;
        return exact;
      },
    });
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<typeof exact>(),
        host: wrapper('Custom output'),
        actionProps: { enabled: false, onPress: action },
        onInvocation(invocation) {
          observed = invocation;
        },
      }),
    );

    expect(runtime.forPrincipal('system').offers()).toEqual([]);
    expect(press(tree.renderer, { name: 'custom' }, { id: 'output' })).toBe(
      exact,
    );
    expect(calls).toBe(1);
    await Promise.resolve();
    expect(runtime.transitionFor(observed!.transition)).toMatchObject({
      invocationStatus: 'performed',
      produced: exact,
    });
  });

  it('disconnects the old runtime on replacement and ignores a stale ref cleanup', () => {
    const first = createActionRuntime();
    const second = createActionRuntime();
    const action = defineAction('draft.save', {
      does: 'Save',
      invocation: 'inputless',
      mutate: () => 'saved',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Save');
    let exposed:
      | UseActionBindingResult<Host, HostProps<string>, string>
      | undefined;
    const view = (runtime: ActionRuntime): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        actionProps: { enabled: true, onPress: action },
        expose: (binding) => {
          exposed = binding;
        },
      });

    const tree = mount(view(first));
    const staleRef = exposed!.ref;
    tree.render(view(second));
    const current = exposed?.getBinding();

    expect(first.bindings()).toEqual([]);
    expect(second.bindings()).toHaveLength(1);
    staleRef(null);
    expect(exposed?.getBinding()).toBe(current);
    expect(second.bindings()).toHaveLength(1);
  });

  it('lets a stale composed callback finish its own listener without attributing it to a successor binding', async () => {
    const runtime = createActionRuntime();
    const action = defineAction('rows.open', {
      does: 'Open this row',
      invocation: 'scalar',
      mutate: (_event: PressEvent) => 'definition-listener',
    });
    const adapter = hostAdapter<string>();
    const host = wrapper('Open row');
    const calls: string[] = [];
    let observed: ActionInvocation<string> | undefined;
    const view = (instance: string): ReactElement =>
      bound({
        runtime,
        action,
        adapter,
        host,
        instance,
        actionProps: {
          enabled: true,
          onPress(event) {
            calls.push(`${instance}:${event.id}`);
            return instance;
          },
        },
        onInvocation(invocation) {
          observed = invocation;
        },
      });

    const tree = mount(view('row-a'));
    const stale = (
      tree.renderer.root.findByType('div').props as HostProps<string>
    ).onPress;
    tree.render(view('row-b'));

    expect(stale.call({ name: 'list' }, { id: 'old-output' })).toBe('row-a');
    await Promise.resolve();
    expect(calls).toEqual(['row-a:old-output']);
    expect(observed).toBeUndefined();
    expect(runtime.bindings()[0]?.ref.instance).toBe('row-b');

    expect(press(tree.renderer, { name: 'list' }, { id: 'new-output' })).toBe(
      'row-b',
    );
    await Promise.resolve();
    expect(
      runtime.transitionFor(observed!.transition)?.ref.binding.instance,
    ).toBe('row-b');
  });

  it('keeps two instances of one definition independently connected and executable', () => {
    const runtime = createActionRuntime();
    const calls: string[] = [];
    const action = defineAction('orders.archive', {
      does: 'Archive this order',
      invocation: 'scalar',
      mutate: (event: PressEvent) => {
        calls.push(event.id);
        return event.id;
      },
    });
    const adapter = hostAdapter<string>();
    const tree = mount(
      createElement(
        Fragment,
        null,
        bound({
          runtime,
          action,
          adapter,
          host: wrapper('Archive 57'),
          actionProps: { enabled: true, onPress: action },
          instance: 'o-57',
        }),
        bound({
          runtime,
          action,
          adapter,
          host: wrapper('Archive 60'),
          actionProps: { enabled: true, onPress: action },
          instance: 'o-60',
        }),
      ),
    );

    expect(runtime.bindings().map((row) => row.ref.instance)).toEqual([
      'o-57',
      'o-60',
    ]);
    expect(press(tree.renderer, { name: 'list' }, { id: 'o-57' }, 0)).toBe(
      'o-57',
    );
    expect(press(tree.renderer, { name: 'list' }, { id: 'o-60' }, 1)).toBe(
      'o-60',
    );
    expect(calls).toEqual(['o-57', 'o-60']);
  });

  it('disconnects immediately on unmount while an exact async result finishes independently', async () => {
    const runtime = createActionRuntime();
    let release!: (value: string) => void;
    let observed: ActionInvocation<string> | undefined;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const action = defineAction('jobs.run', {
      does: 'Run the job',
      invocation: 'inputless',
      mutate: () => pending,
    });
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<Promise<string>>(),
        host: wrapper('Run'),
        actionProps: { enabled: true, onPress: action },
        onInvocation(invocation) {
          observed = invocation;
        },
      }),
    );

    const returned = press<Promise<string>>(
      tree.renderer,
      { name: 'jobs' },
      { id: 'run' },
    );
    expect(returned).toBe(pending);
    tree.unmount();
    expect(runtime.bindings()).toEqual([]);

    release('done');
    await expect(returned).resolves.toBe('done');
    expect(runtime.transitionFor(observed!.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'unverified',
      produced: 'done',
    });
  });
});
