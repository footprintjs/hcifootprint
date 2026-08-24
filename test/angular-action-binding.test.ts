import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionBindingRuntime,
  defineAction,
} from '../src/index.js';
import type {
  ActionAttachment,
  ActionBindingRef,
  ActionBindingRuntime,
  ActionConnection,
  ActionInvocation,
  ConnectActionOptions,
  DefinedAction,
} from '../src/index.js';

/** The structural part of Angular's ElementRef used by a directive. */
interface ElementRefLike<T extends object> {
  nativeElement: T | null | undefined;
}

/** The structural part of Angular's DestroyRef used by a directive. */
interface DestroyRefLike {
  onDestroy(cleanup: () => void): () => void;
}

/** Angular signals are callable readers; no framework type is required here. */
type SignalLike<T> = () => T;

/** The structural part of NgZone needed by an event boundary. */
interface ZoneRunnerLike {
  run<T>(work: () => T): T;
}

interface HostWrapperLike {
  readonly interactive: object | null | undefined;
}

interface CommittedSignals<Input> {
  readonly input: SignalLike<Input>;
  readonly enabled?: SignalLike<boolean | undefined>;
  readonly busy?: SignalLike<string | undefined>;
}

type InvocationChannel = 'native-event' | 'component-output';
type InputOf<F extends (input: any) => any> = Parameters<F>[0];
type OutputOf<F extends (input: any) => any> = Awaited<ReturnType<F>>;

/**
 * A directive-shaped integration proof. Construction does not inspect a host;
 * commit supplies the latest signal readers and an already-resolved projection.
 */
class AngularActionDirectiveLike<F extends (input: any) => any> {
  readonly #runtime: ActionBindingRuntime;
  readonly #definition: DefinedAction<F>;
  readonly #node: string;
  readonly #channel: InvocationChannel;
  readonly #zone?: ZoneRunnerLike;
  #connection?: ActionConnection<F, string, true>;
  #attachment?: ActionAttachment;
  #binding?: ActionBindingRef;
  #interactive?: object;
  #destroyed = false;

  constructor(options: {
    runtime: ActionBindingRuntime;
    definition: DefinedAction<F>;
    node: string;
    destroyRef: DestroyRefLike;
    channel: InvocationChannel;
    zone?: ZoneRunnerLike;
  }) {
    this.#runtime = options.runtime;
    this.#definition = options.definition;
    this.#node = options.node;
    this.#channel = options.channel;
    this.#zone = options.zone;
    options.destroyRef.onDestroy(() => this.destroy());
  }

  get binding(): ActionBindingRef | undefined {
    return this.#binding;
  }

  get interactive(): object | undefined {
    return this.#interactive;
  }

  /** Models ngOnChanges/ngAfterViewInit: only committed values reach core. */
  commit(
    elementRef: ElementRefLike<object>,
    signals: CommittedSignals<InputOf<F>>,
  ): void {
    if (this.#destroyed) return;
    if (this.#connection === undefined) {
      // This proof is deliberately input-bearing. Its generic constraint cannot
      // express an exact non-empty parameter tuple because TypeScript permits a
      // zero-argument function where a one-argument callback is expected.
      const connectInputAction = connectAction as (
        runtime: ActionBindingRuntime,
        definition: DefinedAction<F>,
        options: ConnectActionOptions<InputOf<F>> & {
          readonly input: SignalLike<InputOf<F>>;
        },
      ) => ActionConnection<F, string, true>;
      this.#connection = connectInputAction(this.#runtime, this.#definition, {
        node: this.#node,
        coverage: 'identity',
        input: signals.input,
        enabled: signals.enabled,
        busy: signals.busy,
        humanReporting: 'connection',
      });
      this.#binding = this.#connection.binding;
    } else {
      this.#connection.update({
        input: signals.input,
        enabled: signals.enabled,
        busy: signals.busy,
      });
    }

    // A new committed host supersedes the previous attachment token. An
    // unresolved ElementRef (SSR or a not-yet-created child) stays inert.
    this.#attachment?.detach();
    this.#attachment = undefined;
    this.#interactive = resolveInteractive(elementRef);
    if (this.#interactive === undefined) return;
    this.#attachment = this.#connection.attach({
      interactive: this.#interactive,
      coverage: 'executable',
      humanReporting: 'connection',
    });
  }

  onNativeEvent(): ActionInvocation<OutputOf<F>> | undefined {
    return this.#invokeThrough('native-event');
  }

  onComponentOutput(): ActionInvocation<OutputOf<F>> | undefined {
    return this.#invokeThrough('component-output');
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#attachment?.detach();
    this.#connection?.disconnect();
    this.#attachment = undefined;
    this.#connection = undefined;
    this.#interactive = undefined;
  }

  #invokeThrough(
    channel: InvocationChannel,
  ): ActionInvocation<OutputOf<F>> | undefined {
    const connection = this.#connection;
    if (
      this.#destroyed ||
      this.#interactive === undefined ||
      connection === undefined ||
      channel !== this.#channel
    ) {
      return undefined;
    }
    const invoke = (): ActionInvocation<OutputOf<F>> => connection.invoke();
    return this.#zone === undefined ? invoke() : this.#zone.run(invoke);
  }
}

function resolveInteractive(
  ref: ElementRefLike<object>,
): object | undefined {
  const host = ref.nativeElement;
  if (host === null || host === undefined) return undefined;
  if ('interactive' in host) {
    return (host as HostWrapperLike).interactive ?? undefined;
  }
  return host;
}

class FakeDestroyRef implements DestroyRefLike {
  readonly #callbacks = new Set<() => void>();

  onDestroy(cleanup: () => void): () => void {
    this.#callbacks.add(cleanup);
    return () => this.#callbacks.delete(cleanup);
  }

  /** Deliberately repeats callbacks so adapter cleanup itself must be safe. */
  destroy(): void {
    for (const cleanup of this.#callbacks) cleanup();
  }
}

class FakeZone implements ZoneRunnerLike {
  runs = 0;

  run<T>(work: () => T): T {
    this.runs += 1;
    return work();
  }
}

describe('structural Angular action binding', () => {
  it('stays inert while unresolved, unwraps a committed host, and reads current signals', async () => {
    const seen: string[] = [];
    const action = defineAction(
      'angular.save',
      { does: 'Save the draft' },
      ({ value }: { value: string }) => seen.push(value),
    );
    const runtime = createActionBindingRuntime();
    const destroyRef = new FakeDestroyRef();
    const directive = new AngularActionDirectiveLike({
      runtime,
      definition: action,
      node: 'draft',
      destroyRef,
      channel: 'native-event',
    });
    const elementRef: ElementRefLike<object> = { nativeElement: null };
    let value = 'server';
    let enabled = true;
    let busy: string | undefined = 'hydrating';
    const signals = {
      input: () => ({ value }),
      enabled: () => enabled,
      busy: () => busy,
    };

    directive.commit(elementRef, signals);
    const binding = directive.binding;
    expect(binding).toBeDefined();
    expect(runtime.bindingFor(binding!)).toMatchObject({
      attached: false,
      coverage: 'identity',
      enabled: true,
      busy: 'hydrating',
    });
    expect(runtime.available()).toEqual([]);
    expect(directive.onNativeEvent()).toBeUndefined();
    expect(seen).toEqual([]);

    const interactive = { tagName: 'BUTTON' };
    elementRef.nativeElement = { interactive } satisfies HostWrapperLike;
    value = 'first-client-value';
    busy = undefined;
    directive.commit(elementRef, signals);

    expect(directive.interactive).toBe(interactive);
    expect(directive.binding).toBe(binding);
    expect(runtime.bindingFor(binding!)).toMatchObject({
      attached: true,
      coverage: 'executable',
      enabled: true,
    });
    expect(runtime.bindingFor(binding!)).not.toHaveProperty('busy');
    await directive.onNativeEvent()!.whenInvoked;

    // Signal values are read at invocation, while replacing committed readers
    // does not replace the binding identity.
    let nextValue = 'second-client-value';
    directive.commit(elementRef, {
      input: () => ({ value: nextValue }),
      enabled: () => enabled,
    });
    nextValue = 'latest-client-value';
    await directive.onNativeEvent()!.whenInvoked;
    expect(directive.binding).toBe(binding);
    expect(seen).toEqual(['first-client-value', 'latest-client-value']);

    enabled = false;
    expect(runtime.bindingFor(binding!)).toMatchObject({ enabled: false });
    destroyRef.destroy();
    destroyRef.destroy();
    expect(runtime.bindingFor(binding!)).toBeUndefined();
    expect(directive.onNativeEvent()).toBeUndefined();
  });

  it('chooses exactly one event channel and invokes once with or without a zone runner', async () => {
    const calls: string[] = [];
    const action = defineAction(
      'angular.submit',
      { does: 'Submit the form' },
      ({ source }: { source: string }) => calls.push(source),
    );
    const runtime = createActionBindingRuntime();
    const nativeDestroy = new FakeDestroyRef();
    const outputDestroy = new FakeDestroyRef();
    const zone = new FakeZone();
    const native = new AngularActionDirectiveLike({
      runtime,
      definition: action,
      node: 'form',
      destroyRef: nativeDestroy,
      channel: 'native-event',
      zone,
    });
    const output = new AngularActionDirectiveLike({
      runtime,
      definition: action,
      node: 'form',
      destroyRef: outputDestroy,
      channel: 'component-output',
    });
    const nativeHost = { nativeElement: { tagName: 'BUTTON' } };
    const outputHost = { nativeElement: { tagName: 'APP-SUBMIT' } };
    native.commit(nativeHost, { input: () => ({ source: 'native' }) });
    output.commit(outputHost, { input: () => ({ source: 'output' }) });

    // A component output and its bubbling native event may both be observable;
    // configuration selects one door, so they cannot double-invoke the action.
    expect(native.onComponentOutput()).toBeUndefined();
    const nativeInvocation = native.onNativeEvent();
    expect(output.onNativeEvent()).toBeUndefined();
    const outputInvocation = output.onComponentOutput();
    await Promise.all([
      nativeInvocation!.whenInvoked,
      outputInvocation!.whenInvoked,
    ]);

    expect(zone.runs).toBe(1);
    expect(calls).toEqual(['native', 'output']);
    nativeDestroy.destroy();
    outputDestroy.destroy();
  });

  it('lets an async invocation finish after DestroyRef disconnects its host', async () => {
    let release!: (value: string) => void;
    let calls = 0;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const action = defineAction(
      'angular.export',
      { does: 'Export the report' },
      (_input: { format: string }) => {
        calls += 1;
        return pending;
      },
    );
    const runtime = createActionBindingRuntime();
    const destroyRef = new FakeDestroyRef();
    const directive = new AngularActionDirectiveLike({
      runtime,
      definition: action,
      node: 'reports',
      destroyRef,
      channel: 'component-output',
    });
    directive.commit(
      { nativeElement: { tagName: 'APP-EXPORT' } },
      { input: () => ({ format: 'csv' }) },
    );

    const binding = directive.binding!;
    const invocation = directive.onComponentOutput()!;
    destroyRef.destroy();
    destroyRef.destroy();
    expect(runtime.bindingFor(binding)).toBeUndefined();
    expect(calls).toBe(1);

    release('finished-after-destroy');
    expect(await invocation.whenInvoked).toMatchObject({
      status: 'performed',
      produced: 'finished-after-destroy',
    });
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: 'performed',
      effectStatus: 'unverified',
    });
  });

  it('keeps directive trees on separate runtimes isolated', async () => {
    const calls: string[] = [];
    const action = defineAction(
      'angular.isolated',
      { does: 'Run in this application root' },
      ({ root }: { root: string }) => calls.push(root),
    );
    const firstRuntime = createActionBindingRuntime();
    const secondRuntime = createActionBindingRuntime();
    const firstDestroy = new FakeDestroyRef();
    const secondDestroy = new FakeDestroyRef();
    const first = new AngularActionDirectiveLike({
      runtime: firstRuntime,
      definition: action,
      node: 'first-root',
      destroyRef: firstDestroy,
      channel: 'native-event',
    });
    const second = new AngularActionDirectiveLike({
      runtime: secondRuntime,
      definition: action,
      node: 'second-root',
      destroyRef: secondDestroy,
      channel: 'native-event',
    });
    first.commit(
      { nativeElement: { tagName: 'BUTTON' } },
      { input: () => ({ root: 'first' }) },
    );
    second.commit(
      { nativeElement: { tagName: 'BUTTON' } },
      { input: () => ({ root: 'second' }) },
    );

    expect(firstRuntime.bindings('angular.isolated')).toHaveLength(1);
    expect(secondRuntime.bindings('angular.isolated')).toHaveLength(1);
    const firstInvocation = first.onNativeEvent()!;
    const secondInvocation = second.onNativeEvent()!;
    await Promise.all([
      firstInvocation.whenInvoked,
      secondInvocation.whenInvoked,
    ]);
    expect(firstRuntime.transitionFor(secondInvocation.transition)).toBeUndefined();
    expect(secondRuntime.transitionFor(firstInvocation.transition)).toBeUndefined();

    firstDestroy.destroy();
    expect(firstRuntime.bindings()).toEqual([]);
    expect(secondRuntime.bindings('angular.isolated')).toHaveLength(1);
    await second.onNativeEvent()!.whenInvoked;
    expect(calls).toEqual(['first', 'second', 'second']);
    secondDestroy.destroy();
  });
});
