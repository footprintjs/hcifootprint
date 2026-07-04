/**
 * ToolRegistry — the LIVE-BINDING layer (D13: declare statically, bind dynamically).
 *
 * The declared graph is the map; this registry is what's actually wired right
 * now: affordanceId → the app's real handler function, registered in GROUPS
 * (one per component/section) so unmount cleanup is a single call.
 *
 * Deliberately knows nothing about sessions, guards, or footprint — a plain
 * data structure so this layer tests in isolation.
 *
 * Semantics:
 * - Last registration wins per affordance (React StrictMode double-mounts;
 *   a dev warning fires so real duplicates are visible).
 * - unregisterGroup(g) removes only registrations whose CURRENT owner is g —
 *   if group B re-registered an id after group A, A's unmount cannot tear
 *   down B's live binding.
 * - Registration carries NO planner-facing strings (descriptions/guards live
 *   in the declared spec — the prompt-injection firewall).
 */

export type ToolHandler = (payload?: unknown) => unknown | Promise<unknown>;

export interface Registration {
  affordanceId: string;
  group: string;
  handler: ToolHandler;
  registeredAt: number;
  /**
   * False when the control is on screen but not currently clickable (a greyed
   * button). The tool is still SERVED to the agent — with an honesty marker —
   * but firing it is refused as TOOL_DISABLED. Default true.
   */
  enabled: boolean;
}

export class ToolRegistry {
  readonly #byAffordance = new Map<string, Registration>();
  readonly #warn: (message: string) => void;

  constructor(warn?: (message: string) => void) {
    this.#warn = warn ?? ((message) => console.warn(message));
  }

  register(group: string, affordanceId: string, handler: ToolHandler, enabled = true): void {
    const existing = this.#byAffordance.get(affordanceId);
    if (existing) {
      this.#warn(
        `hcifootprint: '${affordanceId}' re-registered by group '${group}' (previously '${existing.group}') — ` +
          `last registration wins. Common causes: a component mounted twice without unregistering, or two ` +
          `components claiming the same action.`,
      );
    }
    this.#byAffordance.set(affordanceId, { affordanceId, group, handler, registeredAt: Date.now(), enabled });
  }

  /**
   * Flip a registered tool between clickable and greyed-out. Returns true if
   * the state actually changed (so the caller can bump the version / emit only
   * on a real change). No-op + false if the id isn't registered.
   */
  setEnabled(affordanceId: string, enabled: boolean): boolean {
    const reg = this.#byAffordance.get(affordanceId);
    if (!reg || reg.enabled === enabled) return false;
    reg.enabled = enabled;
    return true;
  }

  /** Whether a registered tool is currently clickable. Undefined if not registered. */
  isEnabled(affordanceId: string): boolean | undefined {
    return this.#byAffordance.get(affordanceId)?.enabled;
  }

  /** Remove every registration currently owned by `group`. Returns the removed ids. */
  unregisterGroup(group: string): string[] {
    const removed: string[] = [];
    for (const [id, reg] of this.#byAffordance) {
      if (reg.group === group) {
        this.#byAffordance.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  handlerFor(affordanceId: string): ToolHandler | undefined {
    return this.#byAffordance.get(affordanceId)?.handler;
  }

  isRegistered(affordanceId: string): boolean {
    return this.#byAffordance.has(affordanceId);
  }

  /** True when anything is registered — the signal that materialization is meaningful. */
  hasAny(): boolean {
    return this.#byAffordance.size > 0;
  }

  registrations(): Registration[] {
    return [...this.#byAffordance.values()].map((r) => ({ ...r }));
  }
}
