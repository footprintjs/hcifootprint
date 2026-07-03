/**
 * Session — the traverse() driver: available / fire / sync.
 *
 * footprint's executor drives a chart to completion and its decide() picks one
 * branch. A live UI is inverted: the user/agent drives edge-by-edge, and from
 * any node the driver exposes all guard-passing edges and waits for the world
 * to pick one. So this driver never touches footprint's engine. It reuses the
 * transactional memory/commit/trace stack instead:
 *
 *   one fired-or-stimulus transition
 *     → one fresh StageContext (runId '' = root namespace)
 *     → tracked reads (guard keys) + tracked writes (the settled delta)
 *     → commit() → one CommitBundle in the EventLog
 *
 * which makes footprint's whole post-hoc toolchain (causalChain, sliceForKey,
 * arrayProvenance, commitValueAt) work on UI sessions unchanged. Guard
 * evaluation itself is footprint's pure `evaluateFilter` — no scope, no
 * commit, evidence-emitting, worker-safe.
 *
 * Longevity rules honored (from the footprint execution-model adjudication):
 * fresh context per transition (never createNext — it retains every context),
 * runId stays '' (non-empty runIds namespace writes and break slice matching),
 * runtimeStageId uniqueness via a monotonic counter.
 */
import {
  EventLog,
  ScopeFacade,
  SharedMemory,
  StageContext,
  buildRuntimeStageId,
  createExecutionCounter,
  evaluateFilter,
} from 'footprintjs/advanced';
import type { CommitBundle, ExecutionCounter, FilterCondition } from 'footprintjs/advanced';
import type { MCPToolDescription, ScopeRecorder, WhereFilter } from 'footprintjs';
import { formatSlice, keysReadFromMap, sliceForKey } from 'footprintjs/trace';
import type {
  Affordance,
  AvailableEdge,
  AvailableSkill,
  AvailableSlice,
  CommitSkillResult,
  ContextBrief,
  ContextBriefOptions,
  Explanation,
  FireOptions,
  FireResult,
  GapRecord,
  PendingInfo,
  Principal,
  ReportGapOptions,
  SessionOptions,
  SkillFrame,
  SkillGraphSpec,
  SkillPlan,
  SkillPlanStep,
  StimulusKind,
  SyncResult,
  TransitionRecord,
  UpdateOptions,
  UpdateResult,
} from '../atom/types.js';
import { edgesToMCPTools, leaveSkillTool } from '../serve/mcp.js';
import { ToolRegistry } from '../registry/registry.js';
import type { ToolHandler } from '../registry/registry.js';

interface PendingTransition {
  record: TransitionRecord;
  affordance: Affordance;
  /**
   * True while this fire's registered handler is still executing (or has
   * failed). Bare-FIFO attribution skips such entries: the handler has first
   * claim on its own record — another fire's report must never steal it.
   */
  handlerInFlight?: boolean;
  /**
   * Tapless-session mode (stateTap false): nothing will ever call
   * updateState(), so the handler's successful completion settles this record
   * with an empty delta and effectVerified 'unobservable' — instead of the v1
   * behavior of pending-forever (the D18 rung-killer fix).
   */
  settleOnCompletion?: boolean;
}

/** registerTools() input: one group per component/section, existing handlers by reference. */
export interface RegisterToolsOptions {
  group: string;
  tools: Record<string, ToolHandler>;
}

/** registerTools() output: optional exact-provenance triggers + the group's cleanup. */
export interface RegisteredTools {
  /**
   * Wrapped manual triggers (same signature as the app's handlers): calling
   * one records the action as source 'user' AND invokes the handler — the
   * opt-in precision tier. Wire a trigger IN PLACE OF the handler at the call
   * site (the trigger invokes it for you); keeping both wired executes the
   * handler twice. If you cannot replace the call site, rely on the zero-touch
   * tiers instead (DOM sensor / effect-signature inference).
   */
  triggers: Record<string, (payload?: unknown) => FireResult>;
  /** Unregister everything this call registered (call on unmount). */
  unregister: () => void;
}

export class Session {
  readonly #spec: SkillGraphSpec;
  #node: string;
  #version = 0;
  /** Committed state deltas only (settle / stimulus / inference). */
  #stateVersion = 0;
  /** Served-structure changes only (frames + coalesced registration/presence swaps). */
  #structureVersion = 0;
  /** Whether updateState() reports are expected (see SessionOptions.stateTap). */
  readonly #stateTap: boolean;
  /** Fingerprint of the served structure at the last coalesced flush. */
  #structureFingerprint = '';
  #structureFlushScheduled = false;
  readonly #heap: SharedMemory;
  readonly #log: EventLog;
  readonly #counter: ExecutionCounter;
  readonly #redacted: Set<string>;
  readonly #commitValues: 'full' | 'delta';
  readonly #transitions: TransitionRecord[] = [];
  readonly #pending: PendingTransition[] = [];
  /** runtimeStageId → keys tracked-read, collected live via the scope channel. */
  readonly #readsByStep = new Map<string, string[]>();
  readonly #recorder: ScopeRecorder;
  /** The one open skill frame (v0: one at a time). */
  #frame: SkillFrame | null = null;
  /**
   * Record id whose handler is executing its SYNCHRONOUS portion right now.
   * updateState() called from inside that portion attributes directly to this
   * record (like transitionId targeting) — the fix for the burst-fire race
   * where another handler's report would FIFO-steal an earlier record.
   */
  #invokingRecordId: string | null = null;
  /** Closed frames (completed / cancelled / demoted), oldest first. */
  readonly #frames: SkillFrame[] = [];
  readonly #registry: ToolRegistry;
  readonly #warn: (message: string) => void;
  /** Unmet demand: rejected fires + explicitly reported unserved asks. */
  readonly #gaps: GapRecord[] = [];
  readonly #gapListeners = new Set<(gap: GapRecord) => void>();

  constructor(spec: SkillGraphSpec, opts: SessionOptions) {
    if (!spec.pages[opts.node]) {
      throw new Error(
        `hcifootprint: unknown starting node '${opts.node}'. Known pages: ${Object.keys(spec.pages).join(', ')}.`,
      );
    }
    this.#spec = spec;
    this.#node = opts.node;
    this.#stateTap = opts.stateTap ?? opts.state !== undefined;
    const initial = structuredClone(opts.state ?? {});
    this.#log = new EventLog(initial);
    this.#heap = new SharedMemory(undefined, initial);
    this.#counter = createExecutionCounter();
    this.#redacted = new Set(opts.redactedKeys ?? []);
    this.#commitValues = opts.commitValues ?? 'delta';
    this.#warn = opts.onWarn ?? ((message) => console.warn(message));
    this.#registry = new ToolRegistry(this.#warn);
    this.#recorder = {
      id: 'hcifootprint-session',
      onRead: (event) => {
        if (!event.key || !event.runtimeStageId) return;
        const reads = this.#readsByStep.get(event.runtimeStageId) ?? [];
        reads.push(event.key);
        this.#readsByStep.set(event.runtimeStageId, reads);
      },
    };
  }

  get node(): string {
    return this.#node;
  }

  /** The compiled graph's id (namespaces MCP tool names). */
  get graphId(): string {
    return this.spec.id;
  }

  /** The one CAS/sinceVersion cursor: total order over ALL world motion. */
  get version(): number {
    return this.#version;
  }

  /**
   * D18 version split — `version` stays the single total-order cursor; these
   * two say WHAT moved. A scrolling list must never staleness-fail a plan the
   * way a closing modal must; consumers watching for re-render/replan can
   * subscribe to the axis they care about.
   */
  get stateVersion(): number {
    return this.#stateVersion;
  }

  get structureVersion(): number {
    return this.#structureVersion;
  }

  /** The compiled spec every lookup goes through — NavSession overlays mount-declared tools here. */
  protected get spec(): SkillGraphSpec {
    return this.#spec;
  }

  /** The live-binding registry (protected seam for NavSession's per-instance handlers). */
  protected get registry(): ToolRegistry {
    return this.#registry;
  }

  /** The session's dev-warning sink (protected seam for subclass layers). */
  protected warn(message: string): void {
    this.#warn(message);
  }

  /**
   * Re-baseline the coalesced structure fingerprint. A subclass whose
   * structureFingerprint() override reads its OWN fields must call this once
   * at the end of its constructor (the base constructor cannot: a virtual
   * call there would touch subclass fields before they initialize).
   */
  protected resetStructureBaseline(): void {
    this.#structureFingerprint = this.structureFingerprint();
  }

  /** Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references). */
  state(): Record<string, unknown> {
    return structuredClone(this.#stateView());
  }

  // -------------------------------------------------------------------------
  // available — the LLM's action space
  // -------------------------------------------------------------------------

  available(): AvailableSlice {
    const flagMaterialized = this.#registry.hasAny();
    const edges: AvailableEdge[] = [];
    for (const aff of Object.values(this.spec.affordances)) {
      if (!aff.on.includes(this.#node)) continue;
      const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
      if (!matched) continue;
      edges.push({
        affordanceId: aff.id,
        description: aff.description,
        role: aff.role,
        ...(flagMaterialized ? { materialized: this.#registry.isRegistered(aff.id) } : {}),
        evidence: conditions,
        ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
        schema: aff.schema,
        highEffect: aff.highEffect,
        binding: aff.binding,
        ...(aff.descriptionSource === 'registration' ? { descriptionSource: 'registration' as const } : {}),
      });
    }
    return { version: this.#version, node: this.#node, edges };
  }

  // -------------------------------------------------------------------------
  // registerTools — the live-binding wire (declare statically, bind dynamically)
  // -------------------------------------------------------------------------

  /**
   * Register the app's EXISTING handlers (by reference) as the live bindings
   * for declared affordances — purely additive to the app's code. One group
   * per component/section; call the returned unregister (or
   * unregisterGroup(group)) on unmount, and the tools lazily disappear.
   *
   * Registration carries no planner-facing strings: descriptions, guards,
   * effects, and schemas come from the declared graph only.
   */
  registerTools(opts: RegisterToolsOptions): RegisteredTools {
    const unknown = Object.keys(opts.tools).filter((id) => !this.spec.affordances[id]);
    if (unknown.length > 0) {
      throw new Error(
        `hcifootprint: registerTools group '${opts.group}' includes undeclared affordance(s) ` +
          `${unknown.map((u) => `'${u}'`).join(', ')} — declare them in the skill graph first ` +
          `(known: ${Object.keys(this.spec.affordances).join(', ')}).`,
      );
    }
    const triggers: Record<string, (payload?: unknown) => FireResult> = {};
    for (const [affordanceId, handler] of Object.entries(opts.tools)) {
      this.#registry.register(opts.group, affordanceId, handler);
      triggers[affordanceId] = (payload?: unknown) =>
        this.fire(affordanceId, { source: 'user', payload });
    }
    this.noteStructureChange();
    return { triggers, unregister: () => this.unregisterGroup(opts.group) };
  }

  /** Remove every live binding currently owned by `group` (component unmount). */
  unregisterGroup(group: string): string[] {
    const removed = this.#registry.unregisterGroup(group);
    if (removed.length > 0) this.noteStructureChange();
    return removed;
  }

  /** Why an affordance is (or is not) available right now — per-condition evidence. */
  explain(affordanceId: string): Explanation {
    const aff = this.spec.affordances[affordanceId];
    if (!aff) {
      throw new Error(
        `hcifootprint: unknown affordance '${affordanceId}'. Known: ${Object.keys(this.spec.affordances).join(', ')}.`,
      );
    }
    const offeredOnThisNode = aff.on.includes(this.#node);
    const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
    return {
      affordanceId,
      node: this.#node,
      offeredOnThisNode,
      guardPassed: matched,
      available: offeredOnThisNode && matched,
      evidence: conditions,
      ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
    };
  }

  /** Skill-level disclosure for the planning LLM (descriptions + feasibility, no tool detail). */
  availableSkills(): { version: number; node: string; skills: AvailableSkill[] } {
    const skills: AvailableSkill[] = [];
    for (const skill of Object.values(this.spec.skills)) {
      const pre = this.#evalGuard(skill.precondition);
      const entry = this.spec.affordances[skill.steps[0]];
      const entryGuard = this.#evalGuard(entry.guard);
      skills.push({
        id: skill.id,
        description: skill.description,
        steps: [...skill.steps],
        preconditionPassed: pre.matched,
        evidence: pre.conditions,
        ...(pre.unevaluable.length > 0 ? { preconditionUnevaluable: pre.unevaluable } : {}),
        entryAvailable: entry.on.includes(this.#node) && entryGuard.matched,
      });
    }
    return { version: this.#version, node: this.#node, skills };
  }

  // -------------------------------------------------------------------------
  // Skill frames — on-demand disclosure: serve skills, expand tools on commit
  // -------------------------------------------------------------------------

  /**
   * Commit to a skill: opens a frame so toMCPTools()/contextBrief() serve ONLY
   * that skill's currently-fireable steps plus escape tools — the token win
   * (skills for planning, tools on commit). One frame at a time in v0.
   */
  commitSkill(
    skillId: string,
    opts?: { source?: Principal; expectedVersion?: number },
  ): CommitSkillResult {
    const skill = this.spec.skills[skillId];
    if (!skill) {
      return { ok: false, reason: 'UNKNOWN_SKILL', known: Object.keys(this.spec.skills) };
    }
    if (opts?.expectedVersion !== undefined && opts.expectedVersion !== this.#version) {
      return { ok: false, reason: 'STALE_CURSOR', version: this.#version };
    }
    if (this.#frame) {
      return { ok: false, reason: 'FRAME_ALREADY_OPEN', skillId: this.#frame.skillId };
    }
    const pre = this.#evalGuard(skill.precondition);
    if (!pre.matched) {
      return { ok: false, reason: 'PRECONDITION_FAILED', evidence: pre.conditions };
    }
    this.#frame = {
      skillId,
      status: 'open',
      principal: opts?.source ?? 'agent',
      openedAt: Date.now(),
      openedAtVersion: this.#version,
      firedSteps: [],
      inferredSteps: [],
    };
    this.#version++; // the served action space just changed
    this.#structureVersion++;
    return { ok: true, frame: this.#frameCopy()!, plan: this.skillPlan(skillId), version: this.#version };
  }

  /**
   * Close the open frame. Default reason: 'completed' if every step was
   * committed while the frame was open, else 'cancelled'. Returns the closed
   * frame, or null when none was open.
   */
  leaveSkill(opts?: { reason?: 'completed' | 'cancelled' }): SkillFrame | null {
    if (!this.#frame) return null;
    const skill = this.spec.skills[this.#frame.skillId];
    // Completion counts observed AND inferred steps; inferredSteps on the
    // returned frame says which of them were guesses.
    const allDone = skill.steps.every(
      (step) => this.#frame!.firedSteps.includes(step) || this.#frame!.inferredSteps.includes(step),
    );
    this.#frame.status = opts?.reason ?? (allDone ? 'completed' : 'cancelled');
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    const closed = this.#frameCopy(this.#frame);
    this.#frame = null;
    this.#version++; // back to skill-level disclosure
    this.#structureVersion++;
    return closed;
  }

  /** The open skill frame (snapshot), or null. */
  skillFrame(): SkillFrame | null {
    return this.#frameCopy();
  }

  /** Frame history: every closed frame (completed / cancelled / demoted), oldest first. */
  frames(): SkillFrame[] {
    return this.#frames.map((f) => this.#frameCopy(f)!);
  }

  /**
   * The DERIVED intra-skill dependency DAG with live status. Dependencies are
   * computed, never authored: step B depends on step A when A's declared
   * effect.writes overlap B's guard keys — the guard×effect atoms already
   * encode the ordering, so it cannot drift from the graph.
   */
  skillPlan(skillId: string): SkillPlan {
    const skill = this.spec.skills[skillId];
    if (!skill) {
      throw new Error(
        `hcifootprint: unknown skill '${skillId}'. Known: ${Object.keys(this.spec.skills).join(', ')}.`,
      );
    }
    const steps: SkillPlanStep[] = skill.steps.map((stepId) => {
      const aff = this.spec.affordances[stepId];
      const guardKeys = Object.keys(aff.guard ?? {});
      const dependsOn = skill.steps
        .filter((otherId) => otherId !== stepId)
        .map((otherId) => {
          const other = this.spec.affordances[otherId];
          const viaKeys = (other.effect?.writes ?? []).filter((key) => guardKeys.includes(key));
          return { affordanceId: otherId, viaKeys };
        })
        .filter((dep) => dep.viaKeys.length > 0);

      const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
      const frameForSkill = this.#frame?.skillId === skillId ? this.#frame : null;
      const status = frameForSkill?.firedSteps.includes(stepId)
        ? 'done'
        : frameForSkill?.inferredSteps.includes(stepId)
          ? 'inferred-done'
          : !matched
            ? 'blocked'
            : aff.on.includes(this.#node)
              ? 'ready'
              : 'off-node';
      return {
        affordanceId: stepId,
        description: aff.description,
        status,
        dependsOn,
        onNodes: [...aff.on],
        ...(status === 'blocked' ? { blockedOn: conditions.filter((c) => !c.result) } : {}),
        ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
      } as SkillPlanStep;
    });
    return { skillId, description: skill.description, steps };
  }

  // -------------------------------------------------------------------------
  // fire — apply a transition with provenance
  // -------------------------------------------------------------------------

  /** Returned transition records are LIVE views — settlement updates them in place. */
  fire(affordanceId: string, opts: FireOptions): FireResult {
    const aff = this.spec.affordances[affordanceId];
    if (!aff) {
      const available = this.available().edges.map((e) => e.affordanceId);
      this.recordRejection(affordanceId, 'UNKNOWN_AFFORDANCE', opts.source, undefined, available);
      return { ok: false, reason: 'UNKNOWN_AFFORDANCE', available };
    }
    if (opts.expectedVersion !== undefined && opts.expectedVersion !== this.#version) {
      this.recordRejection(affordanceId, 'STALE_CURSOR', opts.source);
      return { ok: false, reason: 'STALE_CURSOR', version: this.#version };
    }
    if (!aff.on.includes(this.#node)) {
      this.recordRejection(affordanceId, 'NOT_ON_NODE', opts.source);
      return { ok: false, reason: 'NOT_ON_NODE', node: this.#node };
    }
    // Guards are re-evaluated at fire time — plan-time guards are advisory.
    const { matched, conditions, unevaluable } = this.#evalGuard(aff.guard);
    if (!matched) {
      this.recordRejection(affordanceId, 'GUARD_FAILED', opts.source, conditions);
      return { ok: false, reason: 'GUARD_FAILED', evidence: conditions };
    }
    if (aff.schema !== undefined) {
      const validation = validatePayload(aff.schema, opts.payload);
      if (!validation.ok) {
        this.recordRejection(affordanceId, 'PAYLOAD_INVALID', opts.source);
        return { ok: false, reason: 'PAYLOAD_INVALID', issues: validation.issues };
      }
    }

    const record: TransitionRecord = {
      id: buildRuntimeStageId(affordanceId, this.#counter.value++),
      cause: { kind: 'fired', affordanceId, principal: opts.source },
      timestamp: Date.now(),
      payload: opts.payload,
      outcome: 'pending',
      evidence: conditions,
      // Unevaluated conditions are taken on faith (the app is the enforcer at
      // L0/L1) — the record says so instead of pretending the guard passed.
      ...(unevaluable.length > 0 ? { guardUnevaluated: unevaluable } : {}),
      fromNode: this.#node,
      cursorVersion: this.#version,
    };
    this.#transitions.push(record);
    this.#version++; // firing changes the world the next plan must see

    const declaredWrites = aff.effect?.writes ?? [];
    if (declaredWrites.length > 0 && this.#stateTap) {
      // The app owns the real handler; the delta arrives via updateState().
      this.#pending.push({ record, affordance: aff });
      this.#invokeHandler(record, affordanceId, opts);
      return { ok: true, transition: record, version: this.#version, settlement: 'awaiting-state' };
    }
    if (declaredWrites.length > 0) {
      // No state tap: nothing will ever report a delta. A registered handler
      // settles this record on ITS completion; with nothing to execute, settle
      // now. Either way effectVerified is honestly 'unobservable'.
      const willExecute = opts.invoke !== false && this.handlerFor(affordanceId, opts) !== undefined;
      if (willExecute) {
        this.#pending.push({ record, affordance: aff, settleOnCompletion: true });
        this.#invokeHandler(record, affordanceId, opts);
        return { ok: true, transition: record, version: this.#version, settlement: 'awaiting-state' };
      }
      this.#settle(record, aff, {}, { forceUnobservable: true });
      this.#invokeHandler(record, affordanceId, opts);
      return { ok: true, transition: record, version: this.#version, settlement: 'settled' };
    }
    this.#settle(record, aff, {});
    this.#invokeHandler(record, affordanceId, opts);
    return { ok: true, transition: record, version: this.#version, settlement: 'settled' };
  }

  /**
   * D13: fire() executes when a live binding exists. Fire-and-forget — the
   * app's state tap reports the real delta as usual; a throwing handler
   * auto-rejects its still-pending transition (or rolls back an
   * already-committed immediate settle) instead of leaving a lie in the log.
   *
   * Attribution safety: while the handler's synchronous portion runs,
   * updateState() attributes to THIS record directly; while the handler is in
   * flight (or failed), bare-FIFO skips this record so a neighbor's report
   * can never steal it.
   */
  #invokeHandler(record: TransitionRecord, affordanceId: string, opts: FireOptions): void {
    if (opts.invoke === false) return; // record-only (the DOM sensor's mode)
    const handler = this.handlerFor(affordanceId, opts);
    if (!handler) return;
    const pendingEntry = this.#pending.find((p) => p.record.id === record.id);
    if (pendingEntry) pendingEntry.handlerInFlight = true;
    void Promise.resolve()
      .then(() => {
        this.#invokingRecordId = record.id;
        try {
          return handler(opts.payload);
        } finally {
          this.#invokingRecordId = null;
        }
      })
      .then(() => {
        const entry = this.#pending.find((p) => p.record.id === record.id);
        if (!entry) return;
        if (entry.settleOnCompletion) {
          // Tapless session: the handler finishing IS the settlement signal.
          this.#pending.splice(this.#pending.indexOf(entry), 1);
          this.#settle(entry.record, entry.affordance, {}, { forceUnobservable: true });
          return;
        }
        entry.handlerInFlight = false; // async app: the tap's later report may FIFO-settle it
      })
      .catch((error) => {
        const index = this.#pending.findIndex((p) => p.record.id === record.id);
        if (index >= 0) {
          // Effect never landed: reject the pending so later deltas are not mis-attributed.
          this.#pending.splice(index, 1);
          record.outcome = 'rejected';
          this.#version++;
        } else if (record.outcome === 'committed' && record.effectVerified === 'unobservable') {
          // Immediate/tapless settle committed BEFORE the handler ran and the
          // handler failed: the commit was a claim about an action that never
          // happened. Roll it back and, if the settle moved the cursor on the
          // navigation CLAIM, walk the cursor back honestly. A commit backed by
          // REAL evidence (a state report settled it, effectVerified true) is
          // stronger than the handler's failure — that one stands.
          record.outcome = 'rolled-back';
          this.#version++;
          if (record.toNodeClaimed && record.toNode === this.#node && record.fromNode !== this.#node) {
            this.sync(record.fromNode, { stimulus: 'navigation', principal: 'system' });
          }
        }
        this.#warn(`hcifootprint: handler for '${affordanceId}' threw: ${String(error)}`);
      });
  }

  // -------------------------------------------------------------------------
  // updateState — the app reports reality; pending transitions settle
  // -------------------------------------------------------------------------

  /**
   * Report a projected-state delta from the app (router/store tap).
   *
   * Attribution, in priority order:
   * 1. `opts.transitionId` — settles that pending transition precisely (preferred).
   * 2. `opts.stimulus`/`opts.principal` set — recorded as a stimulus transition,
   *    NEVER attributed to a pending fire (explicit attribution wins; a server
   *    push must not hijack a pending action's provenance).
   * 3. Otherwise: FIFO to the oldest pending fired transition. With several
   *    pendings and out-of-order app handlers this can mis-attribute — pass
   *    transitionId from your tap when you can; effectVerified=false is the
   *    designed detector for key mismatches.
   * 4. No pendings, no hints: recorded as a `stimulus:'unknown'` transition —
   *    state never moves silently.
   */
  updateState(delta: Record<string, unknown>, opts?: UpdateOptions): UpdateResult {
    // Validate BEFORE consuming a pending: a non-cloneable value (function, DOM
    // node) must reject loudly without destroying the attribution queue.
    try {
      structuredClone(delta);
    } catch (error) {
      return { ok: false, reason: 'UNCLONEABLE_DELTA', issues: String(error) };
    }

    if (opts?.transitionId !== undefined) {
      const index = this.#pending.findIndex((p) => p.record.id === opts.transitionId);
      if (index < 0) {
        return {
          ok: false,
          reason: 'UNKNOWN_TRANSITION',
          pending: this.#pending.map((p) => p.record.id),
        };
      }
      const [pending] = this.#pending.splice(index, 1);
      this.#settle(pending.record, pending.affordance, delta);
      return { ok: true, attributed: true, transition: pending.record, version: this.#version };
    }

    const explicitStimulus = opts?.stimulus !== undefined || opts?.principal !== undefined;

    // A handler reporting synchronously from inside its own invocation settles
    // its OWN record — precise attribution, immune to the burst-fire race.
    if (!explicitStimulus && this.#invokingRecordId !== null) {
      const index = this.#pending.findIndex((p) => p.record.id === this.#invokingRecordId);
      if (index >= 0) {
        const [pending] = this.#pending.splice(index, 1);
        this.#settle(pending.record, pending.affordance, delta);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
    }

    if (!explicitStimulus && this.#pending.length > 0) {
      // Bare FIFO skips records whose handler is still in flight — the handler
      // has first claim on its own record (see #invokeHandler).
      const index = this.#pending.findIndex((p) => !p.handlerInFlight);
      if (index >= 0) {
        const pending = this.#pending[index];
        this.#settle(pending.record, pending.affordance, delta);
        this.#pending.splice(index, 1);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
      // Every pending is handler-in-flight. If the delta covers exactly ONE
      // in-flight pending's declared writes, it is that handler's own report
      // (arriving from its async portion, past the #invokingRecordId window) —
      // settle THAT record precisely instead of stranding it forever.
      const deltaKeys = Object.keys(delta);
      const own = this.#pending.filter((p) => {
        const writes = p.affordance.effect?.writes ?? [];
        return writes.length > 0 && writes.every((key) => deltaKeys.includes(key));
      });
      if (own.length === 1) {
        const pending = own[0];
        this.#settle(pending.record, pending.affordance, delta);
        this.#pending.splice(this.#pending.indexOf(pending), 1);
        return { ok: true, attributed: true, transition: pending.record, version: this.#version };
      }
      // Ambiguous or non-matching: fall through to stimulus (never inference —
      // guessing while fires are in flight fabricates duplicates).
    }

    // Tier-2 effect-signature inference — only with NO hints and NO pendings.
    // The no-pendings condition is load-bearing: with an async handler still in
    // flight, ITS own report would otherwise match its affordance's signature
    // and fabricate a duplicate inferred transition while the real pending
    // starves. In-flight world = wait for the pending machinery; guessing is
    // for quiet moments only.
    if (!explicitStimulus && this.#pending.length === 0) {
      const inferred = this.#inferAffordanceForDelta(Object.keys(delta));
      if (inferred) {
        const guardEval = this.#evalGuard(inferred.guard);
        const record: TransitionRecord = {
          id: buildRuntimeStageId(inferred.id, this.#counter.value++),
          cause: { kind: 'fired', affordanceId: inferred.id, principal: 'unknown', inferred: true },
          timestamp: Date.now(),
          outcome: 'pending',
          evidence: guardEval.conditions,
          ...(guardEval.unevaluable.length > 0 ? { guardUnevaluated: guardEval.unevaluable } : {}),
          fromNode: this.#node,
          cursorVersion: this.#version,
        };
        this.#commitDelta(inferred.id, record.id, Object.keys(inferred.guard ?? {}), delta);
        record.outcome = 'committed';
        record.toNode = this.#node; // inference never moves the cursor — that would be guessing twice
        record.effectVerified = true; // writes ⊆ delta by construction of the match
        this.#transitions.push(record);
        this.#version++;
        this.#stateVersion++;
        // A guessed completion never advances firedSteps, but it must be VISIBLE
        // to the plan — 'inferred-done' — or the agent blind-refires the step.
        if (
          this.#frame &&
          this.spec.skills[this.#frame.skillId].steps.includes(inferred.id) &&
          !this.#frame.firedSteps.includes(inferred.id) &&
          !this.#frame.inferredSteps.includes(inferred.id)
        ) {
          this.#frame.inferredSteps.push(inferred.id);
        }
        this.#checkFrameAfterWorldChange();
        return { ok: true, attributed: false, transition: record, version: this.#version };
      }
    }

    const stimulus = opts?.stimulus ?? 'unknown';
    const record: TransitionRecord = {
      id: buildRuntimeStageId(`stimulus:${stimulus}`, this.#counter.value++),
      cause: { kind: 'stimulus', stimulus, principal: opts?.principal ?? 'system' },
      timestamp: Date.now(),
      outcome: 'pending',
      fromNode: this.#node,
      cursorVersion: this.#version,
    };
    // No tracked reads: the causal layer will honestly flag untracked sources.
    this.#commitDelta(`stimulus:${stimulus}`, record.id, [], delta);
    record.outcome = 'committed';
    record.toNode = this.#node;
    record.effectVerified = 'unobservable';
    this.#transitions.push(record);
    this.#version++;
    if (Object.keys(delta).length > 0) this.#stateVersion++;
    this.#checkFrameAfterWorldChange();
    return { ok: true, attributed: false, transition: record, version: this.#version };
  }

  /** Exactly-one match rule: ambiguity refuses to guess (falls through to stimulus). */
  #inferAffordanceForDelta(deltaKeys: string[]): Affordance | null {
    const candidates = Object.values(this.spec.affordances).filter((aff) => {
      if (!this.#registry.isRegistered(aff.id)) return false;
      if (!aff.on.includes(this.#node)) return false;
      const writes = aff.effect?.writes ?? [];
      if (writes.length === 0) return false;
      if (!writes.every((key) => deltaKeys.includes(key))) return false;
      return this.#evalGuard(aff.guard).matched;
    });
    return candidates.length === 1 ? candidates[0] : null;
  }

  /** Fired transitions still awaiting their state report (oldest first). */
  pending(): PendingInfo[] {
    return this.#pending.map((p) => ({
      id: p.record.id,
      affordanceId: p.affordance.id,
      firedAt: p.record.timestamp,
    }));
  }

  /**
   * The app rejected/rolled back a transition's effect (optimistic UI).
   * Works on a PENDING transition (effect never landed → no bundle) and on an
   * already-SETTLED one (server rejected after the optimistic report): the
   * record flips to rolled-back and the app's compensating delta should follow
   * via updateState — the commit log keeps both writes, honestly.
   */
  reject(
    transitionId: string,
    opts?: { outcome?: 'rejected' | 'rolled-back' | 'superseded' },
  ): TransitionRecord {
    const index = this.#pending.findIndex((p) => p.record.id === transitionId);
    if (index >= 0) {
      const [pending] = this.#pending.splice(index, 1);
      pending.record.outcome = opts?.outcome ?? 'rejected';
      this.#version++;
      return pending.record;
    }
    const settled = this.#transitions.find((t) => t.id === transitionId && t.outcome === 'committed');
    if (settled) {
      settled.outcome = opts?.outcome ?? 'rolled-back';
      this.#version++;
      return settled;
    }
    throw new Error(
      `hcifootprint: no pending or committed transition '${transitionId}' to reject.`,
    );
  }

  // -------------------------------------------------------------------------
  // sync — reconcile the cursor when the world moved without an offered edge
  // -------------------------------------------------------------------------

  /**
   * The observed node is runtime input from the world, so an unauthored page
   * is NOT an error: the cursor follows reality (off-graph), available()
   * honestly serves zero edges there, and the hop is still recorded.
   */
  sync(observedNode: string, opts?: { stimulus?: StimulusKind; principal?: Principal }): SyncResult {
    if (observedNode === this.#node) {
      return { changed: false, node: this.#node, version: this.#version };
    }
    const offGraph = !this.spec.pages[observedNode];
    const record: TransitionRecord = {
      id: buildRuntimeStageId(`sync:${observedNode}`, this.#counter.value++),
      cause: {
        kind: 'stimulus',
        stimulus: opts?.stimulus ?? 'navigation',
        principal: opts?.principal ?? 'system',
      },
      timestamp: Date.now(),
      outcome: 'committed',
      effectVerified: 'unobservable',
      unverifiedEdge: true, // this hop passed no guard — slices treat it as inferred
      fromNode: this.#node,
      toNode: observedNode,
      cursorVersion: this.#version,
    };
    // Empty commit — footprint's own idiom: empty commits are deliberate cursor stops.
    this.#commitDelta(`sync:${observedNode}`, record.id, [], {});
    this.#node = observedNode;
    this.#transitions.push(record);
    this.#version++;
    this.#checkFrameAfterWorldChange();
    return offGraph
      ? { changed: true, transition: record, node: this.#node, version: this.#version, offGraph: true }
      : { changed: true, transition: record, node: this.#node, version: this.#version };
  }

  // -------------------------------------------------------------------------
  // Trace surface — footprint's post-hoc toolchain over this session
  // -------------------------------------------------------------------------

  /** The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition. */
  commitLog(): CommitBundle[] {
    return [...this.#log.list()];
  }

  /**
   * The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
   * bundles by TransitionRecord.id; pending and rejected/rolled-back rows
   * exist only here (their effects never touched state). Rows are snapshots —
   * live records are the ones returned by fire()/updateState()/reject().
   */
  transitions(): readonly TransitionRecord[] {
    return this.#transitions.map((t) => ({
      ...t,
      cause: { ...t.cause },
      evidence: t.evidence ? t.evidence.map((condition) => ({ ...condition })) : undefined,
      ...(t.guardUnevaluated ? { guardUnevaluated: [...t.guardUnevaluated] } : {}),
    }));
  }

  /** "Why does this state key hold its value?" — footprint backward slice, formatted. */
  why(key: string): string {
    const slice = sliceForKey(this.#log.list(), key, keysReadFromMap(this.#readsByStep));
    return formatSlice(slice);
  }

  /** runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup). */
  readsByStep(): ReadonlyMap<string, string[]> {
    return this.#readsByStep;
  }

  // -------------------------------------------------------------------------
  // Gap ledger — unmet demand, the input to "which skill should we build next"
  // -------------------------------------------------------------------------

  /**
   * Report an ask that no available action or skill could serve (typically
   * called by the agent's report_gap tool before it apologizes). The row is
   * token-lean by design: the ask plus NAME lists, never descriptions.
   */
  reportGap(opts: ReportGapOptions): GapRecord {
    const row: GapRecord = {
      kind: 'reported',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      ...this.#gapContext(),
      request: opts.request.slice(0, 500),
      reason: opts.reason ?? 'other',
      ...(opts.note !== undefined ? { note: opts.note.slice(0, 500) } : {}),
      ...(opts.principal !== undefined ? { principal: opts.principal } : {}),
    };
    this.#pushGap(row);
    return structuredClone(row);
  }

  /** The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline. */
  gaps(): GapRecord[] {
    return this.#gaps.map((g) => structuredClone(g));
  }

  /** Live export hook: fires once per new gap row. Returns an unsubscribe. */
  onGap(listener: (gap: GapRecord) => void): () => void {
    this.#gapListeners.add(listener);
    return () => this.#gapListeners.delete(listener);
  }

  /** Every refused fire becomes a gap-ledger row (protected: NavSession adds tree rejections). */
  protected recordRejection(
    affordanceId: string,
    rejectionReason: NonNullable<GapRecord['rejectionReason']>,
    principal: Principal,
    evidence?: FilterCondition[],
    precomputedActions?: string[],
  ): void {
    this.#pushGap({
      kind: 'fire-rejected',
      timestamp: Date.now(),
      node: this.#node,
      version: this.#version,
      availableActions: precomputedActions ?? this.available().edges.map((e) => e.affordanceId),
      availableSkills: Object.keys(this.spec.skills),
      affordanceId,
      rejectionReason,
      principal,
      // Copy the CONDITION OBJECTS too — the same objects ride FireResult.evidence,
      // and a caller annotating those must not rewrite the ledger.
      ...(evidence !== undefined ? { evidence: evidence.map((c) => ({ ...c })) } : {}),
    });
  }

  /** Names only — token-lean and injection-safe context for triage. */
  #gapContext(): { availableActions: string[]; availableSkills: string[] } {
    return {
      availableActions: this.available().edges.map((e) => e.affordanceId),
      availableSkills: Object.keys(this.spec.skills),
    };
  }

  #pushGap(row: GapRecord): void {
    this.#gaps.push(row);
    for (const listener of this.#gapListeners) {
      try {
        listener(structuredClone(row)); // deep copy: exporter mutation must never touch the ledger
      } catch (error) {
        // Consumer export code must never break the session (recorder rule).
        this.#warn(`hcifootprint: onGap listener threw: ${String(error)}`);
      }
    }
  }

  /**
   * Per-edge MCP tool descriptors for the CURRENT slice. Regenerated per call
   * — never cached. With a skill frame open, serves ONLY the frame's
   * currently-fireable steps + escape tools (authored cancel/back roles and a
   * synthetic leave-skill) — the on-demand disclosure contract.
   */
  toMCPTools(opts?: { lossySchemas?: boolean }): MCPToolDescription[] {
    const served = this.#servedEdges();
    const tools = edgesToMCPTools(this.spec, served.edges, opts);
    if (served.escape) tools.push(leaveSkillTool(this.spec, this.#frame!.skillId));
    return tools;
  }

  /**
   * Token-lean, prompt-ready session context for the next chat turn: current
   * position, the open frame, and who did what since `sinceVersion` (the
   * agent's last look). Built from AUTHORED strings and structural facts only
   * — state values and payloads never enter the text.
   */
  contextBrief(opts?: ContextBriefOptions): ContextBrief {
    const sinceVersion = opts?.sinceVersion;
    const max = opts?.maxTransitions ?? 20;
    const relevant = this.#transitions.filter(
      (t) => sinceVersion === undefined || t.cursorVersion >= sinceVersion,
    );
    const omitted = Math.max(0, relevant.length - max);
    const shown = relevant.slice(-max);
    const changedKeysById = new Map(
      this.#log
        .list()
        .map((b) => [b.runtimeStageId, Object.keys({ ...(b.overwrite ?? {}), ...(b.updates ?? {}) })]),
    );

    const lines: string[] = [`You are on: ${this.#nodeLabel(this.#node)}.`];
    if (this.#frame) {
      const skill = this.spec.skills[this.#frame.skillId];
      lines.push(
        `Open skill: ${this.#frame.skillId} — ${skill.description} ` +
          `(${this.#frame.firedSteps.length}/${skill.steps.length} steps done).`,
      );
    }
    for (const f of this.#frames) {
      if (f.status !== 'demoted') continue;
      if (sinceVersion !== undefined && (f.closedAtVersion ?? 0) < sinceVersion) continue;
      lines.push(`Note: skill ${f.skillId} was demoted — its precondition no longer holds.`);
    }
    lines.push(
      sinceVersion !== undefined
        ? `Since version ${sinceVersion} (now ${this.#version}):`
        : `Session so far (version ${this.#version}):`,
    );
    if (shown.length === 0) lines.push('  (no actions)');
    if (omitted > 0) lines.push(`  … ${omitted} earlier action(s) omitted.`);
    for (const t of shown) lines.push(`  • ${this.#briefLine(t, changedKeysById)}`);

    const pend = this.pending();
    lines.push(
      pend.length
        ? `Pending (awaiting app state): ${pend.map((p) => p.affordanceId).join(', ')}.`
        : 'Pending: none.',
    );
    const served = this.#servedEdges();
    const names = served.edges.map((e) => e.affordanceId + (e.highEffect ? ' [high-effect]' : ''));
    if (served.escape) names.push('leave-skill');
    lines.push(`Available now: ${names.length > 0 ? names.join(', ') : '(nothing on this page)'}.`);

    return { node: this.#node, version: this.#version, frame: this.#frameCopy(), text: lines.join('\n') };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  #stateView(): Record<string, unknown> {
    return (this.#heap.getState() ?? {}) as Record<string, unknown>;
  }

  /**
   * Resolve the live handler for a fire. Protected seam: NavSession keys
   * repeats-container handlers by instance ('cancel-order[o-123]').
   */
  protected handlerFor(affordanceId: string, _opts: FireOptions): ToolHandler | undefined {
    return this.#registry.handlerFor(affordanceId);
  }

  /**
   * D18: registration/presence flips ARE world motion — but coalesced. Raw
   * registry edits apply immediately; the trace row + version bump flush once
   * per microtask, and a leave+enter of the same shape within one window
   * cancels to nothing (StrictMode double-mounts and HMR never pollute the
   * trace). This also fixes the verified v1 gap: registerTools never bumped
   * the version, so a plan made before a mount/unmount passed CAS after it.
   */
  protected noteStructureChange(): void {
    if (this.#structureFlushScheduled) return;
    this.#structureFlushScheduled = true;
    queueMicrotask(() => {
      this.#structureFlushScheduled = false;
      const now = this.structureFingerprint();
      if (now === this.#structureFingerprint) return; // net-zero churn: no row, no bump
      this.#structureFingerprint = now;
      const record: TransitionRecord = {
        id: buildRuntimeStageId('stimulus:structure-swap', this.#counter.value++),
        cause: { kind: 'stimulus', stimulus: 'structure-swap', principal: 'system' },
        timestamp: Date.now(),
        outcome: 'committed',
        effectVerified: 'unobservable',
        fromNode: this.#node,
        toNode: this.#node,
        cursorVersion: this.#version,
      };
      // Empty commit — footprint's deliberate-cursor-stop idiom.
      this.#commitDelta('stimulus:structure-swap', record.id, [], {});
      this.#transitions.push(record);
      this.#version++;
      this.#structureVersion++;
      this.#checkFrameAfterWorldChange();
    });
  }

  /**
   * What "the served structure" looks like right now — compared at flush time
   * against the last flushed value. NavSession extends this with the presence
   * set and visibility signals.
   */
  protected structureFingerprint(): string {
    return this.#registry
      .registrations()
      .map((r) => r.affordanceId)
      .sort()
      .join('|');
  }

  /**
   * Guard evaluation with the D18 honesty split: conditions over keys the
   * state view has never contained are UNEVALUABLE, not false. Evaluable
   * conditions decide matched; unevaluable keys are returned as a marker so
   * edges are served-with-honesty instead of silently hidden — the rung-killer
   * fix that lets one authored graph work at every rung of the ladder.
   */
  #evalGuard(guard: WhereFilter | undefined): {
    matched: boolean;
    conditions: FilterCondition[];
    unevaluable: string[];
  } {
    if (!guard) return { matched: true, conditions: [], unevaluable: [] };
    const state = this.#stateView();
    const unevaluable = Object.keys(guard).filter((key) => !(key in state));
    if (unevaluable.length === 0) {
      const { matched, conditions } = evaluateFilter(
        (key) => state[key],
        (key) => this.#redacted.has(key),
        guard,
      );
      return { matched, conditions, unevaluable };
    }
    const evaluable = Object.fromEntries(
      Object.entries(guard).filter(([key]) => key in state),
    ) as WhereFilter;
    // evaluateFilter deliberately never matches {} — an all-unevaluable guard
    // must not fall into that anti-vacuous-truth rule, so short-circuit.
    if (Object.keys(evaluable).length === 0) return { matched: true, conditions: [], unevaluable };
    const { matched, conditions } = evaluateFilter(
      (key) => state[key],
      (key) => this.#redacted.has(key),
      evaluable,
    );
    return { matched, conditions, unevaluable };
  }

  #settle(
    record: TransitionRecord,
    aff: Affordance,
    delta: Record<string, unknown>,
    settleOpts?: { forceUnobservable?: boolean },
  ): void {
    // Read provenance = the guard keys this transition's availability rested on.
    this.#commitDelta(aff.id, record.id, Object.keys(aff.guard ?? {}), delta);

    const deltaKeys = Object.keys(delta);
    const declared = aff.effect?.writes;
    record.effectVerified = settleOpts?.forceUnobservable
      ? 'unobservable' // tapless settlement: no report will ever exist to check against
      : declared && declared.length > 0
        ? declared.every((key) => deltaKeys.includes(key))
        : 'unobservable';
    if (aff.effect?.navigatesTo) {
      // Declared target = expectation, flagged as a CLAIM; sync() records reality.
      record.toNode = aff.effect.navigatesTo;
      record.toNodeClaimed = true;
      // The claim moves the LIVE cursor only if nothing else moved it since
      // this transition fired — a weaker claim must never clobber a newer
      // sync() observation that interleaved while the fire was pending.
      if (this.#node === record.fromNode) this.#node = aff.effect.navigatesTo;
    } else {
      // A non-navigating affordance never moves the record's cursor — even if
      // an interleaved sync() moved the session's.
      record.toNode = record.fromNode;
    }
    record.outcome = 'committed';
    this.#version++;
    if (deltaKeys.length > 0) this.#stateVersion++; // empty settles are cursor stops, not state motion

    if (
      this.#frame &&
      this.spec.skills[this.#frame.skillId].steps.includes(aff.id) &&
      !this.#frame.firedSteps.includes(aff.id)
    ) {
      this.#frame.firedSteps.push(aff.id);
    }
    this.#checkFrameAfterWorldChange();
  }

  /** The disclosure filter: full slice normally; frame steps + escape roles when a frame is open. */
  #servedEdges(): { edges: AvailableEdge[]; escape: boolean } {
    const edges = this.available().edges;
    if (!this.#frame) return { edges, escape: false };
    const steps = this.spec.skills[this.#frame.skillId].steps;
    return {
      edges: edges.filter(
        (e) => steps.includes(e.affordanceId) || e.role === 'cancel' || e.role === 'back',
      ),
      escape: true,
    };
  }

  /**
   * Demotion: after any world change, an open frame whose skill PRECONDITION
   * no longer holds is closed as 'demoted' — the served context re-collapses
   * to skill level and the agent replans. Step guards failing is normal DAG
   * progress and never demotes; skills without a precondition never demote.
   */
  #checkFrameAfterWorldChange(): void {
    if (!this.#frame) return;
    const skill = this.spec.skills[this.#frame.skillId];
    if (!skill.precondition) return;
    if (this.#evalGuard(skill.precondition).matched) return;
    this.#frame.status = 'demoted';
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    this.#frame = null;
    this.#version++;
    this.#structureVersion++;
  }

  #frameCopy(frame: SkillFrame | null = this.#frame): SkillFrame | null {
    return frame
      ? { ...frame, firedSteps: [...frame.firedSteps], inferredSteps: [...frame.inferredSteps] }
      : null;
  }

  /**
   * The brief's TEXT channel only carries authored strings. A page id is
   * authored; an OFF-GRAPH observed node name is runtime router text (an
   * attacker-influencable URL segment) — it renders as a constant label here
   * and stays available verbatim only in structured data fields.
   */
  #nodeLabel(name: string): string {
    return Object.hasOwn(this.spec.pages, name) ? name : '(an unmapped location, off the authored graph)';
  }

  /** One authored-strings-only line per transition for contextBrief(). */
  #briefLine(t: TransitionRecord, changedKeysById: Map<string, string[]>): string {
    if (t.cause.kind === 'fired') {
      const aff = this.spec.affordances[t.cause.affordanceId ?? ''];
      const moved =
        t.toNode && t.toNode !== t.fromNode
          ? ` (${this.#nodeLabel(t.fromNode)} → ${this.#nodeLabel(t.toNode)})`
          : '';
      const flags: string[] = [];
      if (t.cause.inferred) flags.push('inferred, not observed');
      if (aff?.highEffect) flags.push('high-effect');
      if (t.toNodeClaimed) flags.push('navigation claimed, unconfirmed');
      if (t.outcome === 'pending') flags.push('awaiting app state');
      if (t.outcome === 'rejected' || t.outcome === 'rolled-back' || t.outcome === 'superseded') {
        flags.push(t.outcome);
      }
      if (t.effectVerified === false) flags.push('declared effect not observed');
      const suffix = flags.length > 0 ? ` [${flags.join('; ')}]` : '';
      return `${t.cause.principal} fired ${t.cause.affordanceId} — ${aff?.description ?? ''}${moved}${suffix}`;
    }
    if (t.toNode && t.toNode !== t.fromNode) {
      return `${t.cause.principal} ${t.cause.stimulus}: cursor moved ${this.#nodeLabel(t.fromNode)} → ${this.#nodeLabel(t.toNode)} (unverified edge)`;
    }
    if (t.cause.stimulus === 'structure-swap') {
      return 'the served tool surface changed (something mounted, unmounted, or changed visibility)';
    }
    // Key NAMES are the designed disclosure (values never enter text) — but a
    // tap could relay hostile keys, so they are hardened before rendering.
    const keys = (changedKeysById.get(t.id) ?? []).map(
      // eslint-disable-next-line no-control-regex
      (key) => key.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 60),
    );
    return `${t.cause.principal} ${t.cause.stimulus} changed: ${keys.length > 0 ? keys.join(', ') : '(nothing)'}`;
  }

  /** One transition = one fresh StageContext = one CommitBundle. */
  #commitDelta(
    stageName: string,
    runtimeStageId: string,
    readKeys: string[],
    delta: Record<string, unknown>,
  ): void {
    const ctx = new StageContext('', stageName, stageName, this.#heap, '', this.#log);
    ctx.runtimeStageId = runtimeStageId;
    ctx.useCommitValues(this.#commitValues);
    ctx.useWriteProvenance('reads-prefix');
    const scope = new ScopeFacade(ctx, stageName);
    scope.attachScopeRecorder(this.#recorder);
    for (const key of readKeys) scope.getValue(key);
    for (const [key, value] of Object.entries(delta)) {
      scope.setValue(key, value, this.#redacted.has(key));
    }
    ctx.commit();
  }
}

function validatePayload(schema: unknown, payload: unknown): { ok: true } | { ok: false; issues: string } {
  const validator = schema as {
    safeParse?: (value: unknown) => { success: boolean; error?: unknown };
    parse?: (value: unknown) => unknown;
  };
  if (typeof validator.safeParse === 'function') {
    try {
      const result = validator.safeParse(payload);
      return result.success ? { ok: true } : { ok: false, issues: String(result.error) };
    } catch (error) {
      return { ok: false, issues: String(error) };
    }
  }
  if (typeof validator.parse === 'function') {
    try {
      validator.parse(payload);
      return { ok: true };
    } catch (error) {
      return { ok: false, issues: String(error) };
    }
  }
  // Plain JSON Schema: describes the payload to the LLM; v0 ships no JSON-Schema validator.
  return { ok: true };
}
