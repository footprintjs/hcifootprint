/**
 * THINNESS AS A TEST, NOT A CLAIM.
 *
 * The promise is "one brain, two evidence levels, N skins": a React, Vue or Angular
 * binding is a skin over FIVE FIELDS and ONE METHOD, and no framework is required
 * to use the core at all. A promise like that decays the moment a skin needs
 * something this file cannot express — so this file drives the whole declared level
 * from a PLAIN OBJECT, with no framework anywhere, and asserts the same rows a
 * mounted component would produce.
 *
 * If a Vue skin ever needs something this test cannot say, the interface leaked.
 */
import { describe, expect, it } from 'vitest';
import { watchPage } from '../src/sensor/index.js';
import type { ControlDeclaration, PageWatch } from '../src/sensor/index.js';
import { desk, el, humanClick, humanCommit, mountDesk, recordFires } from './sensor-fixture.js';

/**
 * The entire framework-facing surface, written as the three lifecycle moments every
 * framework has: mount, update, unmount.
 *
 * Vue is `onMounted` / `onScopeDispose` plus a template ref. Angular is a directive
 * with `ElementRef` and `ngOnDestroy`. React is a callback ref and an effect. None
 * of them needs anything below that this shim does not already use.
 */
function componentLike(watch: PageWatch, declaration: ControlDeclaration): { unmount(): void } {
  const attachment = watch.attach(declaration);
  return {
    unmount(): void {
      attachment.detach();
    },
  };
}

describe('the declared level, driven with no framework at all', () => {
  it('a plain object mounts a control, the human acts, and the row lands', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });

    const mounted = componentLike(watch, { edge: desk.send, element: button });
    humanClick(button);
    mounted.unmount();

    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });

  it('instance, value and cadence all ride the same one method', () => {
    const { session, surface, time } = mountDesk({ state: { threadIds: ['t-3'] } });
    const row = el('button', { text: 'Reply' });
    const field = el('input', { attrs: { type: 'text' } });
    surface.mount(el('li', { children: [row, field] }));
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });
    const draft = { text: 'later' };

    // edge + element + instance
    componentLike(watch, { edge: desk.reply, element: row, instance: 't-3' });
    // edge + element + value + cadence
    componentLike(watch, {
      edge: desk.compose,
      element: field,
      value: () => ({ message: draft.text }),
      cadence: { debounceMs: 100 },
    });

    humanClick(row);
    expect(fires).toMatchObject([{ edge: desk.reply, opts: { instance: 't-3', source: 'user', invoke: false } }]);

    // 'change' is not this control's moment under a debounce, and the window has
    // not closed — so the second declaration has not reported yet.
    humanCommit(field);
    expect(fires).toHaveLength(1);
    time.advance(100);
    expect(fires).toHaveLength(1);
    watch.stop();
  });

  it('a two-step control needs no framework either — one flag the app already owns', () => {
    const { session, surface } = mountDesk();
    // The confirm button in its RESTING state: the label a human reads first is the
    // very one this action's locator names, so the element has to be handed over
    // always and `commits` has to be what withholds the arming press.
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });
    const confirm = { armed: false };

    componentLike(watch, { edge: desk.send, element: button, commits: () => confirm.armed });
    humanClick(button);
    expect(fires, 'the arming press sent nothing, so it writes no row').toHaveLength(0);

    confirm.armed = true;
    humanClick(button);
    expect(fires).toMatchObject([{ edge: desk.send, opts: { source: 'user', invoke: false } }]);
    watch.stop();
  });

  it('unmount is a true pair with mount — after it, the same act writes nothing', () => {
    const { session, surface } = mountDesk();
    const div = el('div'); // no role at all: only a declaration can reach it
    surface.mount(div);
    const watch = watchPage(session, { root: surface });

    const mounted = componentLike(watch, { edge: desk.refresh, element: div });
    humanClick(div);
    mounted.unmount();
    humanClick(div);

    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.refresh)).toHaveLength(1);
    watch.stop();
  });

  it('remount under a double-invoke nets to one row, which is the StrictMode contract', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });

    // Exactly React StrictMode's order: setup, cleanup, setup.
    const first = componentLike(watch, { edge: desk.send, element: button });
    first.unmount();
    componentLike(watch, { edge: desk.send, element: button });

    humanClick(button);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    expect(watch.coverage().declared).toBe(1);
    watch.stop();
  });

  it('the watcher handle survives being stored and re-read, which is what a skin does', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    // A skin holds the handle across renders — hence named methods rather than a
    // bare closure, the idiom registerActions's handle already sets.
    const box: { watch?: PageWatch } = {};
    box.watch = watchPage(session, { root: surface });
    box.watch.attach({ edge: desk.send, element: button });

    humanClick(button);
    expect(box.watch.coverage().reports.reported).toBe(1);
    box.watch.stop();
  });
});

describe('nothing in the interface is React-shaped', () => {
  it('the core resolves no framework module — a consumer who never asks never pays', async () => {
    // The subpath's own promise, asserted at the module graph: importing the sensor
    // pulls exactly the sensor.
    const module = await import('../src/sensor/index.js');
    expect(Object.keys(module)).toEqual(['watchPage']);
  });
});
