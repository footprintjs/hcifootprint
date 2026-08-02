/**
 * registerAction must route root/multi-attach actions to the BIND path (not try
 * to declare a phantom node-scoped action) — the confirmed review finding.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('registerAction routing', () => {
  it('binds a ROOT/multi-attach action by handler (does not declare a phantom)', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { actions: {} }, orders: { actions: {} } },
      actions: { 'open-help': { does: 'Open help', on: ['catalog', 'orders'] } },
    });
    const session = map.createSession({ node: 'catalog', state: {} });
    let opened = false;
    const handle = session.registerAction('catalog', 'open-help', { does: '', handler: () => { opened = true; } });
    // the REAL root action is materialized (bound), not a phantom 'catalog.open-help'
    const edge = session.available().edges.find((e) => e.affordanceId === 'open-help')!;
    expect(edge.materialized).toBe(true);
    expect(session.available().edges.some((e) => e.affordanceId === 'catalog.open-help')).toBe(false);
    session.fire('open-help', { source: 'agent' });
    await tick();
    expect(opened).toBe(true);
    handle.unregister();
  });

  it('binds a node-scoped declared action by handler', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { actions: { search: { does: 'Search' } } } },
    });
    const session = map.createSession({ node: 'catalog', state: {} });
    let ran = false;
    session.registerAction('catalog', 'search', { does: '', handler: () => { ran = true; } });
    session.fire('catalog.search', { source: 'agent' });
    await tick();
    expect(ran).toBe(true);
  });

  it('declares a NEW leaf when the action is not already in the graph', async () => {
    const map = buildNavigationGraph('shop', { pages: { catalog: { areas: { rail: {} } } } });
    const session = map.createSession({ node: 'catalog', state: {} });
    let ran = false;
    session.registerAction('catalog.rail', 'clear', { does: 'Clear filters', handler: () => { ran = true; } });
    const edge = session.available().edges.find((e) => e.affordanceId === 'catalog.rail.clear')!;
    expect(edge.description).toBe('Clear filters');
    expect(edge.descriptionSource).toBe('registration');
    session.fire('catalog.rail.clear', { source: 'agent' });
    await tick();
    expect(ran).toBe(true);
  });
});
