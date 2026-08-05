/**
 * The envelope's assembly, on its own — the file where law 1 is actually
 * enforced, tested at the width of its own arguments.
 *
 * A session-level test proves the law holds for the shapes an app usually
 * passes. These prove it holds for the shapes it does not: a payload that is not
 * an object at all, a key the caller named and never sent, a redactor that
 * answers with nothing, a thrown thing that is not an Error.
 */
import { describe, expect, it } from 'vitest';
import type { FilterCondition } from 'footprintjs/advanced';
import { failureOf, guardReads, projectInput } from '../src/contextful/capture.js';
import { ERROR_MESSAGE } from '../src/contextful/types.js';

const condition = (key: string, result: boolean): FilterCondition => ({
  key,
  op: 'eq',
  threshold: true,
  actualSummary: 'true',
  result,
  redacted: false,
});

describe('guardReads — names and outcomes, never the conditions themselves', () => {
  it('reads each declared key as held, not held, or unevaluated', () => {
    expect(
      guardReads(
        ['authenticated', 'tier', 'region'],
        [condition('authenticated', true), condition('tier', false)],
        ['region'],
      ),
    ).toEqual([
      { key: 'authenticated', held: true },
      { key: 'tier', held: false },
      { key: 'region', held: 'unevaluated' },
    ]);
  });

  it('says nothing about an action with no guard at all', () => {
    expect(guardReads([], [], [])).toEqual([]);
  });
});

describe('projectInput — the allowlist, and everything it refuses', () => {
  it('answers nothing when the app allowlisted nothing', () => {
    expect(projectInput({ qty: 1 }, {})).toBeUndefined();
    expect(projectInput({ qty: 1 }, { include: [] })).toBeUndefined();
  });

  it('answers nothing when the only allowlist entry is the reserved message name', () => {
    expect(projectInput({ qty: 1 }, { include: [ERROR_MESSAGE] })).toBeUndefined();
  });

  it('answers nothing for a payload that is not an object to take keys from', () => {
    expect(projectInput(undefined, { include: ['qty'] })).toBeUndefined();
    expect(projectInput('a string', { include: ['qty'] })).toBeUndefined();
    expect(projectInput(null, { include: ['qty'] })).toBeUndefined();
  });

  it('takes only the keys that were BOTH named and sent', () => {
    expect(projectInput({ qty: 2, coupon: 'x' }, { include: ['qty', 'size'] })).toEqual({ qty: 2 });
  });

  it('answers nothing when nothing named was sent', () => {
    expect(projectInput({ coupon: 'x' }, { include: ['qty'] })).toBeUndefined();
  });

  it('lets the redactor DROP a value by answering undefined — absent stays absent', () => {
    expect(projectInput({ qty: 2 }, { include: ['qty'], redact: () => undefined })).toBeUndefined();
  });

  it('bounds what survives by the same data-channel rule a handler’s return gets', () => {
    const long = 'x'.repeat(300);
    const projected = projectInput({ note: long }, { include: ['note'] }) as { note: string };
    expect(projected.note).toHaveLength(201); // 200 + the ellipsis the bound writes
  });
});

describe('failureOf — the class always, the message only behind the allowlist', () => {
  it('names the error’s own class', () => {
    expect(failureOf(new TypeError('x'), {})).toEqual({ errorClass: 'TypeError' });
    class PaymentDeclined extends Error {}
    expect(failureOf(new PaymentDeclined('x'), {})).toEqual({ errorClass: 'PaymentDeclined' });
  });

  it('names what was thrown when it is not an error at all', () => {
    expect(failureOf('just a string', {})).toEqual({ errorClass: 'String' });
    expect(failureOf(null, {})).toEqual({ errorClass: 'null' });
    expect(failureOf(undefined, {})).toEqual({ errorClass: 'undefined' });
    expect(failureOf(Object.create(null), {})).toEqual({ errorClass: 'object' });
  });

  it('opens the message only for the reserved name, and reads a thrown STRING as its own message', () => {
    expect(failureOf('the printer is offline', { include: [ERROR_MESSAGE] })).toEqual({
      errorClass: 'String',
      message: 'the printer is offline',
    });
  });

  it('says nothing where there is no message a string can hold', () => {
    expect(failureOf({ code: 42 }, { include: [ERROR_MESSAGE] })).toEqual({
      errorClass: 'Object',
    });
  });

  it('caps a long message, and lets the app’s redactor rewrite or withhold it', () => {
    const long = new Error('y'.repeat(400));
    const capped = failureOf(long, { include: [ERROR_MESSAGE] });
    expect(capped.message).toHaveLength(201);

    expect(failureOf(new Error('secret'), { include: [ERROR_MESSAGE], redact: () => '[hidden]' })).toEqual(
      { errorClass: 'Error', message: '[hidden]' },
    );
    // A redactor that answers with a non-string has withheld it: the class stands
    // alone rather than the library inventing a rendering of somebody else's
    // policy decision.
    expect(failureOf(new Error('secret'), { include: [ERROR_MESSAGE], redact: () => null })).toEqual(
      { errorClass: 'Error' },
    );
  });
});
