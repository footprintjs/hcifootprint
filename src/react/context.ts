/**
 * WHERE A TREE'S CONTROLS REPORT — the watcher, handed down.
 *
 * The core takes a `root` because the app hands the environment in and the
 * library never reaches for a global (sensor/types.ts `WatchOptions.root`). So
 * the APP builds the watcher, with the root only it can name, and this context
 * carries that one object to every control below it. Nothing about the watcher is
 * decided here; a context is a delivery mechanism, not a policy.
 *
 * `null` IS A FIRST-CLASS VALUE, and both ways of arriving at it are ordinary:
 * - SERVER RENDER. There is no root on a server, so there is no watcher. A tree
 *   must still render, and a control below it must still be an ordinary element.
 * - THE WATCHER ARRIVES LATE. `watchPage` needs a browser object, so an app
 *   creates it in an effect — and effects run AFTER the refs below them. The
 *   first commit therefore genuinely has no surface, and `useControl` returns a
 *   ref that does nothing rather than one that throws. When the watcher lands,
 *   the context value changes, `useControl`'s ref identity changes with it, and
 *   React re-runs the refs — which is how controls mounted before the watcher
 *   attach to it without a single line of retry logic.
 *
 * THE RAW CONTEXT IS DELIBERATELY NOT EXPORTED. `useControlSurface()` is the one
 * way to read it, so there are not two doors to the same value — the same
 * one-door discipline the sensor keeps for reporting.
 */
import { createContext, createElement, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { PageWatch } from '../sensor/types.js';

const ControlSurfaceContext = createContext<PageWatch | null>(null);

export interface ControlSurfaceProviderProps {
  /**
   * The watcher every control below this point reports through, or `null` while
   * there is none (a server render, or the commit before the app's effect made
   * one).
   */
  readonly watch: PageWatch | null;
  readonly children?: ReactNode;
}

/**
 * Put a watcher in scope for a subtree.
 *
 * Written with `createElement` rather than JSX on purpose: the library builds with
 * no `jsx` compiler option and ships no `.tsx`, so a skin must be expressible in
 * plain TypeScript. It costs one line and buys a subpath that any bundler can read.
 */
export function ControlSurfaceProvider(props: ControlSurfaceProviderProps): ReactElement {
  return createElement(ControlSurfaceContext.Provider, { value: props.watch }, props.children);
}

/**
 * The watcher in scope, or `null`.
 *
 * `null` when there is no provider above at all — which is the honest answer, not
 * an error: a component that renders outside a provider is not broken, it simply
 * reports nothing. Throwing there would make the sensor's absence a crash, and the
 * whole point of this subpath is that adopting it changes no behaviour.
 */
export function useControlSurface(): PageWatch | null {
  return useContext(ControlSurfaceContext);
}
