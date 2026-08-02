/**
 * `input: 'none'` — the action that takes NO input, and can finally say so.
 *
 * Reported from a production integration: a uniform `{ value: string, required }`
 * contract forced the model to send `value: ""` to click-only controls, and
 * that empty string reached the handler and OVERRODE the app's authored default
 * — selecting nothing. The library had no way to be told "this control takes
 * nothing", so it could not refuse, and could not teach.
 *
 * Three properties, in the order they matter:
 * 1. the author can DECLARE it, at all three authoring doors;
 * 2. the model is TOLD before it guesses (`expects: 'none'`, everywhere
 *    `expects` is served);
 * 3. a payload that arrives anyway is REFUSED with the shape it sent — and a
 *    blank one is erased before it can reach the handler.
 *
 * Absence keeps meaning what it always meant: an action with no `input` at all
 * advertises nothing, because the library does not know its shape and never
 * guesses one. That distinction is the whole design.
 *
 * MUTATION PROOFS:
 * - 'a payload is refused' — accept it and the reported bug returns: the model's
 *   protocol residue reaches the handler and overrides the app's own default.
 * - 'a blank payload is erased' — forward it and `value: ''` is back at the
 *   handler under a different name.
 * - 'blank stops at THIS door' — apply the erasure to a schema-bearing action
 *   and clearing a field (a real, intended `''`) silently stops working.
 * - 'an explicit null still answers for its shape' — call null blank and a
 *   caller's deliberate value is swallowed without a word.
 * - 'the sentinel is read BEFORE detectSchema' — drop the check at any door and
 *   that door refuses the very declaration this feature exists to accept.
 * - 'the MCP no-params arm is untouched' — compile the sentinel to an empty
 *   JSON Schema instead of a flag and every tool descriptor's bytes change.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, edgesToMCPTools, serveToAgent } from '../src/index.js';
import type { InteractionSession, NavigationGraph } from '../src/index.js';

/** A wizard whose 'pick-a' is a click-only radio and whose 'search' takes a real input. */
function wizard(): NavigationGraph {
  return buildNavigationGraph('wizard', {
    pages: {
      setup: {
        actions: {
          'pick-a': { does: 'Pick option A', input: 'none' },
          search: {
            does: 'Search the recipe catalogue',
            input: { type: 'object', properties: { query: { type: 'string' } } },
          },
          undeclared: { does: 'An action whose input nobody declared' },
        },
      },
    },
  });
}

function wired(): { session: InteractionSession; seen: unknown[] } {
  const seen: unknown[] = [];
  const session = wizard().createSession({ node: 'setup', state: {}, onWarn: () => undefined });
  session.registerActions('setup', {
    handlers: {
      'pick-a': (payload) => {
        seen.push(payload);
      },
      search: (payload) => {
        seen.push(payload);
      },
      undeclared: (payload) => {
        seen.push(payload);
      },
    },
  });
  return { session, seen };
}

// ---------------------------------------------------------------------------
// Declaring it — all three authoring doors
// ---------------------------------------------------------------------------

describe("input: 'none' — the declaration", () => {
  it('compiles to a FLAG, leaving the schema undefined', () => {
    const spec = wizard().spec;
    expect(spec.affordances['setup.pick-a'].noInput).toBe(true);
    expect(spec.affordances['setup.pick-a'].schema).toBeUndefined();
  });

  it('leaves the MCP descriptor byte-identical to a tool with no schema at all', () => {
    // The reason it is a flag and not a synthetic empty JSON Schema: every
    // surface that branches on "no schema declared" must keep its old bytes.
    const graph = wizard();
    const session = graph.createSession({ node: 'setup', state: {}, onWarn: () => undefined });
    const tools = edgesToMCPTools(graph.spec, session.available().edges);
    const noInput = tools.find((tool) => tool.name === 'wizard.setup.pick-a')!;
    const undeclared = tools.find((tool) => tool.name === 'wizard.setup.undeclared')!;
    expect(noInput.inputSchema).toEqual(undeclared.inputSchema);
    expect(noInput.inputSchema).toEqual({ type: 'object', properties: {}, additionalProperties: false });
  });

  it('the fluent builder accepts it — and still refuses a schema it cannot recognize', () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        catalog: {},
      },
      actions: {
        like: { on: 'catalog', does: 'Like this product', binding: { kind: 'element', locator: { role: 'button', name: 'Like' } }, input: 'none' },
      },
    });
    expect(graph.spec.affordances['like'].noInput).toBe(true);

    expect(() =>
      buildNavigationGraph('shop', {
        pages: {
          catalog: {},
        },
        actions: {
          like: { on: 'catalog', does: 'Like it', binding: { kind: 'element', locator: { role: 'button', name: 'Like' } }, input: 42 },
        },
      }),
    ).toThrow(/unrecognized input schema/);
  });

  it('the navigation-graph compiler accepts it — and still refuses garbage', () => {
    expect(wizard().spec.affordances['setup.pick-a'].noInput).toBe(true);
    expect(() =>
      buildNavigationGraph('wizard', {
        pages: { setup: { actions: { pick: { does: 'Pick', input: 42 } } } },
      }),
    ).toThrow(/unrecognized input schema/);
  });

  it('the mount door accepts it — and still refuses garbage', () => {
    const graph = buildNavigationGraph('wizard', { pages: { setup: {} } });
    const session = graph.createSession({ node: 'setup', state: {}, onWarn: () => undefined });
    session.registerActions('setup', {
      actions: { 'pick-a': { does: 'Pick option A', input: 'none', handler: () => undefined } },
    });
    expect(session.available().edges.find((e) => e.affordanceId === 'setup.pick-a')?.expects).toBe('none');

    expect(() =>
      session.registerActions('setup', {
        actions: { bad: { does: 'Bad', input: 42, handler: () => undefined } },
      }),
    ).toThrow(/unrecognized input schema/);
  });
});

// ---------------------------------------------------------------------------
// Being told, before guessing
// ---------------------------------------------------------------------------

describe("input: 'none' — the model is told first", () => {
  it("serves the literal 'none' on the edge and in every result row", () => {
    const { session } = wired();
    const port = serveToAgent(session);

    expect(session.available().edges.find((e) => e.affordanceId === 'setup.pick-a')?.expects).toBe('none');
    const rows = port.call('wizard.whats_here', {})['actions'] as Array<Record<string, unknown>>;
    expect(rows.find((row) => row['action'] === 'setup.pick-a')?.['expects']).toBe('none');
  });

  it('an action that declared NO input still advertises nothing — absence is not "send nothing"', () => {
    const { session } = wired();
    const edge = session.available().edges.find((e) => e.affordanceId === 'setup.undeclared')!;
    expect(edge).not.toHaveProperty('expects');
  });
});

// ---------------------------------------------------------------------------
// The refusal, and the erasure
// ---------------------------------------------------------------------------

describe("input: 'none' — a payload sent anyway", () => {
  it('is refused with the shape it sent, in the arm every consumer already handles', () => {
    const { session, seen } = wired();
    const result = session.fire('setup.pick-a', { source: 'agent', payload: { value: '' } });

    expect(result).toEqual({
      ok: false,
      reason: 'PAYLOAD_INVALID',
      issues: 'this action takes no input — omit the payload (received { value: string })',
    });
    expect(seen).toEqual([]); // it never reached the handler, so it overrode nothing
  });

  it('lands a gap row like every other refused fire', () => {
    const { session } = wired();
    session.fire('setup.pick-a', { source: 'agent', payload: { value: 'x' } });
    expect(session.gaps().at(-1)).toMatchObject({
      kind: 'fire-rejected',
      affordanceId: 'setup.pick-a',
      rejectionReason: 'PAYLOAD_INVALID',
    });
  });

  it('teaches over the wire too, beside the contract it broke', () => {
    const { session } = wired();
    const port = serveToAgent(session);
    const result = port.call('wizard.do_action', { action: 'pick-a', input: { value: '' } });
    expect(result).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID', expects: 'none' });
    expect(String(result['issues'])).toContain('takes no input');
  });

  it('an explicit null is NOT blank — it still has to answer for its shape', () => {
    const { session } = wired();
    expect(session.fire('setup.pick-a', { source: 'agent', payload: null })).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
    });
  });
});

describe("input: 'none' — a BLANK payload is protocol residue, not intent", () => {
  it.each([
    ['nothing at all', undefined],
    ['an empty string', ''],
    ['an empty object', {}],
    ['an object of undefined-valued keys', { value: undefined }],
  ])('accepts %s, and forwards NOTHING to the handler', async (_label, payload) => {
    const { session, seen } = wired();
    const fired = session.fire('setup.pick-a', { source: 'agent', payload });
    expect(fired.ok).toBe(true);
    await Promise.resolve();
    expect(seen).toEqual([undefined]); // erased, never relayed
  });

  it('erases it from the RECORD as well — the trace carries no residue either', async () => {
    const { session } = wired();
    const withResidue = session.fire('setup.pick-a', { source: 'agent', payload: '' });
    const withNothing = session.fire('setup.pick-a', { source: 'agent' });
    if (!withResidue.ok || !withNothing.ok) throw new Error('refused');
    await Promise.resolve();

    const rowFor = (id: string) => session.transitions().find((row) => row.id === id);
    expect(rowFor(withResidue.transition.id)?.payload).toBeUndefined();
    // Indistinguishable from having sent nothing at all — which is what the
    // caller meant, and now what the trace says they did.
    expect(rowFor(withResidue.transition.id)?.payload).toEqual(rowFor(withNothing.transition.id)?.payload);
  });

  it('applies at THIS door only: a schema-bearing action keeps `` as a real value', async () => {
    // Clearing a field is a legitimate action. Erasing '' here would break it,
    // and the library would be guessing about a shape its author declared.
    const { session, seen } = wired();
    const fired = session.fire('setup.search', { source: 'agent', payload: { query: '' } });
    expect(fired.ok).toBe(true);
    await Promise.resolve();
    expect(seen).toEqual([{ query: '' }]);
  });

  it('…and an UNDECLARED-input action is untouched: the library cannot know, so it does not act', async () => {
    const { session, seen } = wired();
    session.fire('setup.undeclared', { source: 'agent', payload: { value: '' } });
    await Promise.resolve();
    expect(seen).toEqual([{ value: '' }]);
  });
});
