/**
 * PresenceIndex — the pure presence sensor (D18).
 *
 * Registration observes MOUNTED, nothing more. This index is deliberately a
 * plain refcounted data structure that knows nothing about sessions, trees,
 * routers, or footprint — the meaning of presence (dormancy below the router,
 * overlay masking, tab exclusivity, assumed-active defaults) lives one layer
 * up in NavSession, which COMPOSES this with the authored tree.
 *
 * Contract points that make React StrictMode/HMR safe by construction:
 * - Handles are identities: open() returns a token, close(token) is
 *   idempotent per token. setup→cleanup→setup nets to one open handle.
 * - Instance handles (repeats containers) are tracked separately and are
 *   EXCLUDED from the fingerprint — a scrolling virtualized list must never
 *   look like world motion (that scoping rule is enforced here, at the
 *   lowest layer that can).
 * - Visibility is an EXPLICIT signal store (set by show()/setVisible()/the
 *   `visible:` mount option). No amount of mount-counting can see CSS; when
 *   no signal exists the layer above serves honesty markers instead of
 *   guessing.
 */

export interface PresenceHandle {
  readonly node: string;
  readonly instance?: string;
  /** Idempotent. */
  release(): void;
}

export class PresenceIndex {
  #nextToken = 1;
  /** token → what it holds open. */
  readonly #open = new Map<number, { node: string; instance?: string }>();
  /** node → count of open NODE handles (instance handles excluded). */
  readonly #nodeCounts = new Map<string, number>();
  /** node → instance key → count of open instance handles. */
  readonly #instanceCounts = new Map<string, Map<string, number>>();
  /** node → last explicit visibility signal. */
  readonly #visibility = new Map<string, boolean>();

  open(node: string, instance?: string): PresenceHandle {
    const token = this.#nextToken++;
    this.#open.set(token, { node, instance });
    if (instance === undefined) {
      this.#nodeCounts.set(node, (this.#nodeCounts.get(node) ?? 0) + 1);
    } else {
      const byInstance = this.#instanceCounts.get(node) ?? new Map<string, number>();
      byInstance.set(instance, (byInstance.get(instance) ?? 0) + 1);
      this.#instanceCounts.set(node, byInstance);
    }
    const index = this;
    return {
      node,
      instance,
      release() {
        index.#release(token);
      },
    };
  }

  #release(token: number): void {
    const held = this.#open.get(token);
    if (!held) return; // idempotent per handle
    this.#open.delete(token);
    if (held.instance === undefined) {
      const next = (this.#nodeCounts.get(held.node) ?? 1) - 1;
      if (next <= 0) {
        this.#nodeCounts.delete(held.node);
        // A visibility signal describes a mounted thing. When the last handle
        // leaves, the signal leaves with it — otherwise a released modal whose
        // app once said visible:true would mask its page FOREVER (ghost mask).
        // Signals set on never-mounted nodes (the pure-L0 wire) are untouched.
        this.#visibility.delete(held.node);
      } else {
        this.#nodeCounts.set(held.node, next);
      }
    } else {
      const byInstance = this.#instanceCounts.get(held.node);
      if (!byInstance) return;
      const next = (byInstance.get(held.instance) ?? 1) - 1;
      if (next <= 0) byInstance.delete(held.instance);
      else byInstance.set(held.instance, next);
      if (byInstance.size === 0) this.#instanceCounts.delete(held.node);
    }
  }

  /** A node is present when at least one NODE handle is open on it. */
  isPresent(node: string): boolean {
    return (this.#nodeCounts.get(node) ?? 0) > 0;
  }

  presentNodes(): string[] {
    return [...this.#nodeCounts.keys()];
  }

  /** Mounted instance keys of a repeats node (the mounted WINDOW, not existence). */
  instancesOf(node: string): string[] {
    return [...(this.#instanceCounts.get(node)?.keys() ?? [])];
  }

  hasInstance(node: string, instance: string): boolean {
    return (this.#instanceCounts.get(node)?.get(instance) ?? 0) > 0;
  }

  /** True when ANY node handle is open — the signal that presence is in use at all. */
  hasAnyHandles(): boolean {
    return this.#nodeCounts.size > 0;
  }

  /** True when ANY handle (node OR instance) is open — "the mount layer is in use". */
  hasAny(): boolean {
    return this.#open.size > 0;
  }

  setVisible(node: string, visible: boolean): void {
    this.#visibility.set(node, visible);
  }

  /** The explicit signal, or undefined when none was ever given (→ honesty markers above). */
  visibility(node: string): boolean | undefined {
    return this.#visibility.get(node);
  }

  /**
   * The served-structure identity used for coalesced world-motion detection:
   * node presence + visibility signals. Instance churn is EXCLUDED by design.
   */
  fingerprint(): string {
    const nodes = [...this.#nodeCounts.keys()].sort().join('|');
    const vis = [...this.#visibility.entries()]
      .map(([node, visible]) => `${node}=${visible ? 1 : 0}`)
      .sort()
      .join('|');
    return `${nodes}::${vis}`;
  }
}
