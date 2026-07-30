/**
 * THE HOOK IS A SKIN, AND THESE ARE THE ASSERTIONS THAT PROVE IT.
 *
 * Every row asserted here is written by the CORE — the same `watchPage`, the same
 * declared level, the same fixture elements test/sensor-*.test.ts drives with no
 * framework at all. What React contributes is scheduling: when a ref callback
 * runs, when it runs again with `null`, when a memoized callback is rebuilt, and
 * what StrictMode's double-invoke does to all three. So each test below is one
 * scheduling moment, and the answer to it is always "one declaration, one row".
 *
 * THE ONE BEHAVIOUR THAT IS THE HOOK'S OWN is the declared GETTERS — the value,
 * and the predicate saying whether a gesture is the act yet. A component re-renders
 * constantly and writes them inline, so their identity changes on every render while
 * the control does not. Reading the newest getter without re-declaring the control is
 * the thing this file exists to pin, and it is pinned three times over — by the value
 * that lands on the ledger, by an attach COUNT (the core nets re-declaration to one
 * entry and would hide the churn otherwise), and by WHICH render the getter came
 * from, because "the newest" and "the newest one that COMMITTED" are different
 * answers exactly when a human acts mid-render.
 */
import { describe, expect, it } from 'vitest';
import { createElement, StrictMode } from 'react';
import { watchPage } from '../src/sensor/index.js';
import type { SensorReport } from '../src/sensor/index.js';
import { desk, el, humanClick, humanCommit, mountDesk, recordFires } from './sensor-fixture.js';
import { Control, WhileRendering, countAttachments, declaring, mountTree } from './react-fixture.js';

describe('a declared control puts the human act on the ledger, and nothing else changes', () => {
  it('one click, one row, and the row says a person did it', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    mountTree(declaring(watch, { edge: desk.send }, button));
    humanClick(button);

    expect(fires).toEqual([{ edge: desk.send, opts: { source: 'user', invoke: false } }]);
    watch.stop();
  });

  it("the app's own handler still runs, exactly once, and the hook ran nothing", () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    // The app's own onClick, registered where the browser runs it: the target
    // phase, after the sensor's capture listener has already recognised the act.
    let performed = 0;
    button.addEventListener('click', () => {
      performed += 1;
    });
    const watch = watchPage(session, { root: surface });

    mountTree(declaring(watch, { edge: desk.send }, button));
    humanClick(button);

    expect(performed, 'the app performs once — the sensor is record-only').toBe(1);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });

  it('unmount is a true pair with mount — after it the same act writes nothing', () => {
    const { session, surface } = mountDesk();
    // No role at all, so only a declaration can reach it: this proves the hook's
    // teardown rather than a locator quietly still matching.
    const box = el('div');
    surface.mount(box);
    const watch = watchPage(session, { root: surface });

    const tree = mountTree(declaring(watch, { edge: desk.refresh }, box));
    humanClick(box);
    tree.unmount();
    humanClick(box);

    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.refresh)).toHaveLength(1);
    watch.stop();
  });

  it('a remount under StrictMode nets to ONE declaration and ONE row', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const watch = watchPage(session, { root: surface });

    // React's double-invoke is setup → cleanup → setup, which is exactly the churn
    // the core's token-identity detach is built for (control-index.ts:99-107).
    mountTree(createElement(StrictMode, null, declaring(watch, { edge: desk.send }, button)));
    humanClick(button);

    expect(watch.coverage().declared).toBe(1);
    expect(session.transitions().filter((t) => t.cause.affordanceId === desk.send)).toHaveLength(1);
    watch.stop();
  });
});

describe('the declared value is the one the human could see', () => {
  /**
   * A fresh spec object with a fresh inline getter — what a real render produces.
   *
   * The draft is CLOSED OVER BY VALUE on purpose: that is a `useState` local, the
   * commonest shape a component's own value takes, and the only shape that can
   * tell the newest getter from the one the memoized callback was built with. A
   * getter reading a shared mutable box would answer the same either way and
   * would prove nothing.
   */
  function composeSpec(draft: string) {
    return { edge: desk.compose, value: (): unknown => ({ message: draft }) };
  }

  it('a re-render hands over the NEWEST getter without re-declaring the control', () => {
    const { session, surface } = mountDesk();
    const field = el('input', { attrs: { type: 'text' } });
    surface.mount(field);
    const { port, fires } = recordFires(session);
    const { watch, counts } = countAttachments(watchPage(port, { root: surface }));

    const tree = mountTree(declaring(watch, composeSpec('first'), field));
    expect(counts.attached).toBe(1);

    tree.render(declaring(watch, composeSpec('second'), field));
    // The getter's identity changed; the control did not. A hook that put the
    // getter in its dependencies would re-declare here, and one that captured the
    // render's closure would report 'first' below.
    expect(counts.attached, 'a new inline getter is not a new control').toBe(1);

    humanCommit(field);
    expect(fires).toHaveLength(1);
    expect(fires[0]!.opts.payload).toEqual({ message: 'second' });
    watch.stop();
  });

  it('gaining a value getter IS a new declaration, and coverage takes back its advisory', () => {
    const { session, surface } = mountDesk();
    const field = el('input', { attrs: { type: 'text' } });
    surface.mount(field);
    const advisories: SensorReport[] = [];
    const { watch, counts } = countAttachments(
      watchPage(session, { root: surface, onReport: (report) => advisories.push(report) }),
    );

    const tree = mountTree(declaring(watch, { edge: desk.compose }, field));
    expect(watch.coverage().edges.find((row) => row.edge === desk.compose)).toMatchObject({
      status: 'unwatched',
      blocked: 'payload',
    });

    tree.render(declaring(watch, { edge: desk.compose, value: () => ({ message: 'x' }) }, field));

    expect(counts.attached, 'whether a value exists is part of the control, not of the value').toBe(2);
    expect(watch.coverage().edges.find((row) => row.edge === desk.compose)).toMatchObject({ status: 'watching' });
    expect(advisories).toContainEqual({ kind: 'watching', edge: desk.compose });
    watch.stop();
  });

  /**
   * THE ATTACK: a trusted click that lands while React is rendering the NEXT screen.
   *
   * Under concurrent React that window is real and can be long — a `startTransition`
   * re-render runs while the committed tree is still what the human is looking at,
   * and React yields between components, so a click really can be dispatched in the
   * middle of it. A synchronous render is the deterministic stand-in: in both, the
   * screen is the PREVIOUS commit, and a hook that wrote its latest-ref from the
   * render body is already holding a getter nobody has seen.
   *
   * The probe below is that click, placed where only a render can put it — as the
   * sibling React renders straight after the control. It is the app's own handler
   * disagreeing with the sensor, reduced to one assertion.
   */
  it('a click landing MID-RENDER reports the screen, not the render in flight', () => {
    const { session, surface } = mountDesk();
    const field = el('input', { attrs: { type: 'text' } });
    surface.mount(field);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    const tree = mountTree(declaring(watch, composeSpec('first'), field));
    // The probe renders after the control and before this render commits: 'second'
    // is not on screen yet, and may never be.
    tree.render(
      declaring(watch, composeSpec('second'), field, createElement(WhileRendering, { act: () => humanCommit(field) })),
    );

    expect(fires).toHaveLength(1);
    expect(fires[0]!.opts.payload, 'the ledger must carry what the human could see').toEqual({
      message: 'first',
    });
    watch.stop();
  });

  it('no getter means NO payload key — the hook cannot invent one either', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    mountTree(declaring(watch, { edge: desk.send }, button));
    humanClick(button);

    expect(Object.hasOwn(fires[0]!.opts, 'payload'), 'an absent value is an absent key').toBe(false);
    watch.stop();
  });
});

describe('what re-declares a control, and what is only render churn', () => {
  it('a new edge re-declares, and the next act lands on the new one', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const { watch, counts } = countAttachments(watchPage(port, { root: surface }));

    const tree = mountTree(declaring(watch, { edge: desk.send }, button));
    tree.render(declaring(watch, { edge: desk.archive }, button));
    humanClick(button);

    expect(counts.attached).toBe(2);
    expect(counts.detached).toBe(1);
    expect(fires.map((fire) => fire.edge)).toEqual([desk.archive]);
    watch.stop();
  });

  it('a new instance re-declares — one row of a list becoming another', () => {
    const { session, surface } = mountDesk({ state: { threadIds: ['t-1', 't-2'] } });
    const row = el('button', { text: 'Reply' });
    surface.mount(el('li', { children: [row] }));
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    const tree = mountTree(declaring(watch, { edge: desk.reply, instance: 't-1' }, row));
    humanClick(row);
    tree.render(declaring(watch, { edge: desk.reply, instance: 't-2' }, row));
    humanClick(row);

    expect(fires.map((fire) => fire.opts.instance)).toEqual(['t-1', 't-2']);
    watch.stop();
  });

  it('an inline { debounceMs } is a policy, not an identity — the window is what counts', () => {
    const { session, surface } = mountDesk();
    const field = el('input', { attrs: { type: 'text' } });
    surface.mount(field);
    const { watch, counts } = countAttachments(watchPage(session, { root: surface }));
    const value = (): unknown => ({ message: 'typed' });

    const tree = mountTree(declaring(watch, { edge: desk.compose, value, cadence: { debounceMs: 50 } }, field));
    // A fresh object every render, saying exactly the same thing. Depending on the
    // object itself would re-declare the control on every keystroke.
    tree.render(declaring(watch, { edge: desk.compose, value, cadence: { debounceMs: 50 } }, field));
    expect(counts.attached).toBe(1);

    tree.render(declaring(watch, { edge: desk.compose, value, cadence: { debounceMs: 80 } }, field));
    expect(counts.attached, 'a different window is a different control').toBe(2);
    watch.stop();
  });
});

/**
 * A CONFIRM BUTTON, WHICH IS THE COMMONEST CONTROL A HOOK COULD GET WRONG.
 *
 * One element, two presses, and only the second one does anything. The intuition
 * that looks right — hand the element over only once it is armed — is the bug: the
 * resting label is the action's own locator, so the sensor recognises the unarmed
 * button BY NAME and records an act that never happened. The declaration stays put
 * and `commits` says which press is real.
 */
describe('a control can say WHEN a gesture on it is the act', () => {
  /** A fresh inline predicate closed over BY VALUE — what a `useState` flag produces. */
  function confirmSpec(armed: boolean) {
    return { edge: desk.send, commits: (): boolean => armed };
  }

  it('the arming press writes nothing, the confirming press writes one row', () => {
    const { session, surface } = mountDesk();
    // Named exactly as the graph's locator names it, which is what makes this the
    // attack rather than a hypothetical.
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const { watch, counts } = countAttachments(watchPage(port, { root: surface }));

    const tree = mountTree(declaring(watch, confirmSpec(false), button));
    humanClick(button);
    expect(fires, 'a press that sends nothing is not a send').toHaveLength(0);

    tree.render(declaring(watch, confirmSpec(true), button));
    humanClick(button);

    expect(fires.map((fire) => fire.edge)).toEqual([desk.send]);
    expect(counts.attached, 'arming a control is not a new control').toBe(1);
    watch.stop();
  });

  it('gaining the predicate IS a new declaration — a control that learns to wait', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const { port, fires } = recordFires(session);
    const { watch, counts } = countAttachments(watchPage(port, { root: surface }));

    const tree = mountTree(declaring(watch, { edge: desk.send }, button));
    tree.render(declaring(watch, confirmSpec(false), button));
    humanClick(button);

    // Whether the app answers this question at all is the control's identity, so a
    // hook that left it out of its dependencies would still be serving the old
    // declaration — which reports.
    expect(counts.attached).toBe(2);
    expect(fires).toHaveLength(0);
    watch.stop();
  });
});

describe('the watcher may arrive after the controls do', () => {
  it('a control mounted with no surface attaches itself when one appears', () => {
    const { session, surface } = mountDesk();
    const box = el('div');
    surface.mount(box);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    // The first commit of any app that builds its watcher in an effect: refs run
    // before effects, so this really is the ordinary case rather than an edge one.
    const tree = mountTree(declaring(null, { edge: desk.refresh }, box));
    humanClick(box);
    expect(fires).toHaveLength(0);

    tree.render(declaring(watch, { edge: desk.refresh }, box));
    humanClick(box);

    expect(fires.map((fire) => fire.edge)).toEqual([desk.refresh]);
    watch.stop();
  });

  it('with no provider at all the ref is inert, and rendering is still perfectly fine', () => {
    const { session, surface } = mountDesk();
    const box = el('div');
    surface.mount(box);
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface });

    // A component outside a provider is not broken — it simply reports nothing.
    // Throwing here would make the sensor's absence a crash, and adopting the hook
    // must never be able to change whether an app renders.
    mountTree(createElement(Control, { spec: { edge: desk.refresh }, element: box }));
    humanClick(box);

    expect(fires).toHaveLength(0);
    watch.stop();
  });
});

describe("the agent's own clicks are still not human acts", () => {
  it('a programmatic click on a HOOKED control writes no row, and the decline names the edge', () => {
    const { session, surface } = mountDesk();
    const button = el('button', { text: 'Send' });
    surface.mount(button);
    const reports: SensorReport[] = [];
    const { port, fires } = recordFires(session);
    const watch = watchPage(port, { root: surface, onReport: (report) => reports.push(report) });

    mountTree(declaring(watch, { edge: desk.send }, button));
    // Exactly what an agent driving the page produces: identical to a person's
    // click in every way except `isTrusted`.
    button.click();

    expect(fires, "the agent's own motion is not a person").toHaveLength(0);
    expect(reports).toContainEqual({ kind: 'synthetic-event', edge: desk.send, actuation: 'click' });
    watch.stop();
  });
});
