/**
 * THE COPY AN APPROVAL BINDS TO — the module, on its own.
 *
 * `sameInput` proves a fire is the thing the human approved by comparing two
 * values. That proof is worth nothing when both sides are THE SAME OBJECT: a
 * caller that keeps its reference can change the payload after the yes and the
 * comparison still answers 'same', because it is reading one object twice. This
 * module is the answer, so it gets its own three-line tests rather than only
 * being exercised through a session.
 *
 * MUTATION PROOFS, run and recorded:
 *  - return `value` instead of the copy → 'a later mutation cannot reach the
 *    binding' fails, and so does A8 in human-approval.test.ts (as a placed order
 *    for 999999).
 *  - fall back to the reference when the clone throws → 'a value we cannot copy
 *    binds to a stand-in nothing can match' fails on the Proxy case, which is the
 *    one input shape built to lie about itself.
 *  - make UNCOPYABLE_INPUT a string instead of a symbol → the same test fails,
 *    because two stand-ins would then compare 'same' to each other.
 */
import { describe, expect, it } from 'vitest';
import { UNCOPYABLE_INPUT, boundInput } from '../src/traverse/bound-input.js';
import { sameInput } from '../src/traverse/same-input.js';

describe('the binding copy', () => {
  it('renders equal to what it was made from — an honest copy, not a stand-in', () => {
    const value = { total: 10, items: [{ sku: 'a' }] };
    expect(sameInput(boundInput(value), value)).toBe('same');
  });

  it('a later mutation cannot reach the binding — the whole reason it exists', () => {
    const value: Record<string, unknown> = { total: 10 };
    const bound = boundInput(value);
    value['total'] = 999_999;
    expect(sameInput(bound, value)).toBe('different');
    expect(bound).toEqual({ total: 10 });
  });

  it('a mutation NESTED under the top level cannot reach it either', () => {
    const value = { order: { total: 10 } };
    const bound = boundInput(value);
    value.order.total = 999_999;
    expect(sameInput(bound, value)).toBe('different');
  });

  it('undefined binds to undefined — the click-only control, not a failure', () => {
    expect(boundInput(undefined)).toBeUndefined();
    expect(sameInput(boundInput(undefined), undefined)).toBe('same');
  });
});

describe('a value we cannot copy', () => {
  it('binds to a stand-in nothing can ever match — not even itself', () => {
    // A Proxy over a plain object is the shape that makes the reference fallback
    // unsafe: it renders faithfully through sameInput (its prototype IS
    // Object.prototype) and throws DataCloneError on structuredClone. Keeping the
    // reference would have left exactly this swap open.
    const live: Record<string, unknown> = { total: 10 };
    const proxy = new Proxy(live, {});
    const bound = boundInput(proxy);

    expect(bound).toBe(UNCOPYABLE_INPUT);
    expect(sameInput(bound, proxy)).toBe('cannot-judge');
    expect(sameInput(bound, bound)).toBe('cannot-judge');
  });

  it('never throws, whatever it is handed — a card that cannot be raised is worse', () => {
    for (const hostile of [() => 1, Symbol('x'), { fn: () => 1 }]) {
      expect(() => boundInput(hostile)).not.toThrow();
      expect(boundInput(hostile)).toBe(UNCOPYABLE_INPUT);
    }
  });

  it('a cycle is copied, not refused — structuredClone handles it and the gate judges it later', () => {
    const cyclic: Record<string, unknown> = { total: 10 };
    cyclic['self'] = cyclic;
    const bound = boundInput(cyclic);
    expect(bound).not.toBe(UNCOPYABLE_INPUT);
    // sameInput still declines to judge a cycle, so the fire is refused rather
    // than matched — the binding just never pretends the copy failed.
    expect(sameInput(bound, cyclic)).toBe('cannot-judge');
  });
});
