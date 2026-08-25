/**
 * ActionRegistry — the LIVE-BINDING layer (D13: declare statically, bind dynamically).
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
 * - Structured binding registrations are many-per-definition. The old
 *   affordance-level lookup remains a last-wins compatibility projection;
 *   binding-level lookup always selects the exact live connection.
 * - unregisterGroup(g) removes only registrations whose CURRENT owner is g —
 *   if group B re-registered an id after group A, A's unmount cannot tear
 *   down B's live binding.
 * - Registration carries NO planner-facing strings (descriptions/guards live
 *   in the declared spec — the prompt-injection firewall).
 */

import type { Binding } from '../atom/types.js';
import type {
  ActionBindingRef,
  ActionDefinitionRef,
  BindingCoverage,
  HumanReporting,
} from '../action/types.js';
import { assertBindingCoverage } from '../action/coverage.js';

export type ActionHandler = (payload?: unknown) => unknown | Promise<unknown>;

export interface Registration {
  affordanceId: string;
  group: string;
  handler: ActionHandler;
  registeredAt: number;
  /**
   * False when the control is on screen but not currently clickable (a greyed
   * button). The tool is still SERVED to the agent — with an honesty marker —
   * but firing it is refused as TOOL_DISABLED. Default true.
   */
  enabled: boolean;
  /**
   * The app's own label for "this control is working right now" (the spinner in
   * the button). Absent means the app has not said — never "not busy". Purely a
   * carried fact: this layer neither reads it nor times it out.
   */
  busy?: string;
  /**
   * Structured identity for registrations made through the Action Binding
   * Protocol. Absent on the legacy flat registration door, which was never
   * handed a node or instance and must not invent either one.
   */
  binding?: ActionBindingRef;
}

/**
 * One registration whose structured binding identity is known.
 */
export interface BindingRegistration extends Registration {
  binding: ActionBindingRef;
  coverage: BindingCoverage;
  attached: boolean;
  locators: readonly Binding[];
  humanReporting?: HumanReporting;
  input?: () => unknown;
  readEnabled?: () => boolean | undefined;
  readBusy?: () => string | undefined;
  /** Increments whenever committed binding facts change. */
  revision: number;
}

/** @inline */
export interface BindingRegistrationOptions {
  coverage?: BindingCoverage;
  attached?: boolean;
  locators?: readonly Binding[];
  humanReporting?: HumanReporting;
  input?: () => unknown;
  readEnabled?: () => boolean | undefined;
  readBusy?: () => string | undefined;
}

/**
 * What `update` accepts — the same shape as registration, said out loud.
 *
 * An ALIAS rather than an empty interface extending the other. The two are
 * identical today and the name still earns its place: `update(ref, options)`
 * reads as though a registration is being replaced, where
 * `update(ref, update)` says a partial change is being applied, and the call
 * site is where that distinction is read. An empty `extends` claims the two
 * shapes are already diverging when they are not — it is an alias wearing a
 * type's clothes, and the next reader has to open both to find out nothing is
 * there. If update ever does take a field registration cannot, this becomes an
 * interface again on that day, and the change will be visible in the diff
 * instead of having been pre-announced by an empty body.
 */
export type BindingRegistrationUpdate = BindingRegistrationOptions;

interface RegistryEntry extends Registration {
  /** Internal token. Structured bindings use bindingId; legacy rows get an opaque id. */
  token: string;
  coverage?: BindingCoverage;
  attached?: boolean;
  locators?: readonly Binding[];
  humanReporting?: HumanReporting;
  input?: () => unknown;
  readEnabled?: () => boolean | undefined;
  readBusy?: () => string | undefined;
  revision?: number;
}

export class ActionRegistry {
  /** The canonical live store. Every connection exists exactly once, by token. */
  readonly #byToken = new Map<string, RegistryEntry>();
  /** Existing action-level APIs project through the newest token for that action. */
  readonly #activeByAffordance = new Map<string, string>();
  /** The legacy winner is tracked separately so it can never erase a sibling binding. */
  readonly #legacyByAffordance = new Map<string, string>();
  readonly #warn: (message: string) => void;
  #legacySeq = 0;

  constructor(warn?: (message: string) => void) {
    this.#warn = warn ?? ((message) => console.warn(message));
  }

  register(
    group: string,
    affordanceId: string,
    handler: ActionHandler,
    enabled = true,
    busy?: string,
  ): void {
    const existingToken = this.#activeByAffordance.get(affordanceId);
    const existing =
      existingToken === undefined
        ? undefined
        : this.#byToken.get(existingToken);
    if (existing) {
      this.#warn(
        `hcifootprint: '${affordanceId}' re-registered by group '${group}' (previously '${existing.group}') — ` +
          `last registration wins. Common causes: a component mounted twice without unregistering, or two ` +
          `components claiming the same action.`,
      );
    }
    // Preserve the legacy door's last-wins semantics without deleting a
    // structured sibling that happens to be the action-level projection.
    const previousLegacy = this.#legacyByAffordance.get(affordanceId);
    if (previousLegacy !== undefined) this.#byToken.delete(previousLegacy);
    const token = `legacy-binding#${(this.#legacySeq += 1)}`;
    this.#byToken.set(token, {
      token,
      affordanceId,
      group,
      handler,
      registeredAt: Date.now(),
      enabled,
      // Presence-only, all the way down: an unsaid busy is an ABSENT key here
      // too, so nothing downstream can read a stored `undefined` as a state.
      ...(busy !== undefined ? { busy } : {}),
    });
    this.#legacyByAffordance.set(affordanceId, token);
    this.#activeByAffordance.set(affordanceId, token);
  }

  /**
   * Register one exact live binding. Unlike the compatibility door above, a
   * second binding of the same definition coexists and receives no duplicate
   * warning: one definition mounted in many rows is the intended shape.
   */
  registerBinding(
    group: string,
    binding: ActionBindingRef,
    handler: ActionHandler,
    enabled = true,
    busy?: string,
    options: BindingRegistrationOptions = {},
  ): void {
    const token = binding.bindingId;
    if (!token) {
      throw new TypeError(
        'hcifootprint: a structured action binding needs a non-empty bindingId.',
      );
    }
    const coverage = options.coverage ?? 'executable';
    assertBindingCoverage(coverage, `binding '${token}'`);
    const existing = this.#byToken.get(token);
    if (existing !== undefined) {
      if (existing.binding !== binding) {
        throw new TypeError(
          `hcifootprint: bindingId '${token}' is already owned by another registration.`,
        );
      }
      this.#warn(
        `hcifootprint: binding '${token}' re-registered by group '${group}' (previously '${existing.group}') — ` +
          `the newer registration owns that exact binding identity.`,
      );
      // Map order is the compatibility projection's recency source. Move this
      // exact ref to the end so a later fallback promotes the actual newest.
      this.#byToken.delete(token);
    }
    const affordanceId = binding.definition.definitionId;
    this.#byToken.set(token, {
      token,
      affordanceId,
      group,
      handler,
      registeredAt: Date.now(),
      enabled,
      binding,
      coverage,
      attached: options.attached ?? false,
      locators: options.locators ?? Object.freeze([]),
      ...(options.humanReporting !== undefined
        ? { humanReporting: options.humanReporting }
        : {}),
      ...(options.input !== undefined ? { input: options.input } : {}),
      ...(options.readEnabled !== undefined
        ? { readEnabled: options.readEnabled }
        : {}),
      ...(options.readBusy !== undefined ? { readBusy: options.readBusy } : {}),
      revision: (existing?.revision ?? -1) + 1,
      ...(busy !== undefined ? { busy } : {}),
    });
    this.#activeByAffordance.set(affordanceId, token);
  }

  /**
   * Flip a registered tool between clickable and greyed-out. Returns true if
   * the state actually changed (so the caller can bump the version / emit only
   * on a real change). No-op + false if the id isn't registered.
   */
  setEnabled(affordanceId: string, enabled: boolean): boolean {
    const reg = this.#activeRegistration(affordanceId);
    if (!reg || reg.enabled === enabled) return false;
    reg.enabled = enabled;
    if (reg.binding !== undefined) reg.revision = (reg.revision ?? 0) + 1;
    return true;
  }

  /**
   * Say (or stop saying) that a registered tool is working right now. Same
   * contract as setEnabled: true only on a real change, so the caller bumps the
   * world exactly once. `undefined` DELETES the key rather than storing one —
   * absence is how this library spells "the app has not said".
   */
  setBusy(affordanceId: string, busy: string | undefined): boolean {
    const reg = this.#activeRegistration(affordanceId);
    if (!reg || reg.busy === busy) return false;
    if (busy === undefined) delete reg.busy;
    else reg.busy = busy;
    if (reg.binding !== undefined) reg.revision = (reg.revision ?? 0) + 1;
    return true;
  }

  /** Whether a registered tool is currently clickable. Undefined if not registered. */
  isEnabled(affordanceId: string): boolean | undefined {
    return this.#activeRegistration(affordanceId)?.enabled;
  }

  /** The app's own busy label for a registered tool, or undefined if it has not said. */
  busyOf(affordanceId: string): string | undefined {
    return this.#activeRegistration(affordanceId)?.busy;
  }

  /** Remove every registration currently owned by `group`. Returns the removed ids. */
  unregisterGroup(group: string): string[] {
    const removed: string[] = [];
    for (const [token, reg] of [...this.#byToken]) {
      if (reg.group === group) {
        this.#byToken.delete(token);
        removed.push(reg.affordanceId);
        if (this.#activeByAffordance.get(reg.affordanceId) === token) {
          this.#promoteNewest(reg.affordanceId);
        }
        if (this.#legacyByAffordance.get(reg.affordanceId) === token) {
          this.#legacyByAffordance.delete(reg.affordanceId);
        }
      }
    }
    return [...new Set(removed)];
  }

  handlerFor(affordanceId: string): ActionHandler | undefined {
    return this.#activeRegistration(affordanceId)?.handler;
  }

  isRegistered(affordanceId: string): boolean {
    return this.#activeRegistration(affordanceId) !== undefined;
  }

  /** True when anything is registered — the signal that materialization is meaningful. */
  hasAny(): boolean {
    return this.#byToken.size > 0;
  }

  registrations(): Registration[] {
    return [...this.#byToken.values()].map(({ token: _token, ...r }) => ({
      ...r,
    }));
  }

  /** Every structured live binding, without the legacy compatibility rows. */
  bindingRegistrations(): BindingRegistration[] {
    const rows: BindingRegistration[] = [];
    for (const entry of this.#byToken.values()) {
      if (entry.binding === undefined) continue;
      const { token: _token, ...registration } = entry;
      rows.push({
        ...registration,
        binding: entry.binding,
      } as BindingRegistration);
    }
    return rows;
  }

  /** Resolve the handler for one exact structured binding. */
  handlerForBinding(binding: ActionBindingRef): ActionHandler | undefined {
    return this.#bindingEntry(binding)?.handler;
  }

  /** A copy of one exact structured registration, or nothing once disconnected. */
  registrationFor(binding: ActionBindingRef): BindingRegistration | undefined {
    const entry = this.#bindingEntry(binding);
    if (entry?.binding === undefined) return undefined;
    const { token: _token, ...registration } = entry;
    return { ...registration, binding: entry.binding } as BindingRegistration;
  }

  /** Every live binding of one definition, in connection order. */
  bindingsFor(definition: ActionDefinitionRef): BindingRegistration[] {
    const rows: BindingRegistration[] = [];
    for (const entry of this.#byToken.values()) {
      if (
        entry.binding?.definition !== definition ||
        entry.binding === undefined
      ) {
        continue;
      }
      const { token: _token, ...registration } = entry;
      rows.push({
        ...registration,
        binding: entry.binding,
      } as BindingRegistration);
    }
    return rows;
  }

  /** Flip enabledness on one binding without changing any sibling. */
  setBindingEnabled(binding: ActionBindingRef, enabled: boolean): boolean {
    const entry = this.#bindingEntry(binding);
    if (entry === undefined || entry.enabled === enabled) return false;
    entry.enabled = enabled;
    entry.revision = (entry.revision ?? 0) + 1;
    return true;
  }

  /** Set or clear the busy label on one binding without changing any sibling. */
  setBindingBusy(binding: ActionBindingRef, busy: string | undefined): boolean {
    const entry = this.#bindingEntry(binding);
    if (entry === undefined || entry.busy === busy) return false;
    if (busy === undefined) delete entry.busy;
    else entry.busy = busy;
    entry.revision = (entry.revision ?? 0) + 1;
    return true;
  }

  /** Replace committed facts for one stable binding identity. */
  updateBinding(
    binding: ActionBindingRef,
    update: BindingRegistrationUpdate,
  ): boolean {
    const entry = this.#bindingEntry(binding);
    if (entry?.binding === undefined) return false;
    let changed = false;
    if (update.coverage !== undefined) {
      assertBindingCoverage(
        update.coverage,
        `binding '${entry.binding.bindingId}'`,
      );
      if (entry.coverage !== update.coverage) {
        entry.coverage = update.coverage;
        changed = true;
      }
    }
    if (update.attached !== undefined && entry.attached !== update.attached) {
      entry.attached = update.attached;
      changed = true;
    }
    if (update.locators !== undefined && entry.locators !== update.locators) {
      entry.locators = update.locators;
      changed = true;
    }
    if ('humanReporting' in update) {
      if (entry.humanReporting !== update.humanReporting) {
        if (update.humanReporting === undefined) delete entry.humanReporting;
        else entry.humanReporting = update.humanReporting;
        changed = true;
      }
    }
    if ('input' in update) {
      if (entry.input !== update.input) {
        if (update.input === undefined) delete entry.input;
        else entry.input = update.input;
        changed = true;
      }
    }
    if ('readEnabled' in update) {
      if (entry.readEnabled !== update.readEnabled) {
        if (update.readEnabled === undefined) delete entry.readEnabled;
        else entry.readEnabled = update.readEnabled;
        changed = true;
      }
    }
    if ('readBusy' in update) {
      if (entry.readBusy !== update.readBusy) {
        if (update.readBusy === undefined) delete entry.readBusy;
        else entry.readBusy = update.readBusy;
        changed = true;
      }
    }
    if (changed) entry.revision = (entry.revision ?? 0) + 1;
    return changed;
  }

  /** Mark an attachment-host replacement whose public facts are otherwise equal. */
  touchBinding(binding: ActionBindingRef): boolean {
    const entry = this.#bindingEntry(binding);
    if (entry?.binding === undefined) return false;
    entry.revision = (entry.revision ?? 0) + 1;
    return true;
  }

  /** Disconnect one exact binding. Idempotent. */
  unregisterBinding(binding: ActionBindingRef): boolean {
    const entry = this.#bindingEntry(binding);
    if (entry?.binding === undefined) return false;
    const token = entry.binding.bindingId;
    this.#byToken.delete(token);
    if (this.#activeByAffordance.get(entry.affordanceId) === token) {
      this.#promoteNewest(entry.affordanceId);
    }
    return true;
  }

  #bindingEntry(binding: ActionBindingRef): RegistryEntry | undefined {
    const entry = this.#byToken.get(binding.bindingId);
    if (entry?.binding === undefined) return undefined;
    if (entry.binding !== binding) return undefined;
    return entry;
  }

  #activeRegistration(affordanceId: string): RegistryEntry | undefined {
    const token = this.#activeByAffordance.get(affordanceId);
    return token === undefined ? undefined : this.#byToken.get(token);
  }

  #promoteNewest(affordanceId: string): void {
    let newest: string | undefined;
    for (const [token, entry] of this.#byToken) {
      if (entry.affordanceId === affordanceId) newest = token;
    }
    if (newest === undefined) this.#activeByAffordance.delete(affordanceId);
    else this.#activeByAffordance.set(affordanceId, newest);
  }
}
