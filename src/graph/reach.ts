/**
 * WHERE CAN I GET TO FROM HERE — walked from the app's own navigation claims.
 *
 * Places are a LIST, not a graph: no page declares an edge to another page.
 * What connects them is always an ACTION — a link, a button, a redirect — and
 * an action that declares `effect.navigatesTo` IS the edge. So reachability is
 * DERIVED from declarations already made for other reasons (the claim powers
 * cursor movement and `arrival` corroboration), and there is no page-edge to
 * author, and therefore nothing that can drift.
 *
 * A ROUTE IS NOT A PLAN. A journey is a preferred order toward a goal — that is
 * meaning, and it is declared. This is the mechanical answer to "which declared
 * hops lead there", with no preference expressed beyond fewest hops, which is
 * arithmetic rather than judgement.
 *
 * AND IT IS A CLAIM, NOT A PROMISE. `navigatesTo` is the app's claim about where
 * an action goes; this reports the claim. It does not promise the hops are
 * currently permitted: a guard may be closed, a control greyed, a handler never
 * mounted. Those are answered where they are known — on the row for the action
 * you are actually about to reach for — and are deliberately NOT guessed here
 * for hops you have not arrived at yet, because the state at a page you have
 * not reached is a thing this library cannot see.
 */
import type { Affordance } from '../atom/types.js';

/** One declared hop: take this action, and the app says you land there. */
export interface RouteStep {
  /** The action whose claim makes this hop. */
  action: string;
  /** The page the app claims it leads to. */
  to: string;
}

/**
 * The fewest declared hops from `from` to `to`.
 *
 * - `[]` — you are already there.
 * - `null` — no declared route. Honest absence: nobody claims a path, so none
 *   is invented. It does not mean the app cannot get there by other means it
 *   never declared.
 *
 * Ties are broken by declaration order, deterministically, so the same graph
 * always answers the same way — a stable answer being worth more than a clever
 * one nobody can reproduce.
 */
export function routeBetween(
  affordances: Record<string, Affordance>,
  from: string,
  to: string,
): RouteStep[] | null {
  if (from === to) return [];

  // Hops grouped by origin, in declaration order — built once per call. An
  // action that declares no destination is not an edge and never appears.
  const hopsFrom = new Map<string, RouteStep[]>();
  for (const aff of Object.values(affordances)) {
    const dest = aff.effect?.navigatesTo;
    if (dest === undefined) continue;
    for (const origin of aff.on) {
      const list = hopsFrom.get(origin) ?? [];
      list.push({ action: aff.id, to: dest });
      hopsFrom.set(origin, list);
    }
  }

  // Breadth-first, so the first arrival is a fewest-hops route. Visited is
  // keyed by page: a second way to reach a page cannot be shorter, and a graph
  // with a cycle terminates instead of walking it forever.
  const visited = new Set<string>([from]);
  const queue: { at: string; path: RouteStep[] }[] = [{ at: from, path: [] }];
  while (queue.length > 0) {
    const { at, path } = queue.shift()!;
    for (const hop of hopsFrom.get(at) ?? []) {
      if (visited.has(hop.to)) continue;
      const next = [...path, hop];
      if (hop.to === to) return next;
      visited.add(hop.to);
      queue.push({ at: hop.to, path: next });
    }
  }
  return null;
}
