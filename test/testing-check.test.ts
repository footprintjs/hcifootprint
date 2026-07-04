/**
 * checkGraph — the one-call health rollup: a single ok/verdict, findings grouped
 * by drift type, per-skill feasibility, and a printable summary.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { checkGraph } from '../src/testing/index.js';
import { shopGraph } from './testing-fixture.js';

describe('checkGraph — healthy graph', () => {
  it('returns ok with no errors and a healthy summary', () => {
    const health = checkGraph(shopGraph());
    expect(health.ok).toBe(true);
    expect(health.errors).toBe(0);
    expect(health.summary).toMatch(/healthy/);
    expect(health.skills.every((s) => s.feasible)).toBe(true);
    expect(health.unreachablePages).toEqual([]);
  });
});

describe('checkGraph — drifted graph', () => {
  const graph = () =>
    buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            go: { does: 'Go to shop', goTo: 'shop' },
            act: { does: 'Act', when: { ghostKey: { eq: true } }, writes: ['x'] }, // control drift
          },
        },
        shop: { tools: { back: { does: 'Back home', goTo: 'home' } } },
        orphan: { tools: { noop: { does: 'A thing nothing reaches' } } }, // page drift
      },
      skills: { flow: { does: 'A flow', steps: ['act'] } }, // flow drift (act uncompletable)
    });

  it('is not ok and groups findings by drift type', () => {
    const health = checkGraph(graph(), { initialState: {} });
    expect(health.ok).toBe(false);
    expect(health.errors).toBeGreaterThan(0);
    expect(health.byType.control.length).toBeGreaterThan(0);
    expect(health.byType.page.some((f) => f.page === 'orphan')).toBe(true);
    expect(health.byType.flow.length).toBeGreaterThan(0);
    expect(health.summary).toMatch(/Control drift/);
  });

  it('rolls up per-skill feasibility and unreachable pages', () => {
    const health = checkGraph(graph(), { initialState: {} });
    expect(health.skills.find((s) => s.id === 'flow')?.feasible).toBe(false);
    expect(health.skills.find((s) => s.id === 'flow')?.blockedOn).toContain('ghostKey');
    expect(health.unreachablePages).toContain('orphan');
  });
});
