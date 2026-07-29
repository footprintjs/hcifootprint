/**
 * The demand backlog — `gaps()`, clustered by the gesture nobody wired.
 *
 * A gap row is token-lean on purpose (names and reasons, never transcripts), and
 * it carries `gestureKind` on the WIRING-SHAPED refusals — the ones where the
 * missing piece is a binding. That one string turns "something is missing" into
 * "a TAB switch is missing a handler, twice": a work item, addressed to whoever
 * owns that control. A cluster with gesture 'none' is therefore meaningful in
 * its own right — the refusal was not about wiring (a greyed control, a guard
 * that did not hold), so nobody needs to go build anything.
 *
 * Nothing here interprets: it groups rows by (gesture, reason) and counts them.
 */
import type { GapRecord } from 'hcifootprint';

export interface BacklogCluster {
  /** The declared gesture kind, or 'none' when the row carried no binding. */
  readonly gesture: string;
  readonly reason: string;
  readonly count: number;
  /** Which actions landed in this cluster (names only — same discipline as the ledger). */
  readonly actions: readonly string[];
  readonly latestAt: number;
}

export interface Backlog {
  readonly from: 'gaps()';
  readonly total: number;
  readonly clusters: readonly BacklogCluster[];
}

export function backlogOf(gaps: readonly GapRecord[]): Backlog {
  const byKey = new Map<string, { gesture: string; reason: string; actions: Set<string>; count: number; latestAt: number }>();
  for (const row of gaps) {
    const gesture = row.gestureKind ?? 'none';
    const reason = row.rejectionReason ?? row.reason ?? row.kind;
    const key = `${gesture}::${reason}`;
    const cluster = byKey.get(key) ?? { gesture, reason, actions: new Set<string>(), count: 0, latestAt: 0 };
    cluster.count += 1;
    cluster.latestAt = Math.max(cluster.latestAt, row.timestamp);
    if (row.affordanceId) cluster.actions.add(row.affordanceId);
    byKey.set(key, cluster);
  }
  const clusters = [...byKey.values()]
    .map((cluster) => ({
      gesture: cluster.gesture,
      reason: cluster.reason,
      count: cluster.count,
      actions: [...cluster.actions].sort(),
      latestAt: cluster.latestAt,
    }))
    // Biggest demand first; ties resolve by name so the panel never reshuffles
    // under a reader who is mid-sentence.
    .sort((a, b) => b.count - a.count || a.gesture.localeCompare(b.gesture) || a.reason.localeCompare(b.reason));
  return { from: 'gaps()', total: gaps.length, clusters };
}
