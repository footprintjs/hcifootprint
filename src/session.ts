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
  PendingInfo,
  Principal,
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
} from './types.js';
import { edgesToMCPTools, leaveSkillTool } from './mcp.js';

interface PendingTransition {
  record: TransitionRecord;
  affordance: Affordance;
}

export class Session {
  readonly #spec: SkillGraphSpec;
  #node: string;
  #version = 0;
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
  /** Closed frames (completed / cancelled / demoted), oldest first. */
  readonly #frames: SkillFrame[] = [];

  constructor(spec: SkillGraphSpec, opts: SessionOptions) {
    if (!spec.pages[opts.node]) {
      throw new Error(
        `hcifootprint: unknown starting node '${opts.node}'. Known pages: ${Object.keys(spec.pages).join(', ')}.`,
      );
    }
    this.#spec = spec;
    this.#node = opts.node;
    const initial = structuredClone(opts.state ?? {});
    this.#log = new EventLog(initial);
    this.#heap = new SharedMemory(undefined, initial);
    this.#counter = createExecutionCounter();
    this.#redacted = new Set(opts.redactedKeys ?? []);
    this.#commitValues = opts.commitValues ?? 'delta';
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

  get version(): number {
    return this.#version;
  }

  /** Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references). */
  state(): Record<string, unknown> {
    return structuredClone(this.#stateView());
  }

  // -------------------------------------------------------------------------
  // available — the LLM's action space
  // -------------------------------------------------------------------------

  available(): AvailableSlice {
    const edges: AvailableEdge[] = [];
    for (const aff of Object.values(this.#spec.affordances)) {
      if (!aff.on.includes(this.#node)) continue;
      const { matched, conditions } = this.#evalGuard(aff.guard);
      if (!matched) continue;
      edges.push({
        affordanceId: aff.id,
        description: aff.description,
        role: aff.role,
        evidence: conditions,
        schema: aff.schema,
        highEffect: aff.highEffect,
        binding: aff.binding,
      });
    }
    return { version: this.#version, node: this.#node, edges };
  }

  /** Why an affordance is (or is not) available right now — per-condition evidence. */
  explain(affordanceId: string): Explanation {
    const aff = this.#spec.affordances[affordanceId];
    if (!aff) {
      throw new Error(
        `hcifootprint: unknown affordance '${affordanceId}'. Known: ${Object.keys(this.#spec.affordances).join(', ')}.`,
      );
    }
    const offeredOnThisNode = aff.on.includes(this.#node);
    const { matched, conditions } = this.#evalGuard(aff.guard);
    return {
      affordanceId,
      node: this.#node,
      offeredOnThisNode,
      guardPassed: matched,
      available: offeredOnThisNode && matched,
      evidence: conditions,
    };
  }

  /** Skill-level disclosure for the planning LLM (descriptions + feasibility, no tool detail). */
  availableSkills(): { version: number; node: string; skills: AvailableSkill[] } {
    const skills: AvailableSkill[] = [];
    for (const skill of Object.values(this.#spec.skills)) {
      const pre = this.#evalGuard(skill.precondition);
      const entry = this.#spec.affordances[skill.steps[0]];
      const entryGuard = this.#evalGuard(entry.guard);
      skills.push({
        id: skill.id,
        description: skill.description,
        steps: [...skill.steps],
        preconditionPassed: pre.matched,
        evidence: pre.conditions,
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
    const skill = this.#spec.skills[skillId];
    if (!skill) {
      return { ok: false, reason: 'UNKNOWN_SKILL', known: Object.keys(this.#spec.skills) };
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
    };
    this.#version++; // the served action space just changed
    return { ok: true, frame: this.#frameCopy()!, plan: this.skillPlan(skillId), version: this.#version };
  }

  /**
   * Close the open frame. Default reason: 'completed' if every step was
   * committed while the frame was open, else 'cancelled'. Returns the closed
   * frame, or null when none was open.
   */
  leaveSkill(opts?: { reason?: 'completed' | 'cancelled' }): SkillFrame | null {
    if (!this.#frame) return null;
    const skill = this.#spec.skills[this.#frame.skillId];
    const allDone = skill.steps.every((step) => this.#frame!.firedSteps.includes(step));
    this.#frame.status = opts?.reason ?? (allDone ? 'completed' : 'cancelled');
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    const closed = this.#frameCopy(this.#frame);
    this.#frame = null;
    this.#version++; // back to skill-level disclosure
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
    const skill = this.#spec.skills[skillId];
    if (!skill) {
      throw new Error(
        `hcifootprint: unknown skill '${skillId}'. Known: ${Object.keys(this.#spec.skills).join(', ')}.`,
      );
    }
    const steps: SkillPlanStep[] = skill.steps.map((stepId) => {
      const aff = this.#spec.affordances[stepId];
      const guardKeys = Object.keys(aff.guard ?? {});
      const dependsOn = skill.steps
        .filter((otherId) => otherId !== stepId)
        .map((otherId) => {
          const other = this.#spec.affordances[otherId];
          const viaKeys = (other.effect?.writes ?? []).filter((key) => guardKeys.includes(key));
          return { affordanceId: otherId, viaKeys };
        })
        .filter((dep) => dep.viaKeys.length > 0);

      const { matched, conditions } = this.#evalGuard(aff.guard);
      const done =
        this.#frame?.skillId === skillId && this.#frame.firedSteps.includes(stepId);
      const status = done
        ? 'done'
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
      } as SkillPlanStep;
    });
    return { skillId, description: skill.description, steps };
  }

  // -------------------------------------------------------------------------
  // fire — apply a transition with provenance
  // -------------------------------------------------------------------------

  /** Returned transition records are LIVE views — settlement updates them in place. */
  fire(affordanceId: string, opts: FireOptions): FireResult {
    const aff = this.#spec.affordances[affordanceId];
    if (!aff) {
      return {
        ok: false,
        reason: 'UNKNOWN_AFFORDANCE',
        available: this.available().edges.map((e) => e.affordanceId),
      };
    }
    if (opts.expectedVersion !== undefined && opts.expectedVersion !== this.#version) {
      return { ok: false, reason: 'STALE_CURSOR', version: this.#version };
    }
    if (!aff.on.includes(this.#node)) {
      return { ok: false, reason: 'NOT_ON_NODE', node: this.#node };
    }
    // Guards are re-evaluated at fire time — plan-time guards are advisory.
    const { matched, conditions } = this.#evalGuard(aff.guard);
    if (!matched) {
      return { ok: false, reason: 'GUARD_FAILED', evidence: conditions };
    }
    if (aff.schema !== undefined) {
      const validation = validatePayload(aff.schema, opts.payload);
      if (!validation.ok) {
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
      fromNode: this.#node,
      cursorVersion: this.#version,
    };
    this.#transitions.push(record);
    this.#version++; // firing changes the world the next plan must see

    const declaredWrites = aff.effect?.writes ?? [];
    if (declaredWrites.length > 0) {
      // The app owns the real handler; the delta arrives via updateState().
      this.#pending.push({ record, affordance: aff });
      return { ok: true, transition: record, version: this.#version, settlement: 'awaiting-state' };
    }
    this.#settle(record, aff, {});
    return { ok: true, transition: record, version: this.#version, settlement: 'settled' };
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
    if (!explicitStimulus && this.#pending.length > 0) {
      const pending = this.#pending[0];
      this.#settle(pending.record, pending.affordance, delta);
      this.#pending.shift();
      return { ok: true, attributed: true, transition: pending.record, version: this.#version };
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
    this.#checkFrameAfterWorldChange();
    return { ok: true, attributed: false, transition: record, version: this.#version };
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
    const offGraph = !this.#spec.pages[observedNode];
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
      evidence: t.evidence ? [...t.evidence] : undefined,
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

  /**
   * Per-edge MCP tool descriptors for the CURRENT slice. Regenerated per call
   * — never cached. With a skill frame open, serves ONLY the frame's
   * currently-fireable steps + escape tools (authored cancel/back roles and a
   * synthetic leave-skill) — the on-demand disclosure contract.
   */
  toMCPTools(opts?: { lossySchemas?: boolean }): MCPToolDescription[] {
    const served = this.#servedEdges();
    const tools = edgesToMCPTools(this.#spec, served.edges, opts);
    if (served.escape) tools.push(leaveSkillTool(this.#spec, this.#frame!.skillId));
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

    const lines: string[] = [`You are on: ${this.#node}.`];
    if (this.#frame) {
      const skill = this.#spec.skills[this.#frame.skillId];
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

  #evalGuard(guard: WhereFilter | undefined): { matched: boolean; conditions: FilterCondition[] } {
    if (!guard) return { matched: true, conditions: [] };
    const state = this.#stateView();
    return evaluateFilter(
      (key) => state[key],
      (key) => this.#redacted.has(key),
      guard,
    );
  }

  #settle(record: TransitionRecord, aff: Affordance, delta: Record<string, unknown>): void {
    // Read provenance = the guard keys this transition's availability rested on.
    this.#commitDelta(aff.id, record.id, Object.keys(aff.guard ?? {}), delta);

    const deltaKeys = Object.keys(delta);
    const declared = aff.effect?.writes;
    record.effectVerified =
      declared && declared.length > 0 ? declared.every((key) => deltaKeys.includes(key)) : 'unobservable';
    if (aff.effect?.navigatesTo) {
      // Declared target = expectation, flagged as a CLAIM; sync() records reality.
      this.#node = aff.effect.navigatesTo;
      record.toNode = aff.effect.navigatesTo;
      record.toNodeClaimed = true;
    } else {
      // A non-navigating affordance never moves the record's cursor — even if
      // an interleaved sync() moved the session's.
      record.toNode = record.fromNode;
    }
    record.outcome = 'committed';
    this.#version++;

    if (
      this.#frame &&
      this.#spec.skills[this.#frame.skillId].steps.includes(aff.id) &&
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
    const steps = this.#spec.skills[this.#frame.skillId].steps;
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
    const skill = this.#spec.skills[this.#frame.skillId];
    if (!skill.precondition) return;
    if (this.#evalGuard(skill.precondition).matched) return;
    this.#frame.status = 'demoted';
    this.#frame.closedAtVersion = this.#version;
    this.#frames.push(this.#frame);
    this.#frame = null;
    this.#version++;
  }

  #frameCopy(frame: SkillFrame | null = this.#frame): SkillFrame | null {
    return frame ? { ...frame, firedSteps: [...frame.firedSteps] } : null;
  }

  /** One authored-strings-only line per transition for contextBrief(). */
  #briefLine(t: TransitionRecord, changedKeysById: Map<string, string[]>): string {
    if (t.cause.kind === 'fired') {
      const aff = this.#spec.affordances[t.cause.affordanceId ?? ''];
      const moved = t.toNode && t.toNode !== t.fromNode ? ` (${t.fromNode} → ${t.toNode})` : '';
      const flags: string[] = [];
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
      return `${t.cause.principal} ${t.cause.stimulus}: cursor moved ${t.fromNode} → ${t.toNode} (unverified edge)`;
    }
    const keys = changedKeysById.get(t.id) ?? [];
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
