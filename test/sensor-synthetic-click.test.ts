/**
 * REQUIREMENT THREE, WRITTEN AS THE SCENARIO THAT SHIPPED.
 *
 * A production integration built the other version of this first and it recorded
 * THE AGENT'S OWN synthetic clicks as human actions. `source: 'user'` on machine
 * motion is a lie in the one field the whole provenance model rests on, and it is
 * the kind of lie that cannot be found later: the ledger row looks exactly like a
 * real person's.
 *
 * So this file does not test a predicate. It reproduces the shape: a real handler
 * is registered on a real declared control, and THAT HANDLER clicks the control —
 * which is what an agent driving a page through `element.click()` does. Zero human
 * rows must exist afterwards, and the report must NAME the edge it declined, so a
 * team can delete their own isTrusted filter and see the sensor catching what
 * theirs did.
 *
 * `HTMLElement.click()` produces `isTrusted === false`; only a real user gesture
 * sets it. The fixture keeps those two apart by construction (`agentClick` goes
 * through `element.click()`, `humanClick` mints the trusted event a browser makes
 * for a person), so nothing here can accidentally test the wrong bit.
 */
import { describe, expect, it } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { desk, el, humanClick, mountDesk } from './sensor-fixture.js';

describe('the agent handler clicking its own bound control writes no human row', () => {
  it('reports nothing to the ledger and names the edge it declined', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    watch.attach({ edge: desk.send, element: button });

    // The app's own handler for this control — the thing an agent reaches through.
    let handlerRuns = 0;
    let agentDrove = false;
    button.addEventListener('click', () => {
      handlerRuns += 1;
      // The agent's move: drive the page the way a person would appear to.
      if (!agentDrove) {
        agentDrove = true;
        button.click();
      }
    });

    humanClick(button);

    // The human's click is one row. The handler's own click is not.
    expect(handlerRuns).toBe(2);
    const rows = session.transitions().filter((t) => t.cause.affordanceId === desk.send);
    expect(rows).toHaveLength(1);
    expect(rows.every((t) => t.cause.kind === 'fired' && t.cause.principal === 'user')).toBe(true);

    // And the decline is DIAGNOSTIC: it says which edge, and how it was actuated.
    const declined = reports.filter((r) => r.kind === 'synthetic-event');
    expect(declined).toHaveLength(1);
    expect(declined[0]).toEqual({ kind: 'synthetic-event', edge: desk.send, actuation: 'click' });
    watch.stop();
  });

  it('MUTATION PROOF: with the trust guard removed, the agent’s own click becomes a human row', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    // `trust: () => true` IS the mutation — it is exactly what deleting the
    // isTrusted check does. Two rows for one human act, one of them a lie.
    const watch = watchPage(session, { root: surface, trust: () => true });
    watch.attach({ edge: desk.send, element: button });
    button.addEventListener('click', () => undefined);

    button.click();
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });

  it('a RECOGNISED control is guarded identically — the lie is not about how it was matched', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    button.click();
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(0);
    expect(reports.filter((r) => r.kind === 'synthetic-event')).toMatchObject([
      { edge: desk.send, actuation: 'click' },
    ]);
    watch.stop();
  });

  it('an instanced row names the instance it declined too', () => {
    const { session, surface } = mountDesk({ state: { threadIds: ['t-1'] } });
    const button = el('button', { text: 'Reply' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    watch.attach({ edge: desk.reply, element: button, instance: 't-1' });

    button.click();
    expect(reports.filter((r) => r.kind === 'synthetic-event')).toEqual([
      { kind: 'synthetic-event', edge: desk.reply, instance: 't-1', actuation: 'click' },
    ]);
    watch.stop();
  });
});

describe('the decline is reported ONLY when the gesture would have been attributed', () => {
  it('a programmatic click on prose is as unreportable as a human one', () => {
    const { session, surface } = mountDesk();
    const paragraph = el('p', { text: 'Send' });
    surface.mount(el('div', { children: [paragraph] }));
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    paragraph.click();
    // THE FLAW THIS ORDERING FIXES: reporting before matching made every
    // programmatic click anywhere under the root bump the tally, while the trusted
    // path stayed silent for the very same click.
    expect(reports.filter((r) => r.kind === 'synthetic-event')).toHaveLength(0);
    expect(watch.coverage().reports['synthetic-event']).toBe(0);
    watch.stop();
  });

  it('a programmatic click on an AMBIGUOUS control declines silently — it was never attributable', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Save' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    button.click();
    expect(reports.filter((r) => r.kind === 'synthetic-event')).toHaveLength(0);
    expect(reports.filter((r) => r.kind === 'ambiguous')).toHaveLength(0);
    watch.stop();
  });

  it('an edge the app reports through its OWN door declines silently — the sensor stood down for it', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, {
      root: surface,
      reportedElsewhere: [desk.send],
      onReport: (r) => reports.push(r),
    });
    // Handed over, because the DECLARED level is where a stood-down edge is still
    // matched: recognition by locator drops an unwatched edge before it can be a
    // candidate at all.
    watch.attach({ edge: desk.send, element: button });

    button.click();

    // MUTATION PROOF: the decline used to name desk.send — the sensor announcing
    // that it declined something it had already stood down for, which is a second
    // answer to a question coverage settled once with `blocked: 'door'`.
    expect(reports.filter((r) => r.kind === 'synthetic-event')).toHaveLength(0);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(0);
    watch.stop();
  });

  it('an event with no isTrusted flag at all is not a human either', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });

    // A hand-built event object, as a naive harness or a shim would produce.
    for (const listener of surface.captureListeners('click')) listener({ type: 'click', target: button });
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(0);
    expect(reports.filter((r) => r.kind === 'synthetic-event')).toHaveLength(1);
    watch.stop();
  });
});

describe('trust is injectable, because a harness can never mint a trusted event', () => {
  it('a custom predicate decides, and the default is only a default', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const seen: string[] = [];
    const watch = watchPage(session, {
      root: surface,
      trust: (event) => {
        seen.push(event.type);
        return event.isTrusted === true;
      },
    });
    watch.attach({ edge: desk.send, element: button });

    humanClick(button);
    button.click();
    expect(seen).toEqual(['click', 'click']);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });
});
