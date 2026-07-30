/**
 * THE PROVIDER IS A DELIVERY MECHANISM, AND THAT IS THE WHOLE CLAIM.
 *
 * It carries one object down a tree and decides nothing about it. So the tests
 * here are exactly the questions a delivery mechanism has to answer: does the same
 * object come out that went in, does the nearest one win, does a subtree with none
 * still render, and does `null` travel as a value rather than as a failure.
 *
 * `null` is the load-bearing one. A watcher needs a browser root, so an app builds
 * it in an effect — and effects run after the refs beneath them. The commit where
 * a tree has no surface is therefore the FIRST commit of every real app, not an
 * edge case, and a provider that refused to carry `null` would make that commit
 * impossible to write.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { ControlSurfaceProvider, useControlSurface } from '../src/react/index.js';
import type { PageWatch } from '../src/sensor/index.js';
import { watchPage } from '../src/sensor/index.js';
import { mountDesk } from './sensor-fixture.js';
import { mountTree } from './react-fixture.js';

/** A component that reports what it can see, so a test can read the context back. */
function Peek(props: { seen: Array<PageWatch | null> }): ReactElement | null {
  props.seen.push(useControlSurface());
  return null;
}

describe('the watcher a subtree can see', () => {
  it('is the very object the provider was handed — nothing wraps it on the way down', () => {
    const { session, surface } = mountDesk();
    const watch = watchPage(session, { root: surface });
    const seen: Array<PageWatch | null> = [];

    mountTree(createElement(ControlSurfaceProvider, { watch }, createElement(Peek, { seen })));

    expect(seen).toEqual([watch]);
    expect(seen[0], 'identity, not a copy: detach() must release the real attachment').toBe(watch);
    watch.stop();
  });

  it('is null with no provider above — not an error, and not a crash', () => {
    const seen: Array<PageWatch | null> = [];

    // Rendering is the assertion: a component that uses the hook outside a
    // provider must still be an ordinary component. Adopting this subpath can
    // never change whether an app renders.
    mountTree(createElement(Peek, { seen }));

    expect(seen).toEqual([null]);
  });

  it('is the NEAREST one when providers nest — a modal may report somewhere else', () => {
    const { session, surface } = mountDesk();
    const outer = watchPage(session, { root: surface });
    const inner = watchPage(session, { root: surface });
    const seen: Array<PageWatch | null> = [];

    mountTree(
      createElement(
        ControlSurfaceProvider,
        { watch: outer },
        createElement(ControlSurfaceProvider, { watch: inner }, createElement(Peek, { seen })),
      ),
    );

    expect(seen).toEqual([inner]);
    outer.stop();
    inner.stop();
  });

  it('can be null now and a real watcher later, which is every app that builds one in an effect', () => {
    const { session, surface } = mountDesk();
    const watch = watchPage(session, { root: surface });
    const seen: Array<PageWatch | null> = [];

    const tree = mountTree(createElement(ControlSurfaceProvider, { watch: null }, createElement(Peek, { seen })));
    tree.render(createElement(ControlSurfaceProvider, { watch }, createElement(Peek, { seen })));

    expect(seen).toEqual([null, watch]);
    watch.stop();
  });

  it('renders its children and adds nothing to the tree', () => {
    const seen: Array<PageWatch | null> = [];

    const tree = mountTree(
      createElement(ControlSurfaceProvider, { watch: null }, createElement(Peek, { seen })),
    );

    // A provider that dropped or wrapped its children would show up here, and a
    // context provider renders exactly what it was given.
    expect(seen).toHaveLength(1);
    tree.unmount();
  });
});
