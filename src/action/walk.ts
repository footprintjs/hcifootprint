import type { Principal } from '../atom/types.js';
import { actionDefinitionOf } from './definition.js';
import type {
  ActionDefinitionRecord,
  ActionDefinitionRef,
  ActionRuntime,
  ActionTransitionRef,
  DefinedAction,
  PrincipalActionPort,
} from './types.js';

/**
 * LAYER 2 — the walk: many actions as one correlated route.
 *
 * A model that must return to its orchestrator between every screen action
 * spends a round trip per step re-deciding things it already decided. A PLAN
 * is the alternative: a declared route, admitted up front, executed step by
 * step with no model call between steps — and a MANIFEST afterwards, because
 * a real screen action cannot be rolled back, so partial execution must be
 * legible rather than summarized as "failed".
 *
 * The layering law this file lives under: L2 introduces NO primitive L1
 * lacks. A plan step resolves to an L1 offer and invokes it through the same
 * principal port a single call would use; the manifest rows hold L1
 * transition refs. The only genuinely new thing here is the WALK IDENTITY —
 * a correlation, not a concept.
 *
 * Cardinalities, stated because unstated ones get implemented wrong:
 * one turn → one walk → MANY plans (a refused step means the caller replans
 * under the same walk), and each plan → many transitions. Lineage points one
 * way: the walk holds its manifests; no transition knows its walk.
 *
 * BATCHED IS NOT BLIND. Admission checks what is checkable from declarations
 * alone, before anything runs. Execution re-derives every step's offer at its
 * own turn — the plan was made from what was true at step zero, and step one
 * can invalidate step two. A guard that stopped holding is a refused ROW,
 * never a skipped check.
 */

/** The walk's own identity — a correlation handle, deliberately nothing more. */
export interface ActionWalkRef {
  readonly kind: 'action-walk';
  readonly walkId: string;
}

/**
 * One planned step. `carry` and `input` are exclusive: a step's payload is
 * either stated at plan time or carried from a prior step's declared output —
 * never both, and never guessed.
 */
export interface ActionPlanStep {
  readonly action: DefinedAction;
  /** Disambiguates when one definition has several live bindings. Ambiguity
   *  without this is a refusal, never a guess. */
  readonly instance?: string;
  /** The payload for an open offer, known at plan time. */
  readonly input?: unknown;
  /**
   * Carry a PRIOR step's produced value as this step's payload — admitted
   * only when the producer's definition DECLARES `produces`. The gate is the
   * declaration, not the value: a carried value must come from a declared
   * output, never from whatever a handler happened to return. This is the
   * narrow middle between "no chaining" (which guts planning — the plans
   * worth batching are exactly the chained ones) and free references (a
   * dataflow language by the back door).
   */
  readonly carry?: { readonly from: number };
}

export type ActionPlanRowStatus = 'ran' | 'refused' | 'never-reached';

/** One step's fate. `ran` means a transition exists — read ITS statuses for
 *  how the invocation and effect went; the row does not repeat them. */
export interface ActionPlanRow {
  readonly step: number;
  readonly definition: ActionDefinitionRef;
  readonly status: ActionPlanRowStatus;
  readonly transition?: ActionTransitionRef;
  /** The teaching sentence, verbatim, when the step never became a transition. */
  readonly refusal?: string;
}

export interface ActionPlanManifest {
  readonly walk: ActionWalkRef;
  readonly rows: readonly ActionPlanRow[];
  /** Every row ran AND performed. A manifest that said "failed" while the
   *  screen sits two steps along would be worse than no batching. */
  readonly completed: boolean;
  readonly counts: {
    readonly planned: number;
    readonly ran: number;
    readonly refused: number;
    readonly neverReached: number;
  };
}

export interface ActionWalk {
  readonly ref: ActionWalkRef;
  /**
   * Admit and execute one plan. Admission failures THROW before anything
   * runs — nothing happened, so an exception is honest. Execution failures
   * never throw: they are manifest rows, because by then something DID
   * happen and the caller needs the ledger, not a stack trace.
   */
  run(steps: readonly ActionPlanStep[]): Promise<ActionPlanManifest>;
  /** Every manifest this walk has produced, in order — the route actually
   *  taken, which is not the route anybody planned. */
  record(): {
    readonly ref: ActionWalkRef;
    readonly manifests: readonly ActionPlanManifest[];
  };
}

/**
 * Whether the walking principal OWNS a declared decision. Two vocabularies
 * meet here — `Principal` says who is reading ('user' | 'agent' | 'system' |
 * 'unknown'), `decisionOwner` says whose call the choice is ('human' |
 * 'agent' | 'either') — and the mapping is stated rather than assumed:
 * 'user' owns human decisions, 'agent' owns agent decisions, 'either' admits
 * both, and 'system'/'unknown' own no decision at all. An agent may not
 * pre-plan a decision it does not own; that is refused at plan time, with
 * the reason, rather than at step three.
 */
function ownsDecision(
  principal: Principal,
  owner: 'human' | 'agent' | 'either',
): boolean {
  if (owner === 'either') return principal === 'user' || principal === 'agent';
  if (owner === 'human') return principal === 'user';
  return principal === 'agent';
}

let nextWalk = 0;

export function beginWalk(
  runtime: ActionRuntime,
  principal: Principal,
  options: { readonly walkId?: string } = {},
): ActionWalk {
  const port: PrincipalActionPort = runtime.forPrincipal(principal);
  nextWalk += 1;
  const ref: ActionWalkRef = Object.freeze({
    kind: 'action-walk' as const,
    walkId: options.walkId ?? `walk#${String(nextWalk)}`,
  });
  const manifests: ActionPlanManifest[] = [];

  /** Admission — declaration-only checks, atomically before any execution. */
  function admit(
    steps: readonly ActionPlanStep[],
  ): readonly ActionDefinitionRecord[] {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new TypeError(
        'hcifootprint: walk.run() needs at least one planned step — an empty plan is not a shorter walk.',
      );
    }
    return steps.map((step, index) => {
      const record = actionDefinitionOf(step.action);
      if (record === undefined) {
        throw new TypeError(
          `hcifootprint: plan step ${String(index)} is not a defined action — pass the callable defineAction() returned, exactly; a plan never rebuilds one from a name.`,
        );
      }
      const contract = record.contract as {
        readonly principal?: {
          readonly decisionOwner?: 'human' | 'agent' | 'either';
          readonly mayInvoke?: readonly string[];
        };
        readonly produces?: { readonly kind: string };
      };
      const owner = contract.principal?.decisionOwner;
      if (owner !== undefined && !ownsDecision(principal, owner)) {
        throw new Error(
          `hcifootprint: plan step ${String(index)} invokes '${record.ref.definitionId}', whose decisionOwner is '${owner}' — principal '${principal}' may not pre-plan a decision it does not own. Put that step to its owner instead of batching past them.`,
        );
      }
      const may = contract.principal?.mayInvoke;
      const actor =
        principal === 'user' ? 'human' : (principal as 'agent' | 'system');
      if (may !== undefined && !may.includes(actor)) {
        throw new Error(
          `hcifootprint: plan step ${String(index)} invokes '${record.ref.definitionId}', which '${principal}' may never invoke (mayInvoke: ${may.join(', ')}). Refused at plan time rather than at step ${String(index)} of a half-executed screen.`,
        );
      }
      if (step.carry !== undefined) {
        if (step.input !== undefined) {
          throw new TypeError(
            `hcifootprint: plan step ${String(index)} declares both input and carry — a payload is stated or carried, never both.`,
          );
        }
        const from = step.carry.from;
        if (!Number.isInteger(from) || from < 0 || from >= index) {
          throw new TypeError(
            `hcifootprint: plan step ${String(index)} carries from step ${String(from)}, which is not an EARLIER step of this plan — a walk only moves forward.`,
          );
        }
        const producer = actionDefinitionOf(steps[from]!.action);
        const declares =
          producer !== undefined &&
          (producer.contract as { readonly produces?: unknown }).produces !==
            undefined;
        if (!declares) {
          throw new Error(
            `hcifootprint: plan step ${String(index)} carries step ${String(from)}'s output, but '${producer?.ref.definitionId ?? 'that step'}' declares no produces — a carried value must come from a declared output, never from whatever a handler happened to return. Declare produces on the producer, or state the input.`,
          );
        }
      }
      return record;
    });
  }

  async function run(
    steps: readonly ActionPlanStep[],
  ): Promise<ActionPlanManifest> {
    const records = admit(steps);
    const rows: ActionPlanRow[] = [];
    let stopped = false;

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]!;
      const record = records[index]!;
      const base = { step: index, definition: record.ref };
      if (stopped) {
        rows.push(Object.freeze({ ...base, status: 'never-reached' as const }));
        continue;
      }
      // Re-derived at THIS step's turn, never trusted from plan time: offers
      // are the guard surface, and only what holds NOW is served.
      const offered = port
        .offers(step.action)
        .filter(
          (offer) =>
            step.instance === undefined ||
            offer.ref.binding.instance === step.instance,
        );
      if (offered.length === 0) {
        rows.push(
          Object.freeze({
            ...base,
            status: 'refused' as const,
            refusal: `no offer is currently served for '${record.ref.definitionId}'${step.instance === undefined ? '' : ` (instance '${step.instance}')`} to principal '${principal}' — its guard does not hold, or no control is connected. The plan stopped here; re-read and replan.`,
          }),
        );
        stopped = true;
        continue;
      }
      if (offered.length > 1) {
        rows.push(
          Object.freeze({
            ...base,
            status: 'refused' as const,
            refusal: `${String(offered.length)} live bindings serve '${record.ref.definitionId}' (instances: ${offered.map((o) => o.ref.binding.instance ?? '(none)').join(', ')}) — name the instance; a plan never guesses which control was meant.`,
          }),
        );
        stopped = true;
        continue;
      }
      const offer = offered[0]!;
      const payload =
        step.carry !== undefined
          ? rows[step.carry.from]?.transition === undefined
            ? undefined
            : runtime.transitionFor(rows[step.carry.from]!.transition!)
                ?.produced
          : step.input;
      try {
        if (offer.inputMode === 'open' && payload === undefined) {
          throw new Error(
            `hcifootprint: '${record.ref.definitionId}' serves an OPEN offer needing one payload, and this step has none — state the input or carry a declared output.`,
          );
        }
        if (offer.inputMode !== 'open' && (step.input !== undefined || step.carry !== undefined)) {
          throw new Error(
            `hcifootprint: '${record.ref.definitionId}' serves a '${offer.inputMode}' offer, which takes no caller payload — ${offer.inputMode === 'bound' ? 'bound offers capture their input when minted' : 'inputless offers take nothing'}; drop this step's input.`,
          );
        }
        const invocation =
          offer.inputMode === 'open'
            ? port.invoke(offer as never, payload)
            : port.invoke(offer as never);
        const transition = invocation.transition;
        try {
          await invocation.whenInvoked;
        } catch {
          // The transition itself records the failure; the row only says the
          // step RAN and points at it — one owner per fact.
        }
        rows.push(
          Object.freeze({ ...base, status: 'ran' as const, transition }),
        );
        const outcome = runtime.transitionFor(transition)?.invocationStatus;
        if (outcome !== 'performed') stopped = true;
      } catch (error) {
        // Never became a transition — a refusal in L1's own words (stale
        // offer, payload law, principal verdict). The sentence IS the value.
        rows.push(
          Object.freeze({
            ...base,
            status: 'refused' as const,
            refusal: error instanceof Error ? error.message : String(error),
          }),
        );
        stopped = true;
      }
    }

    const ran = rows.filter((row) => row.status === 'ran');
    const manifest: ActionPlanManifest = Object.freeze({
      walk: ref,
      rows: Object.freeze(rows),
      completed:
        rows.length > 0 &&
        rows.every(
          (row) =>
            row.status === 'ran' &&
            runtime.transitionFor(row.transition!)?.invocationStatus ===
              'performed',
        ),
      counts: Object.freeze({
        planned: steps.length,
        ran: ran.length,
        refused: rows.filter((row) => row.status === 'refused').length,
        neverReached: rows.filter((row) => row.status === 'never-reached')
          .length,
      }),
    });
    manifests.push(manifest);
    return manifest;
  }

  return Object.freeze({
    ref,
    run,
    record: () =>
      Object.freeze({ ref, manifests: Object.freeze([...manifests]) }),
  });
}
