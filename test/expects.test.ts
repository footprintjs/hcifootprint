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
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildNavigationGraph, skillsAsTools } from '../src/index.js';
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
        tools: {
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
  session.registerToolGroup('browse', {
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

describe('expects — available() and the wire speak ONE contract', () => {
  it('serves the same value for every schema kind, on both surfaces', () => {
    const session = wired();
    const port = skillsAsTools(session);
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
    const rows = skillsAsTools(session).call('shop.whats_here', {})['actions'] as Array<Record<string, unknown>>;
    expect(rows.find((row) => row['action'] === 'browse.share')).not.toHaveProperty('expects');
  });

  it('the live validator stays in-process — a served result never carries one', () => {
    const session = wired();
    // The edge keeps it (that is the in-process convenience)…
    expect(typeof (edgeFor(session, 'filter').schema as { safeParse?: unknown })?.safeParse).toBe('function');
    // …and every result the wire builds survives being serialized.
    const port = skillsAsTools(session);
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
    const port = skillsAsTools(session);
    const result = port.call('shop.do_action', { action: 'search', input: { wrong: 'key' } });
    expect(result).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID' });
    expect(result['expects']).toEqual(JSON_SCHEMA);
  });
});

// ---------------------------------------------------------------------------
// The derivation itself
// ---------------------------------------------------------------------------

describe('expects — the shared helper', () => {
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
});
