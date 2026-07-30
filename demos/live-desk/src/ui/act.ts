/**
 * THE APP'S OWN DOOR — kept, deliberately, for three controls out of nine.
 *
 * Report first, then act. The session is told about the motion with
 * `invoke: false` — the app-self-report tier: the human already clicked, so no
 * handler needs running, and the library records real motion untouched rather
 * than gating it (only an AGENT's fire has to prove something is wired). Doing
 * it in this order matters twice over: the pending transition exists before the
 * store tap reports the delta, so the settlement attaches to the right record;
 * and a rule the desk declared — a guard that does not hold — refuses BEFORE
 * the app has changed anything.
 *
 * THAT LAST HALF IS WHY THIS FILE STILL EXISTS. `hcifootprint/react` now carries
 * every other control (ui/DeskSurface.tsx), and it deletes the reporting call from
 * each one. What it cannot carry is the REFUSE-BEFORE-PERFORM ordering: the sensor
 * listens in the capture phase, which is before the app's handler but still after
 * the human clicked, so it records what happened and cannot stop it. A guarded
 * action wants the other order, and choosing between them is the app's to make
 * rather than the library's to hide.
 *
 * ONE ACT, ONE ROW. The three edges below are named to `watchPage` in
 * {@link REPORTED_BY_THE_APP}, so the sensor stands down for exactly them and
 * says so in `coverage()` with `blocked: 'door'`. Delete a `humanFire` call and
 * its entry here goes with it.
 */
import type { FireResult } from 'hcifootprint';
import type { Desk } from '../desk/wiring.js';

/**
 * The edges this app reports through `humanFire`, and the reason each one keeps
 * its own door:
 *
 * - the two TAB SWITCHES, because a tab flip is not a gesture any DOM listener
 *   can honestly claim: the desk reports which tab is up with `show()`, and the
 *   sensor refuses tab bindings for exactly that reason. Their refusal is also
 *   this demo's centrepiece — with nothing wired behind the gesture, the fire
 *   comes back NOT_MATERIALIZED naming a tab switch.
 * - SEND, because it is the one guarded action here (`composeDraftLength > 0`),
 *   and the empty-draft refusal has to arrive before the message is sent rather
 *   than alongside it.
 */
export const REPORTED_BY_THE_APP = [
  'desk.switch-to-inbox',
  'desk.switch-to-archive',
  'desk.compose.send-message',
] as const;

export interface HumanFire {
  readonly refusal: string | null;
}

export function humanFire(
  desk: Desk,
  affordanceId: string,
  perform: () => void,
  opts?: { instance?: string; payload?: unknown },
): HumanFire {
  const result = desk.session.fire(affordanceId, {
    source: 'user',
    invoke: false,
    ...(opts?.instance !== undefined ? { instance: opts.instance } : {}),
    ...(opts?.payload !== undefined ? { payload: opts.payload } : {}),
  });
  if (!result.ok) return { refusal: refusalText(result) };
  perform();
  return { refusal: null };
}

/** A refusal, printed out of the fields the result carried — never interpreted. */
export function refusalText(result: Extract<FireResult, { ok: false }>): string {
  const parts: string[] = [result.reason];
  if ('node' in result) parts.push(`node: ${result.node}`);
  if ('overlay' in result) parts.push(`overlay: ${result.overlay}`);
  if ('gesture' in result && result.gesture) parts.push(`gesture: ${result.gesture.kind}`);
  if ('instances' in result) parts.push(`instances: ${result.instances.slice(0, 4).join(', ')}`);
  if ('issues' in result) parts.push(result.issues);
  if ('evidence' in result) {
    parts.push(
      result.evidence
        .map((condition) => `${condition.key} ${condition.op} ${JSON.stringify(condition.threshold)} (actual ${condition.actualSummary})`)
        .join('; '),
    );
  }
  return parts.filter((part) => part.length > 0).join(' — ');
}
