/**
 * testApp — a headless workflow runner for a navigation graph, over the REAL
 * session (never a parallel simulation). It is "Playwright for your interaction
 * logic, minus the browser": you write mock handlers (one per action, returning
 * a state change), then drive the graph two ways — `user.*` (like a human
 * clicking) and `agent.*` (like the LLM picking tools, through the real Mode B
 * serving path). Every assertion reads real session output, so a green test
 * exercises the same fire → updateState → commit code your users run.
 *
 * What it catches (the point of the feature): behavioral drift between the
 * graph and the app. When a mock reports a delta that does NOT cover the
 * action's declared `effect.writes`, the session's own honesty marker
 * (effectVerified) flips false — the graph drifted from the handler — and
 * `report()` surfaces it. Report-by-default; pass `strict: true` to fail the
 * test the instant drift appears.
 *
 * Honest boundary: this tests interaction LOGIC above the binding. It does NOT
 * verify pixels, the DOM, or that a binding's locator resolves to a real
 * element — that stays Playwright's job. And a mock is a simulation: if it
 * diverges from the real handler, the test is green while prod is broken. Use
 * `testApp({ session })` (bring-your-own wired session) for full fidelity;
 * effectVerified catches declaration-vs-delta drift even in mock mode.
 *
 * Layer note: imports the real Session (via graph.createSession) + the Mode B
 * port. Kept OUT of the lint path so a pure CI lint stays engine-free.
 */
import { skillsAsTools } from '../serve/modes.js';
import type { DoActionArgs, ServeResult, SkillCallArgs, SkillToolsPort } from '../serve/modes.js';
import type { NavigationGraph } from '../tree/types.js';
import type {
  InteractionSession,
  InteractionSessionOptions,
  ToolGroupHandle,
} from '../traverse/nav-session.js';
import type { FireResult, GapRecord, StimulusKind, TransitionRecord } from '../atom/types.js';
import type { MCPToolDescription } from 'footprintjs';

// ---------------------------------------------------------------------------
// Resolvers — the mock boundary (MSW-style: one per action, returns a delta)
// ---------------------------------------------------------------------------

export interface ResolverContext<State> {
  /** The current projected state, as the real handler would read it. */
  state: State;
}

export interface ResolverOutcome<State> {
  /**
   * The state change this action makes — reported through the REAL updateState,
   * so the session verifies it against the action's declared writes. Keep it
   * EXPLICIT (do not mirror effect.writes) or the drift check rubber-stamps
   * itself: the whole value is that the graph's claim and the mock's real delta
   * are independent.
   */
  patch?: Partial<State> & Record<string, unknown>;
  /** Navigate to this page after the delta (like the app's router confirming). */
  goTo?: string;
  /** The "act → data back" return value (search results, a looked-up record). */
  produced?: unknown;
}

/** One mock handler for an action. Synchronous — runs inside the precise-attribution window. */
export type Resolver<State> = (
  payload: unknown,
  ctx: ResolverContext<State>,
) => ResolverOutcome<State> | void;

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/** A controllable clock for deterministic time-dependent staleness tests. */
export interface TestClock {
  now(): number;
  set(ms: number): void;
  advance(ms: number): void;
}

export interface DriftReport {
  /** True when no declared-effect drift was observed (the release-readiness signal). */
  ok: boolean;
  /** Actions whose settled delta did not cover their declared writes — the graph drifted from the handler. */
  effectDrift: Array<{ transitionId: string; affordanceId: string; declaredWrites: string[] }>;
  /** Guard keys taken on faith because the state view never held them (honesty, not failure). */
  unevaluatedGuards: Array<{ transitionId: string; affordanceId: string; keys: string[] }>;
  /** The unmet-demand ledger: refused fires + reported gaps. */
  gaps: GapRecord[];
}

export interface TestAppOptions<State> {
  /** The initial projected state (guards read it; enables the state tap). */
  initialState?: State;
  /** One mock handler per action, keyed by affordance id (qualified or bare/leaf). */
  resolvers?: Record<string, Resolver<State>>;
  /** Starting page (default: the graph's first page). */
  node?: string;
  /** Fail the test the instant declared-effect drift appears. Default false (report-by-default). */
  strict?: boolean;
  /** Keys stored redacted in the commit log. */
  redactedKeys?: string[];
  /** Dormancy grace window for the drift/overlay timers (default 3000ms). */
  dormantGraceMs?: number;
  /** Sink for the session's dev warnings (default: collected, readable via warnings()). */
  onWarn?: (message: string) => void;
  /**
   * Bring your own already-wired session (real registerToolGroup / taps) for
   * full integration fidelity. In this mode the harness does NOT auto-mount or
   * inject a clock — it wraps what you built. `graph`/`resolvers` are ignored.
   */
  session?: InteractionSession;
}

export interface TestApp<State> {
  /** The real session under the hood — drop to it for anything the facade omits. */
  readonly session: InteractionSession;
  /** The current page id. */
  readonly node: string;
  /** The session cursor version. */
  readonly version: number;
  /** A detached snapshot of the projected state. */
  state(): State;
  /** Dev warnings the session emitted (StrictMode notes, handler errors, drift warnings). */
  warnings(): string[];
  /** The controllable clock (deterministic dormancy/mount-grace tests). */
  readonly clock: TestClock;
  /** Advance the injected clock (sugar for clock.advance). */
  advanceTime(ms: number): void;

  /** Drive like a human click. Throws on rejection (fail-fast). */
  readonly user: {
    /** Fire, auto-settle, return the settled record. Throws if the fire is refused. */
    fire(affordanceId: string, opts?: { payload?: unknown; instance?: string }): Promise<TransitionRecord>;
    /** Fire + auto-settle but NEVER throw — return the raw FireResult (inspect a rejection). */
    tryFire(affordanceId: string, opts?: { payload?: unknown; instance?: string }): Promise<FireResult>;
    /** Fire WITHOUT auto-settling — observe the pending/optimistic-UI window yourself. */
    fireRaw(affordanceId: string, opts?: { payload?: unknown; instance?: string }): FireResult;
  };

  /** Drive like the planning LLM, through the real Mode B port. Returns ServeResult (needs-confirm is data, never a throw). */
  readonly agent: {
    /** The FIXED tool array the model sees (one per skill + whats_here/do_action). */
    tools(): MCPToolDescription[];
    /** Call whats_here. */
    whatsHere(): Promise<ServeResult>;
    /** Open/step a skill by its id (maps to the skill's fixed tool). */
    skill(skillId: string, args?: SkillCallArgs): Promise<ServeResult>;
    /** Perform one action outside a skill flow (do_action). */
    do(action: string, args?: Omit<DoActionArgs, 'action'>): Promise<ServeResult>;
  };

  /** A world-initiated state change (server push, background update) — never blamed on a pending fire. */
  stimulus(patch: Partial<State> & Record<string, unknown>, opts?: { stimulus?: StimulusKind }): void;
  /** The browser back button (or any external navigation) — recorded as a stimulus sync. */
  back(page: string): void;

  /** Mount + show a modal/tab node's tools (not auto-mounted). Returns its handle. */
  open(path: string, opts?: { instance?: string }): ToolGroupHandle;
  /** Unmount a node opened with open(). */
  close(path: string): void;

  /** Drain to quiescence (auto-called by user.fire/agent.*; call it after fireRaw/stimulus). */
  settled(): Promise<void>;

  /** The honesty-marker drift report — the release-readiness signal. */
  report(): DriftReport;

  // --- assertions: throwing helpers (plain Error, no test-runner dependency) --
  /** Assert the cursor is on `page`. */
  expectOn(page: string): void;
  /** Assert the projected state contains these key/value pairs (deep). */
  expectState(partial: Partial<State> & Record<string, unknown>): void;
  /** Assert an action (by id or bare/leaf suffix) is available right now. */
  expectAvailable(affordanceId: string): void;
  /** Assert a FireResult was refused (optionally with a specific reason, e.g. 'GUARD_FAILED'). */
  expectRejected(result: FireResult, reason?: string): void;
  /** Assert a skill has a completed frame in the history. */
  expectSkillCompleted(skillId: string): void;
  /** Assert no declared-effect drift (optionally also fail on any gaps). The opt-in release gate. */
  expectClean(opts?: { includeGaps?: boolean }): void;
}

const SETTLE_CAP = 60;

/**
 * Build a headless test harness over a navigation graph. Wires each resolver as
 * a real handler, auto-mounts the current page's tools, and drives the real
 * session — so tests exercise production code, not a copy.
 */
export function testApp<State extends Record<string, unknown> = Record<string, unknown>>(
  graph: NavigationGraph,
  options?: TestAppOptions<State>,
): TestApp<State>;
export function testApp<State extends Record<string, unknown> = Record<string, unknown>>(
  options: TestAppOptions<State> & { session: InteractionSession },
): TestApp<State>;
export function testApp<State extends Record<string, unknown> = Record<string, unknown>>(
  graphOrOptions: NavigationGraph | (TestAppOptions<State> & { session: InteractionSession }),
  maybeOptions?: TestAppOptions<State>,
): TestApp<State> {
  const byo = !('spec' in graphOrOptions);
  const opts: TestAppOptions<State> = byo
    ? (graphOrOptions as TestAppOptions<State>)
    : maybeOptions ?? {};
  const graph = byo ? undefined : (graphOrOptions as NavigationGraph);

  const warnings: string[] = [];
  const warn = (message: string): void => {
    warnings.push(message);
    opts.onWarn?.(message);
  };

  // Controllable clock — starts at 0 so time is fully deterministic.
  let clockMs = 0;
  const clock: TestClock = {
    now: () => clockMs,
    set: (ms) => {
      clockMs = ms;
    },
    advance: (ms) => {
      clockMs += ms;
    },
  };

  const resolvers = opts.resolvers ?? {};
  const affordances = byo ? undefined : graph!.spec.affordances;
  const nodes = byo ? undefined : graph!.nodes;
  const toolNodes = byo ? undefined : graph!.toolNodes;

  const session: InteractionSession = byo
    ? opts.session!
    : graph!.createSession({
        ...(opts.node !== undefined ? { node: opts.node } : {}),
        ...(opts.initialState !== undefined ? { state: opts.initialState } : {}),
        ...(opts.redactedKeys !== undefined ? { redactedKeys: opts.redactedKeys } : {}),
        ...(opts.dormantGraceMs !== undefined ? { dormantGraceMs: opts.dormantGraceMs } : {}),
        now: clock.now,
        onWarn: warn,
      } satisfies InteractionSessionOptions);

  const port: SkillToolsPort = skillsAsTools(session, { source: 'agent' });
  const graphId = session.graphId;
  const sanitize = (name: string): string => name.replace(/[^A-Za-z0-9_.-]/g, '_');

  // --- resolver → handler wrapper -------------------------------------------

  function affordanceById(id: string): { id: string; declaresWrites: boolean } | null {
    if (!affordances) return null;
    if (affordances[id]) return { id, declaresWrites: (affordances[id].effect?.writes?.length ?? 0) > 0 };
    // bare/leaf: resolve to the single qualified id that ends with it
    const matches = Object.keys(affordances).filter((qid) => qid === id || qid.endsWith(`.${id}`));
    if (matches.length === 1) {
      const qid = matches[0];
      return { id: qid, declaresWrites: (affordances[qid].effect?.writes?.length ?? 0) > 0 };
    }
    return null;
  }

  function wrap(affId: string): (payload?: unknown) => unknown {
    const declaresWrites = (affordances?.[affId]?.effect?.writes?.length ?? 0) > 0;
    return (payload?: unknown) => {
      const resolver = resolvers[affId] ?? resolvers[leafOf(affId)];
      const out = resolver ? resolver(payload, { state: session.state() as State }) : undefined;
      const patch = out?.patch && Object.keys(out.patch).length > 0 ? out.patch : undefined;
      // A write-declaring action MUST settle its pending — even with no patch,
      // which honestly yields effectVerified:false (drift), surfaced not hidden.
      if (declaresWrites) {
        session.updateState((patch ?? {}) as Record<string, unknown>);
      } else if (patch) {
        // A no-writes action changed state it never declared: report it as an
        // explicit stimulus (NOT an anonymous delta), so effect-signature
        // inference can't misattribute it to another action's writes and fake a
        // step as inferred-done. Surface the graph gap instead of hiding it.
        warn(
          `hcifootprint/testing: action '${affId}' declares no writes but its resolver returned a state ` +
            `patch (${Object.keys(patch).join(', ')}) — recorded as an external stimulus. Add writes: [...] ` +
            `to this action in the graph if it really changes state.`,
        );
        session.updateState(patch as Record<string, unknown>, { stimulus: 'unknown', principal: 'system' });
      }
      if (out?.goTo) session.sync(out.goTo, { stimulus: 'navigation' });
      return out?.produced;
    };
  }

  function leafOf(id: string): string {
    return id.includes('.') ? id.slice(id.lastIndexOf('.') + 1) : id;
  }

  // --- auto-mount (page + area descendants; modals/tabs need open()) ---------

  let mountedPage: string | null = null;
  const autoHandles: ToolGroupHandle[] = [];
  const openHandles = new Map<string, ToolGroupHandle>();

  function autoMountable(path: string): boolean {
    if (!nodes) return false;
    for (let cursor = nodes[path]; cursor; cursor = cursor.parent ? nodes[cursor.parent] : undefined!) {
      if (cursor.kind === 'modal' || cursor.kind === 'tab') return false;
      if (!cursor.parent) break;
    }
    return true;
  }

  function handlersForNode(nodePath: string): Record<string, (payload?: unknown) => unknown> {
    const handlers: Record<string, (payload?: unknown) => unknown> = {};
    if (!affordances || !toolNodes) return handlers;
    for (const aff of Object.values(affordances)) {
      if (!(toolNodes[aff.id] ?? []).includes(nodePath)) continue;
      const leaf = aff.id.startsWith(`${nodePath}.`) ? aff.id.slice(nodePath.length + 1) : aff.id;
      handlers[leaf] = wrap(aff.id);
    }
    return handlers;
  }

  function remountForCurrentPage(): void {
    if (byo || !nodes) return;
    for (const handle of autoHandles.splice(0)) handle.unregister();
    const page = session.node;
    for (const node of Object.values(nodes)) {
      if (node.page !== page) continue;
      if (node.kind !== 'page' && node.kind !== 'area') continue;
      if (!autoMountable(node.path)) continue;
      const handlers = handlersForNode(node.path);
      if (Object.keys(handlers).length > 0) {
        autoHandles.push(session.registerToolGroup(node.path as never, { handlers }));
      }
    }
    mountedPage = page;
  }

  /**
   * Keep the mount current with the cursor BEFORE a drive fires — a prior
   * back()/stimulus/nav may have moved the page while the old page's tools are
   * still mounted. settle() re-syncs AFTER; this covers the before.
   */
  function syncMount(): void {
    if (!byo && mountedPage !== session.node) remountForCurrentPage();
  }

  // --- settle: drain microtasks + keep mounts synced with the cursor ---------

  const sig = (): string =>
    `${session.stateVersion}:${session.structureVersion}:${session.pending().length}:${session.node}`;

  async function drainMicrotasks(): Promise<void> {
    for (let k = 0; k < 8; k++) await Promise.resolve();
  }

  async function settle(): Promise<void> {
    for (let i = 0; i < SETTLE_CAP; i++) {
      if (!byo && mountedPage !== session.node) remountForCurrentPage();
      const before = sig();
      await drainMicrotasks();
      const after = sig();
      const mounted = byo || mountedPage === session.node;
      if (before === after && mounted && session.pending().length === 0) {
        if (opts.strict) assertNoDrift();
        return;
      }
    }
    throw new Error(
      `hcifootprint/testing: the app did not settle after ${SETTLE_CAP} rounds — an async mock never ` +
        `resolved, or a resolver keeps re-firing. Resolvers must be synchronous; observe pending windows ` +
        `with user.fireRaw instead.`,
    );
  }

  function assertNoDrift(): void {
    const drift = collectDrift();
    if (drift.length > 0) {
      const first = drift[0];
      throw new Error(
        `hcifootprint/testing: declared-effect drift on “${first.affordanceId}” — it claims to write ` +
          `${first.declaredWrites.map((k) => `“${k}”`).join(', ')} but the mock's delta did not cover that. ` +
          `The graph drifted from the handler. (strict mode)`,
      );
    }
  }

  // --- drift report ----------------------------------------------------------

  function collectDrift(): DriftReport['effectDrift'] {
    const out: DriftReport['effectDrift'] = [];
    for (const t of session.transitions()) {
      if (t.effectVerified === false && t.cause.kind === 'fired' && t.cause.affordanceId) {
        out.push({
          transitionId: t.id,
          affordanceId: t.cause.affordanceId,
          declaredWrites: [...(affordances?.[t.cause.affordanceId]?.effect?.writes ?? [])],
        });
      }
    }
    return out;
  }

  function report(): DriftReport {
    const effectDrift = collectDrift();
    const unevaluatedGuards: DriftReport['unevaluatedGuards'] = [];
    for (const t of session.transitions()) {
      if (t.guardUnevaluated && t.guardUnevaluated.length > 0 && t.cause.affordanceId) {
        unevaluatedGuards.push({
          transitionId: t.id,
          affordanceId: t.cause.affordanceId,
          keys: [...t.guardUnevaluated],
        });
      }
    }
    return { ok: effectDrift.length === 0, effectDrift, unevaluatedGuards, gaps: session.gaps() };
  }

  // --- helpers for assertions -----------------------------------------------

  function resolveId(id: string): string {
    const resolved = affordanceById(id);
    return resolved ? resolved.id : id;
  }

  function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return a.every((item, i) => deepEqual(item, b[i]));
    }
    const ak = Object.keys(a as object);
    const bk = Object.keys(b as object);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }

  // --- initial mount ---------------------------------------------------------

  if (!byo) remountForCurrentPage();

  // --- assembled surface -----------------------------------------------------

  const app: TestApp<State> = {
    session,
    get node() {
      return session.node;
    },
    get version() {
      return session.version;
    },
    state: () => session.state() as State,
    warnings: () => [...warnings],
    clock,
    advanceTime: (ms) => clock.advance(ms),

    user: {
      async fire(affordanceId, fireOpts) {
        syncMount();
        const result = session.fire(resolveId(affordanceId), {
          source: 'user',
          ...(fireOpts?.payload !== undefined ? { payload: fireOpts.payload } : {}),
          ...(fireOpts?.instance !== undefined ? { instance: fireOpts.instance } : {}),
        });
        await settle();
        if (!result.ok) {
          throw new Error(
            `hcifootprint/testing: user.fire('${affordanceId}') was refused — ${result.reason}. ` +
              `Use user.tryFire to inspect a rejection without throwing.`,
          );
        }
        return result.transition;
      },
      async tryFire(affordanceId, fireOpts) {
        syncMount();
        const result = session.fire(resolveId(affordanceId), {
          source: 'user',
          ...(fireOpts?.payload !== undefined ? { payload: fireOpts.payload } : {}),
          ...(fireOpts?.instance !== undefined ? { instance: fireOpts.instance } : {}),
        });
        await settle();
        return result;
      },
      fireRaw(affordanceId, fireOpts) {
        syncMount();
        return session.fire(resolveId(affordanceId), {
          source: 'user',
          ...(fireOpts?.payload !== undefined ? { payload: fireOpts.payload } : {}),
          ...(fireOpts?.instance !== undefined ? { instance: fireOpts.instance } : {}),
        });
      },
    },

    agent: {
      tools: () => port.tools(),
      async whatsHere() {
        syncMount();
        const result = port.call(sanitize(`${graphId}.whats_here`));
        await settle();
        return result;
      },
      async skill(skillId, args) {
        syncMount();
        const result = port.call(sanitize(`${graphId}.skill.${skillId}`), args);
        await settle();
        return foldProduced(result);
      },
      async do(action, args) {
        syncMount();
        const result = port.call(sanitize(`${graphId}.do_action`), { action, ...(args ?? {}) });
        await settle();
        return foldProduced(result);
      },
    },

    stimulus(patch, stimulusOpts) {
      session.updateState(patch as Record<string, unknown>, { stimulus: stimulusOpts?.stimulus ?? 'push' });
    },
    back(page) {
      session.sync(page, { stimulus: 'navigation', principal: 'user' });
    },

    open(path, openOpts) {
      // Re-opening the same node replaces the prior mount — release it first so
      // its registration + presence handle can never be orphaned.
      openHandles.get(path)?.unregister();
      const handlers = handlersForNode(path);
      const handle = session.registerToolGroup(path as never, {
        handlers,
        visible: true,
        ...(openOpts?.instance !== undefined ? { instance: openOpts.instance } : {}),
      });
      session.show(path as never);
      openHandles.set(path, handle);
      return handle;
    },
    close(path) {
      const handle = openHandles.get(path);
      if (handle) {
        handle.unregister();
        openHandles.delete(path);
      }
      session.setVisible(path as never, false);
    },

    settled: settle,
    report,

    expectOn(page) {
      if (session.node !== page) {
        throw new Error(`hcifootprint/testing: expected to be on “${page}”, but on “${session.node}”.`);
      }
    },
    expectState(partial) {
      const state = session.state();
      for (const [key, value] of Object.entries(partial)) {
        if (!deepEqual(state[key], value)) {
          throw new Error(
            `hcifootprint/testing: expected state “${key}” to be ${JSON.stringify(value)}, ` +
              `but it is ${JSON.stringify(state[key])}.`,
          );
        }
      }
    },
    expectAvailable(affordanceId) {
      const id = resolveId(affordanceId);
      const ids = session.available().edges.map((e) => e.affordanceId);
      if (!ids.includes(id)) {
        throw new Error(
          `hcifootprint/testing: expected “${affordanceId}” to be available on “${session.node}”, ` +
            `but available: ${ids.length > 0 ? ids.join(', ') : '(none)'}.`,
        );
      }
    },
    expectRejected(result, reason) {
      if (result.ok) {
        throw new Error(`hcifootprint/testing: expected a rejection, but the fire succeeded.`);
      }
      if (reason !== undefined && result.reason !== reason) {
        throw new Error(
          `hcifootprint/testing: expected rejection “${String(reason)}”, but got “${result.reason}”.`,
        );
      }
    },
    expectSkillCompleted(skillId) {
      const done = session.frames().some((f) => f.skillId === skillId && f.status === 'completed');
      if (!done) {
        const seen = session
          .frames()
          .filter((f) => f.skillId === skillId)
          .map((f) => f.status);
        throw new Error(
          `hcifootprint/testing: expected skill “${skillId}” to have completed, ` +
            `but its frames were: ${seen.length > 0 ? seen.join(', ') : '(never opened)'}.`,
        );
      }
    },
    expectClean(cleanOpts) {
      const r = report();
      if (r.effectDrift.length > 0) {
        const f = r.effectDrift[0];
        throw new Error(
          `hcifootprint/testing: declared-effect drift on “${f.affordanceId}” (declares ` +
            `${f.declaredWrites.map((k) => `“${k}”`).join(', ')}, but the delta did not cover it) — ` +
            `${r.effectDrift.length} total. The graph drifted from the handler.`,
        );
      }
      if (cleanOpts?.includeGaps && r.gaps.length > 0) {
        throw new Error(
          `hcifootprint/testing: ${r.gaps.length} gap(s) recorded (refused fires / reported unmet demand).`,
        );
      }
    },
  };

  /** Fold the handler's produced data into an agent ServeResult (mirrors the MCP server). */
  function foldProduced(result: ServeResult): ServeResult {
    const transitionId = result['transitionId'];
    if (typeof transitionId === 'string') {
      const produced = session.producedFor(transitionId);
      if (produced !== undefined) return { ...result, data: produced };
    }
    return result;
  }

  return app;
}
