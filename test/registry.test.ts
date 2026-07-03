/** Layer test: registry/ imports ONLY registry/registry.ts — no session, no spec. */
import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/registry/registry.js';

describe('ToolRegistry — the live-binding layer in isolation', () => {
  it('registers, resolves, and reports materialization', () => {
    const warnings: string[] = [];
    const r = new ToolRegistry((m) => warnings.push(m));
    expect(r.hasAny()).toBe(false);
    const handler = () => 'ok';
    r.register('cart-panel', 'add-to-cart', handler);
    expect(r.hasAny()).toBe(true);
    expect(r.isRegistered('add-to-cart')).toBe(true);
    expect(r.handlerFor('add-to-cart')).toBe(handler);
    expect(warnings).toEqual([]);
  });

  it('last registration wins, with a dev warning (StrictMode double-mount)', () => {
    const warnings: string[] = [];
    const r = new ToolRegistry((m) => warnings.push(m));
    const first = () => 1;
    const second = () => 2;
    r.register('cart-panel', 'add-to-cart', first);
    r.register('cart-panel', 'add-to-cart', second);
    expect(r.handlerFor('add-to-cart')).toBe(second);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('last registration wins');
  });

  it("unregisterGroup removes only what the group CURRENTLY owns — a stale unmount can't tear down another component's binding", () => {
    const r = new ToolRegistry(() => {});
    r.register('list-page', 'open-item', () => 'a');
    r.register('detail-page', 'open-item', () => 'b'); // re-registered by another mount
    r.register('list-page', 'sort-items', () => 'c');
    expect(r.unregisterGroup('list-page')).toEqual(['sort-items']); // open-item now belongs to detail-page
    expect(r.isRegistered('open-item')).toBe(true);
    expect(r.isRegistered('sort-items')).toBe(false);
  });

  it('registrations() returns copies with group ownership visible', () => {
    const r = new ToolRegistry(() => {});
    r.register('g1', 'a', () => 1);
    const regs = r.registrations();
    expect(regs).toMatchObject([{ affordanceId: 'a', group: 'g1' }]);
    regs[0].group = 'hacked';
    expect(r.registrations()[0].group).toBe('g1');
  });
});
