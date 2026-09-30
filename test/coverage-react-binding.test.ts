/**
 * useActionBinding — the doors the main React suite never walks through.
 *
 * Every test here pins a sentence the hook already says in its source
 * (src/react/use-action-binding.ts · useActionBinding):
 *
 * - `input` and `inputKey` travel together, and `availabilityKey` only means
 *   something when the adapter has a reader to re-ask — both are refused at
 *   render, before any host is touched.
 * - A host with no separate value element attaches WITHOUT inventing one.
 * - A connect/attach/project failure leaves nothing behind: the connection it
 *   opened is disconnected and the error reaches the caller unchanged.
 * - An observer failure never reaches the application: with no error sink it is
 *   dropped, and a sink that itself rejects is swallowed too.
 * - A hand-written `ActionRuntime` (a supported shape — see the 2.6.0 CHANGELOG
 *   entry on hand-written runtimes) may call the observers it was handed
 *   directly, without honouring the observer-capture protocol; they still answer
 *   from the LATEST committed render. And a continuation door that returns
 *   without running the listener is a broken runtime the hook names, never a
 *   silent `undefined` handed back to the app.
 */
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { createActionRuntime } from '../src/action/connection.js';
import { defineAction } from '../src/action/definition.js';
import {
  composeActionInvocation,
  type ActionHostAdapter,
  type ActionInvocationMiddleware,
} from '../src/action/host-adapter.js';
import type {
  ActionConnection,
  ActionRuntime,
  BindingProjection,
  ConnectActionOptions,
} from '../src/action/types.js';
import {
  useActionBinding,
  type ActionBindingProjector,
  type UseActionBindingResult,
} from '../src/react/index.js';
import './react-fixture.js';

interface Interactive {
  readonly kind: 'button';
  readonly id: string;
}

interface Host {
  readonly interactive: Interactive;
}

interface Props {
  readonly enabled?: boolean;
  readonly onPress: () => string;
}

type Adapter = ActionHostAdapter<
  Props,
  Host,
  Interactive,
  Interactive,
  ActionInvocationMiddleware<void, readonly [], string>,
  Props
>;

/** An adapter whose target has NO separate value element, and no readers. */
function bareAdapter(): Adapter {
  return {
    composeInvocation(props, invoke) {
      return { ...props, onPress: composeActionInvocation(props.onPress, invoke) };
    },
    resolve(_props, host) {
      return { kind: 'resolved', interactive: host.interactive };
    },
    readCoverage() {
      return 'executable';
    },
  };
}

const host = (id: string): Host => ({ interactive: { kind: 'button', id } });

interface Harness {
  readonly renderer: ReactTestRenderer;
  render(element: ReactElement): void;
  unmount(): void;
}

function mount(element: ReactElement): Harness {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element, {
      createNodeMock: (rendered) => (rendered.props as { node?: object }).node ?? null,
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

function press(renderer: ReactTestRenderer): string {
  return (renderer.root.findByType('div').props as Props).onPress();
}

/** One component, every option passed through verbatim — the refusals read the raw record. */
function Bound(props: {
  readonly runtime: ActionRuntime;
  readonly action: ReturnType<typeof inputless>;
  readonly adapter: Adapter;
  readonly host: Host;
  readonly actionProps: Props;
  readonly options: Record<string, unknown>;
  readonly expose?: (result: UseActionBindingResult<Host, Props, string>) => void;
}): ReactElement {
  const result = useActionBinding(
    props.runtime,
    props.action,
    props.actionProps,
    props.adapter,
    props.options as { readonly node: string },
  );
  props.expose?.(result);
  return createElement('div', { ...result.hostProps, ref: result.ref, node: props.host });
}

function inputless(id: string, mutate: () => string = () => 'mutated') {
  return defineAction(id, { does: 'Do the thing', invocation: 'inputless', mutate });
}

/**
 * A hand-written runtime: every member forwards to a real runtime, and `connect`
 * lets the test stand in for what a hand-written connection does.
 */
function handWrittenRuntime(
  real: ActionRuntime,
  connect: (
    opened: ActionConnection,
    options: ConnectActionOptions<unknown, unknown, string>,
  ) => ActionConnection,
): ActionRuntime {
  return new Proxy(real, {
    get(target, key) {
      if (key === 'connect') {
        return (definition: never, options: never) =>
          connect(
            (target.connect as (d: never, o: never) => ActionConnection)(definition, options),
            options,
          );
      }
      const value = Reflect.get(target, key, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

const rejections: unknown[] = [];
const onRejection = (reason: unknown): void => {
  rejections.push(reason);
};

afterEach(() => {
  process.off('unhandledRejection', onRejection);
  rejections.length = 0;
});

describe('options the hook refuses at render, before any host is touched', () => {
  const render = (options: Record<string, unknown>, adapter: Adapter = bareAdapter()) => {
    const runtime = createActionRuntime();
    const action = inputless('refused.render');
    const element = createElement(Bound, {
      runtime,
      action,
      adapter,
      host: host('Refused'),
      actionProps: { onPress: () => 'listener' },
      options,
    });
    let thrown: unknown;
    try {
      act(() => {
        create(element);
      });
    } catch (error) {
      thrown = error;
    }
    return { thrown, runtime };
  };

  it('an input reader without the inputKey that names its generation', () => {
    const { thrown, runtime } = render({ node: 'n', input: () => undefined });
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as Error).message).toBe(
      'hcifootprint: useActionBinding() requires input and inputKey together; inputKey names the committed semantic input generation.',
    );
    expect(runtime.bindings()).toEqual([]);
  });

  it('an inputKey with no reader for it to name', () => {
    const { thrown } = render({ node: 'n', inputKey: 1 });
    expect((thrown as Error).message).toMatch(/requires input and inputKey together/);
  });

  it('an availabilityKey when the adapter has no enabled/busy reader to re-ask', () => {
    const { thrown, runtime } = render({ node: 'n', availabilityKey: 'v1' });
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as Error).message).toBe(
      'hcifootprint: useActionBinding() availabilityKey requires an adapter readEnabled/readBusy reader.',
    );
    expect(runtime.bindings()).toEqual([]);
  });

  it('while the same key IS accepted once the adapter has a reader', () => {
    const adapter: Adapter = { ...bareAdapter(), readEnabled: (context) => context.props.enabled };
    const { thrown, runtime } = render({ node: 'n', availabilityKey: 'v1' }, adapter);
    expect(thrown).toBeUndefined();
    // No host ref under a bare create(): accepted, and nothing connected.
    expect(runtime.bindings()).toEqual([]);
  });
});

describe('a target with no separate value element', () => {
  it('attaches the interactive element alone — no value element is invented', () => {
    const real = createActionRuntime();
    const attached: BindingProjection[] = [];
    const runtime = handWrittenRuntime(real, (opened) => ({
      ...opened,
      attach(projection: BindingProjection) {
        attached.push(projection);
        return opened.attach(projection);
      },
    }));
    const target = host('Lone');
    const tree = mount(
      createElement(Bound, {
        runtime,
        action: inputless('lone.value'),
        adapter: bareAdapter(),
        host: target,
        actionProps: { onPress: () => 'listener' },
        options: { node: 'screen' },
      }),
    );
    expect(attached).toHaveLength(1);
    expect(attached[0]?.interactive).toBe(target.interactive);
    expect('valueElement' in attached[0]!).toBe(false);
    expect(real.bindings()).toHaveLength(1);
    tree.unmount();
    expect(real.bindings()).toEqual([]);
  });
});

describe('a failure while connecting leaves nothing connected', () => {
  it('a projector that throws: the error surfaces and the opened connection is disconnected', () => {
    const runtime = createActionRuntime();
    const broken = new Error('projector cannot take this element');
    const projector: ActionBindingProjector<Interactive> = {
      projectBinding() {
        throw broken;
      },
    };
    let exposed: UseActionBindingResult<Host, Props, string> | undefined;
    let thrown: unknown;
    try {
      mount(
        createElement(Bound, {
          runtime,
          action: inputless('project.fails'),
          adapter: bareAdapter(),
          host: host('Projected'),
          actionProps: { onPress: () => 'listener' },
          options: { node: 'screen', projector },
          expose: (result) => {
            exposed = result;
          },
        }),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(broken);
    // The connection was opened and attached before the projector ran; both
    // were undone, so the runtime serves nothing and the hook holds nothing.
    expect(runtime.bindings()).toEqual([]);
    expect(exposed?.getBinding()).toBeUndefined();
  });

  it('an attach that throws: the connection it came from is disconnected too', () => {
    const real = createActionRuntime();
    const broken = new Error('attach refused');
    const runtime = handWrittenRuntime(real, (opened) => ({
      ...opened,
      attach() {
        throw broken;
      },
    }));
    let thrown: unknown;
    try {
      mount(
        createElement(Bound, {
          runtime,
          action: inputless('attach.fails'),
          adapter: bareAdapter(),
          host: host('Attach'),
          actionProps: { onPress: () => 'listener' },
          options: { node: 'screen' },
        }),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(broken);
    expect(real.bindings()).toEqual([]);
  });
});

describe('observer failures never reach the application', () => {
  it('with no error sink, a throwing observer is dropped and the listener result stands', async () => {
    process.on('unhandledRejection', onRejection);
    const runtime = createActionRuntime();
    let observed = 0;
    const tree = mount(
      createElement(Bound, {
        runtime,
        action: inputless('observer.no-sink'),
        adapter: bareAdapter(),
        host: host('No sink'),
        actionProps: { onPress: () => 'listener' },
        options: {
          node: 'screen',
          onInvocation() {
            observed += 1;
            throw new Error('observer failed with nobody to tell');
          },
        },
      }),
    );
    expect(press(tree.renderer)).toBe('listener');
    expect(observed).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(rejections).toEqual([]);
    tree.unmount();
  });

  it('an error sink that itself rejects is swallowed, not left as an unhandled rejection', async () => {
    process.on('unhandledRejection', onRejection);
    const runtime = createActionRuntime();
    const failure = new Error('observer failed');
    const sunk: unknown[] = [];
    const tree = mount(
      createElement(Bound, {
        runtime,
        action: inputless('observer.sink-rejects'),
        adapter: bareAdapter(),
        host: host('Sink rejects'),
        actionProps: { onPress: () => 'listener' },
        options: {
          node: 'screen',
          onInvocation() {
            throw failure;
          },
          onInvocationError(error: unknown) {
            sunk.push(error);
            return Promise.reject(new Error('the sink failed too'));
          },
        },
      }),
    );
    expect(press(tree.renderer)).toBe('listener');
    expect(sunk).toEqual([failure]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(rejections).toEqual([]);
    tree.unmount();
  });
});

describe('a hand-written runtime', () => {
  it('that calls the observers directly still reaches the LATEST committed render', () => {
    const real = createActionRuntime();
    let handed: ConnectActionOptions<unknown, unknown, string> | undefined;
    const runtime = handWrittenRuntime(real, (opened, options) => {
      handed = options;
      return opened;
    });
    const action = inputless('direct.observers');
    const target = host('Direct');
    const seen: Array<{ generation: string; what: unknown }> = [];
    const view = (generation: string): ReactElement =>
      createElement(Bound, {
        runtime,
        action,
        adapter: bareAdapter(),
        host: target,
        actionProps: { onPress: () => 'listener' },
        options: {
          node: 'screen',
          onInvocation(invocation: unknown) {
            seen.push({ generation, what: invocation });
          },
          onInvocationError(error: unknown) {
            seen.push({ generation, what: error });
            return `sink:${generation}`;
          },
        },
      });

    const tree = mount(view('first'));
    tree.render(view('second'));
    expect(real.bindings()).toHaveLength(1);

    // What a runtime that ignores the capture protocol does: call the callbacks
    // it was handed, at the moment the invocation opens.
    const opened = { transition: 'opened' };
    const settlement = { binding: real.bindings()[0]!.ref, settle: () => undefined };
    handed!.onInvocation!(opened as never, settlement as never);
    const failure = new Error('instrumentation failed');
    const sinkReturned = handed!.onInvocationError!(failure);

    expect(seen).toEqual([
      { generation: 'second', what: opened },
      { generation: 'second', what: failure },
    ]);
    expect(sinkReturned).toBe('sink:second');
    tree.unmount();
  });

  it('whose continuation door never runs the listener is named, not trusted', () => {
    const real = createActionRuntime();
    let listenerCalls = 0;
    const runtime = handWrittenRuntime(real, (opened) => ({
      ...opened,
      // Returns an invocation-shaped nothing without ever calling the continuation.
      invokeContinuation: (() => undefined) as unknown as ActionConnection['invokeContinuation'],
    }));
    const tree = mount(
      createElement(Bound, {
        runtime,
        action: inputless('continuation.skipped'),
        adapter: bareAdapter(),
        host: host('Skipped'),
        actionProps: {
          onPress: () => {
            listenerCalls += 1;
            return 'listener';
          },
        },
        options: { node: 'screen' },
      }),
    );
    expect(() => press(tree.renderer)).toThrow(
      'hcifootprint: invokeContinuation() returned without executing the host continuation.',
    );
    expect(listenerCalls).toBe(0);
    tree.unmount();
  });
});
