/**
 * What happens when a HUMAN clicks something in this app.
 *
 * Report first, then act. The session is told about the motion with
 * `invoke: false` — the app-self-report tier: the human already clicked, so no
 * handler needs running, and the library records real motion untouched rather
 * than gating it (only an AGENT's fire has to prove something is wired). Doing
 * it in this order matters twice over: the pending transition exists before the
 * store tap reports the delta, so the settlement attaches to the right record;
 * and a rule the desk declared — a guard that does not hold — refuses BEFORE
 * the app has changed anything.
 */
import type { FireResult } from 'hcifootprint';
import type { Desk } from '../desk/wiring.js';

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
