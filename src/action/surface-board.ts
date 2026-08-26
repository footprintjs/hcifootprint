/**
 * surface-board — one composed unit owning surfaces and the gap record.
 *
 * Declarations, matching, and the counted misses live together because they
 * are one story: what can be served, who asked, and what nobody could
 * serve. The board asks the KindGovernor for every kind it touches —
 * queries included, or the gap record fills with typos.
 * @internal
 */
import type {
  ChannelGap,
  SurfaceDeclaration,
  SurfaceHandle,
  SurfaceQuery,
} from './channels.js';
import type { KindGovernor } from './kind-governor.js';

export class SurfaceBoard {
  readonly #governor: KindGovernor;
  readonly #surfaces = new Map<string, SurfaceDeclaration>();
  readonly #gaps = new Map<
    string,
    { kind: string; channel: 'collects' | 'shows'; asks: number }
  >();

  constructor(governor: KindGovernor) {
    this.#governor = governor;
  }

  declare(declaration: SurfaceDeclaration): SurfaceHandle {
    if (
      declaration === null ||
      typeof declaration !== 'object' ||
      typeof declaration.surface !== 'string' ||
      declaration.surface.trim().length === 0 ||
      typeof declaration.node !== 'string' ||
      declaration.node.trim().length === 0
    ) {
      throw new TypeError(
        'hcifootprint: declareSurface() needs a record with a non-empty surface id and node path.',
      );
    }
    if (this.#surfaces.has(declaration.surface)) {
      throw new Error(
        `hcifootprint: surface '${declaration.surface}' is already declared and live — one id, one surface. Retire the live one first, or name this one for what it actually is.`,
      );
    }
    const collects = Object.freeze([...(declaration.collects ?? [])]);
    const shows = Object.freeze([...(declaration.shows ?? [])]);
    for (const kind of collects) {
      this.#governor.govern(kind, `surface '${declaration.surface}' collects`);
    }
    for (const kind of shows) {
      this.#governor.govern(kind, `surface '${declaration.surface}' shows`);
    }
    const frozen: SurfaceDeclaration = Object.freeze({
      surface: declaration.surface,
      node: declaration.node,
      collects,
      shows,
    });
    this.#surfaces.set(frozen.surface, frozen);
    let live = true;
    return Object.freeze({
      declaration: frozen,
      retire: () => {
        // Idempotent and OWNED: only the surface this handle declared is
        // retired — a successor under the same id belongs to its own handle,
        // and a stale retire must never take it down.
        if (!live) return false;
        live = false;
        if (this.#surfaces.get(frozen.surface) === frozen) {
          this.#surfaces.delete(frozen.surface);
        }
        return true;
      },
    });
  }

  surfacesFor(query: SurfaceQuery): readonly SurfaceDeclaration[] {
    const collecting = 'collects' in query;
    const kind = collecting
      ? (query as { collects: string }).collects
      : (query as { shows: string }).shows;
    if (typeof kind !== 'string' || kind.trim().length === 0) {
      throw new TypeError(
        'hcifootprint: surfacesFor() needs { collects: kind } or { shows: kind } with a non-empty kind.',
      );
    }
    // A query is kind-governed like a declaration — otherwise the gap
    // record fills with typos and stops meaning anything.
    this.#governor.govern(kind, 'surfacesFor() asks about');
    const channel = collecting ? ('collects' as const) : ('shows' as const);
    const matches = [...this.#surfaces.values()].filter((surface) =>
      (collecting ? surface.collects : surface.shows)?.includes(kind),
    );
    if (matches.length === 0) {
      // THE DEGRADATION RECORD — the ask is a fact worth keeping. An empty
      // answer alone would be absence rendered as silence; the counted gap
      // is what turns a month of degraded turns into a backlog.
      const key = `${channel}:${kind}`;
      const row = this.#gaps.get(key);
      if (row === undefined) {
        this.#gaps.set(key, { kind, channel, asks: 1 });
      } else {
        row.asks += 1;
      }
    }
    return Object.freeze(matches);
  }

  gaps(): readonly ChannelGap[] {
    return Object.freeze(
      [...this.#gaps.values()]
        .map((row) => Object.freeze({ ...row }))
        .sort((a, b) =>
          a.kind === b.kind
            ? a.channel.localeCompare(b.channel)
            : a.kind.localeCompare(b.kind),
        ),
    );
  }
}
