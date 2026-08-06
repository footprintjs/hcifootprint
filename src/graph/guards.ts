/**
 * Shared guard-shape enforcement — one spine for every authoring door
 * (buildNavigationGraph's walk, the graph sources, mount-time declaration).
 *
 * footprint's evaluator fails shape mistakes SILENTLY at runtime (unknown
 * operators are ignored; denied keys never match). Authoring is where they
 * must die loudly.
 */
import { isParam, segmentsOf } from './route-match.js';
import type { RoutedPages } from './route-match.js';
// TYPE-ONLY, and erased at build: this leaf judges the app's own vocabulary, so
// it names the unions it judges rather than keeping a hand copy of their words.
import type { ActorKind, Observability, PrincipalPolicy } from '../atom/types.js';

/** The three answers `principalPolicy.decisionOwner` may give. */
type DecisionOwner = NonNullable<PrincipalPolicy['decisionOwner']>;

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

/** Which of the two ways a name fails the segment law — or nothing, if it is usable. */
export type SegmentFault = 'empty' | 'reserved';

/**
 * ONE reading of "is this a usable name", asked at two kinds of place: the
 * authoring doors (which THROW, below) and a DERIVATION that must know whether
 * the name it is about to mint would be refused before it mints it
 * (fromReactRouter transcribes a page name out of a route's own segments). The
 * fault-code shape is {@link blockedBecauseFault}'s, for its reason: whatever
 * the compiler would refuse is what a derivation must not produce, and two
 * copies of the same conditions would drift.
 */
export function segmentFault(name: string): SegmentFault | undefined {
  if (!name || !name.trim()) return 'empty';
  if (BAD_SEGMENT.test(name)) return 'reserved';
  return undefined;
}

/**
 * The ONE segment-name law. It lived inside buildNavigationGraph; it lives
 * here (the shared authoring-enforcement leaf) so graph sources can refuse a
 * bad page/journey id at the factory with the SAME words the compiler would use
 * at build — one law, two doors, zero drift.
 */
export function checkSegment(owner: string, name: string): void {
  const fault = segmentFault(name);
  if (fault === 'empty') throw new GraphValidationError(`${owner}: empty name.`);
  if (fault === 'reserved') {
    throw new GraphValidationError(
      `${owner}: '${name}' contains a reserved character (. [ ] # / |) — names become path identities.`,
    );
  }
}

/**
 * The `crossLinks:` ask, judged at the FACTORY — shared by every factory that
 * reads pages out of an app's own routing (fromRoutes' table, fromReactRouter's
 * route tree), so the two stances and their words cannot drift apart.
 *
 * Refused HERE for the same reason page names are: the author is looking at
 * this call, not at a build three files away. Only the NAMED form is answered
 * for — a blanket `true` meets the literal-address law as a documented FILTER
 * (see each factory's own doc for why), because it asked for whatever is
 * linkable rather than for a page that cannot be linked to.
 *
 * `owner` is the only thing that differs between the doors, exactly as
 * {@link validateBlockedBecause} does it: a reader who learned the refusal at
 * one factory has learned it at the other.
 */
export function checkCrossLinks(
  owner: string,
  pages: RoutedPages,
  crossLinks: true | readonly string[] | undefined,
): void {
  if (crossLinks === undefined || crossLinks === true) return;
  for (const pageId of crossLinks) {
    if (!Object.hasOwn(pages, pageId)) {
      throw new GraphValidationError(
        `${owner} crossLinks names '${pageId}', which this route table does not declare. ` +
          `Known pages: ${Object.keys(pages).join(', ')}.`,
      );
    }
    const { route } = pages[pageId];
    if (route !== undefined && !isLiteralRoute(route)) {
      throw new GraphValidationError(
        `${owner} crossLinks names '${pageId}', whose route '${route}' has a ':param' segment — ` +
          `a link to it could never be built (the library never guesses params). Drop it from crossLinks, ` +
          `or author a tool that supplies the param.`,
      );
    }
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

// ---------------------------------------------------------------------------
// humanDecides — a decision that belongs to a person (see HumanDecides)
// ---------------------------------------------------------------------------

/**
 * The cap on `about`, and it is the cap every app string that crosses already
 * crosses under (an error text's, a `busy` label's, a work row's).
 */
export const ABOUT_MAX = 200;

/**
 * The whole declaration, judged at an authoring door — BOTH of them, in the same
 * words, because whatever the compiler refuses is what the mount door refuses
 * and a reader learning from one has learned the other.
 *
 * `owner` is the only thing that differs between them ('action X' /
 * 'mount-declared action X'), exactly as {@link validateBlockedBecause} does it.
 *
 * There is no read-time arm here and no fault code, because there is nothing to
 * read late: a declaration is bytes, not a reader — `doneWhen` is a plain filter
 * on purpose, and `about` is a literal the author can fix once.
 */
export function validateHumanDecides(owner: string, value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GraphValidationError(
      `${owner}: humanDecides must be an object { about?, doneWhen? } — 'about' is your own words for ` +
        `what is being decided, 'doneWhen' is your own condition for it having been decided.`,
    );
  }
  const { about, doneWhen } = value as { about?: unknown; doneWhen?: unknown };
  if (about !== undefined) {
    if (typeof about !== 'string' || about.trim() === '') {
      throw new GraphValidationError(
        `${owner}: humanDecides.about is empty — it is your own words for WHAT is being decided ` +
          `('which shipping speed'), and an empty one puts a blank where a reader expects a subject. ` +
          `Write it, or omit 'about' entirely.`,
      );
    }
    if (about.length > ABOUT_MAX) {
      throw new GraphValidationError(
        `${owner}: humanDecides.about is ${about.length} characters — the cap is ${ABOUT_MAX}, the same one ` +
          `every app string that crosses to a reader crosses under. It rides DATA fields only and never ` +
          `enters an authored sentence, so shorten it here rather than have it truncated where it is read.`,
      );
    }
  }
  if (doneWhen !== undefined) {
    if (typeof doneWhen !== 'object' || doneWhen === null || Array.isArray(doneWhen)) {
      throw new GraphValidationError(
        `${owner}: humanDecides.doneWhen must be a filter over projected state like ` +
          `{ 'checkout.shipping': { ne: '' } } — a condition can prove a state, and only a filter keeps the ` +
          `declaration exportable and explainable. It is deliberately not a predicate.`,
      );
    }
    if (Object.keys(doneWhen).length === 0) {
      throw new GraphValidationError(
        `${owner}: humanDecides.doneWhen is empty {} — footprint's evaluator deliberately NEVER matches an ` +
          `empty filter (anti-vacuous-truth), so the decision could never be known made. Omit 'doneWhen' ` +
          `entirely instead: humanDecides without it declares ownership and leaves 'made' at 'unknown'.`,
      );
    }
    validateGuardShape(`${owner} humanDecides.doneWhen`, doneWhen as Record<string, unknown>);
  }
}

// ---------------------------------------------------------------------------
// principalPolicy — who may act, whose choice it is (see PrincipalPolicy)
// ---------------------------------------------------------------------------

/**
 * The whole declaration, judged at BOTH authoring doors in the same words —
 * {@link validateHumanDecides}'s exact shape, for its exact reason.
 *
 * THE ONE REFUSAL THAT EARNS ITS OWN SENTENCE is `mayInvoke: ['user']`. A record
 * files an act under a PRINCIPAL (`'user'`); a policy names an ACTOR
 * (`'human'`). An author who writes the record's word here is not making a typo
 * in the abstract — they are writing a list that would refuse the very person
 * they meant to allow, and the failure would be silent, at run time, in the
 * fail-closed direction. So it dies at the keyboard with the correction in hand.
 */
export function validatePrincipalPolicy(owner: string, value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new GraphValidationError(
      `${owner}: principalPolicy must be an object { mayInvoke?, decisionOwner?, requiresHumanApproval? } — ` +
        `who may perform this, whose choice it is, and whether a recorded human yes is required. Three ` +
        `separate facts, deliberately not one word.`,
    );
  }
  const { mayInvoke, decisionOwner, requiresHumanApproval } = value as {
    mayInvoke?: unknown;
    decisionOwner?: unknown;
    requiresHumanApproval?: unknown;
  };
  if (mayInvoke !== undefined) {
    if (!Array.isArray(mayInvoke)) {
      throw new GraphValidationError(
        `${owner}: principalPolicy.mayInvoke must be an array of actor kinds ` +
          `(${[...ACTOR_KIND_WORDS].join(', ')}).`,
      );
    }
    if (mayInvoke.length === 0) {
      throw new GraphValidationError(
        `${owner}: principalPolicy.mayInvoke is empty [] — that is an action nobody may ever perform, ` +
          `which is an action not to declare. List the kinds that may, or omit 'mayInvoke' entirely.`,
      );
    }
    for (const kind of mayInvoke) {
      if (ACTOR_KIND_WORDS.has(kind as string)) continue;
      throw new GraphValidationError(
        `${owner}: principalPolicy.mayInvoke names '${String(kind)}', which is not an actor kind ` +
          `(${[...ACTOR_KIND_WORDS].join(', ')}).` +
          (kind === 'user'
            ? ` A POLICY names an actor — write 'human'. 'user' is how a person's act is FILED on a ` +
              `record, and a list holding it would refuse the very person you meant to allow.`
            : ''),
      );
    }
  }
  if (decisionOwner !== undefined && !DECISION_OWNER_WORDS.has(decisionOwner as string)) {
    throw new GraphValidationError(
      `${owner}: principalPolicy.decisionOwner must be one of ${[...DECISION_OWNER_WORDS].join(', ')} — ` +
        `whose CHOICE this is. It is disclosure and is never enforced: to keep the agent out, say ` +
        `mayInvoke: ['human'].`,
    );
  }
  if (requiresHumanApproval !== undefined && typeof requiresHumanApproval !== 'boolean') {
    throw new GraphValidationError(
      `${owner}: principalPolicy.requiresHumanApproval must be true or false — it says whether a recorded ` +
        `human approval is required for this action, and nothing else.`,
    );
  }
}

/**
 * The words each half of the declaration may be — written as TOTAL RECORDS over
 * their own unions rather than as hand-kept lists, so a word added to the type
 * without a refusal here stops the build instead of being silently accepted.
 * (`CERTAINTY_OF` in traverse/attribution.ts is the same lock, for the same
 * reason.)
 */
const ACTOR_KIND_WORDS = new Set(Object.keys({ human: true, agent: true, system: true } satisfies Record<ActorKind, true>));
/** `'either'` is an answer, not a shrug: the app looked and says both may. */
const DECISION_OWNER_WORDS = new Set(
  Object.keys({ human: true, agent: true, either: true } satisfies Record<DecisionOwner, true>),
);

// ---------------------------------------------------------------------------
// observability — how anyone could see that an action happened (see Observability)
// ---------------------------------------------------------------------------

/**
 * Every word `observability` may be — the closed set both authoring doors judge
 * against, under the same totality lock as the two above: a sixth word on the
 * type without a line here stops the build.
 */
export const OBSERVABILITY_WORDS = Object.keys({
  'state-delta': true,
  postcondition: true,
  navigation: true,
  external: true,
  unobservable: true,
} satisfies Record<Observability, true>);

/** Which question a declared `observability` failed — or nothing, if it is usable. */
export type ObservabilityFault = 'word' | 'postcondition' | 'navigation';

/**
 * ONE READING of "is this declaration coherent", asked at BOTH authoring doors
 * (the compiler's walk and mount-time declaration) — {@link blockedBecauseFault}'s
 * exact shape, for its exact reason: a fault CODE rather than two copies of the
 * same conditions, so the doors cannot drift into refusing different things.
 *
 * COHERENCE, NEVER POLICY. `'postcondition'` without a `verify` names a check
 * that does not exist, and `'navigation'` without a destination names a page
 * nobody declared. Both are mistakes only an author can fix, so they die at the
 * keyboard — whether or not any session ever enforces anything.
 */
export function observabilityFault(
  observability: unknown,
  declared: { verify: boolean; destination: boolean },
): ObservabilityFault | undefined {
  if (
    typeof observability !== 'string' ||
    !(OBSERVABILITY_WORDS as readonly string[]).includes(observability)
  ) {
    return 'word';
  }
  if (observability === 'postcondition' && !declared.verify) return 'postcondition';
  if (observability === 'navigation' && !declared.destination) return 'navigation';
  return undefined;
}

/**
 * `observability`, refused at an authoring door. The reading above is shared, so
 * what one door refuses is what the other refuses, in the same words.
 */
export function validateObservability(
  owner: string,
  observability: unknown,
  declared: { verify: boolean; destination: boolean },
): void {
  const fault = observabilityFault(observability, declared);
  if (fault === undefined) return;
  if (fault === 'word') {
    throw new GraphValidationError(
      `${owner}: observability must be one of ${OBSERVABILITY_WORDS.join(', ')} — how anyone could SEE ` +
        `that this action happened. There is no sixth word, because there is no sixth channel this ` +
        `library can read.`,
    );
  }
  if (fault === 'postcondition') {
    throw new GraphValidationError(
      `${owner}: observability 'postcondition' names a check this action does not declare. Add a ` +
        `'verify' (a filter over projected state, or a synchronous predicate), or say how the effect is ` +
        `really seen — 'state-delta', 'navigation', 'external', or 'unobservable'.`,
    );
  }
  throw new GraphValidationError(
    `${owner}: observability 'navigation' names page motion this action does not declare. Add a 'goTo', ` +
      `or say how the effect is really seen.`,
  );
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
