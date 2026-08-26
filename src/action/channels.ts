/**
 * CHANNELS — the frontend as the I/O device for a skill.
 *
 * An action declares what it needs and makes BY KIND (`needs`, `produces`);
 * a SURFACE declares what it can serve: `collects` — kinds it can obtain
 * from a person; `shows` — kinds it can render. The runtime binds them
 * where kinds match, and SAYS SO WHERE THEY DON'T — the degradation record
 * is the point, not the fallback: after a month, `channelGaps()` answers
 * "what did skills need that no surface could serve?", which is a product
 * backlog written by actual usage instead of guessing.
 *
 * An action never names a page, and a surface never names an action. Both
 * name KINDS, and the catalog (`declareKinds`) governs the vocabulary —
 * so a moved page cannot break a skill, and a headless run loses nothing
 * but the nicety.
 */

/** What one surface can serve. Kinds, never actions; a node, never a URL. */
export interface SurfaceDeclaration {
  /** The surface's own id — refused when a live surface already holds it. */
  readonly surface: string;
  /** Where it lives in the application graph. */
  readonly node: string;
  /** Kinds this surface can obtain from a person. */
  readonly collects?: readonly string[];
  /** Kinds this surface can render. */
  readonly shows?: readonly string[];
}

export interface SurfaceHandle {
  readonly declaration: SurfaceDeclaration;
  /** Retiring is idempotent and final: a retired surface serves no match,
   *  and its id may be declared again by a successor. Returns whether this
   *  call was the one that retired it. */
  retire(): boolean;
}

/** One question: who can collect this kind, or who can show it. */
export type SurfaceQuery =
  | { readonly collects: string }
  | { readonly shows: string };

/**
 * One recorded absence — a kind somebody needed served and nothing could.
 * Counted, because "asked once in a test" and "asked forty times a day"
 * are different priorities wearing the same row.
 */
export interface ChannelGap {
  readonly kind: string;
  readonly channel: 'collects' | 'shows';
  readonly asks: number;
}
