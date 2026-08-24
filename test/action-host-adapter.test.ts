import { describe, expect, it } from 'vitest';
import type { Binding } from '../src/atom/types.js';
import type {
  ActionHostAdapter,
  ActionInvocationMiddleware,
} from '../src/action/host-adapter.js';
import {
  composeActionInvocation,
  resolveActionHost,
} from '../src/action/host-adapter.js';
import {
  connectAction,
  createActionBindingRuntime,
  defineAction,
} from '../src/index.js';

interface PressEvent {
  readonly id: string;
}

describe('framework-neutral action host adapters', () => {
  it('joins a composed host listener to one protocol invocation without executing the definition twice', async () => {
    const runtime = createActionBindingRuntime();
    let calls = 0;
    const action = defineAction(
      'orders.archive',
      { does: 'Archive the order', invocation: 'host' },
      function (this: { prefix: string }, orderId: string) {
        calls += 1;
        return `${this.prefix}:${orderId}`;
      },
    );
    const connection = connectAction(runtime, action, { node: 'orders' });
    const receiver = { prefix: 'archived' };
    let invocation: ReturnType<typeof connection.invokeContinuation> | undefined;
    const composed = composeActionInvocation(
      action,
      function (proceed, orderId) {
        let returned!: string;
        let thrown: unknown;
        let didThrow = false;
        invocation = connection.invokeContinuation(() => {
          try {
            returned = proceed();
            return returned;
          } catch (error) {
            didThrow = true;
            thrown = error;
            throw error;
          }
        });
        if (didThrow) throw thrown;
        return returned;
      },
    );

    expect(composed.call(receiver, 'o-57')).toBe('archived:o-57');
    expect(calls).toBe(1);
    expect(await invocation?.whenInvoked).toMatchObject({
      status: 'performed',
      produced: 'archived:o-57',
    });
  });

  it('composes one invocation around one existing listener without changing its JavaScript behavior', () => {
    const receiver = { prefix: 'orders' };
    const event = { id: 'press-1' };
    const returned = { exact: true };
    let listenerCalls = 0;
    let invocationCalls = 0;

    function existing(
      this: typeof receiver,
      receivedEvent: PressEvent,
      count: number,
    ) {
      listenerCalls += 1;
      expect(this).toBe(receiver);
      expect(receivedEvent).toBe(event);
      expect(count).toBe(7);
      return returned;
    }

    const invoke: ActionInvocationMiddleware<
      typeof receiver,
      [PressEvent, number],
      typeof returned
    > = function (proceed, receivedEvent, count) {
      invocationCalls += 1;
      expect(this).toBe(receiver);
      expect(receivedEvent).toBe(event);
      expect(count).toBe(7);

      const first = proceed();
      const second = proceed();
      expect(second).toBe(first);
      return first;
    };

    const composed = composeActionInvocation(existing, invoke);
    expect(invocationCalls).toBe(0);
    expect(listenerCalls).toBe(0);

    expect(composed.call(receiver, event, 7)).toBe(returned);
    expect(invocationCalls).toBe(1);
    expect(listenerCalls).toBe(1);
  });

  it('rethrows the exact listener error and never executes the listener twice', () => {
    const receiver = { name: 'compose' };
    const error = new Error('exact listener failure');
    let listenerCalls = 0;
    let invocationCalls = 0;

    function existing(this: typeof receiver, event: PressEvent): never {
      listenerCalls += 1;
      expect(this).toBe(receiver);
      expect(event.id).toBe('press-2');
      throw error;
    }

    const composed = composeActionInvocation(
      existing,
      function (proceed, event) {
        invocationCalls += 1;
        expect(this).toBe(receiver);
        expect(event.id).toBe('press-2');

        let first: unknown;
        try {
          proceed();
        } catch (caught) {
          first = caught;
        }
        expect(first).toBe(error);
        expect(() => proceed()).toThrow(error);
        throw first;
      },
    );

    expect(() => composed.call(receiver, { id: 'press-2' })).toThrow(error);
    expect(invocationCalls).toBe(1);
    expect(listenerCalls).toBe(1);
  });

  it('keeps render-time listener composition host-free and resolves the committed wrapper later', () => {
    interface Button {
      readonly kind: 'button';
    }
    interface Input {
      readonly kind: 'input';
    }
    interface Wrapper {
      readonly kind: 'wrapper';
      readonly button: Button;
      readonly input: Input;
    }
    interface Props {
      readonly disabled: boolean;
      readonly loadingLabel?: string;
      readonly onPress: (event: PressEvent) => object;
    }

    const button: Button = { kind: 'button' };
    const input: Input = { kind: 'input' };
    const wrapper: Wrapper = { kind: 'wrapper', button, input };
    const originalResult = { original: true };
    const props: Props = {
      disabled: true,
      loadingLabel: 'Saving the order',
      onPress: () => originalResult,
    };
    let resolveCalls = 0;

    const adapter: ActionHostAdapter<
      Props,
      Wrapper,
      Button,
      Input,
      ActionInvocationMiddleware<unknown, [PressEvent], object>,
      Props
    > = {
      composeInvocation(current, invoke) {
        return {
          ...current,
          onPress: composeActionInvocation(current.onPress, invoke),
        };
      },
      resolve(_current, host) {
        resolveCalls += 1;
        return {
          kind: 'resolved',
          interactive: host.button,
          valueElement: host.input,
        };
      },
      readEnabled(context) {
        return !context.props.disabled;
      },
      readBusy(context) {
        return context.props.loadingLabel;
      },
      readCoverage() {
        return 'semantic';
      },
    };
    const invoke: ActionInvocationMiddleware<
      unknown,
      [PressEvent],
      object
    > = (proceed) => proceed();

    const rendered = adapter.composeInvocation(props, invoke);
    expect(resolveCalls).toBe(0);
    expect(rendered).not.toBe(props);
    expect(rendered.onPress).not.toBe(props.onPress);
    expect(props.onPress({ id: 'original' })).toBe(originalResult);
    expect(rendered.onPress({ id: 'rendered' })).toBe(originalResult);

    const committed = resolveActionHost(adapter, props, wrapper);
    expect(resolveCalls).toBe(1);
    expect(committed).toEqual({
      kind: 'resolved',
      host: wrapper,
      interactive: button,
      valueElement: input,
      enabled: false,
      busy: 'Saving the order',
      coverage: 'semantic',
      locators: undefined,
    });
    if (committed.kind === 'resolved') {
      expect(committed.host).not.toBe(committed.interactive);
      expect(committed.interactive).not.toBe(committed.valueElement);
    }
  });

  it.each(['absent', 'ambiguous', 'unsupported'] as const)(
    'models an %s interactive target as unresolved and does not read live facts',
    (reason) => {
      const host = { kind: 'wrapper' };
      let factReads = 0;
      const adapter: ActionHostAdapter<{}, typeof host, object> = {
        composeInvocation(props) {
          return props;
        },
        resolve() {
          return { kind: 'unresolved', reason };
        },
        readEnabled() {
          factReads += 1;
          return false;
        },
        readBusy() {
          factReads += 1;
          return 'Busy';
        },
        readCoverage() {
          factReads += 1;
          return 'identity';
        },
      };

      expect(resolveActionHost(adapter, {}, host)).toEqual({
        kind: 'unresolved',
        host,
        reason,
      });
      expect(factReads).toBe(0);
    },
  );

  it('does not infer enabledness, busy state, coverage, value ownership, or locators', () => {
    interface Props {
      readonly disabled: true;
      readonly loading: true;
      readonly role: 'button';
      readonly name: 'Save';
      readonly onClick: () => void;
    }
    const host = { kind: 'wrapper' };
    const interactive = { kind: 'button' };
    const props: Props = {
      disabled: true,
      loading: true,
      role: 'button',
      name: 'Save',
      onClick: () => undefined,
    };
    const adapter: ActionHostAdapter<
      Props,
      typeof host,
      typeof interactive
    > = {
      composeInvocation(current) {
        return current;
      },
      resolve() {
        return { kind: 'resolved', interactive };
      },
    };

    expect(resolveActionHost(adapter, props, host)).toEqual({
      kind: 'resolved',
      host,
      interactive,
      valueElement: undefined,
      enabled: undefined,
      busy: undefined,
      coverage: undefined,
      locators: undefined,
    });
  });

  it('copies only explicitly projected locators into the committed host snapshot', () => {
    const host = { kind: 'button' };
    const locator: Binding = {
      kind: 'element',
      locator: { role: 'button', name: 'Save' },
      actuation: 'click',
    };
    const authored: Binding[] = [locator];
    const adapter: ActionHostAdapter<{}, typeof host, typeof host> = {
      composeInvocation(props) {
        return props;
      },
      resolve() {
        return { kind: 'resolved', interactive: host };
      },
      projectLocators() {
        return authored;
      },
    };

    const committed = resolveActionHost(adapter, {}, host);
    authored.length = 0;

    expect(committed.kind).toBe('resolved');
    if (committed.kind === 'resolved') {
      expect(committed.locators).toEqual([locator]);
      expect(committed.locators).not.toBe(authored);
      expect(Object.isFrozen(committed.locators)).toBe(true);
    }
  });

  it('snapshots each resolver field once before projecting committed facts', () => {
    const host = { kind: 'wrapper' };
    const firstInteractive = { kind: 'first-button' };
    const secondInteractive = { kind: 'second-button' };
    const firstValue = { kind: 'first-input' };
    const secondValue = { kind: 'second-input' };
    let kindReads = 0;
    let interactiveReads = 0;
    let valueReads = 0;
    const seen: object[] = [];
    const target = {
      get kind() {
        kindReads += 1;
        return kindReads === 1 ? 'resolved' : 'unresolved';
      },
      get interactive() {
        interactiveReads += 1;
        return interactiveReads === 1
          ? firstInteractive
          : secondInteractive;
      },
      get valueElement() {
        valueReads += 1;
        return valueReads === 1 ? firstValue : secondValue;
      },
    };
    const adapter: ActionHostAdapter<
      {},
      typeof host,
      typeof firstInteractive,
      typeof firstValue
    > = {
      composeInvocation: (props) => props,
      resolve: () => target as never,
      readEnabled(context) {
        seen.push(context.interactive, context.valueElement!);
        return true;
      },
    };

    const committed = resolveActionHost(adapter, {}, host);
    expect(kindReads).toBe(1);
    expect(interactiveReads).toBe(1);
    expect(valueReads).toBe(1);
    expect(seen).toEqual([firstInteractive, firstValue]);
    expect(committed).toMatchObject({
      kind: 'resolved',
      interactive: firstInteractive,
      valueElement: firstValue,
      enabled: true,
    });

    let reasonReads = 0;
    const unresolved = resolveActionHost(
      {
        composeInvocation: (props: {}) => props,
        resolve: () => ({
          kind: 'unresolved' as const,
          get reason() {
            reasonReads += 1;
            return reasonReads === 1 ? 'absent' as const : 'ambiguous' as const;
          },
        }),
      },
      {},
      host,
    );
    expect(reasonReads).toBe(1);
    expect(unresolved).toEqual({ kind: 'unresolved', host, reason: 'absent' });
  });

  it('validates resolver and fact-reader output at the adapter boundary', () => {
    const host = { kind: 'wrapper' };
    const interactive = { kind: 'button' };
    const resolveWith = (target: unknown) =>
      resolveActionHost(
        {
          composeInvocation: (props: {}) => props,
          resolve: () => target as never,
        },
        {},
        host,
      );

    expect(() => resolveWith(null)).toThrow(/resolution record/);
    expect(() =>
      resolveWith({ kind: 'unresolved', reason: 'maybe' }),
    ).toThrow(/invalid unresolved action host reason/);
    expect(() => resolveWith({ kind: 'mystery' })).toThrow(
      /invalid action host resolution kind/,
    );
    expect(() =>
      resolveWith({ kind: 'resolved', interactive: null }),
    ).toThrow(/needs one interactive object/);

    const adapter = (
      facts: Partial<
        ActionHostAdapter<{}, typeof host, typeof interactive>
      >,
    ): ActionHostAdapter<{}, typeof host, typeof interactive> => ({
      composeInvocation: (props) => props,
      resolve: () => ({ kind: 'resolved', interactive }),
      ...facts,
    });
    expect(() =>
      resolveActionHost(
        adapter({ readEnabled: () => 'yes' as never }),
        {},
        host,
      ),
    ).toThrow(/enabled reader/);
    expect(() =>
      resolveActionHost(
        adapter({ readBusy: () => 1 as never }),
        {},
        host,
      ),
    ).toThrow(/busy reader/);
    expect(() =>
      resolveActionHost(
        adapter({ readCoverage: () => 'total' as never }),
        {},
        host,
      ),
    ).toThrow(/invalid coverage/);
    expect(() =>
      resolveActionHost(
        adapter({ projectLocators: () => ({}) as never }),
        {},
        host,
      ),
    ).toThrow(/locator projection must be an array/);
  });
});
