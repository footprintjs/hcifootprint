/**
 * Shared guard-shape enforcement — one spine for every authoring door
 * (buildNavigationGraph's walk, the graph sources, mount-time declaration).
 *
 * footprint's evaluator fails shape mistakes SILENTLY at runtime (unknown
 * operators are ignored; denied keys never match). Authoring is where they
 * must die loudly.
 */
import { isParam, segmentsOf } from './route-match.js';

export const FILTER_OPERATORS = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn']);

/** Mirrors footprint evaluator's DENIED_KEYS — guards on these silently never match at runtime. */
export const DENIED_GUARD_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Every authoring refusal this package throws — from buildNavigationGraph, from
 * the source factories, and from mount-time declaration. Named for the thing it
 * judges (a graph), not for one of the vocabularies that reach it.
 */
export class GraphValidationError extends Error {
  constructor(message: string) {
    super(`hcifootprint: ${message}`);
    this.name = 'GraphValidationError';
  }
}

/** Segment names become path/registry/MCP identities — keep the delimiters out. */
const BAD_SEGMENT = /[.[\]#/|]/;

/**
 * The ONE segment-name law. It lived inside buildNavigationGraph; it lives
 * here (the shared authoring-enforcement leaf) so graph sources can refuse a
 * bad page/journey id at the factory with the SAME words the compiler would use
 * at build — one law, two doors, zero drift.
 */
export function checkSegment(owner: string, name: string): void {
  if (!name || !name.trim()) throw new GraphValidationError(`${owner}: empty name.`);
  if (BAD_SEGMENT.test(name)) {
    throw new GraphValidationError(
      `${owner}: '${name}' contains a reserved character (. [ ] # / |) — names become path identities.`,
    );
  }
}

/**
 * "Every segment is bytes, none is a ':param'" — the literal-address law, in
 * one predicate. An address either exists as bytes or the gesture does not
 * exist: the library never guesses a param, so nothing downstream can ever
 * hand a router a filled-in `/orders/:id`. Judged by the MATCHER's own segment
 * reading (segmentsOf / isParam) so authoring, routing and materialisation can
 * never disagree. Shared: the url-binding door below and fromRoutes' crossLinks
 * ask the same question about the same kind of string.
 */
export function isLiteralRoute(routeOrHref: string): boolean {
  return !segmentsOf(routeOrHref).some(isParam);
}

/**
 * The url-gesture half of the never-trap BUILD gate: a `url` binding whose
 * href carries a ':param' segment can NEVER materialise — the library never
 * guesses params, so no navigate function will ever be handed a filled-in
 * address for it. Refused loudly at authoring (both doors: the compiler's
 * compileAction and mount-declared actions), judged by the MATCHER's own segment
 * law (segmentsOf/isParam) so what authoring refuses and what materialisation
 * derives can never disagree. What cannot materialise YET (a handler arriving
 * at mount) is deliberately NOT refused here — that is the commit gate's job.
 */
export function checkLiteralHref(owner: string, href: unknown): void {
  if (typeof href !== 'string') {
    throw new GraphValidationError(
      `${owner} declares a url binding whose href is not a string (got ${typeof href}).`,
    );
  }
  if (!isLiteralRoute(href)) {
    throw new GraphValidationError(
      `${owner} declares a url binding with href '${href}' — a ':param' segment can never materialise ` +
        `(the library never guesses params). Give the gesture a fully literal address, or bind a handler instead.`,
    );
  }
}

/**
 * AND-compose a guard chain (root → leaf → own). Children may only NARROW:
 * the same key+operator appearing twice with different values is a
 * contradiction the author must resolve, not a silent override.
 */
export function composeGuards(
  owner: string,
  layers: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  const merged: Record<string, Record<string, unknown>> = {};
  for (const layer of layers) {
    for (const [key, ops] of Object.entries(layer)) {
      const target = (merged[key] ??= {});
      for (const [op, value] of Object.entries(ops as Record<string, unknown>)) {
        if (op in target && JSON.stringify(target[op]) !== JSON.stringify(value)) {
          throw new GraphValidationError(
            `action '${owner}': ancestor and descendant guards disagree on '${key}.${op}' ` +
              `(${JSON.stringify(target[op])} vs ${JSON.stringify(value)}) — children can only narrow.`,
          );
        }
        target[op] = structuredClone(value);
      }
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * The sorted, deduped set of top-level state keys a collection of guards
 * (WhereFilters) reads. A WhereFilter is a FLAT `key → { op: value }` map, so
 * its own-enumerable keys ARE the state keys the evaluator looks up — the same
 * `Object.keys(guard)` set #evalGuard tests for presence before deciding.
 * `requiredStateKeys()` is built on this.
 */
export function guardStateKeys(guards: Iterable<Record<string, unknown> | undefined>): string[] {
  const keys = new Set<string>();
  for (const guard of guards) {
    if (!guard) continue;
    for (const key of Object.keys(guard)) keys.add(key);
  }
  return [...keys].sort();
}

// ---------------------------------------------------------------------------
// blockedBecause — the app's own reason a control is off (see BlockedBecause)
// ---------------------------------------------------------------------------

/** The three words `clearedBy` may be. A fourth is a next move nobody implements. */
export const CLEARED_BY = new Set(['app', 'user', 'invalid']);

/** Which of the three questions a `blockedBecause` failed — or nothing, if it is usable. */
export type BlockedBecauseFault = 'shape' | 'says' | 'clearedBy';

/**
 * ONE reading of "is this a usable reason", asked at three places: both
 * authoring doors (which THROW, each in its own vocabulary) and row assembly
 * (which serves nothing and warns once). Written as a fault CODE rather than as
 * three copies of the same conditions, because a reader answering at run time
 * cannot be handed a build-time error and the two must not drift apart:
 * whatever the compiler would have refused is what a reader is refused for.
 */
export function blockedBecauseFault(value: unknown): BlockedBecauseFault | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'shape';
  const { says, clearedBy } = value as { says?: unknown; clearedBy?: unknown };
  if (typeof says !== 'string' || says.trim() === '') return 'says';
  if (typeof clearedBy !== 'string' || !CLEARED_BY.has(clearedBy)) return 'clearedBy';
  return undefined;
}

/**
 * What each fault COSTS, and the correction — the authored half of the refusal.
 * The owner ('action X' / 'mount-declared action X') is the only thing that
 * differs between the two doors, so the words a reader learns from are
 * byte-identical wherever they authored it.
 */
const BLOCKED_BECAUSE_FAULT: Record<BlockedBecauseFault, string> = {
  shape:
    'blockedBecause must be an object { says, clearedBy } — or a function returning one (and undefined ' +
    'to say nothing).',
  says:
    'blockedBecause.says is empty — it is your own sentence for why this control is off, and an empty ' +
    'one prints a reason nobody wrote. Write the sentence, or omit blockedBecause entirely.',
  clearedBy:
    "blockedBecause.clearedBy must be one of 'app', 'user', 'invalid' — 'app' means the agent waits, " +
    "'user' means interrupt the person, 'invalid' means report a validation problem. There is no fourth " +
    'word, because there is no fourth move.',
};

/**
 * The OBJECT form, refused at an authoring door. The FUNCTION form is never
 * judged here — a reader has no value until a row is assembled, so it is
 * validated at READ time instead (the same split `holds` makes for the same
 * reason), which is why both doors ask `typeof !== 'function'` first.
 */
export function validateBlockedBecause(owner: string, value: unknown): void {
  const fault = blockedBecauseFault(value);
  if (fault !== undefined) throw new GraphValidationError(`${owner}: ${BLOCKED_BECAUSE_FAULT[fault]}`);
}

/** Catch shape mistakes at authoring time — the evaluator fails them silently at runtime. */
export function validateGuardShape(owner: string, guard: Record<string, unknown>): void {
  for (const [key, ops] of Object.entries(guard)) {
    if (DENIED_GUARD_KEYS.has(key)) {
      throw new GraphValidationError(
        `${owner} key '${key}' is on footprint's denied list — it would silently never match at runtime.`,
      );
    }
    if (!ops || typeof ops !== 'object' || Array.isArray(ops)) {
      throw new GraphValidationError(
        `${owner} key '${key}' must map to an operator object like { eq: value } ` +
          `(operators: ${[...FILTER_OPERATORS].join(', ')}).`,
      );
    }
    if (Object.keys(ops).length === 0) {
      throw new GraphValidationError(
        `${owner} key '${key}' has an empty operator object {} — the evaluator would silently ignore it ` +
          `(or never match if it is the only key). Give it an operator like { eq: value } or remove the key.`,
      );
    }
    for (const [op, value] of Object.entries(ops as Record<string, unknown>)) {
      if (!FILTER_OPERATORS.has(op)) {
        throw new GraphValidationError(
          `${owner} key '${key}' uses unknown operator '${op}' (valid: ${[...FILTER_OPERATORS].join(', ')}).`,
        );
      }
      if ((op === 'in' || op === 'notIn') && !Array.isArray(value)) {
        throw new GraphValidationError(
          `${owner} key '${key}' operator '${op}' needs an ARRAY (got ${typeof value}) — ` +
            `a non-array compiles but silently never matches at runtime.`,
        );
      }
    }
  }
}
