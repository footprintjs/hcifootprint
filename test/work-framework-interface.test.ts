/**
 * THINNESS AS A TEST, NOT A CLAIM — the async half.
 *
 * `test/sensor-framework-interface.test.ts` makes this promise about a CLICK:
 * one brain, N skins, and no framework needed to use the core at all. This file
 * makes it about WAITING. The library's answer to "the app is still working" is
 * two ordinary calls — `session.beginWork(label)` / `work.done(error?)` — plus
 * the label door `setBusy`, and every one of them is a plain function taking
 * plain values. `hcifootprint/react`'s `useWorking` is those calls moved into
 * React's lifecycle and nothing else.
 *
 * So this file writes the SAME five lines with no framework anywhere, and
 * asserts the same rows the hook's own suite asserts. It is the thing the
 * documentation's claim rests on: an Angular or Vue port is these five lines in
 * that framework's lifecycle, and if one of them ever needs something this file
 * cannot say, the interface leaked.
 *
 * The three moments are all any framework has, and each one is named where it
 * lives: **mount** (`ngOnInit`, `onMounted`, an effect's setup), **update** (a
 * new input, a watcher, an effect re-running), **unmount** (`ngOnDestroy`,
 * `onScopeDispose`, a cleanup). Nothing below needs a fourth.
 *
 * MUTATION PROOF (run): `work.done()` in the unmount moment → 2 red here, and
 * the same edit inside `useWorking` puts 3 red on the React suite. That is the
 * point of having both — the asymmetry is a property of the LIBRARY's answer,
 * not a quirk of a skin, so the honest place to break it is here too.
 */
import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, serveToAgent } from '../src/index.js';
import type { InteractionSession, NavigationGraph, ActionHandle } from '../src/index.js';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function deskMap(): NavigationGraph {
  return buildNavigationGraph('desk', {
    pages: { compose: { actions: { save: { does: 'Save the draft', writes: ['draft'] } } } },
  });
}

function wired(): {
  session: InteractionSession;
  save: ActionHandle;
  busyOf(action: string): string | undefined;
} {
  const session = deskMap().createSession({
    node: 'compose',
    state: { draft: null },
    onWarn: () => undefined,
  });
  return {
    session,
    save: session.registerAction('compose', 'save', { does: 'Save the draft', handler: () => undefined }),
    busyOf: (action) => session.available().edges.find((edge) => edge.affordanceId === action)?.busy,
  };
}

/**
 * THE FIVE LINES, in plain TypeScript, exactly as the docs print them.
 *
 * One `beginWork`, one `setBusy`, the app's own await, one `done` carrying
 * whatever the failure was, and one `setBusy(undefined)` in the `finally`. There
 * is no library-shaped wrapper anywhere in it and no framework at all — which is
 * the whole claim.
 */
async function saveTheDraft(
  session: InteractionSession,
  action: ActionHandle,
  saveToServer: () => Promise<void>,
): Promise<void> {
  const work = session.beginWork('Saving your draft…');
  action.setBusy('Saving your draft…');
  try {
    await saveToServer();
    work.done();
  } catch (failure) {
    work.done(failure);
    throw failure;
  } finally {
    action.setBusy(undefined);
  }
}

describe('the work ledger, driven with no framework at all', () => {
  it('a plain async function opens the row, says the word, and closes both', async () => {
    const { session, save, busyOf } = wired();
    let finish = (): void => undefined;
    const inFlight = saveTheDraft(session, save, () => new Promise<void>((resolve) => (finish = resolve)));

    expect(session.openWork()).toMatchObject([{ label: 'Saving your draft…', principal: 'system' }]);
    expect(busyOf('compose.save')).toBe('Saving your draft…');

    finish();
    await inFlight;

    expect(session.openWork()).toEqual([]);
    expect(busyOf('compose.save')).toBeUndefined();
  });

  it('a failure closes the row with the app’s own error — and settles nothing', async () => {
    const { session, save, busyOf } = wired();
    const port = serveToAgent(session);
    const fired = session.fire('compose.save', { source: 'user' });
    if (!fired.ok) throw new Error('fixture');
    await flush();

    await expect(
      saveTheDraft(session, save, () => Promise.reject(new Error('the server said no'))),
    ).rejects.toThrow('the server said no');

    // The row is closed and the control is quiet — and the FIRE is exactly where
    // it was. The failure spine is the three doors it has always been, and a
    // ledger call is not one of them, whichever language wrote it.
    expect(session.openWork()).toEqual([]);
    expect(busyOf('compose.save')).toBeUndefined();
    expect(session.settlementIfKnown(fired.transition.id)).toBeUndefined();
    expect(port.call('desk.did_it_work', { transitionId: fired.transition.id })).toMatchObject({
      judgment: 'still-pending',
    });
  });

  it('the id a fire handed back binds the row exactly, with no call window to be inside of', () => {
    const { session, save } = wired();
    const fired = session.fire('compose.save', { source: 'user' });
    if (!fired.ok) throw new Error('fixture');

    // What any skin does when it knows the fire: pass the id. There is no
    // framework-only door for this and no inference standing in for one.
    const work = session.beginWork('Saving your draft…', { transitionId: fired.transition.id });
    save.setBusy('Saving your draft…');

    expect(session.openWork()).toMatchObject([
      { transitionId: fired.transition.id, affordanceId: 'compose.save', principal: 'user' },
    ]);
    work.done();
  });
});

/**
 * The same policy `useWorking` implements, written in the three lifecycle
 * moments every framework has — so the policy is demonstrably the LIBRARY's to
 * express, and React's hook is one spelling of it rather than the only one.
 */
function componentLike(
  session: InteractionSession,
  action: ActionHandle,
): { mount(label: string): void; update(label: string): void; unmount(): void } {
  let work: { done(error?: unknown): void } | null = null;
  let said: string | undefined;
  return {
    mount(label) {
      work = session.beginWork(label);
      said = label;
      action.setBusy(label);
    },
    update(label) {
      if (label === said) return; // saying the same thing twice is not motion
      said = label;
      action.setBusy(label);
    },
    unmount() {
      // The asymmetry, by hand: the label is taken back because nobody is left
      // keeping it true; the row is NOT closed, because nobody said the work
      // ended and a clock is not a verdict.
      action.setBusy(undefined);
      said = undefined;
      work = null;
    },
  };
}

describe('mount, update, unmount — the only three moments a skin needs', () => {
  it('the same asymmetry the React hook keeps, written with no React', () => {
    const { session, save, busyOf } = wired();

    const mounted = componentLike(session, save);
    mounted.mount('Uploading the photo');
    mounted.update('Uploading the photo (2 of 3)');
    expect(busyOf('compose.save')).toBe('Uploading the photo (2 of 3)');

    mounted.unmount();

    expect(session.openWork(), 'the work row outlives the component, on purpose').toHaveLength(1);
    expect(busyOf('compose.save'), 'the claim about the control does not').toBeUndefined();
  });

  it('a double-invoke of mount is the app’s to guard, and the guard is one boolean', () => {
    const { session, save } = wired();

    // React StrictMode's order, and the same order a hot reload produces. The
    // library takes no position on it: a second `beginWork` is a second piece of
    // work, honestly, so a skin that must not open two holds the handle it has.
    const mounted = componentLike(session, save);
    mounted.mount('Saving…');
    const first = session.openWork()[0]!.workId;
    mounted.unmount();
    mounted.mount('Saving…');

    expect(session.openWork().map((row) => row.workId)).toEqual([first, expect.any(String)]);
    expect(session.openWork()[1]!.workId).not.toBe(first);
  });
});

describe('nothing in this interface is React-shaped', () => {
  it('the doors are plain methods taking plain values', () => {
    const { session, save } = wired();
    const work = session.beginWork('anything');

    expect(typeof session.beginWork).toBe('function');
    expect(typeof work.done).toBe('function');
    expect(typeof save.setBusy).toBe('function');
    // No handle, no subscription, no scheduler: the whole contract is a string
    // in, an object with one method back, and a string on a control.
    expect(Object.keys(work).sort()).toEqual(['done', 'workId']);
  });
});
