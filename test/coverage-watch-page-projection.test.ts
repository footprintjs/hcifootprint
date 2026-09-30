/**
 * watchPage().projectBinding — the corners the integration suite leaves out
 * (src/sensor/watch-page.ts · watchPage, projectedBindingOwns).
 *
 * - An AMBIGUOUS element (two edges answer one locator) the app has connected
 *   for one of those edges is the app's gesture, not an unanswerable one: the
 *   sensor stands down instead of reporting `ambiguous`. A projection for an
 *   edge the element does not answer to leaves the ambiguity report standing.
 * - A projection's detach is idempotent: a second call cannot touch a newer
 *   projection of the same binding on the same element.
 * - A stopped watcher hands back the same inert attachment `attach()` does —
 *   it retains nothing.
 */
import { describe, expect, it } from 'vitest';
import { connectAction, createActionRuntime, defineAction } from '../src/index.js';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { desk, el, humanClick, mountDesk, settle } from './sensor-fixture.js';

function connected(edge: string) {
  const runtime = createActionRuntime();
  const action = defineAction(edge, {
    does: 'Do it',
    invocation: 'inputless',
    mutate: () => undefined,
  });
  return connectAction(runtime, action, { node: 'inbox' });
}

describe('an ambiguous element the app has connected', () => {
  it('the sensor stands down for the connected candidate: no ambiguity report, no row', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Save' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    const connection = connected(desk.save);
    watch.projectBinding({ binding: connection.binding, element: button });

    humanClick(button);
    await settle();

    expect(reports.filter((r) => r.kind === 'ambiguous')).toEqual([]);
    expect(session.transitions()).toHaveLength(0);
    watch.stop();
  });

  it('a projection for an edge the element does not answer to leaves the ambiguity reported', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Save' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const watch = watchPage(session, { root: surface, onReport: (r) => reports.push(r) });
    const connection = connected(desk.send);
    watch.projectBinding({ binding: connection.binding, element: button });

    humanClick(button);
    await settle();

    expect(reports.filter((r) => r.kind === 'ambiguous')).toMatchObject([
      { candidates: expect.arrayContaining([desk.save, desk.saveDraft]) },
    ]);
    watch.stop();
  });
});

describe('a projection detach is idempotent', () => {
  it('a second detach of an old projection cannot release a newer one', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const connection = connected(desk.send);
    const projection = { binding: connection.binding, element: button };

    const old = watch.projectBinding(projection);
    old.detach();
    const newer = watch.projectBinding(projection);
    old.detach();

    humanClick(button);
    await settle();
    // Still owned by the connection: the sensor wrote nothing.
    expect(session.transitions()).toHaveLength(0);

    newer.detach();
    humanClick(button);
    await settle();
    expect(session.transitions()).toHaveLength(1);
    watch.stop();
  });
});

describe('a stopped watcher', () => {
  it('hands back the one inert attachment, exactly as attach() does', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    watch.stop();
    const connection = connected(desk.send);

    const projected = watch.projectBinding({ binding: connection.binding, element: button });
    expect(projected).toBe(watch.attach({ edge: desk.send, element: button }));
    expect(Object.isFrozen(projected)).toBe(true);
    expect(projected.detach()).toBeUndefined();

    humanClick(button);
    await settle();
    expect(session.transitions()).toHaveLength(0);
  });
});
