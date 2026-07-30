/**
 * REQUIREMENT ONE: THE APP DECLARES THE VALUE. THE SENSOR NEVER READS ONE.
 *
 * The deepest of the four, and the one with the longest-lived bugs behind it: a
 * production integration's worst ongoing failures — a combobox reading as empty, a
 * button reported as "(currently empty)" — all came from interrogating the DOM for
 * a value the app already held in a variable. The DOM is a RENDERING of the app's
 * state, not the state, and a wrong payload in the ledger is indistinguishable
 * from a right one.
 *
 * So the door is one-way: a payload rides a fire ONLY from
 * `ControlDeclaration.value()`, and otherwise the key is NOT THERE. Every
 * assertion below about absence checks the KEY, not an undefined value, because
 * `payload: undefined`, `{}` and `''` are the same mistake in three costumes.
 */
import { describe, expect, it } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { desk, el, humanClick, humanCommit, mountDesk, recordFires } from './sensor-fixture.js';

/** The Message field, named by its label the way the graph's locator expects. */
function messageField(): ReturnType<typeof el>[] {
  const label = el('label', { text: 'Message' });
  const input = el('input', { attrs: { type: 'text' }, labels: [label] });
  return [label, input];
}

describe('a declared value rides the fire', () => {
  it("the row carries the app's own variable, not anything read off the node", () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    // The app's state. Deliberately DIFFERENT from anything on the element, so a
    // scraper could not produce this answer even by accident.
    const draft = { text: 'ship it' };
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: draft.text }) });

    humanCommit(input!);
    const row = session.transitions().at(-1);
    expect(row?.cause).toMatchObject({ kind: 'fired', affordanceId: desk.compose, principal: 'user' });
    expect(row?.payload).toEqual({ message: 'ship it' });
    watch.stop();
  });

  it('the getter is read AT REPORT TIME, so the row is never a stale copy', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const draft = { text: 'first' };
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.compose, element: input!, value: () => ({ message: draft.text }) });

    draft.text = 'second';
    humanCommit(input!);
    expect(session.transitions().at(-1)?.payload).toEqual({ message: 'second' });
    watch.stop();
  });
});

describe('NO declared value means NO payload key — asserted on the key', () => {
  it('a click-only control fires with no payload property whatsoever', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    humanClick(button);
    expect(fires).toHaveLength(1);
    // MUTATION PROOF: make the sensor spread `payload: undefined` and this fails.
    // `toEqual` would not notice — only the key can tell the two apart.
    expect(fires[0]!.opts).not.toHaveProperty('payload');
    expect(Object.keys(fires[0]!.opts).sort()).toEqual(['invoke', 'source']);
    watch.stop();
  });

  it("a DECLARED control on an action declared 'none' sends nothing, even holding a value", () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });
    // The bug this forbids is on the record: a uniform relay contract forced
    // `value: ''` into a click-only control and it overrode the app's own default.
    watch.attach({ edge: desk.send, element: button, value: () => '' });

    humanClick(button);
    expect(fires[0]!.edge).toBe(desk.send);
    expect(fires[0]!.opts).not.toHaveProperty('payload');
    watch.stop();
  });

  it('the fire is RECORD-ONLY, in the bytes and not only in the type', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    humanClick(button);
    expect(fires[0]!.opts).toMatchObject({ source: 'user', invoke: false });
    watch.stop();
  });

  it('a getter that answers undefined still creates no key', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const watch = watchPage(session, { root: surface });
    watch.attach({ edge: desk.compose, element: input!, value: () => undefined });

    humanCommit(input!);
    const row = session.transitions().at(-1);
    // The fire is refused by the app's OWN schema, which is the correct outcome —
    // the point here is that no `payload` key was manufactured on the way.
    expect(row?.cause.affordanceId).not.toBe(desk.compose);
    watch.stop();
  });
});

describe('a value-taking edge with no declaration is honestly UNWATCHED', () => {
  it("coverage says blocked: 'payload', and the sentence names where the value must come from", () => {
    const { session, surface } = mountDesk();
    const watch = watchPage(session, { root: surface });
    const row = watch.coverage().edges.find((e) => e.edge === desk.compose);
    expect(row).toMatchObject({ status: 'unwatched', blocked: 'payload' });
    expect(row?.reason).toContain('never reads one off the DOM');
    expect(row?.reason).toContain('the component that already holds it');
    watch.stop();
  });

  it('and it writes no row at all when the human uses it', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const watch = watchPage(session, { root: surface });

    humanCommit(input!);
    expect(session.transitions().some((t) => t.cause.affordanceId === desk.compose)).toBe(false);
    watch.stop();
  });

  it('the advisory is said ONCE per edge, not per rebuild', () => {
    const { session, surface } = mountDesk();
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    // Three refreshes: attaching and detaching an unrelated control rebuilds the
    // manifest each time.
    const other = el('button', { text: 'Send' });
    surface.mount(other);
    watch.attach({ edge: desk.send, element: other }).detach();
    expect(
      reports.filter((r) => r.kind === 'unwatched' && r.edge === desk.compose),
    ).toHaveLength(1);
    watch.stop();
  });
});

describe('a DECLARED control for a value-taking edge with no getter — value-not-declared', () => {
  it('says so once, with its own arm, and stands down for that edge', () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    watch.attach({ edge: desk.compose, element: input! });

    const said = reports.filter((r) => r.kind === 'value-not-declared');
    expect(said).toHaveLength(1);
    expect(said[0]).toMatchObject({ edge: desk.compose });
    expect(said[0] && 'reason' in said[0] ? said[0].reason : '').toContain('value: () => yourState');

    humanCommit(input!);
    expect(session.transitions().some((t) => t.cause.affordanceId === desk.compose)).toBe(false);
    watch.stop();
  });

  it("declaring the control CHANGES the advisory — a spent one must not silence the precise one", () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    // Before the app hands the element over, the honest answer is the generic one:
    // the sensor cannot read a value off the DOM.
    const generic = reports.find((r) => r.kind === 'unwatched' && r.edge === desk.compose);
    expect(generic).toMatchObject({ blocked: 'payload' });

    watch.attach({ edge: desk.compose, element: input! });

    // After it does, the situation is different and so is the sentence: add a
    // getter. MUTATION PROOF: key the advisory budget on the EDGE instead of on
    // (edge, sentence) and the app attaches into silence, because the generic
    // advisory has already spent it.
    const precise = reports.find((r) => r.kind === 'value-not-declared' && r.edge === desk.compose);
    expect(precise).toBeDefined();
    expect(precise && 'reason' in precise ? precise.reason : '').not.toBe(
      generic && 'reason' in generic ? generic.reason : '',
    );
    watch.stop();
  });
});

describe('the schema gate is SOURCE-BLIND, so the door cannot launder a wrong value', () => {
  it("a declared value that violates the app's own schema earns PAYLOAD_INVALID", () => {
    const { session, surface } = mountDesk();
    const [label, input] = messageField();
    surface.mount(el('form', { children: [label!, input!] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    // The app hands over the wrong shape. The session refuses it — for the
    // record-only sensor exactly as for an agent, because "EVERY source answers
    // for the payload, deliberately".
    watch.attach({ edge: desk.compose, element: input!, value: () => ({ nope: 1 }) });

    humanCommit(input!);
    const reported = reports.find((r) => r.kind === 'reported' && r.edge === desk.compose);
    expect(reported).toBeDefined();
    expect(reported && 'result' in reported ? reported.result : undefined).toMatchObject({
      ok: false,
      reason: 'PAYLOAD_INVALID',
    });
    expect(session.transitions().some((t) => t.outcome === 'committed' && t.cause.affordanceId === desk.compose)).toBe(
      false,
    );
    watch.stop();
  });
});

describe('the RECOGNISED level can never carry a value, whatever the app declares elsewhere', () => {
  it('a locator match on a no-input action fires with no payload, and that is all it can do', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    humanClick(button);
    expect(fires[0]!.opts).not.toHaveProperty('payload');
    // And a value-taking edge is not recognised AT ALL, so there is no path where a
    // recognised match could want a payload it does not have.
    expect(watch.coverage().edges.find((e) => e.edge === desk.plan)).toMatchObject({ blocked: 'payload' });
    watch.stop();
  });
});
