/** A served record's mutable values belong to that reader, not to later history. */
import assert from 'node:assert/strict';
import { causalChain, commitValueAt, formatCausalChain, stateAt } from 'foottrace';
import { describe, expect, it } from 'vitest';
import { initialState, okUpdate, shop, wire } from './fixture.js';

interface MutableValueCase {
  name: string;
  value(): unknown;
  mutate(value: unknown): void;
}

const values: MutableValueCase[] = [
  {
    name: 'Date',
    value: () => new Date('2026-07-02T12:00:00.000Z'),
    mutate(value) {
      assert.ok(value instanceof Date);
      value.setTime(0);
    },
  },
  {
    name: 'Map',
    value: () => new Map([['count', 1]]),
    mutate(value) {
      assert.ok(value instanceof Map);
      value.set('count', 999);
    },
  },
  {
    name: 'Set',
    value: () => new Set(['recorded']),
    mutate(value) {
      assert.ok(value instanceof Set);
      value.clear();
      value.add('reader-only');
    },
  },
  {
    name: 'Uint8Array',
    value: () => new Uint8Array([1, 2, 3]),
    mutate(value) {
      assert.ok(value instanceof Uint8Array);
      value.fill(255);
    },
  },
];

const encodings: Array<'full' | 'delta'> = ['full', 'delta'];

describe.each(values)('commitLog() reader isolation: $name', (sample) => {
  it.each(encodings)('preserves state, replay and attribution after a reader mutates the %s record', (commitValues) => {
    const session = shop().createSession({ node: 'catalog', state: initialState, commitValues });
    wire(session, 'login');
    const fired = session.fire('login', { source: 'agent' });
    if (!fired.ok) throw new Error('the wired login fire was refused');
    const settled = okUpdate(session.updateState(
      { authenticated: true, user: sample.value() },
      { transitionId: fired.transition.id },
    ));
    expect(settled.attributed).toBe(true);
    expect(settled.transition.id).toBe(fired.transition.id);
    expect(settled.transition.attribution).toEqual({
      principal: 'agent', basis: 'named-by-report', certainty: 'observed',
    });

    const served = session.commitLog().find((bundle) => bundle.runtimeStageId === fired.transition.id);
    assert.ok(served);
    expect(served.overwrite['user']).toEqual(sample.value());
    expect(served.trace.find((row) => row.path === 'user')?.readKeys).toEqual(['authenticated']);
    const why = session.why('user');
    expect(why).toContain('login');

    // This mutation must succeed on the reader's value. Merely rejecting plain
    // property assignment would not protect Date, Map, Set or typed-array slots.
    sample.mutate(served.overwrite['user']);
    expect(served.overwrite['user']).not.toEqual(sample.value());

    const fresh = session.commitLog();
    const recorded = fresh.find((bundle) => bundle.runtimeStageId === fired.transition.id);
    assert.ok(recorded);
    const index = recorded.idx;
    assert.ok(typeof index === 'number', 'the committed bundle must have an assigned index');
    expect(index).toBe(fresh.indexOf(recorded));
    expect(recorded.overwrite['user']).toEqual(sample.value());
    expect(session.state()['user']).toEqual(sample.value());
    expect(commitValueAt(fresh, index, 'user')).toEqual(sample.value());
    const replayed = stateAt({ initialState, commitLog: fresh }, index);
    expect(replayed.basis).toBe('initial+log');
    expect(replayed.state['user']).toEqual(sample.value());
    expect(session.why('user')).toBe(why);
    const chain = causalChain(fresh, recorded.runtimeStageId, (id) => session.readsByStep().get(id) ?? []);
    assert.ok(chain);
    expect(formatCausalChain(chain)).toContain('login');
    expect(recorded.trace.find((row) => row.path === 'user')?.readKeys).toEqual(['authenticated']);
    expect(session.transitions().find((row) => row.id === fired.transition.id)?.attribution).toEqual({
      principal: 'agent', basis: 'named-by-report', certainty: 'observed',
    });
  });
});
