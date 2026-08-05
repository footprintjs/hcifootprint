/**
 * THE ENVELOPE, ASSEMBLED — and the one place law 1 is enforced.
 *
 * Everything a contextful fire records goes through this file, and nothing here
 * can emit a value the app did not name: the guard block is built from KEYS and
 * OUTCOMES (never from the conditions' `actualSummary`, which carries state), the
 * input block is a projection of the allowlist and nothing else, and the failure
 * block starts from the error's CLASS — a fact about code, not about data.
 *
 * The app's own redactor is the last word on every value that survives the
 * allowlist, and a redactor that throws costs the value its slot rather than
 * taking down the app's own click handler.
 */
import type { FilterCondition } from 'footprintjs/advanced';
import { sanitizeProduced } from '../traverse/data-channel.js';
import { ERROR_MESSAGE } from './types.js';
import type { CaptureFailure, ContextfulOptions, GuardRead } from './types.js';

/**
 * Guard read-keys and how each one read — the before-invoke block's whole
 * evidence, in names.
 *
 * The session's own `#evalGuard` already produced richer conditions for the
 * record's `evidence` field; this deliberately reads only their `key` and
 * `result`. A capture that copied the condition object would carry
 * `threshold` and `actualSummary` — app state — into a channel whose entire
 * promise is that it does not.
 */
export function guardReads(
  guardKeys: readonly string[],
  conditions: readonly FilterCondition[],
  unevaluable: readonly string[],
): GuardRead[] {
  return guardKeys.map((key) => {
    if (unevaluable.includes(key)) return { key, held: 'unevaluated' as const };
    const condition = conditions.find((c) => c.key === key);
    /* v8 ignore next -- the `'unevaluated'` fallback is unreachable today: a key that is not in `unevaluable` was handed to evaluateFilter, which emits one condition per key. It is what keeps a future evaluator that skips a key from being reported as a guard that HELD. */
    return { key, held: condition === undefined ? ('unevaluated' as const) : condition.result };
  });
}

/**
 * The allowlisted payload keys, redacted by the app — or nothing at all.
 *
 * ABSENCE IS THE DEFAULT AND IT IS THE POINT. With no `include`, a contextful
 * capture carries no values whatsoever; with one, it carries exactly the named
 * keys, each through the app's own redactor and then bounded by the same
 * data-channel rule a handler's return value gets.
 */
export function projectInput(
  payload: unknown,
  options: ContextfulOptions,
): Record<string, unknown> | undefined {
  const names = (options.include ?? []).filter((name) => name !== ERROR_MESSAGE);
  if (names.length === 0) return undefined;
  if (typeof payload !== 'object' || payload === null) return undefined;
  const source = payload as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const name of names) {
    if (!Object.hasOwn(source, name)) continue;
    const value = redacted(source[name], name, options);
    if (value === undefined) continue; // absent stays absent (redact-fields.ts's own rule)
    out[name] = sanitizeProduced(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * What went wrong — class ALWAYS, message only where the app opened it.
 *
 * A message routinely carries the row that failed or the address that bounced,
 * which is why it is behind the allowlist while the class is not: `TypeError`
 * says something about the code and nothing about the person using it.
 */
export function failureOf(reason: unknown, options: ContextfulOptions): CaptureFailure {
  const errorClass = classOf(reason);
  if (!(options.include ?? []).includes(ERROR_MESSAGE)) return { errorClass };
  const message = messageOf(reason);
  if (message === undefined) return { errorClass };
  const shown = redacted(message, ERROR_MESSAGE, options);
  return typeof shown === 'string'
    ? { errorClass, message: shown.length > 200 ? `${shown.slice(0, 200)}…` : shown }
    : { errorClass };
}

/** The app's redactor, isolated: it is the last word, and a throw is not one. */
function redacted(value: unknown, key: string, options: ContextfulOptions): unknown {
  if (options.redact === undefined) return value;
  try {
    return options.redact(value, key);
  } catch {
    // Fail CLOSED: a redactor that could not run has not approved this value, so
    // the value does not travel. (The warning belongs to the session, which owns
    // the sink; here we only refuse.)
    return undefined;
  }
}

/** The constructor name of whatever was thrown — 'Error', 'TypeError', or the app's own class. */
function classOf(reason: unknown): string {
  if (reason === null) return 'null';
  if (reason === undefined) return 'undefined';
  const name: unknown = (reason as { constructor?: { name?: unknown } })?.constructor?.name;
  return typeof name === 'string' && name.length > 0 ? name : typeof reason;
}

/** The message of a thrown thing, when it has one a string can hold. */
function messageOf(reason: unknown): string | undefined {
  if (typeof reason === 'string') return reason;
  const message: unknown = (reason as { message?: unknown })?.message;
  return typeof message === 'string' ? message : undefined;
}
