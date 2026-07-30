/**
 * The three hooks the UI needs, and nothing more.
 *
 * `useRenderedControl` is the load-bearing one: a component tells the store it is
 * on screen, and un-tells it when it leaves. That single line is what makes an
 * action's existence follow the real UI — no registration lists to maintain, no
 * chance of a control that stopped rendering leaving a live binding behind.
 *
 * It answers a DIFFERENT question from the library's `useControl`, and the two sit
 * side by side in this app: this one says "the desk can do this now" (the action's
 * existence), the library's says "this element IS that action" (who did it when a
 * human clicks). One publishes the affordance, the other attributes the act.
 */
import { useEffect, useReducer, useSyncExternalStore } from 'react';
import type { ControlId } from '../app/state.js';
import type { Desk } from '../desk/wiring.js';
import type { DeskSnapshot } from '../app/store.js';

const SESSION_EVENTS = ['transition', 'state', 'structure', 'gap', 'confirm'] as const;

/** The app's state, through the same store the graph reads. */
export function useDeskState(desk: Desk): DeskSnapshot {
  return useSyncExternalStore(desk.store.subscribe, desk.store.getSnapshot, desk.store.getSnapshot);
}

/**
 * Re-render whenever the SESSION says something moved. The panels then re-read
 * the live API — they never cache a derived copy, so nothing on screen can be
 * one beat behind what the session would answer now.
 */
export function useSessionTick(desk: Desk): number {
  const [tick, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const offs = SESSION_EVENTS.map((event) => desk.session.on(event, () => bump()));
    const unsubscribe = desk.store.subscribe(() => bump());
    return () => {
      for (const off of offs) off();
      unsubscribe();
    };
  }, [desk]);
  return tick;
}

/** Report this control's presence for as long as it is rendered. */
export function useRenderedControl(desk: Desk, control: ControlId): void {
  useEffect(() => {
    desk.store.mountControl(control);
    return () => desk.store.unmountControl(control);
  }, [desk, control]);
}
