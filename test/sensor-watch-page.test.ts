/**
 * watch-page.ts — the assembly: capture phase, the report arms, coverage, location
 * motion, and teardown.
 *
 * The capture-phase assertion is the one worth reading. It is not a preference
 * test: it proves the sensor's fire is judged against the page the human ACTED on
 * rather than the page the app's own handler navigated to a microsecond later. Get
 * that wrong and the sensor invents STALE_CURSOR and NOT_ON_NODE refusals for
 * actions that were perfectly legal.
 *
 * Mutation proof: watch-page.ts did not exist before this change, so every test
 * here fails against pre-change source.
 */
import { describe, expect, it, vi } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import { watchLocation } from '../src/sensor/watch-location.js';
import type { SensorReport } from '../src/sensor/index.js';
import type { SensorSession } from '../src/sensor/types.js';
import type { SensorWindow } from '../src/sensor/dom-port.js';
import {
  FakeView,
  Surface,
  clock,
  desk,
  deskGraph,
  el,
  humanClick,
  humanCommit,
  humanKey,
  humanType,
  mountDesk,
  settle,
} from './sensor-fixture.js';

describe('CAPTURE PHASE — the act is judged against the page the human acted on', () => {
  it("records fromNode as the page it happened on, even though the app's handler navigated first", () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    // The app's own onClick, which moves the page — the ordinary shape of a
    // navigating control.
    button.addEventListener('click', () => {
      session.sync('profile');
    });

    humanClick(button);

    const row = session.transitions().find((t) => t.cause.affordanceId === desk.send);
    expect(row?.fromNode).toBe('inbox');
    expect(session.available().node).toBe('profile');
    expect(row?.outcome).not.toBe('rejected');
    watch.stop();
  });

  it('MUTATION PROOF: judged after the app navigates, the same click is NOT_ON_NODE', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    // The mutation, made literal: let the app move first, then report.
    session.sync('profile');
    expect(session.fire(desk.send, { source: 'user', invoke: false })).toMatchObject({
      ok: false,
      reason: 'NOT_ON_NODE',
    });
    void surface;
  });
});

describe('the report arms', () => {
  it('a recognised act is `reported`, carrying the session’s own answer', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    humanClick(button);
    expect(reports.filter((r) => r.kind === 'reported')).toMatchObject([
      { edge: desk.send, result: { ok: true } },
    ]);
    watch.stop();
  });

  it('a refusal is still `reported` — the session answers, the sensor does not editorialise', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Reply' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // A declared instance the session does not know: the honest answer is the
    // session's INSTANCE_UNKNOWN, not sensor silence.
    watch.attach({ edge: desk.reply, element: button, instance: 'ghost' });

    humanClick(button);
    expect(reports.filter((r) => r.kind === 'reported')).toMatchObject([
      { edge: desk.reply, instance: 'ghost', result: { ok: false, reason: 'INSTANCE_UNKNOWN' } },
    ]);
    watch.stop();
  });

  it('a real control the graph never declared is `off-graph`, with the gesture named', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Delete forever' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    humanClick(button);
    expect(reports.filter((r) => r.kind === 'off-graph')).toEqual([
      { kind: 'off-graph', role: 'button', name: 'Delete forever', actuation: 'click' },
    ]);
    watch.stop();
  });

  it('a click on prose is not reported at all — it was never an interaction', () => {
    const { session, surface } = mountDesk();
    const paragraph = el('p', { text: 'Send' });
    surface.mount(el('article', { children: [paragraph] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    const before = reports.length;

    humanClick(paragraph);
    expect(reports).toHaveLength(before);
    watch.stop();
  });

  it('two edges answering one locator is `ambiguous`, and NO row is written', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Save' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    humanClick(button);
    expect(reports.filter((r) => r.kind === 'ambiguous')).toMatchObject([
      { candidates: expect.arrayContaining([desk.save, desk.saveDraft]) },
    ]);
    expect(session.transitions().some((t) => t.cause.affordanceId === desk.save)).toBe(false);
    watch.stop();
  });

  it('an advisory is WITHDRAWN once the app lifts the wall', () => {
    const { session, surface } = mountDesk();
    const label = el('label', { text: 'Message' });
    const input = el('input', { attrs: { type: 'text' }, labels: [label] });
    surface.mount(el('form', { children: [label, input] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // Said at the one instant a declaration was IMPOSSIBLE: attach() lives on the
    // handle watchPage has not returned yet, so every value-taking edge is advised
    // about before the app has had its chance.
    expect(reports.filter((r) => r.kind === 'unwatched' && r.edge === desk.compose)).toHaveLength(1);

    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: 'hi' }) });

    // MUTATION PROOF: nothing used to take it back. coverage() flipped to
    // `watching` and a consumer reading the report stream went on believing a wall
    // the app had already torn down.
    expect(reports.filter((r) => r.kind === 'watching')).toEqual([{ kind: 'watching', edge: desk.compose }]);
    expect(watch.coverage().edges.find((e) => e.edge === desk.compose)).toMatchObject({ status: 'watching' });
    watch.stop();
  });

  it('the wall coming back is said again — a withdrawn advisory is not a spent budget', () => {
    const { session, surface } = mountDesk();
    const label = el('label', { text: 'Message' });
    const input = el('input', { attrs: { type: 'text' }, labels: [label] });
    surface.mount(el('form', { children: [label, input] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: 'hi' }) }).detach();

    // MUTATION PROOF: the once-per-(edge, sentence) budget was spent at startup, so
    // the edge going back to unwatched was silence. The sentence is only worth
    // suppressing while it is still the last thing said.
    expect(reports.filter((r) => r.kind === 'unwatched' && r.edge === desk.compose)).toHaveLength(2);
    watch.stop();
  });

  it('a sensor throw is isolated — the app’s own dispatch is never broken', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // A declared value getter that throws is the app's bug, not the page's.
    watch.attach({ edge: desk.compose, element: button, value: () => { throw new Error('app bug'); } });
    let appHandlerRan = false;
    button.addEventListener('click', () => (appHandlerRan = true));

    expect(() => humanClick(button)).not.toThrow();
    expect(appHandlerRan).toBe(true);
    expect(reports.filter((r) => r.kind === 'sensor-error')).toHaveLength(1);
    watch.stop();
  });

  it('a throwing onReport is warned about ONCE, and reports keep flowing', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let calls = 0;
    const watch = watchPage(session, {
      root: surface,
      onReport: () => {
        calls += 1;
        throw new Error('consumer bug');
      },
    });

    humanClick(button);
    humanClick(button);
    expect(calls).toBeGreaterThan(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('onReport listener threw');
    warn.mockRestore();
    watch.stop();
  });
});

describe('coverage() — the whole live surface, and the tally since the watcher started', () => {
  it('one row per served edge, plus the declared count and the clock window', () => {
    const { session, surface, time } = mountDesk();
    const watch = watchPage(session, { root: surface, now: () => time.now() });
    const served = session.available().edges.length;

    const before = watch.coverage();
    expect(before.edges).toHaveLength(served);
    expect(before.declared).toBe(0);
    expect(before.since).toBe(before.at);

    const button = el('button', { text: 'Send' });
    surface.mount(button);
    watch.attach({ edge: desk.send, element: button });
    humanClick(button);
    time.advance(500);

    const after = watch.coverage();
    expect(after.declared).toBe(1);
    expect(after.reports.reported).toBe(1);
    expect(after.at - after.since).toBe(500);
    watch.stop();
  });

  it('the tally counts every arm, including the ones that wrote nothing', () => {
    const { session, surface } = mountDesk();
    const stranger = el('button', { text: 'Delete forever' });
    surface.mount(stranger);
    const watch = watchPage(session, { root: surface });

    humanClick(stranger);
    stranger.click();
    const tally = watch.coverage().reports;
    expect(tally['off-graph']).toBe(1);
    expect(tally.reported).toBe(0);
    // The programmatic click on an undeclared control is as unreportable as the
    // human one, so it declines silently.
    expect(tally['synthetic-event']).toBe(0);
    expect(tally.unwatched).toBeGreaterThan(0);
    watch.stop();
  });

  it('the manifest is re-derived PER EVENT, not from the last announcement', () => {
    // A session that never announces anything — the shape a coalesced structure
    // flip produces for the microsecond before it flushes, and the shape a
    // version-keyed memo would also produce for a guard flip. What the sensor knew
    // at attach time says two live rows, so a Reply click was AMBIGUOUS then.
    const { session, surface } = mountDesk({ state: { threadIds: ['t-1', 't-2'] } });
    const button = el('button', { text: 'Reply' });
    surface.mount(button);
    const silent = {
      available: () => session.available(),
      fire: (edge: string, opts: never) => session.fire(edge, opts),
      on: () => () => undefined,
      sync: (node: string) => session.sync(node),
    };
    const reports: SensorReport[] = [];
    const watch = watchPage(silent as never, { root: surface, onReport: (r) => reports.push(r) });

    // The surface moves and NOBODY tells the sensor. One row is live now.
    session.updateState({ threadIds: ['t-1'] });

    humanClick(button);
    expect(reports.filter((r) => r.kind === 'ambiguous')).toHaveLength(0);
    expect(reports.filter((r) => r.kind === 'reported')).toMatchObject([
      { edge: desk.reply, instance: 't-1' },
    ]);
    watch.stop();
  });
});

describe('only the event classes the live list needs are registered', () => {
  it('a surface with nothing declared and no locators asks for no listeners at all', () => {
    const view = new FakeView('/inbox');
    const surface = new Surface(view);
    const bare = {
      available: () => ({ version: 1, node: 'inbox', edges: [] }),
      fire: () => ({ ok: true as const, affordanceId: 'x', settlement: Promise.resolve({}) as never }),
      on: () => () => undefined,
      sync: () => ({ ok: true as const }) as never,
    };
    const watch = watchPage(bare as never, { root: surface });
    expect(surface.listenerCount).toBe(0);
    watch.stop();
  });

  it('declaring a control adds exactly the class its moment needs, and detaching removes it', () => {
    const { session, surface } = mountDesk();
    const input = el('input', { attrs: { type: 'text' } });
    surface.mount(input);
    const watch = watchPage(session, { root: surface });
    const beforeAttach = surface.listenerCount;

    const attachment = watch.attach({
      edge: desk.compose,
      element: input,
      value: () => ({ message: 'x' }),
    });
    expect(surface.listenerCount).toBe(beforeAttach + 1); // 'change'
    attachment.detach();
    expect(surface.listenerCount).toBe(beforeAttach);
    watch.stop();
  });
});

describe('watchLocation — OPT-IN, and the cost of the default proves itself', () => {
  it('off by default: a Back button moves nothing', () => {
    const { session, surface, view } = mountDesk();
    const watch = watchPage(session, { root: surface });
    view.navigate('/profile');
    expect(session.available().node).toBe('inbox');
    watch.stop();
  });

  it('on, it hands the RAW PATH to sync() — and in a named-pages app that empties the surface', () => {
    const { session, surface, view } = mountDesk();
    const watch = watchPage(session, { root: surface, watchLocation: true });
    view.navigate('/profile');
    // THE COST, asserted rather than argued. Page ids are author-chosen names, not
    // paths, so the raw path is not a page: the cursor follows it anyway and the
    // app's whole agent surface goes quiet. That is why this is not a default.
    expect(session.available().node).toBe('/profile');
    expect(session.available().edges).toEqual([]);
    watch.stop();
  });

  it('a re-announcement of the same path is not a hop', () => {
    const { session, surface, view } = mountDesk();
    const watch = watchPage(session, { root: surface, watchLocation: true });
    const before = session.transitions().length;
    view.navigate('/inbox');
    expect(session.transitions()).toHaveLength(before);
    watch.stop();
  });

  it('a hop the session refuses becomes a sensor-error report, not a broken Back button', () => {
    // The location listener runs inside the app's own popstate dispatch, so the
    // watcher's wiring has to catch what the session throws and hand it to the
    // host as a report. A throw escaping here would abort whatever else that
    // page does on navigation.
    const { session, surface, view } = mountDesk();
    const refused = new Error('the router said no');
    const port = {
      available: () => session.available(),
      fire: (edge: string, opts: never) => session.fire(edge, opts),
      on: (event: never, listener: never) => session.on(event, listener),
      sync: () => {
        throw refused;
      },
    };
    const reports: SensorReport[] = [];
    const watch = watchPage(port as never, {
      root: surface,
      watchLocation: true,
      onReport: (r) => reports.push(r),
    });

    expect(() => view.navigate('/profile')).not.toThrow();
    expect(reports.filter((r) => r.kind === 'sensor-error')).toEqual([
      { kind: 'sensor-error', error: refused },
    ]);
    watch.stop();
  });

  it('stop() releases the location listeners too', () => {
    const { session, surface, view } = mountDesk();
    const watch = watchPage(session, { root: surface, watchLocation: true });
    expect(view.listenerCount).toBe(2); // popstate + hashchange
    watch.stop();
    expect(view.listenerCount).toBe(0);
  });
});

describe('THE SENSOR IS A GUEST: nothing about the page is assumed to be there', () => {
  // The location watcher runs inside the app's own event dispatch and reads a
  // host object nobody promised it. All three arms below are the same rule from
  // three directions: when the page cannot answer, the sensor stays quiet and
  // stays out of the way — it never throws into the app's popstate, and it never
  // invents a hop it did not read.
  /** A session that records every hop it is told about — or refuses one. */
  const sessionThat = (sync: (node: string) => void): SensorSession =>
    ({
      available: () => ({ node: 'inbox', version: 0, edges: [], journeys: [] }),
      fire: () => ({ ok: false, reason: 'UNKNOWN_AFFORDANCE', available: [] }),
      on: () => () => undefined,
      sync: (node: string) => {
        sync(node);
        return { changed: false, node, version: 0 };
      },
    }) as unknown as SensorSession;

  /**
   * A window built by hand rather than by the fixture: these tests need the
   * location to STAY hostile across a dispatch, and FakeView.navigate rewrites
   * it to a well-formed path on the way through.
   */
  function hostileWindow(location: unknown): { window: SensorWindow; announce: () => void } {
    const listeners: (() => void)[] = [];
    const window = {
      location,
      addEventListener: (_type: string, listener: () => void) => void listeners.push(listener),
      removeEventListener: () => undefined,
    } as unknown as SensorWindow;
    return { window, announce: () => { for (const listener of [...listeners]) listener(); } };
  }

  it('NO VIEW AT ALL is answered with a working no-op, not a crash', () => {
    // A detached document, a server render, a non-browser host: there is no
    // window to listen to, and "nothing to unsubscribe" is the honest handle to
    // hand back rather than something that throws when a caller stops it.
    const stop = watchLocation(sessionThat(() => undefined), undefined, () => undefined);
    expect(typeof stop).toBe('function');
    expect(() => stop()).not.toThrow();
  });

  it('a pathname that is NOT A STRING moves nothing — a hop is READ, never guessed', () => {
    // The host answers "where are we" with something that is not a path. There
    // is no honest reading of it, and inventing one would move the cursor — and
    // with it the whole served surface — to a page nobody is on.
    for (const location of [{ pathname: 42 }, { pathname: undefined }, undefined]) {
      const hops: string[] = [];
      const { window, announce } = hostileWindow(location);
      watchLocation(sessionThat((node) => void hops.push(node)), window, () => undefined);
      announce();
      expect(hops).toEqual([]);
    }
  });

  it('a throw from inside the report is HANDED TO THE HOST, never into the app’s dispatch', () => {
    // The listener runs on the app's own popstate. Letting a throw escape here
    // would abort whatever else that page does on navigation — the sensor
    // breaking the app it is only supposed to be watching.
    const seen: unknown[] = [];
    const boom = new Error('the session refused');
    const { window, announce } = hostileWindow({ pathname: '/inbox' });
    watchLocation(
      sessionThat(() => {
        throw boom;
      }),
      window,
      (error) => void seen.push(error),
    );
    (window as unknown as { location: { pathname: string } }).location = { pathname: '/profile' };
    expect(() => announce()).not.toThrow();
    expect(seen).toEqual([boom]);
  });
});

describe('teardown discipline', () => {
  it('stop() removes every listener, and is idempotent', () => {
    const { session, surface } = mountDesk();
    const watch = watchPage(session, { root: surface });
    expect(surface.listenerCount).toBeGreaterThan(0);
    watch.stop();
    watch.stop();
    expect(surface.listenerCount).toBe(0);
  });

  it('watch → stop → watch nets to ONE listener set — the StrictMode shape', () => {
    const { session, surface } = mountDesk();
    const first = watchPage(session, { root: surface });
    const count = surface.listenerCount;
    first.stop();
    const second = watchPage(session, { root: surface });
    expect(surface.listenerCount).toBe(count);
    second.stop();
    expect(surface.listenerCount).toBe(0);
  });

  it('attach → detach → attach nets to one declaration', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });

    watch.attach({ edge: desk.send, element: button }).detach();
    watch.attach({ edge: desk.send, element: button });
    expect(watch.coverage().declared).toBe(1);
    humanClick(button);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });

  it('a stopped watcher reports nothing, attaches nothing, and its declarations are gone', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    watch.attach({ edge: desk.send, element: button });
    watch.stop();
    const after = reports.length;

    watch.attach({ edge: desk.archive, element: button }).detach();
    humanClick(button);
    expect(reports).toHaveLength(after);
    expect(watch.coverage().declared).toBe(0);
    expect(session.transitions().some((t) => t.cause.affordanceId === desk.send)).toBe(false);
  });

  it('every unsubscribe is attempted even when one throws', () => {
    const { session, surface } = mountDesk();
    let released = 0;
    const port = {
      available: () => session.available(),
      fire: (edge: string, opts: never) => session.fire(edge, opts),
      on: (_event: string, _listener: never) => () => {
        released += 1;
        if (released === 1) throw new Error('first unsubscribe is broken');
      },
      sync: (node: string) => session.sync(node),
    };
    const reports: SensorReport[] = [];
    const watch = watchPage(port as never, { root: surface, onReport: (r) => reports.push(r) });

    watch.stop();
    // Three subscriptions: structure, transition, state. A teardown that gave up on
    // the first throw would leave two live.
    expect(released).toBe(3);
    expect(reports.filter((r) => r.kind === 'sensor-error')).toHaveLength(1);
  });
});

describe('an off-graph report names the gesture the ELEMENT settles, never a guessed one', () => {
  it('a keypress on an unknown control is a press', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Delete forever' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    humanKey(button, 'Enter');
    expect(reports.filter((r) => r.kind === 'off-graph')).toEqual([
      { kind: 'off-graph', role: 'button', name: 'Delete forever', actuation: 'press' },
    ]);
    watch.stop();
  });

  it('the SAME event is a select on a <select> and a type on a text field', () => {
    // Both actuations ride the value events, so the element decides which — DOM
    // truth about the KIND of control, and never a reading of its value.
    const { session, surface } = mountDesk();
    const picker = el('select', { attrs: { 'aria-label': 'Region' } });
    const field = el('input', { attrs: { 'aria-label': 'Subject' } });
    const known = el('input', { attrs: { 'aria-label': 'Message' } });
    surface.mount(picker, field, known);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // One declared value control, so the watcher is listening for the value
    // events at all — the strangers below ride the same listener.
    watch.attach({ edge: desk.compose, element: known, value: () => ({ message: 'hi' }) });

    humanCommit(picker);
    humanCommit(field);
    expect(reports.filter((r) => r.kind === 'off-graph')).toEqual([
      { kind: 'off-graph', role: 'combobox', name: 'Region', actuation: 'select' },
      { kind: 'off-graph', role: 'textbox', name: 'Subject', actuation: 'type' },
    ]);
    watch.stop();
  });
});

describe('a stopped watcher stays stopped, even where the page does not cooperate', () => {
  it('detaching a control after stop() re-derives nothing', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Archive' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    const attachment = watch.attach({ edge: desk.archive, element: button });

    watch.stop();
    const after = reports.length;
    // A component unmounting AFTER its page tore the watcher down is the ordinary
    // order in a framework, not an error — it must cost nothing.
    expect(() => attachment.detach()).not.toThrow();
    expect(reports).toHaveLength(after);
  });

  it('a listener the page never removed records nothing', () => {
    // stop() removes what it added; this proves the latch as well as the
    // housekeeping. A root that keeps a released listener is an ordinary bug in
    // somebody else's code, and a stopped watcher must not write rows through it.
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const survivor = surface.captureListeners('click')[0];

    watch.stop();
    survivor({ type: 'click', target: button, isTrusted: true });
    expect(session.transitions().some((t) => t.cause.affordanceId === desk.send)).toBe(false);
  });

  it('a debounced commit whose timer the page failed to cancel writes no row', () => {
    // stop() DISARMS its pending commits; this is the second line of defence, for
    // a host whose clearTimeout does not take.
    const time = clock();
    const stubbornTimers = { now: time.now, setTimeout: time.setTimeout, clearTimeout: () => undefined };
    const view = new FakeView('/inbox', stubbornTimers);
    const surface = new Surface(view);
    const session = deskGraph().createSession({
      node: 'inbox',
      state: { threadIds: ['t-1'] },
      now: () => time.now(),
      onWarn: () => undefined,
    });
    const field = el('input', { attrs: { 'aria-label': 'Message' } });
    surface.mount(field);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 50 },
      onReport: (r) => reports.push(r),
    });
    watch.attach({ edge: desk.compose, element: field, value: () => ({ message: 'hi' }) });

    humanType(field);
    watch.stop();
    time.advance(500); // the commit the host failed to cancel lands here

    expect(reports.filter((r) => r.kind === 'reported')).toHaveLength(0);
    expect(session.transitions().some((t) => t.cause.affordanceId === desk.compose)).toBe(false);
  });
});
