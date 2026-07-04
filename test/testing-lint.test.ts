/**
 * lintGraph — the STATIC stale-logic detector. One graph per drift class, plus
 * the advisory-vs-error grounding rule and the report/gate helpers.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { lintGraph, formatFindings, expectNoStaleLogic } from '../src/testing/index.js';
import type { LintFinding } from '../src/testing/index.js';
import { shopGraph } from './testing-fixture.js';

const codes = (findings: LintFinding[]): string[] => findings.map((f) => f.code);

describe('lintGraph — clean graph', () => {
  it('reports nothing for a consistent graph', () => {
    expect(lintGraph(shopGraph())).toEqual([]);
  });

  it('expectNoStaleLogic passes for a clean graph', () => {
    expect(() => expectNoStaleLogic(shopGraph())).not.toThrow();
  });
});

describe('lintGraph — dangling guard key (gated on state nothing produces)', () => {
  const graph = () =>
    buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            checkout: { does: 'Checkout', when: { loggedIn: { eq: true } }, writes: ['cart'] },
          },
        },
      },
    });

  it('warns when ungrounded (the app may seed the key from outside)', () => {
    const findings = lintGraph(graph());
    const dangling = findings.find((f) => f.code === 'dangling-guard-key');
    expect(dangling).toBeDefined();
    expect(dangling!.severity).toBe('warning');
    expect(dangling!.keys).toContain('loggedIn');
  });

  it('promotes to error once initialState/externalKeys are declared', () => {
    const findings = lintGraph(graph(), { initialState: { cart: [] } });
    const dangling = findings.find((f) => f.code === 'dangling-guard-key');
    expect(dangling!.severity).toBe('error');
  });

  it('does NOT flag a key supplied via externalKeys', () => {
    const findings = lintGraph(graph(), { initialState: { cart: [] }, externalKeys: ['loggedIn'] });
    expect(codes(findings)).not.toContain('dangling-guard-key');
  });
});

describe('lintGraph — unsatisfiable guard (can never be true)', () => {
  it('flags an impossible numeric range as an error', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { tools: { act: { does: 'Act', when: { qty: { gt: 5, lt: 3 } }, writes: ['qty'] } } },
      },
    });
    const findings = lintGraph(graph);
    const bad = findings.find((f) => f.code === 'unsatisfiable-guard');
    expect(bad).toBeDefined();
    expect(bad!.severity).toBe('error');
    expect(bad!.affordance).toBe('home.act');
  });

  it('flags an eq/in contradiction', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            act: { does: 'Act', when: { status: { eq: 'paid', in: ['draft', 'open'] } }, writes: ['status'] },
          },
        },
      },
    });
    expect(codes(lintGraph(graph))).toContain('unsatisfiable-guard');
  });

  it('does NOT flag a guard the coercive evaluator would actually pass (cross-type)', () => {
    // footprint's evaluator coerces: '5' > 3 is true, so this guard is satisfiable.
    const graph = buildNavigationGraph('g', {
      pages: { home: { tools: { act: { does: 'Act', when: { q: { eq: '5', gt: 3 } }, writes: ['q'] } } } },
    });
    expect(codes(lintGraph(graph))).not.toContain('unsatisfiable-guard');
  });
});

describe('lintGraph — skills', () => {
  it('flags an uncompletable skill (a step gated on unproduced state)', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            first: { does: 'First', writes: ['a'] },
            second: { does: 'Second', when: { approved: { eq: true } }, writes: ['done'] },
          },
        },
      },
      skills: { flow: { does: 'A flow', steps: ['first', 'second'] } },
    });
    const findings = lintGraph(graph, { initialState: {} });
    const bad = findings.find((f) => f.code === 'uncompletable-skill');
    expect(bad).toBeDefined();
    expect(bad!.skill).toBe('flow');
    expect(bad!.severity).toBe('error');
  });

  it('flags steps listed out of dependency order', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            needsX: { does: 'Needs X', when: { x: { gt: 0 } }, writes: ['done'] },
            makesX: { does: 'Makes X', writes: ['x'] },
          },
        },
      },
      // needsX is listed BEFORE makesX, which produces the key it waits on.
      skills: { flow: { does: 'A flow', steps: ['needsX', 'makesX'] } },
    });
    const findings = lintGraph(graph);
    const order = findings.find((f) => f.code === 'skill-step-order');
    expect(order).toBeDefined();
    expect(order!.severity).toBe('warning');
  });

  it('flags a dependency cycle between two steps', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            a: { does: 'A', when: { x: { gt: 0 } }, writes: ['y'] },
            b: { does: 'B', when: { y: { gt: 0 } }, writes: ['x'] },
          },
        },
      },
      skills: { flow: { does: 'A flow', steps: ['a', 'b'] } },
    });
    const findings = lintGraph(graph);
    const cycle = findings.find((f) => f.code === 'skill-step-cycle');
    expect(cycle).toBeDefined();
    expect(cycle!.severity).toBe('error');
  });

  it('does NOT flag a cycle when grounding breaks the tie', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          tools: {
            a: { does: 'A', when: { x: { gt: 0 } }, writes: ['y'] },
            b: { does: 'B', when: { y: { gt: 0 } }, writes: ['x'] },
          },
        },
      },
      skills: { flow: { does: 'A flow', steps: ['a', 'b'] } },
    });
    // x supplied by initialState → step a can start → no deadlock.
    const findings = lintGraph(graph, { initialState: { x: 1 } });
    expect(findings.some((f) => f.code === 'skill-step-cycle')).toBe(false);
  });
});

describe('lintGraph — page reachability', () => {
  it('flags an unreachable page', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { tools: { go: { does: 'Go', goTo: 'reachable' } } },
        reachable: { tools: { back: { does: 'Back', goTo: 'home' } } },
        orphan: { tools: { noop: { does: 'A thing here' } } },
      },
    });
    const findings = lintGraph(graph);
    const unreachable = findings.find((f) => f.code === 'unreachable-page' && f.page === 'orphan');
    expect(unreachable).toBeDefined();
  });

  it('flags a dead-end page (no way out) as info', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { tools: { go: { does: 'Go', goTo: 'trap' } } },
        trap: { tools: { noop: { does: 'Stuck here' } } },
      },
    });
    const findings = lintGraph(graph);
    const deadEnd = findings.find((f) => f.code === 'dead-end-page' && f.page === 'trap');
    expect(deadEnd).toBeDefined();
    expect(deadEnd!.severity).toBe('info');
  });
});

describe('lintGraph — unconsumed write', () => {
  it('flags a write no guard ever reads as info', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { tools: { act: { does: 'Act', writes: ['telemetryPing'] } } } },
    });
    const findings = lintGraph(graph);
    const orphan = findings.find((f) => f.code === 'unconsumed-write');
    expect(orphan).toBeDefined();
    expect(orphan!.severity).toBe('info');
    expect(orphan!.keys).toContain('telemetryPing');
  });
});

describe('lintGraph — helpers', () => {
  it('every finding names the two-path remedy', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { tools: { act: { does: 'Act', when: { ghost: { eq: true } } } } } },
    });
    for (const finding of lintGraph(graph)) {
      expect(finding.remedy.length).toBeGreaterThan(0);
    }
  });

  it('expectNoStaleLogic throws with a formatted report on an error', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { tools: { act: { does: 'Act', when: { qty: { gt: 5, lt: 3 } } } } } },
    });
    expect(() => expectNoStaleLogic(graph)).toThrow(/unsatisfiable-guard/);
  });

  it('expectNoStaleLogic can widen to fail on warnings', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { tools: { act: { does: 'Act', when: { ghost: { eq: true } } } } } },
    });
    expect(() => expectNoStaleLogic(graph)).not.toThrow(); // ghost is a warning by default
    expect(() => expectNoStaleLogic(graph, { failOn: 'warning' })).toThrow(/dangling-guard-key/);
  });

  it('formatFindings renders an empty string when clean', () => {
    expect(formatFindings([])).toBe('');
  });
});
