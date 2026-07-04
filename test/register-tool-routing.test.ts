/**
 * registerTool must route root/multi-attach tools to the BIND path (not try to
 * declare a phantom node-scoped tool) — the confirmed review finding.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('registerTool routing', () => {
  it('binds a ROOT/multi-attach tool by handler (does not declare a phantom)', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { tools: {} }, orders: { tools: {} } },
      tools: { 'open-help': { does: 'Open help', on: ['catalog', 'orders'] } },
    });
    const session = map.createSession({ node: 'catalog', state: {} });
    let opened = false;
    const handle = session.registerTool('catalog', 'open-help', { does: '', handler: () => { opened = true; } });
    // the REAL root tool is materialized (bound), not a phantom 'catalog.open-help'
    const edge = session.available().edges.find((e) => e.affordanceId === 'open-help')!;
    expect(edge.materialized).toBe(true);
    expect(session.available().edges.some((e) => e.affordanceId === 'catalog.open-help')).toBe(false);
    session.fire('open-help', { source: 'agent' });
    await tick();
    expect(opened).toBe(true);
    handle.unregister();
  });

  it('binds a node-scoped declared tool by handler', async () => {
    const map = buildNavigationGraph('shop', {
      pages: { catalog: { tools: { search: { does: 'Search' } } } },
    });
    const session = map.createSession({ node: 'catalog', state: {} });
    let ran = false;
    session.registerTool('catalog', 'search', { does: '', handler: () => { ran = true; } });
    session.fire('catalog.search', { source: 'agent' });
    await tick();
    expect(ran).toBe(true);
  });

  it('declares a NEW leaf when the tool is not already in the graph', async () => {
    const map = buildNavigationGraph('shop', { pages: { catalog: { areas: { rail: {} } } } });
    const session = map.createSession({ node: 'catalog', state: {} });
    let ran = false;
    session.registerTool('catalog.rail', 'clear', { does: 'Clear filters', handler: () => { ran = true; } });
    const edge = session.available().edges.find((e) => e.affordanceId === 'catalog.rail.clear')!;
    expect(edge.description).toBe('Clear filters');
    expect(edge.descriptionSource).toBe('registration');
    session.fire('catalog.rail.clear', { source: 'agent' });
    await tick();
    expect(ran).toBe(true);
  });
});
