/**
 * @vitest-environment jsdom
 *
 * computeRole — the first half of the locator vocabulary, against real DOM
 * elements rather than stand-ins.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Drop the explicit-role branch → "an explicit role attribute wins" fails.
 * - Return 'link' for a bare <a> → "an anchor with no href is not a link" fails.
 * - Return 'textbox' for input[type=password] → "a password field has no role"
 *   fails, which is the one that matters: it would let a password answer to a
 *   textbox locator.
 * - Make the fallback return 'button' instead of '' → "an element outside the
 *   table has no role" fails, and with it the whole no-guessing stance.
 */
import { describe, expect, it } from 'vitest';
import { computeRole } from '../src/sensor/role.js';
import { mount, pick } from './sensor-fixture.js';

function roleOf(html: string): string {
  mount(html);
  return computeRole(pick('#probe'));
}

describe('computeRole — the app first, then a named table of native semantics', () => {
  it('an explicit role attribute wins over the tag', () => {
    expect(roleOf('<div id="probe" role="switch">x</div>')).toBe('switch');
    expect(roleOf('<button id="probe" role="link">x</button>')).toBe('link');
  });

  it('reads a role token LIST the way a browser does — the first token', () => {
    expect(roleOf('<div id="probe" role="  switch  button ">x</div>')).toBe('switch');
    // An empty attribute says nothing, so the native reading takes over.
    expect(roleOf('<button id="probe" role="">x</button>')).toBe('button');
  });

  it.each([
    ['<button id="probe">Go</button>', 'button'],
    ['<a id="probe" href="/x">Go</a>', 'link'],
    ['<textarea id="probe"></textarea>', 'textbox'],
    ['<select id="probe"><option>a</option></select>', 'combobox'],
    ['<select id="probe" multiple><option>a</option></select>', 'listbox'],
    ['<select id="probe" size="4"><option>a</option></select>', 'listbox'],
    ['<input id="probe">', 'textbox'],
    ['<input id="probe" type="text">', 'textbox'],
    ['<input id="probe" type="email">', 'textbox'],
    ['<input id="probe" type="checkbox">', 'checkbox'],
    ['<input id="probe" type="radio">', 'radio'],
    ['<input id="probe" type="submit" value="Save">', 'button'],
    ['<input id="probe" type="button" value="Save">', 'button'],
    ['<input id="probe" type="reset" value="Undo">', 'button'],
    ['<input id="probe" type="image">', 'button'],
    ['<input id="probe" type="search">', 'searchbox'],
    ['<input id="probe" type="number">', 'spinbutton'],
    ['<input id="probe" type="range">', 'slider'],
  ])('%s presents as %s', (html, expected) => {
    expect(roleOf(html)).toBe(expected);
  });

  it('an anchor with no href is not a link', () => {
    expect(roleOf('<a id="probe">Go</a>')).toBe('');
  });

  it('a password field has no role — HTML maps it to none, so neither do we', () => {
    expect(roleOf('<input id="probe" type="password">')).toBe('');
  });

  it('hidden, colour and file inputs have no role either', () => {
    expect(roleOf('<input id="probe" type="hidden">')).toBe('');
    expect(roleOf('<input id="probe" type="color">')).toBe('');
    expect(roleOf('<input id="probe" type="file">')).toBe('');
  });

  it('an element outside the table has no role — the sensor never promotes a guess', () => {
    expect(roleOf('<div id="probe">Looks clickable</div>')).toBe('');
    expect(roleOf('<span id="probe">Save</span>')).toBe('');
    expect(roleOf('<p id="probe">Prose</p>')).toBe('');
  });
});
