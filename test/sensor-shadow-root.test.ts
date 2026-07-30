/**
 * ONE WATCHER PER SHADOW ROOT — the honest limit of a single delegation root, and
 * the pin that keeps the documentation for it true.
 *
 * The DOM RETARGETS a composed event that crosses a shadow boundary: a listener
 * on the outer page reads `event.target` as the HOST element, never the control
 * inside it. So a sensor rooted outside the boundary computes the host's role and
 * name — and a host that presents no role is silence, exactly as a click on prose
 * is. Nothing is mis-attributed. Nothing is reported either.
 *
 * These two tests are PINS, not mutation proofs: the fix for this was a sentence
 * on `WatchOptions.root` and a paragraph in the docs, and both tests pass against
 * the pre-change source. What they prevent is the documentation quietly becoming
 * a lie — that the retargeted click stays honest rather than being attributed to
 * the host, and that the prescribed answer (hand the shadow root in) really works.
 *
 * The fake models retargeting the only way it can be modelled: a second delegation
 * root holds the control, and the event the OUTER root receives names the host.
 * That is precisely what a real Chromium delivers.
 */
import { describe, expect, it } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { Surface, desk, el, humanClick, mountDesk } from './sensor-fixture.js';

/** The page, the host, and the control living in the host's own tree. */
function pageWithShadowControl(): {
  session: ReturnType<typeof mountDesk>['session'];
  page: Surface;
  shadow: Surface;
  host: ReturnType<typeof el>;
  button: ReturnType<typeof el>;
} {
  const { session, surface: page, view } = mountDesk();
  const host = el('div', { attrs: { id: 'host' } });
  page.mount(host);
  // The control's own tree. It shares the view — a shadow root's timers and its
  // location are the outer window's — but it is its own event-delegation root.
  const shadow = new Surface(view);
  const button = el('button', { text: 'Send' });
  shadow.mount(button);
  return { session, page, shadow, host, button };
}

describe('a click retargeted to the host is not attributed to the control inside', () => {
  it('reports nothing and invents nothing — but coverage cannot see the wall', () => {
    const { session, page, host } = pageWithShadowControl();
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: page, onReport: (r) => reports.push(r) });

    // What a listener OUTSIDE the boundary actually receives for a click on the
    // button: the host, retargeted.
    humanClick(host);

    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(0);
    expect(reports.filter((r) => r.kind === 'reported')).toHaveLength(0);
    // Not off-graph either: a role-less host is not a control the graph failed to
    // declare, and saying so would be a guess about a tree this watcher cannot see.
    expect(reports.filter((r) => r.kind === 'off-graph')).toHaveLength(0);

    // THE LIMIT, STATED RATHER THAN IMPLIED. coverage() speaks about the GRAPH: it
    // never claims a locator resolves to a real element, so it cannot know the
    // control is behind a boundary. This is the documented reason to hand the
    // shadow root in yourself.
    expect(watch.coverage().edges.find((e) => e.edge === desk.send)).toMatchObject({ status: 'watching' });
    watch.stop();
  });

  it('the documented answer works: hand the shadow root in and the same click is one row', () => {
    const { session, shadow, button } = pageWithShadowControl();
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: shadow, onReport: (r) => reports.push(r) });

    // Inside its own tree there is no retargeting to lose: the target is the
    // control, and recognition reads the role and name it really presents.
    humanClick(button);

    expect(reports.filter((r) => r.kind === 'reported')).toMatchObject([{ edge: desk.send }]);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });
});
