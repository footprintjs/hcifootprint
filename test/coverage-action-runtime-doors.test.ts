import { describe, expect, it } from "vitest";
import {
  connectAction,
  createActionRuntime,
  defineAction,
  type ActionOffer,
  type ActionRuntime,
} from "../src/index.js";

/**
 * The runtime's own doors (connection.ts · DefaultActionRuntime): option
 * refusals at construction, the principal port's refusals, and the rule that
 * a binding's facts are read from ONE committed generation — a reader that
 * moves its own binding while being read never yields a mixed answer.
 */

function inputlessAction(id: string, mutate: () => unknown = () => "ok") {
  return defineAction(id, {
    does: "Refresh the list",
    invocation: "inputless",
    mutate,
  });
}

function invokeLoose(
  runtime: ActionRuntime,
  principal: "user" | "agent" | "system",
  ...args: unknown[]
): unknown {
  const port = runtime.forPrincipal(principal);
  return Reflect.apply(port.invoke, port, args);
}

describe("createActionRuntime() option refusals", () => {
  it("refuses an unknown contractActivation", () => {
    expect(() =>
      createActionRuntime({ contractActivation: "lenient" as never })
    ).toThrow(
      "hcifootprint: invalid contractActivation 'lenient'; expected require-active or disclosure."
    );
  });

  it.each([
    ["null", null],
    ["a function", () => undefined],
    ["a record without validate()", { supports: () => true }],
    ["a record without supports()", { validate: () => ({ ok: true }) }],
  ])("refuses %s as the inputSchemaAdapter", (_label, adapter) => {
    expect(() =>
      createActionRuntime({ inputSchemaAdapter: adapter as never })
    ).toThrow(
      "hcifootprint: inputSchemaAdapter needs synchronous supports() and validate() methods."
    );
  });

  it.each([
    ["null", null],
    ["a string", "orders"],
    ["a record without describe()", { has: () => true }],
    ["a record without has()", { describe: () => undefined }],
  ])("refuses %s as the kinds catalog", (_label, kinds) => {
    expect(() => createActionRuntime({ kinds: kinds as never })).toThrow(
      "hcifootprint: kinds must be a KindCatalog with synchronous has() and describe() — declareKinds() builds the default."
    );
  });

  it("reports the activation it was built with", () => {
    expect(createActionRuntime().contractActivation).toBe("require-active");
    expect(
      createActionRuntime({ contractActivation: "disclosure" })
        .contractActivation
    ).toBe("disclosure");
  });
});

describe("connect() and offers() refuse a callable defineAction() did not make", () => {
  it("connect() refuses it", () => {
    const runtime = createActionRuntime();
    expect(() =>
      runtime.connect((() => "x") as never, { node: "orders" } as never)
    ).toThrow(
      "hcifootprint: connectAction() needs a callable created by defineAction()."
    );
    expect(runtime.bindings()).toEqual([]);
  });

  it("offers() refuses it", () => {
    const runtime = createActionRuntime();
    connectAction(runtime, inputlessAction("offers.plain-fn"), {
      node: "orders",
    });
    expect(() =>
      runtime.forPrincipal("user").offers((() => "x") as never)
    ).toThrow(
      "hcifootprint: offers() received a function that was not created by defineAction()."
    );
  });
});

describe("the principal port invoke() door", () => {
  it("refuses something that is not an object", () => {
    const runtime = createActionRuntime();
    expect(() => invokeLoose(runtime, "user", null)).toThrow(
      "hcifootprint: invoke() needs an exact offer returned for this principal authority."
    );
    expect(() => invokeLoose(runtime, "user", "offer#1")).toThrow(
      "hcifootprint: invoke() needs an exact offer returned for this principal authority."
    );
  });

  it("refuses an object with no offer ref — offers are never rebuilt", () => {
    const runtime = createActionRuntime();
    expect(() => invokeLoose(runtime, "user", {})).toThrow(
      "hcifootprint: invoke() received something that is not an offer this runtime returned — offers are invoked exactly as handed out, never rebuilt."
    );
  });

  it("refuses more than one payload slot before anything runs", () => {
    let calls = 0;
    const runtime = createActionRuntime();
    connectAction(
      runtime,
      inputlessAction("port.two-slots", () => {
        calls += 1;
      }),
      { node: "orders" }
    );
    const [offer] = runtime.forPrincipal("user").offers();
    expect(() => invokeLoose(runtime, "user", offer, 1, 2)).toThrow(
      "hcifootprint: principal invoke() accepts at most one payload slot."
    );
    expect(calls).toBe(0);
    expect(runtime.transitions()).toEqual([]);
  });
});

describe("offers() reads a binding from ONE committed generation", () => {
  it("a malformed enabled answer refuses offers() and retires the offer already out", () => {
    let enabled: unknown = true;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("gen.enabled-type"),
      {
        node: "orders",
        enabled: () => enabled as boolean,
      }
    );
    const port = runtime.forPrincipal("user");
    const [offer] = port.offers();
    expect(offer).toBeDefined();

    enabled = "yes";
    expect(() => port.offers()).toThrow(
      `hcifootprint: enabled reader for binding '${connection.binding.bindingId}' returned string; expected boolean or undefined.`
    );
    expect(() => port.invoke(offer! as never)).toThrow(
      `binding '${connection.binding.bindingId}' no longer serves offers to principal 'user'`
    );
    // The same law holds for a snapshot read.
    expect(() => runtime.bindingFor(connection.binding)).toThrow(TypeError);
  });

  it("a malformed busy answer refuses offers() and retires the offer already out", () => {
    let busy: unknown;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("gen.busy-type"),
      {
        node: "orders",
        busy: () => busy as string | undefined,
      }
    );
    const port = runtime.forPrincipal("user");
    const [offer] = port.offers();
    expect(offer).toBeDefined();

    busy = 42;
    expect(() => port.offers()).toThrow(
      `hcifootprint: busy reader for binding '${connection.binding.bindingId}' returned number; expected string or undefined.`
    );
    expect(() => port.invoke(offer! as never)).toThrow(
      `binding '${connection.binding.bindingId}' no longer serves offers to principal 'user'`
    );
  });

  it("an enabled reader that moves its own binding is not offered on that mixed read", () => {
    let touchOnce = true;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("gen.enabled-moves"),
      {
        node: "orders",
        enabled: () => {
          if (touchOnce) {
            touchOnce = false;
            connection.touch();
          }
          return true;
        },
      }
    );
    const port = runtime.forPrincipal("user");
    expect(port.offers()).toEqual([]);
    // The next read sees one stable generation and offers it.
    expect(port.offers()).toHaveLength(1);
  });

  it("a busy change nobody announced retires EVERY principal’s offer from the old generation", async () => {
    let busy: string | undefined;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("gen.busy-silent"),
      {
        node: "orders",
        busy: () => busy,
      }
    );
    const [userOffer] = runtime.forPrincipal("user").offers();
    expect(userOffer).toBeDefined();

    busy = "saving";
    const [agentOffer] = runtime.forPrincipal("agent").offers();
    expect(agentOffer).toBeDefined();
    expect(agentOffer).not.toBe(userOffer);

    expect(() =>
      runtime.forPrincipal("user").invoke(userOffer! as never)
    ).toThrow(
      `hcifootprint: offer '${userOffer!.ref.offerId}' is stale and binding '${
        connection.binding.bindingId
      }' no longer serves offers to principal 'user'`
    );
    await expect(
      runtime.forPrincipal("agent").invoke(agentOffer! as never).whenInvoked
    ).resolves.toMatchObject({ status: "performed", produced: "ok" });
  });
});

describe("invoking an offer re-checks its generation", () => {
  function offered(busyReader: () => unknown) {
    let calls = 0;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("invoke.generation", () => {
        calls += 1;
        return "ok";
      }),
      { node: "orders", busy: busyReader as () => string | undefined }
    );
    const port = runtime.forPrincipal("user");
    const [offer] = port.offers();
    return {
      runtime,
      connection,
      port,
      offer: offer as ActionOffer,
      calls: () => calls,
    };
  }

  it("a busy change since the offer was minted refuses it and retires it", () => {
    let busy: string | undefined;
    const { runtime, connection, port, offer, calls } = offered(() => busy);
    busy = "saving";
    expect(() => port.invoke(offer as never)).toThrow(
      `hcifootprint: offer '${offer.ref.offerId}' does not select binding '${connection.binding.bindingId}'.`
    );
    expect(calls()).toBe(0);
    expect(runtime.transitions()).toEqual([]);
    expect(() => port.invoke(offer as never)).toThrow(
      "no longer serves offers"
    );
    // A fresh read re-offers the binding under its current facts.
    expect(port.offers()).toHaveLength(1);
  });

  it("a malformed busy answer at invoke time refuses it and retires it", () => {
    let busy: unknown;
    const { runtime, connection, port, offer, calls } = offered(() => busy);
    busy = 42;
    expect(() => port.invoke(offer as never)).toThrow(
      `hcifootprint: busy reader for binding '${connection.binding.bindingId}' returned number; expected string or undefined.`
    );
    expect(calls()).toBe(0);
    expect(runtime.transitions()).toEqual([]);
    busy = undefined;
    expect(() => port.invoke(offer as never)).toThrow(
      "no longer serves offers"
    );
  });
});

describe("a snapshot is taken from one stable generation, or not at all", () => {
  it("an enabled reader that disconnects its own binding leaves no row", () => {
    const runtime = createActionRuntime();
    const action = inputlessAction("snap.enabled-disconnects");
    const leaving = connectAction(runtime, action, {
      node: "orders",
      instance: "leaving",
      enabled: () => {
        leaving.disconnect();
        return true;
      },
    });
    const staying = connectAction(runtime, action, {
      node: "orders",
      instance: "staying",
    });
    const rows = runtime.bindings();
    expect(rows.map((row) => row.ref.instance)).toEqual(["staying"]);
    expect(runtime.bindingFor(leaving.binding)).toBeUndefined();
    expect(runtime.bindingFor(staying.binding)).toMatchObject({
      present: true,
    });
  });

  it("a busy reader that disconnects its own binding leaves no row", () => {
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("snap.busy-disconnects"),
      {
        node: "orders",
        busy: () => {
          connection.disconnect();
          return undefined;
        },
      }
    );
    expect(runtime.bindingFor(connection.binding)).toBeUndefined();
    expect(runtime.bindings()).toEqual([]);
  });

  it("a busy reader that moves its binding once is re-read against the successor", () => {
    let reads = 0;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("snap.busy-moves"),
      {
        node: "orders",
        busy: () => {
          reads += 1;
          if (reads === 1) {
            connection.touch();
            return "first-generation";
          }
          return "second-generation";
        },
      }
    );
    expect(runtime.bindingFor(connection.binding)?.busy).toBe(
      "second-generation"
    );
    expect(reads).toBe(2);
  });

  it("a reader that moves its binding on every read yields no snapshot after bounded retries", () => {
    let reads = 0;
    const runtime = createActionRuntime();
    const connection = connectAction(
      runtime,
      inputlessAction("snap.never-stable"),
      {
        node: "orders",
        enabled: () => {
          reads += 1;
          connection.touch();
          return true;
        },
      }
    );
    expect(runtime.bindingFor(connection.binding)).toBeUndefined();
    expect(reads).toBe(3);
  });
});

describe("settle.onReturn with declared progress", () => {
  it("a synchronous return hands back the progress channel, already closed", () => {
    const verdicts: unknown[] = [];
    const action = defineAction("return.progress", {
      does: "Write the record",
      invocation: "inputless",
      settle: {
        progress: { stages: ["written"] },
        onReturn: (outcome) => {
          verdicts.push(outcome.status);
          return undefined;
        },
      },
      mutate: (lifecycle) => {
        lifecycle?.reportProgress("written");
        return "done";
      },
    });
    const runtime = createActionRuntime();
    const connection = connectAction(runtime, action, { node: "records" });
    const invocation = connection.invoke();
    expect(verdicts).toEqual(["performed"]);
    expect(invocation.progress).toBeDefined();
    expect(invocation.progress!.snapshot()).toMatchObject({
      declared: ["written"],
      observed: [{ stage: "written" }],
    });
    expect(invocation.progress!.snapshot().disposition).not.toBe("open");
    expect(runtime.transitionFor(invocation.transition)).toMatchObject({
      invocationStatus: "performed",
      effectStatus: "unverified",
    });
  });
});
