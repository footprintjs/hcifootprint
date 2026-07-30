/**
 * THE INSTRUMENTATION MANIFEST — derived, never configured.
 *
 * The sensor takes no selector map and no id registry. Its entire watch-list is
 * the graph the app already declared: the `binding` each served edge carries
 * (atom/types.ts:524). This module is that derivation, and nothing else — pure,
 * DOM-free, and rebuilt from a fresh `available()` whenever the session says the
 * surface moved.
 *
 * It also answers the honest half of the question. A binding the sensor CANNOT
 * report is not dropped: it is listed with the sentence saying why, so
 * `coverage()` reads as "here is everything you declared, and here is exactly
 * what I am and am not watching" rather than a silence the app has to trust.
 * There are three ways to be unwatched, and they are kept apart because the fix
 * for each is different:
 *   'gesture' — the sensor cannot recognize this kind of gesture at all;
 *   'payload' — it could recognize the gesture, but the action takes a VALUE and
 *               the sensor never reads one off the DOM (payload.ts);
 *   'door'    — the app already reports this edge through its own door, so the
 *               sensor stands down rather than writing a second row for one act.
 *
 * FROZEN SPEC, UNTOUCHED: `edge.binding` is deep-frozen shared spec data
 * (atom/types.ts:518-524 takes that stance explicitly). Everything this module
 * emits is built from primitives read off it — the spec objects are never cloned
 * into a mutable copy and never written to.
 */
import type { Actuation, AvailableEdge } from '../atom/types.js';
import { payloadVerdict } from './payload.js';

/** The DOM event classes the sensor listens for — one per recognizable gesture. */
export type SensorEventType = 'click' | 'keydown' | 'change';

/** Why a live binding is not being watched. See the module header. */
export type BlockedBy = 'gesture' | 'payload' | 'door';

/** A live binding the sensor is watching, flattened to what recognition needs. */
export interface WatchedBinding {
  readonly edge: string;
  readonly role: string;
  readonly name: string;
  readonly actuation: Actuation;
  readonly eventType: SensorEventType;
  /** Live instance keys when the edge sits on a repeats container; absent otherwise. */
  readonly instances?: readonly string[];
}

/** One row of `coverage()`: a live binding and whether the sensor is watching it. */
export interface BindingCoverage {
  readonly edge: string;
  readonly status: 'watching' | 'unwatched';
  /** Present only when unwatched — the plain sentence saying why, and what to do. */
  readonly reason?: string;
  /** Present only when unwatched — which of the three walls it hit. */
  readonly blocked?: BlockedBy;
}

export interface BindingIndex {
  readonly watched: readonly WatchedBinding[];
  /** Exactly the event classes the live watch-list needs — no more listeners than gestures. */
  readonly eventTypes: readonly SensorEventType[];
  /** Recognition lookup: `indexKey(eventType, role, name)` → the bindings that claim it. */
  readonly byKey: ReadonlyMap<string, readonly WatchedBinding[]>;
  readonly coverage: readonly BindingCoverage[];
}

/**
 * Which DOM event class commits this gesture.
 *
 * THE CADENCE DECISION, MADE HERE AND NOT LEFT TO TASTE: 'type' and 'select'
 * both land on `change`, never on `input`. `change` is the browser's own word
 * for "the human finished" — it fires on blur, on Enter, on picking an option.
 * `input` fires per keystroke, and a per-keystroke report would push a session
 * version bump per keystroke into every consumer's ledger, turning one act of
 * typing into thirty rows nobody performed. The ledger records ACTIONS. There is
 * deliberately no option to change this: the sensor carries no value, so thirty
 * keystroke rows would not even differ from one another, and a knob whose every
 * other setting is worse only spreads the mistake.
 *
 * `undefined` = this library has no honest way to recognize the gesture yet;
 * {@link unwatchedReason} says so in words.
 */
export function eventTypeFor(actuation: Actuation): SensorEventType | undefined {
  if (actuation === 'click') return 'click';
  if (actuation === 'press') return 'keydown';
  if (actuation === 'type' || actuation === 'select') return 'change';
  return undefined; // hover, drag
}

/** The recognition key. One function so the index and the lookup can never read differently. */
export function indexKey(eventType: SensorEventType, role: string, name: string): string {
  // A NUL separator, not a space: an accessible name may contain spaces, and a
  // separator the parts can also contain lets two different (role, name) pairs
  // collide on one key. NUL can appear in neither.
  return `${eventType}\u0000${role}\u0000${name}`;
}

/**
 * Collapse runs of whitespace and trim — applied to BOTH the authored locator
 * name and the computed accessible name.
 *
 * Both sides go through this one function deliberately: a name authored as
 * 'Clear archive' and rendered across a line break as 'Clear\n  archive' are the
 * same label, and normalizing only one side reproduces the exact class of
 * near-miss this is here to remove (the same reasoning route-match.ts:47-53
 * gives for normalizing routes and paths through one `segmentsOf`).
 *
 * Case is NOT folded. A label is a human-authored string, and 'Send' and 'send'
 * are two different things an app might legitimately render side by side —
 * matching them would be a guess, and guessing is the one thing this sensor does
 * not do.
 */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/** Why a live binding is not being watched, or `undefined` when it is. */
export function unwatchedReason(
  edge: AvailableEdge,
  reportedElsewhere?: (edgeId: string) => boolean,
): { readonly blocked: BlockedBy; readonly reason: string } | undefined {
  const binding = edge.binding;
  if (binding === undefined) {
    return { blocked: 'gesture', reason: 'this edge declares no binding, so there is no gesture to recognize' };
  }
  if (binding.kind === 'keychord') {
    return {
      blocked: 'gesture',
      reason: 'a keychord has no chord grammar anywhere in this library yet, so the sensor cannot recognize it',
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
  if (eventTypeFor(binding.actuation) === undefined) {
    return {
      blocked: 'gesture',
      reason: `the sensor does not watch '${binding.actuation}' yet — a pointer gesture has no committed moment to record`,
    };
  }
  // ONE ACT, ONE ROW. An app that already reports this edge through its own door
  // (a humanFire wrapper, a component that fires for itself) would otherwise get
  // TWO ledger rows for one human act — the sensor's, from the capture phase,
  // and the app's, from its own handler. The app names those edges; the sensor
  // stands down and says so out loud in coverage.
  if (reportedElsewhere?.(edge.affordanceId) === true) {
    return {
      blocked: 'door',
      reason: 'the app reports this edge through its own door — the sensor stands down so one act writes one row',
    };
  }
  const verdict = payloadVerdict(edge.expects);
  if (!verdict.ok) return { blocked: 'payload', reason: verdict.reason };
  return undefined; // watchable
}

/**
 * The live edges → the watch-list, the event classes, and the coverage report.
 *
 * Every served edge produces exactly one coverage row, so the count a consumer
 * reads back is the count the graph declared — an edge can never go missing
 * between the two.
 */
export function buildBindingIndex(
  edges: readonly AvailableEdge[],
  reportedElsewhere?: (edgeId: string) => boolean,
): BindingIndex {
  const watched: WatchedBinding[] = [];
  const coverage: BindingCoverage[] = [];
  const byKey = new Map<string, WatchedBinding[]>();
  const eventTypes = new Set<SensorEventType>();

  for (const edge of edges) {
    const blocked = unwatchedReason(edge, reportedElsewhere);
    if (blocked !== undefined) {
      coverage.push(
        Object.freeze({
          edge: edge.affordanceId,
          status: 'unwatched' as const,
          reason: blocked.reason,
          blocked: blocked.blocked,
        }),
      );
      continue;
    }
    // Narrowed by unwatchedReason above: an element binding with a watchable
    // actuation. Re-read rather than carried, so this stays one obvious read.
    const binding = edge.binding as {
      kind: 'element';
      locator: { role: string; name: string };
      actuation: Actuation;
    };
    const entry: WatchedBinding = {
      edge: edge.affordanceId,
      role: binding.locator.role,
      name: normalizeName(binding.locator.name),
      actuation: binding.actuation,
      eventType: eventTypeFor(binding.actuation) as SensorEventType,
      // Copied out of the frozen spec's runtime data as a fresh array: the index
      // owns its own list and can never be the thing that mutates available()'s
      // answer.
      ...(edge.instances !== undefined ? { instances: [...edge.instances] } : {}),
    };
    watched.push(entry);
    eventTypes.add(entry.eventType);
    const key = indexKey(entry.eventType, entry.role, entry.name);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(entry);
    else byKey.set(key, [entry]);
    coverage.push(Object.freeze({ edge: edge.affordanceId, status: 'watching' as const }));
  }

  return { watched, eventTypes: [...eventTypes], byKey, coverage: Object.freeze(coverage) };
}
