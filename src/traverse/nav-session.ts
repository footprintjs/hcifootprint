/**
 * NavSession — the D18 composition layer: core Session (driver, frames,
 * gap ledger, trace) × the authored tree (appMap) × the presence sensor
 * (PresenceIndex). Each ingredient stays independently testable; THIS file is
 * where their meanings meet:
 *
 *   router sync owns the page level, always
 *   → authored semantics own meaning (modal overlay, tab exclusivity, repeats)
 *   → mount handles own presence strictly below the router-confirmed page
 *   → explicit visibility signals (show/setVisible/`visible:`) own shown/hidden
 *
 * Focus ("You are on", below page level) is set ONLY by sync() and fire()
 * evidence — never by registration, never by recency (React commits effects
 * bottom-up; a lazy sidebar must not steal focus from a modal). When the
 * focus node deactivates, focus falls back to the nearest active ancestor —
 * modal-close auto-resume for free.
 *
 * Everything the runtime DERIVES rather than observes is stamped with an
 * honesty marker; every refused fire is a typed, gap-ledger-recorded
 * rejection. Never a silent exclusion, never a guessed winner.
 */
import type {
  ActivationLevel,
  Affordance,
  AvailableEdge,
  AvailableSlice,
  ContextBrief,
  ContextBriefOptions,
  FireOptions,
  FireResult,
  Principal,
  SessionOptions,
  SkillGraphSpec,
  StimulusKind,
  SyncResult,
} from '../atom/types.js';
import { detectSchema } from 'footprintjs';
import type { WhereFilter } from 'footprintjs';
import { SkillGraphValidationError, composeGuards, validateGuardShape } from '../graph/guards.js';
import { PresenceIndex } from '../presence/presence.js';
import type { AppMap, MapNode, ToolDef } from '../tree/types.js';
import { Session } from './session.js';
import type { ToolHandler } from '../registry/registry.js';

export interface NavSessionOptions extends Omit<SessionOptions, 'node'> {
  /** Starting page id. Default: the first declared page. */
  node?: string;
  /**
   * How long a registration outside the router-confirmed page may persist
   * before drift telemetry fires (a dev warning + one sensor-drift gap row).
   * Registrations in that window are DORMANT: held, not offered, activated
   * instantly if the router then confirms their page. Default 3000ms.
   */
  dormantGraceMs?: number;
}

/** A tool declared at mount time. `does` is a registration-site source-code literal — still authored. */
export interface MountToolDef extends ToolDef {
  handler?: ToolHandler;
}

export interface MountOptions {
  /** Bind the app's EXISTING handlers (by reference) to tools declared on this node. */
  handlers?: Record<string, ToolHandler>;
  /** Declare new leaf tools here-and-now (the register-with-just-a-description path). */
  tools?: Record<string, MountToolDef>;
  /** Instance key when mounting one card of a repeats container ('o-123'). */
  instance?: string;
  /** Initial visibility signal (same wire as setVisible). */
  visible?: boolean;
}

export interface MountHandle {
  readonly node: string;
  readonly instance?: string;
  /** Idempotent. Releases presence, handlers, and mount-declared tools together. */
  release(): void;
}

type NodeGate =
  | { served: true; activation: ActivationLevel; presenceUnknown?: boolean }
  | { served: false; reason: 'BLOCKED_BY_OVERLAY'; overlay: string }
  | { served: false; reason: 'NODE_NOT_VISIBLE'; node: string };

export class NavSession extends Session {
  readonly #map: AppMap;
  readonly #presence = new PresenceIndex();
  /** Deepest node evidenced by sync()/fire(). Registration NEVER writes this. */
  #focusPath: string;
  /**
   * Mount-declared tool overlay: qualified id → a STACK of declarations
   * (newest last = the served one). A stack, not a slot: two components may
   * declare the same tool (StrictMode, list twins); releasing one must never
   * delete the tool out from under the other — the newest survivor serves.
   */
  readonly #dynamic = new Map<string, Array<{ owner: symbol; affordance: Affordance }>>();
  #mergedSpec: SkillGraphSpec | null = null;
  /** Foreign (off-router-page) registrations: node path → first seen (ms). */
  readonly #foreignSeen = new Map<string, number>();
  /** Overlay modals shown by presence alone (no signal): path → first seen (ms). */
  readonly #overlaySeen = new Map<string, number>();
  readonly #warnedOnce = new Set<string>();
  readonly #graceMs: number;
  #mountSeq = 0;

  constructor(map: AppMap, opts?: NavSessionOptions) {
    const node = opts?.node ?? Object.keys(map.spec.pages)[0];
    super(map.spec, { ...(opts ?? {}), node });
    this.#map = map;
    this.#focusPath = node;
    this.#graceMs = opts?.dormantGraceMs ?? 3000;
    // Our fingerprint override reads the fields above — re-baseline now so the
    // first real mutation (not construction itself) is what flushes a row.
    this.resetStructureBaseline();
  }

  protected override get spec(): SkillGraphSpec {
    try {
      if (this.#dynamic.size === 0) return super.spec;
    } catch {
      // super() is still constructing this instance — no overlay can exist yet.
      return super.spec;
    }
    return (this.#mergedSpec ??= this.#buildMergedSpec());
  }

  #buildMergedSpec(): SkillGraphSpec {
    const base = super.spec;
    const affordances = { ...base.affordances };
    for (const [qualifiedId, stack] of this.#dynamic) {
      if (Object.hasOwn(base.affordances, qualifiedId)) continue; // declared-wins (warned at mount)
      if (stack.length > 0) affordances[qualifiedId] = stack[stack.length - 1].affordance;
    }
    return { ...base, affordances };
  }

  // -------------------------------------------------------------------------
  // mount — one handle per rendered thing (presence + handlers + declarations)
  // -------------------------------------------------------------------------

  mount(path: string, opts?: MountOptions): MountHandle {
    const node = this.#map.nodes[path];
    if (!node) {
      throw new Error(
        `hcifootprint: unknown node '${path}'. Known nodes: ${Object.keys(this.#map.nodes).join(', ')}.`,
      );
    }
    if (opts?.instance !== undefined && !node.repeats) {
      throw new Error(
        `hcifootprint: node '${path}' is not repeats: true — instance keys only apply to repeats containers.`,
      );
    }

    const owner = Symbol(path);
    const group = `mount:${path}#${++this.#mountSeq}`;
    const declaredHere: string[] = [];

    // 1. Mount-declared leaf tools go into the overlay FIRST so handler
    //    resolution below (and every later lookup) sees them.
    for (const [name, toolDef] of Object.entries(opts?.tools ?? {})) {
      const qualifiedId = this.#declareMountTool(path, node, name, toolDef, owner, group, opts?.instance);
      if (qualifiedId) declaredHere.push(qualifiedId);
    }

    // 2. Bind existing app handlers (by reference) to declared tools.
    for (const [name, handler] of Object.entries(opts?.handlers ?? {})) {
      const qualifiedId = this.#resolveToolOnNode(path, name);
      this.registry.register(group, this.#registryKey(qualifiedId, opts?.instance), handler);
    }

    // 3. Presence + optional initial visibility signal.
    const presenceHandle = this.#presence.open(path, opts?.instance);
    if (opts?.visible !== undefined) this.#presence.setVisible(path, opts.visible);

    // 4. Dormancy bookkeeping: a mount outside the router-confirmed page is
    //    held, not offered — its clock starts now.
    if (node.page !== this.node && !this.#foreignSeen.has(path)) {
      this.#foreignSeen.set(path, Date.now());
    }
    this.noteStructureChange();

    let released = false;
    return {
      node: path,
      instance: opts?.instance,
      release: () => {
        if (released) return;
        released = true;
        presenceHandle.release();
        this.unregisterGroup(group);
        let removedAny = false;
        for (const qualifiedId of declaredHere) {
          const stack = this.#dynamic.get(qualifiedId);
          if (!stack) continue;
          const remaining = stack.filter((entry) => entry.owner !== owner);
          if (remaining.length !== stack.length) {
            if (remaining.length === 0) this.#dynamic.delete(qualifiedId);
            else this.#dynamic.set(qualifiedId, remaining);
            removedAny = true;
          }
        }
        if (removedAny) this.#mergedSpec = null;
        this.noteStructureChange();
      },
    };
  }

  #declareMountTool(
    path: string,
    node: MapNode,
    name: string,
    toolDef: MountToolDef,
    owner: symbol,
    group: string,
    instance: string | undefined,
  ): string | null {
    if (/[.[\]#/|]/.test(name)) {
      throw new SkillGraphValidationError(
        `mount('${path}') tool '${name}' contains a reserved character (. [ ] # / |).`,
      );
    }
    const qualifiedId = `${path}.${name}`;
    if (name === 'leave-skill') {
      throw new SkillGraphValidationError(`tool name 'leave-skill' is reserved.`);
    }
    if (super.spec.affordances[qualifiedId]) {
      // Declared-wins precedence: the central declaration is the audited one.
      this.warn(
        `hcifootprint: mount('${path}') re-declares '${qualifiedId}' — the appMap declaration wins; ` +
          `only the handler was bound.`,
      );
      if (toolDef.handler) this.registry.register(group, this.#registryKey(qualifiedId, instance), toolDef.handler);
      return null;
    }
    if (!toolDef.does || !toolDef.does.trim()) {
      throw new SkillGraphValidationError(`mount-declared tool '${qualifiedId}' needs a 'does'.`);
    }
    if (toolDef.when) {
      if (Object.keys(toolDef.when).length === 0) {
        throw new SkillGraphValidationError(`mount-declared tool '${qualifiedId}' has an empty when {} — omit it.`);
      }
      validateGuardShape(`mount-declared tool '${qualifiedId}' when`, toolDef.when as Record<string, unknown>);
    }
    if (toolDef.goTo && !super.spec.pages[toolDef.goTo]) {
      throw new SkillGraphValidationError(
        `mount-declared tool '${qualifiedId}' goTo unknown page '${toolDef.goTo}'.`,
      );
    }
    if (toolDef.input !== undefined && detectSchema(toolDef.input) === 'none') {
      throw new SkillGraphValidationError(
        `mount-declared tool '${qualifiedId}' has an unrecognized input schema.`,
      );
    }
    const existing = this.#dynamic.get(qualifiedId);
    if (existing && existing.length > 0) {
      this.warn(
        `hcifootprint: '${qualifiedId}' mount-declared twice — the newest declaration serves (common ` +
          `cause: a component mounted twice without releasing its handle).`,
      );
    }
    const guard = composeGuards(qualifiedId, [
      ...this.#guardChain(path),
      ...(toolDef.when ? [toolDef.when as Record<string, unknown>] : []),
    ]) as WhereFilter | undefined;
    const affordance = Object.freeze({
      id: qualifiedId,
      on: [node.page],
      description: toolDef.does,
      binding: toolDef.binding ? structuredClone(toolDef.binding) : undefined,
      guard,
      effect:
        toolDef.writes || toolDef.goTo
          ? {
              ...(toolDef.writes ? { writes: [...toolDef.writes] } : {}),
              ...(toolDef.goTo ? { navigatesTo: toolDef.goTo } : {}),
            }
          : undefined,
      schema: toolDef.input,
      highEffect: toolDef.confirm ?? false,
      role: toolDef.role ?? (toolDef.goTo ? 'next' : 'action'),
      descriptionSource: 'registration',
    }) as Affordance;
    this.#dynamic.set(qualifiedId, [...(existing ?? []), { owner, affordance }]);
    this.#mergedSpec = null;
    if (toolDef.handler) this.registry.register(group, this.#registryKey(qualifiedId, instance), toolDef.handler);
    return qualifiedId;
  }

  #resolveToolOnNode(path: string, name: string): string {
    const qualified = `${path}.${name}`;
    if (this.spec.affordances[qualified]) return qualified;
    if (this.spec.affordances[name]) return name; // already-qualified id or root tool
    throw new Error(
      `hcifootprint: mount('${path}') binds unknown tool '${name}' — declare it in appMap (or pass it in ` +
        `mount({tools})). Known here: ${Object.keys(this.spec.affordances)
          .filter((id) => id.startsWith(`${path}.`) || !id.includes('.'))
          .join(', ')}.`,
    );
  }

  #registryKey(qualifiedId: string, instance: string | undefined): string {
    return instance === undefined ? qualifiedId : `${qualifiedId}[${instance}]`;
  }

  #guardChain(path: string): Record<string, unknown>[] {
    const chain: Record<string, unknown>[] = [];
    for (let cursor: MapNode | undefined = this.#map.nodes[path]; cursor; ) {
      if (cursor.guard) chain.unshift(cursor.guard as Record<string, unknown>);
      cursor = cursor.parent ? this.#map.nodes[cursor.parent] : undefined;
    }
    return chain;
  }

  // -------------------------------------------------------------------------
  // visibility wire — the one signal registration cannot infer
  // -------------------------------------------------------------------------

  setVisible(path: string, visible: boolean): void {
    this.#requireNode(path);
    this.#presence.setVisible(path, visible);
    this.noteStructureChange();
  }

  /** Show a node; for a tab this also hides its tab siblings (at most one shown). */
  show(path: string): void {
    const node = this.#requireNode(path);
    if (node.kind === 'tab' && node.parent) {
      for (const siblingPath of this.#map.nodes[node.parent].children) {
        const sibling = this.#map.nodes[siblingPath];
        if (sibling.kind === 'tab') this.#presence.setVisible(siblingPath, siblingPath === path);
      }
    } else {
      this.#presence.setVisible(path, true);
    }
    this.noteStructureChange();
  }

  #requireNode(path: string): MapNode {
    const node = this.#map.nodes[path];
    if (!node) {
      throw new Error(
        `hcifootprint: unknown node '${path}'. Known nodes: ${Object.keys(this.#map.nodes).join(', ')}.`,
      );
    }
    return node;
  }

  // -------------------------------------------------------------------------
  // focus — evidence-based "you are here", with ancestor fallback
  // -------------------------------------------------------------------------

  get focus(): string {
    let cursor = this.#focusPath;
    while (true) {
      const node = this.#map.nodes[cursor];
      if (!node || node.page !== this.node) return this.node; // stale/off-graph focus → page floor
      if (node.kind === 'page') return cursor;
      const gate = this.#gateNode(cursor);
      if (gate.served) return cursor;
      cursor = node.parent ?? this.node; // nearest active ancestor = auto-resume
    }
  }

  // -------------------------------------------------------------------------
  // the fused activation model
  // -------------------------------------------------------------------------

  /**
   * Shown blocking modals on the current page: signal true, or present without
   * a contrary signal — AND whose ancestor chain allows visibility. A modal
   * kept mounted inside a hidden tab is NOT shown and must not mask anything.
   */
  #shownOverlays(): string[] {
    const shown: string[] = [];
    for (const node of Object.values(this.#map.nodes)) {
      if (!node.overlay || node.page !== this.node) continue;
      const visibility = this.#presence.visibility(node.path);
      const present = this.#presence.isPresent(node.path);
      const selfShown = visibility === true || (visibility === undefined && present);
      const ancestorsAllow = node.parent === null || this.#gateChain(node.parent).served;
      if (selfShown && ancestorsAllow) {
        shown.push(node.path);
        if (visibility === undefined) this.#overlayGraceCheck(node.path);
        else this.#overlaySeen.delete(node.path);
      } else {
        this.#overlaySeen.delete(node.path);
      }
    }
    return shown;
  }

  /** Overlay self-defense: a modal masking its page on presence alone, past grace, names the missing wire. */
  #overlayGraceCheck(path: string): void {
    const firstSeen = this.#overlaySeen.get(path);
    if (firstSeen === undefined) {
      this.#overlaySeen.set(path, Date.now());
      return;
    }
    const warnKey = `overlay:${path}`;
    if (Date.now() - firstSeen >= this.#graceMs && !this.#warnedOnce.has(warnKey)) {
      this.#warnedOnce.add(warnKey);
      this.warn(
        `hcifootprint: modal '${path}' has been masking its page on mount-presence alone for over ` +
          `${this.#graceMs}ms with no visibility signal. If it is actually closed (kept mounted for ` +
          `animation), wire session.setVisible('${path}', false) — mounts cannot see CSS.`,
      );
    }
  }

  #gateNode(path: string): NodeGate {
    // Overlay masking first. With shown blocking modals, a node is served only
    // if it lives inside AT LEAST ONE of them — "outside ANY shown modal"
    // would make two simultaneously-shown modals mask each other (total page
    // deadlock, both modals' own close buttons included).
    const overlays = this.#shownOverlays();
    if (overlays.length > 0) {
      const inside = overlays.some((overlay) => path === overlay || path.startsWith(`${overlay}.`));
      if (!inside) return { served: false, reason: 'BLOCKED_BY_OVERLAY', overlay: overlays[0] };
    }
    return this.#gateChain(path);
  }

  /** The chain walk (visibility, modal-shown, tab prior) WITHOUT overlay masking. */
  #gateChain(path: string): NodeGate {
    // Walk root → node; containers can only reject or degrade certainty.
    const chain: MapNode[] = [];
    for (let cursor: MapNode | undefined = this.#map.nodes[path]; cursor; ) {
      chain.unshift(cursor);
      cursor = cursor.parent ? this.#map.nodes[cursor.parent] : undefined;
    }
    let presenceUnknown = false;
    let activation: ActivationLevel = 'assumed';
    for (const node of chain) {
      const visibility = this.#presence.visibility(node.path);
      if (visibility === false) return { served: false, reason: 'NODE_NOT_VISIBLE', node: node.path };
      const present = this.#presence.isPresent(node.path);

      if (node.kind === 'page') {
        activation = 'synced'; // router-confirmed
        continue;
      }
      if (node.kind === 'modal') {
        // NEVER assumed: closed until registered or shown.
        if (visibility !== true && !present) {
          return { served: false, reason: 'NODE_NOT_VISIBLE', node: node.path };
        }
        activation = visibility === true ? 'shown' : 'registered';
        continue;
      }
      if (node.kind === 'tab') {
        const gate = this.#gateTab(node, visibility, present);
        if (!gate.served) return gate;
        activation = gate.activation;
        presenceUnknown ||= gate.presenceUnknown ?? false;
        continue;
      }
      // areas / plain containers: mounted sharpens, signals decide, absence stays assumed
      activation = visibility === true ? 'shown' : present ? 'registered' : 'assumed';
    }
    return { served: true, activation, ...(presenceUnknown ? { presenceUnknown: true } : {}) };
  }

  #gateTab(tab: MapNode, visibility: boolean | undefined, present: boolean): NodeGate {
    if (visibility === true) return { served: true, activation: 'shown' };
    const siblings = tab.parent
      ? this.#map.nodes[tab.parent].children
          .map((childPath) => this.#map.nodes[childPath])
          .filter((child) => child.kind === 'tab')
      : [tab];
    // The exclusivity PRIOR: a sibling explicitly shown means this one is not.
    const siblingShown = siblings.some(
      (sibling) => sibling.path !== tab.path && this.#presence.visibility(sibling.path) === true,
    );
    if (siblingShown) return { served: false, reason: 'NODE_NOT_VISIBLE', node: tab.path };

    // Explicitly-hidden siblings are not candidates: with tab A mounted-but-
    // signaled-hidden and tab B unmounted, B is the plausibly-shown one — a
    // hidden mount must not make its siblings unreachable.
    const mountedSiblings = siblings.filter(
      (sibling) =>
        this.#presence.isPresent(sibling.path) && this.#presence.visibility(sibling.path) !== false,
    );
    if (mountedSiblings.length === 0) {
      // L0: nothing registers → the flagged union (assumed), never a guessed winner.
      return { served: true, activation: 'assumed', presenceUnknown: siblings.length > 1 };
    }
    if (!present) {
      // Mounts exist and none of them is this tab: it is really not there (yet).
      return { served: false, reason: 'NODE_NOT_VISIBLE', node: tab.path };
    }
    if (mountedSiblings.length > 1) {
      // Keep-mounted panels with no wire: serve the union, flagged, and say the one-line upgrade once.
      const warnKey = `tabs:${tab.parent ?? tab.path}`;
      if (!this.#warnedOnce.has(warnKey)) {
        this.#warnedOnce.add(warnKey);
        this.warn(
          `hcifootprint: ${mountedSiblings.length} tab siblings under '${tab.parent}' are mounted at once ` +
            `and no visibility signal exists — serving all of them flagged presence:'unknown'. One line fixes ` +
            `it: session.show('<the visible tab>') on tab change (or pass visible: at mount).`,
        );
      }
      return { served: true, activation: 'registered', presenceUnknown: true };
    }
    return { served: true, activation: 'registered' };
  }

  // -------------------------------------------------------------------------
  // available / fire / sync / brief — the Session surface, tree-gated
  // -------------------------------------------------------------------------

  override available(): AvailableSlice {
    this.#driftCheck();
    const base = super.available();
    const edges: AvailableEdge[] = [];
    for (const edge of base.edges) {
      const path = this.#pathOnCurrentPage(edge.affordanceId);
      if (!path) {
        edges.push(edge); // defensive: a projection tool with no tree node keeps v1 semantics
        continue;
      }
      const gate = this.#gateNode(path);
      if (!gate.served) continue; // fire() on it returns the typed reason — available() just omits
      const node = this.#map.nodes[path];
      const stamped: AvailableEdge = {
        ...edge,
        node: path,
        activation: gate.activation,
        ...(gate.presenceUnknown ? { presence: 'unknown' as const } : {}),
      };
      if (node.repeats) {
        const existence = this.#instanceExistence(node);
        stamped.instances = existence.keys.slice(0, 50); // render cap only — fireability is uncapped
        stamped.enumeration = existence.enumeration;
      }
      edges.push(stamped);
    }
    return { ...base, edges };
  }

  override fire(affordanceId: string, opts: FireOptions): FireResult {
    const affordance = this.spec.affordances[affordanceId];
    if (affordance) {
      const path = this.#pathOnCurrentPage(affordanceId);
      if (path) {
        const gate = this.#gateNode(path);
        if (!gate.served) {
          this.recordRejection(affordanceId, gate.reason, opts.source);
          return gate.reason === 'BLOCKED_BY_OVERLAY'
            ? { ok: false, reason: 'BLOCKED_BY_OVERLAY', overlay: gate.overlay }
            : { ok: false, reason: 'NODE_NOT_VISIBLE', node: gate.node };
        }
        const node = this.#map.nodes[path];
        if (node.repeats) {
          const existence = this.#instanceExistence(node);
          if (opts.instance === undefined) {
            this.recordRejection(affordanceId, 'INSTANCE_REQUIRED', opts.source);
            return { ok: false, reason: 'INSTANCE_REQUIRED', instances: existence.keys.slice(0, 50) };
          }
          // Membership against the FULL set — the render cap must never make
          // instance #51 unfireable.
          if (!existence.keys.includes(opts.instance)) {
            this.recordRejection(affordanceId, 'INSTANCE_UNKNOWN', opts.source);
            return { ok: false, reason: 'INSTANCE_UNKNOWN', instances: existence.keys.slice(0, 50) };
          }
        }
        if (
          gate.activation === 'assumed' &&
          opts.invoke !== false &&
          this.#presence.hasAny() &&
          this.handlerFor(affordanceId, opts) === undefined
        ) {
          // The session runs on mounts, this node's have not arrived, and the
          // caller wanted execution: retriable, and never a fake GUARD_FAILED.
          this.recordRejection(affordanceId, 'STILL_MOUNTING', opts.source);
          return { ok: false, reason: 'STILL_MOUNTING', node: path };
        }
        const result = super.fire(affordanceId, opts);
        if (result.ok) this.#focusPath = path; // fire evidence moves focus
        return result;
      }
    }
    return super.fire(affordanceId, opts);
  }

  protected override handlerFor(affordanceId: string, opts: FireOptions): ToolHandler | undefined {
    if (opts.instance !== undefined) {
      return (
        this.registry.handlerFor(this.#registryKey(affordanceId, opts.instance)) ??
        this.registry.handlerFor(affordanceId)
      );
    }
    return super.handlerFor(affordanceId, opts);
  }

  override sync(observedNode: string, opts?: { stimulus?: StimulusKind; principal?: Principal }): SyncResult {
    const result = super.sync(observedNode, opts);
    if (result.changed) {
      this.#focusPath = this.node; // router evidence resets focus to the page
      // Dormant registrations under the now-confirmed page become native…
      for (const path of [...this.#foreignSeen.keys()]) {
        if (this.#map.nodes[path]?.page === this.node) this.#foreignSeen.delete(path);
      }
      // …and still-mounted nodes elsewhere start (or keep) their drift clocks.
      for (const path of this.#presence.presentNodes()) {
        const node = this.#map.nodes[path];
        if (node && node.page !== this.node && !this.#foreignSeen.has(path)) {
          this.#foreignSeen.set(path, Date.now());
        }
      }
    }
    return result;
  }

  override contextBrief(opts?: ContextBriefOptions): ContextBrief {
    this.#driftCheck();
    const brief = super.contextBrief(opts);
    const lines: string[] = [];
    if (this.focus !== this.node) lines.push(`Focus: ${this.focus}.`);
    const frontier = this.#presence
      .presentNodes()
      .filter((path) => this.#map.nodes[path]?.page === this.node)
      .sort();
    if (frontier.length > 0) lines.push(`Mounted here: ${frontier.join(', ')}.`);
    return lines.length > 0 ? { ...brief, text: `${brief.text}\n${lines.join('\n')}` } : brief;
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  /** The tool's node on the CURRENT page, or null (root tools resolve to the page node). */
  #pathOnCurrentPage(affordanceId: string): string | null {
    const declared = this.#map.toolNodes[affordanceId];
    if (declared) {
      return declared.find((path) => this.#map.nodes[path]?.page === this.node) ?? null;
    }
    if (this.#dynamic.has(affordanceId)) {
      const path = affordanceId.split('.').slice(0, -1).join('.');
      return this.#map.nodes[path]?.page === this.node ? path : null;
    }
    return null;
  }

  /**
   * The FULL existence set (sanitized, unbounded). Fire-time membership checks
   * run against ALL of it — instance #51 is real. Serving layers cap what they
   * RENDER (50 keys on an edge), never what is fireable.
   */
  #instanceExistence(node: MapNode): { keys: string[]; enumeration: 'selector' | 'mounted-window' } {
    if (node.instances) {
      try {
        const keys = node.instances(this.state());
        if (Array.isArray(keys)) {
          return { keys: keys.map(sanitizeKey), enumeration: 'selector' };
        }
        this.warn(`hcifootprint: instances source for '${node.path}' returned a non-array — using the mounted window.`);
      } catch (error) {
        this.warn(`hcifootprint: instances source for '${node.path}' threw: ${String(error)} — using the mounted window.`);
      }
    }
    return {
      keys: this.#presence.instancesOf(node.path).map(sanitizeKey),
      enumeration: 'mounted-window',
    };
  }

  /** Foreign registrations past grace = sensor drift: one dev warning + one gap row, per node. */
  #driftCheck(): void {
    const now = Date.now();
    for (const [path, firstSeen] of [...this.#foreignSeen]) {
      if (!this.#presence.isPresent(path) || this.#map.nodes[path]?.page === this.node) {
        this.#foreignSeen.delete(path);
        continue;
      }
      const warnKey = `foreign:${path}`;
      if (now - firstSeen >= this.#graceMs && !this.#warnedOnce.has(warnKey)) {
        this.#warnedOnce.add(warnKey);
        this.warn(
          `hcifootprint: '${path}' has been mounted for over ${this.#graceMs}ms while the router says ` +
            `'${this.node}' — its tools are dormant. Either sync() is missing a page change or a component ` +
            `outlived its page (exit animation / portal). Recorded as a sensor-drift gap row.`,
        );
        this.reportGap({
          request: `dormant registration: node '${path}' mounted while router-confirmed page is '${this.node}'`,
          reason: 'sensor-drift',
          principal: 'system',
        });
      }
    }
  }

  protected override structureFingerprint(): string {
    // Instance-keyed handler registrations ('id[key]') are EXCLUDED: a
    // scrolling virtualized list must never bump the cursor or write rows.
    const handlers = this.registry
      .registrations()
      .map((registration) => registration.affordanceId)
      .filter((id) => !id.includes('['))
      .sort()
      .join('|');
    return `${handlers}::${this.#presence.fingerprint()}::dyn=${[...this.#dynamic.keys()].sort().join('|')}`;
  }
}

function sanitizeKey(key: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(key).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120);
}
