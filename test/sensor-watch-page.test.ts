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
import type { SensorReport } from '../src/sensor/index.js';
import { FakeView, Surface, desk, el, humanClick, mountDesk, settle } from './sensor-fixture.js';

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

  it('stop() releases the location listeners too', () => {
    const { session, surface, view } = mountDesk();
    const watch = watchPage(session, { root: surface, watchLocation: true });
    expect(view.listenerCount).toBe(2); // popstate + hashchange
    watch.stop();
    expect(view.listenerCount).toBe(0);
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
