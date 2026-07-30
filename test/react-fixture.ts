/**
 * A REAL REACT TREE WITH NO DOM — because the library has no DOM either.
 *
 * The hook's whole job is React's scheduling: when a ref callback runs, when it
 * runs with `null`, when a memoized callback is rebuilt, and what StrictMode's
 * double-invoke does to all three. None of that can be asserted by calling the
 * hook's parts by hand — only React can say when React calls something — so these
 * tests drive REAL React.
 *
 * WHY `react-test-renderer` AND NOT jsdom. jsdom would need `lib: ["ES2022","DOM"]`
 * in `tsconfig.test.json`, a file shared with work outside this subpath, and the
 * DOM types it added would be visible to every module compiled under it — which is
 * the compiler-enforced SSR guarantee the sensor rests on (dom-port.ts's header).
 * `react-test-renderer` needs no DOM at all: its `createNodeMock` option exists
 * precisely so a host ref can be given a node the test chose, so the elements these
 * tests hand over are the SAME structural `FakeElement`s the sensor's own suite
 * uses, and the sensor is exercised exactly as it is everywhere else.
 *
 * It prints a deprecation notice, and the notice is TRUE: if React removes this
 * renderer these tests are what has to move, and nobody should be able to forget
 * that. So it is kept — once. See {@link keepTheNoticeOnce}.
 */
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { act, create } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { ControlSurfaceProvider, useControl } from '../src/react/index.js';
import type { ControlSpec } from '../src/react/index.js';
import type { PageWatch } from '../src/sensor/index.js';
import type { FakeElement } from './sensor-fixture.js';

// React only trusts `act()` to flush effects when the environment says it is a
// test one. Without this every render logs "not configured to support act(...)"
// and the effects act() is being used to flush are the ones it stops waiting for.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * React's deprecation notice, said once instead of once per `create()`.
 *
 * The sentence is true and is kept; a dozen copies of one true sentence is not
 * more honest than one, it is only louder — the same reason the sensor warns once
 * about a throwing report sink rather than on every click (watch-page.ts:170-172).
 * The filter is keyed on that exact sentence and NOTHING else, so React's real
 * warnings — the ones a test must not be allowed to hide — pass straight through.
 *
 * Deliberately not the supported alternative: React silences it for callers who
 * set `IS_REACT_NATIVE_TEST_ENVIRONMENT`, and this is not one.
 */
function keepTheNoticeOnce(): void {
  const notice = 'react-test-renderer is deprecated';
  const passThrough = console.error;
  let said = false;
  console.error = (...args: unknown[]): void => {
    if (typeof args[0] === 'string' && args[0].startsWith(notice)) {
      if (said) return;
      said = true;
    }
    passThrough(...args);
  };
}
keepTheNoticeOnce();

/** The prop a host element carries so the renderer knows which structural element it IS. */
interface NodeProps {
  readonly node: FakeElement;
}

/** A mounted tree, with the two motions every lifecycle test needs. */
export interface Tree {
  render(element: ReactElement): void;
  unmount(): void;
}

/**
 * Mount a tree and hand back its two motions, each already wrapped in `act()` so
 * effects and refs have run by the time the call returns.
 */
export function mountTree(element: ReactElement): Tree {
  let renderer!: ReactTestRenderer;
  act(() => {
    // The renderer has no document, so a host ref would be null: the test says
    // which structural element each host node is, through the prop it carries.
    renderer = create(element, { createNodeMock: (host) => (host.props as NodeProps).node });
  });
  return {
    render(next): void {
      act(() => renderer.update(next));
    },
    unmount(): void {
      act(() => renderer.unmount());
    },
  };
}

/**
 * The shape a real component writes: declare the control and put the ref on the
 * element. That is the whole adoption — the app's own `onClick` is untouched, and
 * there is nothing here that reports.
 *
 * The app's handler is not modelled as a React prop, because it would be a lie:
 * this renderer has no DOM and dispatches no events. A test that needs the app's
 * own behaviour registers it on the structural element itself, which is where the
 * browser runs it — in the target phase, after the sensor's capture listener.
 */
export function Control(props: { spec: ControlSpec; element: FakeElement }): ReactElement {
  const ref = useControl(props.spec);
  return createElement(props.element.tagName.toLowerCase(), { ref, node: props.element });
}

/** How many times a watcher was handed a control, and how many were let go. */
export interface AttachCounts {
  readonly attached: number;
  readonly detached: number;
}

/**
 * The same watcher, counting.
 *
 * Re-attaching is invisible from the outside — the core nets `attach` → `detach` →
 * `attach` to one entry, so `coverage().declared` reads 1 whether the hook
 * re-declared the control once or on every keystroke. The count is the only place
 * the churn shows, and churn is the thing a stable ref callback exists to prevent.
 */
export function countAttachments(inner: PageWatch): { watch: PageWatch; counts: AttachCounts } {
  const counts = { attached: 0, detached: 0 };
  const watch: PageWatch = {
    attach(declaration) {
      counts.attached += 1;
      const attachment = inner.attach(declaration);
      return {
        detach(): void {
          counts.detached += 1;
          attachment.detach();
        },
      };
    },
    coverage: () => inner.coverage(),
    stop: () => inner.stop(),
  };
  return { watch, counts };
}

/** A control declared under a watcher — the whole tree most of these tests need. */
export function declaring(watch: PageWatch | null, spec: ControlSpec, element: FakeElement): ReactElement {
  return createElement(ControlSurfaceProvider, { watch }, createElement(Control, { spec, element }));
}
