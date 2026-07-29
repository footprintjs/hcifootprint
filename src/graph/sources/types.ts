/**
 * Growable graph sources — the descriptions an app ALREADY owns (a route
 * table, a set of journeys) become graph input instead of being re-typed by
 * hand into the definition. A source is a plain tagged VALUE: a factory reads
 * the app's truth once, snapshots it, and hands the snapshot to
 * buildNavigationGraph via `def.sources`. The graph reads the owner's truth
 * instead of copying it — the duplication (and its drift) goes to zero.
 *
 * The documented merge order (enforced in graph/sources/merge.ts):
 *
 *   "Pages first (routes then hand-authored, hand-authored wins), journeys
 *    overlay second and may only add, live actions attach last and only bind —
 *    nothing later in the order may remove anything earlier."
 *
 * This module is types only (erased at build). The union below carries the
 * STATIC members; live sources arrive in a later release WITH their attach
 * machinery — the order sentence above already reserves their place (last,
 * bind-only). A union member whose machinery does not exist yet would be a
 * typed lie, so the union grows when the machinery does.
 */
import type { PageNodeDef, SkillDef2 } from '../../tree/types.js';

/**
 * A route table read as pages — the spine. `PageIds` carries the page names
 * through `const` inference so a source-contributed page is a REAL typed node
 * path on the compiled graph (registerToolGroup/show/setVisible accept it;
 * a typo stays a compile error).
 */
export interface RoutesSource<PageIds extends string = string> {
  readonly kind: 'routes';
  readonly pages: Record<PageIds, PageNodeDef>;
}

/** A journey list read as skills — overlaid on the spine; may only add. */
export interface JourneysSource {
  readonly kind: 'journeys';
  readonly skills: Record<string, SkillDef2>;
}

/** Everything `def.sources` accepts today. Static members only — see the module header. */
export type GraphSource = RoutesSource | JourneysSource;
