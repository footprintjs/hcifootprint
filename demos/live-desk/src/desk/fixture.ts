/**
 * Test support only — the app's mount sequence, without React.
 *
 * The UI reports its controls through `store.mountControl` in an effect; here
 * the tests do it by hand, in the same order the components would. Nothing in
 * this file is imported by the app.
 */
import { createDesk, type Desk } from './wiring.js';

/** Let the session's queued structure flush (and any handler microtask) run. */
export const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** A desk with the inbox on screen — the state the app boots into. */
export async function bootDesk(): Promise<Desk> {
  const desk = createDesk();
  desk.store.mountControl('inbox-list');
  desk.store.mountControl('compose-button');
  await flush();
  return desk;
}

/** Ids of everything the session is offering right now. */
export function offeredIds(desk: Desk): string[] {
  return desk.session.available().edges.map((edge) => edge.affordanceId);
}
