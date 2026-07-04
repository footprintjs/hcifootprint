/**
 * Pure guard-satisfiability reasoning — "can this guard EVER be true?"
 *
 * The graph compiler (composeGuards) already rejects a key whose SAME operator
 * is declared twice with different values. What it does NOT catch is a key
 * whose DIFFERENT operators contradict each other — { gt: 5, lt: 3 },
 * { eq: 'paid', in: ['draft', 'open'] }, { in: [] }. A control gated on such a
 * guard can never light up, so the linter flags it.
 *
 * This is literal reasoning only (no state, no engine) and deliberately
 * CONSERVATIVE: it returns a contradiction only when one is provable from the
 * operators alone. Anything open-ended (ne / notIn / a lone range) is left
 * unflagged — the linter never cries "dead" over something it cannot prove.
 */
import type { WhereFilter } from 'footprintjs';

type Ops = Record<string, unknown>;

/** Whether a concrete candidate value satisfies EVERY operator on one key. */
function satisfies(value: unknown, ops: Ops): boolean {
  for (const [op, target] of Object.entries(ops)) {
    switch (op) {
      case 'eq':
        if (value !== target) return false;
        break;
      case 'ne':
        if (value === target) return false;
        break;
      case 'in':
        if (!Array.isArray(target) || !target.includes(value)) return false;
        break;
      case 'notIn':
        if (Array.isArray(target) && target.includes(value)) return false;
        break;
      // Use the SAME raw comparison footprint's evaluator uses (`a > t`, JS
      // coercion and all) — so "no candidate satisfies" is a proof against the
      // real runtime, never a false positive from a stricter type rule.
      case 'gt':
        if (!((value as never) > (target as never))) return false;
        break;
      case 'gte':
        if (!((value as never) >= (target as never))) return false;
        break;
      case 'lt':
        if (!((value as never) < (target as never))) return false;
        break;
      case 'lte':
        if (!((value as never) <= (target as never))) return false;
        break;
      // Unknown operators are the compiler's job to reject — treat as neutral.
    }
  }
  return true;
}

/** A definite, provable contradiction among one key's operators, or null. */
export function unsatisfiableReason(ops: Ops): string | null {
  // An empty allow-set can never match any value.
  if (Array.isArray(ops['in']) && (ops['in'] as unknown[]).length === 0) {
    return 'in: [] can never match any value';
  }

  // Numeric range inversion: lower bound above (or equal-and-exclusive to) upper.
  const has = (k: string): boolean => Object.hasOwn(ops, k);
  const asNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);
  const lo = has('gt')
    ? { v: ops['gt'], inclusive: false }
    : has('gte')
      ? { v: ops['gte'], inclusive: true }
      : null;
  const hi = has('lt')
    ? { v: ops['lt'], inclusive: false }
    : has('lte')
      ? { v: ops['lte'], inclusive: true }
      : null;
  if (lo && hi) {
    const l = asNum(lo.v);
    const h = asNum(hi.v);
    if (l !== null && h !== null) {
      if (l > h) return `lower bound ${l} is above upper bound ${h}`;
      if (l === h && !(lo.inclusive && hi.inclusive)) {
        return `bounds around ${l} exclude every value`;
      }
    }
  }

  // When a finite candidate set exists (an exact eq, or an `in` allow-list),
  // the answer is fully decidable: test each candidate against all operators.
  const candidates: unknown[] = [];
  if (has('eq')) candidates.push(ops['eq']);
  if (Array.isArray(ops['in'])) candidates.push(...(ops['in'] as unknown[]));
  if (candidates.length > 0 && !candidates.some((value) => satisfies(value, ops))) {
    return 'no value satisfies all of its operators at once';
  }

  return null;
}

/** Every key of a composed guard whose operators provably contradict. */
export function unsatisfiableKeys(guard: WhereFilter | undefined): { key: string; reason: string }[] {
  if (!guard) return [];
  const out: { key: string; reason: string }[] = [];
  for (const [key, ops] of Object.entries(guard)) {
    if (ops && typeof ops === 'object' && !Array.isArray(ops)) {
      const reason = unsatisfiableReason(ops as Ops);
      if (reason) out.push({ key, reason });
    }
  }
  return out;
}
