/**
 * Event → candidate edges. The recognition step, and the only place the sensor
 * decides that a real gesture belongs to a declared one.
 *
 * THE ANCESTOR WALK: a human clicks the `<span>` inside a `<button>`, and the
 * event's target is the span. So the walk starts at the target and climbs,
 * asking each element "what role and name do you present, and does any live
 * binding claim that?" — and stops at the FIRST element that any binding claims.
 * Nearest wins: a declared button inside a declared toolbar is the button.
 *
 * THREE ANSWERS, AND THE THIRD IS THE POINT:
 * - exactly one candidate → this gesture is that edge;
 * - none → the sensor recognized a control the graph does not declare (or no
 *   control at all), and it says so rather than attaching the motion to the
 *   nearest plausible edge;
 * - two or more → REFUSE. Two live edges answering to one role+name is real
 *   ambiguity, and picking one would be a coin flip recorded as a fact.
 *
 * INSTANCES FOLD IN HERE, not as a special case. An edge on a repeats container
 * (a Reply button on every ticket) serves its live instance keys
 * (atom/types.ts:547, stamped at nav-session.ts:657). One live instance → one
 * candidate carrying it. Several → several candidates, which the "two or more"
 * arm already refuses, because from role+name alone the sensor genuinely cannot
 * tell which row was clicked. None → no candidate at all: there is no instance
 * to name, so this edge simply is not a thing that could have happened.
 */
import type { SensorDocument, SensorElement, SensorRoot } from './dom-port.js';
import type { BindingIndex, SensorEventType, WatchedBinding } from './binding-index.js';
import { indexKey } from './binding-index.js';
import { computeRole } from './role.js';
import { computeAccessibleName } from './accessible-name.js';

/** One thing that could have happened: an edge, plus the instance it happened on. */
export interface MatchCandidate {
  readonly binding: WatchedBinding;
  readonly instance?: string;
}

export type MatchOutcome =
  | { readonly kind: 'one'; readonly candidate: MatchCandidate; readonly element: SensorElement }
  /** `role` is '' when nothing in the chain even presented as a control. */
  | { readonly kind: 'none'; readonly role: string; readonly name: string }
  | { readonly kind: 'many'; readonly candidates: readonly string[] };

/**
 * How an ambiguous candidate is named in the report: the edge id, and the
 * instance in brackets when it has one — the same `id[instance]` notation
 * fromLiveStore already uses for an action's identity (from-live-store.ts:74-78).
 */
export function candidateLabel(candidate: MatchCandidate): string {
  return candidate.instance === undefined
    ? candidate.binding.edge
    : `${candidate.binding.edge}[${candidate.instance}]`;
}

/** A watched binding → the concrete things it could have been, right now. */
function candidatesOf(binding: WatchedBinding): MatchCandidate[] {
  if (binding.instances === undefined) return [{ binding }];
  return binding.instances.map((instance) => ({ binding, instance }));
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
  eventType: SensorEventType,
  target: SensorElement | null,
  root: SensorRoot,
  document?: SensorDocument,
): MatchOutcome {
  let node: SensorElement | null = target;
  // The deepest role-bearing element the walk saw — what an off-graph report
  // names. It is the control the human actually touched, not the outermost
  // thing that happened to contain it.
  let touchedRole = '';
  let touchedName = '';

  for (let hops = 0; node !== null && hops < 64; hops += 1) {
    const role = computeRole(node);
    if (role !== '') {
      const name = computeAccessibleName(node, document);
      if (touchedRole === '') {
        touchedRole = role;
        touchedName = name;
      }
      const bindings = index.byKey.get(indexKey(eventType, role, name));
      if (bindings !== undefined) {
        const candidates = bindings.flatMap(candidatesOf);
        if (candidates.length === 1) {
          return { kind: 'one', candidate: candidates[0] as MatchCandidate, element: node };
        }
        if (candidates.length > 1) {
          return { kind: 'many', candidates: candidates.map(candidateLabel) };
        }
        // Zero live instances: this edge could not have happened here. Keep
        // climbing — an enclosing declared control may still own the gesture.
      }
    }
    if ((node as unknown) === (root as unknown)) break;
    node = node.parentElement;
  }

  return { kind: 'none', role: touchedRole, name: touchedName };
}
