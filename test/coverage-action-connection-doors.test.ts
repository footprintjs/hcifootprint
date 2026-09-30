import { afterEach, describe, expect, it } from "vitest";
import {
  connectAction,
  createActionRuntime,
  defineAction,
  type ActionRuntime,
} from "../src/index.js";
import { withObserverCapture } from "../src/action/observer-capture.js";

/**
 * The connection's own doors (connection-builder.ts · buildConnection, with
 * authoring.ts and binding-facts.ts): every refusal a developer meets where
 * they are looking, and the instrumentation law — an observer that fails
 * never replaces the application's result.
 */

function connectLoose(
  runtime: ActionRuntime,
  action: unknown,
  options: unknown
): unknown {
  return Reflect.apply(connectAction, undefined, [runtime, action, options]);
}

function scalarAction(
  id: string,
  mutate: (value: string) => unknown = (v) => v
) {
  return defineAction(id, {
    does: "Save the value",
    invocation: "scalar",
    mutate,
  });
}

function inputlessAction(id: string, mutate: () => unknown = () => "ok") {
  return defineAction(id, {
    does: "Refresh the list",
    invocation: "inputless",
    mutate,
  });
}

describe("connectAction() options refusals — nothing is registered on a refusal", () => {
  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "orders"],
  ])("refuses %s as the options record", (_label, options) => {
    const runtime = createActionRuntime();
    expect(() =>
      connectLoose(runtime, scalarAction("opts.record"), options)
    ).toThrow("hcifootprint: connectAction() needs a binding options record.");
    expect(runtime.bindings()).toEqual([]);
  });

  it.each([
    ["an empty node", ""],
    ["a blank node", "   "],
    ["a non-string node", 42],
  ])("refuses %s", (_label, node) => {
    const runtime = createActionRuntime();
    expect(() =>
      connectLoose(runtime, scalarAction("opts.node"), { node })
    ).toThrow("hcifootprint: connectAction() needs a non-empty node path.");
    expect(runtime.bindings()).toEqual([]);
  });

  it("refuses an instance that is not an opaque string", () => {
    const runtime = createActionRuntime();
    expect(() =>
      connectLoose(runtime, scalarAction("opts.instance"), {
        node: "orders",
        instance: 7,
      })
    ).toThrow(
      "hcifootprint: connectAction() instance must be an opaque string when supplied."
    );
    expect(runtime.bindings()).toEqual([]);
  });

  it.each(["input", "enabled", "busy", "onInvocation", "onInvocationError"])(
    "refuses a %s reader that is not a function, naming the field",
    (field) => {
      const runtime = createActionRuntime();
      expect(() =>
        connectLoose(runtime, scalarAction(`opts.reader.${field}`), {
          node: "orders",
          [field]: "not-a-function",
        })
      ).toThrow(
        `hcifootprint: connectAction() ${field} must be a function when supplied.`
      );
      expect(runtime.bindings()).toEqual([]);
    }
  );

  it("refuses a humanReporting that is neither connection nor sensor", () => {
    const runtime = createActionRuntime();
    expect(() =>
      connectLoose(runtime, scalarAction("opts.human"), {
        node: "orders",
        humanReporting: "screen",
      })
    ).toThrow(
      "hcifootprint: connectAction() humanReporting must be connection or sensor."
    );
    expect(runtime.bindings()).toEqual([]);
  });

  it.each([
    ["inputless", inputlessAction("opts.reader-on-inputless")],
    [
      "host",
      defineAction("opts.reader-on-host", {
        does: "Report the host listener",
        invocation: "host",
        mutate: () => undefined,
      }),
    ],
  ])("refuses a scalar input reader on a %s definition", (mode, action) => {
    const runtime = createActionRuntime();
    expect(() =>
      connectLoose(runtime, action, { node: "orders", input: () => "x" })
    ).toThrow(
      `declares invocation: '${mode}' and cannot connect a scalar input reader.`
    );
    expect(runtime.bindings()).toEqual([]);
  });
});

describe("contract activation — every enforceable clause is named at the connect door", () => {
  const clauses = [
    ["guard.when", { guard: { when: { page: { eq: "orders" } } } }],
    ["guard.enabledWhen", { guard: { enabledWhen: { ready: { eq: true } } } }],
    ["settle.verify", { settle: { verify: { saved: { eq: true } } } }],
    [
      "principal.requiresHumanApproval",
      { principal: { requiresHumanApproval: true } },
    ],
  ] as const;

  it.each(clauses)(
    "a require-active runtime refuses %s it cannot activate",
    (clause, contract) => {
      const action = defineAction(`activation.${clause}`, {
        does: "Archive the order",
        invocation: "inputless",
        ...contract,
        mutate: () => "archived",
      } as unknown as Parameters<typeof defineAction>[1]);
      const runtime = createActionRuntime();
      expect(() => connectLoose(runtime, action, { node: "orders" })).toThrow(
        `hcifootprint: action definition 'activation.${clause}' has enforceable contract clause(s) ${clause} that this framework-neutral runtime cannot activate.`
      );
      expect(runtime.bindings()).toEqual([]);

      // The visible opt-in connects the same definition as metadata only.
      const disclosing = createActionRuntime({
        contractActivation: "disclosure",
      });
      const connection = connectLoose(disclosing, action, {
        node: "orders",
      }) as { binding: unknown };
      expect(disclosing.bindings()).toHaveLength(1);
      expect(connection.binding).toBeDefined();
    }
  );

  it("lists every clause at once, in declaration-reading order", () => {
    const action = defineAction("activation.all", {
      does: "Archive the order",
      invocation: "inputless",
      guard: {
        when: { page: { eq: "orders" } },
        enabledWhen: { ready: { eq: true } },
      },
      settle: { verify: { saved: { eq: true } } },
      principal: { requiresHumanApproval: true },
      mutate: () => "archived",
    });
    expect(() =>
      connectLoose(createActionRuntime(), action, { node: "orders" })
    ).toThrow(
      "clause(s) guard.when, guard.enabledWhen, settle.verify, principal.requiresHumanApproval that"
    );
  });
});

describe("the direct invocation door", () => {
  it("refuses a replacement payload for a connection that owns an input reader", () => {
    let calls = 0;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      scalarAction("door.reader-owned", (value) => {
        calls += 1;
        return value;
      }),
      { node: "orders", input: () => "from-reader" }
    );
    expect(() =>
      Reflect.apply(connection.invoke, connection, ["replacement"])
    ).toThrow(
      `hcifootprint: binding '${connection.binding.bindingId}' owns a bound input reader; invoke it without a replacement payload.`
    );
    expect(calls).toBe(0);
    expect(runtime.transitions()).toEqual([]);
  });

  it("a throwing input reader becomes a refused, never-attempted transition", async () => {
    let calls = 0;
    const boom = new Error("the form is unmounted");
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      scalarAction("door.reader-throws", (value) => {
        calls += 1;
        return value;
      }),
      {
        node: "orders",
        input: () => {
          throw boom;
        },
      }
    );
    const invocation = connection.invoke();
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: "refused",
      error: boom,
    });
    await expect(invocation.whenEffectSettled).resolves.toMatchObject({
      status: "refused",
      reason: { code: "ACTION_NOT_ATTEMPTED", phase: "preflight" },
    });
    expect(invocation.input).toEqual({ source: "bound", provided: false });
    expect(calls).toBe(0);
  });

  it("a scalar action with no reader refuses a call that passes no payload slot", () => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      scalarAction("door.scalar-empty"),
      {
        node: "orders",
      }
    );
    expect(() => Reflect.apply(connection.invoke, connection, [])).toThrow(
      "hcifootprint: scalar action 'door.scalar-empty' requires exactly one deliberate input payload slot. Pass undefined explicitly when undefined is the intended value."
    );
    expect(runtime.transitions()).toEqual([]);
  });

  it("an inputless action refuses a payload slot", () => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("door.inputless"),
      {
        node: "orders",
      }
    );
    expect(() =>
      Reflect.apply(connection.invoke, connection, [undefined])
    ).toThrow(
      "hcifootprint: inputless action definition 'door.inputless' cannot receive a payload slot."
    );
    expect(runtime.transitions()).toEqual([]);
  });
});

describe("attach() refusals", () => {
  function connected() {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, inputlessAction("attach.doors"), {
      node: "orders",
    });
    return { runtime, connection };
  }

  it.each([
    ["null", null],
    ["a string", "button"],
  ])("refuses %s as the projection", (_label, projection) => {
    const { runtime, connection } = connected();
    expect(() => connection.attach(projection as never)).toThrow(
      "hcifootprint: attach() needs an already-resolved interactive host."
    );
    expect(runtime.bindingFor(connection.binding)?.attached).toBe(false);
  });

  it.each([
    ["a null host", null],
    ["a primitive host", "button#save"],
  ])("refuses %s", (_label, interactive) => {
    const { runtime, connection } = connected();
    expect(() =>
      connection.attach({
        interactive: interactive as unknown as object,
        coverage: "executable",
      })
    ).toThrow(
      "hcifootprint: attach() needs an already-resolved interactive host."
    );
    expect(runtime.bindingFor(connection.binding)?.attached).toBe(false);
  });

  it.each([
    ["null", null],
    ["a primitive", 7],
  ])("refuses %s as the valueElement", (_label, valueElement) => {
    const { runtime, connection } = connected();
    expect(() =>
      connection.attach({
        interactive: {},
        valueElement: valueElement as unknown as object,
        coverage: "executable",
      })
    ).toThrow(
      "hcifootprint: attach() valueElement must be an object when supplied."
    );
    expect(runtime.bindingFor(connection.binding)?.attached).toBe(false);
  });

  it("accepts a function host and a function valueElement (both are objects to the DOM)", () => {
    const { runtime, connection } = connected();
    const handle = connection.attach({
      interactive: () => undefined,
      valueElement: () => undefined,
      coverage: "verifiable",
    });
    expect(runtime.bindingFor(connection.binding)).toMatchObject({
      attached: true,
      coverage: "verifiable",
    });
    handle.detach();
    expect(runtime.bindingFor(connection.binding)?.attached).toBe(false);
  });
});

describe("update() — the committed facts record", () => {
  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "enabled"],
  ])("refuses %s", (_label, update) => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("update.record"),
      {
        node: "orders",
      }
    );
    const before = runtime.bindingFor(connection.binding);
    expect(() => connection.update(update as never)).toThrow(
      "hcifootprint: update() needs a binding-facts record."
    );
    expect(runtime.bindingFor(connection.binding)).toEqual(before);
  });

  it("sets, then refuses a malformed, humanReporting", () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, inputlessAction("update.human"), {
      node: "orders",
      humanReporting: "connection",
    });
    connection.update({ humanReporting: "sensor" });
    expect(runtime.bindingFor(connection.binding)?.humanReporting).toBe(
      "sensor"
    );

    expect(() =>
      connection.update({ humanReporting: "screen" as never })
    ).toThrow(
      "hcifootprint: update() humanReporting must be connection or sensor."
    );
    expect(runtime.bindingFor(connection.binding)?.humanReporting).toBe(
      "sensor"
    );

    // An explicit undefined removes the fact — absence, not a stored value.
    connection.update({ humanReporting: undefined });
    expect("humanReporting" in runtime.bindingFor(connection.binding)!).toBe(
      false
    );
  });

  it("an explicit undefined locators list clears the locators", () => {
    const locator = { kind: "programmatic" as const, provider: "test" };
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("update.locators"),
      {
        node: "orders",
        locators: [locator],
      }
    );
    expect(runtime.bindingFor(connection.binding)?.locators).toEqual([locator]);
    connection.update({ locators: undefined });
    expect(runtime.bindingFor(connection.binding)?.locators).toEqual([]);
  });
});

describe("invokeContinuation() and settle() refusals", () => {
  it("refuses a continuation that is not a function", () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, inputlessAction("cont.fn"), {
      node: "orders",
    });
    expect(() => connection.invokeContinuation("go" as never)).toThrow(
      "hcifootprint: invokeContinuation() needs the exact application continuation."
    );
    expect(runtime.transitions()).toEqual([]);
  });

  it.each(["identity", "semantic"] as const)(
    "refuses a continuation on a %s-coverage binding",
    (coverage) => {
      let ran = false;
      const runtime = createActionRuntime();
      const connection = connectAction(
        runtime,
        inputlessAction(`cont.${coverage}`),
        {
          node: "orders",
          coverage,
        }
      );
      expect(() =>
        connection.invokeContinuation(() => {
          ran = true;
        })
      ).toThrow(
        `hcifootprint: binding '${connection.binding.bindingId}' is not executable (coverage: ${coverage}).`
      );
      expect(ran).toBe(false);
      expect(runtime.transitions()).toEqual([]);
    }
  );

  it("refuses to settle a transition that belongs to another binding", async () => {
    const runtime = createActionRuntime();
    const action = inputlessAction("settle.other");
    const mine = connectAction(runtime, action, {
      node: "orders",
      instance: "a",
    });
    const theirs = connectAction(runtime, action, {
      node: "orders",
      instance: "b",
    });
    const invocation = theirs.invoke();
    await invocation.whenInvoked;
    expect(() =>
      mine.settle(invocation.transition, { status: "verified" } as never)
    ).toThrow(
      `hcifootprint: transition '${invocation.transition.transitionId}' belongs to another binding.`
    );
    expect(runtime.transitionFor(invocation.transition)?.effectStatus).toBe(
      "unverified"
    );
  });
});

describe("invocation observers are instrumentation — they never replace the result", () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  afterEach(() => {
    unhandled.length = 0;
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("a synchronously throwing onInvocation is reported to onInvocationError", async () => {
    const reported: unknown[] = [];
    const boom = new Error("observer broke");
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("obs.sync-throw"),
      {
        node: "orders",
        onInvocation: () => {
          throw boom;
        },
        onInvocationError: (error) => {
          reported.push(error);
        },
      }
    );
    const invocation = connection.invoke();
    await expect(invocation.whenInvoked).resolves.toMatchObject({
      status: "performed",
      produced: "ok",
    });
    expect(reported).toEqual([boom]);
  });

  it("with no onInvocationError, a throwing observer is dropped and the result stands", async () => {
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, inputlessAction("obs.no-sink"), {
      node: "orders",
      onInvocation: () => {
        throw new Error("observer broke");
      },
    });
    await expect(connection.invoke().whenInvoked).resolves.toMatchObject({
      status: "performed",
      produced: "ok",
    });
    await flush();
    expect(unhandled).toEqual([]);
  });

  it("an onInvocationError that itself rejects is swallowed, never an unhandled rejection", async () => {
    let sinkCalls = 0;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("obs.sink-rejects"),
      {
        node: "orders",
        onInvocation: () => {
          throw new Error("observer broke");
        },
        onInvocationError: () => {
          sinkCalls += 1;
          return Promise.reject(new Error("the sink broke too"));
        },
      }
    );
    await expect(connection.invoke().whenInvoked).resolves.toMatchObject({
      status: "performed",
    });
    await flush();
    expect(sinkCalls).toBe(1);
    expect(unhandled).toEqual([]);
  });

  it("an observer capture that answers with a non-callback is reported and the observer is skipped", async () => {
    const reported: unknown[] = [];
    let observed = 0;
    const observer = withObserverCapture(
      () => {
        observed += 1;
      },
      () => 42 as never
    );
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("obs.capture-bad"),
      {
        node: "orders",
        onInvocation: observer,
        onInvocationError: (error) => {
          reported.push(error);
        },
      }
    );
    await expect(connection.invoke().whenInvoked).resolves.toMatchObject({
      status: "performed",
    });
    expect(observed).toBe(0);
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(TypeError);
    expect((reported[0] as Error).message).toBe(
      "hcifootprint: an invocation observer capture must return a callback or undefined."
    );
  });

  it("an observer capture that throws is reported and the observer is skipped", async () => {
    const reported: unknown[] = [];
    const boom = new Error("capture broke");
    let observed = 0;
    const observer = withObserverCapture(
      () => {
        observed += 1;
      },
      () => {
        throw boom;
      }
    );
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("obs.capture-throws"),
      {
        node: "orders",
        onInvocation: observer,
        onInvocationError: (error) => {
          reported.push(error);
        },
      }
    );
    await expect(connection.invoke().whenInvoked).resolves.toMatchObject({
      status: "performed",
    });
    expect(observed).toBe(0);
    expect(reported).toEqual([boom]);
  });

  it("a failed capture of onInvocationError itself leaves no sink: later observer errors go nowhere", async () => {
    let sinkCalls = 0;
    const sink = withObserverCapture(
      () => {
        sinkCalls += 1;
      },
      () => {
        throw new Error("sink capture broke");
      }
    );
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("obs.sink-capture"),
      {
        node: "orders",
        onInvocation: () => {
          throw new Error("observer broke");
        },
        onInvocationError: sink,
      }
    );
    await expect(connection.invoke().whenInvoked).resolves.toMatchObject({
      status: "performed",
      produced: "ok",
    });
    await flush();
    expect(sinkCalls).toBe(0);
    expect(unhandled).toEqual([]);
  });
});
