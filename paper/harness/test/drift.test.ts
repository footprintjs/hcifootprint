/**
 * Drift axis — the scorer's own guarantees, pinned in CI:
 * a silent baseline (precision), each preregistered layer catching its
 * mutant class (recall floor), and the two designed boundary misses staying
 * missed (if one starts being caught, the harness grew a capability and the
 * paper's limitations section must be updated — that's a GOOD failure).
 */
import { describe, expect, it } from 'vitest';
import { scoreDrift } from '../src/drift/score.js';
import { MUTANTS } from '../src/drift/mutations.js';

describe('drift axis — mutation testing the drift harness', () => {
  it('scores the full mutant catalog with a clean baseline and preregistered-layer agreement', async () => {
    const score = await scoreDrift();

    // Precision: the unmutated shop must be silent on every layer.
    expect(score.baselineClean, score.baselineDetail).toBe(true);

    const byId = new Map(score.results.map((r) => [r.id, r]));

    // Graph-side drift lands in the cheap layers.
    expect(byId.get('M06-skill-step-unknown')!.caughtBy).toBe('compile');
    expect(byId.get('M01-guard-dangling-key')!.caughtBy).toBe('static');
    expect(byId.get('M02-guard-unsatisfiable')!.caughtBy).toBe('static');

    // App-side drift lands in the behavioral layers.
    expect(byId.get('M07-handler-wrong-write')!.caughtBy).toMatch(/^behavioral/);
    expect(byId.get('M08-handler-no-op')!.caughtBy).toMatch(/^behavioral/);
    expect(byId.get('M09-handler-missing')!.caughtBy).toMatch(/^behavioral/);
    expect(byId.get('M10-handler-wrong-nav')!.caughtBy).toMatch(/^behavioral/);
    expect(byId.get('M11-handler-partial-write')!.caughtBy).toMatch(/^behavioral/);

    // Right keys, wrong value: report() is value-blind BY DESIGN; only the
    // value-asserting journey catches it.
    const wrongValue = byId.get('M12-handler-wrong-value')!;
    expect(wrongValue.layers.behavioralReport).toBe(false);
    expect(wrongValue.caughtBy).toBe('behavioral-journey');

    // The preregistered boundary: a weakened guard on the unexercised path
    // stays invisible. If this assertion ever fails, the harness got smarter —
    // update PREREGISTRATION.md and the limitations section.
    expect(byId.get('M13-guard-weakened')!.caughtBy).toBe('missed');

    // The DISCOVERED boundary (first run, 2026-07-13): a stale declared-write
    // list hides when the key is in initialState and the app still writes it.
    // Pinned so a future library improvement (extra-write advisory) surfaces
    // here as a good failure.
    expect(byId.get('M04-skill-uncompletable')!.caughtBy).toBe('missed');

    // Recall floor over catchable mutants (12 of 13; M13 is the designed miss).
    expect(score.results).toHaveLength(MUTANTS.length);
    expect(score.recall).toBeGreaterThanOrEqual(11 / 12);
  }, 30_000);
});
