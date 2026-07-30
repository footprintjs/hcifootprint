/**
 * @vitest-environment jsdom
 *
 * Recognition: an event target → exactly one edge, none, or an honest refusal to
 * pick between several.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Match on `event.target` alone instead of walking ancestors → "a click on the
 *   span inside a button resolves to the button" fails.
 * - Return the first candidate when several match → "two live edges with one
 *   role and name are refused, not guessed" fails, which is the whole honesty
 *   claim in one test.
 * - Drop the eventType from indexKey → "a click never matches a change-actuated
 *   binding" fails.
 * - Expand a zero-instance edge to one candidate with no instance → "an edge with
 *   no live instance could not have happened" fails and the sensor starts firing
 *   rows for rows that are not on screen.
 */
import { describe, expect, it } from 'vitest';
import type { AvailableEdge } from '../src/index.js';
import { buildBindingIndex } from '../src/sensor/binding-index.js';
import { matchElement } from '../src/sensor/match.js';
import type { SensorDocument, SensorRoot } from '../src/sensor/index.js';
import { mount, pick } from './sensor-fixture.js';

function edge(id: string, role: string, name: string, actuation = 'click', instances?: string[]): AvailableEdge {
  return {
    affordanceId: id,
    description: 'x',
    role: 'action',
    evidence: [],
    highEffect: false,
    binding: { kind: 'element', locator: { role, name }, actuation },
    ...(instances !== undefined ? { instances } : {}),
  } as AvailableEdge;
}

function indexOf(...edges: AvailableEdge[]) {
  return buildBindingIndex(edges);
}

const doc = () => document as unknown as SensorDocument;

describe('the ancestor walk', () => {
  it('a click on the span inside a button resolves to the button', () => {
    const root = mount('<button id="b"><span id="s">Compose</span></button>');
    const outcome = matchElement(indexOf(edge('inbox.compose', 'button', 'Compose')), 'click', pick('#s'), root, doc());
    expect(outcome.kind).toBe('one');
    if (outcome.kind !== 'one') return;
    expect(outcome.candidate.binding.edge).toBe('inbox.compose');
    // The ELEMENT reported is the control, not the span the pointer happened to hit.
    expect((outcome.element as unknown as HTMLElement).id).toBe('b');
  });

  it('the NEAREST declared control wins over an enclosing one', () => {
    const root = mount(
      '<div role="toolbar" aria-label="Actions"><button id="b">Compose</button></div>',
    );
    const outcome = matchElement(
      indexOf(edge('inbox.compose', 'button', 'Compose'), edge('inbox.toolbar', 'toolbar', 'Actions')),
      'click',
      pick('#b'),
      root,
      doc(),
    );
    expect(outcome.kind === 'one' && outcome.candidate.binding.edge).toBe('inbox.compose');
  });

  it('the walk stops at the delegation root', () => {
    document.body.innerHTML = '<div role="button" id="outside"><div id="root"><span id="s">x</span></div></div>';
    const root = document.querySelector('#root') as unknown as SensorRoot;
    const outcome = matchElement(indexOf(edge('a', 'button', 'x')), 'click', pick('#s'), root, doc());
    // #outside carries the matching role, but it is above the root the app handed
    // in — a sensor must not report on a tree it was not pointed at.
    expect(outcome.kind).toBe('none');
  });
});

describe('the three answers', () => {
  it('one live edge with this role and name is a match', () => {
    const root = mount('<button id="b">Compose</button>');
    const outcome = matchElement(indexOf(edge('inbox.compose', 'button', 'Compose')), 'click', pick('#b'), root, doc());
    expect(outcome.kind).toBe('one');
  });

  it('no live edge is none, and names the control the human actually touched', () => {
    const root = mount('<button id="b">Archive</button>');
    const outcome = matchElement(indexOf(edge('inbox.compose', 'button', 'Compose')), 'click', pick('#b'), root, doc());
    expect(outcome).toEqual({ kind: 'none', role: 'button', name: 'Archive' });
  });

  it('a click on nothing control-shaped reports no role at all', () => {
    const root = mount('<p id="p">Just prose</p>');
    const outcome = matchElement(indexOf(edge('inbox.compose', 'button', 'Compose')), 'click', pick('#p'), root, doc());
    expect(outcome).toEqual({ kind: 'none', role: '', name: '' });
  });

  it('two live edges with one role and name are refused, not guessed', () => {
    const root = mount('<button id="b">Reply</button>');
    const outcome = matchElement(
      indexOf(edge('inbox.reply', 'button', 'Reply'), edge('archive.reply', 'button', 'Reply')),
      'click',
      pick('#b'),
      root,
      doc(),
    );
    expect(outcome.kind).toBe('many');
    if (outcome.kind !== 'many') return;
    expect([...outcome.candidates].sort()).toEqual(['archive.reply', 'inbox.reply']);
  });
});

describe('the gesture has to match too', () => {
  it('a click never matches a change-actuated binding', () => {
    const root = mount('<select id="s" aria-label="Folder"><option>a</option></select>');
    const index = indexOf(edge('inbox.pick', 'combobox', 'Folder', 'select'));
    expect(matchElement(index, 'click', pick('#s'), root, doc()).kind).toBe('none');
    expect(matchElement(index, 'change', pick('#s'), root, doc()).kind).toBe('one');
  });

  it("a press-actuated binding answers to keydown, not to click", () => {
    const root = mount('<button id="b">Refresh</button>');
    const index = indexOf(edge('inbox.refresh', 'button', 'Refresh', 'press'));
    expect(matchElement(index, 'click', pick('#b'), root, doc()).kind).toBe('none');
    expect(matchElement(index, 'keydown', pick('#b'), root, doc()).kind).toBe('one');
  });
});

describe('instances — the sensor names the row, or refuses to', () => {
  it('exactly one live instance is attributed to that instance', () => {
    const root = mount('<button id="b">Reply</button>');
    const outcome = matchElement(
      indexOf(edge('tickets.row.reply', 'button', 'Reply', 'click', ['t-1'])),
      'click',
      pick('#b'),
      root,
      doc(),
    );
    expect(outcome.kind === 'one' && outcome.candidate.instance).toBe('t-1');
  });

  it('several live instances are ambiguous, and each candidate names its row', () => {
    const root = mount('<button id="b">Reply</button>');
    const outcome = matchElement(
      indexOf(edge('tickets.row.reply', 'button', 'Reply', 'click', ['t-1', 't-2'])),
      'click',
      pick('#b'),
      root,
      doc(),
    );
    expect(outcome).toEqual({
      kind: 'many',
      candidates: ['tickets.row.reply[t-1]', 'tickets.row.reply[t-2]'],
    });
  });

  it('an edge with no live instance could not have happened', () => {
    const root = mount('<button id="b">Reply</button>');
    const outcome = matchElement(
      indexOf(edge('tickets.row.reply', 'button', 'Reply', 'click', [])),
      'click',
      pick('#b'),
      root,
      doc(),
    );
    expect(outcome.kind).toBe('none');
  });

  it('a zero-instance edge does not stop the walk — an enclosing control still wins', () => {
    const root = mount('<div role="group" aria-label="Row"><button id="b">Reply</button></div>');
    const outcome = matchElement(
      indexOf(edge('tickets.row.reply', 'button', 'Reply', 'click', []), edge('tickets.row', 'group', 'Row')),
      'click',
      pick('#b'),
      root,
      doc(),
    );
    expect(outcome.kind === 'one' && outcome.candidate.binding.edge).toBe('tickets.row');
  });
});

describe('the authored name and the rendered name meet in the middle', () => {
  it('a label broken across lines still matches the name the author wrote', () => {
    const root = mount('<button id="b">  Clear\n   archive </button>');
    const outcome = matchElement(indexOf(edge('a', 'button', 'Clear archive')), 'click', pick('#b'), root, doc());
    expect(outcome.kind).toBe('one');
  });

  it('case is never folded — Send and send are two different labels', () => {
    const root = mount('<button id="b">send</button>');
    expect(matchElement(indexOf(edge('a', 'button', 'Send')), 'click', pick('#b'), root, doc()).kind).toBe('none');
  });
});
