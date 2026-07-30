/**
 * THE DECLARED LEVEL — the app handed the element over, so identity is OBJECT
 * IDENTITY and no name is ever computed.
 *
 * This is requirement one drawn as an architecture rather than written as a rule.
 * The other level (match.ts) derives a role and a name from the DOM and can
 * therefore be ambiguous, which is why it refuses to carry a value. Here there
 * is nothing to derive: the app said "this element IS this edge", and a
 * declaration may carry the value getter too, so a payload is legal at this
 * level and only at this level.
 *
 * WHY OBJECT IDENTITY MATTERS beyond convenience: a locator carries no instance
 * key, while a fire on a repeats container REQUIRES `opts.instance`
 * (nav-session.ts:685-696). A declaration carries the instance, so one row of a
 * list is reportable here and genuinely is not there.
 *
 * ATTACH REPLACES, AND DETACH IS TOKEN-IDENTITY — the PresenceIndex contract
 * (presence.ts:10-13), for the same reason: setup → cleanup → setup must net to
 * ONE entry, or a React StrictMode double-invoke leaves a stale declaration
 * behind. So a second attach for the same element supersedes the first, and a
 * detach that finds a newer declaration in its slot does nothing rather than
 * deleting somebody else's.
 */
import type { Cadence } from './cadence.js';
import type { SensorElement } from './dom-port.js';

/**
 * A control the app hands over. FIVE fields besides the element, none of them
 * framework-shaped — this is the entire surface a Vue or Angular binding needs
 * (a template ref plus a scope-dispose, an ElementRef plus ngOnDestroy).
 */
export interface ControlDeclaration {
  /** The affordance this control IS. */
  readonly edge: string;
  /** Handed over — never matched by name. */
  readonly element: SensorElement;
  /** One row of a repeats container. */
  readonly instance?: string;
  /**
   * THE DECLARED VALUE, read at report time. The only legal source of a payload
   * anywhere in this subpath (payload.ts).
   */
  readonly value?: () => unknown;
  /** Per-control override of the watcher's cadence (cadence.ts). */
  readonly cadence?: Cadence;
  /**
   * "Is a gesture on this element the act RIGHT NOW?" Asked at the moment of the
   * gesture; absent means always, which is what an ordinary control means.
   *
   * THE TWO-STEP CONTROL IS WHY THIS EXISTS, AND WITHHOLDING THE DECLARATION IS
   * NOT THE ALTERNATIVE IT LOOKS LIKE. A confirm button reads "Clear archive"
   * until it is armed and asks a question afterwards, and the first press clears
   * nothing. An app that simply stopped handing the element over would not stop
   * the report — it would only change which evidence level answers: the resting
   * label IS the action's own locator, so the RECOGNISED level claims the element
   * by name (match.ts) and the ledger gains a clear that never happened.
   *
   * Only the app knows which press is the act, so this is where it says so, and
   * the answer is SILENCE rather than a report: nothing happened that the graph
   * declares. A declaration outranks a name match on the same element, so `false`
   * closes both levels at once — which is the per-element, per-moment stand-down
   * `reportedElsewhere` cannot express, because that one is per-edge and
   * page-wide (types.ts `reportedElsewhere`).
   */
  readonly commits?: () => boolean;
}

/** What binding-index asks about declarations when it builds a coverage row. */
export interface DeclaredEdges {
  /**
   * The declaration this edge would be reported through, if any.
   *
   * "A" rather than "the": two elements may declare one edge (a mobile and a
   * desktop button), and coverage speaks about the EDGE, so the first
   * declaration answers for it. They agree on everything coverage reads — the
   * edge id and whether a value getter exists — in every case where they do not,
   * the app has declared two different things and the honest report is the one it
   * gets from whichever fires.
   */
  forEdge(edge: string): ControlDeclaration | undefined;
}

export interface ControlIndex extends DeclaredEdges {
  /** Register a declaration. Returns the detach that undoes exactly this one. */
  attach(declaration: ControlDeclaration): () => void;
  /**
   * This exact element's declaration, or `undefined`.
   *
   * Deliberately ONE HOP, not a walk: the ancestor climb belongs to match.ts,
   * which has to interleave the two evidence levels hop by hop so the nearer of a
   * declaration and a name match wins. A second walk here would be a second
   * answer to the same question.
   */
  declarationFor(element: SensorElement): ControlDeclaration | undefined;
  /** Every event class the declared controls commit on, given the watcher's cadence. */
  readonly declarations: readonly ControlDeclaration[];
  /** How many controls are declared right now — the teardown proof reads it. */
  readonly size: number;
  /** Drop every declaration. Teardown only. */
  clear(): void;
}

export function createControlIndex(): ControlIndex {
  const byElement = new Map<SensorElement, ControlDeclaration>();
  const byEdge = new Map<string, ControlDeclaration>();

  /** Rebuild the edge lookup from the element map — one derivation, never two lists to sync. */
  function reindexEdges(): void {
    byEdge.clear();
    for (const declaration of byElement.values()) {
      if (!byEdge.has(declaration.edge)) byEdge.set(declaration.edge, declaration);
    }
  }

  return {
    attach(declaration): () => void {
      byElement.set(declaration.element, declaration);
      reindexEdges();
      return () => {
        // Token identity: only the declaration this detach was handed may be
        // removed. A later attach on the same element has already superseded it,
        // and deleting the newer one is how a StrictMode remount ends up
        // unwatched.
        if (byElement.get(declaration.element) !== declaration) return;
        byElement.delete(declaration.element);
        reindexEdges();
      };
    },
    forEdge(edge): ControlDeclaration | undefined {
      return byEdge.get(edge);
    },
    declarationFor(element): ControlDeclaration | undefined {
      return byElement.get(element);
    },
    get declarations(): readonly ControlDeclaration[] {
      return [...byElement.values()];
    },
    get size(): number {
      return byElement.size;
    },
    clear(): void {
      byElement.clear();
      byEdge.clear();
    },
  };
}
