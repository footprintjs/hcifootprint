/**
 * Event → what happened. The recognition step, and the only place the sensor
 * decides that a real gesture belongs to a declared edge.
 *
 * TWO EVIDENCE LEVELS, ASKED IN THIS ORDER AT EVERY HOP — the order IS the first
 * requirement drawn as an architecture:
 * 1. DECLARED. Is this element one the app handed over? Object identity, so
 *    there is nothing to compute and nothing to be ambiguous about, and the
 *    declaration may carry a value.
 * 2. RECOGNISED. Otherwise, what role and name does this element present, and
 *    does any live edge's locator claim that? Derived, so a value is never legal.
 *
 * A declaration therefore always beats a name match, including a name match on
 * the very same element: the app's own statement outranks the sensor's reading of
 * the page.
 *
 * THE ANCESTOR WALK: a human clicks the `<span>` inside a `<button>`, and the
 * event's target is the span. So the walk starts at the target and climbs,
 * stopping at the FIRST element either level claims. Nearest wins — a declared
 * button inside a declared toolbar is the button.
 *
 * FIVE ANSWERS, AND THE LAST TWO ARE WHY THIS FILE IS HONEST:
 * - one candidate → this gesture is that edge;
 * - two or more → REFUSE. Two live edges answering to one role+name is real
 *   ambiguity, and picking one would be a coin flip recorded as a fact.
 * - none, on a control the graph never declared → off-graph, said out loud;
 * - none, on a control the graph DOES declare but not at this moment → SILENT.
 *   Enter on a `<button>` fires keydown and then a browser-generated click; the
 *   keydown is not that button's moment, and saying "off-graph" about a control
 *   the sensor knows perfectly well would be noise the consumer has to learn to
 *   ignore.
 * - nothing role-bearing at all → SILENT. Clicking a paragraph is not an
 *   interaction the graph failed to declare.
 *
 * INSTANCES FOLD IN HERE, not as a special case. An edge on a repeats container
 * (a Reply button on every ticket) serves its live instance keys
 * (atom/types.ts:602, stamped at nav-session.ts:657). One live instance → one
 * candidate carrying it. Several → several candidates, which the "two or more"
 * arm already refuses, because from role+name alone the sensor genuinely cannot
 * tell which row was clicked — the declared level is where a list row is
 * reportable. None → no candidate at all: there is no instance to name, so this
 * edge is not a thing that could have happened.
 */
import type { Cadence, SensorEventType } from './cadence.js';
import type { BindingIndex, RecognisedEdge } from './binding-index.js';
import type { ControlDeclaration, ControlIndex } from './control-index.js';
import type { SensorDocument, SensorElement, SensorRoot } from './dom-port.js';
import { momentKey, nameKey } from './binding-index.js';
import { commitsOnControl } from './cadence.js';
import { computeRole } from './role.js';
import { computeAccessibleName } from './accessible-name.js';

/** The walk's ceiling. Deeper than any real control nesting, shallow enough to be a bound. */
const MAX_HOPS = 64;

/** One thing that could have happened: an edge, plus the instance it happened on. */
export interface MatchCandidate {
  readonly edge: string;
  readonly instance?: string;
}

export type MatchOutcome =
  /** Exactly one thing happened. `declaration` present = the DECLARED level answered. */
  | {
      readonly kind: 'one';
      readonly candidate: MatchCandidate;
      readonly element: SensorElement;
      readonly declaration?: ControlDeclaration;
    }
  /** Two or more live edges answer to one role+name+moment. The sensor refuses to pick. */
  | { readonly kind: 'many'; readonly candidates: readonly string[] }
  /** Real motion on a real control the graph never declared. */
  | { readonly kind: 'off-graph'; readonly role: string; readonly name: string }
  /** Recognised, but this is not its moment — or nothing recognisable was touched. */
  | { readonly kind: 'silent' };

/**
 * How a candidate is named in a report: the edge id, and the instance in brackets
 * when it has one — the same `id[instance]` notation fromLiveStore already uses
 * for an action's identity (from-live-store.ts:74-78).
 */
export function candidateLabel(candidate: MatchCandidate): string {
  return candidate.instance === undefined ? candidate.edge : `${candidate.edge}[${candidate.instance}]`;
}

/** A recognised edge → the concrete things it could have been, right now. */
function candidatesOf(entry: RecognisedEdge): MatchCandidate[] {
  if (entry.instances === undefined) return [{ edge: entry.edge }];
  return entry.instances.map((instance) => ({ edge: entry.edge, instance }));
}

/** What a declaration turns into once its moment matches. */
function declaredCandidate(declaration: ControlDeclaration): MatchCandidate {
  return declaration.instance === undefined
    ? { edge: declaration.edge }
    : { edge: declaration.edge, instance: declaration.instance };
}

/**
 * Walk from the event target up to (and including) the delegation root, and
 * answer what the gesture was.
 *
 * The walk is BOUNDED. A parent chain that never ends — a malformed or
 * deliberately cyclic tree — must not hang the page the sensor is a guest on.
 */
export function matchElement(
  index: BindingIndex,
  controls: ControlIndex,
  cadence: Cadence,
  eventType: SensorEventType,
  target: SensorElement | null,
  root: SensorRoot,
  document?: SensorDocument,
): MatchOutcome {
  let node: SensorElement | null = target;
  // The deepest role-bearing element the walk saw — what an off-graph report
  // names. It is the control the human actually touched, not the outermost thing
  // that happened to contain it.
  let touchedRole = '';
  let touchedName = '';
  // Set when the walk passed a control the graph DOES declare but that cannot be
  // reported right now — wrong moment, an unwatched edge, or a repeats row with no
  // live instances. All three mean the same thing to a consumer: the sensor knows
  // this control, so calling it off-graph would be false. Decided at the END,
  // because an inner span may be unknown while the button around it is not.
  let knownButNotNow = false;

  for (let hops = 0; node !== null && hops < MAX_HOPS; hops += 1) {
    const declaration = controls.declarationFor(node);
    if (declaration !== undefined) {
      // DECLARED wins here, and its moment is the only thing left to check.
      const moment = commitsOnControl(computeRole(node), declaration.cadence ?? cadence);
      if (moment === eventType) {
        return { kind: 'one', candidate: declaredCandidate(declaration), element: node, declaration };
      }
      return { kind: 'silent' };
    }

    const role = computeRole(node);
    if (role !== '') {
      const name = computeAccessibleName(node, document);
      if (touchedRole === '') {
        touchedRole = role;
        touchedName = name;
      }
      const claimed = index.byMoment.get(momentKey(eventType, role, name));
      if (claimed !== undefined) {
        const candidates = claimed.flatMap(candidatesOf);
        if (candidates.length === 1) {
          return { kind: 'one', candidate: candidates[0] as MatchCandidate, element: node };
        }
        if (candidates.length > 1) {
          return { kind: 'many', candidates: candidates.map(candidateLabel) };
        }
        // Zero live instances: this edge could not have happened here. Keep
        // climbing — an enclosing declared control may still own the gesture.
      }
      if (index.declaredNames.has(nameKey(role, name))) knownButNotNow = true;
    }
    if ((node as object) === (root as object)) break;
    node = node.parentElement;
  }

  if (knownButNotNow || touchedRole === '') return { kind: 'silent' };
  return { kind: 'off-graph', role: touchedRole, name: touchedName };
}
