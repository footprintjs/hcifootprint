/**
 * Recognising a handler that FAILED BY RETURNING rather than by throwing.
 *
 * `{ ok: false, … }` is the failure vocabulary this library itself speaks —
 * FireResult's own rejection arms, commitJourney's typed UNKNOWN_JOURNEY — so an
 * app author mirroring that convention in their handler is speaking to us on
 * purpose. Until now only a `throw` reached the failure path, so a returned
 * failure was recorded as a SUCCESSFUL transition carrying the failure object
 * as `produced` data. That is the lie this module exists to stop.
 *
 * The test is deliberately narrow, because a false positive is worse than a
 * miss: it would flip a legitimate committed transition to rejected.
 * - `ok === false` strictly (not falsy): `{ ok: 0 }` is a count, not a verdict.
 * - OWN property (not inherited): a `fetch` Response carries `ok` as a
 *   PROTOTYPE getter, and a handler returning one is returning data — a failed
 *   HTTP response is the app's business to interpret, not ours to re-verdict.
 * Everything else stays produced data: `{ ok: true, … }`, an object with only
 * an `error` key, arrays, primitives. Broader duck-typing would misclassify
 * ordinary domain payloads.
 */

/** A handler return that declares its own failure in the library's vocabulary. */
export interface ReturnedFailure {
  ok: false;
  error?: unknown;
}

export function isReturnedFailure(value: unknown): value is ReturnedFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'ok') &&
    (value as { ok: unknown }).ok === false
  );
}

/**
 * What to report as the refusal's reason: the returned `error` when the
 * handler named one, else the returned object itself — a bare `{ ok: false }`
 * still has to say something, and the object IS the whole story it told.
 */
export function failureReason(failure: ReturnedFailure): unknown {
  return ('error' in failure ? failure.error : undefined) ?? failure;
}
