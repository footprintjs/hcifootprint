/**
 * The VERIFY CONTRACT — the app's own answer to "did that actually happen?".
 *
 * Until now a fire that ran to completion settled as 'performed', because
 * running to completion is genuinely all the library could observe. The field
 * found the gap the hard way: a radio fire returned 'performed' while nothing
 * got selected, and a wizard's next-button returned 'performed' while the
 * button it clicked was disabled. The agent looped five times — correctly, on
 * the information it was given. The integration's cure was ~60 lines of
 * before/after DOM signature comparison per action, outside the library.
 *
 * So the app declares the check itself, once, next to the action:
 *
 *   verify: { 'wizard.recipe': { ne: '' } }     // over projected state
 *   verify: () => document.querySelector('[aria-checked=true]') !== null
 *
 * It is evaluated at SETTLEMENT — the moment a fire would otherwise come to
 * rest as a success — and it can only ever move that word to 'refused'. An
 * existing word, not a new one: 0.4/0.5 consumers already branch on it.
 *
 * THE HONESTY CALCULUS is asymmetric on purpose, and this module is where it
 * lives. A REFUSAL needs proof: one false conjunct proves a conjunction false,
 * whatever the unknown keys hold. A CONFIRMATION needs everything: a filter
 * whose evaluable half passed while a key stayed unknown has not been checked,
 * so it reports 'unevaluable' rather than laundering a partial pass into a
 * verified fact. A predicate that THROWS is unevaluable for the same reason —
 * a wrong rejection is worse than a miss, because it blocks an action the app
 * would have accepted and the caller has no appeal.
 */
import type { WhereFilter } from 'footprintjs';
import type { FilterCondition } from 'footprintjs/advanced';
import type { VerifyContract, VerifyFailure } from '../atom/types.js';

/**
 * What a settled fire's verify contract said. 'none' = nothing was declared, so
 * the settlement carries no verdict at all — silence, not a passing grade.
 */
export type VerifyCheck =
  | { verdict: 'none' }
  | { verdict: 'held' }
  | { verdict: 'unevaluable' }
  | { verdict: 'failed'; failure: VerifyFailure };

/**
 * The authored sentence a refusal carries. Names the contract and says who
 * answered — the app did, about its own state — so a reader is never left
 * guessing whether the library invented the refusal.
 *
 * Kept inside the wire's 200-character cap on purpose: it crosses to a model
 * through `errorText`, and a teaching sentence chopped mid-clause teaches
 * nothing. Bounded here, where an author can see the budget.
 */
export const VERIFY_FAILED_EXPLANATION =
  'This action declares a verify contract — a condition the app itself said must hold once the ' +
  'action had settled. It did not hold: the app was asked whether this happened, and answered no.';

/**
 * What an evaluated declarative filter PROVES, under the asymmetry above.
 * Shared with `enabledWhen`, which asks the same question in the same direction
 * (a control is greyed out only when the app proved it, never when a key is
 * merely missing).
 */
export function filterVerdict(evaluation: { matched: boolean; unevaluable: string[] }): 'held' | 'failed' | 'unevaluable' {
  if (!evaluation.matched) return 'failed'; // one false conjunct is a proof, unknowns and all
  return evaluation.unevaluable.length > 0 ? 'unevaluable' : 'held';
}

/**
 * Ask the contract. `evaluate` is the session's own guard evaluator (one filter
 * evaluator for the whole library, honesty split included) and `stateSnapshot`
 * is read LAZILY — a predicate gets a detached copy, never the live state every
 * in-flight read is borrowing.
 */
export function checkVerify(
  verify: VerifyContract | undefined,
  evaluate: (filter: WhereFilter) => { matched: boolean; conditions: FilterCondition[]; unevaluable: string[] },
  stateSnapshot: () => Record<string, unknown>,
  warn: (message: string) => void,
): VerifyCheck {
  if (verify === undefined) return { verdict: 'none' };

  if (typeof verify === 'function') {
    let answer: unknown;
    try {
      answer = verify(stateSnapshot());
    } catch (error) {
      // Isolated like every consumer callback in this library (the recorder
      // rule) — and unevaluable rather than refused, because a predicate that
      // blew up said nothing about whether the action happened.
      warn(
        `hcifootprint: a verify predicate threw: ${String(error)} — the settlement reports ` +
          `'unevaluable' rather than refusing an action that may well have happened.`,
      );
      return { verdict: 'unevaluable' };
    }
    if (answer === true) return { verdict: 'held' };
    if (answer === false) return failed();
    // Not an answer to the question asked. An async predicate is the likely
    // cause and the dangerous one: a pending Promise is truthy, so reading it
    // as a pass would certify every action forever.
    warn(
      `hcifootprint: a verify predicate returned ${typeName(answer)} instead of true or false — ` +
        `the settlement reports 'unevaluable'. A verify predicate must answer synchronously.`,
    );
    return { verdict: 'unevaluable' };
  }

  const evaluation = evaluate(verify);
  const verdict = filterVerdict(evaluation);
  if (verdict !== 'failed') return { verdict };
  // Copy the condition objects: the same shapes ride guard evidence elsewhere,
  // and a consumer annotating a settlement must never rewrite the trace.
  return failed(evaluation.conditions.filter((condition) => !condition.result).map((condition) => ({ ...condition })));
}

/**
 * The structured refusal. `evidence` is present only for the declarative form:
 * a predicate is opaque by construction — it answers yes or no and hands over
 * no conditions — so naming one would be a guess about code the library cannot
 * see.
 */
function failed(evidence?: FilterCondition[]): VerifyCheck {
  return {
    verdict: 'failed',
    failure: {
      reason: 'VERIFY_FAILED',
      explanation: VERIFY_FAILED_EXPLANATION,
      ...(evidence && evidence.length > 0 ? { evidence } : {}),
    },
  };
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (value instanceof Promise) return 'a Promise';
  return `a ${typeof value}`;
}
