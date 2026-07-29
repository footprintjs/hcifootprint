/**
 * The returned-failure test, alone. It decides whether a handler's return
 * value is a REFUSAL (routed exactly like a throw) or DATA (kept as
 * `produced`), so its edges are the whole safety story: too narrow and a
 * failure is recorded as success again; too broad and a legitimate payload
 * flips a committed transition to rejected.
 */
import { describe, expect, it } from 'vitest';
import { failureReason, isReturnedFailure } from '../src/traverse/handler-result.js';

describe('isReturnedFailure() — recognised failures', () => {
  it('recognises a bare { ok: false }', () => {
    expect(isReturnedFailure({ ok: false })).toBe(true);
  });

  it('recognises { ok: false, error } — the library’s own failure vocabulary', () => {
    expect(isReturnedFailure({ ok: false, error: new Error('nope') })).toBe(true);
  });

  it('recognises it regardless of the other keys the handler carried along', () => {
    expect(isReturnedFailure({ ok: false, error: 'out of stock', retriable: true })).toBe(true);
  });
});

describe('isReturnedFailure() — everything else stays DATA', () => {
  it('rejects a falsy-but-not-false ok (a count, not a verdict)', () => {
    expect(isReturnedFailure({ ok: 0 })).toBe(false);
    expect(isReturnedFailure({ ok: '' })).toBe(false);
    expect(isReturnedFailure({ ok: null })).toBe(false);
    expect(isReturnedFailure({ ok: undefined })).toBe(false);
  });

  it('rejects the string "false" — no coercion anywhere', () => {
    expect(isReturnedFailure({ ok: 'false' })).toBe(false);
  });

  it('rejects an INHERITED ok — only the object’s own word counts', () => {
    expect(isReturnedFailure(Object.create({ ok: false }))).toBe(false);
  });

  it('rejects a fetch-Response-like object (ok is a prototype getter, and it is data)', () => {
    class ResponseLike {
      constructor(readonly status: number) {}
      get ok(): boolean {
        return this.status < 400;
      }
    }
    const failed = new ResponseLike(500);
    expect(failed.ok).toBe(false); // it really does read false…
    expect(isReturnedFailure(failed)).toBe(false); // …and is still the handler's data
  });

  it('rejects success shapes and error-only shapes', () => {
    expect(isReturnedFailure({ ok: true, data: [1, 2] })).toBe(false);
    expect(isReturnedFailure({ error: 'x' })).toBe(false);
  });

  it('rejects non-objects and arrays', () => {
    expect(isReturnedFailure(null)).toBe(false);
    expect(isReturnedFailure(undefined)).toBe(false);
    expect(isReturnedFailure('ok')).toBe(false);
    expect(isReturnedFailure(0)).toBe(false);
    expect(isReturnedFailure(false)).toBe(false);
    expect(isReturnedFailure([])).toBe(false);
    expect(isReturnedFailure([{ ok: false }])).toBe(false);
  });
});

describe('failureReason() — what gets reported as the refusal’s reason', () => {
  it('is the named error when the handler named one', () => {
    const error = new Error('payment declined');
    expect(failureReason({ ok: false, error })).toBe(error);
  });

  it('is the returned object itself when no error was named', () => {
    const returned = { ok: false as const, code: 'OUT_OF_STOCK' };
    expect(failureReason(returned)).toBe(returned);
  });

  it('falls back to the object when error is present but empty (undefined/null)', () => {
    const undef = { ok: false as const, error: undefined };
    const nulled = { ok: false as const, error: null };
    expect(failureReason(undef)).toBe(undef);
    expect(failureReason(nulled)).toBe(nulled);
  });

  it('keeps a falsy-but-real error (empty string, 0) instead of swallowing it', () => {
    expect(failureReason({ ok: false, error: '' })).toBe('');
    expect(failureReason({ ok: false, error: 0 })).toBe(0);
  });
});
