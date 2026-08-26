/**
 * progress-ledger — one transition's declared stages, observed and closed.
 *
 * Owns the L1 progress subsystem: declared milestones, live observations,
 * and the close that computes UNREPORTED (declared minus observed) — the
 * field that keeps a stage list honest, because three-declared-one-observed
 * must never read like three-declared-three-observed.
 * @internal
 */
import type {
  ActionAbandonmentAuthority,
  ActionBindingRef,
  ActionBindingSnapshot,
  ActionContractActivation,
  ActionDefinitionRecord,
  ActionEffectSettlement,
  ActionInvocation,
  ActionInvocationInput,
  ActionLateSettlement,
  ActionOffer,
  ActionOfferRef,
  ActionProgress,
  ActionProgressSnapshot,
  ActionTransitionRef,
  ActionTransitionSnapshot,
  BindingCoverage,
  DefinedAction,
} from './types.js';
import type { Binding, Principal } from '../atom/types.js';
import { snapshotDeclaration } from './declarations.js';
import type { ActionProgressObservation } from './types.js';
import type { HumanReporting, ReadonlyActionDefinitionContract, ActionInputValidationDisposition, ActionDefinitionRef, ActionLifecycle, ActionInputSource } from './types.js';
import type { BindingRegistration } from '../registry/registry.js';

export interface TransitionProgress {
  readonly channel: ActionProgress;
  readonly lifecycle?: ActionLifecycle;
  snapshot(): ActionProgressSnapshot;
  close(): void;
}

export function createTransitionProgress(
  transition: ActionTransitionRef,
  declaration: NonNullable<
    NonNullable<ReadonlyActionDefinitionContract['settle']>['progress']
  >,
  started: boolean,
  reportInstrumentationError: (error: unknown) => void,
): TransitionProgress {
  const declared = Object.freeze([...declaration.stages]);
  const allowed = new Set(declared);
  const observed: ActionProgressObservation[] = [];
  type ProgressListener = (snapshot: ActionProgressSnapshot) => void;
  const listeners = new Set<ProgressListener>();
  const pendingPublications: Array<{
    readonly snapshot: ActionProgressSnapshot;
    readonly recipients: readonly ProgressListener[];
  }> = [];
  let publishing = false;
  let open = started;
  let current: ActionProgressSnapshot = started
    ? Object.freeze({
        disposition: 'open' as const,
        declared,
        observed: Object.freeze([]) as readonly ActionProgressObservation[],
      })
    : Object.freeze({
        disposition: 'not-started' as const,
        declared,
        observed: Object.freeze([]) as readonly [],
      });

  const report = (error: unknown): void => {
    try {
      reportInstrumentationError(error);
    } catch {
      // A diagnostics sink is instrumentation too; neither rail owns app behavior.
    }
  };
  const deliver = (
    snapshot: ActionProgressSnapshot,
    recipients: readonly ProgressListener[],
  ): void => {
    pendingPublications.push({ snapshot, recipients });
    if (publishing) return;
    publishing = true;
    try {
      for (let index = 0; index < pendingPublications.length; index += 1) {
        const publication = pendingPublications[index]!;
        for (const listener of publication.recipients) {
          try {
            listener(publication.snapshot);
          } catch (error) {
            report(error);
          }
        }
      }
    } finally {
      pendingPublications.length = 0;
      publishing = false;
    }
  };
  const publish = (snapshot: ActionProgressSnapshot): void => {
    deliver(snapshot, [...listeners]);
  };
  const channel: ActionProgress = Object.freeze({
    snapshot: () => current,
    subscribe: (listener: (snapshot: ActionProgressSnapshot) => void) => {
      if (typeof listener !== 'function') {
        throw new TypeError(
          'hcifootprint: progress.subscribe() needs a snapshot listener.',
        );
      }
      let subscribed = open;
      if (subscribed) listeners.add(listener);
      deliver(current, [listener]);
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },
  });
  const lifecycle: ActionLifecycle | undefined = started
    ? Object.freeze({
        transition,
        reportProgress(stage: string, detail?: unknown): void {
          try {
            if (!open) return;
            if (typeof stage !== 'string' || !allowed.has(stage)) {
              report(
                Object.freeze(
                  Object.assign(
                    new Error(
                      `hcifootprint: progress stage '${String(stage)}' is not declared for transition '${transition.transitionId}'.`,
                    ),
                    {
                      code: 'ACTION_PROGRESS_STAGE_UNKNOWN' as const,
                      stage,
                      transition,
                    },
                  ),
                ),
              );
              return;
            }
            let capturedDetail: unknown;
            let hasDetail = detail !== undefined;
            if (hasDetail) {
              try {
                capturedDetail = snapshotDeclaration(detail);
              } catch (error) {
                hasDetail = false;
                report(error);
              }
            }
            observed.push(
              Object.freeze({
                stage,
                ...(hasDetail ? { detail: capturedDetail } : {}),
              }),
            );
            current = Object.freeze({
              disposition: 'open' as const,
              declared,
              observed: Object.freeze([...observed]),
            });
            publish(current);
          } catch (error) {
            report(error);
          }
        },
      })
    : undefined;

  return Object.freeze({
    channel,
    ...(lifecycle !== undefined ? { lifecycle } : {}),
    snapshot: () => current,
    close: () => {
      if (!open) return;
      open = false;
      const seen = new Set(observed.map((entry) => entry.stage));
      const unreported = Object.freeze(
        declared.filter((stage) => !seen.has(stage)),
      );
      current = Object.freeze({
        disposition: 'closed' as const,
        declared,
        observed: Object.freeze([...observed]),
        unreported,
        ...(declaration.required === true && observed.length === 0
          ? { integrity: 'unmet' as const }
          : {}),
      });
      publish(current);
      listeners.clear();
    },
  });
}

