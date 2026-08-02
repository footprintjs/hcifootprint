/**
 * LIVE DESK — one desk, three readers.
 *
 * The left column is an ordinary support app. The right column is what the
 * session says about it, read live. Between them sits one store: the app
 * publishes its actions there, and `fromLiveStore` turns them into the graph's
 * bindings. Nothing in this app calls registerActions, and nothing on the
 * right prints a fact the session did not return.
 *
 * A HUMAN'S CLICKS LAND ON THE LEDGER BY THEMSELVES. The watcher below is the
 * only wiring the whole app needs for that: every control declares itself with
 * `useControl` and nothing reports.
 */
import { useEffect, useMemo, useState } from 'react';
import { ControlSurfaceProvider } from 'hcifootprint/react';
import { watchPage } from 'hcifootprint/sensor';
import type { PageWatch } from 'hcifootprint/sensor';
import { createBridge } from './agent/bridge.js';
import { createDesk } from './desk/wiring.js';
import * as keys from './keys/keyStore.js';
import { REPORTED_BY_THE_APP } from './ui/act.js';
import { ChatPanel } from './ui/ChatPanel.js';
import { DeskSurface } from './ui/DeskSurface.js';
import { PanelWall } from './ui/Panels.js';

export function App(): React.JSX.Element {
  // One desk and one bridge for the life of the page — the session IS the
  // continuity between turns, so re-creating it would erase the demo.
  const desk = useMemo(() => createDesk(), []);
  const bridge = useMemo(() => createBridge(desk.session), [desk]);
  const [watch, setWatch] = useState<PageWatch | null>(null);

  // Session storage is the only place this app keeps a key; anything a previous
  // build left in localStorage is removed on sight.
  useEffect(() => keys.forceSessionOnly(), []);

  // The watcher is built in an effect because `document` exists only in a
  // browser, and torn down with the tree. That means the FIRST commit has no
  // surface — refs run before effects — and every control below simply attaches
  // itself when this lands. StrictMode runs the whole thing twice on purpose:
  // `stop()` and `watchPage()` net to one live listener set, which is the
  // contract this demo is here to exercise rather than to assume.
  useEffect(() => {
    const page = watchPage(desk.session, {
      root: document.body,
      // ONE ACT, ONE ROW: three controls still report through the app's own
      // humanFire door (ui/act.ts), so the sensor stands down for exactly those.
      reportedElsewhere: REPORTED_BY_THE_APP,
    });
    setWatch(page);
    return () => {
      setWatch(null);
      page.stop();
    };
  }, [desk]);

  return (
    <ControlSurfaceProvider watch={watch}>
      <div className="app">
        <header className="masthead">
          <h1>Live Desk</h1>
          <p>
            A support inbox whose every action is published by the app’s own store, read into the graph by{' '}
            <code>fromLiveStore</code>. Hide a control and its action stops existing. Fire a gesture nobody wired and
            the refusal names the gesture. Nothing on the right is written by hand.
          </p>
        </header>
        <main className="columns">
          <div className="left">
            <DeskSurface desk={desk} />
            <ChatPanel desk={desk} bridge={bridge} />
          </div>
          <div className="right">
            <PanelWall desk={desk} />
          </div>
        </main>
      </div>
    </ControlSurfaceProvider>
  );
}
