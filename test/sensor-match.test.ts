/**
 * match.ts — the two evidence levels, asked in order, and the four honest answers.
 *
 * The order is the whole point: a DECLARATION beats a name match, at every hop and
 * on the same element, because the app's own statement outranks the sensor's
 * reading of the page. And the two SILENT answers are what keep the report stream
 * worth reading — a control the graph knows, reached at the wrong moment, is not
 * an off-graph advisory.
 *
 * Mutation proof: match.ts did not exist before this change, so every test here
 * fails against pre-change source.
 */
import { describe, expect, it } from 'vitest';
import type { AvailableEdge } from '../src/index.js';
import { buildBindingIndex } from '../src/sensor/binding-index.js';
import { createControlIndex } from '../src/sensor/control-index.js';
import type { ControlIndex } from '../src/sensor/control-index.js';
import { candidateLabel, matchElement } from '../src/sensor/match.js';
import type { SensorEventType } from '../src/sensor/cadence.js';
import { FakeElement, Surface, desk, el, mountDesk } from './sensor-fixture.js';

function ask(
  target: FakeElement,
  eventType: SensorEventType = 'click',
  options: { declarations?: ControlIndex; state?: Record<string, unknown>; surface?: Surface } = {},
) {
  const mounted = mountDesk(options.state === undefined ? {} : { state: options.state });
  const surface = options.surface ?? mounted.surface;
  const declarations = options.declarations ?? createControlIndex();
  const index = buildBindingIndex({
    edges: mounted.session.available().edges,
    standsDown: () => false,
    declarations,
    cadence: 'commit',
    canDebounce: true,
  });
  return matchElement(index, declarations, 'commit', eventType, target, surface, surface.asDocument());
}

describe('RECOGNISED — a unique locator match is the act', () => {
  it('names the edge a clicked button answers to', () => {
    const button = el('button', { text: 'Send' });
    expect(ask(button)).toMatchObject({ kind: 'one', candidate: { edge: desk.send } });
  });

  it('climbs from the inner element the human actually hit', () => {
    const span = el('span', { text: 'Send' });
    const button = el('button', { children: [span] });
    expect(ask(span)).toMatchObject({ kind: 'one', candidate: { edge: desk.send }, element: button });
  });

  it('NEAREST wins: a declared button inside a declared container is the button', () => {
    const inner = el('button', { text: 'Send' });
    const outer = el('div', { attrs: { role: 'button' }, text: 'Archive', children: [inner] });
    expect(ask(inner)).toMatchObject({ kind: 'one', candidate: { edge: desk.send } });
    expect(ask(outer)).toMatchObject({ kind: 'one', candidate: { edge: desk.archive } });
  });

  it('carries no declaration, so nothing downstream can attach a value to it', () => {
    const outcome = ask(el('button', { text: 'Send' }));
    expect(outcome.kind === 'one' && outcome.declaration).toBeUndefined();
  });
});

describe('RECOGNISED — two or more candidates is REFUSED, never a coin flip', () => {
  it('two edges claiming one locator', () => {
    const outcome = ask(el('button', { text: 'Save' }));
    expect(outcome.kind).toBe('many');
    expect(outcome.kind === 'many' && [...outcome.candidates].sort()).toEqual([desk.save, desk.saveDraft].sort());
  });

  it('a repeats container with two live rows is genuinely ambiguous from role+name alone', () => {
    const outcome = ask(el('button', { text: 'Reply' }), 'click', { state: { threadIds: ['t-1', 't-2'] } });
    expect(outcome.kind).toBe('many');
    expect(outcome.kind === 'many' && [...outcome.candidates]).toEqual([
      `${desk.reply}[t-1]`,
      `${desk.reply}[t-2]`,
    ]);
  });

  it('ONE live row is not ambiguous, and the candidate carries the instance', () => {
    const outcome = ask(el('button', { text: 'Reply' }), 'click', { state: { threadIds: ['t-9'] } });
    expect(outcome).toMatchObject({ kind: 'one', candidate: { edge: desk.reply, instance: 't-9' } });
  });

  it('NO live rows is not a thing that could have happened — the walk keeps climbing', () => {
    const outcome = ask(el('button', { text: 'Reply' }), 'click', { state: { threadIds: [] } });
    expect(outcome.kind).toBe('silent');
  });
});

describe('DECLARED beats RECOGNISED, everywhere', () => {
  it('a declaration on the very element a locator also claims', () => {
    // 'Save' is the ambiguous locator. A declaration on that element resolves it —
    // which is the point: the app's statement outranks the sensor's reading.
    const declarations = createControlIndex();
    const button = el('button', { text: 'Save' });
    declarations.attach({ edge: desk.archive, element: button });
    expect(ask(button, 'click', { declarations })).toMatchObject({
      kind: 'one',
      candidate: { edge: desk.archive },
    });
  });

  it('a declaration on an element with no role at all', () => {
    const declarations = createControlIndex();
    const div = el('div');
    declarations.attach({ edge: desk.refresh, element: div });
    const outcome = ask(div, 'click', { declarations });
    expect(outcome).toMatchObject({ kind: 'one', candidate: { edge: desk.refresh } });
    expect(outcome.kind === 'one' && outcome.declaration?.edge).toBe(desk.refresh);
  });

  it('a nearer LOCATOR match still wins over a farther declaration', () => {
    const declarations = createControlIndex();
    const inner = el('button', { text: 'Send' });
    const outer = el('div', { children: [inner] });
    declarations.attach({ edge: desk.archive, element: outer });
    expect(ask(inner, 'click', { declarations })).toMatchObject({
      kind: 'one',
      candidate: { edge: desk.send },
    });
  });

  it('a declaration carries its instance, which no locator can', () => {
    const declarations = createControlIndex();
    const button = el('button', { text: 'Reply' });
    declarations.attach({ edge: desk.reply, element: button, instance: 't-2' });
    expect(ask(button, 'click', { declarations })).toMatchObject({
      kind: 'one',
      candidate: { edge: desk.reply, instance: 't-2' },
    });
  });
});

describe('the two SILENT answers', () => {
  it('nothing role-bearing was touched — clicking a paragraph is not a missing declaration', () => {
    const paragraph = el('p', { text: 'Send' });
    el('div', { children: [paragraph] });
    expect(ask(paragraph).kind).toBe('silent');
  });

  it('a KNOWN control reached at the wrong moment is silent, not off-graph', () => {
    // Enter on a button fires keydown, and then the browser generates the click
    // that IS this control's moment. The keydown is not an advisory.
    const button = el('button', { text: 'Send' });
    expect(ask(button, 'keydown').kind).toBe('silent');
  });

  it('a control whose edge is UNWATCHED is silent too — coverage already said why once', () => {
    // 'Preview' is hover-bound, so it can never be recognised; a click on it must
    // not become per-click off-graph noise about something already announced.
    const button = el('button', { text: 'Preview' });
    expect(ask(button).kind).toBe('silent');
  });

  it('a DECLARED control reached at the wrong moment is silent as well', () => {
    const declarations = createControlIndex();
    const input = el('input', { attrs: { type: 'text' } });
    declarations.attach({ edge: desk.compose, element: input, value: () => ({ message: 'x' }) });
    // The declaration commits on `change`; a click on the field is not its moment.
    expect(ask(input, 'click', { declarations }).kind).toBe('silent');
    expect(ask(input, 'change', { declarations })).toMatchObject({ kind: 'one' });
  });
});

describe('off-graph — a real control the graph never declared', () => {
  it('names the deepest role-bearing element the human actually touched', () => {
    const inner = el('button', { text: 'Delete forever' });
    el('div', { attrs: { role: 'toolbar' }, children: [inner] });
    expect(ask(inner)).toEqual({ kind: 'off-graph', role: 'button', name: 'Delete forever' });
  });

  it('an unnamed control is still a control, reported with an empty name', () => {
    expect(ask(el('button'))).toEqual({ kind: 'off-graph', role: 'button', name: '' });
  });
});

describe('the walk is bounded — a cyclic tree must not hang the page', () => {
  it('answers instead of looping forever', () => {
    const loop = el('div');
    // A malformed tree, built deliberately: the parent chain never ends.
    (loop as { parentElement: unknown }).parentElement = loop;
    expect(ask(loop).kind).toBe('silent');
  });
});

describe('candidateLabel — the id[instance] notation the library already uses', () => {
  it('bare edge, or edge plus instance', () => {
    expect(candidateLabel({ edge: desk.send })).toBe(desk.send);
    expect(candidateLabel({ edge: desk.reply, instance: 't-1' })).toBe(`${desk.reply}[t-1]`);
  });
});

describe('a locator match resolves against the tree the element lives in', () => {
  it('an aria-labelledby name is read through the root that owns the ids', () => {
    const mounted = mountDesk();
    const heading = el('span', { attrs: { id: 'lbl' }, text: 'Send' });
    const button = el('button', { attrs: { 'aria-labelledby': 'lbl' } });
    mounted.surface.mount(el('div', { children: [heading, button] }));
    const declarations = createControlIndex();
    const index = buildBindingIndex({
      edges: mounted.session.available().edges,
      standsDown: () => false,
      declarations,
      cadence: 'commit',
      canDebounce: true,
    });
    expect(
      matchElement(index, declarations, 'commit', 'click', button, mounted.surface, mounted.surface.asDocument()),
    ).toMatchObject({ kind: 'one', candidate: { edge: desk.send } });
  });
});

describe('an edge with no live locator match is a COVERAGE fact, not an event', () => {
  it('the sensor never claims a locator resolves to a real element', () => {
    // 'Archive' is watched, and nothing on this page answers to it. That shows up
    // as an edge with zero reported rows — never as an invented one.
    const edges: readonly AvailableEdge[] = mountDesk().session.available().edges;
    expect(edges.some((e) => e.affordanceId === desk.archive)).toBe(true);
    expect(ask(el('p', { text: 'Archive' })).kind).toBe('silent');
  });
});
