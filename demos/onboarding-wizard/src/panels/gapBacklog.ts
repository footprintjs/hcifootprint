import type { GapRecord } from 'hcifootprint';

/**
 * THE DEMAND BACKLOG — what was asked for that nothing could serve.
 *
 * The ledger is token-lean by design (names and kinds, never descriptions or
 * transcripts) precisely so it can be clustered cheaply. This panel does the
 * two clusterings that answer a product question:
 *
 *   by gesture — WHICH WIRING is missing. A pile of 'element' rows says the
 *                team owes a click handler; a pile with no gesture at all says
 *                the edges never declared how they are performed.
 *   by reason  — what kind of refusal it was, so protocol events (STALE_CURSOR
 *                retries that succeeded on replan) do not read as missing
 *                capability.
 *
 * Ordering is count-desc then label-asc: a panel that reshuffles on every
 * render because two clusters tie is a panel nobody can read.
 */
export interface GapCluster {
  label: string;
  count: number;
}

export interface GapRow {
  kind: GapRecord['kind'];
  node: string;
  affordanceId?: string;
  rejectionReason?: string;
  /** Which gesture nothing was wired to perform. */
  gestureKind?: string;
  /** The journey a refused commit was reaching for (entry-gate rows). */
  journeyId?: string;
  principal?: string;
  request?: string;
}

export interface GapBacklog {
  from: string;
  total: number;
  byGesture: GapCluster[];
  byReason: GapCluster[];
  rows: GapRow[];
}

/** No declared gesture is a REAL answer, not a missing one — it gets a label. */
const NO_GESTURE = '(no declared gesture)';

function cluster(labels: string[]): GapCluster[] {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (b.count === a.count ? a.label.localeCompare(b.label) : b.count - a.count));
}

export function readGapBacklog(gaps: readonly GapRecord[]): GapBacklog {
  return {
    from: 'session.gaps()',
    total: gaps.length,
    byGesture: cluster(gaps.map((gap) => gap.gestureKind ?? NO_GESTURE)),
    // A 'reported' or 'unmaterialized-fire' row has no rejectionReason; its
    // KIND is the honest label there.
    byReason: cluster(gaps.map((gap) => gap.rejectionReason ?? gap.kind)),
    rows: gaps.map((gap) => ({
      kind: gap.kind,
      node: gap.node,
      ...(gap.affordanceId !== undefined ? { affordanceId: gap.affordanceId } : {}),
      ...(gap.rejectionReason !== undefined ? { rejectionReason: gap.rejectionReason } : {}),
      ...(gap.gestureKind !== undefined ? { gestureKind: gap.gestureKind } : {}),
      ...(gap.journeyId !== undefined ? { journeyId: gap.journeyId } : {}),
      ...(gap.principal !== undefined ? { principal: gap.principal } : {}),
      ...(gap.request !== undefined ? { request: gap.request } : {}),
    })),
  };
}
