/**
 * @vitest-environment jsdom
 *
 * computeAccessibleName — a documented SUBSET of accname, and the empty string
 * everywhere else.
 *
 * The last describe block is the load-bearing one: unsupported constructs must
 * produce '' and NOT a near-miss. An empty name matches no locator, the click
 * becomes an off-graph report, and nothing is written to the ledger — which is
 * the whole difference between "I did not recognize this" and a guess.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Move the aria-label rung above aria-labelledby → "aria-labelledby wins over
 *   aria-label" fails.
 * - Drop the input-button `value` rung → "an <input type=submit> is named by its
 *   value" fails, and every submit button on the page becomes unnamable.
 * - Return the placeholder as a fallback → "a placeholder is not a name" fails.
 */
import { describe, expect, it } from 'vitest';
import { computeAccessibleName } from '../src/sensor/accessible-name.js';
import type { SensorDocument } from '../src/sensor/index.js';
import { mount, pick } from './sensor-fixture.js';

function nameOf(html: string): string {
  mount(html);
  return computeAccessibleName(pick('#probe'), document as unknown as SensorDocument);
}

describe('the ladder, rung by rung, in the spec order', () => {
  it('aria-labelledby wins over aria-label', () => {
    expect(
      nameOf('<span id="label">Compose</span><button id="probe" aria-labelledby="label" aria-label="Other">x</button>'),
    ).toBe('Compose');
  });

  it('aria-labelledby joins several references with a space', () => {
    expect(
      nameOf('<span id="a">Clear</span><span id="b">archive</span><button id="probe" aria-labelledby="a b">x</button>'),
    ).toBe('Clear archive');
  });

  it('aria-label wins over the visible text', () => {
    expect(nameOf('<button id="probe" aria-label="Compose">✎</button>')).toBe('Compose');
  });

  it('a form control takes the name of its <label for=…>', () => {
    expect(nameOf('<label for="probe">Full name</label><input id="probe">')).toBe('Full name');
  });

  it('a wrapping <label> names the control inside it', () => {
    expect(nameOf('<label>Full name <input id="probe"></label>')).toBe('Full name');
  });

  it('an <input type=submit> is named by its value — it has no child text to read', () => {
    expect(nameOf('<input id="probe" type="submit" value="Save">')).toBe('Save');
  });

  it('visible text names a button, including text inside nested elements', () => {
    expect(nameOf('<button id="probe"><span>Com</span><span>pose</span></button>')).toBe('Compose');
  });

  it('title is the last rung, and only when nothing above answered', () => {
    expect(nameOf('<button id="probe" title="Compose"></button>')).toBe('Compose');
    expect(nameOf('<button id="probe" title="Compose">Reply</button>')).toBe('Reply');
  });

  it('whitespace is collapsed, so a label broken across lines still matches', () => {
    expect(nameOf('<button id="probe">  Clear\n   archive  </button>')).toBe('Clear archive');
  });

  it('a button inside a label keeps its own text — only form controls take a label', () => {
    expect(nameOf('<label>Full name <button id="probe">Reset</button></label>')).toBe('Reset');
  });
});

describe('what the subset does NOT support answers with silence, never a near-miss', () => {
  it('a placeholder is not a name', () => {
    expect(nameOf('<input id="probe" placeholder="Your name">')).toBe('');
  });

  it('alt text on a nested image is not a name (a known gap, stated)', () => {
    expect(nameOf('<button id="probe"><img alt="Compose"></button>')).toBe('');
  });

  it('a <fieldset><legend> does not name the controls inside it', () => {
    expect(nameOf('<fieldset><legend>Profile</legend><input id="probe"></fieldset>')).toBe('');
  });

  it('an aria-labelledby pointing at nothing yields no name', () => {
    expect(nameOf('<button id="probe" aria-labelledby="missing"></button>')).toBe('');
  });

  it('an empty aria-label falls through rather than naming the control ""', () => {
    expect(nameOf('<button id="probe" aria-label="   ">Reply</button>')).toBe('Reply');
  });

  it('with no document, the aria-labelledby rung simply does not apply', () => {
    mount('<span id="label">Compose</span><button id="probe" aria-labelledby="label">Fallback</button>');
    expect(computeAccessibleName(pick('#probe'))).toBe('Fallback');
  });
});
