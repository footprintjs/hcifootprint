/**
 * checkGraph — the one-call health rollup: a single ok/verdict, findings grouped
 * by drift type, per-journey feasibility, and a printable summary.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { checkGraph } from '../src/testing/index.js';
import { shopGraph } from './testing-fixture.js';

describe('an app that still matches its graph passes quietly', () => {
  it('returns ok with no errors and a healthy summary', () => {
    const health = checkGraph(shopGraph());
    expect(health.ok).toBe(true);
    expect(health.errors).toBe(0);
    expect(health.summary).toMatch(/healthy/);
    expect(health.journeys.every((s) => s.feasible)).toBe(true);
    expect(health.unreachablePages).toEqual([]);
  });
});

describe('an app that drifted from its graph is told exactly where', () => {
  const graph = () =>
    buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            go: { does: 'Go to shop', goTo: 'shop' },
            act: { does: 'Act', when: { ghostKey: { eq: true } }, writes: ['x'] }, // control drift
          },
        },
        shop: { actions: { back: { does: 'Back home', goTo: 'home' } } },
        orphan: { actions: { noop: { does: 'A thing nothing reaches' } } }, // page drift
      },
      journeys: { flow: { does: 'A flow', steps: ['act'] } }, // flow drift (act uncompletable)
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

  it('rolls up per-journey feasibility and unreachable pages', () => {
    const health = checkGraph(graph(), { initialState: {} });
    expect(health.journeys.find((s) => s.id === 'flow')?.feasible).toBe(false);
    expect(health.journeys.find((s) => s.id === 'flow')?.blockedOn).toContain('ghostKey');
    expect(health.unreachablePages).toContain('orphan');
  });
});

describe('the summary counts things the way a person reads them', () => {
  it('says “1 advisory note”, singular, when there is exactly one', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { act: { does: 'Act', writes: ['telemetryPing'] } } } },
    });
    const health = checkGraph(graph);
    expect(health.ok).toBe(true);
    expect(health.byType.note).toHaveLength(1);
    expect(health.summary).toContain('(1 advisory note)');
    expect(health.summary).not.toContain('notes');
  });

  it('says “0 advisory notes”, plural, when there are none', () => {
    expect(checkGraph(shopGraph()).summary).toContain('(0 advisory notes)');
  });

  it('says “1 error, 0 warnings” and prints only the drift buckets that have something in them', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { actions: { act: { does: 'Act', when: { qty: { gt: 5, lt: 3 } }, writes: ['qty'] } } },
      },
    });
    const health = checkGraph(graph);
    expect(health.errors).toBe(1);
    expect(health.warnings).toBe(0);
    expect(health.summary).toContain('✗ 1 error, 0 warnings');
    // Only control drift happened, so the page and flow headings stay off the
    // report — an empty heading is noise a reader has to rule out by hand.
    expect(health.summary).toContain('Control drift');
    expect(health.summary).not.toContain('Page drift');
    expect(health.summary).not.toContain('Flow drift');
  });
});
