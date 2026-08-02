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

describe('a graph with nothing wrong is reported as having nothing wrong', () => {
  it('reports nothing for a consistent graph', () => {
    expect(lintGraph(shopGraph())).toEqual([]);
  });

  it('expectNoStaleLogic passes for a clean graph', () => {
    expect(() => expectNoStaleLogic(shopGraph())).not.toThrow();
  });
});

describe('a control gated on state nothing in the app ever writes', () => {
  const graph = () =>
    buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
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

describe('a control gated on a condition that can never be true', () => {
  it('flags an impossible numeric range as an error', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { actions: { act: { does: 'Act', when: { qty: { gt: 5, lt: 3 } }, writes: ['qty'] } } },
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
          actions: {
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
      pages: { home: { actions: { act: { does: 'Act', when: { q: { eq: '5', gt: 3 } }, writes: ['q'] } } } },
    });
    expect(codes(lintGraph(graph))).not.toContain('unsatisfiable-guard');
  });
});

describe('a journey whose steps do not add up', () => {
  it('flags an uncompletable journey (a step gated on unproduced state)', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            first: { does: 'First', writes: ['a'] },
            second: { does: 'Second', when: { approved: { eq: true } }, writes: ['done'] },
          },
        },
      },
      journeys: { flow: { does: 'A flow', steps: ['first', 'second'] } },
    });
    const findings = lintGraph(graph, { initialState: {} });
    const bad = findings.find((f) => f.code === 'uncompletable-journey');
    expect(bad).toBeDefined();
    expect(bad!.journey).toBe('flow');
    expect(bad!.severity).toBe('error');
  });

  it('flags steps listed out of dependency order', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            needsX: { does: 'Needs X', when: { x: { gt: 0 } }, writes: ['done'] },
            makesX: { does: 'Makes X', writes: ['x'] },
          },
        },
      },
      // needsX is listed BEFORE makesX, which produces the key it waits on.
      journeys: { flow: { does: 'A flow', steps: ['needsX', 'makesX'] } },
    });
    const findings = lintGraph(graph);
    const order = findings.find((f) => f.code === 'journey-step-order');
    expect(order).toBeDefined();
    expect(order!.severity).toBe('warning');
  });

  it('flags a dependency cycle between two steps', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            a: { does: 'A', when: { x: { gt: 0 } }, writes: ['y'] },
            b: { does: 'B', when: { y: { gt: 0 } }, writes: ['x'] },
          },
        },
      },
      journeys: { flow: { does: 'A flow', steps: ['a', 'b'] } },
    });
    const findings = lintGraph(graph);
    const cycle = findings.find((f) => f.code === 'journey-step-cycle');
    expect(cycle).toBeDefined();
    expect(cycle!.severity).toBe('error');
  });

  it('does NOT flag a cycle when grounding breaks the tie', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            a: { does: 'A', when: { x: { gt: 0 } }, writes: ['y'] },
            b: { does: 'B', when: { y: { gt: 0 } }, writes: ['x'] },
          },
        },
      },
      journeys: { flow: { does: 'A flow', steps: ['a', 'b'] } },
    });
    // x supplied by initialState → step a can start → no deadlock.
    const findings = lintGraph(graph, { initialState: { x: 1 } });
    expect(findings.some((f) => f.code === 'journey-step-cycle')).toBe(false);
  });
});

describe('a page nothing in the app claims to reach', () => {
  it('flags an unreachable page', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { actions: { go: { does: 'Go', goTo: 'reachable' } } },
        reachable: { actions: { back: { does: 'Back', goTo: 'home' } } },
        orphan: { actions: { noop: { does: 'A thing here' } } },
      },
    });
    const findings = lintGraph(graph);
    const unreachable = findings.find((f) => f.code === 'unreachable-page' && f.page === 'orphan');
    expect(unreachable).toBeDefined();
  });

  it('flags a dead-end page (no way out) as info', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: { actions: { go: { does: 'Go', goTo: 'trap' } } },
        trap: { actions: { noop: { does: 'Stuck here' } } },
      },
    });
    const findings = lintGraph(graph);
    const deadEnd = findings.find((f) => f.code === 'dead-end-page' && f.page === 'trap');
    expect(deadEnd).toBeDefined();
    expect(deadEnd!.severity).toBe('info');
  });
});

describe('a key the app writes that nothing ever reads', () => {
  it('flags a write no guard ever reads as info', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { act: { does: 'Act', writes: ['telemetryPing'] } } } },
    });
    const findings = lintGraph(graph);
    const orphan = findings.find((f) => f.code === 'unconsumed-write');
    expect(orphan).toBeDefined();
    expect(orphan!.severity).toBe('info');
    expect(orphan!.keys).toContain('telemetryPing');
  });
});

describe('EVERY REFUSAL TEACHES: a finding always names what to do about it', () => {
  it('every finding names the two-path remedy', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { act: { does: 'Act', when: { ghost: { eq: true } } } } } },
    });
    for (const finding of lintGraph(graph)) {
      expect(finding.remedy.length).toBeGreaterThan(0);
    }
  });

  it('expectNoStaleLogic throws with a formatted report on an error', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { act: { does: 'Act', when: { qty: { gt: 5, lt: 3 } } } } } },
    });
    expect(() => expectNoStaleLogic(graph)).toThrow(/unsatisfiable-guard/);
  });

  it('expectNoStaleLogic can widen to fail on warnings', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { act: { does: 'Act', when: { ghost: { eq: true } } } } } },
    });
    expect(() => expectNoStaleLogic(graph)).not.toThrow(); // ghost is a warning by default
    expect(() => expectNoStaleLogic(graph, { failOn: 'warning' })).toThrow(/dangling-guard-key/);
  });

  it('formatFindings renders an empty string when clean', () => {
    expect(formatFindings([])).toBe('');
  });

  it('formatFindings puts the most severe finding first, and names where each one lives', () => {
    // One graph, one of each scope: an action-scoped error, a journey-scoped
    // error with no single action to blame, and a page-scoped note. The report
    // has to answer "where?" for all three, and lead with the worst.
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            a: { does: 'A', when: { x: { gt: 0 } }, writes: ['y'] },
            b: { does: 'B', when: { y: { gt: 0 } }, writes: ['x'] },
            leave: { does: 'Leave', goTo: 'attic' },
          },
        },
        attic: { actions: { sit: { does: 'Sit here' } } },
      },
      journeys: { flow: { does: 'A flow', steps: ['a', 'b'] } },
    });
    const report = formatFindings(lintGraph(graph));
    const first = report.split('\n')[0];
    expect(first).toMatch(/^\[ERROR]/);
    expect(report).toMatch(/journey-step-cycle \(flow\)/); //     journey-scoped
    expect(report).toMatch(/dead-end-page \(attic\)/); //         page-scoped
    expect(report.indexOf('[ERROR]')).toBeLessThan(report.indexOf('[INFO]'));
  });

  it('formatFindings still renders a finding that names no place at all', () => {
    // LintFinding leaves all three locations optional, so a caller assembling
    // findings of their own can hand over one that is about the graph as a
    // whole. It gets a headline without an empty "()" hanging off it.
    const report = formatFindings([
      { code: 'unconsumed-write', severity: 'info', message: 'Something in general.', remedy: 'Your call.' },
    ]);
    expect(report).toContain('[INFO] unconsumed-write\n');
    expect(report).not.toContain('()');
  });
});

describe('a finding lists the keys it is about in a sentence, not as a dump', () => {
  it('joins two or more keys the way a person would say them', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            act: { does: 'Act', when: { ghostA: { eq: true }, ghostB: { eq: true } } },
            emit: { does: 'Emit', writes: ['tick', 'tock', 'chime'] },
          },
        },
      },
    });
    const findings = lintGraph(graph);
    expect(findings.find((f) => f.code === 'dangling-guard-key')!.message).toContain('“ghostA” and “ghostB”');
    // Three keys, and the plural pronoun that goes with more than one.
    const orphan = findings.find((f) => f.code === 'unconsumed-write')!;
    expect(orphan.message).toContain('“tick”, “tock” and “chime”');
    expect(orphan.message).toContain('reads them');
  });
});

describe('what the app guarantees before anything runs can be stated as bare key names', () => {
  it('accepts initialState as a list of keys, not only a sample object', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { act: { does: 'Act', when: { seeded: { eq: true } } } } } },
    });
    // The key is seeded from outside, so naming it must silence the warning —
    // and naming it as a string is the same statement as handing over a sample.
    expect(lintGraph(graph, { initialState: ['seeded'] }).map((f) => f.code)).not.toContain(
      'dangling-guard-key',
    );
    expect(lintGraph(graph, { initialState: { seeded: true } }).map((f) => f.code)).not.toContain(
      'dangling-guard-key',
    );
  });
});

describe('a journey step waiting on state, and who is expected to produce it', () => {
  it('stays a WARNING while nothing is grounded — the app may seed the key itself', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            first: { does: 'First', writes: ['a'] },
            second: { does: 'Second', when: { approved: { eq: true } }, writes: ['done'] },
          },
        },
      },
      journeys: { flow: { does: 'A flow', steps: ['first', 'second'] } },
    });
    // Same graph as the grounded case above, minus the claim about the world.
    expect(lintGraph(graph).find((f) => f.code === 'uncompletable-journey')!.severity).toBe('warning');
  });

  it('says nothing when an action OUTSIDE the journey produces what a step waits on', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            'sign-in': { does: 'Sign in', writes: ['ready'] },
            go: { does: 'Go', when: { ready: { eq: true } }, writes: ['done'] },
          },
        },
      },
      // The journey names only `go`. `sign-in` is a real way to get `ready`, so
      // the step is not blocked — it just is not this journey's job to do it.
      journeys: { flow: { does: 'A flow', steps: ['go'] } },
    });
    const codes = lintGraph(graph, { initialState: {} }).map((f) => f.code);
    expect(codes).not.toContain('uncompletable-journey');
    expect(codes).not.toContain('journey-step-order');
  });

  it('looks past a step that writes nothing when hunting for the producer', () => {
    const graph = buildNavigationGraph('g', {
      pages: {
        home: {
          actions: {
            needsX: { does: 'Needs X', when: { x: { gt: 0 } }, writes: ['done'] },
            inert: { does: 'Changes nothing' },
            makesX: { does: 'Makes X', writes: ['x'] },
          },
        },
      },
      // `inert` sits between the two and declares no writes at all.
      journeys: { flow: { does: 'A flow', steps: ['needsX', 'inert', 'makesX'] } },
    });
    const order = lintGraph(graph).find((f) => f.code === 'journey-step-order');
    expect(order).toBeDefined();
    expect(order!.message).toContain('“home.makesX”');
  });
});

describe('a key a journey reads before it opens counts as read', () => {
  it('does not call a write unconsumed when a journey precondition reads it', () => {
    const graph = buildNavigationGraph('g', {
      pages: { home: { actions: { 'sign-in': { does: 'Sign in', writes: ['loggedIn'] } } } },
      // The journey's `when` is its precondition — a read, like any guard.
      journeys: {
        flow: { does: 'A flow', when: { loggedIn: { eq: true } }, steps: ['sign-in'] },
      },
    });
    expect(lintGraph(graph).map((f) => f.code)).not.toContain('unconsumed-write');
  });
});
