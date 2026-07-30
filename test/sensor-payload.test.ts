/**
 * payload.ts — the declared-value door and the honest omission beside it.
 *
 * THE ASSERTION THAT MATTERS is on the ABSENCE OF A KEY, not on an undefined
 * value: `{}`, `''` and `payload: undefined` are all shapes of the same mistake,
 * and the library already has the bug on the record (an empty string forced into a
 * click-only control "OVERRODE the app's own authored default — selecting
 * nothing", session.ts:1006-1019). `toHaveProperty` is what tells those apart.
 *
 * The NO_INPUT pin is here too: payload.ts restates the sentinel as a literal so
 * src/sensor stays a zero-value-import leaf, and this file imports the REAL
 * constant from the engine and asserts they are the same string. A rename cannot
 * drift them apart in silence.
 *
 * Mutation proof: payload.ts did not exist before this change, so every test here
 * fails against pre-change source.
 */
import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '../src/traverse/expects.js';
import { declaredPayload, refusesAValue, takesAValue } from '../src/sensor/payload.js';

const SCHEMA = { type: 'object', properties: { message: { type: 'string' } } };

describe('the restated sentinel is pinned to the real one', () => {
  it("payload.ts's literal is the engine's NO_INPUT, character for character", () => {
    // The sensor cannot import it (expects.ts value-imports footprintjs), so the
    // duplication is proved equal here instead of hoped equal.
    expect(refusesAValue(NO_INPUT)).toBe(true);
    expect(NO_INPUT).toBe('none');
  });
});

describe('takesAValue — is there a contract to satisfy?', () => {
  it('a real schema takes a value', () => {
    expect(takesAValue(SCHEMA)).toBe(true);
  });

  it("the author's 'none' does not", () => {
    expect(takesAValue(NO_INPUT)).toBe(false);
  });

  it('ABSENCE does not either — the library not knowing is not a contract', () => {
    expect(takesAValue(undefined)).toBe(false);
  });
});

describe('refusesAValue — only the explicit sentinel refuses one', () => {
  it("'none' refuses", () => {
    expect(refusesAValue(NO_INPUT)).toBe(true);
  });

  it('absence does NOT refuse — the gap between the two predicates is deliberate', () => {
    expect(refusesAValue(undefined)).toBe(false);
    expect(refusesAValue(SCHEMA)).toBe(false);
  });
});

describe('declaredPayload — the key is there, or it is NOT THERE', () => {
  it('no getter yields no payload key at all', () => {
    const fields = declaredPayload(undefined, SCHEMA);
    expect(fields).not.toHaveProperty('payload');
    expect(Object.keys(fields)).toEqual([]);
  });

  it('a getter on a value-taking action yields the value', () => {
    expect(declaredPayload(() => ({ message: 'hi' }), SCHEMA)).toEqual({ payload: { message: 'hi' } });
  });

  it("a getter on an action declared 'none' yields NO key — the empty-string bug cannot re-open", () => {
    const fields = declaredPayload(() => '', NO_INPUT);
    expect(fields).not.toHaveProperty('payload');
  });

  it('a getter on an action with NO declared contract still rides — the app said what it is', () => {
    // Absence means the library does not know the shape, not that nothing may be
    // sent. Dropping a value the app deliberately handed over would lose it.
    expect(declaredPayload(() => ({ draft: 'x' }), undefined)).toEqual({ payload: { draft: 'x' } });
  });

  it('reads the getter LATE — at report time, which is what makes last-value-wins free', () => {
    let live = 'first';
    const value = (): unknown => live;
    live = 'last';
    expect(declaredPayload(value, SCHEMA)).toEqual({ payload: 'last' });
  });

  it('a getter that answers undefined yields NO key — never payload: undefined', () => {
    // `toEqual` cannot tell { payload: undefined } from {}, which is exactly why
    // this asserts on the KEY. Spreading the former into a fire is the one shape
    // this module promises never to produce.
    const fields = declaredPayload(() => undefined, SCHEMA);
    expect(fields).not.toHaveProperty('payload');
    expect(Object.keys(fields)).toEqual([]);
  });

  it('a getter answering null DOES ride — null is a value somebody chose to send', () => {
    expect(declaredPayload(() => null, SCHEMA)).toEqual({ payload: null });
  });
});
