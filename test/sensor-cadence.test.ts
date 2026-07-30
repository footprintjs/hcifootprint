/**
 * REQUIREMENT FOUR: value-report cadence is a LIBRARY POLICY, not something every
 * consumer rediscovers.
 *
 * The bug it prevents is a ledger nobody can read: reporting per keystroke bumps
 * the session's version per keystroke, so one act of typing becomes thirty rows.
 * So the three settings are named here, the default is the conservative one, and
 * the refusal arm is real — a debounced cadence with no clock is REFUSED, never
 * silently downgraded to the loudest setting.
 *
 * Both halves are tested: cadence.ts as a pure policy, and the same policy driven
 * end to end through watchPage, because the knob is only worth anything if the
 * rows a consumer actually receives obey it.
 *
 * Mutation proofs are named per block below.
 */
import { describe, expect, it } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import {
  commitsOnControl,
  commitsOnGesture,
  createDebouncer,
  debounceMsOf,
  needsTimer,
} from '../src/sensor/cadence.js';
import { clock, desk, el, humanClick, humanCommit, humanType, mountDesk, settle } from './sensor-fixture.js';

describe('cadence.ts — which moment each setting commits on', () => {
  it("'commit' is the default answer for a value control: change, the browser's own word for finished", () => {
    expect(commitsOnGesture('type', 'commit')).toBe('change');
    expect(commitsOnGesture('select', 'commit')).toBe('change');
    expect(commitsOnControl('textbox', 'commit')).toBe('change');
    expect(commitsOnControl('combobox', 'commit')).toBe('change');
  });

  it('the two loud settings both listen to input', () => {
    expect(commitsOnGesture('type', 'per-keystroke')).toBe('input');
    expect(commitsOnGesture('type', { debounceMs: 200 })).toBe('input');
    expect(commitsOnControl('searchbox', { debounceMs: 200 })).toBe('input');
  });

  it('a click and a press ignore cadence entirely — one act, one moment', () => {
    expect(commitsOnGesture('click', { debounceMs: 200 })).toBe('click');
    expect(commitsOnGesture('press', 'per-keystroke')).toBe('keydown');
  });

  it('a pointer gesture has no committed moment at all', () => {
    expect(commitsOnGesture('hover', 'commit')).toBeUndefined();
    expect(commitsOnGesture('drag', 'commit')).toBeUndefined();
  });

  it('a declared control with no value role commits on click, including an unknown role', () => {
    expect(commitsOnControl('button', 'commit')).toBe('click');
    expect(commitsOnControl('checkbox', 'commit')).toBe('click');
    expect(commitsOnControl('', { debounceMs: 50 })).toBe('click');
  });

  it('only the debounced setting needs a clock, and it names its own window', () => {
    expect(needsTimer('commit')).toBe(false);
    expect(needsTimer('per-keystroke')).toBe(false);
    expect(needsTimer({ debounceMs: 200 })).toBe(true);
    expect(debounceMsOf({ debounceMs: 200 })).toBe(200);
    expect(debounceMsOf('commit')).toBeUndefined();
  });
});

describe('the debouncer — last call wins, by construction', () => {
  it('coalesces repeated schedules for one key into a single commit', () => {
    const time = clock();
    const debouncer = createDebouncer(time);
    const commits: string[] = [];
    debouncer.schedule('k', 100, () => commits.push('first'));
    time.advance(50);
    debouncer.schedule('k', 100, () => commits.push('second'));
    time.advance(50);
    expect(commits).toEqual([]); // the window was restarted, so nothing has fired
    time.advance(50);
    expect(commits).toEqual(['second']);
  });

  it('keeps different keys apart', () => {
    const time = clock();
    const debouncer = createDebouncer(time);
    const commits: string[] = [];
    debouncer.schedule('a', 10, () => commits.push('a'));
    debouncer.schedule('b', 10, () => commits.push('b'));
    time.advance(10);
    expect(commits.sort()).toEqual(['a', 'b']);
  });

  it('cancels by KEY, so a clock whose handle is `undefined` is still asked to cancel', () => {
    // A LEGAL CLOCK. `SensorTimers.setTimeout` returns `unknown` precisely so a
    // non-browser host can drive this with its own, and `undefined` is one of the
    // answers that type permits. Reading the stored handle to decide whether
    // anything was pending made the debouncer's own bookkeeping depend on the
    // host's choice of value: the map knew the key was in flight and skipped the
    // cancel anyway. `has` asks the map what the map knows.
    const cancelled: unknown[] = [];
    const due: Array<() => void> = [];
    const handleless = {
      setTimeout(handler: () => void): unknown {
        due.push(handler);
        return undefined;
      },
      clearTimeout(handle: unknown): void {
        cancelled.push(handle);
      },
    };
    const debouncer = createDebouncer(handleless);

    debouncer.schedule('k', 10, () => undefined);
    debouncer.schedule('k', 10, () => undefined);

    // MUTATION PROOF: pre-change this was zero — a second window opened for a key
    // the debouncer had already armed, with no cancel even attempted.
    expect(cancelled).toEqual([undefined]);
    expect(due).toHaveLength(2);
  });

  it('cancelAll disarms everything — the teardown path', () => {
    const time = clock();
    const debouncer = createDebouncer(time);
    let fired = 0;
    debouncer.schedule('a', 10, () => (fired += 1));
    debouncer.cancelAll();
    expect(time.pending).toBe(0);
    time.advance(100);
    expect(fired).toBe(0);
  });
});

/** The desk's Message textbox, wired to a live draft the app holds in a variable. */
function composeSurface(options: Parameters<typeof mountDesk>[0] = {}): {
  reports: SensorReport[];
  input: ReturnType<typeof el>;
  draft: { value: string };
  time: ReturnType<typeof clock>;
  session: ReturnType<typeof mountDesk>['session'];
  surface: ReturnType<typeof mountDesk>['surface'];
} {
  const { session, surface, time } = mountDesk(options);
  const label = el('label', { text: 'Message' });
  const input = el('input', { attrs: { type: 'text' }, labels: [label] });
  surface.mount(el('form', { children: [label, input] }));
  const reports: SensorReport[] = [];
  const draft = { value: '' };
  return { reports, input, draft, time, session, surface };
}

function rowsFor(reports: readonly SensorReport[], edge: string): SensorReport[] {
  return reports.filter((r) => r.kind === 'reported' && r.edge === edge);
}

describe("'commit' — the default reports ONCE, when the human finishes", () => {
  it('a change writes one row; keystrokes write none', () => {
    const { reports, input, draft, session, surface } = composeSurface();
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: draft.value }) });

    draft.value = 'hel';
    humanType(input);
    humanType(input);
    expect(rowsFor(reports, desk.compose)).toHaveLength(0);

    draft.value = 'hello';
    humanCommit(input);
    expect(rowsFor(reports, desk.compose)).toHaveLength(1);
    expect(session.transitions().at(-1)?.payload).toEqual({ message: 'hello' });
    watch.stop();
  });

  it('MUTATION PROOF: were the default `input`, the two keystrokes above would be two rows', () => {
    const { reports, input, draft, session, surface } = composeSurface();
    const watch = watchPage(session, {
      root: surface,
      cadence: 'per-keystroke',
      onReport: (r) => reports.push(r),
    });
    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: draft.value }) });
    draft.value = 'h';
    humanType(input);
    expect(rowsFor(reports, desk.compose)).toHaveLength(1);
    watch.stop();
  });
});

describe("'per-keystroke' — N keystrokes, N rows, and the cost is the point", () => {
  it('reports each input, carrying the value at that moment', async () => {
    const { reports, input, draft, session, surface } = composeSurface();
    const watch = watchPage(session, {
      root: surface,
      cadence: 'per-keystroke',
      onReport: (r) => reports.push(r),
    });
    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: draft.value }) });

    for (const text of ['h', 'he', 'hel']) {
      draft.value = text;
      humanType(input);
      // A real keystroke is its own task. Draining between them is what makes
      // these three separate acts rather than one duplicated delivery — see
      // dedupe.ts on why two inputs in ONE task collapse.
      await settle();
    }

    expect(rowsFor(reports, desk.compose)).toHaveLength(3);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.compose).map((t) => t.payload)).toEqual([
      { message: 'h' },
      { message: 'he' },
      { message: 'hel' },
    ]);
    watch.stop();
  });
});

describe('{ debounceMs } — N keystrokes, ONE row, the LAST value', () => {
  it('coalesces to a single row once the human stops', async () => {
    const { reports, input, draft, time, session, surface } = composeSurface();
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });
    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: draft.value }) });

    for (const text of ['h', 'he', 'hel', 'hell', 'hello']) {
      draft.value = text;
      humanType(input);
      await settle();
      time.advance(50); // still inside the window
    }
    expect(rowsFor(reports, desk.compose)).toHaveLength(0);

    time.advance(200);
    expect(rowsFor(reports, desk.compose)).toHaveLength(1);
    // Last value wins WITHOUT buffering: the getter is read when the window
    // closes, so the row carries whatever the app holds then.
    expect(session.transitions().at(-1)?.payload).toEqual({ message: 'hello' });
    watch.stop();
  });

  it('a stopped watcher never lands a pending row', async () => {
    const { reports, input, draft, time, session, surface } = composeSurface();
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });
    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: draft.value }) });
    draft.value = 'hi';
    humanType(input);
    await settle();
    expect(time.pending).toBe(1);

    watch.stop();
    // Asserted BEFORE the clock moves: a stopped watcher must DISARM its pending
    // commits, not merely decline to act on them when they land. Advancing first
    // would prove only the second, and a timer left armed on a torn-down watcher is
    // exactly the leak stop() exists to prevent.
    expect(time.pending).toBe(0);

    time.advance(500);
    expect(rowsFor(reports, desk.compose)).toHaveLength(0);
  });
});

describe('a debounced cadence with NO clock is REFUSED, never downgraded', () => {
  it('says cadence-unavailable and reports nothing at all for that control', () => {
    const { reports, input, draft, session, surface } = composeSurface({ withoutClock: true });
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });
    const attachment = watch.attach({
      edge: desk.compose,
      element: input,
      value: () => ({ message: draft.value }),
    });

    expect(reports.filter((r) => r.kind === 'cadence-unavailable' && r.edge === desk.compose)).toHaveLength(1);
    expect(reports.find((r) => r.kind === 'cadence-unavailable')?.reason).toContain('no clock to run it on');

    // MUTATION PROOF for "never silently downgraded": a downgrade to per-keystroke
    // would make this keystroke a row.
    draft.value = 'hi';
    humanType(input);
    humanCommit(input);
    expect(rowsFor(reports, desk.compose)).toHaveLength(0);

    // And the refusal is said once per edge, not per keystroke — even though the
    // attach() door and the coverage door both had a reason to say it.
    expect(reports.filter((r) => r.kind === 'cadence-unavailable' && r.edge === desk.compose)).toHaveLength(1);
    // The watcher default reaches the OTHER value control too, once, on its own row.
    expect(reports.filter((r) => r.kind === 'cadence-unavailable' && r.edge === desk.plan)).toHaveLength(1);
    attachment.detach();
    watch.stop();
  });

  it('attach() answers even for an edge THIS PAGE NEVER SERVES — coverage cannot', () => {
    // coverage() speaks only about served edges, so a control declared for another
    // page would get no advisory at all if attach() did not answer at the door. A
    // cadence nobody can run is worth saying the moment it is asked for.
    const { session, surface } = mountDesk({ withoutClock: true });
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    const elsewhere = el('button', { text: 'Somewhere else' });
    surface.mount(elsewhere);
    expect(session.available().edges.some((e) => e.affordanceId === 'profile.nothing')).toBe(false);

    const attachment = watch.attach({
      edge: 'profile.nothing',
      element: elsewhere,
      cadence: { debounceMs: 100 },
    });

    expect(reports.filter((r) => r.kind === 'cadence-unavailable' && r.edge === 'profile.nothing')).toHaveLength(1);
    // And it was not indexed: a control that can never report must not look declared.
    expect(watch.coverage().declared).toBe(0);
    attachment.detach();
    watch.stop();
  });

  it('the same refusal reaches coverage for a RECOGNISED edge, blocked with its reason', () => {
    const { session, surface } = composeSurface({ withoutClock: true });
    const watch = watchPage(session, { root: surface, cadence: { debounceMs: 200 } });
    const row = watch.coverage().edges.find((e) => e.edge === desk.compose);
    expect(row?.status).toBe('unwatched');
    expect(row?.reason).toContain('no clock to run it on');
    watch.stop();
  });

  it('an explicit timers option is the escape hatch for a non-browser host', () => {
    const { reports, input, draft, session, surface } = composeSurface({ withoutClock: true });
    const time = clock();
    const watch = watchPage(session, {
      root: surface,
      timers: time,
      cadence: { debounceMs: 100 },
      onReport: (r) => reports.push(r),
    });
    watch.attach({ edge: desk.compose, element: input, value: () => ({ message: draft.value }) });
    expect(reports.filter((r) => r.kind === 'cadence-unavailable')).toHaveLength(0);
    draft.value = 'hi';
    humanType(input);
    time.advance(100);
    expect(rowsFor(reports, desk.compose)).toHaveLength(1);
    watch.stop();
  });
});

/**
 * THE ATTACK: point a page-wide `{ debounceMs }` at a page of BUTTONS.
 *
 * A cadence is a policy about the value stream — but the decision was taken from
 * the cadence alone, without asking what moment had actually committed, so the
 * window closed over clicks too. Every test below failed against the pre-change
 * source, and each one is a different way of losing a human act that really
 * happened.
 */
describe('a cadence window never reaches a click — the value stream is the whole of it', () => {
  it('two real clicks under a page-wide { debounceMs } are TWO rows, not one', async () => {
    const { session, surface, time } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });

    // Two separate acts: the turn window is closed between them, so nothing here
    // is a duplicate delivery.
    humanClick(button);
    await settle();
    humanClick(button);
    await settle();
    time.advance(500);

    // MUTATION PROOF: the second click used to cancel the first click's timer —
    // one human act erased, and no report arm could even say so.
    expect(rowsFor(reports, desk.send)).toHaveLength(2);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(2);
    watch.stop();
  });

  it('a click is recorded even when the debounced watcher has NO clock', () => {
    const { session, surface } = mountDesk({ withoutClock: true });
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });

    // Coverage advertises this edge, and correctly: a click has nothing to
    // coalesce, so the missing clock is no wall for it.
    expect(watch.coverage().edges.find((e) => e.edge === desk.send)).toMatchObject({ status: 'watching' });

    humanClick(button);

    // MUTATION PROOF: the click used to be swallowed by the no-clock guard —
    // zero rows, and not one report of any kind. Coverage promised `watching`
    // and the sensor delivered silence.
    expect(rowsFor(reports, desk.send)).toHaveLength(1);
    watch.stop();
  });

  it('stop() cannot discard a click that already happened', () => {
    const { session, surface, time } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });

    humanClick(button);
    watch.stop();
    time.advance(500);

    // MUTATION PROOF: the act used to sit in a window until teardown cancelled
    // it. A pending VALUE may be dropped on stop — the human had not finished —
    // but a click is finished the moment it lands.
    expect(rowsFor(reports, desk.send)).toHaveLength(1);
  });

  it("the truth gates are judged when the human acted, not when a window would have closed", () => {
    const { session, surface, time } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, {
      root: surface,
      cadence: { debounceMs: 200 },
      onReport: (r) => reports.push(r),
    });
    // The ordinary shape of a navigating control — and the exact reason every
    // listener registers on the capture phase.
    button.addEventListener('click', () => {
      session.sync('profile');
    });

    humanClick(button);
    time.advance(500);

    // MUTATION PROOF: a deferred fire was judged against the page the click
    // LANDED on, so the session answered NOT_ON_NODE for an act that was
    // perfectly legal when it happened — the invented refusal capture phase
    // exists to prevent.
    expect(reports.filter((r) => r.kind === 'reported')).toMatchObject([
      { edge: desk.send, result: { ok: true } },
    ]);
    watch.stop();
  });
});

describe('cadence is chosen PER CONTROL over the watcher default', () => {
  it("one control can stay on 'commit' while the watcher default is loud", async () => {
    const { reports, input, draft, session, surface } = composeSurface();
    const watch = watchPage(session, {
      root: surface,
      cadence: 'per-keystroke',
      onReport: (r) => reports.push(r),
    });
    watch.attach({
      edge: desk.compose,
      element: input,
      value: () => ({ message: draft.value }),
      cadence: 'commit',
    });

    draft.value = 'h';
    humanType(input);
    await settle();
    expect(rowsFor(reports, desk.compose)).toHaveLength(0); // the control said 'commit'

    humanCommit(input);
    expect(rowsFor(reports, desk.compose)).toHaveLength(1);
    watch.stop();
  });
});
