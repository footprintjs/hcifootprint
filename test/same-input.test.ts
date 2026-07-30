/**
 * IS THE INPUT A HUMAN APPROVED THE INPUT NOW BEING FIRED?
 *
 * The comparison behind APPROVAL_MISMATCH. Two directions matter and they pull
 * against each other:
 *
 *  - FALSE MATCH is the attack. Approve "add one dress", fire "add nine hundred",
 *    and a yes has been spent on something nobody saw. Everything this module
 *    cannot render faithfully must therefore be 'cannot-judge', which the gate
 *    turns into a refusal.
 *  - FALSE DIFFERENCE is the cost. A legitimate approval refused for a reason
 *    that is only about our own storage — key order, a dropped undefined — is a
 *    door that never opens.
 *
 * Mutation proofs, run and recorded:
 *  - make 'cannot-judge' return 'same' → the Map/Date/BigInt/circular cases here
 *    go green-as-'same' and the laundering test in human-approval.test.ts stops
 *    refusing a forged fire.
 *  - drop the key sorting → 'key order is not a difference' fails, and a
 *    legitimate approval refuses in the field for no reason at all.
 *  - drop the undefined-key skip → 'an undefined-valued key' fails, because the
 *    receipts snapshot omits it and the raw payload does not.
 */
import { describe, expect, it } from 'vitest';
import { normalizeInput, sameInput } from '../src/traverse/same-input.js';

describe('the same input, whatever shape it arrives in', () => {
  it('key order is not a difference — the input is the input', () => {
    expect(sameInput({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe('same');
    expect(sameInput({ x: { p: 1, q: 2 } }, { x: { q: 2, p: 1 } })).toBe('same');
  });

  it('compares nested structures by value', () => {
    expect(sameInput({ items: [{ id: 'a' }, { id: 'b' }] }, { items: [{ id: 'a' }, { id: 'b' }] })).toBe('same');
    expect(sameInput({ items: [{ id: 'a' }] }, { items: [{ id: 'b' }] })).toBe('different');
  });

  it('array ORDER is a difference (a list is not a set)', () => {
    expect(sameInput([1, 2], [2, 1])).toBe('different');
  });

  it('primitives compare by value and never across types', () => {
    expect(sameInput('1', 1)).toBe('different');
    expect(sameInput(null, undefined)).toBe('different');
    expect(sameInput(false, 0)).toBe('different');
    expect(sameInput(undefined, undefined)).toBe('same');
  });

  it('an undefined-valued key is dropped — the receipts snapshot drops it too', () => {
    // Without this, a payload of {productId:'d-1', note: undefined} would refuse
    // against the {productId:'d-1'} the card stored. A false refusal our own
    // storage caused.
    expect(sameInput({ productId: 'd-1', note: undefined }, { productId: 'd-1' })).toBe('same');
  });

  it('a repeated reference in two sibling slots is sharing, not a cycle', () => {
    const shared = { id: 'x' };
    expect(sameInput({ a: shared, b: shared }, { a: { id: 'x' }, b: { id: 'x' } })).toBe('same');
  });
});

describe('what it refuses to judge — every class, and each one REFUSES rather than guesses', () => {
  it('a Map and a Set: JSON renders both as {}, so two different ones would look equal', () => {
    expect(sameInput({ m: new Map([['a', 1]]) }, { m: new Map([['a', 1]]) })).toBe('cannot-judge');
    expect(sameInput({ s: new Set([1]) }, { s: new Set([2]) })).toBe('cannot-judge');
  });

  it('a Date', () => {
    expect(sameInput({ when: new Date(0) }, { when: new Date(0) })).toBe('cannot-judge');
  });

  it('a class instance — a non-plain prototype is not plain data', () => {
    class Money {
      constructor(readonly cents: number) {}
    }
    expect(sameInput({ total: new Money(100) }, { total: new Money(100) })).toBe('cannot-judge');
  });

  it('a BigInt, a symbol and a function', () => {
    expect(sameInput({ n: 1n }, { n: 1n })).toBe('cannot-judge');
    expect(sameInput({ s: Symbol('x') }, { s: Symbol('x') })).toBe('cannot-judge');
    expect(sameInput({ f: () => 1 }, { f: () => 1 })).toBe('cannot-judge');
  });

  it('NaN and Infinity — JSON writes both as null, which would make NaN equal null', () => {
    expect(sameInput({ n: Number.NaN }, { n: Number.NaN })).toBe('cannot-judge');
    expect(sameInput({ n: Number.POSITIVE_INFINITY }, { n: Number.POSITIVE_INFINITY })).toBe('cannot-judge');
  });

  it('a circular reference is DETECTED, not followed — no hang inside a security gate', () => {
    const loop: Record<string, unknown> = { name: 'a' };
    loop['self'] = loop;
    expect(sameInput(loop, loop)).toBe('cannot-judge');
  });

  it('past the receipts caps: the card showed a truncation, so a match is unprovable', () => {
    // Depth: the snapshot stops at 4 levels, so level 5 was never on the card.
    expect(sameInput({ a: { b: { c: { d: { e: 1 } } } } }, { a: { b: { c: { d: { e: 1 } } } } })).toBe('cannot-judge');
    // Breadth: more items than the snapshot holds.
    const long = Array.from({ length: 31 }, (_, i) => i);
    expect(sameInput(long, [...long])).toBe('cannot-judge');
    // Width: more keys than the snapshot holds.
    const wide = Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`k${i}`, i]));
    expect(sameInput(wide, { ...wide })).toBe('cannot-judge');
    // Length: two different strings sharing a 200-character prefix must not
    // compare equal just because the card could only show the prefix.
    const prefix = 'x'.repeat(200);
    expect(sameInput(`${prefix}pay Bob`, `${prefix}pay Eve`)).toBe('cannot-judge');
  });

  it('and stays inside the caps for values that fit', () => {
    expect(sameInput({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { d: 1 } } } })).toBe('same');
    expect(sameInput('x'.repeat(200), 'x'.repeat(200))).toBe('same');
    expect(sameInput(Array.from({ length: 30 }, (_, i) => i), Array.from({ length: 30 }, (_, i) => i))).toBe('same');
  });
});

describe('normalizeInput — the one helper both sides call', () => {
  it('an input-less action erases whatever was sent, on BOTH sides', () => {
    // fire() rewrites a noInput payload to undefined before the gate sees it, so
    // the ask must land in the same place or every click-only control refuses its
    // own approval.
    expect(sameInput(normalizeInput('', true), normalizeInput(undefined, true))).toBe('same');
    expect(sameInput(normalizeInput({ value: '' }, true), normalizeInput(undefined, true))).toBe('same');
  });

  it('leaves a real input alone', () => {
    expect(normalizeInput({ productId: 'd-1' }, false)).toEqual({ productId: 'd-1' });
    expect(normalizeInput('', false)).toBe(''); // '' is a real value where input is declared
  });
});
