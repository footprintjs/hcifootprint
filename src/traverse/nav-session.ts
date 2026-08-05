/**
 * InteractionSession — the composition layer: core Session (driver, frames,
 * gap ledger, trace) × the authored tree (buildNavigationGraph) × the presence
 * sensor (PresenceIndex). Each ingredient stays independently testable; THIS
 * file is where their meanings meet:
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
  NavigationGraphSpec,
  StimulusKind,
  SyncResult,
  ActionGroup,
  ActionHandle,
} from '../atom/types.js';
import { detectSchema } from 'footprintjs';
import type { WhereFilter } from 'footprintjs';
import { GraphValidationError, checkLiteralHref, composeGuards, validateBlockedBecause, validateGuardShape, validateHumanDecides } from '../graph/guards.js';
import { noInputFlag, schemaOf, takesNoInput } from './expects.js';
import type { LiveSource } from '../graph/sources/types.js';
import { PresenceIndex } from '../presence/presence.js';
import { actionsOf } from '../tree/authoring-keys.js';
import type { NavigationGraph, MapNode, ActionDef } from '../tree/types.js';
import { Session, UNATTRIBUTED_FIRE, principalOf, registrationMark } from './session.js';
import type { ActionHandler } from '../registry/registry.js';

export interface InteractionSessionOptions extends Omit<SessionOptions, 'node'> {
  /** Starting page id. Default: the first declared page. */
  node?: string;
  /**
   * How long a registration outside the router-confirmed page may persist
   * before drift telemetry fires (a dev warning + one sensor-drift gap row).
   * Registrations in that window are DORMANT: held, not offered, activated
   * instantly if the router then confirms their page. Default 3000ms.
   */
  dormantGraceMs?: number;
  /**
   * The clock the dormancy / overlay-grace timers read (epoch ms). Defaults to
   * `Date.now`. Inject a controllable clock to test time-dependent staleness
   * deterministically — a dormant registration, a mount-grace warning — without
   * real waits (hcifootprint/testing's harness wires one for you).
   */
  now?: () => number;
}

/** An action declared at mount time. `does` is a registration-site source-code literal — still authored. */
export interface RegisteredActionDef extends ActionDef {
  handler?: ActionHandler;
}

export interface RegisterActionGroupOptions {
  /** Bind the app's EXISTING handlers (by reference) to actions declared on this node. */
  handlers?: Record<string, ActionHandler>;
  /** Declare new leaf actions here-and-now (the register-with-just-a-description path). */
  actions?: Record<string, RegisteredActionDef>;
  /** Instance key when registering one card of a repeats container ('o-123'). */
  instance?: string;
  /** Initial visibility signal (same wire as setVisible). */
  visible?: boolean;
  /** Initial disabled state per action (leaf name → enabled). Flip later via handle.setEnabled. */
  enabled?: Record<string, boolean>;
  /**
   * Which controls are ALREADY WORKING as this mounts, in your own words (leaf
   * name — or qualified id — → the label). The registration-time half of
   * {@link AvailableEdge.busy}, for a component that re-renders mid-flight and
   * knows it; flip it later through `handle.setBusy`.
   *
   * A label, never a flag: there is no boolean form, and a non-string is refused
   * with one warning rather than turned into a state this library made up. An action
   * absent from this map says NOTHING about that control — not "idle".
   */
  busy?: Record<string, string>;
  /**
   * What each control HOLDS right now (leaf name — or qualified id — → a reader
   * the served row calls at serve time). The registration-time half of
   * {@link AvailableEdge.holds}: the component already holds the draft in a
   * variable, so it hands over the way to read it and never a copy.
   *
   * Released with the group's handlers on `unregister()` — a reader that
   * outlived its component would answer with the last render's state, which is
   * exactly the stale value this surface exists to avoid.
   *
   * KEEP IT A READ. It runs once per served row, and rows are assembled on a hot
   * path (every refused fire builds one for its gap context), so return the
   * variable you already hold — never compute, fetch, or write in it. A reader
   * that throws costs the row its value and nothing else.
   */
  holds?: Record<string, () => unknown>;
}

/**
 * The handle returned by registerActions — the group's IDENTITY (see
 * ActionGroup). Hold it and call `unregister()` on unmount; `setEnabled(id, …)`
 * greys one action out.
 */
export interface ActionGroupHandle extends ActionGroup {
  /** Instance key, when this group registered one card of a repeats container. */
  readonly instance?: string;
}

type NodeGate =
  | { served: true; activation: ActivationLevel; presenceUnknown?: boolean }
  | { served: false; reason: 'BLOCKED_BY_OVERLAY'; overlay: string }
  | { served: false; reason: 'NODE_NOT_VISIBLE'; node: string };

export class InteractionSession<Paths extends string = string> extends Session {
  readonly #map: NavigationGraph;
  readonly #presence = new PresenceIndex();
  /** Deepest node evidenced by sync()/fire(). Registration NEVER writes this. */
  #focusPath: string;
  /**
   * Mount-declared action overlay: qualified id → a STACK of declarations
   * (newest last = the served one). A stack, not a slot: two components may
   * declare the same action (StrictMode, list twins); releasing one must never
   * delete the action out from under the other — the newest survivor serves.
   */
  readonly #dynamic = new Map<string, Array<{ owner: symbol; affordance: Affordance }>>();
  #mergedSpec: NavigationGraphSpec | null = null;
  /** Foreign (off-router-page) registrations: node path → first seen (ms). */
  readonly #foreignSeen = new Map<string, number>();
  /** Overlay modals shown by presence alone (no signal): path → first seen (ms). */
  readonly #overlaySeen = new Map<string, number>();
  readonly #warnedOnce = new Set<string>();
  readonly #graceMs: number;
  /** Clock for the grace timers (injectable for deterministic staleness tests). */
  readonly #now: () => number;
  /** Detach fns of the live sources createSession attached (drained by detachSources). */
  readonly #sourceDetachers: Array<() => void> = [];

  constructor(
    map: NavigationGraph,
    opts?: InteractionSessionOptions,
    /** Live graph sources to attach to THIS session (createSession passes the graph's). */
    liveSources?: ReadonlyArray<LiveSource>,
  ) {
    const node = opts?.node ?? Object.keys(map.spec.pages)[0];
    super(map.spec, { ...(opts ?? {}), node });
    this.#map = map;
    this.#focusPath = node;
    this.#graceMs = opts?.dormantGraceMs ?? 3000;
    this.#now = opts?.now ?? Date.now;
    // Our fingerprint override reads the fields above — re-baseline now so the
    // first real mutation (not construction itself) is what flushes a row.
    this.resetStructureBaseline();
    // Live sources attach AFTER the baseline, deliberately: their mounts must
    // land exactly like hand-written registerActions calls — structure rows,
    // version bumps, dormancy clocks and all — never as silent construction.
    // The session's own warn sink rides along so a post-attach reconcile
    // failure surfaces where every other dev warning does.
    for (const source of liveSources ?? []) {
      this.#sourceDetachers.push(source.attach(this, (message) => this.warn(message)));
    }
  }

  /**
   * Release every live-source binding this session's graph attached (the
   * counterpart of `sources: [fromLiveStore(...)]`). Idempotent: the ledger is
   * drained on the first call. A source whose detach throws is isolated with a
   * warning — consumer store code must never break the session (recorder rule).
   */
  detachSources(): void {
    for (const detach of this.#sourceDetachers.splice(0)) {
      try {
        detach();
      } catch (error) {
        this.warn(`hcifootprint: a live source's detach threw: ${String(error)}`);
      }
    }
  }

  protected override get spec(): NavigationGraphSpec {
    try {
      if (this.#dynamic.size === 0) return super.spec;
    } catch {
      // super() is still constructing this instance — no overlay can exist yet.
      /* v8 ignore next -- unreachable while Session's constructor touches nothing virtual: #dynamic is initialised the instant super() returns, so no public door can reach the field access above before it exists. The catch is what makes a future base-class constructor that reads this.spec degrade to the declared spec instead of dying on a private-field TypeError. */
      return super.spec;
    }
    return (this.#mergedSpec ??= this.#buildMergedSpec());
  }

  #buildMergedSpec(): NavigationGraphSpec {
    const base = super.spec;
    const affordances = { ...base.affordances };
    for (const [qualifiedId, stack] of this.#dynamic) {
      /* v8 ignore next -- unreachable: #declareMountAction never files an id into #dynamic while super.spec.affordances already holds it (declared-wins, warned at the mount door and returning early), so the two maps cannot both claim one id. The check states that precedence where the merge happens rather than only where it is enforced. */
      if (Object.hasOwn(base.affordances, qualifiedId)) continue; // declared-wins (warned at mount)
      /* v8 ignore else -- the empty-stack arm is unreachable: a declaration stack is created with its first entry and DELETED the moment its last one is released, so #dynamic never holds an empty one. The check is what makes "newest declaration serves" safe to read off the tail. */
      if (stack.length > 0) affordances[qualifiedId] = stack[stack.length - 1].affordance;
    }
    return { ...base, affordances };
  }

  // -------------------------------------------------------------------------
  // mount — one handle per rendered thing (presence + handlers + declarations)
  // -------------------------------------------------------------------------

  /**
   * Register a component's handlers/actions ON a node when it renders. You never
   * name a group — this RETURNS an ActionGroupHandle that is the identity (with a
   * generated `id`). Hold it in a ref; call `handle.unregister()` on unmount.
   * `handle.setEnabled(actionId, false)` greys one action out (a disabled button).
   */
  registerActions(path: Paths, opts?: RegisterActionGroupOptions): ActionGroupHandle {
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
    const group = this.nextGroupId(`mount:${path}`);
    const declaredHere: string[] = [];

    // 1. Mount-declared leaf actions go into the overlay FIRST so handler
    //    resolution below (and every later lookup) sees them — read through the
    //    ONE door that knows the authoring key.
    for (const [name, actionDef] of Object.entries(actionsOf(opts) ?? {})) {
      const qualifiedId = this.#declareMountAction(path, node, name, actionDef, owner, group, opts?.instance);
      if (qualifiedId) declaredHere.push(qualifiedId);
    }

    // 2. Bind existing app handlers (by reference) to declared actions.
    for (const [name, handler] of Object.entries(opts?.handlers ?? {})) {
      const qualifiedId = this.#resolveActionOnNode(path, name);
      const enabled = opts?.enabled?.[name] ?? opts?.enabled?.[qualifiedId] ?? true;
      // Through the SAME door a later flip takes, so a label that mounts and a
      // label that arrives are normalised (and refused) identically.
      const busy = this.busyLabel(qualifiedId, opts?.busy?.[name] ?? opts?.busy?.[qualifiedId]);
      // Through the SESSION's binding door, not the registry's: that is where a
      // contextful wrapper is recognised (D21), so every mount door gets the
      // capture envelope without four call sites each remembering to ask.
      this.bindHandler(group, this.#registryKey(qualifiedId, opts?.instance), handler, enabled, busy);
    }

    // 3. Value readers, AFTER the overlay above so an action declared here-and-now
    //    resolves like any other. Filed under the QUALIFIED id — the canonical
    //    key the served row looks up — so `{ send: … }` and `{ 'compose.send': … }`
    //    are the same declaration, and an unknown name is refused by name.
    for (const [name, read] of Object.entries(opts?.holds ?? {})) {
      this.registerHolds(this.#resolveActionOnNode(path, name), group, read);
    }

    // 4. Presence + optional initial visibility signal.
    const presenceHandle = this.#presence.open(path, opts?.instance);
    if (opts?.visible !== undefined) this.#presence.setVisible(path, opts.visible);

    // 5. Dormancy bookkeeping: a mount outside the router-confirmed page is
    //    held, not offered — its clock starts now.
    if (node.page !== this.node && !this.#foreignSeen.has(path)) {
      this.#foreignSeen.set(path, this.#now());
    }
    this.noteStructureChange();

    let released = false;
    const unregister = (): void => {
      if (released) return;
      released = true;
      presenceHandle.release();
      this.unregisterGroup(group);
      let removedAny = false;
      for (const qualifiedId of declaredHere) {
        const stack = this.#dynamic.get(qualifiedId);
        /* v8 ignore next -- unreachable: every id in declaredHere was filed into #dynamic by THIS owner, the `released` latch above makes this loop run once per handle, and another owner's release only deletes a stack it was alone in. So the stack is always still there to filter. */
        if (!stack) continue;
        const remaining = stack.filter((entry) => entry.owner !== owner);
        /* v8 ignore else -- the "nothing was mine" arm is unreachable: this owner filed every id in declaredHere itself and the `released` latch lets it release them once, so the filter always drops exactly its own entry. The comparison is what keeps a release that changed nothing from invalidating the merged spec. */
        if (remaining.length !== stack.length) {
          if (remaining.length === 0) this.#dynamic.delete(qualifiedId);
          else this.#dynamic.set(qualifiedId, remaining);
          removedAny = true;
        }
      }
      if (removedAny) this.#mergedSpec = null;
      this.noteStructureChange();
    };
    return {
      id: group,
      node: path,
      ...(opts?.instance !== undefined ? { instance: opts.instance } : {}),
      // Map a leaf/qualified actionId to its registry key (instance-aware).
      setEnabled: (actionId: string, enabled: boolean) => {
        const qualifiedId = this.#resolveActionOnNode(path, actionId);
        this.setActionEnabled(this.#registryKey(qualifiedId, opts?.instance), enabled);
      },
      // The same key mapping, deliberately: a card of a repeats container says
      // busy about ITSELF, and it must land on that card's registration rather
      // than on the base id every other card shares.
      setBusy: (actionId: string, busy: string | undefined) => {
        const qualifiedId = this.#resolveActionOnNode(path, actionId);
        this.setActionBusy(this.#registryKey(qualifiedId, opts?.instance), busy);
      },
      unregister,
    };
  }

  /**
   * Register ONE action on a node (convenience over registerActions). `def`
   * either binds an existing declared action (`{ handler }`) or declares a new
   * leaf here (`{ does, handler }`). Returns a single-action handle.
   */
  registerAction(path: Paths, actionId: string, def: RegisteredActionDef & { handler: ActionHandler }): ActionHandle {
    // 'declared' covers BOTH node-scoped actions ('path.actionId') and root/
    // multi-attach actions (bare 'actionId' offered on this page) — bind the handler
    // to the existing action; only declare a NEW leaf when neither exists.
    const declared =
      this.spec.affordances[`${path}.${actionId}`] !== undefined ||
      this.spec.affordances[actionId] !== undefined;
    const group = declared
      ? this.registerActions(path, { handlers: { [actionId]: def.handler } })
      : this.registerActions(path, { actions: { [actionId]: def } });
    return {
      id: group.id,
      /* v8 ignore next -- the `{}` arm is unreachable: registerActions always answers with `node: path`, and a path the graph does not declare has already thrown. It is written this way because ActionGroup.node is optional at the type level, and copying an `undefined` onto the handle would read as "this group is on no node" rather than "nobody asked". */
      ...(group.node !== undefined ? { node: group.node } : {}),
      actionId,
      setEnabled: (enabled: boolean) => group.setEnabled(actionId, enabled),
      setBusy: (busy: string | undefined) => group.setBusy(actionId, busy),
      unregister: () => group.unregister(),
    };
  }


  #declareMountAction(
    path: string,
    node: MapNode,
    name: string,
    actionDef: RegisteredActionDef,
    owner: symbol,
    group: string,
    instance: string | undefined,
  ): string | null {
    if (/[.[\]#/|]/.test(name)) {
      throw new GraphValidationError(
        `mount('${path}') action '${name}' contains a reserved character (. [ ] # / |).`,
      );
    }
    const qualifiedId = `${path}.${name}`;
    if (name === 'leave-journey') {
      throw new GraphValidationError(`action name 'leave-journey' is reserved.`);
    }
    if (super.spec.affordances[qualifiedId]) {
      // Declared-wins precedence: the central declaration is the audited one.
      this.warn(
        `hcifootprint: mount('${path}') re-declares '${qualifiedId}' — the declared action wins; ` +
          `only the handler was bound.`,
      );
      if (actionDef.handler) this.bindHandler(group, this.#registryKey(qualifiedId, instance), actionDef.handler);
      return null;
    }
    if (!actionDef.does || !actionDef.does.trim()) {
      throw new GraphValidationError(`mount-declared action '${qualifiedId}' needs a 'does'.`);
    }
    if (actionDef.when) {
      if (Object.keys(actionDef.when).length === 0) {
        throw new GraphValidationError(`mount-declared action '${qualifiedId}' has an empty when {} — omit it.`);
      }
      validateGuardShape(`mount-declared action '${qualifiedId}' when`, actionDef.when as Record<string, unknown>);
    }
    if (actionDef.goTo && !super.spec.pages[actionDef.goTo]) {
      throw new GraphValidationError(
        `mount-declared action '${qualifiedId}' goTo unknown page '${actionDef.goTo}'.`,
      );
    }
    // The sentinel is read BEFORE detectSchema, which would otherwise judge the
    // author's explicit "no input" an unrecognized schema and refuse it.
    if (actionDef.input !== undefined && !takesNoInput(actionDef.input) && detectSchema(actionDef.input) === 'none') {
      throw new GraphValidationError(
        `mount-declared action '${qualifiedId}' has an unrecognized input schema — pass a Zod schema, a ` +
          `JSON Schema object, a validator with .safeParse/.parse, or the string 'none' for an action that ` +
          `takes no input.`,
      );
    }
    if (actionDef.enabledWhen) {
      if (Object.keys(actionDef.enabledWhen).length === 0) {
        throw new GraphValidationError(
          `mount-declared action '${qualifiedId}' has an empty enabledWhen {} — omit it.`,
        );
      }
      validateGuardShape(
        `mount-declared action '${qualifiedId}' enabledWhen`,
        actionDef.enabledWhen as Record<string, unknown>,
      );
    }
    if (actionDef.verify && typeof actionDef.verify !== 'function') {
      if (Object.keys(actionDef.verify).length === 0) {
        throw new GraphValidationError(
          `mount-declared action '${qualifiedId}' has an empty verify {} — it could only ever refuse. Omit it.`,
        );
      }
      validateGuardShape(
        `mount-declared action '${qualifiedId}' verify`,
        actionDef.verify as Record<string, unknown>,
      );
    }
    // Authoring is authoring, at either door: the object form is judged here in
    // the compiler's own words (one shared sentence, one owner apiece), and the
    // function form is a reader, refused at READ time instead.
    if (actionDef.blockedBecause !== undefined && typeof actionDef.blockedBecause !== 'function') {
      validateBlockedBecause(`mount-declared action '${qualifiedId}'`, actionDef.blockedBecause);
    }
    // The same law in the same words at this door too — a decision that belongs
    // to a person is a declaration, and authoring is authoring wherever it
    // happens.
    if (actionDef.humanDecides !== undefined) {
      validateHumanDecides(`mount-declared action '${qualifiedId}'`, actionDef.humanDecides);
    }
    // Never-trap BUILD gate at the mount door too: authoring is authoring
    // whether it happens in the def or at registration — same law, same words.
    if (actionDef.binding?.kind === 'url') {
      checkLiteralHref(`mount-declared action '${qualifiedId}'`, actionDef.binding.href);
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
      ...(actionDef.when ? [actionDef.when as Record<string, unknown>] : []),
    ]) as WhereFilter | undefined;
    const affordance = Object.freeze({
      id: qualifiedId,
      on: [node.page],
      description: actionDef.does,
      binding: actionDef.binding ? structuredClone(actionDef.binding) : undefined,
      guard,
      effect:
        actionDef.writes || actionDef.goTo
          ? {
              ...(actionDef.writes ? { writes: [...actionDef.writes] } : {}),
              ...(actionDef.goTo ? { navigatesTo: actionDef.goTo } : {}),
            }
          : undefined,
      schema: schemaOf(actionDef.input),
      ...noInputFlag(actionDef.input),
      ...(actionDef.enabledWhen ? { enabledWhen: structuredClone(actionDef.enabledWhen) } : {}),
      // Same split the compile door takes: a reader by reference, a written
      // sentence cloned so the overlay owns its bytes.
      ...(actionDef.blockedBecause !== undefined
        ? {
            blockedBecause:
              typeof actionDef.blockedBecause === 'function'
                ? actionDef.blockedBecause
                : structuredClone(actionDef.blockedBecause),
          }
        : {}),
      // A predicate stays by reference (it is code, like a validator); a
      // declarative contract is cloned, so the overlay owns its bytes.
      ...(actionDef.verify
        ? { verify: typeof actionDef.verify === 'function' ? actionDef.verify : structuredClone(actionDef.verify) }
        : {}),
      // Carried verbatim onto the overlay affordance, cloned so it owns its
      // bytes — the compile door's own line, one door over.
      ...(actionDef.humanDecides !== undefined
        ? { humanDecides: structuredClone(actionDef.humanDecides) }
        : {}),
      highEffect: actionDef.confirm ?? false,
      role: actionDef.role ?? (actionDef.goTo ? 'next' : 'action'),
      descriptionSource: 'registration',
    }) as Affordance;
    this.#dynamic.set(qualifiedId, [...(existing ?? []), { owner, affordance }]);
    this.#mergedSpec = null;
    if (actionDef.handler) this.bindHandler(group, this.#registryKey(qualifiedId, instance), actionDef.handler);
    return qualifiedId;
  }

  #resolveActionOnNode(path: string, name: string): string {
    const qualified = `${path}.${name}`;
    if (this.spec.affordances[qualified]) return qualified;
    if (this.spec.affordances[name]) return name; // already-qualified id or root action
    throw new Error(
      `hcifootprint: mount('${path}') binds unknown action '${name}' — declare it in the navigation ` +
        `graph (or pass it in registerActions({actions})). Known here: ${Object.keys(this.spec.affordances)
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

  setVisible(path: Paths, visible: boolean): void {
    this.#requireNode(path);
    this.#presence.setVisible(path, visible);
    this.noteStructureChange();
  }

  /** Show a node; for a tab this also hides its tab siblings (at most one shown). */
  show(path: Paths): void {
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
      /* v8 ignore next -- the `?? this.node` arm is unreachable: walkNode passes a null parent exactly once per PAGE, and the `kind === 'page'` return above has already taken every page. It names the floor this walk falls to, so no rootless node can spin the loop. */
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
      this.#overlaySeen.set(path, this.#now());
      return;
    }
    const warnKey = `overlay:${path}`;
    if (this.#now() - firstSeen >= this.#graceMs && !this.#warnedOnce.has(warnKey)) {
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
      : /* v8 ignore next -- the parentless arm is unreachable: only a page is walked with a null parent, so a node of kind 'tab' always has the container that declared it. It says the true thing about a lone tab — it is its own only sibling — rather than reading `children` off nothing. */ [tab];
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
      /* v8 ignore next -- the `?? tab.path` arm is unreachable twice over: a tab always has the parent that declared it, and a parentless tab would be its own only sibling — which can never satisfy the "more than one mounted sibling" test that leads here. */
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
      /* v8 ignore next 4 -- unreachable from a compiled graph: buildNavigationGraph files an actionNodes row for every affordance it compiles, mount-declared ids resolve to their own node's path, and super.available() only ever serves affordances offered ON this page — so a served edge always has a node here. The arm keeps a projection-only action (one served by a spec whose tree nobody walked) behaving exactly as it did before the tree existed, instead of quietly vanishing from available(). */
      if (!path) {
        edges.push(edge); // defensive: a projection action with no tree node keeps v1 semantics
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

  /**
   * The tree gates (visibility, overlay masking, instance keys, mounting) run
   * BEFORE the base fire, so the same runtime-optional/type-required contract
   * has to hold here too — otherwise `session.fire('page.action')` from JS would
   * still crash in this override, one frame before the one it was fixed in.
   */
  override fire(affordanceId: string, opts: FireOptions = UNATTRIBUTED_FIRE): FireResult {
    const source = principalOf(opts);
    const affordance = this.spec.affordances[affordanceId];
    if (affordance) {
      const path = this.#pathOnCurrentPage(affordanceId);
      if (path) {
        const gate = this.#gateNode(path);
        if (!gate.served) {
          this.recordRejection(affordanceId, gate.reason, source);
          return gate.reason === 'BLOCKED_BY_OVERLAY'
            ? { ok: false, reason: 'BLOCKED_BY_OVERLAY', overlay: gate.overlay }
            : { ok: false, reason: 'NODE_NOT_VISIBLE', node: gate.node };
        }
        const node = this.#map.nodes[path];
        if (node.repeats) {
          const existence = this.#instanceExistence(node);
          if (opts.instance === undefined) {
            this.recordRejection(affordanceId, 'INSTANCE_REQUIRED', source);
            return { ok: false, reason: 'INSTANCE_REQUIRED', instances: existence.keys.slice(0, 50) };
          }
          // Membership against the FULL set — the render cap must never make
          // instance #51 unfireable.
          if (!existence.keys.includes(opts.instance)) {
            this.recordRejection(affordanceId, 'INSTANCE_UNKNOWN', source);
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
          this.recordRejection(affordanceId, 'STILL_MOUNTING', source);
          return { ok: false, reason: 'STILL_MOUNTING', node: path };
        }
        const result = super.fire(affordanceId, opts);
        if (result.ok) this.#focusPath = path; // fire evidence moves focus
        return result;
      }
    }
    return super.fire(affordanceId, opts);
  }

  protected override handlerFor(affordanceId: string, opts: FireOptions): ActionHandler | undefined {
    if (opts.instance !== undefined) {
      // Instance-keyed registration first, then the base resolution — which is
      // registry-then-url-synthesis, so the resolution ORDER stays one story
      // everywhere: keyed handler > base handler > navigate-derived gesture.
      return (
        this.registry.handlerFor(this.#registryKey(affordanceId, opts.instance)) ??
        super.handlerFor(affordanceId, opts)
      );
    }
    return super.handlerFor(affordanceId, opts);
  }

  /**
   * The commit gate's widening for repeats containers: an entry wired ONLY
   * per instance ('cancel-order[o-123]') CAN act — the fire that follows
   * carries the instance key — so its frame must open. Without this arm the
   * gate asks handlerFor with no instance, answers undefined, and refuses a
   * journey that is fully agent-drivable (a false ENTRY_NOT_MATERIALIZED).
   * '[' is a reserved segment character (checkSegment), so the prefix scan
   * can never claim another affordance's keys.
   */
  protected override couldMaterialise(affordanceId: string): boolean {
    if (super.couldMaterialise(affordanceId)) return true;
    const prefix = `${affordanceId}[`;
    return this.registry.registrations().some((r) => r.affordanceId.startsWith(prefix));
  }

  /**
   * A REPEATS ROW HOLDS NOTHING THIS LIBRARY CAN NAME, in v1.
   *
   * One served row stands for every mounted card of a repeats container — that is
   * what `instances` says out loud — while a value reader answers once. So the
   * honest answer is one row and many values, and there is no arithmetic that
   * turns the one into the other: picking a row would be a guessed instance, and
   * a guessed instance on a value is a lie about which card the human is looking
   * at. Silence, and the warning says so once per action so an app that declared
   * a reader learns why its row is bare.
   *
   * The upgrade is a per-instance door, and it is deliberately not this one: it
   * would have to key by instance everywhere the value door keys by action, and
   * the surface it changes (`holds` on a row that already carries `instances`) is
   * the one nobody has asked for yet.
   */
  protected override servesHolds(affordanceId: string): boolean {
    const path = this.#pathOnCurrentPage(affordanceId);
    if (path === null || this.#map.nodes[path]?.repeats !== true) return true;
    const warnKey = `holds:${affordanceId}`;
    if (!this.#warnedOnce.has(warnKey)) {
      this.#warnedOnce.add(warnKey);
      this.warn(
        `hcifootprint: '${affordanceId}' is on a repeats container, so its row stands for every mounted ` +
          `card at once and one reader cannot say which — holds stays absent for it rather than naming a ` +
          `guessed row. The value still rides the fire, which carries the instance key.`,
      );
    }
    return false;
  }

  /**
   * Instance-aware disabled gate: a per-row button registered disabled under
   * 'id[instance]' must block, matching how handlerFor resolves it. Falls back
   * to the base (non-instance) registration.
   *
   * The DECLARATION is asked first and outranks both: `enabledWhen` is a
   * statement about the control itself, so it greys every row of a repeats
   * container at once — an instance registered enabled cannot re-open a door
   * the app has said is shut.
   */
  protected override isActionDisabled(affordanceId: string, opts: FireOptions): boolean {
    if (this.declaredDisabled(affordanceId)) return true;
    if (opts.instance !== undefined) {
      const keyed = this.registry.isEnabled(this.#registryKey(affordanceId, opts.instance));
      if (keyed !== undefined) return keyed === false;
    }
    return this.registry.isEnabled(affordanceId) === false;
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
          this.#foreignSeen.set(path, this.#now());
        }
      }
    }
    return result;
  }

  /**
   * The tree knows one more true thing about position: WHERE inside the page
   * the cursor rests. It rides the facts block's cursor section rather than its
   * tail, because it is part of the same answer to "where am I".
   */
  protected override positionLines(): string[] {
    const focus = this.#focusLine();
    return focus === null ? super.positionLines() : [...super.positionLines(), focus];
  }

  /** 'Focus: <path>.' — or null when focus is just the page (nothing to add). */
  #focusLine(): string | null {
    return this.focus !== this.node ? `Focus: ${this.focus}.` : null;
  }

  override contextBrief(opts?: ContextBriefOptions): ContextBrief {
    this.#driftCheck();
    const brief = super.contextBrief(opts);
    const lines: string[] = [];
    const focus = this.#focusLine();
    if (focus !== null) lines.push(focus);
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

  /** The action's node on the CURRENT page, or null (root actions resolve to the page node). */
  #pathOnCurrentPage(affordanceId: string): string | null {
    const declared = this.#map.actionNodes[affordanceId];
    if (declared) {
      return declared.find((path) => this.#map.nodes[path]?.page === this.node) ?? null;
    }
    /* v8 ignore else -- the fall-through arm is unreachable for the same reason as the `return null` it leads to: every id that gets this far came out of this.spec.affordances, which is exactly actionNodes ∪ #dynamic. */
    if (this.#dynamic.has(affordanceId)) {
      const path = affordanceId.split('.').slice(0, -1).join('.');
      return this.#map.nodes[path]?.page === this.node ? path : null;
    }
    /* v8 ignore next -- unreachable for the same reason as the `!path` arm in available(): every id that gets this far came out of this.spec.affordances, and that set is exactly actionNodes ∪ #dynamic. It is the honest answer for an id from neither — no node, rather than a guessed one. */
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
    const now = this.#now();
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
            `'${this.node}' — its actions are dormant. Either sync() is missing a page change or a component ` +
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
    // Enabled state IS included — a setEnabled flip changes the served surface.
    const handlers = this.registry
      .registrations()
      // Enabled instance-keyed registrations ('id[key]') are excluded (scroll
      // churn is not world motion) — but a DISABLED instance action IS kept, so a
      // per-row setEnabled(false) flip changes the fingerprint and flushes. A
      // BUSY instance action is kept on the same terms and for the same reason:
      // the app said something about that card, and saying it is not scrolling.
      .filter(
        (registration) =>
          !registration.affordanceId.includes('[') ||
          !registration.enabled ||
          registration.busy !== undefined,
      )
      .map(registrationMark)
      .sort()
      .join('|');
    return `${handlers}::${this.#presence.fingerprint()}::dyn=${[...this.#dynamic.keys()].sort().join('|')}`;
  }
}

function sanitizeKey(key: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(key).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120);
}
