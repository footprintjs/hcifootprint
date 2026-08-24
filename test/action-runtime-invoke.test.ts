import { describe, expect, it } from 'vitest';
import {
  ActionInputValidationError,
  actionDefinitionOf,
  connectAction,
  createActionBindingRuntime,
  defineAction,
  isDefinedAction,
  type ActionInputSchemaAdapter,
  type ActionInvocation,
  type ActionOffer,
} from '../src/index.js';

describe('action runtime invocation broker', () => {
  it('captures a bound input once per offer and joins it to every invocation receipt', async () => {
    let selected = 'o-57';
    let reads = 0;
    let validations = 0;
    const seen: string[] = [];
    const archive = defineAction(
      'orders.archive-runtime',
      {
        does: 'Archive the selected order',
        invocation: 'scalar',
        inputSchema: {
          safeParse(value: unknown) {
            validations += 1;
            return {
              success:
                typeof value === 'object' &&
                value !== null &&
                typeof (value as { orderId?: unknown }).orderId === 'string',
            };
          },
        },
      },
      ({ orderId }: { orderId: string }) => seen.push(orderId),
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, archive, {
      node: 'orders',
      input: () => {
        reads += 1;
        return { orderId: selected };
      },
    });

    const offer = runtime.available(archive)[0]!;
    expect(offer.inputMode).toBe('bound');
    if (offer.inputMode !== 'bound') throw new Error('expected bound offer');
    expect(offer.ref.input).toBe(offer.input);
    expect(offer).toMatchObject({
      coverage: 'executable',
      contractActivation: 'require-active',
      inputValidation: 'active',
    });
    expect(reads).toBe(1);
    expect(validations).toBe(1);
    expect(runtime.available(archive)[0]).toBe(offer);
    expect(reads).toBe(1);
    expect(validations).toBe(1);
    expect(offer.definition.contract.inputSchema).toBeDefined();

    selected = 'o-58';
    const invocation = runtime.invoke(offer);
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(seen).toEqual(['o-57']);
    expect(reads).toBe(1);
    expect(validations).toBe(1);
    expect(invocation.input).toEqual({
      source: 'bound',
      provided: true,
      ref: offer.input,
    });
    expect(invocation.transition.input).toBe(offer.input);
    expect(runtime.transitionFor(invocation.transition)?.input).toBe(
      invocation.input,
    );

    const invokeUntyped = runtime.invoke as (
      selectedOffer: ActionOffer,
      input?: unknown,
    ) => unknown;
    expect(() =>
      invokeUntyped.call(runtime, offer, { orderId: 'o-58' }),
    ).toThrow(
      /already binds its exact input/,
    );
  });

  it('invokes an open offer without retaining the application connection', async () => {
    const seen: string[] = [];
    const choose = defineAction(
      'orders.choose-runtime',
      {
        does: 'Choose an order',
        invocation: 'scalar',
        inputSchema: { safeParse: () => ({ success: true as const }) },
      },
      ({ orderId }: { orderId: string }) => seen.push(orderId),
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, choose, {
      node: 'orders',
      instance: 'o-57',
    });

    const offer = runtime.available(choose)[0]!;
    expect(offer.inputMode).toBe('open');
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    const invocation = runtime.invoke(offer, { orderId: 'o-57' });

    await invocation.whenInvoked;
    expect(seen).toEqual(['o-57']);
    expect(invocation.transition.binding.instance).toBe('o-57');
    expect(invocation.input).toMatchObject({
      source: 'caller',
      provided: true,
    });
    expect(invocation.transition.input).toBe(
      invocation.input.source === 'caller' && invocation.input.provided
        ? invocation.input.ref
        : undefined,
    );
  });

  it('rejects stale, foreign, and forged offers before input or handler code runs', () => {
    let reads = 0;
    let calls = 0;
    const action = defineAction(
      'offers.exact-runtime',
      { does: 'Run exactly once selected', invocation: 'scalar' },
      (_value: string) => {
        calls += 1;
      },
    );
    const runtime = createActionBindingRuntime();
    const foreignRuntime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'offers',
      input: () => {
        reads += 1;
        return 'first';
      },
    });
    const offer = runtime.available(action)[0]!;
    if (offer.inputMode !== 'bound') throw new Error('expected bound offer');
    expect(reads).toBe(1);

    expect(() => foreignRuntime.invoke(offer)).toThrow(/foreign|forged/);
    expect(() =>
      (runtime.invoke as (offer: ActionOffer) => unknown)({ ...offer }),
    ).toThrow(/foreign|forged/);
    expect(reads).toBe(1);
    expect(calls).toBe(0);

    connection.touch();
    expect(() => runtime.invoke(offer)).toThrow(/stale|foreign|forged/);
    expect(reads).toBe(1);
    expect(calls).toBe(0);
  });

  it('requires one deliberate open payload slot while preserving explicit undefined', async () => {
    const received: Array<string | undefined> = [];
    const optional = defineAction(
      'input.optional-runtime',
      {
        does: 'Run with optional input',
        invocation: 'scalar',
        inputSchema: { safeParse: () => ({ success: true as const }) },
      },
      (value: string | undefined) => received.push(value),
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, optional, { node: 'input' });
    const offer = runtime.available(optional)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    expect(() =>
      (runtime.invoke as (selectedOffer: ActionOffer) => unknown)(offer),
    ).toThrow(/requires exactly one deliberate input payload slot/);
    const explicit = runtime.invoke(offer, undefined);
    await explicit.whenInvoked;

    expect(received).toEqual([undefined]);
    expect(explicit.input).toMatchObject({
      source: 'caller',
      provided: true,
    });
  });

  it('makes empty updates inert and touch an explicit reader-free publication', () => {
    let inputReads = 0;
    let enabledReads = 0;
    let busyReads = 0;
    const action = defineAction(
      'facts.publish-runtime',
      { does: 'Publish committed facts', invocation: 'scalar' },
      (_value: string) => undefined,
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'facts',
      input: () => {
        inputReads += 1;
        return 'value';
      },
      enabled: () => {
        enabledReads += 1;
        return true;
      },
      busy: () => {
        busyReads += 1;
        return undefined;
      },
    });
    const offer = runtime.available(action)[0]!;
    const counts = [inputReads, enabledReads, busyReads];

    connection.update({});
    expect([inputReads, enabledReads, busyReads]).toEqual(counts);
    expect(runtime.available(action)[0]).toBe(offer);
    expect(inputReads).toBe(counts[0]);

    const beforeTouch = [inputReads, enabledReads, busyReads];
    connection.touch();
    expect([inputReads, enabledReads, busyReads]).toEqual(beforeTouch);
    expect(() =>
      (runtime.invoke as (offer: ActionOffer) => unknown)(offer),
    ).toThrow(/stale|foreign|forged/);
    connection.disconnect();
    expect(() => connection.touch()).toThrow(/disconnected/);
  });

  it('records host continuations as host input rather than inventing a payload', () => {
    const action = defineAction(
      'host.continuation-runtime',
      { does: 'Run the host listener', invocation: 'host' },
      (_left: string, _right: number) => 'definition',
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, { node: 'host' });
    const invocation = connection.invokeContinuation(() => 'host');

    expect(runtime.available(action)).toEqual([]);
    expect(runtime.available()).toEqual([]);
    expect(invocation.input).toEqual({ source: 'host', provided: false });
    expect(runtime.transitionFor(invocation.transition)?.input).toBe(
      invocation.input,
    );
  });

  it('withholds an unschematized unbound scalar while retaining its direct door', async () => {
    const seen: string[] = [];
    const action = defineAction(
      'scalar.undeclared-runtime',
      { does: 'Run an undeclared scalar', invocation: 'scalar' },
      (value: string) => seen.push(value),
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, { node: 'scalar' });

    expect(runtime.available(action)).toEqual([]);
    expect(runtime.available()).toEqual([]);

    const invocation = connection.invoke('direct');
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(seen).toEqual(['direct']);
  });

  it('carries needs and produces without activating channel behavior in Layer 1', async () => {
    let calls = 0;
    const action = defineAction(
      'channels.inert-runtime',
      {
        does: 'Run while channel declarations remain metadata',
        invocation: 'inputless',
        needs: {
          subject: { kind: 'order', from: 'selection' },
        },
        produces: { kind: 'archive-receipt' },
      },
      () => {
        calls += 1;
        return 'done';
      },
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, action, { node: 'channels' });

    const offer = runtime.available(action)[0]!;
    expect(offer.definition.contract).toMatchObject({
      needs: { subject: { kind: 'order', from: 'selection' } },
      produces: { kind: 'archive-receipt' },
    });
    expect(await runtime.invoke(offer).whenInvoked).toMatchObject({
      status: 'performed',
      produced: 'done',
    });
    expect(calls).toBe(1);
  });

  it('records handler throws and rejections as failed, never refused', async () => {
    const thrown = new Error('synchronous handler failure');
    const rejected = new Error('asynchronous handler failure');
    const throws = defineAction(
      'handler.throws-runtime',
      { does: 'Throw synchronously', invocation: 'inputless' },
      () => {
        throw thrown;
      },
    );
    const rejects = defineAction(
      'handler.rejects-runtime',
      { does: 'Reject asynchronously', invocation: 'inputless' },
      async () => {
        throw rejected;
      },
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, throws, { node: 'failure' });
    connectAction(runtime, rejects, { node: 'failure' });

    const thrownInvocation = runtime.invoke(runtime.available(throws)[0]!);
    const rejectedInvocation = runtime.invoke(runtime.available(rejects)[0]!);
    const [thrownOutcome, rejectedOutcome] = await Promise.all([
      thrownInvocation.whenInvoked,
      rejectedInvocation.whenInvoked,
    ]);

    expect(thrownOutcome).toMatchObject({ status: 'failed', error: thrown });
    expect(rejectedOutcome).toMatchObject({ status: 'failed', error: rejected });
    expect(runtime.transitionFor(thrownInvocation.transition)).toMatchObject({
      invocationStatus: 'failed',
      error: thrown,
    });
    expect(runtime.transitionFor(rejectedInvocation.transition)).toMatchObject({
      invocationStatus: 'failed',
      error: rejected,
    });
  });

  it('refuses to retype canonical offers through a different same-id callable', () => {
    const canonical = defineAction(
      'identity.same-id-runtime',
      { does: 'Run the canonical action', invocation: 'scalar' },
      (value: string) => value.length,
    );
    const lookalike = defineAction(
      'identity.same-id-runtime',
      { does: 'Pretend this id returns a string', invocation: 'inputless' },
      () => 'wrong',
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, canonical, {
      node: 'identity',
      input: () => 'canonical',
    });

    expect(() => runtime.available(lookalike)).toThrow(
      /belongs to another callable.*exact defineAction/,
    );
  });
});

describe('action input schema enforcement', () => {
  it('reports direct schema rejection as an observed, terminal preflight refusal', async () => {
    let calls = 0;
    let observed:
      | ActionInvocation<void, 'schema.direct-refusal-runtime'>
      | undefined;
    const action = defineAction(
      'schema.direct-refusal-runtime',
      {
        does: 'Refuse invalid direct input before the handler starts',
        invocation: 'scalar',
        inputSchema: {
          safeParse: () => ({ success: false as const, error: 'invalid input' }),
        },
      },
      (_value: string) => {
        calls += 1;
      },
    );
    const runtime = createActionBindingRuntime();
    const connection = connectAction(runtime, action, {
      node: 'schema',
      input: () => 'invalid',
      onInvocation(invocation) {
        observed = invocation;
      },
    });

    const invocation = connection.invoke();
    expect(observed).toBe(invocation);
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: 'refused',
      error: {
        code: 'ACTION_INPUT_INVALID',
        source: 'bound',
        issuesDisposition: 'redacted',
      },
    });
    await expect(invocation.whenEffectSettled).resolves.toMatchObject({
      status: 'refused',
      reason: { code: 'ACTION_NOT_ATTEMPTED', phase: 'preflight' },
    });
    expect(calls).toBe(0);
    expect(runtime.forgetTransition(invocation.transition)).toBe(true);
  });

  it('enforces a JSON input schema in strict mode before an open handler runs', async () => {
    let calls = 0;
    const search = defineAction(
      'search.schema-runtime',
      {
        does: 'Search the catalogue',
        invocation: 'scalar',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
          additionalProperties: false,
        },
      },
      ({ query }: { query: string }) => {
        calls += 1;
        return query;
      },
    );
    const contexts: unknown[] = [];
    const runtime = createActionBindingRuntime({
      inputSchemaAdapter: {
        supports: () => true,
        validate(_schema, input, context) {
          contexts.push(context);
          const query =
            typeof input === 'object' && input !== null
              ? (input as { query?: unknown }).query
              : undefined;
          return typeof query === 'string'
            ? { valid: true }
            : { valid: false, issues: "missing required 'query'" };
        },
      },
    });
    connectAction(runtime, search, { node: 'search' });
    const offer = runtime.available(search)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    expect(offer.inputValidation).toBe('active');

    const refused = runtime.invoke(offer, { typo: 'boots' } as never);
    const refusedOutcome = await refused.whenInvoked;
    expect(refusedOutcome.status).toBe('refused');
    if (refusedOutcome.status !== 'refused') {
      throw new Error('expected input refusal');
    }
    expect(refusedOutcome.error).toBeInstanceOf(ActionInputValidationError);
    expect(refusedOutcome.error).toMatchObject({
      code: 'ACTION_INPUT_INVALID',
      source: 'caller',
      issuesDisposition: 'included',
      issues: "missing required 'query'",
    });
    expect(refused.transition.input).toBe(
      refused.input.source === 'caller' && refused.input.provided
        ? refused.input.ref
        : undefined,
    );
    await expect(refused.whenEffectSettled).resolves.toMatchObject({
      status: 'refused',
      reason: {
        code: 'ACTION_NOT_ATTEMPTED',
        phase: 'preflight',
      },
    });
    expect(runtime.transitionFor(refused.transition)).toMatchObject({
      invocationStatus: 'refused',
      effectStatus: 'refused',
      reason: {
        code: 'ACTION_NOT_ATTEMPTED',
        phase: 'preflight',
      },
    });
    expect(calls).toBe(0);
    expect(runtime.available(search)[0]).toBe(offer);
    expect(runtime.forgetTransition(refused.transition)).toBe(true);
    expect(runtime.transitionFor(refused.transition)).toBeUndefined();
    await runtime.invoke(offer, { query: 'boots' }).whenInvoked;
    expect(calls).toBe(1);
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).toMatchObject({
      definition: { definitionId: 'search.schema-runtime' },
      binding: { node: 'search' },
      source: 'caller',
    });
  });

  it('requires an adapter for non-parseable schemas unless disclosure is explicit', async () => {
    let calls = 0;
    const action = defineAction(
      'json.disclosure-runtime',
      {
        does: 'Carry a JSON schema',
        invocation: 'scalar',
        inputSchema: {
          type: 'object',
          properties: { value: { type: 'string' } },
        },
      },
      (_value: { value: string }) => {
        calls += 1;
      },
    );
    const strict = createActionBindingRuntime();
    expect(() => connectAction(strict, action, { node: 'json' })).toThrow(
      /inputSchema.*inputSchemaAdapter/,
    );
    expect(strict.bindings()).toEqual([]);

    const disclosure = createActionBindingRuntime({
      contractActivation: 'disclosure',
    });
    connectAction(disclosure, action, { node: 'json' });
    const offer = disclosure.available(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    expect(offer).toMatchObject({
      contractActivation: 'disclosure',
      inputValidation: 'disclosure',
    });
    await disclosure.invoke(offer, { unvalidated: true } as never).whenInvoked;
    expect(calls).toBe(1);
  });

  it('withholds a bound offer whose captured input fails its validator', () => {
    let calls = 0;
    const action = defineAction(
      'bound.schema-runtime',
      {
        does: 'Run valid bound input',
        invocation: 'scalar',
        inputSchema: {
          safeParse(value: unknown) {
            return {
              success: value === 'valid',
              ...(value === 'valid' ? {} : { error: 'expected valid' }),
            };
          },
        },
      },
      (_value: string) => {
        calls += 1;
      },
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, action, {
      node: 'bound',
      input: () => 'invalid',
    });

    let refusal: unknown;
    try {
      runtime.available(action);
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(ActionInputValidationError);
    expect(refusal).toMatchObject({
      source: 'bound',
      issuesDisposition: 'redacted',
    });
    expect((refusal as ActionInputValidationError).issues).toBeUndefined();
    expect(calls).toBe(0);
  });

  it('uses parser schemas as gates without replacing the exact caller value', async () => {
    const exact = { query: 'boots' };
    let received: unknown;
    const action = defineAction(
      'parser.schema-runtime',
      {
        does: 'Use the caller value',
        invocation: 'scalar',
        inputSchema: {
          parse: (_value: unknown) => ({ query: 'transformed' }),
        },
      },
      (value: { query: string }) => {
        received = value;
      },
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, action, { node: 'parser' });
    const offer = runtime.available(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    await runtime.invoke(offer, exact).whenInvoked;
    expect(received).toBe(exact);
  });

  it('captures validator and adapter methods at their registration boundaries', async () => {
    let validatorCalls = 0;
    const validatorSchema: {
      safeParse(value: unknown): { success: boolean; error?: unknown };
    } = {
      safeParse(_value: unknown) {
        validatorCalls += 1;
        return { success: false as const, error: 'original validator' };
      },
    };
    const selfValidated = defineAction(
      'schema.captured-validator-runtime',
      {
        does: 'Use the registered validator',
        invocation: 'scalar',
        inputSchema: validatorSchema,
      },
      (_value: string) => undefined,
    );
    const validatorRuntime = createActionBindingRuntime();
    connectAction(validatorRuntime, selfValidated, { node: 'validator' });
    Reflect.deleteProperty(validatorSchema, 'safeParse');
    expect(isDefinedAction(selfValidated)).toBe(true);
    expect(actionDefinitionOf(selfValidated)?.ref.definitionId).toBe(
      'schema.captured-validator-runtime',
    );
    const validatorOffer = validatorRuntime.available(selfValidated)[0]!;
    if (validatorOffer.inputMode !== 'open') {
      throw new Error('expected open validator offer');
    }

    const validatorOutcome = await validatorRuntime.invoke(
      validatorOffer,
      'value',
    ).whenInvoked;
    expect(validatorOutcome).toMatchObject({
      status: 'refused',
      error: { code: 'ACTION_INPUT_INVALID', issues: 'original validator' },
    });
    expect(validatorCalls).toBe(1);

    let adapterCalls = 0;
    const adapter: ActionInputSchemaAdapter = {
      supports: (_schema: unknown) => true,
      validate: (_schema: unknown, _input: unknown) => {
        adapterCalls += 1;
        return { valid: false as const, issues: 'original adapter' };
      },
    };
    const adapterRuntime = createActionBindingRuntime({
      inputSchemaAdapter: adapter,
    });
    adapter.supports = () => false;
    adapter.validate = () => ({ valid: true as const });
    const adapted = defineAction(
      'schema.captured-adapter-runtime',
      {
        does: 'Use the registered schema adapter',
        invocation: 'scalar',
        inputSchema: { type: 'string' },
      },
      (_value: string) => undefined,
    );
    connectAction(adapterRuntime, adapted, { node: 'adapter' });
    const adapterOffer = adapterRuntime.available(adapted)[0]!;
    if (adapterOffer.inputMode !== 'open') {
      throw new Error('expected open adapter offer');
    }

    const adapterOutcome = await adapterRuntime.invoke(
      adapterOffer,
      'value',
    ).whenInvoked;
    expect(adapterOutcome).toMatchObject({
      status: 'refused',
      error: { code: 'ACTION_INPUT_INVALID', issues: 'original adapter' },
    });
    expect(adapterCalls).toBe(1);
  });

  it('rejects async schema validators as refused input without running the handler', async () => {
    let calls = 0;
    const action = defineAction(
      'parser.async-runtime',
      {
        does: 'Reject an async parser',
        invocation: 'scalar',
        inputSchema: {
          parse: async (_value: unknown) => ({ valid: true }),
        },
      },
      (_value: string) => {
        calls += 1;
      },
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, action, { node: 'parser' });
    const offer = runtime.available(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    const outcome = await runtime.invoke(offer, 'value').whenInvoked;
    expect(outcome.status).toBe('refused');
    if (outcome.status !== 'refused') throw new Error('expected refusal');
    expect(outcome.error).toMatchObject({
      code: 'ACTION_INPUT_INVALID',
      issuesDisposition: 'included',
      issues: expect.stringMatching(/must return synchronously/),
    });
    expect(calls).toBe(0);
  });

  it('fails closed when schema code changes the binding during mint or invoke', () => {
    let boundConnection!: { disconnect(): void };
    const bound = defineAction(
      'schema.reentrant-bound-runtime',
      {
        does: 'Validate bound input',
        invocation: 'scalar',
        inputSchema: {
          safeParse: (_value: unknown) => {
            boundConnection.disconnect();
            return { success: true };
          },
        },
      },
      (_value: string) => undefined,
    );
    const boundRuntime = createActionBindingRuntime();
    boundConnection = connectAction(boundRuntime, bound, {
      node: 'schema',
      input: () => 'value',
    });
    expect(() => boundRuntime.available(bound)).toThrow(
      /disconnected while validating offered input/,
    );
    expect(boundRuntime.bindings()).toEqual([]);
    expect(boundRuntime.available()).toEqual([]);

    let calls = 0;
    let openConnection!: { touch(): void };
    const open = defineAction(
      'schema.reentrant-open-runtime',
      {
        does: 'Validate caller input',
        invocation: 'scalar',
        inputSchema: {
          safeParse: (_value: unknown) => {
            openConnection.touch();
            return { success: true };
          },
        },
      },
      (_value: string) => {
        calls += 1;
      },
    );
    const openRuntime = createActionBindingRuntime();
    openConnection = connectAction(openRuntime, open, { node: 'schema' });
    const offer = openRuntime.available(open)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    expect(() => openRuntime.invoke(offer, 'value')).toThrow(
      /changed while validating input/,
    );
    expect(calls).toBe(0);
    expect(() => openRuntime.invoke(offer, 'value')).toThrow(
      /stale|foreign|forged/,
    );
  });

  it('lets an exact scalar slot interpret explicit undefined as a default', async () => {
    const received: string[] = [];
    const action = defineAction(
      'input.default-runtime',
      {
        does: 'Run defaulted input',
        invocation: 'scalar',
        inputSchema: { safeParse: () => ({ success: true as const }) },
      },
      (value: string | undefined) => {
        received.push(value ?? 'default');
      },
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, action, { node: 'input' });
    const offer = runtime.available(action)[0]!;
    expect(offer.inputMode).toBe('open');
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    await runtime.invoke(offer, undefined).whenInvoked;
    await runtime.invoke(offer, 'explicit').whenInvoked;
    expect(received).toEqual(['default', 'explicit']);
  });

  it("enforces inputSchema 'none' without confusing omission and undefined", () => {
    let arity = -1;
    const runWithoutInput: () => void = function () {
      arity = arguments.length;
    };
    const action = defineAction(
      'none.schema-runtime',
      {
        does: 'Run without input',
        invocation: 'inputless',
        inputSchema: 'none',
      },
      runWithoutInput,
    );
    const runtime = createActionBindingRuntime();
    connectAction(runtime, action, { node: 'none' });
    const offer = runtime.available(action)[0]!;
    expect(offer.inputMode).toBe('none');
    if (offer.inputMode !== 'none') throw new Error('expected no-input offer');

    runtime.invoke(offer);
    expect(arity).toBe(0);
    expect(() =>
      (runtime.invoke as (offer: ActionOffer, input?: unknown) => unknown)(
        offer,
        undefined,
      ),
    ).toThrow(/takes no input/);
  });
});
