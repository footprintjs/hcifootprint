import { describe, expect, it, vi } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { JourneyToolsOptions, ServeResult } from '../src/index.js';
import { readFileSync } from 'node:fs';

type Row = Record<string, unknown>;
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');
const actionsOf = (result: ServeResult) => result.actions as Row[];
const projectionOf = (result: ServeResult) => result.actionProjection as Row;
const cursorOf = (result: ServeResult) => projectionOf(result).nextCursor as string;

function fixture() {
  const graph = buildNavigationGraph('list', {
    pages: {
      page: { actions: {
        a: { does: 'Continue' }, b: { does: 'Continue' },
        c: { does: 'Continue' }, d: { does: 'Continue' },
      } },
      other: {},
    },
  });
  const session = graph.createSession({ state: { ready: true }, onWarn: () => undefined });
  const group = session.registerActions('page', {
    handlers: { a: () => undefined, b: () => undefined, c: () => undefined, d: () => undefined },
  });
  const full = actionsOf(serveToAgent(session).call('list.whats_here'));
  const maxBytes = bytes([full[0]]);
  const port = serveToAgent(session, { actionProjection: { maxBytes } });
  return { session, group, full, maxBytes, port };
}

describe('bounded complete action rows', () => {
  it('continues in existing order with exact array bytes, counts, and fixed tools', () => {
    const { port, full, maxBytes } = fixture();
    const tools = JSON.stringify(port.tools());
    const collected: Row[] = [];
    let cursor: string | undefined;
    do {
      const page = port.call('list.whats_here', cursor === undefined ? {} : { actionCursor: cursor });
      expect(page.ok).toBe(true);
      const actions = actionsOf(page);
      expect(actions).toHaveLength(1);
      const projection = projectionOf(page);
      expect(projection.bytes).toBe(bytes(actions));
      expect(projection.bytes).toBeLessThanOrEqual(maxBytes);
      expect(projection).toMatchObject({ total: 4, offset: collected.length, shown: 1, omitted: 3 - collected.length });
      expect(projection.means).toContain('Other result fields are outside this budget');
      collected.push(...actions);
      cursor = projection.nextCursor as string | undefined;
    } while (cursor !== undefined);
    expect(collected).toEqual(full);
    expect(JSON.stringify(port.tools())).toBe(tools);
  });

  it('includes brackets and commas and measures Unicode JSON as UTF-8', () => {
    const graph = buildNavigationGraph('unicode', { pages: { page: { actions: {
      a: { does: 'Å界🧭\n"\\\ud800' }, b: { does: 'Å界🧭\n"\\\ud800' }, c: { does: 'Å界🧭\n"\\\ud800' },
    } } } });
    const session = graph.createSession();
    const full = actionsOf(serveToAgent(session).call('unicode.whats_here'));
    const maxBytes = bytes(full.slice(0, 2));
    expect(maxBytes).toBeGreaterThan(JSON.stringify(full.slice(0, 2)).length);
    const port = serveToAgent(session, { actionProjection: { maxBytes } });
    const first = port.call('unicode.whats_here');
    expect(actionsOf(first)).toEqual(full.slice(0, 2));
    expect(projectionOf(first).bytes).toBe(maxBytes);
    expect(actionsOf(port.call('unicode.whats_here', { actionCursor: cursorOf(first) }))).toEqual(full.slice(2));
  });

  it('handles an empty list at the minimum budget without a continuation', () => {
    const graph = buildNavigationGraph('empty', { pages: { page: {} } });
    const port = serveToAgent(graph.createSession(), { actionProjection: { maxBytes: 2 } });
    expect(port.call('empty.whats_here')).toMatchObject({
      ok: true, actions: [], actionProjection: { maxBytes: 2, bytes: 2, total: 0, offset: 0, shown: 0, omitted: 0 },
    });
    expect(projectionOf(port.call('empty.whats_here'))).not.toHaveProperty('nextCursor');
  });

  it('refuses an oversized complete row with the exact required budget and a usable correction', () => {
    const { session, full, maxBytes } = fixture();
    const port = serveToAgent(session, { actionProjection: { maxBytes: maxBytes - 1 } });
    const refused = port.call('list.whats_here');
    expect(refused).toMatchObject({ ok: false, reason: 'ACTION_ROW_TOO_LARGE', action: 'page.a', requiredBytes: bytes([full[0]]) });
    expect(refused.why).toContain('actionProjection.maxBytes');
    expect(refused).not.toHaveProperty('actions');
    expect(refused).not.toHaveProperty('actionProjection');
    const corrected = serveToAgent(session, { actionProjection: { maxBytes: refused.requiredBytes as number } });
    expect(actionsOf(corrected.call('list.whats_here'))).toEqual([full[0]]);
    expect(session.transitions()).toHaveLength(0);
  });

  it('can return an earlier page before teaching about a later oversized row', () => {
    const graph = buildNavigationGraph('large', { pages: { page: { actions: {
      a: { does: 'Small' }, b: { does: 'Large '.repeat(100) },
    } } } });
    const session = graph.createSession();
    const full = actionsOf(serveToAgent(session).call('large.whats_here'));
    const port = serveToAgent(session, { actionProjection: { maxBytes: bytes([full[0]]) } });
    const first = port.call('large.whats_here');
    expect(actionsOf(first)).toEqual([full[0]]);
    expect(port.call('large.whats_here', { actionCursor: cursorOf(first) })).toMatchObject({
      ok: false, reason: 'ACTION_ROW_TOO_LARGE', action: 'page.b', requiredBytes: bytes([full[1]]),
    });
  });

  it('never removes guard, consent, input, materialization, or live facts from an included row', () => {
    const graph = buildNavigationGraph('contracts', { pages: { page: { actions: {
      pay: {
        does: 'Pay', confirm: true, when: { unknown: { eq: true } }, enabledWhen: { ready: { eq: true } },
        blockedBecause: { says: 'Review this order', clearedBy: 'user' },
        humanDecides: { doneWhen: { decided: { eq: true } } }, input: { type: 'object', required: ['amount'] },
      },
    } } } });
    const session = graph.createSession({ state: { ready: false, decided: false }, requireHumanApproval: true,
      freshness: { positionChanges: 'refuse' }, onWarn: () => undefined });
    const group = session.registerActions('page', { handlers: { pay: () => undefined }, busy: { pay: 'Reviewing…' }, holds: { pay: () => ({ amount: 12 }) } });
    const full = actionsOf(serveToAgent(session).call('contracts.whats_here'));
    const port = serveToAgent(session, { actionProjection: { maxBytes: bytes(full) } });
    const bounded = actionsOf(port.call('contracts.whats_here'));
    expect(bounded).toEqual(full);
    expect(bounded[0]).toMatchObject({ highEffect: true, humanDecides: true, guardUnevaluated: ['unknown'],
      enabled: false, blockedBecause: { says: 'Review this order', clearedBy: 'user' }, busy: 'Reviewing…',
      holds: { amount: 12 }, expects: { type: 'object', required: ['amount'] }, offerId: expect.any(String) });
    expect(port.call('contracts.do_action', { action: 'page.pay', confirm: true, input: { amount: 12 } })).toMatchObject({ reason: 'TOOL_DISABLED' });
    group.setEnabled('pay', true);
    session.updateState({ ready: true });
    const current = actionsOf(port.call('contracts.whats_here'))[0];
    expect(port.call('contracts.do_action', { action: 'page.pay', offerId: current.offerId,
      confirm: true, input: { amount: 12 } })).toMatchObject({ reason: 'APPROVAL_REQUIRED' });
    expect(session.transitions()).toHaveLength(1); // state stimulus only; payment never fired
  });

  it('records stale stamps only for rows actually included, not omitted rows', () => {
    const graph = buildNavigationGraph('stamps', { pages: { page: { actions: {
      a: { does: 'Continue', writes: ['value'] }, b: { does: 'Continue', writes: ['value'] },
    } } } });
    const session = graph.createSession({ state: { value: 0 } });
    session.updateState({ value: 1 }, { principal: 'user' });
    const port = serveToAgent(session, { actionProjection: { maxBytes: 110 } });
    const first = port.call('stamps.whats_here');
    expect(actionsOf(first)).toHaveLength(1);
    expect(actionsOf(first)[0].staleWrites).toEqual(['value']);
    expect(session.carriedStale('page.a')).toEqual(['value']);
    expect(session.carriedStale('page.b')).toEqual([]);
    expect(actionsOf(port.call('stamps.whats_here', { actionCursor: cursorOf(first) }))).toHaveLength(1);
    expect(session.carriedStale('page.b')).toEqual(['value']);
  });

  it('continues after its own stale disclosures with enforced offer citations and preserves their gates', async () => {
    const graph = buildNavigationGraph('fresh', { pages: { page: { actions: {
      a: { does: 'Continue', writes: ['value'] }, b: { does: 'Continue', writes: ['value'] },
      c: { does: 'Continue', writes: ['value'] },
    } } } });
    const session = graph.createSession({ state: { value: 0 },
      freshness: { positionChanges: 'refuse', writeChanges: 'refuse' } });
    let calls = 0;
    const handler = () => { calls += 1; session.updateState({ value: 2 }); };
    session.registerActions('page', { handlers: { a: handler, b: handler, c: handler } });
    session.updateState({ value: 1 }, { principal: 'user' });
    const port = serveToAgent(session, { actionProjection: { maxBytes: 165 } });
    const first = port.call('fresh.whats_here');
    expect(first.ok).toBe(true);
    const collected = [...actionsOf(first)];
    expect(collected.length).toBeLessThan(3);
    expect(session.carriedStale('page.c')).toEqual([]);
    let next = cursorOf(first);
    while (next !== undefined) {
      const page = port.call('fresh.whats_here', { actionCursor: next });
      expect(page.ok).toBe(true);
      collected.push(...actionsOf(page));
      next = cursorOf(page);
    }
    expect(collected.map((row) => row.action)).toEqual(['page.a', 'page.b', 'page.c']);
    expect(collected.every((row) => row.offerId !== undefined)).toBe(true);
    expect(session.version).toBe(1); // disclosure bookkeeping never moved the world
    const fired = port.call('fresh.do_action', { action: collected[0].action, offerId: collected[0].offerId });
    expect(fired.ok).toBe(true);
    await session.settlementOf(fired.transitionId as string);
    expect(calls).toBe(1); // original, pre-disclosure citation is still usable
    expect(port.call('fresh.do_action', { action: collected[1].action, offerId: collected[1].offerId })).toMatchObject({
      ok: false, reason: 'WORLD_MOVED',
    });
    expect(calls).toBe(1);
  });
});

describe('continuations refer to one unchanged read on one port', () => {
  it('rejects cursors from independently loaded package copies, as during hot reload', async () => {
    vi.resetModules();
    const firstModule = await import('../src/index.js');
    vi.resetModules();
    const secondModule = await import('../src/index.js');
    expect(firstModule.serveToAgent).not.toBe(secondModule.serveToAgent);
    const spec = { pages: { page: { actions: {
      a: { does: 'Continue' }, b: { does: 'Continue' },
    } } } };
    const firstSession = firstModule.buildNavigationGraph('copy', spec).createSession();
    const secondSession = secondModule.buildNavigationGraph('copy', spec).createSession();
    const row = actionsOf(firstModule.serveToAgent(firstSession).call('copy.whats_here'))[0];
    const firstPort = firstModule.serveToAgent(firstSession, { actionProjection: { maxBytes: bytes([row]) } });
    const secondPort = secondModule.serveToAgent(secondSession, { actionProjection: { maxBytes: bytes([row]) } });
    const firstCursor = cursorOf(firstPort.call('copy.whats_here'));
    const secondCursor = cursorOf(secondPort.call('copy.whats_here'));
    expect(firstCursor).not.toBe(secondCursor);
    expect(secondPort.call('copy.whats_here', { actionCursor: firstCursor })).toMatchObject({ reason: 'ACTION_CURSOR_INVALID' });
    expect(firstPort.call('copy.whats_here', { actionCursor: secondCursor })).toMatchObject({ reason: 'ACTION_CURSOR_INVALID' });
    expect(actionsOf(secondPort.call('copy.whats_here', { actionCursor: secondCursor }))[0].action).toBe('page.b');
  });

  for (const change of ['state', 'position', 'enabled', 'busy', 'registration'] as const) {
    it(`refuses a continuation after ${change} changes`, () => {
      const { session, group, port } = fixture();
      const first = port.call('list.whats_here');
      if (change === 'state') session.updateState({ ready: false });
      if (change === 'position') session.sync('other');
      if (change === 'enabled') group.setEnabled('a', false);
      if (change === 'busy') group.setBusy('a', 'Working');
      if (change === 'registration') group.unregister();
      expect(port.call('list.whats_here', { actionCursor: cursorOf(first) })).toMatchObject({ ok: false, reason: 'ACTION_CURSOR_STALE' });
    });
  }

  it('detects full live row changes that do not move a session version', () => {
    let value = 'one';
    const { session, maxBytes } = fixture();
    session.declareHolds('page.d', () => value);
    const port = serveToAgent(session, { actionProjection: { maxBytes } });
    const first = port.call('list.whats_here');
    const before = session.version;
    value = 'two';
    expect(session.version).toBe(before);
    expect(port.call('list.whats_here', { actionCursor: cursorOf(first) })).toMatchObject({ reason: 'ACTION_CURSOR_STALE' });
  });

  it('detects session motion during a live read and never emits a cursor for mixed facts', () => {
    const { session, maxBytes } = fixture();
    let value = 1;
    session.declareHolds('page.a', () => { session.updateState({ reading: value++ }); return ''; });
    const port = serveToAgent(session, { actionProjection: { maxBytes } });
    expect(port.call('list.whats_here')).toMatchObject({ ok: false, reason: 'ACTION_CURSOR_STALE' });
  });

  it('binds history scope to a continuation and inherits it when only the cursor is sent', () => {
    const { port, session } = fixture();
    session.updateState({ ready: false });
    const first = port.call('list.whats_here', { sinceVersion: 0 });
    expect(port.call('list.whats_here', { actionCursor: cursorOf(first), sinceVersion: 1 })).toMatchObject({ reason: 'ACTION_PROJECTION_ARGUMENTS_INVALID' });
    const sameScope = port.call('list.whats_here', { actionCursor: cursorOf(first), sinceVersion: 0 });
    expect(sameScope.ok).toBe(true);
    const next = port.call('list.whats_here', { actionCursor: cursorOf(sameScope) });
    expect(next.ok).toBe(true);
    expect(next.brief).toContain('Since version 0');
  });

  it('rejects fabricated, cross-port, consumed, superseded and excessively long handles', () => {
    const { port, session, maxBytes } = fixture();
    const first = port.call('list.whats_here');
    const cursor = cursorOf(first);
    const other = serveToAgent(session, { actionProjection: { maxBytes } });
    other.call('list.whats_here');
    for (const bad of ['', 'actions#0:2', 'x'.repeat(129), 1, {}, null]) {
      expect(port.call('list.whats_here', { actionCursor: bad })).toMatchObject({ reason: 'ACTION_CURSOR_INVALID' });
    }
    expect(other.call('list.whats_here', { actionCursor: cursor })).toMatchObject({ reason: 'ACTION_CURSOR_INVALID' });
    expect(port.call('list.whats_here', { actionCursor: cursor }).ok).toBe(true);
    expect(port.call('list.whats_here', { actionCursor: cursor })).toMatchObject({ reason: 'ACTION_CURSOR_INVALID' });
    const fresh = port.call('list.whats_here');
    port.call('list.whats_here');
    expect(port.call('list.whats_here', { actionCursor: cursorOf(fresh) })).toMatchObject({ reason: 'ACTION_CURSOR_INVALID' });
  });
});

describe('opt-in validation and compatibility', () => {
  it('needs only Web Crypto getRandomValues, without requiring secure-context randomUUID', () => {
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('randomUUID is unavailable outside a secure context');
    });
    try {
      const { port } = fixture();
      expect(port.call('list.whats_here').ok).toBe(true);
      expect(uuid).not.toHaveBeenCalled();
    } finally {
      uuid.mockRestore();
    }
  });

  it('snapshots the configured budget once instead of retaining a live option', () => {
    const { session, maxBytes } = fixture();
    let current = maxBytes;
    let reads = 0;
    const port = serveToAgent(session, { actionProjection: { get maxBytes() { reads += 1; return current; } } });
    expect(reads).toBe(1);
    current = 0;
    expect(projectionOf(port.call('list.whats_here')).maxBytes).toBe(maxBytes);
    expect(reads).toBe(1);
  });

  for (const invalid of [null, [], '100', {}, { maxBytes: 1 }, { maxBytes: 2.5 }, { maxBytes: NaN },
    { maxBytes: Infinity }, { maxBytes: Number.MAX_SAFE_INTEGER + 1 }, { maxBytes: 100, typo: true }]) {
    it(`rejects an invalid actions-array budget ${String(invalid)}`, () => {
      const { session } = fixture();
      expect(() => serveToAgent(session, { actionProjection: invalid } as JourneyToolsOptions)).toThrow('actionProjection');
    });
  }

  for (const invalid of [null, [], 'cursor', 7, new Date(0), { offset: 2 }, { routeTo: '' }, { routeTo: 1 },
    { sinceVersion: -1 }, { sinceVersion: 0.5 }, { sinceVersion: Infinity }, { sinceVersion: NaN }, { sinceVersion: 999 }]) {
    it(`refuses invalid bounded whats_here arguments ${String(invalid)}`, () => {
      const { port } = fixture();
      expect(port.call('list.whats_here', invalid)).toMatchObject({ ok: false, reason: 'ACTION_PROJECTION_ARGUMENTS_INVALID' });
    });
  }

  it('accepts a null-prototype argument object and a valid route query', () => {
    const { port } = fixture();
    expect(port.call('list.whats_here', Object.assign(Object.create(null), { routeTo: 'other' })).ok).toBe(true);
  });

  it('fails explicitly when a declared row cannot be JSON encoded', () => {
    const graph = buildNavigationGraph('json', { pages: { page: { actions: {
      a: { does: 'Act', input: { type: 'object', example: 1n } },
    } } } });
    const port = serveToAgent(graph.createSession(), { actionProjection: { maxBytes: 1000 } });
    expect(port.call('json.whats_here')).toMatchObject({ ok: false, reason: 'ACTION_ROW_NOT_SERIALIZABLE', action: 'page.a' });
  });

  it('leaves an unconfigured small app tool array and result bytes unchanged', () => {
    const { session } = fixture();
    const baseline = serveToAgent(session);
    const explicit = serveToAgent(session, { actionProjection: undefined });
    expect(JSON.stringify(explicit.tools())).toBe(JSON.stringify(baseline.tools()));
    expect(JSON.stringify(explicit.call('list.whats_here'))).toBe(JSON.stringify(baseline.call('list.whats_here')));
    expect(baseline.tools().find((tool) => tool.name === 'list.whats_here')!.inputSchema).not.toHaveProperty('properties.actionCursor');
    expect(baseline.call('list.whats_here')).not.toHaveProperty('actionProjection');
  });

  it('matches tool and result bytes captured from the unchanged b00995a serializer', () => {
    const graph = buildNavigationGraph('small', { pages: { page: { actions: {
      save: { does: 'Save draft', input: 'none' }, pay: { does: 'Pay', confirm: true },
    } } } });
    const session = graph.createSession({ now: () => 0, onWarn: () => undefined });
    session.registerActions('page', { handlers: { save: () => undefined, pay: () => undefined } });
    const port = serveToAgent(session);
    const actual = { tools: port.tools(), here: port.call('small.whats_here'),
      unknown: port.call('small.do_action', { action: 'missing' }),
      pause: port.call('small.do_action', { action: 'page.pay' }) };
    const pinned = JSON.parse(readFileSync(new URL('./fixtures/bounded-projection-default.json', import.meta.url), 'utf8'));
    expect(JSON.stringify(actual)).toBe(JSON.stringify(pinned));
  });

  it('continues through citation-only rotation while execution still refuses an evicted citation', () => {
    const graph = buildNavigationGraph('rotation', { pages: { page: { actions: {
      a: { does: 'Continue' }, b: { does: 'Continue' }, c: { does: 'Continue' },
    } } } });
    const session = graph.createSession({ maxOffers: 1, freshness: { positionChanges: 'refuse' }, onWarn: () => undefined });
    session.registerActions('page', { handlers: { a: () => undefined, b: () => undefined, c: () => undefined } });
    const port = serveToAgent(session, { actionProjection: { maxBytes: 90 } });
    const first = port.call('rotation.whats_here');
    expect(first.ok).toBe(true);
    const original = actionsOf(first)[0];
    const collected = [...actionsOf(first)];
    let cursor = cursorOf(first);
    while (cursor !== undefined) {
      const page = port.call('rotation.whats_here', { actionCursor: cursor });
      expect(page.ok).toBe(true);
      collected.push(...actionsOf(page));
      cursor = cursorOf(page);
    }
    expect(collected.map((row) => row.action)).toEqual(['page.a', 'page.b', 'page.c']);
    expect(port.call('rotation.do_action', { action: original.action, offerId: original.offerId })).toMatchObject({
      ok: false, reason: 'OFFER_NOT_ON_RECORD',
    });
  });

  it('does not absorb a changing live value while recording its own stale disclosures', () => {
    const graph = buildNavigationGraph('live', { pages: { page: { actions: {
      a: { does: 'Continue', writes: ['value'] }, b: { does: 'Continue', writes: ['value'] },
      c: { does: 'Continue', writes: ['value'] },
    } } } });
    const session = graph.createSession({ state: { value: 0 }, freshness: { positionChanges: 'refuse' } });
    session.updateState({ value: 1 }, { principal: 'user' });
    let reads = 0;
    session.declareHolds('page.a', () => ++reads <= 2 ? 'before' : 'after');
    const port = serveToAgent(session, { actionProjection: { maxBytes: 110 } });
    const first = port.call('live.whats_here');
    expect(actionsOf(first)[0].holds).toBe('before');
    expect(session.version).toBe(1);
    expect(port.call('live.whats_here', { actionCursor: cursorOf(first) })).toMatchObject({ reason: 'ACTION_CURSOR_STALE' });
    expect(session.version).toBe(1);
    expect(session.carriedStale('page.b')).toEqual([]);
  });
});
