/**
 * The projection has one job the compiler cannot check: every key a published
 * action DECLARES it writes must exist in it, or settlement would check a claim
 * against a report that can never carry it. So the test walks the real action
 * catalogue and reads the claims out of it.
 */
import { describe, expect, it } from 'vitest';
import { buildActions } from '../app/actions.js';
import { DeskStore } from '../app/store.js';
import type { ControlId } from '../app/state.js';
import { projectionDelta, projectionOf } from './projection.js';

const EVERY_CONTROL: ControlId[] = [
  'compose-button',
  'compose-modal',
  'inbox-list',
  'archive-panel',
  'settings-panel',
];

function declaredWrites(): string[] {
  const store = new DeskStore();
  const mounted = new Set(EVERY_CONTROL);
  const writes = new Set<string>();
  for (const page of ['desk', 'settings'] as const) {
    const state = { ...store.state, page };
    for (const action of buildActions(state, mounted, store.commands)) {
      for (const key of action.writes ?? []) writes.add(key);
    }
  }
  return [...writes].sort();
}

describe('projectionOf', () => {
  it('carries every key the desk claims to write', () => {
    const keys = Object.keys(projectionOf(new DeskStore().state));
    for (const write of declaredWrites()) expect(keys).toContain(write);
  });

  it('carries the guard key and the instance source', () => {
    const projection = projectionOf(new DeskStore().state);
    expect(projection['composeDraftLength']).toBe(0);
    expect((projection['inboxTicketIds'] as string[]).length).toBe(60);
  });

  it('never carries the draft’s text — a length is a fact about the desk, the words are the user’s', () => {
    const store = new DeskStore();
    store.commands.setDraft('my private words');
    const projection = projectionOf(store.state);
    expect(JSON.stringify(projection)).not.toContain('my private words');
    expect(projection['composeDraftLength']).toBe(16);
  });
});

describe('projectionDelta', () => {
  it('reports only what actually changed', () => {
    const store = new DeskStore();
    const before = projectionOf(store.state);
    store.commands.reply('t-1', { message: 'hi' });
    expect(Object.keys(projectionDelta(before, projectionOf(store.state))).sort()).toEqual([
      'lastRepliedTo',
      'repliedCount',
    ]);
  });

  it('a fresh array of the same ids is NOT a change', () => {
    const store = new DeskStore();
    const before = projectionOf(store.state);
    const after = projectionOf(store.state); // new arrays, same content
    expect(after['inboxTicketIds']).not.toBe(before['inboxTicketIds']);
    // Compare by identity here instead and the tap would report a delta on every
    // store emission — settling whatever fire is pending with a change that
    // never happened.
    expect(projectionDelta(before, after)).toEqual({});
  });
});
