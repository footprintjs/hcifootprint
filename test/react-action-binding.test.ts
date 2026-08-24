import { Fragment, StrictMode, createElement } from 'react';
import type { ReactElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { createActionBindingRuntime } from '../src/action/connection.js';
import { defineAction } from '../src/action/definition.js';
import {
  composeActionInvocation,
  type ActionHostAdapter,
  type ActionInvocationMiddleware,
} from '../src/action/host-adapter.js';
import type {
  ActionBindingRef,
  ActionBindingRuntime,
  ActionInvocation,
  BindingCoverage,
  DefinedAction,
} from '../src/action/types.js';
import {
  useActionBinding,
  type ActionBindingProjector,
  type ActionSettlementCapability,
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
  readonly runtime: ActionBindingRuntime;
  readonly action: TestAction<Result>;
  readonly adapter: TestAdapter<Result>;
  readonly host: Host;
  readonly actionProps: HostProps<Result>;
  readonly node?: string;
  readonly instance?: string;
  readonly coverage?: BindingCoverage;
  readonly projector?: ActionBindingProjector<Interactive>;
  readonly attachmentKey?: unknown;
  readonly onInvocation?: (
    invocation: ActionInvocation<Awaited<Result>>,
    settlement: ActionSettlementCapability,
  ) => void | PromiseLike<void>;
  readonly onInvocationError?: (
    error: unknown,
  ) => void | PromiseLike<void>;
  readonly expose?: (
    binding: UseActionBindingResult<Host, HostProps<Result>, string>,
  ) => void;
}

function Bound<Result>(props: BoundProps<Result>): ReactElement {
  const binding = useActionBinding(
    props.runtime,
    props.action,
    props.actionProps,
    props.adapter,
    {
      node: props.node ?? 'screen.actions',
      ...(props.instance !== undefined ? { instance: props.instance } : {}),
      ...(props.coverage !== undefined ? { coverage: props.coverage } : {}),
      ...(props.projector !== undefined ? { projector: props.projector } : {}),
      ...(props.attachmentKey !== undefined
        ? { attachmentKey: props.attachmentKey }
        : {}),
      ...(props.onInvocation !== undefined
        ? { onInvocation: props.onInvocation }
        : {}),
      ...(props.onInvocationError !== undefined
        ? { onInvocationError: props.onInvocationError }
        : {}),
    },
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
        provideHosts ? (rendered.props as { node?: object }).node ?? null : null,
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
    const runtime = createActionBindingRuntime();
    const host = wrapper('Save');
    const receiver = { name: 'toolbar' };
    const event = { id: 'press-1' };
    const exact = { saved: true };
    let calls = 0;
    const action = defineAction(
      'draft.save',
      { does: 'Save the draft' },
      function (this: Receiver, received: PressEvent) {
        calls += 1;
        expect(this).toBe(receiver);
        expect(received).toBe(event);
        return exact;
      },
    );
    const adapter = hostAdapter<typeof exact>();
    let exposed: UseActionBindingResult<Host, HostProps<typeof exact>, string> | undefined;
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
    expect(runtime.transitionFor('transition#1')).toMatchObject({
      invocationStatus: 'performed',
      produced: exact,
      effectStatus: 'unverified',
    });
  });

  it('exposes only a frozen, invocation-exact effect settlement capability', async () => {
    const runtime = createActionBindingRuntime();
    const action = defineAction(
      'draft.verify-save',
      { does: 'Save and verify the draft' },
      () => 'saved',
    );
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

    const foreignTransition = Object.freeze({
      ...observed!.transition,
      transitionId: 'transition#foreign',
    });
    expect(() =>
      capability!.settle(foreignTransition, {
        status: 'verified',
        evidence: { source: 'wrong-transition' },
      }),
    ).toThrow(/belongs to transition 'transition#1'/);

    const settled = capability!.settle(observed!.transition, {
      status: 'verified',
      evidence: { source: 'application-store' },
    });
    await expect(observed!.whenEffectSettled).resolves.toBe(settled);
    expect(settled).toMatchObject({
      status: 'verified',
      evidence: { source: 'application-store' },
    });
  });

  it.each(['synchronous', 'asynchronous'] as const)(
    'severs a %s invocation-observer error from the listener result and transition',
    async (mode) => {
      const runtime = createActionBindingRuntime();
      const observerError = new Error(`${mode} observer failed`);
      const sinkError = new Error('observer error sink failed');
      let reportObserverError!: (error: unknown) => void;
      const reported = new Promise<unknown>((resolve) => {
        reportObserverError = resolve;
      });
      let calls = 0;
      const action = defineAction(
        `observer.${mode}`,
        { does: 'Keep observer failure off the application path' },
        () => {
          calls += 1;
          return 'application-result';
        },
      );
      const failObserver =
        mode === 'synchronous'
          ? () => {
              throw observerError;
            }
          : async () => {
              throw observerError;
            };
      const tree = mount(
        bound({
          runtime,
          action,
          adapter: hostAdapter<string>(),
          host: wrapper(mode),
          actionProps: { enabled: true, onPress: action },
          onInvocation: failObserver,
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
      expect(runtime.transitionFor('transition#1')).toMatchObject({
        invocationStatus: 'performed',
        produced: 'application-result',
      });
    },
  );

  it('rethrows the exact listener failure after the runtime records it once', () => {
    const runtime = createActionBindingRuntime();
    const error = new Error('exact application failure');
    let calls = 0;
    const action = defineAction(
      'draft.fail',
      { does: 'Fail to save' },
      () => {
        calls += 1;
        throw error;
      },
    );
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<never>(),
        host: wrapper('Fail'),
        actionProps: { enabled: true, onPress: action },
      }),
    );

    expect(() => press(tree.renderer, { name: 'toolbar' }, { id: 'press' })).toThrow(error);
    expect(calls).toBe(1);
    expect(runtime.transitionFor('transition#1')).toMatchObject({
      invocationStatus: 'refused',
      error,
      effectStatus: 'unverified',
    });
  });

  it('projects the actual interactive descendant to the physical-root owner and cleans it token-safely', () => {
    const runtime = createActionBindingRuntime();
    const host = wrapper('Portal Save');
    const action = defineAction('portal.save', { does: 'Save' }, () => 'saved');
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
      createElement(StrictMode, null,
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
      const runtime = createActionBindingRuntime();
      const action = defineAction('missing.save', { does: 'Save' }, () => 'saved');
      let exposed: UseActionBindingResult<Host, HostProps<string>, string> | undefined;

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
    const runtime = createActionBindingRuntime();
    let calls = 0;
    const action = defineAction('unknown.save', { does: 'Save' }, () => {
      calls += 1;
      return 'saved';
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
    expect(calls, 'the unconnected host still keeps its application behavior').toBe(1);
  });

  it.each(['identity', 'semantic'] as const)(
    'preserves the existing listener and creates no binding for %s-only coverage',
    (coverage) => {
      const runtime = createActionBindingRuntime();
      let calls = 0;
      let projectionCalls = 0;
      const action = defineAction(
        `coverage.${coverage}`,
        { does: 'Keep the application listener' },
        () => {
          calls += 1;
          return coverage;
        },
      );
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
      expect(runtime.transitionFor('transition#1')).toBeUndefined();
    },
  );

  it('creates no binding when a server-shaped renderer supplies no host refs', () => {
    const runtime = createActionBindingRuntime();
    const action = defineAction('ssr.save', { does: 'Save' }, () => 'saved');
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
    const runtime = createActionBindingRuntime();
    const action = defineAction('draft.save', { does: 'Save' }, () => 'saved');
    const adapter = hostAdapter<string>();
    const host = wrapper('Save');
    let duringRender = -1;
    let exposed: UseActionBindingResult<Host, HostProps<string>, string> | undefined;
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
            duringRender = runtime.available().length;
          },
        }),
      ),
    );

    expect(duringRender, 'the in-flight render must not leak into live readers').toBe(1);
    expect(exposed?.getBinding()).toBe(identity);
    expect(runtime.bindingFor(identity!)).toMatchObject({
      enabled: false,
      busy: 'Saving now',
    });
    expect(runtime.available()).toEqual([]);
  });

  it('records a custom host occurrence without suppressing its listener when app-owned enabledness is false', async () => {
    const runtime = createActionBindingRuntime();
    const exact = { saved: 'despite-custom-disabled-state' };
    let calls = 0;
    const action = defineAction(
      'custom-output.save',
      { does: 'Record the custom component output' },
      () => {
        calls += 1;
        return exact;
      },
    );
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<typeof exact>(),
        host: wrapper('Custom output'),
        actionProps: { enabled: false, onPress: action },
      }),
    );

    expect(runtime.available()).toEqual([]);
    expect(press(tree.renderer, { name: 'custom' }, { id: 'output' })).toBe(
      exact,
    );
    expect(calls).toBe(1);
    await Promise.resolve();
    expect(runtime.transitionFor('transition#1')).toMatchObject({
      invocationStatus: 'performed',
      produced: exact,
    });
  });

  it('disconnects the old runtime on replacement and ignores a stale ref cleanup', () => {
    const first = createActionBindingRuntime();
    const second = createActionBindingRuntime();
    const action = defineAction('draft.save', { does: 'Save' }, () => 'saved');
    const adapter = hostAdapter<string>();
    const host = wrapper('Save');
    let exposed: UseActionBindingResult<Host, HostProps<string>, string> | undefined;
    const view = (runtime: ActionBindingRuntime): ReactElement =>
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
    const runtime = createActionBindingRuntime();
    const action = defineAction(
      'rows.open',
      { does: 'Open this row' },
      (_event: PressEvent) => 'definition-listener',
    );
    const adapter = hostAdapter<string>();
    const host = wrapper('Open row');
    const calls: string[] = [];
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
      });

    const tree = mount(view('row-a'));
    const stale = (
      tree.renderer.root.findByType('div').props as HostProps<string>
    ).onPress;
    tree.render(view('row-b'));

    expect(stale.call({ name: 'list' }, { id: 'old-output' })).toBe('row-a');
    await Promise.resolve();
    expect(calls).toEqual(['row-a:old-output']);
    expect(runtime.transitionFor('transition#1')).toBeUndefined();
    expect(runtime.bindings()[0]?.ref.instance).toBe('row-b');

    expect(press(tree.renderer, { name: 'list' }, { id: 'new-output' })).toBe(
      'row-b',
    );
    await Promise.resolve();
    expect(runtime.transitionFor('transition#1')?.ref.binding.instance).toBe(
      'row-b',
    );
  });

  it('keeps two instances of one definition independently connected and executable', () => {
    const runtime = createActionBindingRuntime();
    const calls: string[] = [];
    const action = defineAction(
      'orders.archive',
      { does: 'Archive this order' },
      (event: PressEvent) => {
        calls.push(event.id);
        return event.id;
      },
    );
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
    expect(press(tree.renderer, { name: 'list' }, { id: 'o-57' }, 0)).toBe('o-57');
    expect(press(tree.renderer, { name: 'list' }, { id: 'o-60' }, 1)).toBe('o-60');
    expect(calls).toEqual(['o-57', 'o-60']);
  });

  it('disconnects immediately on unmount while an exact async result finishes independently', async () => {
    const runtime = createActionBindingRuntime();
    let release!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const action = defineAction('jobs.run', { does: 'Run the job' }, () => pending);
    const tree = mount(
      bound({
        runtime,
        action,
        adapter: hostAdapter<Promise<string>>(),
        host: wrapper('Run'),
        actionProps: { enabled: true, onPress: action },
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
    expect(runtime.transitionFor('transition#1')).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'unverified',
      produced: 'done',
    });
  });
});
