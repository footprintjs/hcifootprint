/**
 * A session's record is byte-identical to what 2.6.1 wrote.
 *
 * Since 2.7.0 the session writes through the record layer, now `foottrace/write` (a `SharedMemory`, an
 * `EventLog` and one `RecordFrame` per transition) where 2.6.1 borrowed the engine's
 * frame (`ExecutionRuntime` + `newRoot` + `ScopeFacade` + a read tap). footprintjs pins
 * 2.6.1's real sessions — the six below from `test/trace.test.ts` and a commit out of
 * mint order — in its own fixture (footprintjs#61); their recorded bytes are vendored
 * here (`fixtures/transitions-2.6.1-recorded.json`), and each session played on this
 * release must give them: the commit log, `state()` and `readsByStep()`.
 *
 * Bytes are compared as footprintjs's fixtures compare them (its `test/fixtures/bytes.ts ·
 * pinnedText`, copied below): JSON with key order kept, written by `stringifySnapshot`,
 * after one pass that spells what JSON drops (Date, Map, Set, an own `undefined`).
 *
 * A byte that moves here is a foottrace record change or a session change: never
 * re-pin to make it pass without naming which (footprintjs test/fixtures/README.md).
 *
 * Test types: Byte-identity (seven sessions) · Contract (the vendored set is the set played).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stringifySnapshot } from 'footprintjs';
import { describe, expect, it } from 'vitest';

import type { Session } from '../src/index.js';
import { initialState, okUpdate, shop, wire } from './fixture.js';

interface Recorded {
  commitLog: unknown;
  state: unknown;
  reads: unknown;
}
const FILE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'transitions-2.6.1-recorded.json');
const pinned = JSON.parse(readFileSync(FILE, 'utf8')) as { sessions: { name: string; recorded: Recorded }[] };

/** footprintjs `test/fixtures/bytes.ts · pinnedText`, as footprintjs pins its fixtures. */
function pinnedText(value: unknown): string {
  const RUN_ID = /^\d+-\d{10}$/;
  const CLOCK_KEYS = new Set(['timestamp', 'pausedAt']);
  const runs = new Map<string, string>();
  const tag = (v: unknown, key: string): unknown => {
    if (v === undefined) return '«undefined»';
    if (typeof v === 'number' && CLOCK_KEYS.has(key)) return '«time»';
    if (typeof v === 'string' && RUN_ID.test(v)) {
      if (!runs.has(v)) runs.set(v, `«run:${runs.size + 1}»`);
      return runs.get(v);
    }
    if (v === null || typeof v !== 'object') return v;
    if (v instanceof Date) return `«date:${Number.isNaN(v.getTime()) ? 'invalid' : v.toISOString()}»`;
    if (v instanceof Map) return { '«map»': [...v].map(([k, x]) => [tag(k, ''), tag(x, '')]) };
    if (v instanceof Set) return { '«set»': [...v].map((x) => tag(x, '')) };
    if (Array.isArray(v)) return Array.from(v, (x, i) => tag(x, String(i)));
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = tag((v as Record<string, unknown>)[k], k);
    return out;
  };
  return `${JSON.stringify(JSON.parse(stringifySnapshot(tag(value, ''))), null, 2)}\n`;
}

/** test/trace.test.ts's session: login, two products, checkout, the order. */
function playSession(commitValues?: 'full' | 'delta'): Session {
  const s = shop().createSession({
    node: 'catalog',
    state: initialState,
    redactedKeys: ['user'],
    ...(commitValues ? { commitValues } : {}),
  });
  wire(s, 'add-to-cart', 'go-to-cart', 'proceed-to-checkout', 'place-order');
  s.fire('login', { source: 'user' });
  s.updateState({ authenticated: true, user: { name: 'ada' } });
  s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p1' } });
  s.updateState({ cart: [{ id: 'p1' }], cartCount: 1 });
  s.fire('add-to-cart', { source: 'agent', payload: { productId: 'p2' } });
  s.updateState({ cart: [{ id: 'p1' }, { id: 'p2' }], cartCount: 2 });
  s.fire('go-to-cart', { source: 'agent' });
  s.fire('proceed-to-checkout', { source: 'agent' });
  s.fire('place-order', { source: 'agent' });
  s.updateState({ orderId: 'ord-1' });
  return s;
}

/** The seven sessions footprintjs captured, by the name it filed each under. */
const SESSIONS: Record<string, () => Session> = {
  'playSession (delta, the default; redactedKeys user)': () => playSession(),
  "playSession ('full')": () => playSession('full'),
  'a Date survives settlement; an undefined value is dropped': () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    okUpdate(s.updateState({ when: new Date('2026-07-02'), gone: undefined }, { stimulus: 'push' }));
    return s;
  },
  'a different Date, Map or Set is a change': () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    okUpdate(
      s.updateState(
        { when: new Date('2026-07-02'), index: new Map([['k', 1]]), tags: new Set(['a']) },
        { stimulus: 'push' },
      ),
    );
    okUpdate(
      s.updateState(
        { when: new Date('2026-07-03'), index: new Map([['k', 2]]), tags: new Set(['b']) },
        { stimulus: 'push' },
      ),
    );
    return s;
  },
  'a report differing only by an own undefined field commits nothing': () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    okUpdate(s.updateState({ o: { a: 1 } }, { stimulus: 'push' }));
    okUpdate(s.updateState({ o: { a: 1, b: undefined } }, { stimulus: 'push' }));
    return s;
  },
  '25 revisits keep runtimeStageIds unique': () => {
    const s = shop().createSession({ node: 'catalog', state: { ...initialState, authenticated: true } });
    wire(s, 'add-to-cart');
    for (let i = 0; i < 25; i++) {
      s.fire('add-to-cart', { source: 'agent', payload: { productId: `p${i}` } });
      s.updateState({ cart: [], cartCount: 0 });
    }
    return s;
  },
  'out of mint order: fire login, a push stimulus commits, then login settles': () => {
    const s = shop().createSession({ node: 'catalog', state: initialState });
    s.fire('login', { source: 'user' });
    okUpdate(s.updateState({ banner: 'sale' }, { stimulus: 'push' }));
    okUpdate(s.updateState({ authenticated: true, user: { name: 'ada' } }));
    return s;
  },
};

describe('record bytes — the sessions 2.6.1 wrote, played on this release', () => {
  it('plays every vendored session, and nothing that is not one', () => {
    expect(Object.keys(SESSIONS).sort()).toEqual(pinned.sessions.map((s) => s.name).sort());
  });

  it.each(pinned.sessions.map((s) => [s.name, s.recorded] as const))('%s', async (name, recorded) => {
    const s = SESSIONS[name]!();
    // A session that registers handlers queues an empty `stimulus:structure-swap` commit for a later turn.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pinnedText(s.commitLog())).toBe(pinnedText(recorded.commitLog));
    expect(pinnedText(s.state())).toBe(pinnedText(recorded.state));
    expect(pinnedText([...s.readsByStep()])).toBe(pinnedText(recorded.reads));
  });
});
