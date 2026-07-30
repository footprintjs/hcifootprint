/**
 * role.ts — an ARIA role from two sources only, and `''` when neither answers.
 *
 * The assertions worth reading twice are the EMPTY ones. Every `''` below is an
 * element the sensor refuses to promote to a control, and each refusal is what
 * stops a human's name landing on motion the sensor did not recognise.
 *
 * Mutation proof: role.ts did not exist before this change, so every test here
 * fails against pre-change source (`Cannot find module './role.js'`).
 */
import { describe, expect, it } from 'vitest';
import { computeRole } from '../src/sensor/role.js';
import { el } from './sensor-fixture.js';

describe('an explicit role attribute wins — the app said so', () => {
  it('takes the attribute over the native tag', () => {
    expect(computeRole(el('div', { attrs: { role: 'button' } }))).toBe('button');
    expect(computeRole(el('button', { attrs: { role: 'link' } }))).toBe('link');
  });

  it('reads the FIRST token of a role list, exactly as a browser does', () => {
    expect(computeRole(el('div', { attrs: { role: 'switch checkbox' } }))).toBe('switch');
  });

  it('folds case, because ARIA tokens are case-insensitive', () => {
    expect(computeRole(el('div', { attrs: { role: 'BUTTON' } }))).toBe('button');
  });

  it('falls through to native semantics when the attribute is blank', () => {
    expect(computeRole(el('button', { attrs: { role: '   ' } }))).toBe('button');
  });
});

describe('the native table — short, and every row is a mapping HTML publishes', () => {
  it('maps the tags it knows', () => {
    expect(computeRole(el('button'))).toBe('button');
    expect(computeRole(el('a', { attrs: { href: '/x' } }))).toBe('link');
    expect(computeRole(el('textarea'))).toBe('textbox');
    expect(computeRole(el('select'))).toBe('combobox');
  });

  it('a <select multiple> and a sized <select> are listboxes, from the attributes the author wrote', () => {
    expect(computeRole(el('select', { attrs: { multiple: '' } }))).toBe('listbox');
    expect(computeRole(el('select', { attrs: { size: '4' } }))).toBe('listbox');
    expect(computeRole(el('select', { attrs: { size: '1' } }))).toBe('combobox');
    // A size the author fat-fingered is not a listbox claim.
    expect(computeRole(el('select', { attrs: { size: 'lots' } }))).toBe('combobox');
  });

  it('an <input> takes its role from `type`, defaulting to text', () => {
    expect(computeRole(el('input'))).toBe('textbox');
    expect(computeRole(el('input', { attrs: { type: 'EMAIL' } }))).toBe('textbox');
    expect(computeRole(el('input', { attrs: { type: 'submit' } }))).toBe('button');
    expect(computeRole(el('input', { attrs: { type: 'checkbox' } }))).toBe('checkbox');
    expect(computeRole(el('input', { attrs: { type: 'radio' } }))).toBe('radio');
    expect(computeRole(el('input', { attrs: { type: 'search' } }))).toBe('searchbox');
    expect(computeRole(el('input', { attrs: { type: 'number' } }))).toBe('spinbutton');
    expect(computeRole(el('input', { attrs: { type: 'range' } }))).toBe('slider');
  });
});

describe('no honest answer means NO role — the refusals', () => {
  it('an anchor with no href is not a link', () => {
    expect(computeRole(el('a'))).toBe('');
  });

  it('a password field is not a textbox — else it would answer to a textbox locator', () => {
    expect(computeRole(el('input', { attrs: { type: 'password' } }))).toBe('');
    expect(computeRole(el('input', { attrs: { type: 'hidden' } }))).toBe('');
  });

  it('a colour or file picker has no role in this subset', () => {
    expect(computeRole(el('input', { attrs: { type: 'color' } }))).toBe('');
    expect(computeRole(el('input', { attrs: { type: 'file' } }))).toBe('');
  });

  it('an unrecognised element is never promoted to "probably a button"', () => {
    expect(computeRole(el('div'))).toBe('');
    expect(computeRole(el('p', { text: 'Send' }))).toBe('');
    expect(computeRole(el('span', { attrs: { class: 'btn btn-primary' } }))).toBe('');
  });
});
