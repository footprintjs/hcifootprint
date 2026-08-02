/**
 * REQUIREMENT TWO: ONE CANONICAL DOOR, AND ONE HUMAN ACT WRITES ONE LEDGER ROW.
 *
 * Two halves, and the first is already won in the type system: the sensor is
 * RECORD-ONLY and structurally incapable of executing anything, because
 * `RecordOnlyFire` pins `invoke` to `false` and `#invokeHandler` returns on its
 * first line for that value. The app's own onClick runs the app's code; the sensor
 * only writes it down.
 *
 * The second half is the collisions, and there are exactly three. Each gets a
 * NAMED answer here rather than being left to taste, because the library has NO
 * dedupe primitive to lend: `FireOptions` carries no idempotency key and the
 * transition log is append-only. Every block below carries its own mutation proof —
 * remove the rule and you get two rows, or a noise row.
 */
import { describe, expect, it } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { desk, el, humanClick, humanKey, mountDesk, recordFires, settle } from './sensor-fixture.js';

function rowsFor(session: ReturnType<typeof mountDesk>['session'], edge: string): unknown[] {
  return session.transitions().filter((t) => t.cause.affordanceId === edge);
}

describe('COLLISION ONE — two doors: the app already reports this edge itself', () => {
  it('the sensor stands down, and coverage says exactly why', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface, reportedElsewhere: [desk.send] });

    // The app's own door, the shape live-desk hand-wrote: report, then perform.
    button.addEventListener('click', () => {
      session.fire(desk.send, { source: 'user', invoke: false });
    });

    humanClick(button);

    expect(rowsFor(session, desk.send)).toHaveLength(1);
    expect(watch.coverage().edges.find((e) => e.edge === desk.send)).toMatchObject({
      status: 'unwatched',
      blocked: 'door',
    });
    watch.stop();
  });

  it('MUTATION PROOF: drop the exclusion and one human click writes TWO rows', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    button.addEventListener('click', () => {
      session.fire(desk.send, { source: 'user', invoke: false });
    });

    humanClick(button);
    expect(rowsFor(session, desk.send)).toHaveLength(2);
    watch.stop();
  });

  it('a DECLARED control for an excluded edge still attaches — it just reports nothing', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface, reportedElsewhere: [desk.send] });
    const attachment = watch.attach({ edge: desk.send, element: button });

    humanClick(button);
    expect(rowsFor(session, desk.send)).toHaveLength(0);
    expect(watch.coverage().declared).toBe(1);
    expect(watch.coverage().edges.find((e) => e.edge === desk.send)).toMatchObject({ blocked: 'door' });
    attachment.detach();
    watch.stop();
  });

  it('the list is read ONCE — a later mutation cannot re-open an edge the app still reports', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const excluded = [desk.send];
    const watch = watchPage(session, { root: surface, reportedElsewhere: excluded });

    // An app that mutated its own array under a live watcher would otherwise
    // silently re-open the double-row bug this option exists to prevent.
    excluded.length = 0;
    humanClick(button);
    expect(rowsFor(session, desk.send)).toHaveLength(0);
    watch.stop();
  });
});

describe('COLLISION TWO — two event classes, one activation', () => {
  it('Enter on a button is ONE row: the keydown is silence, the generated click is the act', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    // Exactly what a browser does: keydown, then a browser-generated click whose
    // isTrusted is TRUE. The keydown listener is live because the desk has a
    // press-bound control (Undo), so both really reach the sensor.
    humanKey(button, 'Enter');
    humanClick(button);

    expect(rowsFor(session, desk.send)).toHaveLength(1);
    // MUTATION PROOF for the wrong-moment rule: without it the keydown reads as a
    // control the graph never declared, and the consumer gets a noise row.
    expect(reports.filter((r) => r.kind === 'off-graph')).toHaveLength(0);
    watch.stop();
  });

  it('a known control at the wrong moment is SILENCE — not a row, not an advisory', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // Only what the keystroke adds — the startup advisories are already in.
    const before = reports.length;

    humanKey(button, 'Enter');
    expect(reports).toHaveLength(before);
    expect(rowsFor(session, desk.send)).toHaveLength(0);
    watch.stop();
  });

  it('the press-bound control DOES answer to keydown — the rule is about the moment, not the class', () => {
    const { session, surface } = mountDesk();
    const undo = el('button', { text: 'Undo' });
    surface.mount(undo);
    const watch = watchPage(session, { root: surface });

    humanKey(undo, 'Enter');
    expect(rowsFor(session, desk.undo)).toHaveLength(1);
    watch.stop();
  });

  it('a keydown that is no gesture at all is not even considered', () => {
    const { session, surface } = mountDesk();
    const undo = el('button', { text: 'Undo' });
    surface.mount(undo);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // The startup advisories about unwatched edges are already in; this asks only
    // what the two keystrokes added.
    const before = reports.length;

    humanKey(undo, 'a');
    humanKey(undo, 'Shift');
    expect(reports).toHaveLength(before);
    expect(rowsFor(session, desk.undo)).toHaveLength(0);
    watch.stop();
  });
});

describe('COLLISION THREE — two events, one turn', () => {
  it('a label and the control it labels, both declared for one edge, write ONE row', async () => {
    // The real page shape: clicking a <label> dispatches a click on the label and
    // then, as the label's activation behaviour, a click on the control — one human
    // act, two events, same task.
    const { session, surface } = mountDesk();
    const input = el('input', { attrs: { type: 'checkbox' } });
    const label = el('label', { text: 'Archive', children: [input] });
    surface.mount(label);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });
    watch.attach({ edge: desk.archive, element: label });
    watch.attach({ edge: desk.archive, element: input });

    humanClick(label);
    humanClick(input);

    expect(fires).toHaveLength(1);
    expect(rowsFor(session, desk.archive)).toHaveLength(1);
    watch.stop();
  });

  it('MUTATION PROOF: without the turn window that same act is two rows', async () => {
    const { session, surface } = mountDesk();
    const input = el('input', { attrs: { type: 'checkbox' } });
    const label = el('label', { text: 'Archive', children: [input] });
    surface.mount(label);
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.archive, element: label });
    watch.attach({ edge: desk.archive, element: input });

    // Letting the window CLOSE between the two events is what removing the rule
    // amounts to: they are then two separate turns, and two rows.
    humanClick(label);
    await settle();
    humanClick(input);
    expect(rowsFor(session, desk.archive)).toHaveLength(2);
    watch.stop();
  });

  it('two genuine acts in two turns are two rows — the window removes duplicates, not acts', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });

    humanClick(button);
    await settle();
    humanClick(button);
    expect(rowsFor(session, desk.send)).toHaveLength(2);
    watch.stop();
  });

  it('two INSTANCES of one edge in one turn stay two rows — they are not the same row', () => {
    const { session, surface } = mountDesk({ state: { threadIds: ['t-1', 't-2'] } });
    const first = el('button', { text: 'Reply' });
    const second = el('button', { text: 'Reply' });
    surface.mount(el('ul', { children: [first, second] }));
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.reply, element: first, instance: 't-1' });
    watch.attach({ edge: desk.reply, element: second, instance: 't-2' });

    humanClick(first);
    humanClick(second);
    expect(rowsFor(session, desk.reply)).toHaveLength(2);
    watch.stop();
  });
});

describe('the record-only guarantee, restated where a reader will look for it', () => {
  it("the app's handler runs exactly once, and the sensor runs nothing", () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    let appRuns = 0;
    let registeredRuns = 0;
    // BOTH doors are wired, which is the dangerous shape: a registered handler for
    // the agent, and the app's own onClick for the human.
    session.registerActions('inbox', { handlers: { send: () => (registeredRuns += 1) } });
    button.addEventListener('click', () => (appRuns += 1));
    const watch = watchPage(session, { root: surface });

    humanClick(button);
    expect(appRuns).toBe(1);
    // The sensor's fire records the act and invokes nothing — so the human's click
    // cannot run the app's code twice.
    expect(registeredRuns).toBe(0);
    expect(rowsFor(session, desk.send)).toHaveLength(1);
    watch.stop();
  });
});
