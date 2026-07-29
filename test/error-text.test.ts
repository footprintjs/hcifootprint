/**
 * errorText — an app's failure, rendered for the wire.
 *
 * Two jobs, both load-bearing where a settlement crosses a tool result: the
 * text is BOUNDED (a stack trace is the rest of the model's context window),
 * and rendering never throws (a poll that crashes tells the caller nothing at
 * all — the one answer this library never gives).
 *
 * MUTATION PROOFS: drop the cap and 'caps a long failure' fails; drop the
 * try/catch and the two unrenderable cases throw instead of answering.
 */
import { describe, expect, it } from 'vitest';
import { errorText } from '../src/serve/error-text.js';

describe('errorText()', () => {
  it('renders the ordinary shapes an app fails with', () => {
    expect(errorText(new Error('api down'))).toBe('Error: api down');
    expect(errorText('card declined')).toBe('card declined');
    expect(errorText({ ok: false })).toBe('[object Object]');
    expect(errorText(404)).toBe('404');
    expect(errorText(null)).toBe('null');
  });

  it('caps a long failure, and says it was cut', () => {
    const capped = errorText(`stack ${'x'.repeat(5000)}`);
    expect(capped).toHaveLength(201); // 200 characters + the ellipsis
    expect(capped.endsWith('…')).toBe(true);
    expect(capped.startsWith('stack ')).toBe(true);
  });

  it('leaves a text that already fits exactly alone', () => {
    const exact = 'y'.repeat(200);
    expect(errorText(exact)).toBe(exact); // no ellipsis on the boundary
  });

  it('answers even for a value that cannot be rendered — never throws', () => {
    // Both really do throw inside String(): a null-prototype object has no
    // toString to reach, and an app can hand back an object whose own one
    // fails (a getter that touches a torn-down store).
    expect(errorText(Object.create(null))).toBe('(an error that cannot be rendered as text)');
    const hostile = {
      toString() {
        throw new Error('store is gone');
      },
    };
    expect(errorText(hostile)).toBe('(an error that cannot be rendered as text)');
  });
});
