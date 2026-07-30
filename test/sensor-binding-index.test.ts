/**
 * The instrumentation manifest: available() → the watch-list, the event classes,
 * and the honest coverage row for everything the sensor cannot report.
 *
 * MUTATION PROOFS (each run, then reverted):
 * - Make buildBindingIndex carry the served instance array by reference
 *   (`instances: edge.instances`) instead of copying it → "the index owns its own
 *   instance list" fails: mutating the index reaches the session's answer.
 * - Delete the `binding.actuation === undefined` arm of unwatchedReason → "an
 *   element binding with no actuation is unwatched, and says what to add" fails.
 * - Move the payloadVerdict check ABOVE the gesture checks → "a hover binding is
 *   blocked by its gesture, not by its payload" fails, and the coverage report
 *   starts teaching the wrong fix.
 * - Have indexKey join with a space → "two different role/name pairs never
 *   collide on one key" fails.
 */
import { describe, expect, it } from 'vitest';
import type { AvailableEdge } from '../src/index.js';
import {
  buildBindingIndex,
  eventTypeFor,
  indexKey,
  normalizeName,
  unwatchedReason,
} from '../src/sensor/binding-index.js';
import { deskMap } from './sensor-fixture.js';

function edge(partial: Partial<AvailableEdge> & { affordanceId: string }): AvailableEdge {
  return { description: 'x', role: 'action', evidence: [], highEffect: false, ...partial } as AvailableEdge;
}

const clickBinding = { kind: 'element', locator: { role: 'button', name: 'Go' }, actuation: 'click' } as const;

describe('actuation → the DOM event class that commits it', () => {
  it('maps the four recognizable gestures and refuses the two it cannot', () => {
    expect(eventTypeFor('click')).toBe('click');
    expect(eventTypeFor('press')).toBe('keydown');
    // The ledger records actions, not keystrokes: `change` is the browser's own
    // "the human finished choosing a value".
    expect(eventTypeFor('type')).toBe('change');
    expect(eventTypeFor('select')).toBe('change');
    expect(eventTypeFor('hover')).toBeUndefined();
    expect(eventTypeFor('drag')).toBeUndefined();
  });
});

describe('the key both sides of a match are read through', () => {
  it('two different role/name pairs never collide on one key', () => {
    // 'a b' + 'c' and 'a' + 'b c' would be one string under a space separator.
    expect(indexKey('click', 'a b', 'c')).not.toBe(indexKey('click', 'a', 'b c'));
  });

  it('collapses whitespace and trims, but never folds case', () => {
    expect(normalizeName('  Clear   archive \n')).toBe('Clear archive');
    expect(normalizeName('Send')).not.toBe(normalizeName('send'));
  });
});

describe('every live binding gets a row, and an unwatched one says why', () => {
  it('a watchable element binding is watching, with nothing attached to explain', () => {
    const index = buildBindingIndex([edge({ affordanceId: 'inbox.compose', binding: clickBinding })]);
    expect(index.coverage).toEqual([{ edge: 'inbox.compose', status: 'watching' }]);
    expect(index.eventTypes).toEqual(['click']);
  });

  it('an element binding with no actuation is unwatched, and says what to add', () => {
    const blocked = unwatchedReason(
      edge({ affordanceId: 'x', binding: { kind: 'element', locator: { role: 'button', name: 'B' } } }),
    );
    expect(blocked?.blocked).toBe('gesture');
    expect(blocked?.reason).toContain('does not say how it is actuated');
    expect(blocked?.reason).toContain("actuation: 'click'");
  });

  it('a hover binding is blocked by its gesture, not by its payload', () => {
    for (const actuation of ['hover', 'drag'] as const) {
      const blocked = unwatchedReason(
        edge({
          affordanceId: 'x',
          // A value-taking contract too: the GESTURE wall has to be the one it
          // reports, because that is the one an author has to fix first.
          expects: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
          binding: { kind: 'element', locator: { role: 'button', name: 'B' }, actuation },
        }),
      );
      expect(blocked?.blocked).toBe('gesture');
      expect(blocked?.reason).toContain(`does not watch '${actuation}'`);
    }
  });

  it('keychord, programmatic, tab and url each carry their own sentence', () => {
    expect(unwatchedReason(edge({ affordanceId: 'a', binding: { kind: 'keychord', chord: 'mod+k' } }))?.reason).toContain(
      'chord grammar',
    );
    expect(
      unwatchedReason(edge({ affordanceId: 'b', binding: { kind: 'programmatic', provider: 'canvas' } }))?.reason,
    ).toContain('publishes its own affordance');
    expect(unwatchedReason(edge({ affordanceId: 'c', binding: { kind: 'tab', target: 'x.y' } }))?.reason).toContain(
      'visibility wire',
    );
    expect(unwatchedReason(edge({ affordanceId: 'd', binding: { kind: 'url', href: '/help' } }))?.reason).toContain(
      'sync()',
    );
  });

  it('an edge with no binding at all is unwatched, not silently dropped', () => {
    const index = buildBindingIndex([edge({ affordanceId: 'inbox.no-gesture' })]);
    expect(index.coverage).toHaveLength(1);
    expect(index.coverage[0]?.status).toBe('unwatched');
    expect(index.coverage[0]?.reason).toContain('declares no binding');
  });

  it('every served edge produces exactly one coverage row — none can go missing', () => {
    const session = deskMap().createSession({ node: 'inbox', onWarn: () => undefined });
    const edges = session.available().edges;
    const index = buildBindingIndex(edges);
    expect(index.coverage.map((row) => row.edge).sort()).toEqual(edges.map((e) => e.affordanceId).sort());
  });
});

describe('an action that takes a value is unwatched — the sensor never scrapes one', () => {
  it('a declared input contract blocks the edge on payload, with the sentence saying where the value comes from', () => {
    const blocked = unwatchedReason(
      edge({
        affordanceId: 'profile.save-profile',
        expects: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
        binding: clickBinding,
      }),
    );
    expect(blocked?.blocked).toBe('payload');
    expect(blocked?.reason).toContain('never reads one off the DOM');
    expect(blocked?.reason).toContain('where the value is declared');
  });

  it("the author's explicit 'none' is watched — there is no value to answer for", () => {
    const index = buildBindingIndex([edge({ affordanceId: 'inbox.compose', expects: 'none', binding: clickBinding })]);
    expect(index.coverage[0]?.status).toBe('watching');
  });

  it('an edge that declares no input contract at all is watched too', () => {
    const index = buildBindingIndex([edge({ affordanceId: 'inbox.refresh', binding: clickBinding })]);
    expect(index.coverage[0]?.status).toBe('watching');
  });

  it('the desk fixture splits the way the law predicts', () => {
    const session = deskMap().createSession({ node: 'inbox', onWarn: () => undefined });
    const rows = new Map(buildBindingIndex(session.available().edges).coverage.map((r) => [r.edge, r]));
    expect(rows.get('inbox.compose')?.status).toBe('watching'); // input: 'none'
    expect(rows.get('inbox.refresh')?.status).toBe('watching'); // no input declared
    expect(rows.get('inbox.search-notes')?.blocked).toBe('payload'); // takes a query
    expect(rows.get('inbox.pick-folder')?.blocked).toBe('payload'); // takes a folder
    expect(rows.get('inbox.drag-to-folder')?.blocked).toBe('gesture');
    expect(rows.get('inbox.open-help')?.blocked).toBe('gesture'); // url
    expect(rows.get('inbox.no-gesture')?.blocked).toBe('gesture');
  });
});

describe('one act, one row — an edge the app already reports is left alone', () => {
  it('stands down on a named edge, and says so as a door row', () => {
    const edges = [
      edge({ affordanceId: 'inbox.compose', binding: clickBinding }),
      edge({ affordanceId: 'inbox.refresh', binding: clickBinding }),
    ];
    const index = buildBindingIndex(edges, (id) => id === 'inbox.compose');
    const rows = new Map(index.coverage.map((r) => [r.edge, r]));
    expect(rows.get('inbox.compose')?.blocked).toBe('door');
    expect(rows.get('inbox.compose')?.reason).toContain('one act writes one row');
    expect(rows.get('inbox.refresh')?.status).toBe('watching');
    expect(index.watched.map((w) => w.edge)).toEqual(['inbox.refresh']);
  });
});

describe('the index is rebuilt from the session, and never writes to it', () => {
  it('a mount-declared tool appears; unregistering removes it', () => {
    const session = deskMap().createSession({ node: 'inbox', onWarn: () => undefined });
    expect(buildBindingIndex(session.available().edges).watched.map((w) => w.edge)).not.toContain(
      'inbox.quick-reply',
    );

    const handle = session.registerToolGroup('inbox', {
      tools: {
        'quick-reply': {
          does: 'Send a one-line reply',
          binding: { kind: 'element', locator: { role: 'button', name: 'Quick reply' }, actuation: 'click' },
        },
      },
    });
    expect(buildBindingIndex(session.available().edges).watched.map((w) => w.edge)).toContain('inbox.quick-reply');

    handle.unregister();
    expect(buildBindingIndex(session.available().edges).watched.map((w) => w.edge)).not.toContain(
      'inbox.quick-reply',
    );
  });

  it('an enable flip leaves the binding watched — a greyed button is still on screen', () => {
    const session = deskMap().createSession({ node: 'inbox', onWarn: () => undefined });
    const handle = session.registerToolGroup('inbox', { handlers: { compose: () => undefined } });
    handle.setEnabled('compose', false);
    const served = session.available().edges.find((e) => e.affordanceId === 'inbox.compose');
    expect(served?.enabled).toBe(false);
    // Watched, deliberately: a human really can click a greyed button, and the
    // record-only fire is exactly how the app finds out (session.ts:896-903).
    expect(buildBindingIndex([served as AvailableEdge]).coverage[0]?.status).toBe('watching');
  });

  it('the deep-frozen spec data the session serves comes back byte-identical', () => {
    const session = deskMap().createSession({ node: 'inbox', onWarn: () => undefined });
    const edges = session.available().edges;
    const before = JSON.stringify(edges.map((e) => e.binding));
    buildBindingIndex(edges);
    expect(JSON.stringify(edges.map((e) => e.binding))).toBe(before);
    for (const served of edges) {
      if (served.binding !== undefined) expect(Object.isFrozen(served.binding)).toBe(true);
    }
  });

  it('the index owns its own instance list — mutating it cannot reach the session', () => {
    const session = deskMap().createSession({
      node: 'tickets',
      state: { ticketIds: ['t-1', 't-2'] },
      onWarn: () => undefined,
    });
    const served = session.available().edges.find((e) => e.affordanceId === 'tickets.row.reply');
    const index = buildBindingIndex([served as AvailableEdge]);
    const carried = index.watched[0]?.instances as string[];
    expect(carried).toEqual(['t-1', 't-2']);
    carried.push('forged');
    expect(session.available().edges.find((e) => e.affordanceId === 'tickets.row.reply')?.instances).toEqual([
      't-1',
      't-2',
    ]);
  });

  it('coverage rows are frozen — a consumer cannot rewrite what it was told', () => {
    const index = buildBindingIndex([edge({ affordanceId: 'a' })]);
    expect(Object.isFrozen(index.coverage)).toBe(true);
    expect(Object.isFrozen(index.coverage[0])).toBe(true);
  });
});
