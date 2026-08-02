/**
 * The shape checker, alone. It decides whether a fire is REFUSED, so its edges
 * are the whole safety story: too lax and a planner's wrong key reaches the
 * handler as undefined again; too strict and it refuses payloads the app would
 * have accepted — the worse of the two, because a rejection has no appeal.
 *
 * Two properties are pinned everywhere below: what it DECLINES to judge, and
 * the exact wording of what it does — the message IS the teaching channel, and
 * the last test in this file is the friend's reported case, verbatim.
 */
import { describe, expect, it } from 'vitest';
import { checkJsonShape, describeExpectedShape, describeReceivedShape } from '../src/traverse/payload-shape.js';

/** The reported case: the handler reads {value}, the planner guessed {name}. */
const VALUE_SCHEMA = {
  type: 'object',
  properties: { value: { type: 'string' } },
  required: ['value'],
};

describe('a payload that WOULD be refused is diagnosed before it is ever sent', () => {
  it('names a missing required key', () => {
    const result = checkJsonShape(VALUE_SCHEMA, { other: 'x' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.issues).toContain("missing required 'value'");
  });

  it('names a declared key holding the wrong primitive type', () => {
    const schema = { type: 'object', properties: { count: { type: 'number' } } };
    const result = checkJsonShape(schema, { count: '3' });
    expect(result.ok === false && result.issues).toContain("'count' should be number, not string");
  });

  it('holds integer to whole numbers — a float is a real defect', () => {
    const schema = { type: 'object', properties: { page: { type: 'integer' } } };
    expect(checkJsonShape(schema, { page: 2 }).ok).toBe(true);
    const result = checkJsonShape(schema, { page: 2.5 });
    expect(result.ok === false && result.issues).toContain("'page' should be integer, not number");
  });

  it('tells an array from an object (typeof would call both "object")', () => {
    const arraySchema = { type: 'object', properties: { tags: { type: 'array' } } };
    expect(checkJsonShape(arraySchema, { tags: ['a'] }).ok).toBe(true);
    expect(checkJsonShape(arraySchema, { tags: { 0: 'a' } }).ok).toBe(false);

    const objectSchema = { type: 'object', properties: { user: { type: 'object' } } };
    expect(checkJsonShape(objectSchema, { user: { id: 1 } }).ok).toBe(true);
    const wrong = checkJsonShape(objectSchema, { user: ['id'] });
    expect(wrong.ok === false && wrong.issues).toContain("'user' should be object, not array");
  });

  it('holds boolean to a real boolean — “true” the string is a different answer', () => {
    const schema = { type: 'object', properties: { gift: { type: 'boolean' } } };
    expect(checkJsonShape(schema, { gift: false }).ok).toBe(true);
    const wrong = checkJsonShape(schema, { gift: 'true' });
    expect(wrong.ok === false && wrong.issues).toContain("'gift' should be boolean, not string");
  });

  it('accepts null only where null is the declared type', () => {
    const nullable = { type: 'object', properties: { clearedBy: { type: 'null' } } };
    expect(checkJsonShape(nullable, { clearedBy: null }).ok).toBe(true);
    expect(checkJsonShape(nullable, { clearedBy: 'someone' }).ok).toBe(false);
    const stringy = { type: 'object', properties: { name: { type: 'string' } } };
    const result = checkJsonShape(stringy, { name: null });
    expect(result.ok === false && result.issues).toContain("'name' should be string, not null");
  });

  it('reports every defect it found, in one message', () => {
    const schema = {
      type: 'object',
      properties: { value: { type: 'string' }, count: { type: 'number' } },
      required: ['value'],
    };
    const result = checkJsonShape(schema, { count: 'three' });
    expect(result.ok === false && result.issues).toBe(
      "missing required 'value'; 'count' should be number, not string — " +
        'expected { value: string, count?: number }, received { count: string }',
    );
  });

  it('treats a required key holding undefined as missing (undefined is absent, library-wide)', () => {
    const result = checkJsonShape(VALUE_SCHEMA, { value: undefined });
    expect(result.ok === false && result.issues).toContain("missing required 'value'");
    // …and says so honestly: the key WAS sent, it just carried nothing.
    expect(result.ok === false && result.issues).toContain('received { value: undefined }');
  });
});

describe('keys the contract never asked for', () => {
  it('passes extra keys by default: an open object is JSON Schema’s default', () => {
    expect(checkJsonShape(VALUE_SCHEMA, { value: 'x', note: 'extra' }).ok).toBe(true);
  });

  it('refuses extra keys only where the author closed the object', () => {
    const closed = { ...VALUE_SCHEMA, additionalProperties: false };
    const result = checkJsonShape(closed, { value: 'x', note: 'extra' });
    expect(result.ok === false && result.issues).toContain("unexpected key 'note'");
  });

  it('lists several unexpected keys in one defect, pluralized', () => {
    const closed = { ...VALUE_SCHEMA, additionalProperties: false };
    const result = checkJsonShape(closed, { value: 'x', a: 1, b: 2 });
    expect(result.ok === false && result.issues).toContain("unexpected keys 'a', 'b'");
  });

  it('does not count an extra key holding undefined — it carries nothing', () => {
    const closed = { ...VALUE_SCHEMA, additionalProperties: false };
    expect(checkJsonShape(closed, { value: 'x', note: undefined }).ok).toBe(true);
  });

  it('is not fooled by a payload key that names an Object.prototype member', () => {
    const closed = { ...VALUE_SCHEMA, additionalProperties: false };
    const result = checkJsonShape(closed, { value: 'x', toString: 'shadowed' });
    expect(result.ok === false && result.issues).toContain("unexpected key 'toString'");
  });

  it('stops listing unexpected keys at ten and says there are more', () => {
    // A planner that sent a whole record instead of the one field would
    // otherwise turn the teaching sentence into a dump of its own payload.
    const closed = { ...VALUE_SCHEMA, additionalProperties: false };
    const spray: Record<string, unknown> = { value: 'x' };
    for (let i = 0; i < 12; i += 1) spray[`k${i}`] = i;
    const result = checkJsonShape(closed, spray);
    expect(result.ok === false && result.issues).toContain("'k9', …");
    expect(result.ok === false && result.issues).not.toContain("'k10'");
  });

  /**
   * `patternProperties` allows keys by REGEX, which this checker does not read.
   * Beside it, `additionalProperties: false` no longer means "only the keys in
   * properties" — so judging the closed rule refuses a payload the author's
   * full schema accepts, the one error class this module calls the worse one.
   */
  it('stands the closed rule down beside patternProperties — the author allowed those keys', () => {
    const withPattern = {
      ...VALUE_SCHEMA,
      patternProperties: { '^x-': { type: 'string' } },
      additionalProperties: false,
    };
    expect(checkJsonShape(withPattern, { value: 'x', 'x-trace': 'abc' }).ok).toBe(true);
    // And a key no pattern could match passes too: we cannot tell them apart,
    // so we decline the whole rule rather than guess which side a key is on.
    expect(checkJsonShape(withPattern, { value: 'x', note: 'extra' }).ok).toBe(true);
  });

  /**
   * The obvious fix — putting `patternProperties` in UNJUDGED_KEYWORDS — passes
   * the test above and fails this one: it would drop the whole level, so a
   * planner's missing key and wrong type would stop being reported. Only the
   * closed-object rule depends on knowing which names are allowed.
   */
  it('keeps judging required keys and types beside patternProperties — only that one rule stands down', () => {
    const withPattern = {
      ...VALUE_SCHEMA,
      properties: { value: { type: 'string' }, count: { type: 'number' } },
      patternProperties: { '^x-': { type: 'string' } },
      additionalProperties: false,
    };
    const missing = checkJsonShape(withPattern, { 'x-trace': 'abc' });
    expect(missing.ok === false && missing.issues).toContain("missing required 'value'");
    const mistyped = checkJsonShape(withPattern, { value: 'x', count: 'three' });
    expect(mistyped.ok === false && mistyped.issues).toContain("'count' should be number, not string");
  });

  it('caps the LENGTH of an unexpected key it echoes, not just how many', () => {
    const closed = { ...VALUE_SCHEMA, additionalProperties: false };
    const result = checkJsonShape(closed, { value: 'x', ['k'.repeat(100_000)]: 1 });
    expect(result.ok).toBe(false);
    // The caller chose that key name; the message it rides is ours to bound.
    expect(result.ok === false && result.issues.length).toBeLessThan(300);
    expect(result.ok === false && result.issues).toContain(`unexpected key '${'k'.repeat(40)}…'`);
  });
});

describe('a value nested where a flat one was asked for', () => {
  const nested = {
    type: 'object',
    properties: {
      user: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
    required: ['user'],
  };

  it('walks one level into a declared object property', () => {
    expect(checkJsonShape(nested, { user: { name: 'ada' } }).ok).toBe(true);
    const result = checkJsonShape(nested, { user: {} });
    expect(result.ok === false && result.issues).toContain("missing required 'user.name'");
  });

  it('names a nested type defect with its path', () => {
    const result = checkJsonShape(nested, { user: { name: 7 } });
    expect(result.ok === false && result.issues).toContain("'user.name' should be string, not number");
  });

  it('stops at depth 2 — a defect three levels down is not judged', () => {
    const deep = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            address: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
          },
        },
      },
    };
    // Level 3 ('city') is missing AND mistyped; both pass — out of the walk.
    expect(checkJsonShape(deep, { user: { address: {} } }).ok).toBe(true);
    expect(checkJsonShape(deep, { user: { address: { city: 42 } } }).ok).toBe(true);
    // Level 2 is still judged, so the cap is a depth limit, not a switch-off.
    const level2 = checkJsonShape(deep, { user: { address: 'Paris' } });
    expect(level2.ok === false && level2.issues).toContain("'user.address' should be object, not string");
  });
});

describe('a payload that is not even the right kind of thing', () => {
  it('renders the bare type it received', () => {
    const result = checkJsonShape(VALUE_SCHEMA, 'add milk');
    expect(result.ok === false && result.issues).toBe('expected { value: string }, received string');
  });

  it('says the same for an array, a null and a number', () => {
    expect(checkJsonShape(VALUE_SCHEMA, ['x']).ok === false).toBe(true);
    expect((checkJsonShape(VALUE_SCHEMA, null) as { issues: string }).issues).toContain('received null');
    expect((checkJsonShape(VALUE_SCHEMA, 42) as { issues: string }).issues).toContain('received number');
  });

  it('refuses an ABSENT payload when something was required', () => {
    const result = checkJsonShape(VALUE_SCHEMA, undefined);
    expect(result.ok === false && result.issues).toBe('expected { value: string }, received undefined');
  });

  it('accepts an absent payload when nothing was required — no key is missing from it', () => {
    const optional = { type: 'object', properties: { note: { type: 'string' } } };
    expect(checkJsonShape(optional, undefined).ok).toBe(true);
  });
});

describe('SILENCE OVER GUESSING: what this check refuses to have an opinion about', () => {
  it('passes anything under $ref: the real shape lives somewhere else', () => {
    const schema = { type: 'object', $ref: '#/definitions/Task', required: ['value'] };
    expect(checkJsonShape(schema, { nothing: 'like it' }).ok).toBe(true);
  });

  it('passes anything under anyOf/oneOf/allOf: a sibling type describes one branch of several', () => {
    for (const keyword of ['anyOf', 'oneOf', 'allOf']) {
      const schema = { type: 'object', [keyword]: [{ required: ['a'] }, { required: ['b'] }], required: ['a'] };
      expect(checkJsonShape(schema, { b: 1 }).ok).toBe(true);
    }
  });

  it('passes anything under enum/format/pattern: value constraints a shape check never sees', () => {
    for (const keyword of ['enum', 'format', 'pattern']) {
      const schema = { type: 'object', [keyword]: 'whatever', properties: { v: { type: 'string' } }, required: ['v'] };
      expect(checkJsonShape(schema, {}).ok).toBe(true);
    }
  });

  it('declines PER KEY: an undecidable property does not stop the rest of the object being judged', () => {
    const schema = {
      type: 'object',
      properties: { mode: { type: 'string', enum: ['a', 'b'] }, count: { type: 'number' } },
    };
    expect(checkJsonShape(schema, { mode: 99 }).ok).toBe(true); // enum ⇒ 'mode' unjudged
    const result = checkJsonShape(schema, { mode: 99, count: 'three' });
    expect(result.ok === false && result.issues).toContain("'count' should be number, not string");
    expect(result.ok === false && result.issues).not.toContain("'mode'");
  });

  it('passes an empty-properties schema for any object', () => {
    expect(checkJsonShape({ type: 'object', properties: {} }, { anything: 1 }).ok).toBe(true);
    expect(checkJsonShape({ type: 'object' }, { anything: 1 }).ok).toBe(true);
  });

  it('passes a schema that does not describe an object at all', () => {
    expect(checkJsonShape({ type: 'string' }, 42).ok).toBe(true);
    expect(checkJsonShape({ type: 'array', items: { type: 'string' } }, 'nope').ok).toBe(true);
  });

  it('passes a type union and an unknown type token', () => {
    const union = { type: 'object', properties: { id: { type: ['string', 'number'] } } };
    expect(checkJsonShape(union, { id: true }).ok).toBe(true);
    const unknown = { type: 'object', properties: { id: { type: 'uuid' } } };
    expect(checkJsonShape(unknown, { id: 7 }).ok).toBe(true);
  });

  it('passes when there is no schema object to read', () => {
    expect(checkJsonShape(undefined, { anything: 1 }).ok).toBe(true);
    expect(checkJsonShape('not a schema', { anything: 1 }).ok).toBe(true);
  });
});

describe('the expected shape, said in something a caller could type back', () => {
  it('marks optional keys with ?', () => {
    const schema = {
      type: 'object',
      properties: { value: { type: 'string' }, note: { type: 'string' } },
      required: ['value'],
    };
    expect(describeExpectedShape(schema)).toBe('{ value: string, note?: string }');
  });

  it('keeps the author’s declaration order', () => {
    const schema = { type: 'object', properties: { b: { type: 'number' }, a: { type: 'string' } } };
    expect(describeExpectedShape(schema)).toBe('{ b?: number, a?: string }');
  });

  it('renders a nested object flat — the full schema is already in expects', () => {
    const schema = {
      type: 'object',
      properties: { user: { type: 'object', properties: { name: { type: 'string' } } } },
    };
    expect(describeExpectedShape(schema)).toBe('{ user?: object }');
  });

  it('says any for a property with no declared type', () => {
    expect(describeExpectedShape({ type: 'object', properties: { v: { description: 'anything' } } })).toBe(
      '{ v?: any }',
    );
  });

  it('falls back to the bare declared type when there are no properties', () => {
    expect(describeExpectedShape({ type: 'object' })).toBe('object');
    expect(describeExpectedShape({ type: 'string' })).toBe('string');
    expect(describeExpectedShape(undefined)).toBe('object');
  });

  it('says “object” for a schema whose type is not a name it can print', () => {
    // A type UNION is legal JSON Schema and this flat rendering has no word for
    // it, so the caller is told the outer shape rather than a half-truth.
    expect(describeExpectedShape({ type: ['object', 'null'] })).toBe('object');
    expect(describeExpectedShape({ description: 'no type at all' })).toBe('object');
  });
});

describe('what actually arrived, described by keys and types — never by values', () => {
  it('renders an object’s own keys with their runtime types', () => {
    expect(describeReceivedShape({ name: 'add milk', count: 2, done: false })).toBe(
      '{ name: string, count: number, done: boolean }',
    );
  });

  it('renders a non-object as its bare type', () => {
    expect(describeReceivedShape('add milk')).toBe('string');
    expect(describeReceivedShape(['a'])).toBe('array');
    expect(describeReceivedShape(null)).toBe('null');
    expect(describeReceivedShape(undefined)).toBe('undefined');
    expect(describeReceivedShape({})).toBe('{}');
  });

  it('caps at 10 keys and marks the truncation', () => {
    const wide = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`k${i}`, i]));
    const rendered = describeReceivedShape(wide);
    expect(rendered).toContain('k0: number');
    expect(rendered).toContain('k9: number');
    expect(rendered).not.toContain('k10');
    expect(rendered.endsWith(', … }')).toBe(true);
  });

  it('never carries a value into the string', () => {
    const rendered = describeReceivedShape({ token: 'sk-secret-42', note: 'buy milk' });
    expect(rendered).toBe('{ token: string, note: string }');
  });

  it('caps a key NAME as well as the key count — the caller chose that name', () => {
    const rendered = describeReceivedShape({ ['k'.repeat(100_000)]: 1 });
    expect(rendered).toBe(`{ ${'k'.repeat(40)}…: number }`);
    // A real key is never touched: the cap is a ceiling, not a formatter.
    expect(describeReceivedShape({ deliveryInstructionsForTheCourier: 'x' })).toBe(
      '{ deliveryInstructionsForTheCourier: string }',
    );
  });
});

describe('the field report that caused this, reproduced verbatim', () => {
  it('teaches {value} to a planner that guessed {name}', () => {
    const result = checkJsonShape(VALUE_SCHEMA, { name: 'add milk' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.issues).toBe(
      "missing required 'value' — expected { value: string }, received { name: string }",
    );
  });
});
