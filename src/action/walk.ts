import type { Principal } from '../atom/types.js';
import { actionDefinitionOf } from './definition.js';
import { thrownMessage } from './describe-thrown.js';
import type {
  ActionDefinitionRecord,
  ActionDefinitionRef,
  ActionInvocation,
  ActionOffer,
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

/** Independent calls selected by the caller; one item cannot consume another
 * item's output. Node labels alone never establish parallel safety. */
export type ActionParallelStep = Omit<ActionPlanStep, 'carry'> & {
  readonly carry?: never;
};

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

/**
 * A person (or system) stopping a plan, WITH the reason — because a break
 * without a reason is a guard failure wearing a trench coat: the model
 * replans blind and probably replans the same thing. The reason is what
 * turns an interruption into a course correction.
 */
export interface ActionWalkInterruption {
  readonly by: Principal;
  readonly reason: string;
  /** The step the break took effect BEFORE. The in-flight step always
   *  finishes — an L1 transition is atomic, and tearing one mid-flight
   *  would violate settlement law. L2 stops future steps; L1 transitions
   *  are never torn. */
  readonly beforeStep: number;
}

export interface ActionPlanManifest {
  readonly walk: ActionWalkRef;
  readonly rows: readonly ActionPlanRow[];
  /** Absent on existing sequential manifests. The effective invocation limit,
   * not a claim of isolated UI contexts or verified effects. */
  readonly execution?: {
    readonly mode: 'parallel';
    readonly concurrency: number;
  };
  /** Present when a person stopped this plan — distinct from a refused row,
   *  because "the plan was wrong" and "the person knows something the plan
   *  didn't" must be treated completely differently by whoever replans. */
  readonly interrupted?: ActionWalkInterruption;
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
  run(
    steps: readonly ActionPlanStep[],
    options?: {
      /** Called as each row lands — the FE's live loop: render the batch
       *  step by step, and put the stop control beside it, because the
       *  moment you can SEE a batch running is the moment you need to be
       *  able to stop it. Isolated: a listener that throws never breaks
       *  the walk (the recorder law, applied here). */
      readonly onRow?: (row: ActionPlanRow) => void;
    },
  ): Promise<ActionPlanManifest>;
  /**
   * Stop this walk's plan at the next step boundary, with the reason on the
   * record. Arms the walk: consumed by the plan in flight before its next
   * step, or by the next run() at step zero — the person's intent stands
   * either way. Returns false when already armed. The reason is REQUIRED:
   * a silent break is the abandonment this family refuses.
   */
  interrupt(input: { readonly by: Principal; readonly reason: string }): boolean;
  /** Every manifest this walk has produced, in order — the route actually
   *  taken, which is not the route anybody planned. */
  record(): {
    readonly ref: ActionWalkRef;
    readonly manifests: readonly ActionPlanManifest[];
  };
}

/** The factory's extended surface. Existing structural ActionWalk values
 * remain valid without implementing the new operation. */
export interface ActionWalkWithParallel extends ActionWalk {
  /** Run caller-selected independent actions with bounded asynchronous overlap.
   * Admission failures throw before dispatch. Individual refusals/failures do
   * not stop independent queued items; interruption stops only undispatched
   * items and waits for running handlers. Completion concerns whenInvoked,
   * never automatic effect verification. */
  parallel(
    steps: readonly ActionParallelStep[],
    options?: {
      /** Defaults to the number of items. Must be a positive safe integer. */
      readonly concurrency?: number;
      /** Completion order; the final manifest retains input order. */
      readonly onRow?: (row: ActionPlanRow) => void;
    },
  ): Promise<ActionPlanManifest>;
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

/** Per-RUNTIME, not module-global: two runtimes both minting walk#1 is a
 *  needless ambiguity in merged logs. Ids are correlation handles, never
 *  capabilities, so this is about legibility, not security. */
const walkCounters = new WeakMap<ActionRuntime, number>();

export function beginWalk(
  runtime: ActionRuntime,
  principal: Principal,
  options: { readonly walkId?: string } = {},
): ActionWalkWithParallel {
  const port: PrincipalActionPort = runtime.forPrincipal(principal);
  const next = (walkCounters.get(runtime) ?? 0) + 1;
  walkCounters.set(runtime, next);
  const ref: ActionWalkRef = Object.freeze({
    kind: 'action-walk' as const,
    walkId: options.walkId ?? `walk#${String(next)}`,
  });
  const manifests: ActionPlanManifest[] = [];
  let armed: { readonly by: Principal; readonly reason: string } | undefined;
  let activeRuns = 0;
  let parallelActive = false;

  function interrupt(input: {
    readonly by: Principal;
    readonly reason: string;
  }): boolean {
    if (
      input === null ||
      typeof input !== 'object' ||
      typeof input.reason !== 'string' ||
      input.reason.trim().length === 0
    ) {
      throw new TypeError(
        "hcifootprint: walk.interrupt() needs a non-empty reason — a break without a reason leaves the model replanning blind, which is how it replans the same thing. Say why: { by: 'user', reason: 'wrong array — I meant NORTHWIND-01' }.",
      );
    }
    if (typeof input.by !== 'string' || input.by.trim().length === 0) {
      throw new TypeError(
        'hcifootprint: walk.interrupt() needs `by` — who stopped this is part of the record.',
      );
    }
    if (armed !== undefined) return false;
    armed = Object.freeze({ by: input.by, reason: input.reason });
    return true;
  }

  /** Admission — declaration-only checks, atomically before any execution. */
  function admit(
    steps: readonly ActionPlanStep[],
    operation: 'run' | 'parallel' = 'run',
  ): readonly ActionDefinitionRecord[] {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new TypeError(
        `hcifootprint: walk.${operation}() needs at least one planned step — an empty plan is not a shorter walk.`,
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

  function notify(
    row: ActionPlanRow,
    options: { readonly onRow?: (row: ActionPlanRow) => void },
  ): void {
    try { options.onRow?.(row); } catch { /* observation never changes execution */ }
  }

  function offerFor(
    step: ActionPlanStep,
    record: ActionDefinitionRecord,
    guidance: string,
  ): { readonly offer: ActionOffer } | { readonly refusal: string } {
    const offered = port.offers(step.action).filter(
      (offer) => step.instance === undefined || offer.ref.binding.instance === step.instance,
    );
    if (offered.length === 0) {
      return { refusal: `no offer is currently served for '${record.ref.definitionId}'${step.instance === undefined ? '' : ` (instance '${step.instance}')`} to principal '${principal}' — its guard does not hold, or no control is connected. ${guidance}` };
    }
    if (offered.length > 1) {
      return { refusal: `${String(offered.length)} live bindings serve '${record.ref.definitionId}' (instances: ${offered.map((o) => o.ref.binding.instance ?? '(none)').join(', ')}) — name the instance; a plan never guesses which control was meant.` };
    }
    return { offer: offered[0]! };
  }

  function invokeStep(
    base: { readonly step: number; readonly definition: ActionDefinitionRef },
    step: ActionPlanStep,
    offer: ActionOffer,
    payload: unknown,
  ): { readonly invocation: ActionInvocation<unknown> } | { readonly row: ActionPlanRow } {
    try {
      if (offer.inputMode === 'open' && payload === undefined) {
        throw new Error(
          `hcifootprint: '${base.definition.definitionId}' serves an OPEN offer needing one payload, and this step has none — state the input or carry a declared output.`,
        );
      }
      if (offer.inputMode !== 'open' && (step.input !== undefined || step.carry !== undefined)) {
        throw new Error(
          `hcifootprint: '${base.definition.definitionId}' serves a '${offer.inputMode}' offer, which takes no caller payload — ${offer.inputMode === 'bound' ? 'bound offers capture their input when minted' : 'inputless offers take nothing'}; drop this step's input.`,
        );
      }
      const invocation: ActionInvocation<unknown> = offer.inputMode === 'open'
        ? port.invoke(offer, payload)
        : port.invoke(offer);
      return { invocation };
    } catch (error) {
      return {
        row: Object.freeze({ ...base, status: 'refused', refusal: thrownMessage(error) }),
      };
    }
  }

  function finish(
    rows: ActionPlanRow[],
    planned: number,
    completed: boolean,
    interruption?: ActionWalkInterruption,
    execution?: ActionPlanManifest['execution'],
  ): ActionPlanManifest {
    const manifest: ActionPlanManifest = Object.freeze({
      walk: ref,
      rows: Object.freeze(rows),
      ...(execution !== undefined ? { execution } : {}),
      ...(interruption !== undefined ? { interrupted: interruption } : {}),
      completed,
      counts: Object.freeze({
        planned,
        ran: rows.filter((row) => row.status === 'ran').length,
        refused: rows.filter((row) => row.status === 'refused').length,
        neverReached: rows.filter((row) => row.status === 'never-reached').length,
      }),
    });
    manifests.push(manifest);
    return manifest;
  }

  async function run(
    steps: readonly ActionPlanStep[],
    options: {
      readonly onRow?: (row: ActionPlanRow) => void;
    } = {},
  ): Promise<ActionPlanManifest> {
    if (parallelActive) throw new Error('hcifootprint: this walk has an active parallel plan; await it before starting another plan.');
    activeRuns++;
    try {
      const records = admit(steps);
      const rows: ActionPlanRow[] = [];
      let stopped = false;
      let interruption: ActionWalkInterruption | undefined;
      const land = (row: ActionPlanRow): void => {
        rows.push(row);
        notify(row, options);
      };

      for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index]!;
        const record = records[index]!;
        const base = { step: index, definition: record.ref };
        // THE BREAK DOOR — checked at every step boundary, step zero included.
        // The in-flight step always finished before we got here, so nothing is
        // torn; the armed intent is consumed exactly once.
        if (armed !== undefined && interruption === undefined && !stopped) {
          interruption = Object.freeze({ ...armed, beforeStep: index });
          armed = undefined;
          stopped = true;
        }
        if (stopped) {
          land(Object.freeze({ ...base, status: 'never-reached' as const }));
          continue;
        }
        // Re-derived at THIS step's turn, never trusted from plan time: offers
        // are the guard surface, and only what holds NOW is served.
        const selected = offerFor(step, record, 'The plan stopped here; re-read and replan.');
        if ('refusal' in selected) {
          land(
            Object.freeze({
              ...base,
              status: 'refused' as const,
              refusal: selected.refusal,
            }),
          );
          stopped = true;
          continue;
        }
        // A carried step is reached only when every earlier row RAN and
        // performed (anything else stops the walk), and `carry.from` is an
        // earlier step (admit) — so the producer's row always has a transition.
        const payload =
          step.carry !== undefined
            ? runtime.transitionFor(rows[step.carry.from]!.transition!)?.produced
            : step.input;
        const attempt = invokeStep(base, step, selected.offer, payload);
        if ('row' in attempt) {
          land(attempt.row);
          stopped = true;
          continue;
        }
        try { await attempt.invocation.whenInvoked; }
        catch { /* the transition records how this invocation came to rest */ }
        const transition = attempt.invocation.transition;
        land(Object.freeze({ ...base, status: 'ran', transition }));
        if (runtime.transitionFor(transition)?.invocationStatus !== 'performed') stopped = true;
      }

      return finish(
        rows,
        steps.length,
        rows.length > 0 &&
          rows.every(
            (row) =>
              row.status === 'ran' &&
              runtime.transitionFor(row.transition!)?.invocationStatus ===
                'performed',
          ),
        interruption,
      );
    } finally {
      activeRuns--;
    }
  }

  async function parallel(
    steps: readonly ActionParallelStep[],
    options: { readonly concurrency?: number; readonly onRow?: (row: ActionPlanRow) => void } = {},
  ): Promise<ActionPlanManifest> {
    if (parallelActive || activeRuns > 0) {
      throw new Error('hcifootprint: this walk already has an active plan; await it before starting a parallel plan.');
    }
    parallelActive = true;
    try {
      if (options === null || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('hcifootprint: walk.parallel() options must be a record.');
      }
      const onRow = options.onRow;
      if (onRow !== undefined && typeof onRow !== 'function') {
        throw new TypeError('hcifootprint: walk.parallel() onRow must be a function.');
      }
      if (!Array.isArray(steps) || steps.length === 0) admit(steps, 'parallel');
      // Capture plan structure once. Payload objects keep their existing identity;
      // no schema adapter or copied plan is permitted to transform their values.
      const planned = Array.from(steps, (step) => {
        if (step === null || typeof step !== 'object') {
          throw new TypeError('hcifootprint: walk.parallel() needs a planned action record at every array position.');
        }
        if (step.carry !== undefined) {
          throw new TypeError('hcifootprint: parallel actions cannot carry another item’s output; run dependent steps sequentially.');
        }
        return Object.freeze({ action: step.action, instance: step.instance, input: step.input });
      });
      const records = admit(planned, 'parallel');
      const requested = options.concurrency === undefined ? planned.length : options.concurrency;
      if (!Number.isSafeInteger(requested) || requested <= 0) {
        throw new TypeError('hcifootprint: walk.parallel() concurrency must be a positive safe integer.');
      }
      const concurrency = Math.min(requested, planned.length);
      const observation = Object.freeze({ onRow });
      const rows: ActionPlanRow[] = [];
      let next = 0;
      let performed = true;
      let interruption: ActionWalkInterruption | undefined;
      const land = (row: ActionPlanRow): void => {
        rows[row.step] = row;
        notify(row, observation);
      };
      const stoppedBefore = (index: number): boolean => {
        if (interruption === undefined && armed !== undefined) {
          interruption = Object.freeze({ ...armed, beforeStep: index });
          armed = undefined;
        }
        return interruption !== undefined;
      };
      const worker = async (): Promise<void> => {
        while (next < planned.length) {
          const index = next++;
          const step = planned[index]!;
          const record = records[index]!;
          const base = { step: index, definition: record.ref };
          if (stoppedBefore(index)) {
            performed = false;
            land(Object.freeze({ ...base, status: 'never-reached' }));
            continue;
          }
          try {
            const selected = offerFor(step, record, 'This item was refused; other independent items may still run.');
            // Offer readers are application code and may request a stop. No
            // call has crossed the principal port yet, so this item is queued.
            if (stoppedBefore(index)) {
              performed = false;
              land(Object.freeze({ ...base, status: 'never-reached' }));
              continue;
            }
            if ('refusal' in selected) {
              performed = false;
              land(Object.freeze({ ...base, status: 'refused', refusal: selected.refusal }));
              continue;
            }
            const attempt = invokeStep(base, step, selected.offer, step.input);
            if ('row' in attempt) {
              performed = false;
              land(attempt.row);
              continue;
            }
            let succeeded = false;
            try { succeeded = (await attempt.invocation.whenInvoked).status === 'performed'; }
            catch { /* a minted transition remains a ran row even if waiting fails */ }
            if (!succeeded) performed = false;
            land(Object.freeze({ ...base, status: 'ran', transition: attempt.invocation.transition }));
          } catch (error) {
            performed = false;
            land(stoppedBefore(index)
              ? Object.freeze({ ...base, status: 'never-reached' })
              : Object.freeze({ ...base, status: 'refused', refusal: thrownMessage(error) }));
          }
        }
      };
      await Promise.all(Array.from({ length: concurrency }, worker));
      return finish(rows, planned.length, performed, interruption,
        Object.freeze({ mode: 'parallel', concurrency }));
    } finally {
      parallelActive = false;
    }
  }

  return Object.freeze({
    ref,
    run,
    parallel,
    interrupt,
    record: () =>
      Object.freeze({ ref, manifests: Object.freeze([...manifests]) }),
  });
}
