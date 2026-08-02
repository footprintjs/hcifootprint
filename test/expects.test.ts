/**
 * `expects` — ONE input contract, served on every surface that shows one.
 *
 * Mode B's results have always carried it. `available()` carried only the raw
 * `schema` — a live validator, useful in-process and unusable over a wire — so
 * a consumer driving the port directly re-derived the rules by hand: which
 * schema kinds serialize, which decline, what a non-serializable validator
 * should say. That is library law duplicated at a consumer, which is drift by
 * construction, and it is exactly where the field found it.
 *
 * PARITY, not documented asymmetry. whats_here rows, readySteps rows, MCP
 * inputSchema and available() must speak one contract, or the same edge teaches
 * two shapes. The residual asymmetry that REMAINS is stated rather than hidden:
 * available() serves BOTH the live validator and the wire contract; a served
 * result carries only the wire contract. A live validator never crosses the
 * wire — that is the firewall, not an oversight.
 *
 * MUTATION PROOFS:
 * - 'available() and whats_here agree' — let either derive its own and the field
 *   report's hand-rolled duplication is back inside the library.
 * - 'the wire never carries the live validator' — serve `schema` in a result and
 *   a zod object crosses a tool boundary as `{}`.
 * - 'absence stays absent' — invent an empty contract for an undeclared input
 *   and the library starts guessing a shape its author never wrote.
 * - 'the rendered form is cached by identity' — recompute per call and every
 *   refused fire re-normalizes a zod schema, on the hottest path there is.
 * - 'a cached contract is frozen' — hand out a mutable shared object and one
 *   consumer's edit rewrites what every later caller is told.
 * - 'a self-referential schema is walked ONCE' — drop the cycle guard and
 *   available() dies with a RangeError on a schema the compiler accepted: the
 *   ordinary way to describe a tree took down the hot path every refused fire
 *   uses for its gap row.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import { expectsOf } from '../src/traverse/expects.js';
import type { AvailableEdge, InteractionSession, NavigationGraph } from '../src/index.js';

const JSON_SCHEMA = {
  type: 'object',
  properties: { query: { type: 'string' } },
  required: ['query'],
} as const;

/** A validator that parses but cannot be serialized — the 'parseable' class. */
const OPAQUE = { parse: (value: unknown) => value };

function catalogue(): NavigationGraph {
  return buildNavigationGraph('shop', {
    pages: {
      browse: {
        actions: {
          search: { does: 'Search the catalogue', input: JSON_SCHEMA },
          filter: { does: 'Filter by size', input: z.object({ size: z.string() }) },
          rename: { does: 'Rename the saved search', input: OPAQUE },
          like: { does: 'Like this product', input: 'none' },
          share: { does: 'Share this product' }, // nothing declared
        },
      },
    },
  });
}

function wired(): InteractionSession {
  const session = catalogue().createSession({ node: 'browse', state: {}, onWarn: () => undefined });
  session.registerActions('browse', {
    handlers: {
      search: () => undefined,
      filter: () => undefined,
      rename: () => undefined,
      like: () => undefined,
      share: () => undefined,
    },
  });
  return session;
}

const edgeFor = (session: InteractionSession, id: string): AvailableEdge =>
  session.available().edges.find((edge) => edge.affordanceId === `browse.${id}`)!;

// ---------------------------------------------------------------------------
// Parity
// ---------------------------------------------------------------------------

describe('the input an action asks for reads the same on the row and on the wire', () => {
  it('serves the same value for every schema kind, on both surfaces', () => {
    const session = wired();
    const port = serveToAgent(session);
    const rows = new Map(
      (port.call('shop.whats_here', {})['actions'] as Array<Record<string, unknown>>).map((row) => [
        row['action'],
        row,
      ]),
    );

    for (const id of ['search', 'filter', 'rename', 'like']) {
      expect(edgeFor(session, id).expects).toEqual(rows.get(`browse.${id}`)?.['expects']);
    }
  });

  it('renders each kind the way the wire needs it', () => {
    const session = wired();
    expect(edgeFor(session, 'search').expects).toEqual(JSON_SCHEMA); // a detached clone
    expect(edgeFor(session, 'search').expects).not.toBe(JSON_SCHEMA); // …never the spec's own object
    expect(edgeFor(session, 'filter').expects).toMatchObject({ type: 'object' }); // zod, normalized
    expect(edgeFor(session, 'rename').expects).toBe('validated at fire time (non-serializable validator)');
    expect(edgeFor(session, 'like').expects).toBe('none');
  });

  it('an UNDECLARED input advertises nothing, on both surfaces', () => {
    const session = wired();
    expect(edgeFor(session, 'share')).not.toHaveProperty('expects');
    const rows = serveToAgent(session).call('shop.whats_here', {})['actions'] as Array<Record<string, unknown>>;
    expect(rows.find((row) => row['action'] === 'browse.share')).not.toHaveProperty('expects');
  });

  it('the live validator stays in-process — a served result never carries one', () => {
    const session = wired();
    // The edge keeps it (that is the in-process convenience)…
    expect(typeof (edgeFor(session, 'filter').schema as { safeParse?: unknown })?.safeParse).toBe('function');
    // …and every result the wire builds survives being serialized.
    const port = serveToAgent(session);
    for (const call of [
      () => port.call('shop.whats_here', {}),
      () => port.call('shop.do_action', { action: 'filter', input: { size: 'M' } }),
    ]) {
      const result = call();
      expect(JSON.stringify(result)).not.toContain('safeParse');
      expect(() => structuredClone(result)).not.toThrow();
    }
  });

  it('rides the PAYLOAD_INVALID refusal too — the shape said twice, once as data', () => {
    const session = wired();
    const port = serveToAgent(session);
    const result = port.call('shop.do_action', { action: 'search', input: { wrong: 'key' } });
    expect(result).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID' });
    expect(result['expects']).toEqual(JSON_SCHEMA);
  });
});

// ---------------------------------------------------------------------------
// The derivation itself
// ---------------------------------------------------------------------------

describe('ONE computation feeds both channels, so they cannot drift apart', () => {
  it('caches by schema identity, so the hot path never re-normalizes', () => {
    const schema = z.object({ size: z.string() });
    const first = expectsOf({ schema });
    expect(expectsOf({ schema })).toBe(first); // the same object, not merely equal
  });

  it('hands out a FROZEN contract — one shared answer nobody can rewrite', () => {
    const rendered = expectsOf({ schema: { type: 'object', properties: {} } }) as Record<string, unknown>;
    expect(Object.isFrozen(rendered)).toBe(true);
    expect(() => {
      rendered['type'] = 'tampered';
    }).toThrow();
  });

  it("the flag wins over any schema — 'none' is the author's own word", () => {
    expect(expectsOf({ noInput: true })).toBe('none');
    expect(expectsOf({})).toBeUndefined();
    expect(expectsOf(undefined)).toBeUndefined();
  });

  it('a schema that is not a thing at all still gets an ANSWER, not a crash', () => {
    // The cache is a WeakMap, so only an object or a function can key it. A spec
    // built by hand — or parsed out of JSON — can still carry a primitive where
    // a schema belongs, and the honest move is to answer for it (the sentence
    // that says a live validator cannot cross the wire) rather than to throw on
    // the hot path every refused fire walks. It skips the CACHE, never the
    // ANSWER.
    const sentence = 'validated at fire time (non-serializable validator)';
    expect(expectsOf({ schema: 'not-a-schema' })).toBe(sentence);
    expect(expectsOf({ schema: 42 })).toBe(sentence);
    expect(expectsOf({ schema: true })).toBe(sentence);
    // …and asking twice is stable, which is the whole point of the answer being
    // a constant rather than something the cache was holding.
    expect(expectsOf({ schema: 'not-a-schema' })).toBe(expectsOf({ schema: 'not-a-schema' }));
  });

  it('walks a SELF-REFERENTIAL schema once — a tree is not a stack overflow', () => {
    // The ordinary JSON Schema way to say "a tree": a node whose child is the
    // node. The compiler accepts it (a schema is a live reference there, never
    // walked), so the walk had to survive it too.
    const tree: Record<string, unknown> = { type: 'object', properties: {} };
    (tree['properties'] as Record<string, unknown>)['child'] = tree;

    const rendered = expectsOf({ schema: tree }) as Record<string, unknown>;
    expect(Object.isFrozen(rendered)).toBe(true);
    // Frozen ALL THE WAY DOWN, cycle included — the guard stops the walk, it
    // does not exempt the node from the discipline.
    const properties = rendered['properties'] as Record<string, unknown>;
    expect(Object.isFrozen(properties)).toBe(true);
    expect(Object.isFrozen(properties['child'])).toBe(true);
  });

  it('…and so does available(), the hot path a cyclic schema used to kill', () => {
    const tree: Record<string, unknown> = { type: 'object', properties: {} };
    (tree['properties'] as Record<string, unknown>)['child'] = tree;
    const session = buildNavigationGraph('tree', {
      pages: { editor: { actions: { move: { does: 'Move a node', input: tree } } } },
    }).createSession({ node: 'editor', state: {}, onWarn: () => undefined });

    expect(() => session.available()).not.toThrow();
    expect(session.available().edges).toHaveLength(1);
  });
});
