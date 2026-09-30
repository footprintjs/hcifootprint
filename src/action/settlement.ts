/**
 * settlement — how a transition's outcome is snapshotted and proven.
 *
 * Pure functions over the stored shape: the transition snapshot (including
 * lateSettlements — evidence that arrived after the terminal, kept and
 * marked late, never adopted) and the abandonment authority snapshot —
 * because `abandoned` requires an EXPLICIT authority, never an inference
 * from a detach.
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
import type { HumanReporting, ReadonlyActionDefinitionContract, ActionInputValidationDisposition, ActionDefinitionRef, ActionLifecycle, ActionInputSource } from './types.js';
import type { BindingRegistration } from '../registry/registry.js';
import type { StoredTransition } from './stored.js';

export function snapshotTransition(
  stored: StoredTransition,
): ActionTransitionSnapshot {
  return Object.freeze({
    ref: stored.ref,
    input: stored.input,
    coverage: stored.coverage,
    invocationStatus: stored.invocationStatus,
    effectStatus: stored.effectStatus,
    ...(stored.invocationStatus === 'performed'
      ? { produced: stored.produced }
      : {}),
    ...(stored.invocationStatus === 'refused' ||
    stored.invocationStatus === 'failed'
      ? { error: stored.error }
      : {}),
    ...(stored.effectStatus === 'verified'
      ? { evidence: stored.evidence }
      : {}),
    ...(stored.effectStatus === 'verified' && stored.evidenceKind !== undefined
      ? { evidenceKind: stored.evidenceKind }
      : {}),
    ...(stored.effectStatus === 'refused' ? { reason: stored.reason } : {}),
    ...(stored.effectStatus === 'abandoned'
      ? { authority: stored.authority }
      : {}),
    // Absent when none arrived — an empty list would claim "we watched and
    // none came", which a snapshot cannot know. Copied and frozen so a later
    // late arrival cannot mutate a snapshot already handed out.
    ...(stored.late !== undefined && stored.late.length > 0
      ? { lateSettlements: Object.freeze([...stored.late]) }
      : {}),
    ...(stored.progress !== undefined
      ? { progress: stored.progress.snapshot() }
      : {}),
    attribution: stored.attribution,
  });
}

export function snapshotAbandonmentAuthority(
  value: unknown,
): ActionAbandonmentAuthority {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(
      'hcifootprint: an abandoned effect settlement needs an explicit authority record.',
    );
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (kind === 'cancelled') {
    const reason = (value as { readonly reason?: unknown }).reason;
    if (reason === undefined) {
      throw new TypeError(
        'hcifootprint: cancelled abandonment authority needs a reason.',
      );
    }
    return Object.freeze({
      kind,
      reason: snapshotDeclaration(reason),
    });
  }
  if (kind === 'deadline') {
    const deadlineAt = (value as { readonly deadlineAt?: unknown }).deadlineAt;
    if (typeof deadlineAt !== 'number' || !Number.isFinite(deadlineAt)) {
      throw new TypeError(
        'hcifootprint: deadline abandonment authority needs a finite deadlineAt.',
      );
    }
    if (deadlineAt > Date.now()) {
      throw new TypeError(
        'hcifootprint: a deadline cannot authorize abandonment before it has elapsed.',
      );
    }
    return Object.freeze({ kind, deadlineAt });
  }
  if (kind === 'evidence-exhausted') {
    const sources = (value as { readonly sources?: unknown }).sources;
    if (!Array.isArray(sources)) {
      throw new TypeError(
        'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
      );
    }
    const sourceCount = sources.length;
    if (!Number.isSafeInteger(sourceCount) || sourceCount <= 0) {
      throw new TypeError(
        'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
      );
    }
    const capturedSources: string[] = [];
    for (let index = 0; index < sourceCount; index += 1) {
      const source = sources[index];
      if (typeof source !== 'string' || source.trim().length === 0) {
        throw new TypeError(
          'hcifootprint: evidence-exhausted abandonment authority needs at least one named source.',
        );
      }
      capturedSources.push(source);
    }
    return Object.freeze({
      kind,
      sources: Object.freeze(capturedSources),
    });
  }
  throw new TypeError(
    `hcifootprint: invalid abandonment authority '${String(kind)}'; expected cancelled, deadline, or evidence-exhausted.`,
  );
}

/**
 * Detach evidence-shaped arrays/plain records from application mutation while
 * retaining opaque objects (errors, DOM nodes, schema instances) by identity.
 */
