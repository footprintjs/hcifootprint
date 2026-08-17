/**
 * The advisory has to fire on the shape it is about, and stay quiet on the rest.
 *
 * Both halves are the test. An advisory that never fires is decoration; one that
 * fires on an ordinary graph is noise people learn to scroll past, and the first
 * version of this did exactly that on the suite's own fixtures.
 *
 * The fixtures are authored the way the library is actually authored — actions
 * NESTED under pages, navigation declared with `goTo`. An earlier attempt used a
 * top-level `actions` map, which does not exist: the graph compiled with no
 * actions at all, the advisory correctly said nothing, and the silence was read
 * as a false negative.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph } from '../src/index.js';
import { lintGraph } from '../src/testing/model/lint.js';

const waypointFindings = (g: ReturnType<typeof buildNavigationGraph>) =>
  lintGraph(g).filter((f) => f.code === 'waypoint-page');

describe('waypoint-page advisory', () => {
  it('says nothing about a single hub', () => {
    const g = buildNavigationGraph('one-hub', {
      pages: {
        home: { actions: { 'to-work': { does: 'Go to work', goTo: 'work' } } },
        work: { actions: { doIt: { does: 'Do the thing', writes: ['done'] } } },
      },
    } as never);
    expect(waypointFindings(g)).toEqual([]);
  });

  it('fires when most of the map only routes', () => {
    const g = buildNavigationGraph('all-waypoints', {
      pages: {
        a: { actions: { ab: { does: 'Go to b', goTo: 'b' } } },
        b: { actions: { bc: { does: 'Go to c', goTo: 'c' } } },
        c: { actions: { cd: { does: 'Go to d', goTo: 'd' } } },
        d: { actions: { doIt: { does: 'Do the thing', writes: ['done'] } } },
      },
    } as never);
    const found = waypointFindings(g);
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain('3 of 4 pages');
  });

  it('is advisory, never an error — a routing-heavy app is not broken', () => {
    const g = buildNavigationGraph('spokes', {
      pages: {
        a: { actions: { ab: { does: 'Go to b', goTo: 'b' } } },
        b: { actions: { bc: { does: 'Go to c', goTo: 'c' } } },
        c: { actions: { cd: { does: 'Go to d', goTo: 'd' } } },
        d: { actions: { doIt: { does: 'Do the thing', writes: ['done'] } } },
      },
    } as never);
    for (const f of waypointFindings(g)) expect(f.severity).toBe('info');
  });
});
