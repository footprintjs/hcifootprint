/**
 * P0-3 — the input contract, advertised BEFORE the fire and enforced AT it.
 *
 * The reported bug: an action declared `{value: string}` in plain JSON Schema,
 * the planner sent `{name: 'add milk'}`, and nothing anywhere said no. The
 * declaration reached Mode A's tool schemas but never the do_action caller, and
 * fire() waved plain JSON Schema through unvalidated — so the handler
 * destructured undefined and the app carried on with a hole in it. Both halves
 * are fixed here: the shape is visible up front (`expects` on every action row)
 * and a wrong shape comes back as PAYLOAD_INVALID carrying what was expected.
 *
 * MUTATION PROOFS (these fail against the pre-change library, not merely on new
 * fields):
 * - 'refuses the planner’s guessed key' — 0.3.0 returned ok:true and ran the
 *   handler with a payload it could not read.
 * - 'records a fire-rejected gap row' — that row was unreachable for a plain
 *   JSON Schema, because the rejection it belongs to could not happen.
 * - 'whats_here carries the input contract' — action rows had no expects at all.
 * - 'the teach loop closes' — the whole POC failure, end to end.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { skillGraph, skillsAsTools } from '../src/index.js';
import type { Binding, FireResult, SkillGraph, TransitionRecord } from '../src/index.js';
import { describeExpectedShape } from '../src/traverse/payload-shape.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** The reported declaration: the handler reads {value}; the planner guessed {name}. */
const VALUE_SCHEMA = {
  type: 'object',
  properties: { value: { type: 'string', description: 'the task text' } },
  required: ['value'],
};

const TAUGHT_ISSUES = "missing required 'value' — expected { value: string }, received { name: string }";

function tasks(): SkillGraph {
  return skillGraph('tasks', { description: 'A task list' })
    .page('list', { route: '/tasks' })
    .affordance('add-task', {
      on: 'list',
      description: 'Add a task to the list',
      binding,
      effect: { writes: ['taskCount'] },
      schema: VALUE_SCHEMA,
    })
    .affordance('clear-done', {
      on: 'list',
      description: 'Clear the completed tasks',
      binding,
      effect: { writes: ['taskCount'] }, // declares writes, declares NO input
    })
    .affordance('search', {
      on: 'list',
      description: 'Search the list',
      binding,
      schema: z.object({ query: z.string() }),
    })
    .affordance('rename', {
      on: 'list',
      description: 'Rename a task',
      binding,
      // A non-serializable validator (yup/superstruct shape) — 'parseable'.
      schema: {
        safeParse: (value: unknown) =>
          typeof value === 'object' && value !== null && 'id' in (value as object)
            ? { success: true }
            : { success: false, error: 'id is required' },
      },
    })
    .build();
}

/** A session with the app's side wired, and the handler's payloads recorded. */
function wiredSession(options?: { checkPayloadShape?: boolean }) {
  const session = tasks().createSession({
    node: 'list',
    state: { taskCount: 0 },
    ...(options ?? {}),
  });
  const seen: unknown[] = [];
  session.registerTools({
    group: 'app',
    tools: {
      'add-task': (payload) => {
        seen.push(payload);
      },
      'clear-done': () => undefined,
      search: () => undefined,
      rename: () => undefined,
    },
  });
  return { session, seen };
}

/** Narrow a FireResult to its success arm (throws loudly on a refusal). */
function fired(result: FireResult): Extract<FireResult, { ok: true }> {
  if (!result.ok) throw new Error(`fire was refused: ${result.reason}`);
  return result;
}

/**
 * Only the rows a FIRE created. The trace also carries world motion the app
 * reports (a registration's coalesced structure-swap, a router sync), which is
 * nobody's fire and must not be counted as one.
 */
function firedRows(session: ReturnType<typeof wiredSession>['session']): TransitionRecord[] {
  return session.transitions().filter((row) => row.cause.kind === 'fired');
}

// ---------------------------------------------------------------------------
// fire() — the door
// ---------------------------------------------------------------------------

describe('a plain JSON Schema is enforced at fire time', () => {
  it('refuses the planner’s guessed key, and the refusal teaches the right one', () => {
    const { session, seen } = wiredSession();
    const result = session.fire('add-task', { source: 'agent', payload: { name: 'add milk' } });
    expect(result).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID', issues: TAUGHT_ISSUES });
    // Refused means REFUSED: the app was never asked to do the wrong thing.
    expect(seen).toEqual([]);
    expect(firedRows(session)).toEqual([]);
  });

  it('records a fire-rejected gap row — unmet demand the app team can triage', () => {
    const { session } = wiredSession();
    session.fire('add-task', { source: 'agent', payload: { name: 'add milk' } });
    const gaps = session.gaps();
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      kind: 'fire-rejected',
      rejectionReason: 'PAYLOAD_INVALID',
      affordanceId: 'add-task',
      principal: 'agent',
      node: 'list',
    });
  });

  it('lets the right payload through untouched', async () => {
    const { session, seen } = wiredSession();
    expect(session.fire('add-task', { source: 'agent', payload: { value: 'add milk' } }).ok).toBe(true);
    await flush();
    expect(seen).toEqual([{ value: 'add milk' }]);
  });

  it('judges only the shape — an extra key is the app’s business, not ours', () => {
    const { session } = wiredSession();
    const result = session.fire('add-task', { source: 'agent', payload: { value: 'milk', at: 'today' } });
    expect(result.ok).toBe(true);
  });
});

describe('checkPayloadShape: false — the 0.3.0 pass-through, byte for byte', () => {
  it('accepts the wrong payload and hands it to the handler, exactly as before', async () => {
    const { session, seen } = wiredSession({ checkPayloadShape: false });
    const result = session.fire('add-task', { source: 'agent', payload: { name: 'add milk' } });
    expect(result.ok).toBe(true);
    expect(session.gaps()).toEqual([]);
    await flush();
    expect(seen).toEqual([{ name: 'add milk' }]);
  });

  it('still runs a zod validator — the flag governs the JSON-Schema branch alone', () => {
    const { session } = wiredSession({ checkPayloadShape: false });
    expect(session.fire('search', { source: 'agent', payload: { query: 7 } })).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
    });
    expect(session.fire('search', { source: 'agent', payload: { query: 'silk' } }).ok).toBe(true);
  });
});

describe('the validators that already worked keep working', () => {
  it('zod still speaks for itself', () => {
    const { session } = wiredSession();
    const refused = session.fire('search', { source: 'agent', payload: { query: 7 } });
    expect(refused).toMatchObject({ ok: false, reason: 'PAYLOAD_INVALID' });
    // Zod's own message, not ours — we never re-describe what a validator said.
    expect(refused.ok === false && 'issues' in refused && refused.issues).not.toContain('expected {');
    expect(session.fire('search', { source: 'agent', payload: { query: 'silk' } }).ok).toBe(true);
  });

  it('a parseable validator still speaks for itself', () => {
    const { session } = wiredSession();
    expect(session.fire('rename', { source: 'agent', payload: {} })).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
      issues: expect.stringContaining('id is required'),
    });
    expect(session.fire('rename', { source: 'agent', payload: { id: 't1' } }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mode B — the contract the planner reads
// ---------------------------------------------------------------------------

describe('whats_here carries the input contract, before anything is fired', () => {
  function actionRows() {
    const { session } = wiredSession();
    const here = skillsAsTools(session).call('tasks.whats_here');
    return new Map(
      (here['actions'] as Array<Record<string, unknown>>).map((row) => [row['action'] as string, row]),
    );
  }

  it('renders a JSON-Schema declaration as data', () => {
    expect(actionRows().get('add-task')?.['expects']).toEqual(VALUE_SCHEMA);
  });

  it('renders a zod declaration through footprint’s converter', () => {
    const expects = actionRows().get('search')?.['expects'] as { type: string; properties: Record<string, { type: string }> };
    expect(expects.type).toBe('object');
    expect(expects.properties['query']?.type).toBe('string');
  });

  it('says plainly that a non-serializable validator is checked at fire time', () => {
    expect(actionRows().get('rename')?.['expects']).toBe('validated at fire time (non-serializable validator)');
  });

  it('omits expects entirely for an action that declares no input (honest absence)', () => {
    const row = actionRows().get('clear-done');
    expect(row?.['does']).toBe('Clear the completed tasks'); // the row is really there…
    expect(row).not.toHaveProperty('expects'); // …and says nothing it does not know
  });

  it('points the model at expects from the static tool schema', () => {
    const { session } = wiredSession();
    const doAction = skillsAsTools(session)
      .tools()
      .find((tool) => tool.name === 'tasks.do_action');
    const input = (doAction?.inputSchema as { properties: Record<string, { description: string }> }).properties[
      'input'
    ];
    expect(input?.description).toContain('expects');
    expect(input?.description).toContain('PAYLOAD_INVALID');
  });
});

describe('do_action teaches the shape it advertised', () => {
  it('answers a wrong input with issues AND expects — the same shape, said twice', () => {
    const { session, seen } = wiredSession();
    const result = skillsAsTools(session).call('tasks.do_action', {
      action: 'add-task',
      input: { name: 'add milk' },
    });
    expect(result).toMatchObject({ ok: false, judgment: 'rejected', reason: 'PAYLOAD_INVALID' });
    expect(result['issues']).toBe(TAUGHT_ISSUES);
    expect(result['expects']).toEqual(VALUE_SCHEMA);
    // The teach loop's hinge: what the rejection says the shape is, rendered
    // from what the advertisement carries, is the SAME string — a planner
    // correcting from either one lands in the same place.
    expect(result['issues']).toContain(`expected ${describeExpectedShape(result['expects'])},`);
    expect(seen).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The reported failure, end to end, on layer 1's settlement machinery
// ---------------------------------------------------------------------------

describe('the teach loop closes', () => {
  it('guessed key → taught → corrected → performed', async () => {
    const { session, seen } = wiredSession();
    const port = skillsAsTools(session);

    // 1. The agent guesses, the way the reported one did.
    const guessed = port.call('tasks.do_action', { action: 'add-task', input: { name: 'add milk' } });
    expect(guessed['ok']).toBe(false);
    expect(guessed['issues']).toBe(TAUGHT_ISSUES);

    // 2. It corrects from the message alone — no new tool, no schema round trip.
    const corrected = fired(session.fire('add-task', { source: 'agent', payload: { value: 'add milk' } }));
    expect(corrected.settlement).toBe('awaiting-state');
    expect(corrected.effectStatus).toBe('pending'); // queued, not done (layer 1)

    // 3. The app's side really receives the shape it declared.
    await flush();
    expect(seen).toEqual([{ value: 'add milk' }]);

    // 4. The app reports the write, and the fire comes to rest as performed.
    session.updateState({ taskCount: 1 });
    const settled = await corrected.whenSettled;
    expect(settled.effectStatus).toBe('performed');
    expect(settled.outcome).toBe('committed');
    expect(settled.transition.effectVerified).toBe(true);
    // One refusal, one fire: the guess never entered the trace, only the ledger.
    expect(firedRows(session).map((row) => row.id)).toEqual([corrected.transition.id]);
    expect(session.gaps()).toHaveLength(1);
  });
});
