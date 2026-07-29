/**
 * The graph is PLACES. If a tool ever appears in graph.ts, this file fails —
 * which is the whole claim the demo makes about where actions come from.
 */
import { describe, expect, it } from 'vitest';
import { DeskStore } from '../app/store.js';
import { createDeskGraph } from './graph.js';

describe('the compiled graph', () => {
  const graph = createDeskGraph(new DeskStore());

  it('declares no actions at all — every one of them arrives from the store', () => {
    expect(Object.keys(graph.spec.affordances)).toEqual([]);
    expect(Object.keys(graph.spec.skills)).toEqual([]);
  });

  it('declares the desk’s shape, with its routes', () => {
    expect(Object.keys(graph.spec.pages).sort()).toEqual(['desk', 'settings']);
    expect(graph.spec.pages['desk']?.route).toBe('/desk');
    expect(graph.spec.pages['settings']?.route).toBe('/settings');
  });

  it('knows which container means what', () => {
    expect(graph.nodes['desk.inbox']?.kind).toBe('tab');
    expect(graph.nodes['desk.archive']?.kind).toBe('tab');
    expect(graph.nodes['desk.compose']?.kind).toBe('modal');
    // blocks defaults to true: an open compose window masks the desk behind it.
    expect(graph.nodes['desk.compose']?.overlay).toBe(true);
    expect(graph.nodes['desk.inbox.tickets']?.repeats).toBe(true);
  });

  it('enumerates ticket rows from projected state, completely', () => {
    const instances = graph.nodes['desk.inbox.tickets']?.instances;
    expect(instances).toBeTypeOf('function');
    expect(instances?.({ inboxTicketIds: ['t-1', 't-2'] })).toEqual(['t-1', 't-2']);
    // A projector that has not seeded the key yet gets an empty set, never a throw.
    expect(instances?.({})).toEqual([]);
  });

  it('asks the projector for no guard keys of its own — every guard arrives at mount', () => {
    expect(graph.requiredStateKeys()).toEqual([]);
  });
});
