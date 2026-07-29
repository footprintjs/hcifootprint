/**
 * LIVE DESK — one desk, three readers.
 *
 * The left column is an ordinary support app. The right column is what the
 * session says about it, read live. Between them sits one store: the app
 * publishes its actions there, and `fromLiveStore` turns them into the graph's
 * bindings. Nothing in this app calls registerToolGroup, and nothing on the
 * right prints a fact the session did not return.
 */
import { useEffect, useMemo } from 'react';
import { createBridge } from './agent/bridge.js';
import { createDesk } from './desk/wiring.js';
import * as keys from './keys/keyStore.js';
import { ChatPanel } from './ui/ChatPanel.js';
import { DeskSurface } from './ui/DeskSurface.js';
import { PanelWall } from './ui/Panels.js';

export function App(): React.JSX.Element {
  // One desk and one bridge for the life of the page — the session IS the
  // continuity between turns, so re-creating it would erase the demo.
  const desk = useMemo(() => createDesk(), []);
  const bridge = useMemo(() => createBridge(desk.session), [desk]);

  // Session storage is the only place this app keeps a key; anything a previous
  // build left in localStorage is removed on sight.
  useEffect(() => keys.forceSessionOnly(), []);

  return (
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
  );
}
