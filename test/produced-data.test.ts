/**
 * The "act → get data back" channel: a handler's RETURN value (search results,
 * a looked-up record) rides TransitionRecord.produced — sanitized + capped, in
 * the DATA channel so untrusted content is never planner instructions. This is
 * what lets an agent SEE the ids it must pick from for a follow-up step.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { Binding } from '../src/index.js';

const binding: Binding = { kind: 'element', locator: { role: 'button', name: 'B' } };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('produced data — handler return surfaced on the record', () => {
  it('captures a search handler’s returned list, available after the settlement', async () => {
    const graph = buildNavigationGraph('shop', {
      pages: {
        catalog: {},
      },
      actions: {
        search: { on: 'catalog', does: 'Search dresses', binding, writes: ['resultCount'] },
      },
    });
    const session = graph.createSession({ node: 'catalog', state: { resultCount: 0 } });
    const results = [
      { id: 'd3', name: 'Floral Wrap Dress', color: 'red', price: 120 },
      { id: 'd6', name: 'Scarlet Cocktail Dress', color: 'red', price: 149 },
    ];
    session.registerHandlers({
      group: 'catalog',
      handlers: {
        search: () => {
          session.updateState({ resultCount: results.length });
          return results; // the app already returns this — we no longer discard it
        },
      },
    });
    const fired = session.fire('search', { source: 'agent', payload: { query: 'red' } }) as {
      transition: { id: string };
    };
    await tick();
    const produced = session.producedFor(fired.transition.id) as typeof results;
    expect(produced).toHaveLength(2);
    expect(produced.map((d) => d.id)).toEqual(['d3', 'd6']);
    expect(produced[1].name).toBe('Scarlet Cocktail Dress');
  });

  it('the returned snapshot is a fresh copy — mutating it cannot corrupt the record', async () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        lookup: { on: 'a', does: 'Look up', binding },
      },
    });
    const session = graph.createSession({ node: 'a', state: {} });
    session.registerHandlers({ group: 'g', handlers: { lookup: () => ({ status: 'processing' }) } });
    const fired = session.fire('lookup', { source: 'agent' }) as { transition: { id: string } };
    await tick();
    const first = session.producedFor(fired.transition.id) as { status: string };
    first.status = 'TAMPERED';
    const second = session.producedFor(fired.transition.id) as { status: string };
    expect(second.status).toBe('processing');
  });

  it('sanitizes: caps long strings, drops functions, bounds arrays', async () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        big: { on: 'a', does: 'Big', binding },
      },
    });
    const session = graph.createSession({ node: 'a', state: {} });
    session.registerHandlers({
      group: 'g',
      handlers: {
        big: () => ({
          long: 'x'.repeat(500),
          fn: () => 42,
          many: Array.from({ length: 100 }, (_, i) => i),
        }),
      },
    });
    const fired = session.fire('big', { source: 'agent' }) as { transition: { id: string } };
    await tick();
    const produced = session.producedFor(fired.transition.id) as { long: string; fn?: unknown; many: number[] };
    expect(produced.long.length).toBeLessThanOrEqual(201);
    expect(produced.fn).toBeUndefined(); // functions dropped
    expect(produced.many).toHaveLength(30); // arrays capped
  });

  it('captureProduced:false opts a session out entirely', async () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        a: {},
      },
      actions: {
        act: { on: 'a', does: 'Act', binding },
      },
    });
    const session = graph.createSession({ node: 'a', state: {}, captureProduced: false });
    session.registerHandlers({ group: 'g', handlers: { act: () => ({ secret: 1 }) } });
    const fired = session.fire('act', { source: 'agent' }) as { transition: { id: string } };
    await tick();
    expect(session.producedFor(fired.transition.id)).toBeUndefined();
  });

  it('Mode B result carries transitionId so the caller can attach produced data', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { actions: { search: { does: 'Search dresses', writes: ['resultCount'] } } } },
      journeys: { browse: { does: 'Browse the catalog', steps: ['search'] } },
    });
    const session = map.createSession({ node: 'catalog', state: { resultCount: 0 } });
    const found = [{ id: 'd6', name: 'Scarlet Cocktail Dress' }];
    session.registerActions('catalog', {
      handlers: {
        search: () => {
          session.updateState({ resultCount: 1 });
          return found;
        },
      },
    });
    const port = serveToAgent(session);
    port.call('shop.journey.browse', {});
    const step = port.call('shop.journey.browse', { step: 'search' });
    expect(typeof step['transitionId']).toBe('string');
    await tick();
    const produced = session.producedFor(step['transitionId'] as string) as typeof found;
    expect(produced[0].id).toBe('d6');
  });
});
