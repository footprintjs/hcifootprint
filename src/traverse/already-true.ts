/**
 * ALREADY TRUE — an action whose effect the world already holds.
 *
 * The failure this module exists to end was reported from a real recorded run
 * by a consumer integration. An agent pressed a control while the thing that
 * control does was ALREADY the case (it asked to open a domain view while it
 * was already inside that domain). The app's store publishes on CHANGE, which
 * is what a store does, so setting the value it already held notified nobody
 * and no `updateState()` ever ran. `fire()` had already decided — synchronously,
 * on the strength of "this action declares writes and this session has a state
 * tap" — that it was waiting for a state report, and nothing in this library
 * holds a clock over that decision. The settlement stayed open for the life of
 * the session, `did_it_work` could only ever answer 'still-pending', and the
 * model read "still pending" as "the app is still working". It waited,
 * re-checked, waited, and spent fifteen of its thirty steps on an outcome that
 * could never arrive.
 *
 * THE RULE, in one sentence, and it is the sentence pinned in every home:
 *
 *   An effect that is already true is not a pending one. When an action's
 *   declarative verify contract covers every key it declares it writes and
 *   already holds at fire time, the fire never waits for a state report that
 *   nothing will send — it settles on its own handler and answers `alreadyTrue`
 *
 * WHICH DECLARATION THIS READS, AND WHY IT IS THE ONLY ONE THAT CAN.
 * `Effect.writes` is KEY NAMES ONLY, by stated law (`src/atom/types.ts`): the
 * library never learns the value an action would set, and it does not read your
 * handler to find out. So "the write nets out" is a fact `writes` alone can
 * never establish, and a rule built on it would have to INVENT the value it
 * compared against. {@link VerifyContract} in its declarative {@link WhereFilter}
 * form is the one declaration that carries VALUES — the app's own statement of
 * what must hold once the action has run — so it is what this asks. An action
 * that declares `writes` and no declarative verify behaves exactly as it always
 * did: nothing is guessed on its behalf, and the correction is one line of
 * declaration next to the action.
 *
 * FIVE CONDITIONS, and every one of them is a refusal to over-claim:
 *
 * 1. The action declares at least one `writes` key. An action that declares
 *    NONE is structurally exempt and must stay so — it never joined the state
 *    rail in the first place (`fire()` commits it synchronously and settles it
 *    on its handler), so it cannot hang, and marking it would be a word about a
 *    fate it does not have.
 * 2. The verify contract is the DECLARATIVE form. A predicate is opaque by
 *    construction — it answers yes or no about code this library cannot see —
 *    and asking it before the action ran would be asking a postcondition a
 *    question it was never written to answer.
 * 3. The contract NAMES every declared write. This is the partial boundary, and
 *    it is exact: an action that writes `view.domain` and `view.tab` under a
 *    contract that constrains only the first has a declared effect the contract
 *    says nothing about, so nothing here may call it already true.
 * 4. The contract HOLDS right now, evaluably — `filterVerdict` === 'held'. A
 *    'failed' verdict is the ordinary case (there is real work to do). An
 *    'unevaluable' one is honest absence: a key the state view has never held
 *    is a key this library did not read, and an unread key is never evidence.
 * 5. If the action declares `effect.navigatesTo`, the session is ALREADY on
 *    that node. Page motion is part of the effect, and an effect that is only
 *    partly already true is not already true.
 *
 * WHAT IT CHANGES, AND WHAT IT DELIBERATELY DOES NOT. The handler still runs:
 * the library does not decide on the app's behalf that a press was pointless,
 * and an app that hangs analytics or focus off that control keeps them. What
 * changes is only WHAT THE FIRE WAITS ON — the handler rail, which always
 * answers, instead of the state rail, which here cannot. The fire therefore
 * never joins the state-report queue, which is the second half of the fix: a
 * phantom sitting in that queue would let the NEXT real report settle it by
 * FIFO, certifying an agent's no-op as the verified cause of motion somebody
 * else performed. That is the same reasoning the allowed-unmaterialized fire
 * already runs on, said about a different cause.
 */
import type { WhereFilter } from 'footprintjs';
import type { FilterCondition } from 'footprintjs/advanced';
import type { Affordance } from '../atom/types.js';
import { filterVerdict } from './verify.js';

/**
 * The conditions that ALREADY hold, or `undefined` when this fire is an
 * ordinary one.
 *
 * Presence is the marker and the value is the evidence, deliberately in one
 * field: a boolean beside a list would be two names for one fact, and the
 * answer grammar's first law is that a fate gets one word. The array is never
 * empty — condition 3 above cannot be met by a contract that names nothing.
 *
 * @param aff       the action about to fire, as the spec declares it
 * @param evaluate  the session's own guard evaluator — ONE filter evaluator for
 *                  the whole library, honesty split included, so this can never
 *                  answer a question differently from the guard that offered
 *                  the control
 * @param node      the page the walker stands on, for condition 5
 */
export function alreadyTrueNow(
  aff: Affordance,
  evaluate: (filter: WhereFilter) => {
    matched: boolean;
    conditions: FilterCondition[];
    unevaluable: string[];
  },
  node: string,
): FilterCondition[] | undefined {
  const writes = aff.effect?.writes ?? [];
  if (writes.length === 0) return undefined; // condition 1
  const verify = aff.verify;
  if (verify === undefined || typeof verify === 'function') return undefined; // condition 2
  const named = new Set(Object.keys(verify));
  if (!writes.every((key) => named.has(key))) return undefined; // condition 3
  const evaluation = evaluate(verify);
  if (filterVerdict(evaluation) !== 'held') return undefined; // condition 4
  if (aff.effect?.navigatesTo !== undefined && aff.effect.navigatesTo !== node) return undefined; // condition 5
  // Copy the condition objects: these same shapes ride guard evidence
  // elsewhere, and a consumer annotating a result must never rewrite the trace.
  return evaluation.conditions.map((condition) => ({ ...condition }));
}
