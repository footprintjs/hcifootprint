import { describe, expect, it } from 'vitest';
import {
  ActionInputValidationError,
  actionDefinitionOf,
  connectAction,
  createActionRuntime,
  defineAction,
  isDefinedAction,
  type ActionInputSchemaAdapter,
  type ActionInvocation,
  type ActionOffer,
  type PrincipalActionPort,
} from '../src/index.js';

describe('action runtime invocation broker', () => {
  it('captures a bound input once per offer and joins it to every invocation receipt', async () => {
    let selected = 'o-57';
    let reads = 0;
    let validations = 0;
    const seen: string[] = [];
    const archive = defineAction('orders.archive-runtime', {
      does: 'Archive the selected order',
      invocation: 'scalar',
      inputSchema: {
        safeParse(value: unknown) {
          validations += 1;
          return {
            success:
              typeof value === 'object' &&
              value !== null &&
              typeof (
                value as {
                  orderId?: unknown;
                }
              ).orderId === 'string',
          };
        },
      },
      mutate: ({ orderId }: { orderId: string }) => seen.push(orderId),
    });
    const runtime = createActionRuntime();
    connectAction(runtime, archive, {
      node: 'orders',
      input: () => {
        reads += 1;
        return { orderId: selected };
      },
    });

    const offer = runtime.forPrincipal('system').offers(archive)[0]!;
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
    expect(runtime.forPrincipal('system').offers(archive)[0]).toBe(offer);
    expect(reads).toBe(1);
    expect(validations).toBe(1);
    expect(offer.definition.contract.inputSchema).toBeDefined();

    selected = 'o-58';
    const invocation = runtime.forPrincipal('system').invoke(offer);
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

    const system = runtime.forPrincipal('system');
    const invokeUntyped = system.invoke as (
      selectedOffer: ActionOffer,
      input?: unknown,
    ) => unknown;
    expect(() =>
      invokeUntyped.call(system, offer, { orderId: 'o-58' }),
    ).toThrow(/already binds its exact input/);
  });

  it('invokes an open offer without retaining the application connection', async () => {
    const seen: string[] = [];
    const choose = defineAction('orders.choose-runtime', {
      does: 'Choose an order',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: ({ orderId }: { orderId: string }) => seen.push(orderId),
    });
    const runtime = createActionRuntime();
    connectAction(runtime, choose, {
      node: 'orders',
      instance: 'o-57',
    });

    const offer = runtime.forPrincipal('system').offers(choose)[0]!;
    expect(offer.inputMode).toBe('open');
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    const invocation = runtime
      .forPrincipal('system')
      .invoke(offer, { orderId: 'o-57' });

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
    const action = defineAction('offers.exact-runtime', {
      does: 'Run exactly once selected',
      invocation: 'scalar',
      mutate: (_value: string) => {
        calls += 1;
      },
    });
    const runtime = createActionRuntime();
    const foreignRuntime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'offers',
      input: () => {
        reads += 1;
        return 'first';
      },
    });
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    if (offer.inputMode !== 'bound') throw new Error('expected bound offer');
    expect(reads).toBe(1);

    expect(() => foreignRuntime.forPrincipal('system').invoke(offer)).toThrow(
      // In the foreign runtime this offer "was never returned here" — the
      // refusal says so without accusing anyone of forging anything.
      /not a live offer/,
    );
    const system = runtime.forPrincipal('system');
    expect(() =>
      (system.invoke as (offer: ActionOffer) => unknown)({ ...offer }),
    ).toThrow(/stale|no longer serves|not a live offer/);
    expect(reads).toBe(1);
    expect(calls).toBe(0);

    connection.touch();
    expect(() => runtime.forPrincipal('system').invoke(offer)).toThrow(
      /stale|no longer serves|not a live offer/,
    );
    expect(reads).toBe(1);
    expect(calls).toBe(0);
  });

  it('requires one deliberate open payload slot while preserving explicit undefined', async () => {
    const received: Array<string | undefined> = [];
    const optional = defineAction('input.optional-runtime', {
      does: 'Run with optional input',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (value: string | undefined) => received.push(value),
    });
    const runtime = createActionRuntime();
    connectAction(runtime, optional, { node: 'input' });
    const offer = runtime.forPrincipal('system').offers(optional)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    const system = runtime.forPrincipal('system');
    expect(() =>
      (system.invoke as (selectedOffer: ActionOffer) => unknown)(offer),
    ).toThrow(/requires exactly one deliberate input payload slot/);
    const explicit = runtime.forPrincipal('system').invoke(offer, undefined);
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
    const action = defineAction('facts.publish-runtime', {
      does: 'Publish committed facts',
      invocation: 'scalar',
      mutate: (_value: string) => undefined,
    });
    const runtime = createActionRuntime();
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
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    const counts = [inputReads, enabledReads, busyReads];

    connection.update({});
    expect([inputReads, enabledReads, busyReads]).toEqual(counts);
    expect(runtime.forPrincipal('system').offers(action)[0]).toBe(offer);
    expect(inputReads).toBe(counts[0]);

    const beforeTouch = [inputReads, enabledReads, busyReads];
    connection.touch();
    expect([inputReads, enabledReads, busyReads]).toEqual(beforeTouch);
    const system = runtime.forPrincipal('system');
    expect(() =>
      (system.invoke as (offer: ActionOffer) => unknown)(offer),
    ).toThrow(/stale|no longer serves|not a live offer/);
    connection.disconnect();
    expect(() => connection.touch()).toThrow(/disconnected/);
  });

  it('records host continuations as host input rather than inventing a payload', () => {
    const action = defineAction('host.continuation-runtime', {
      does: 'Run the host listener',
      invocation: 'host',
      mutate: (_left: string, _right: number): string => 'definition',
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'host' });
    const invocation = connection.invokeContinuation(() => 'host');

    expect(runtime.forPrincipal('system').offers(action)).toEqual([]);
    expect(runtime.forPrincipal('system').offers()).toEqual([]);
    expect(invocation.input).toEqual({ source: 'host', provided: false });
    expect(runtime.transitionFor(invocation.transition)?.input).toBe(
      invocation.input,
    );
  });

  it('withholds an unschematized unbound scalar while retaining its direct door', async () => {
    const seen: string[] = [];
    const action = defineAction('scalar.undeclared-runtime', {
      does: 'Run an undeclared scalar',
      invocation: 'scalar',
      mutate: (value: string) => seen.push(value),
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'scalar' });

    expect(runtime.forPrincipal('system').offers(action)).toEqual([]);
    expect(runtime.forPrincipal('system').offers()).toEqual([]);

    const invocation = connection.invoke('direct');
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(seen).toEqual(['direct']);
  });

  it('carries needs and produces without activating channel behavior in Layer 1', async () => {
    let calls = 0;
    const action = defineAction('channels.inert-runtime', {
      does: 'Run while channel declarations remain metadata',
      invocation: 'inputless',
      needs: {
        subject: { kind: 'order', from: 'selection' },
      },
      produces: { kind: 'archive-receipt' },
      mutate: () => {
        calls += 1;
        return 'done';
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, { node: 'channels' });

    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    expect(offer.definition.contract).toMatchObject({
      needs: { subject: { kind: 'order', from: 'selection' } },
      produces: { kind: 'archive-receipt' },
    });
    expect(
      await runtime.forPrincipal('system').invoke(offer).whenInvoked,
    ).toMatchObject({
      status: 'performed',
      produced: 'done',
    });
    expect(calls).toBe(1);
  });

  it('records handler throws and rejections as failed, never refused', async () => {
    const thrown = new Error('synchronous handler failure');
    const rejected = new Error('asynchronous handler failure');
    const throws = defineAction('handler.throws-runtime', {
      does: 'Throw synchronously',
      invocation: 'inputless',
      mutate: () => {
        throw thrown;
      },
    });
    const rejects = defineAction('handler.rejects-runtime', {
      does: 'Reject asynchronously',
      invocation: 'inputless',
      mutate: async () => {
        throw rejected;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, throws, { node: 'failure' });
    connectAction(runtime, rejects, { node: 'failure' });

    const thrownInvocation = runtime
      .forPrincipal('system')
      .invoke(runtime.forPrincipal('system').offers(throws)[0]!);
    const rejectedInvocation = runtime
      .forPrincipal('system')
      .invoke(runtime.forPrincipal('system').offers(rejects)[0]!);
    const [thrownOutcome, rejectedOutcome] = await Promise.all([
      thrownInvocation.whenInvoked,
      rejectedInvocation.whenInvoked,
    ]);

    expect(thrownOutcome).toMatchObject({ status: 'failed', error: thrown });
    expect(rejectedOutcome).toMatchObject({
      status: 'failed',
      error: rejected,
    });
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
    const canonical = defineAction('identity.same-id-runtime', {
      does: 'Run the canonical action',
      invocation: 'scalar',
      mutate: (value: string) => value.length,
    });
    const lookalike = defineAction('identity.same-id-runtime', {
      does: 'Pretend this id returns a string',
      invocation: 'inputless',
      mutate: () => 'wrong',
    });
    const runtime = createActionRuntime();
    connectAction(runtime, canonical, {
      node: 'identity',
      input: () => 'canonical',
    });

    expect(() => runtime.forPrincipal('system').offers(lookalike)).toThrow(
      /belongs to another callable.*exact defineAction/,
    );
  });

  it('requires the exact structured definition ref for binding and offer lookup', () => {
    const canonical = defineAction('identity.exact-ref-runtime', {
      does: 'Run the canonical action',
      invocation: 'inputless',
      mutate: () => undefined,
    });
    const lookalike = defineAction('identity.exact-ref-runtime', {
      does: 'Carry the same authored id under another identity',
      invocation: 'inputless',
      mutate: () => undefined,
    });
    const runtime = createActionRuntime();
    connectAction(runtime, canonical, { node: 'identity' });
    const exact = actionDefinitionOf(canonical)!.ref;
    const foreign = actionDefinitionOf(lookalike)!.ref;
    const forged = { ...exact };
    const system = runtime.forPrincipal('system');

    expect(runtime.bindings(exact)).toHaveLength(1);
    expect(system.offers(exact)).toHaveLength(1);
    expect(() => runtime.bindings(foreign)).toThrow(/foreign|forged|exact/);
    expect(() => system.offers(foreign)).toThrow(/foreign|forged|exact/);
    expect(() => runtime.bindings(forged)).toThrow(/foreign|forged|exact/);
    expect(() => system.offers(forged)).toThrow(/foreign|forged|exact/);
  });

  it('requires exact binding and transition refs across runtime generations', async () => {
    const action = defineAction('identity.exact-runtime-refs', {
      does: 'Keep runtime-local capabilities exact',
      invocation: 'inputless',
      mutate: () => 'done',
    });
    const firstRuntime = createActionRuntime();
    const secondRuntime = createActionRuntime();
    const first = connectAction(firstRuntime, action, {
      node: 'identity',
      coverage: 'verifiable',
    });
    const second = connectAction(secondRuntime, action, {
      node: 'identity',
      coverage: 'verifiable',
    });
    const firstInvocation = first.invoke();
    const secondInvocation = second.invoke();
    await Promise.all([
      firstInvocation.whenInvoked,
      secondInvocation.whenInvoked,
    ]);

    const forgedBinding = { ...first.binding };
    const forgedTransition = { ...firstInvocation.transition };
    expect(firstRuntime.bindingFor(forgedBinding)).toBeUndefined();
    expect(firstRuntime.bindingFor(second.binding)).toBeUndefined();
    expect(firstRuntime.transitionFor(forgedTransition)).toBeUndefined();
    expect(
      firstRuntime.transitionFor(secondInvocation.transition),
    ).toBeUndefined();
    expect(firstRuntime.forgetTransition(forgedTransition)).toBe(false);
    expect(firstRuntime.forgetTransition(secondInvocation.transition)).toBe(
      false,
    );
    expect(() =>
      first.settle(forgedTransition, {
        status: 'verified',
        evidence: { forged: true },
      }),
    ).toThrow(/unknown or forged/);
    expect(() =>
      first.settle(secondInvocation.transition, {
        status: 'verified',
        evidence: { foreign: true },
      }),
    ).toThrow(/unknown or forged/);
  });
});

describe('action input schema enforcement', () => {
  it('reports direct schema rejection as an observed, terminal preflight refusal', async () => {
    let calls = 0;
    let observed:
      | ActionInvocation<void, 'schema.direct-refusal-runtime'>
      | undefined;
    const action = defineAction('schema.direct-refusal-runtime', {
      does: 'Refuse invalid direct input before the handler starts',
      invocation: 'scalar',
      inputSchema: {
        safeParse: () => ({ success: false as const, error: 'invalid input' }),
      },
      mutate: (_value: string) => {
        calls += 1;
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'schema',
      input: () => 'invalid',
      onInvocation(invocation) {
        if (invocation.behavior === 'mutation') observed = invocation;
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
    const search = defineAction('search.schema-runtime', {
      does: 'Search the catalogue',
      invocation: 'scalar',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
      mutate: ({ query }: { query: string }) => {
        calls += 1;
        return query;
      },
    });
    const contexts: unknown[] = [];
    const runtime = createActionRuntime({
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
    const offer = runtime.forPrincipal('system').offers(search)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    expect(offer.inputValidation).toBe('active');

    const refused = runtime
      .forPrincipal('system')
      .invoke(offer, { typo: 'boots' } as never);
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
    expect(runtime.forPrincipal('system').offers(search)[0]).toBe(offer);
    expect(runtime.forgetTransition(refused.transition)).toBe(true);
    expect(runtime.transitionFor(refused.transition)).toBeUndefined();
    await runtime.forPrincipal('system').invoke(offer, { query: 'boots' })
      .whenInvoked;
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
    const action = defineAction('json.disclosure-runtime', {
      does: 'Carry a JSON schema',
      invocation: 'scalar',
      inputSchema: {
        type: 'object',
        properties: { value: { type: 'string' } },
      },
      mutate: (_value: { value: string }) => {
        calls += 1;
      },
    });
    const strict = createActionRuntime();
    expect(() => connectAction(strict, action, { node: 'json' })).toThrow(
      /inputSchema.*inputSchemaAdapter/,
    );
    expect(strict.bindings()).toEqual([]);

    const disclosure = createActionRuntime({
      contractActivation: 'disclosure',
    });
    connectAction(disclosure, action, { node: 'json' });
    const offer = disclosure.forPrincipal('system').offers(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    expect(offer).toMatchObject({
      contractActivation: 'disclosure',
      inputValidation: 'disclosure',
    });
    await disclosure
      .forPrincipal('system')
      .invoke(offer, { unvalidated: true } as never).whenInvoked;
    expect(calls).toBe(1);
  });

  it('withholds a bound offer whose captured input fails its validator', () => {
    let calls = 0;
    const action = defineAction('bound.schema-runtime', {
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
      mutate: (_value: string) => {
        calls += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, {
      node: 'bound',
      input: () => 'invalid',
    });

    let refusal: unknown;
    try {
      runtime.forPrincipal('system').offers(action);
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
    const action = defineAction('parser.schema-runtime', {
      does: 'Use the caller value',
      invocation: 'scalar',
      inputSchema: {
        parse: (_value: unknown) => ({ query: 'transformed' }),
      },
      mutate: (value: { query: string }) => {
        received = value;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, { node: 'parser' });
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    await runtime.forPrincipal('system').invoke(offer, exact).whenInvoked;
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
    const selfValidated = defineAction('schema.captured-validator-runtime', {
      does: 'Use the registered validator',
      invocation: 'scalar',
      inputSchema: validatorSchema,
      mutate: (_value: string) => undefined,
    });
    const validatorRuntime = createActionRuntime();
    connectAction(validatorRuntime, selfValidated, { node: 'validator' });
    Reflect.deleteProperty(validatorSchema, 'safeParse');
    expect(isDefinedAction(selfValidated)).toBe(true);
    expect(actionDefinitionOf(selfValidated)?.ref.definitionId).toBe(
      'schema.captured-validator-runtime',
    );
    const validatorOffer = validatorRuntime
      .forPrincipal('system')
      .offers(selfValidated)[0]!;
    if (validatorOffer.inputMode !== 'open') {
      throw new Error('expected open validator offer');
    }

    const validatorOutcome = await validatorRuntime
      .forPrincipal('system')
      .invoke(validatorOffer, 'value').whenInvoked;
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
    const adapterRuntime = createActionRuntime({
      inputSchemaAdapter: adapter,
    });
    adapter.supports = () => false;
    adapter.validate = () => ({ valid: true as const });
    const adapted = defineAction('schema.captured-adapter-runtime', {
      does: 'Use the registered schema adapter',
      invocation: 'scalar',
      inputSchema: { type: 'string' },
      mutate: (_value: string) => undefined,
    });
    connectAction(adapterRuntime, adapted, { node: 'adapter' });
    const adapterOffer = adapterRuntime
      .forPrincipal('system')
      .offers(adapted)[0]!;
    if (adapterOffer.inputMode !== 'open') {
      throw new Error('expected open adapter offer');
    }

    const adapterOutcome = await adapterRuntime
      .forPrincipal('system')
      .invoke(adapterOffer, 'value').whenInvoked;
    expect(adapterOutcome).toMatchObject({
      status: 'refused',
      error: { code: 'ACTION_INPUT_INVALID', issues: 'original adapter' },
    });
    expect(adapterCalls).toBe(1);
  });

  it('rejects async schema validators as refused input without running the handler', async () => {
    let calls = 0;
    const action = defineAction('parser.async-runtime', {
      does: 'Reject an async parser',
      invocation: 'scalar',
      inputSchema: {
        parse: async (_value: unknown) => ({ valid: true }),
      },
      mutate: (_value: string) => {
        calls += 1;
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, { node: 'parser' });
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    const outcome = await runtime.forPrincipal('system').invoke(offer, 'value')
      .whenInvoked;
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
    const bound = defineAction('schema.reentrant-bound-runtime', {
      does: 'Validate bound input',
      invocation: 'scalar',
      inputSchema: {
        safeParse: (_value: unknown) => {
          boundConnection.disconnect();
          return { success: true };
        },
      },
      mutate: (_value: string) => undefined,
    });
    const boundRuntime = createActionRuntime();
    boundConnection = connectAction(boundRuntime, bound, {
      node: 'schema',
      input: () => 'value',
    });
    expect(() => boundRuntime.forPrincipal('system').offers(bound)).toThrow(
      /disconnected while validating offered input/,
    );
    expect(boundRuntime.bindings()).toEqual([]);
    expect(boundRuntime.forPrincipal('system').offers()).toEqual([]);

    let calls = 0;
    let openConnection!: { touch(): void };
    const open = defineAction('schema.reentrant-open-runtime', {
      does: 'Validate caller input',
      invocation: 'scalar',
      inputSchema: {
        safeParse: (_value: unknown) => {
          openConnection.touch();
          return { success: true };
        },
      },
      mutate: (_value: string) => {
        calls += 1;
      },
    });
    const openRuntime = createActionRuntime();
    openConnection = connectAction(openRuntime, open, { node: 'schema' });
    const offer = openRuntime.forPrincipal('system').offers(open)[0]!;
    if (offer.inputMode !== 'open') throw new Error('expected open offer');
    expect(() =>
      openRuntime.forPrincipal('system').invoke(offer, 'value'),
    ).toThrow(/changed while validating input/);
    expect(calls).toBe(0);
    expect(() =>
      openRuntime.forPrincipal('system').invoke(offer, 'value'),
    ).toThrow(/stale|no longer serves|not a live offer/);
  });

  it('lets an exact scalar slot interpret explicit undefined as a default', async () => {
    const received: string[] = [];
    const action = defineAction('input.default-runtime', {
      does: 'Run defaulted input',
      invocation: 'scalar',
      inputSchema: { safeParse: () => ({ success: true as const }) },
      mutate: (value: string | undefined) => {
        received.push(value ?? 'default');
      },
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, { node: 'input' });
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    expect(offer.inputMode).toBe('open');
    if (offer.inputMode !== 'open') throw new Error('expected open offer');

    await runtime.forPrincipal('system').invoke(offer, undefined).whenInvoked;
    await runtime.forPrincipal('system').invoke(offer, 'explicit').whenInvoked;
    expect(received).toEqual(['default', 'explicit']);
  });

  it("enforces inputSchema 'none' without confusing omission and undefined", () => {
    let arity = -1;
    const runWithoutInput: () => void = function () {
      arity = arguments.length;
    };
    const action = defineAction('none.schema-runtime', {
      does: 'Run without input',
      invocation: 'inputless',
      inputSchema: 'none',
      mutate: runWithoutInput,
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, { node: 'none' });
    const offer = runtime.forPrincipal('system').offers(action)[0]!;
    expect(offer.inputMode).toBe('none');
    if (offer.inputMode !== 'none') throw new Error('expected no-input offer');

    runtime.forPrincipal('system').invoke(offer);
    expect(arity).toBe(0);
    const system = runtime.forPrincipal('system');
    expect(() =>
      (system.invoke as (offer: ActionOffer, input?: unknown) => unknown)(
        offer,
        undefined,
      ),
    ).toThrow(/takes no input/);
  });

  it('withholds a principal-gated capability before running live readers', async () => {
    let inputReads = 0;
    let enabledReads = 0;
    let busyReads = 0;
    const seen: string[] = [];
    const action = defineAction('principal.human-only-runtime', {
      does: 'Perform a human-only action',
      invocation: 'scalar',
      principal: { mayInvoke: ['human'] },
      mutate: (value: string) => seen.push(value),
    });
    const runtime = createActionRuntime();
    connectAction(runtime, action, {
      node: 'principal',
      input: () => {
        inputReads += 1;
        return 'exact-input';
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
    const agent = runtime.forPrincipal('agent');
    const human = runtime.forPrincipal('user');

    expect(agent.offers(action)).toEqual([]);
    expect(runtime.forPrincipal('unknown').offers(action)).toEqual([]);
    expect(runtime.forPrincipal('system').offers(action)).toEqual([]);
    expect({ inputReads, enabledReads, busyReads }).toEqual({
      inputReads: 0,
      enabledReads: 0,
      busyReads: 0,
    });

    const offer = human.offers(action)[0]!;
    if (offer.inputMode !== 'bound') throw new Error('expected bound offer');
    expect(offer.ref.principal).toBe('user');
    expect({ inputReads, enabledReads, busyReads }).toEqual({
      inputReads: 1,
      enabledReads: 1,
      busyReads: 1,
    });
    expect(() =>
      (runtime.forPrincipal('system') as PrincipalActionPort).invoke(offer),
    ).toThrow(/principal 'user'.*'system'/);
    expect(() => (agent as PrincipalActionPort).invoke(offer)).toThrow(
      /principal 'user'.*'agent'/,
    );
    expect({ inputReads, enabledReads, busyReads }).toEqual({
      inputReads: 1,
      enabledReads: 1,
      busyReads: 1,
    });

    // A denied reader cannot revoke a capability already minted for an
    // allowed principal, and its enumeration executes no live reader.
    expect(agent.offers(action)).toEqual([]);
    expect({ inputReads, enabledReads, busyReads }).toEqual({
      inputReads: 1,
      enabledReads: 1,
      busyReads: 1,
    });

    const invocation = human.invoke(offer);
    expect(await invocation.whenInvoked).toMatchObject({ status: 'performed' });
    expect(invocation.transition.principal).toBe('user');
    expect(invocation.transition.offer).toBe(offer.ref);
    expect(seen).toEqual(['exact-input']);
  });

  it('mints distinct principal offers over one retained bound input generation', async () => {
    let reads = 0;
    const seen: string[] = [];
    const action = defineAction('principal.shared-input-runtime', {
      does: 'Use one committed value through either permitted reader',
      invocation: 'scalar',
      principal: { mayInvoke: ['human', 'agent'] },
      mutate: (value: string) => seen.push(value),
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'principal',
      instance: 'opaque[instance].with:punctuation',
      input: () => {
        reads += 1;
        return 'one-generation';
      },
    });
    const human = runtime.forPrincipal('user');
    const agent = runtime.forPrincipal('agent');
    const humanOffer = human.offers(action)[0]!;
    const agentOffer = agent.offers(action)[0]!;
    if (humanOffer.inputMode !== 'bound' || agentOffer.inputMode !== 'bound') {
      throw new Error('expected bound offers');
    }

    expect(humanOffer).not.toBe(agentOffer);
    expect(humanOffer.ref).not.toBe(agentOffer.ref);
    expect(humanOffer.ref.principal).toBe('user');
    expect(agentOffer.ref.principal).toBe('agent');
    expect(humanOffer.input).toBe(agentOffer.input);
    expect(reads).toBe(1);
    expect(humanOffer.ref.binding.instance).toBe(
      'opaque[instance].with:punctuation',
    );

    await human.invoke(humanOffer).whenInvoked;
    await agent.invoke(agentOffer).whenInvoked;
    expect(seen).toEqual(['one-generation', 'one-generation']);

    connection.touch();
    expect(() => human.invoke(humanOffer)).toThrow(/stale|no longer serves|not a live offer/);
    expect(() => agent.invoke(agentOffer)).toThrow(/stale|no longer serves|not a live offer/);
  });

  it('records an application-owned direct occurrence as unknown without weakening the broker gate', async () => {
    let calls = 0;
    const action = defineAction('principal.direct-runtime', {
      does: 'Require an explicit human reader',
      invocation: 'inputless',
      principal: { mayInvoke: ['human'] },
      mutate: () => {
        calls += 1;
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: 'principal' });

    const direct = connection.invoke();
    expect(await direct.whenInvoked).toMatchObject({
      status: 'performed',
    });
    expect(direct.transition.principal).toBe('unknown');
    expect(calls).toBe(1);

    const human = runtime.forPrincipal('user');
    const offer = human.offers(action)[0]!;
    const invoked = human.invoke(offer);
    expect(await invoked.whenInvoked).toMatchObject({ status: 'performed' });
    expect(invoked.transition.principal).toBe('user');
    expect(calls).toBe(2);
  });

  it('does not let disclosure mode weaken a declared principal gate', () => {
    const action = defineAction('principal.disclosure-runtime', {
      does: 'Remain human-only under disclosure mode',
      invocation: 'inputless',
      principal: { mayInvoke: ['human'] },
      mutate: () => undefined,
    });
    const runtime = createActionRuntime({
      contractActivation: 'disclosure',
    });
    connectAction(runtime, action, { node: 'principal' });

    expect(runtime.forPrincipal('agent').offers(action)).toEqual([]);
    expect(runtime.forPrincipal('user').offers(action)).toHaveLength(1);
    expect(runtime.forPrincipal('system').offers(action)).toEqual([]);
  });

  it('refuses an invalid principal before constructing a port', () => {
    const runtime = createActionRuntime();
    expect(() =>
      (runtime.forPrincipal as (principal: string) => unknown)('robot'),
    ).toThrow(/principal must be user, agent, system, or unknown/);
  });
});

describe('late settlement is kept, marked late, and reopens nothing', () => {
  const authority = { kind: 'cancelled', reason: 'operator stopped waiting' } as const;

  it('a verified arriving after abandoned is recorded as a claim — and the terminal stands', async () => {
    const action = defineAction('late.verified-after-abandoned', {
      does: 'Prove late evidence survives without reopening the terminal',
      invocation: 'inputless',
      mutate: () => 'done',
      settle: { writes: ['late.subject'] },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'late',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;

    expect(
      connection.settle(invocation.transition, { status: 'abandoned', authority })
        .status,
    ).toBe('abandoned');

    // First terminal wins: the late settle returns the FIRST settlement,
    // unchanged — a caller can see its answer was not the one adopted.
    const echoed = connection.settle(invocation.transition, {
      status: 'verified',
      evidence: { source: 'job-store', landedLate: true },
    });
    expect(echoed.status).toBe('abandoned');

    // And the losing evidence is a fact on the record, not a silence: the
    // claim is QUOTED (never validated, never adopted), in arrival order.
    const snapshot = runtime.transitionFor(invocation.transition)!;
    expect(snapshot.effectStatus).toBe('abandoned');
    expect(snapshot.lateSettlements).toHaveLength(1);
    expect(snapshot.lateSettlements![0]!.claimed).toBe('verified');
    expect(snapshot.lateSettlements![0]!.payload).toEqual({
      source: 'job-store',
      landedLate: true,
    });
  });

  it('a snapshot taken before any late arrival carries NO lateSettlements — absence, not an empty list', async () => {
    const action = defineAction('late.absent-not-empty', {
      does: 'An empty list would claim "we watched and none came"',
      invocation: 'inputless',
      mutate: () => 'done',
      settle: { writes: ['late.subject'] },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, {
      node: 'late',
      coverage: 'verifiable',
    });
    const invocation = connection.invoke();
    await invocation.whenInvoked;
    connection.settle(invocation.transition, { status: 'abandoned', authority });

    const before = runtime.transitionFor(invocation.transition)!;
    expect(before).not.toHaveProperty('lateSettlements');

    // A snapshot already handed out is immutable: a later late arrival must
    // not grow a list inside it retroactively.
    connection.settle(invocation.transition, {
      status: 'refused',
      reason: 'came back too late',
    });
    expect(before).not.toHaveProperty('lateSettlements');
    const after = runtime.transitionFor(invocation.transition)!;
    expect(after.lateSettlements).toHaveLength(1);
    expect(after.lateSettlements![0]!.claimed).toBe('refused');
  });
});
