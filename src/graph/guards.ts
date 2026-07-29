/**
 * Shared guard-shape enforcement — one spine for BOTH authoring surfaces
 * (the v1 fluent skillGraph() and the D18 appMap() object literal).
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

export class SkillGraphValidationError extends Error {
  constructor(message: string) {
    super(`hcifootprint: ${message}`);
    this.name = 'SkillGraphValidationError';
  }
}

/** Segment names become path/registry/MCP identities — keep the delimiters out. */
const BAD_SEGMENT = /[.[\]#/|]/;

/**
 * The ONE segment-name law. It lived inside buildNavigationGraph; it lives
 * here (the shared authoring-enforcement leaf) so graph sources can refuse a
 * bad page/skill id at the factory with the SAME words the compiler would use
 * at build — one law, two doors, zero drift. Behavior is byte-identical to the
 * original appmap-private copy.
 */
export function checkSegment(owner: string, name: string): void {
  if (!name || !name.trim()) throw new SkillGraphValidationError(`${owner}: empty name.`);
  if (BAD_SEGMENT.test(name)) {
    throw new SkillGraphValidationError(
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
 * compileTool and mount-declared tools), judged by the MATCHER's own segment
 * law (segmentsOf/isParam) so what authoring refuses and what materialisation
 * derives can never disagree. What cannot materialise YET (a handler arriving
 * at mount) is deliberately NOT refused here — that is the commit gate's job.
 */
export function checkLiteralHref(owner: string, href: unknown): void {
  if (typeof href !== 'string') {
    throw new SkillGraphValidationError(
      `${owner} declares a url binding whose href is not a string (got ${typeof href}).`,
    );
  }
  if (!isLiteralRoute(href)) {
    throw new SkillGraphValidationError(
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
          throw new SkillGraphValidationError(
            `tool '${owner}': ancestor and descendant guards disagree on '${key}.${op}' ` +
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
 * `Object.keys(guard)` set #evalGuard tests for presence before deciding. Both
 * authoring surfaces build their `requiredStateKeys()` on this.
 */
export function guardStateKeys(guards: Iterable<Record<string, unknown> | undefined>): string[] {
  const keys = new Set<string>();
  for (const guard of guards) {
    if (!guard) continue;
    for (const key of Object.keys(guard)) keys.add(key);
  }
  return [...keys].sort();
}

/** Catch shape mistakes at authoring time — the evaluator fails them silently at runtime. */
export function validateGuardShape(owner: string, guard: Record<string, unknown>): void {
  for (const [key, ops] of Object.entries(guard)) {
    if (DENIED_GUARD_KEYS.has(key)) {
      throw new SkillGraphValidationError(
        `${owner} key '${key}' is on footprint's denied list — it would silently never match at runtime.`,
      );
    }
    if (!ops || typeof ops !== 'object' || Array.isArray(ops)) {
      throw new SkillGraphValidationError(
        `${owner} key '${key}' must map to an operator object like { eq: value } ` +
          `(operators: ${[...FILTER_OPERATORS].join(', ')}).`,
      );
    }
    if (Object.keys(ops).length === 0) {
      throw new SkillGraphValidationError(
        `${owner} key '${key}' has an empty operator object {} — the evaluator would silently ignore it ` +
          `(or never match if it is the only key). Give it an operator like { eq: value } or remove the key.`,
      );
    }
    for (const [op, value] of Object.entries(ops as Record<string, unknown>)) {
      if (!FILTER_OPERATORS.has(op)) {
        throw new SkillGraphValidationError(
          `${owner} key '${key}' uses unknown operator '${op}' (valid: ${[...FILTER_OPERATORS].join(', ')}).`,
        );
      }
      if ((op === 'in' || op === 'notIn') && !Array.isArray(value)) {
        throw new SkillGraphValidationError(
          `${owner} key '${key}' operator '${op}' needs an ARRAY (got ${typeof value}) — ` +
            `a non-array compiles but silently never matches at runtime.`,
        );
      }
    }
  }
}
