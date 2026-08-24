import { describe, expect, it } from 'vitest';
import {
  connectAction,
  createActionBindingRuntime,
  defineAction,
} from '../src/index.js';
import { watchPage } from '../src/sensor/index.js';
import { desk, el, humanClick, mountDesk, settle } from './sensor-fixture.js';

describe('connection-owned human reporting is exact to an element and binding', () => {
  it('runs the connected application action once and makes the sensor stand down', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const runtime = createActionBindingRuntime();
    let calls = 0;
    const action = defineAction(
      desk.send,
      { does: 'Send the message', invocation: 'inputless' },
      () => (calls += 1),
    );
    const connection = connectAction(runtime, action, { node: 'inbox' });
    const projection = watch.projectBinding({
      binding: connection.binding,
      element: button,
    });
    let invocation: ReturnType<typeof connection.invoke> | undefined;
    button.addEventListener('click', () => {
      invocation = connection.invoke();
    });

    humanClick(button);
    expect(invocation).toBeDefined();
    await invocation?.whenInvoked;
    expect(calls).toBe(1);
    expect(session.transitions()).toHaveLength(0);
    expect(runtime.transitionFor(invocation!.transition)).toMatchObject({
      invocationStatus: 'performed',
    });

    projection.detach();
    connection.disconnect();
    watch.stop();
  });

  it('does not suppress a sensor-owned sibling for the same definition', async () => {
    const { session, surface } = mountDesk();
    const connected = el('button', { text: 'Send' });
    const sensorOwned = el('button', { text: 'Send' });
    surface.mount(connected, sensorOwned);
    const watch = watchPage(session, { root: surface });
    const runtime = createActionBindingRuntime();
    const action = defineAction(
      desk.send,
      { does: 'Send', invocation: 'inputless' },
      () => undefined,
    );
    const connection = connectAction(runtime, action, { node: 'inbox' });
    watch.projectBinding({ binding: connection.binding, element: connected });

    humanClick(sensorOwned);
    await settle();

    expect(
      session
        .transitions()
        .filter((transition) => transition.cause.affordanceId === desk.send),
    ).toHaveLength(1);
    watch.stop();
  });

  it('uses token ownership so stale cleanup cannot reopen a replacement', async () => {
    const { session, surface } = mountDesk();
    const child = el('span', { text: 'Send' });
    const button = el('button', { children: [child] });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const runtime = createActionBindingRuntime();
    const action = defineAction(
      desk.send,
      { does: 'Send', invocation: 'inputless' },
      () => undefined,
    );
    const firstConnection = connectAction(runtime, action, { node: 'inbox' });
    const secondConnection = connectAction(runtime, action, { node: 'inbox' });
    const first = watch.projectBinding({
      binding: firstConnection.binding,
      element: button,
    });
    const second = watch.projectBinding({
      binding: secondConnection.binding,
      element: button,
    });

    first.detach();
    humanClick(child);
    expect(session.transitions()).toHaveLength(0);

    second.detach();
    humanClick(child);
    await settle();
    expect(session.transitions()).toHaveLength(1);
    watch.stop();
  });

  it('does not let an unrelated binding silence the element’s matched action', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const runtime = createActionBindingRuntime();
    const unrelated = defineAction(
      'unrelated.action',
      { does: 'Run another action', invocation: 'inputless' },
      () => undefined,
    );
    const connection = connectAction(runtime, unrelated, { node: 'inbox' });
    watch.projectBinding({ binding: connection.binding, element: button });

    humanClick(button);
    await settle();
    expect(
      session
        .transitions()
        .filter((transition) => transition.cause.affordanceId === desk.send),
    ).toHaveLength(1);
    watch.stop();
  });

  it('mints an internal token even when the caller reuses one projection object', async () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });
    const runtime = createActionBindingRuntime();
    const action = defineAction(
      desk.send,
      { does: 'Send', invocation: 'inputless' },
      () => undefined,
    );
    const connection = connectAction(runtime, action, { node: 'inbox' });
    const projection = { binding: connection.binding, element: button };
    const stale = watch.projectBinding(projection);
    const current = watch.projectBinding(projection);

    stale.detach();
    humanClick(button);
    await settle();
    expect(session.transitions()).toHaveLength(0);

    current.detach();
    humanClick(button);
    await settle();
    expect(session.transitions()).toHaveLength(1);
    watch.stop();
  });
});
