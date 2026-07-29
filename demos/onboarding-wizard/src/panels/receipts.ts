import type { TransitionRecord } from 'hcifootprint';

/**
 * THE RECEIPTS — what actually happened, and what is only claimed.
 *
 * Three separate truths ride each row, and the panel keeps them separate
 * because the library does:
 *   • outcome        — did the record commit, or was it rejected / rolled back?
 *   • effectVerified — were the DECLARED writes actually observed in a report?
 *                      'unobservable' is a real answer, not a missing one.
 *   • toNodeClaimed  — the cursor moved on a claim; sync() confirms it later.
 *
 * The commit-log join is the honesty check that matters most: settled,
 * stimulus and sync rows each own exactly one commit bundle, keyed by the
 * transition id. A committed row with no bundle would mean the trace and the
 * log disagree — so the panel counts both and shows the pairing rather than
 * asserting it in prose.
 */
export interface ReceiptRow {
  id: string;
  /** What caused it: the affordance fired, or the stimulus observed. */
  what: string;
  principal: string;
  outcome: TransitionRecord['outcome'];
  effectVerified?: boolean | 'unobservable';
  fromNode: string;
  toNode?: string;
  /** The cursor moved on a declared claim, not an app confirmation. */
  toNodeClaimed: boolean;
  /** Nothing executed (an allowed tour no-op). */
  materialized?: false;
  hasCommitBundle: boolean;
}

export interface ReceiptReading {
  from: string;
  rows: ReceiptRow[];
  committed: number;
  bundles: number;
  /** Every committed row owns exactly one bundle, and no bundle is orphaned. */
  logJoinsCleanly: boolean;
}

/** The least this needs from a commit bundle: which transition wrote it. */
interface BundleLike {
  runtimeStageId: string;
}

/**
 * `Cause` carries `affordanceId` only when kind is 'fired' and `stimulus` only
 * when it is 'stimulus' — both optional on the type, so both get a fallback
 * rather than an assertion. A row with no name is a row with no name.
 */
function causeOf(record: TransitionRecord): string {
  return record.cause.kind === 'fired'
    ? (record.cause.affordanceId ?? '(unnamed fire)')
    : `stimulus:${record.cause.stimulus ?? 'unknown'}`;
}

export function readReceipts(
  transitions: readonly TransitionRecord[],
  commitLog: readonly BundleLike[],
): ReceiptReading {
  const bundleIds = new Set(commitLog.map((bundle) => bundle.runtimeStageId));
  const rows: ReceiptRow[] = transitions.map((record) => ({
    id: record.id,
    what: causeOf(record),
    principal: record.cause.principal,
    outcome: record.outcome,
    ...(record.effectVerified !== undefined ? { effectVerified: record.effectVerified } : {}),
    fromNode: record.fromNode,
    ...(record.toNode !== undefined ? { toNode: record.toNode } : {}),
    toNodeClaimed: record.toNodeClaimed === true,
    ...(record.materialized === false ? { materialized: false as const } : {}),
    hasCommitBundle: bundleIds.has(record.id),
  }));
  const committedRows = rows.filter((row) => row.outcome === 'committed');
  return {
    from: 'session.transitions() + session.commitLog()',
    rows,
    committed: committedRows.length,
    bundles: commitLog.length,
    logJoinsCleanly:
      committedRows.length === commitLog.length && committedRows.every((row) => row.hasCommitBundle),
  };
}
