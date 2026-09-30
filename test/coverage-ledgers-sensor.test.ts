import { describe, expect, it } from 'vitest';
import {
  buildNavigationGraph,
  connectAction,
  createActionRuntime,
  defineAction,
} from '../src/index.js';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { desk, el, humanClick, mountDesk, settle } from './sensor-fixture.js';

/**
 * Two small owners' uncovered arms:
 *
 * - traverse/ack-ledger.ts · retention, served as
 *   `Session.acknowledgementsRetention()` — the receipt trail's window,
 *   counted (the twin of `offersRetention`, pinned in
 *   test/offer-references.test.ts).
 * - sensor/watch-page.ts · projectBinding — a stopped watcher's inert door,
 *   an idempotent detach, and ownership of an AMBIGUOUS match.
 */

function ledgerDesk(maxAcknowledgements?: number) {
  const map = buildNavigationGraph('desk', {
    pages: {
      ledger: {
        actions: {
          settle: {
            does: 'Settle the claim',
            reads: ['claim.total'],
            writes: ['purse.left'],
          },
        },
      },
    },
  });
  const session = map.createSession({
    node: 'ledger',
    state: { 'claim.total': 100, 'purse.left': 500 },
    ...(maxAcknowledgements !== undefined ? { maxAcknowledgements } : {}),
    onWarn: () => undefined,
  });
  session.registerActions('ledger', { handlers: { settle: () => undefined } });
  return session;
}

describe('Session.acknowledgementsRetention — the receipt window, counted', () => {
  it('is honestly end-less while nothing has been acknowledged', () => {
    const window = ledgerDesk().acknowledgementsRetention();
    expect(window).toEqual({ minted: 0, dropped: 0 });
    expect('firstRetained' in window).toBe(false);
    expect('lastRetained' in window).toBe(false);
  });

  it('names the oldest and newest receipt still held, and counts what the cap dropped', () => {
    const session = ledgerDesk(2);
    for (let i = 0; i < 5; i += 1) session.acknowledgeStale('ledger.settle');
    expect(session.acknowledgementsRetention()).toEqual({
      minted: 5,
      dropped: 3,
      firstRetained: 'ack#4',
      lastRetained: 'ack#5',
    });
    // The window agrees with the rows it describes.
    expect(session.acknowledgements().map((row) => row.acknowledgementId)).toEqual([
      'ack#4',
      'ack#5',
    ]);
  });
});

describe('watchPage · projectBinding', () => {
  function sendAction() {
    return defineAction(desk.send, {
      does: 'Send the message',
      invocation: 'inputless',
      mutate: () => undefined,
    });
  }

  it('a stopped watcher projects nothing: it hands back the same inert handle its attach door does', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const connection = connectAction(createActionRuntime(), sendAction(), {
      node: 'inbox',
    });
    watch.stop();

    const projected = watch.projectBinding({
      binding: connection.binding,
      element: button,
    });
    expect(projected).toBe(watch.attach({} as never));
    expect(Object.isFrozen(projected)).toBe(true);
    expect(() => projected.detach()).not.toThrow();
  });

  it('detaching twice is the same as detaching once — the sensor reports the element again', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const connection = connectAction(createActionRuntime(), sendAction(), {
      node: 'inbox',
    });
    const projected = watch.projectBinding({
      binding: connection.binding,
      element: button,
    });

    humanClick(button);
    await settle();
    expect(session.transitions()).toHaveLength(0);

    projected.detach();
    projected.detach();
    humanClick(button);
    await settle();
    expect(
      session.transitions().filter((t) => t.cause.affordanceId === desk.send),
    ).toHaveLength(1);
    watch.stop();
  });

  it('a connection that owns one of an AMBIGUOUS match stands the sensor down — no ambiguity report, no row', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Save' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    const save = defineAction(desk.save, {
      does: 'Save the message',
      invocation: 'inputless',
      mutate: () => undefined,
    });
    const connection = connectAction(createActionRuntime(), save, { node: 'inbox' });

    // Unowned, the shared locator is the refusal it always was.
    humanClick(button);
    await settle();
    expect(reports.filter((r) => r.kind === 'ambiguous')).toHaveLength(1);

    // Owned by the connection for one of the two candidates: that connection
    // reports the act itself, so the sensor says nothing about it.
    const projected = watch.projectBinding({ binding: connection.binding, element: button });
    humanClick(button);
    await settle();
    expect(reports.filter((r) => r.kind === 'ambiguous')).toHaveLength(1);
    expect(session.transitions()).toHaveLength(0);

    projected.detach();
    watch.stop();
  });
});
