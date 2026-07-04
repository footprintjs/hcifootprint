/**
 * The injectable clock (core seam) — time-dependent staleness (dormant
 * registrations past the grace window) becomes deterministic with no real
 * waits. Proves the seam both at the InteractionSession level and through
 * testApp's controllable clock.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { testApp } from '../src/testing/index.js';
import type { GapRecord } from '../src/index.js';

function twoPageGraph() {
  return buildNavigationGraph('two', {
    pages: {
      catalog: { tools: { browse: { does: 'Browse' } } },
      settings: { tools: { save: { does: 'Save settings' } } },
    },
  });
}

describe('injectable clock — InteractionSession', () => {
  it('fires the sensor-drift gap only after the grace window elapses on the injected clock', () => {
    let now = 0;
    const gaps: GapRecord[] = [];
    const session = twoPageGraph().createSession({
      node: 'catalog',
      dormantGraceMs: 3000,
      now: () => now,
      onWarn: () => undefined,
    });
    session.onGap((gap) => gaps.push(gap));

    // A registration on 'settings' while the router says 'catalog' is dormant.
    session.registerToolGroup('settings', { handlers: { save: () => undefined } });

    session.available(); // t=0 — within grace, no drift yet
    expect(gaps.some((g) => g.reason === 'sensor-drift')).toBe(false);

    now = 3001; // advance the clock past the grace window
    session.available(); // drift check now fires
    expect(gaps.some((g) => g.reason === 'sensor-drift')).toBe(true);
  });

  it('defaults to real time when no clock is injected (no crash, no drift immediately)', () => {
    const session = twoPageGraph().createSession({ node: 'catalog', onWarn: () => undefined });
    session.registerToolGroup('settings', { handlers: { save: () => undefined } });
    // Immediately after registration nothing is past the (3s real) grace window.
    expect(session.available().node).toBe('catalog');
  });
});

describe('injectable clock — testApp', () => {
  it('advanceTime drives the grace timer deterministically', () => {
    const app = testApp(twoPageGraph(), { node: 'catalog', dormantGraceMs: 1000 });
    app.session.registerToolGroup('settings', { handlers: { save: () => undefined } });

    app.session.available();
    expect(app.report().gaps.some((g) => g.reason === 'sensor-drift')).toBe(false);

    app.advanceTime(1001);
    app.session.available();
    expect(app.report().gaps.some((g) => g.reason === 'sensor-drift')).toBe(true);
  });
});
