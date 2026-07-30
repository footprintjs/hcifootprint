/**
 * THE INSTRUMENTATION MANIFEST — derived, never configured.
 *
 * The sensor takes no selector map and no id registry. Its entire watch-list is
 * the graph the app already declared: the `binding` each served edge carries
 * (atom/types.ts:578), plus the controls the app handed over directly. This
 * module is that derivation, and nothing else — pure, DOM-free, and rebuilt from
 * a fresh `available()` per trusted event.
 *
 * IT IS NOT MEMOIZED, and that is a correctness decision. `#bumpState()` moves
 * `#stateVersion` alone (session.ts:554-558), so a guard opening or closing
 * changes the served edges WITHOUT moving `#version` — a version-keyed memo
 * would go stale exactly when a guard flips. And structure flips are coalesced
 * to a microtask (session.ts:3268-3275), so a tool group registered a moment ago
 * is real in `available()` but not yet ANNOUNCED: recognising against the
 * announcement would attribute this click to the surface as it was one tick ago.
 * Asking `available()` is what the library itself does on every refused fire
 * (expects.ts calls that path hot and pays it), and it is the only source that is
 * never behind.
 *
 * IT ALSO ANSWERS THE HONEST HALF. A binding the sensor CANNOT report is not
 * dropped: it is listed with the sentence saying why, so `coverage()` reads as
 * "here is everything you declared, and here is exactly what I am and am not
 * watching" rather than a silence the app has to trust. There are three ways to
 * be unwatched, kept apart because the fix for each is different:
 *   'gesture' — the sensor has no moment it can recognise for this edge;
 *   'payload' — it has the moment, but the action takes a VALUE and only the app
 *               can declare one (payload.ts);
 *   'door'    — the app already reports this edge through its own door, so the
 *               sensor stands down rather than writing a second row for one act.
 *
 * FROZEN SPEC, UNTOUCHED: `edge.binding` is deep-frozen shared spec data.
 * Everything this module emits is built from primitives read off it — the spec
 * objects are never cloned into a mutable copy and never written to.
 */
import type { Actuation, AvailableEdge } from '../atom/types.js';
import type { Cadence, SensorEventType } from './cadence.js';
import type { DeclaredEdges } from './control-index.js';
import { commitsOnGesture, needsTimer } from './cadence.js';
import { normalizeName } from './accessible-name.js';
import { VALUE_NOT_DECLARED, VALUE_NOT_RECOGNISABLE, takesAValue } from './payload.js';

/** Why a live edge is not being watched. See the module header. */
export type BlockedBy = 'gesture' | 'payload' | 'door';

/** A live edge the sensor recognises by locator, flattened to what the walk needs. */
export interface RecognisedEdge {
  readonly edge: string;
  readonly role: string;
  readonly name: string;
  readonly actuation: Actuation;
  readonly eventType: SensorEventType;
  /** Live instance keys when the edge sits on a repeats container; absent otherwise. */
  readonly instances?: readonly string[];
}

/** One row of `coverage()`: a live edge and whether the sensor is watching it. */
export interface EdgeCoverage {
  readonly edge: string;
  readonly status: 'watching' | 'unwatched';
  /** Present only when unwatched — the plain sentence saying why, and what to do. */
  readonly reason?: string;
  /** Present only when unwatched — which of the three walls it hit. */
  readonly blocked?: BlockedBy;
}

export interface BindingIndex {
  readonly recognised: readonly RecognisedEdge[];
  /** Exactly the event classes the recognised watch-list needs — no more listeners than moments. */
  readonly eventTypes: readonly SensorEventType[];
  /** Recognition lookup: `momentKey(eventType, role, name)` → the edges that claim it. */
  readonly byMoment: ReadonlyMap<string, readonly RecognisedEdge[]>;
  /**
   * Every (role, name) the graph declares an element binding for — WATCHED OR NOT.
   *
   * It is what turns noise into silence twice over. A known control reached by an
   * event class that is not its committed moment (Enter on a button whose moment
   * is the click the browser generates next) is not off-graph — the sensor knows
   * that control, this simply is not its moment. And a control whose edge is
   * unwatched for a reason coverage ALREADY announced once must not re-announce
   * it as off-graph on every click.
   */
  readonly declaredNames: ReadonlySet<string>;
  readonly coverage: readonly EdgeCoverage[];
}

/** What the manifest is derived FROM. Every field is live truth, nothing is configured. */
export interface IndexInputs {
  readonly edges: readonly AvailableEdge[];
  /** THE ONE exclusion surface: does the app report this edge through its own door? */
  readonly standsDown: (edge: string) => boolean;
  readonly declarations: DeclaredEdges;
  /** The watcher's default cadence; a declaration may override it per control. */
  readonly cadence: Cadence;
  /** Whether a debounced cadence has a clock to run on (dom-port.ts `timersOf`). */
  readonly canDebounce: boolean;
}

/** The recognition key. One function so the index and the lookup can never read differently. */
export function momentKey(eventType: SensorEventType, role: string, name: string): string {
  // A NUL separator, not a space: an accessible name may contain spaces, and a
  // separator the parts can also contain lets two different (role, name) pairs
  // collide on one key. NUL can appear in neither.
  return `${eventType}\u0000${role}\u0000${name}`;
}

/** The identity a control has across event classes — the key `declaredNames` holds. */
export function nameKey(role: string, name: string): string {
  return `${role}\u0000${name}`;
}

/**
 * The refusal a `{ debounceMs }` cadence earns on a watcher with no clock.
 *
 * Exported so the assembly can pick the `cadence-unavailable` report arm by
 * comparing against this very constant. One sentence, one place: the arm a
 * consumer receives can never disagree with the reason coverage shows.
 */
export const CADENCE_NEEDS_A_CLOCK =
  'this control commits on a debounced cadence and this watcher has no clock to run it on — hand ' +
  'watchPage timers (or a root whose view has setTimeout); the sensor will not silently report per keystroke instead';

type Refusal = { readonly blocked: BlockedBy; readonly reason: string };

/** The gesture walls, in the order a reader would ask them. `undefined` = recognisable. */
function gestureRefusal(edge: AvailableEdge, cadence: Cadence): Refusal | undefined {
  const binding = edge.binding;
  if (binding === undefined) {
    return {
      blocked: 'gesture',
      reason:
        'this edge declares no binding, so there is no gesture to recognise — hand the element over with ' +
        'attach() if you want it reported',
    };
  }
  if (binding.kind === 'keychord') {
    return {
      blocked: 'gesture',
      reason: 'a keychord has no chord grammar anywhere in this library yet, so the sensor cannot recognise it',
    };
  }
  if (binding.kind === 'programmatic') {
    return {
      blocked: 'gesture',
      reason:
        'a programmatic binding publishes its own affordance — the component reports it, the sensor never guesses it',
    };
  }
  if (binding.kind === 'tab') {
    return {
      blocked: 'gesture',
      reason: "a tab flip is reported by the app's visibility wire (show/setVisible), never by the sensor",
    };
  }
  if (binding.kind === 'url') {
    return {
      blocked: 'gesture',
      reason: 'a url hop is reported through sync() when watchLocation is on, never as an edge fire',
    };
  }
  if (binding.actuation === undefined) {
    return {
      blocked: 'gesture',
      reason:
        "this element binding does not say how it is actuated — add actuation: 'click' (or 'press', 'type', 'select')",
    };
  }
  const eventType = commitsOnGesture(binding.actuation, cadence);
  if (eventType === undefined) {
    return {
      blocked: 'gesture',
      reason: `the sensor does not watch '${binding.actuation}' yet — a pointer gesture has no committed moment to record`,
    };
  }
  return undefined;
}

/**
 * Why this edge is not watched, or `undefined` when it is.
 *
 * ORDER IS MEANING. The door check runs FIRST because it outranks every other
 * answer: an app that reports this edge itself does not care why the sensor could
 * not. The DECLARED level runs next, because a handed-over element needs no
 * gesture recognised and no locator matched — the only thing that can still block
 * it is a value nobody declared.
 */
function unwatchedReason(edge: AvailableEdge, inputs: IndexInputs): Refusal | undefined {
  if (inputs.standsDown(edge.affordanceId)) {
    return {
      blocked: 'door',
      reason: 'the app reports this edge through its own door — the sensor stands down so one act writes one row',
    };
  }

  const declaration = inputs.declarations.forEdge(edge.affordanceId);
  if (declaration !== undefined) {
    // A handed-over element needs no gesture recognised and no locator matched, so
    // the ONLY thing that can still block it here is a value nobody declared. Its
    // clock is not re-checked: `attach()` refuses a debounced cadence with no clock
    // outright, so a declaration that reached this index always has one — and
    // asking twice would be a second answer to one question.
    if (takesAValue(edge.expects) && declaration.value === undefined) {
      return { blocked: 'payload', reason: VALUE_NOT_DECLARED };
    }
    return undefined;
  }

  const gesture = gestureRefusal(edge, inputs.cadence);
  if (gesture !== undefined) return gesture;
  const binding = edge.binding as { kind: 'element'; actuation: Actuation };
  if (
    needsTimer(inputs.cadence) &&
    !inputs.canDebounce &&
    commitsOnGesture(binding.actuation, inputs.cadence) === 'input'
  ) {
    return { blocked: 'gesture', reason: CADENCE_NEEDS_A_CLOCK };
  }
  if (takesAValue(edge.expects)) return { blocked: 'payload', reason: VALUE_NOT_RECOGNISABLE };
  return undefined;
}

/**
 * The live edges → the recognition tables and the coverage report.
 *
 * Every served edge produces exactly one coverage row, so the count a consumer
 * reads back is the count the graph declared — an edge can never go missing
 * between the two.
 */
export function buildBindingIndex(inputs: IndexInputs): BindingIndex {
  const recognised: RecognisedEdge[] = [];
  const coverage: EdgeCoverage[] = [];
  const byMoment = new Map<string, RecognisedEdge[]>();
  const eventTypes = new Set<SensorEventType>();
  const declaredNames = new Set<string>();

  for (const edge of inputs.edges) {
    const binding = edge.binding;
    const declaration = inputs.declarations.forEdge(edge.affordanceId);
    // Every element-bound edge contributes its (role, name) whether or not it is
    // watched — see `declaredNames`. Read before the refusal so an unwatched edge
    // still silences its own control.
    if (binding?.kind === 'element') {
      declaredNames.add(nameKey(binding.locator.role, normalizeName(binding.locator.name)));
    }

    const refusal = unwatchedReason(edge, inputs);
    if (refusal !== undefined) {
      coverage.push(
        Object.freeze({
          edge: edge.affordanceId,
          status: 'unwatched' as const,
          reason: refusal.reason,
          blocked: refusal.blocked,
        }),
      );
      continue;
    }
    coverage.push(Object.freeze({ edge: edge.affordanceId, status: 'watching' as const }));

    if (declaration !== undefined) {
      // DECLARED. Identity is the element, so this edge contributes no locator
      // row — its listener class comes from the control index, which holds the
      // element whose role picks the moment.
      continue;
    }
    // Narrowed by unwatchedReason above: an element binding with a recognisable
    // actuation. Re-read rather than carried, so this stays one obvious read.
    const element = binding as { kind: 'element'; locator: { role: string; name: string }; actuation: Actuation };
    const entry: RecognisedEdge = {
      edge: edge.affordanceId,
      role: element.locator.role,
      name: normalizeName(element.locator.name),
      actuation: element.actuation,
      eventType: commitsOnGesture(element.actuation, inputs.cadence) as SensorEventType,
      // Copied out of the frozen spec's runtime data as a fresh array: the index
      // owns its own list and can never be the thing that mutates available()'s
      // answer.
      ...(edge.instances !== undefined ? { instances: [...edge.instances] } : {}),
    };
    recognised.push(entry);
    eventTypes.add(entry.eventType);
    const key = momentKey(entry.eventType, entry.role, entry.name);
    const bucket = byMoment.get(key);
    if (bucket) bucket.push(entry);
    else byMoment.set(key, [entry]);
  }

  return { recognised, eventTypes: [...eventTypes], byMoment, declaredNames, coverage: Object.freeze(coverage) };
}
