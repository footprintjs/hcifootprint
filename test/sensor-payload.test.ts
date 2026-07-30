/**
 * The one payload question the sensor answers, and the answer is almost always
 * "only the app can".
 *
 * THE LAW UNDER TEST: the sensor never sends a payload. It recognizes THAT a
 * human acted on a declared control; it does not scrape what the value was. An
 * action that takes a value is declared UNWATCHED with the sentence saying where
 * the value has to come from — honest absence, not a plausible-looking guess.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Make payloadVerdict return ok for a JSON-Schema `expects` (the "just read
 *   .value" version) → "an action that declares any input contract is refused"
 *   fails, and with it the whole law.
 * - Change the local NO_INPUT literal to 'no-input' → "the sentinel is the same
 *   string the library serves" fails: the drift guard is the point of that test.
 */
import { describe, expect, it } from 'vitest';
import { payloadVerdict } from '../src/sensor/payload.js';
import { NO_INPUT, expectsOf } from '../src/traverse/expects.js';

describe('the sentinel is not duplicated in spirit — it is pinned', () => {
  it('the sentinel is the same string the library serves', () => {
    // src/sensor may not value-import expects.ts (it drags footprintjs), so the
    // word is restated there. A TEST may import both, and this is that test: if
    // anyone renames the sentinel, this fails rather than the sensor silently
    // deciding every no-input control now takes a value.
    expect(payloadVerdict(NO_INPUT).ok).toBe(true);
    expect(payloadVerdict('none').ok).toBe(true);
    // And the same word really is what a noInput edge advertises.
    expect(expectsOf({ noInput: true })).toBe(NO_INPUT);
  });
});

describe('what the sensor CAN report — actions with no value to answer for', () => {
  it("the author's explicit 'none' passes", () => {
    expect(payloadVerdict('none')).toEqual({ ok: true });
  });

  it('an absent contract passes — silence is not a shape the sensor has to fill', () => {
    // ABSENCE means the author declared no input contract at all. Sending no
    // payload is not a claim about a shape, and fire()'s payload gate only runs
    // where a schema exists (session.ts:882-895), so nothing is bypassed.
    expect(payloadVerdict(undefined)).toEqual({ ok: true });
  });
});

describe('what it refuses — anything that takes a value', () => {
  it('an action that declares any input contract is refused', () => {
    for (const expects of [
      { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      { type: 'object', properties: { n: { type: 'number' } } },
      { type: 'string' },
      'validated at fire time (non-serializable validator)',
    ]) {
      expect(payloadVerdict(expects).ok, JSON.stringify(expects)).toBe(false);
    }
  });

  it('the refusal names where the value has to come from, not just that it failed', () => {
    const verdict = payloadVerdict({ type: 'object', properties: { q: { type: 'string' } } });
    if (verdict.ok) throw new Error('expected a refusal');
    expect(verdict.reason).toContain('never reads one off the DOM');
    expect(verdict.reason).toContain('where the value is declared');
    // It says WHY the DOM is the wrong source, so the reader learns the rule
    // rather than just the verdict.
    expect(verdict.reason).toContain('what the app meant');
  });

  it('a schema-shaped contract is refused even when it requires nothing', () => {
    // "No required keys" is not "no value": the control still holds one, and the
    // sensor still will not read it.
    expect(payloadVerdict({ type: 'object', properties: {} }).ok).toBe(false);
  });
});
