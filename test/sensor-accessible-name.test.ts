/**
 * accessible-name.ts — a documented SUBSET of accname, in the spec's order, and
 * `''` for everything outside it.
 *
 * The load-bearing test here is the Reset button: HTML calls `<button>` labelable,
 * so the DOM reports the enclosing `<label>` in `button.labels`, and honouring it
 * would name a Reset button 'Full name Reset'. That is a real bug the
 * `takesNameFromLabel` gate already avoids, and it is asserted rather than assumed.
 *
 * Mutation proof: accessible-name.ts did not exist before this change, so every
 * test here fails against pre-change source.
 */
import { describe, expect, it } from 'vitest';
import { computeAccessibleName, normalizeName } from '../src/sensor/accessible-name.js';
import { FakeElement, FakeView, Surface, el } from './sensor-fixture.js';

/** A surface that can resolve ids, for the aria-labelledby rung. */
function surfaceWith(...roots: readonly FakeElement[]): Surface {
  const surface = new Surface(new FakeView('/inbox'));
  surface.mount(...roots);
  return surface;
}

describe('the ladder, in the spec order', () => {
  it('aria-labelledby wins, resolved against the tree the element lives in', () => {
    const heading = el('h2', { attrs: { id: 'title' }, text: 'Compose' });
    const button = el('button', { attrs: { 'aria-labelledby': 'title', 'aria-label': 'ignored' }, text: 'also ignored' });
    const surface = surfaceWith(el('div', { children: [heading, button] }));
    expect(computeAccessibleName(button, surface.asDocument())).toBe('Compose');
  });

  it('joins several labelledby ids in the authored order', () => {
    const one = el('span', { attrs: { id: 'a' }, text: 'Clear' });
    const two = el('span', { attrs: { id: 'b' }, text: 'archive' });
    const button = el('button', { attrs: { 'aria-labelledby': 'a  b' } });
    const surface = surfaceWith(el('div', { children: [one, two, button] }));
    expect(computeAccessibleName(button, surface.asDocument())).toBe('Clear archive');
  });

  it('an unresolvable labelledby degrades to the next rung, never to a guess', () => {
    const button = el('button', { attrs: { 'aria-labelledby': 'nowhere', 'aria-label': 'Send' } });
    const surface = surfaceWith(button);
    expect(computeAccessibleName(button, surface.asDocument())).toBe('Send');
  });

  it('no document at all simply skips the rung that needs one', () => {
    const button = el('button', { attrs: { 'aria-labelledby': 'title' }, text: 'Send' });
    expect(computeAccessibleName(button)).toBe('Send');
  });

  it('aria-label beats content', () => {
    expect(computeAccessibleName(el('button', { attrs: { 'aria-label': 'Send' }, text: 'Nope' }))).toBe('Send');
  });

  it('a field takes the label the DOM already resolved', () => {
    const label = el('label', { text: 'Full name' });
    expect(computeAccessibleName(el('input', { labels: [label] }))).toBe('Full name');
  });

  it('a wrapping <label> names a field even when the DOM reports no labels list', () => {
    const input = el('input');
    surfaceWith(el('label', { text: 'Message', children: [input] }));
    expect(computeAccessibleName(input)).toBe('Message');
  });

  it("an <input type=submit> is named by its value — HTML's own use of that attribute", () => {
    expect(computeAccessibleName(el('input', { attrs: { type: 'submit' }, value: 'Save' }))).toBe('Save');
    expect(computeAccessibleName(el('input', { attrs: { type: 'reset' }, value: 'Reset' }))).toBe('Reset');
  });

  it('a non-string value is not a name — the port cannot promise the DOM is uniform here', () => {
    expect(computeAccessibleName(el('input', { attrs: { type: 'submit' }, value: 7 }))).toBe('');
  });

  it('visible text, then title, then nothing', () => {
    expect(computeAccessibleName(el('button', { text: ' Send \n now ' }))).toBe('Send now');
    expect(computeAccessibleName(el('button', { attrs: { title: 'Send' } }))).toBe('Send');
    expect(computeAccessibleName(el('button'))).toBe('');
  });
});

describe('THE RESET-BUTTON BUG — a button speaks for itself', () => {
  it("does not take the enclosing label's text, even though the DOM offers it", () => {
    // Exactly the shape that produced 'Full name Reset': the DOM reports the
    // wrapping <label> in button.labels because HTML calls <button> labelable.
    const label = el('label', { text: 'Full name' });
    const button = el('button', { labels: [label], text: 'Reset' });
    expect(computeAccessibleName(button)).toBe('Reset');
  });
});

describe('outside the subset means SILENCE, never a nearest guess', () => {
  it('placeholder is not a name', () => {
    expect(computeAccessibleName(el('input', { attrs: { placeholder: 'Your message' } }))).toBe('');
  });

  it("a nested image's alt is not a name", () => {
    const button = el('button', { children: [el('img', { attrs: { alt: 'Send' } })] });
    expect(computeAccessibleName(button)).toBe('');
  });
});

describe('normalizeName — ONE reading for both sides of a match', () => {
  it('collapses whitespace runs and trims', () => {
    expect(normalizeName('Clear\n   archive ')).toBe('Clear archive');
  });

  it('does NOT fold case: Send and send are two things an app may render', () => {
    expect(normalizeName('Send')).not.toBe(normalizeName('send'));
  });
});

describe('a rung that is PRESENT but says nothing falls through to the next one', () => {
  it('an aria-label of only whitespace is not a name', () => {
    expect(computeAccessibleName(el('button', { attrs: { 'aria-label': '   ' }, text: 'Send' }))).toBe('Send');
  });

  it('an aria-labelledby of only whitespace resolves nothing rather than looking up ""', () => {
    const button = el('button', { attrs: { 'aria-labelledby': '   ' }, text: 'Send' });
    expect(computeAccessibleName(button, surfaceWith(button).asDocument())).toBe('Send');
  });

  it('a label whose text is empty leaves the field to the next rung', () => {
    const blank = el('label', { text: '  ' });
    const field = el('input', { labels: [blank], attrs: { title: 'Full name' } });
    expect(computeAccessibleName(field)).toBe('Full name');
  });

  it('a WRAPPING label whose text is empty does the same', () => {
    const field = el('input', { attrs: { title: 'Full name' } });
    el('label', { text: '  ', children: [field] });
    expect(computeAccessibleName(field)).toBe('Full name');
  });

  it("an input button whose value is blank is not named ''", () => {
    expect(
      computeAccessibleName(el('input', { attrs: { type: 'submit', title: 'Save' }, value: '   ' })),
    ).toBe('Save');
  });

  it('a title of only whitespace is the end of the ladder — silence', () => {
    expect(computeAccessibleName(el('button', { attrs: { title: '  ' } }))).toBe('');
  });

  it('a hole in the DOM’s own labels list is skipped, not read as a name', () => {
    // `labels` is a live NodeList in a browser; the sensor reads it by index and
    // must survive one that does not answer at that index.
    const holey = [undefined] as unknown as readonly FakeElement[];
    const field = el('input', { labels: holey, attrs: { title: 'Full name' } });
    expect(computeAccessibleName(field)).toBe('Full name');
  });
});

describe('finding the label a field is written INSIDE of', () => {
  it('climbs past the markup between the field and its label', () => {
    const field = el('input');
    el('label', { text: 'Full name', children: [el('span', { children: [field] })] });
    expect(computeAccessibleName(field)).toBe('Full name');
  });
});
