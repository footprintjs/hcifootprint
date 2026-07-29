/**
 * Receipts — `transitions()` and `confirms()`, printed as they came back.
 *
 * The log is the app's memory of what happened, and its honesty markers are the
 * interesting part: `effectVerified` says whether the declared writes actually
 * showed up in the report, `toNodeClaimed` says a move was a claim rather than
 * an observation, `guardUnevaluated` names conditions taken on faith. Each is
 * rendered only when present — absence is the normal case and means nothing is
 * being flagged.
 *
 * Refusals are NOT here: a refused fire never touched state, so it has no
 * transition. It lives in the gap ledger, which is the backlog panel.
 */
import type { ConfirmRecord, TransitionRecord } from 'hcifootprint';

export interface Receipt {
  readonly id: string;
  readonly at: number;
  /** 'fired' — someone acted; 'stimulus' — the world moved on its own. */
  readonly kind: 'fired' | 'stimulus';
  readonly who: string;
  /** The affordance fired, or the stimulus that moved the world. */
  readonly what: string;
  readonly outcome: string;
  readonly flags: readonly string[];
  /** Data the handler handed back, when it handed any back. */
  readonly produced?: unknown;
}

export function receiptsOf(transitions: readonly TransitionRecord[]): Receipt[] {
  return transitions.map((row) => {
    const flags: string[] = [];
    if (row.effectVerified === true) flags.push('effectVerified');
    if (row.effectVerified === false) flags.push('effect NOT verified');
    if (row.effectVerified === 'unobservable') flags.push('effect unobservable');
    if (row.toNodeClaimed) flags.push('toNode claimed');
    if (row.unverifiedEdge) flags.push('unverified edge');
    if (row.materialized === false) flags.push('nothing executed');
    if (row.guardUnevaluated) flags.push(`guard unevaluated: ${row.guardUnevaluated.join(', ')}`);
    if (row.askId) flags.push('approved via receipts');
    return {
      id: row.id,
      at: row.timestamp,
      kind: row.cause.kind,
      who: row.cause.principal,
      // A fired row names its affordance; a stimulus row names the KIND of
      // world motion, prefixed so the two can never be misread as each other.
      what: row.cause.affordanceId ?? `stimulus:${row.cause.stimulus ?? 'unknown'}`,
      outcome: row.outcome,
      flags,
      ...(row.produced !== undefined ? { produced: row.produced } : {}),
    };
  });
}

export interface ConfirmLine {
  readonly askId: string;
  readonly at: number;
  readonly affordanceId: string;
  /** 'ask' → 'approved' | 'declined' — the three rows of one gate share an askId. */
  readonly kind: ConfirmRecord['kind'];
  /** What the human was shown — the library's own words, not ours. */
  readonly willDo: readonly string[];
}

export function confirmLinesOf(confirms: readonly ConfirmRecord[]): ConfirmLine[] {
  return confirms.map((row) => ({
    askId: row.askId,
    at: row.timestamp,
    affordanceId: row.affordanceId,
    kind: row.kind,
    willDo: willDoLines(row),
  }));
}

/**
 * The receipts an 'ask' row carried, quoted. `writes` and `navigatesTo` are the
 * edge's own CLAIMS (the library says so in ConfirmWillDo), so they are labelled
 * as claims here too — a receipt that reads like a promise is the thing this
 * library exists not to print.
 */
function willDoLines(row: ConfirmRecord): string[] {
  const willDo = row.receipts?.willDo;
  if (!willDo) return [];
  const lines: string[] = [willDo.does];
  if (willDo.writes && willDo.writes.length > 0) lines.push(`claims to write: ${willDo.writes.join(', ')}`);
  if (willDo.navigatesTo) lines.push(`claims to go to: ${willDo.navigatesTo}`);
  if (willDo.effectUnverifiable) lines.push('this session cannot verify that claim');
  return lines;
}
