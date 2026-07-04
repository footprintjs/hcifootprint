/**
 * lintGraph — STATIC stale-logic detection over a navigation graph.
 *
 * The graph is a second artifact you maintain alongside the real app; as the
 * app evolves the graph drifts from it. This function reads ONLY the compiled
 * graph (no app, no run, no test code) and reports the structural drift it can
 * prove from the graph alone: a control gated on state nothing produces, a
 * guard that can never be true, a skill that can never finish, a page nothing
 * can reach. It is the cheap CI gate — run it on every commit.
 *
 * Two design commitments:
 * 1. It SURFACES, never dictates. Every finding names what drifted and where,
 *    and states the two remedies — update the graph to match the app, or treat
 *    it as a sign the app changed by mistake. The choice is the team's.
 * 2. It never cries "dead" over something it cannot prove. A guard key that no
 *    action writes is only a WARNING by default (the app may seed it from
 *    outside). Declare `initialState` + `externalKeys` and the linter knows the
 *    whole producible set — then a truly unproducible key becomes an ERROR.
 *
 * Honest boundary: this reasons about which state KEYS move, never their
 * VALUES (effect.writes is keys-only). It cannot catch an action that writes
 * the right key with a wrong value a downstream guard rejects — that is the
 * job of the runtime harness (testApp's effectVerified). And it cannot know
 * the app REMOVED a page or handler; only the driven harness sees that (a node
 * that never mounts). Pure graph-consistency, not an integration guarantee.
 *
 * Layer note: imports ONLY compiled-graph types + the shared guard helpers.
 * It never imports Session (which pulls in the footprint engine), so a
 * lint-only CI step stays engine-free and tree-shakeable.
 */
import type { SkillGraphSpec } from '../../atom/types.js';
import type { NavigationGraph } from '../../tree/types.js';
import { stepDependencies } from '../../graph/skill-deps.js';
import { unsatisfiableKeys } from './satisfiable.js';

export type LintSeverity = 'error' | 'warning' | 'info';

export type LintCode =
  | 'dangling-guard-key'
  | 'unsatisfiable-guard'
  | 'uncompletable-skill'
  | 'skill-step-order'
  | 'skill-step-cycle'
  | 'unreachable-page'
  | 'dead-end-page'
  | 'unconsumed-write';

export interface LintFinding {
  code: LintCode;
  severity: LintSeverity;
  /** Plain-language statement of what drifted or is wrong. */
  message: string;
  /** The two consumer remedies — surfaced, never dictated. */
  remedy: string;
  /** The action (affordance) the finding is about, when it is action-scoped. */
  affordance?: string;
  /** The skill the finding is about, when skill-scoped. */
  skill?: string;
  /** The page the finding is about, when page-scoped. */
  page?: string;
  /** The state key(s) implicated. */
  keys?: string[];
}

export interface LintOptions {
  /**
   * The keys (or a sample object) the app guarantees before any action runs —
   * the initial projected state. Supplying it lets the linter PROMOTE
   * "gated on a key nothing produces" from a warning to an error: with the
   * initial world known, an unproducible key is provably dead.
   */
  initialState?: string[] | Record<string, unknown>;
  /**
   * Keys supplied from OUTSIDE the graph's own writes (a server push, a store
   * the app seeds, a parent app). Listed here they count as producible, so a
   * guard over them is not flagged as dangling.
   */
  externalKeys?: string[];
  /** Which page the app starts on (default: the first declared page). */
  startPage?: string;
}

const REMEDY_ACTION =
  'Two ways to resolve, your call: update the graph so it matches the app (adjust or drop this guard/effect), ' +
  'or treat it as a sign the app changed by mistake and revert that change. This check only surfaces the drift.';
const REMEDY_PAGE =
  'Two ways to resolve, your call: add an action that reaches/leaves this page (or remove the page if the app dropped it), ' +
  'or confirm it is reached another way (a deep link the app syncs). This check only surfaces the drift.';
const REMEDY_WRITE =
  "If the app genuinely uses this write (for its own UI, not for gating), leave it. If it's a leftover from removed " +
  'logic, drop it from the graph. Either way, the choice is yours.';

/** Quote a key list for a message: `a`, `b` and `c`. */
function list(keys: string[]): string {
  const quoted = keys.map((k) => `“${k}”`);
  if (quoted.length <= 1) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
}

/**
 * Report every stale-logic drift provable from the graph alone. Returns an
 * empty array for a clean graph. Advisory by default; pass initialState +
 * externalKeys to promote provably-dead findings to errors.
 */
export function lintGraph(graph: NavigationGraph, opts?: LintOptions): LintFinding[] {
  const spec: SkillGraphSpec = graph.spec;
  const affordances = spec.affordances;
  const affList = Object.values(affordances);
  const findings: LintFinding[] = [];

  const initialKeys = Array.isArray(opts?.initialState)
    ? opts.initialState
    : opts?.initialState
      ? Object.keys(opts.initialState)
      : [];
  const externalKeys = opts?.externalKeys ?? [];
  // "Grounded" = the consumer told us the world outside the graph's own writes,
  // so an unproducible key is provably dead (error), not merely unproven (warn).
  // Declaring initialState AT ALL grounds it — even `{}` says "nothing is seeded".
  const grounded = opts?.initialState !== undefined || externalKeys.length > 0;

  const writeKeys = new Set<string>();
  for (const aff of affList) for (const key of aff.effect?.writes ?? []) writeKeys.add(key);
  const producible = new Set<string>([...writeKeys, ...initialKeys, ...externalKeys]);

  // --- 1. dangling guard key: gated on state nothing produces ----------------
  for (const aff of affList) {
    const dangling = Object.keys(aff.guard ?? {}).filter((key) => !producible.has(key));
    if (dangling.length > 0) {
      findings.push({
        code: 'dangling-guard-key',
        severity: grounded ? 'error' : 'warning',
        affordance: aff.id,
        keys: dangling,
        message: grounded
          ? `Action “${aff.id}” is gated on ${list(dangling)}, which nothing produces — no action writes it, and you did not list it in the initial or external state. This action can never become available.`
          : `Action “${aff.id}” is gated on ${list(dangling)}, which no action in the graph writes. If the app seeds it from initial or external state that is fine — declare initialState/externalKeys to confirm; otherwise the gate can never pass.`,
        remedy: REMEDY_ACTION,
      });
    }
  }

  // --- 2. unsatisfiable guard: operators that can never be jointly true ------
  for (const aff of affList) {
    for (const { key, reason } of unsatisfiableKeys(aff.guard)) {
      findings.push({
        code: 'unsatisfiable-guard',
        severity: 'error',
        affordance: aff.id,
        keys: [key],
        message: `Action “${aff.id}” has a guard on “${key}” that can never be true (${reason}) — the control it maps to can never light up.`,
        remedy: REMEDY_ACTION,
      });
    }
  }

  // --- 3/4/5. skill completability, step order, and cycles -------------------
  for (const skill of Object.values(spec.skills)) {
    const steps = skill.steps;
    const producedSoFar = new Set<string>([...initialKeys, ...externalKeys]);
    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];
      const aff = affordances[stepId];
      if (!aff) continue; // build() guarantees step ids resolve; defensive only
      for (const guardKey of Object.keys(aff.guard ?? {})) {
        if (producedSoFar.has(guardKey)) continue;
        const laterWriter = steps
          .slice(i + 1)
          .find((other) => (affordances[other]?.effect?.writes ?? []).includes(guardKey));
        if (laterWriter) {
          findings.push({
            code: 'skill-step-order',
            severity: 'warning',
            skill: skill.id,
            affordance: stepId,
            keys: [guardKey],
            message: `In skill “${skill.id}”, step “${stepId}” needs “${guardKey}”, but the step that produces it (“${laterWriter}”) is listed after it. As ordered, this step is blocked when the skill reaches it.`,
            remedy: REMEDY_ACTION,
          });
        } else if (!producible.has(guardKey)) {
          findings.push({
            code: 'uncompletable-skill',
            severity: grounded ? 'error' : 'warning',
            skill: skill.id,
            affordance: stepId,
            keys: [guardKey],
            message: `Skill “${skill.id}” can never finish: step “${stepId}” is gated on “${guardKey}”, which nothing produces (no step writes it, and it is not in the initial/external state).`,
            remedy: REMEDY_ACTION,
          });
        }
      }
      for (const written of aff.effect?.writes ?? []) producedSoFar.add(written);
    }
    // Order-insensitive reachability from the grounded state: a step becomes
    // runnable once all its guard keys are available, accumulating writes. A key
    // supplied by initialState/externalKeys — or by an earlier step — breaks a
    // structural "cycle" that is not actually a deadlock.
    const runnable = new Set<string>();
    const reachable = new Set<string>([...initialKeys, ...externalKeys]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const stepId of steps) {
        if (runnable.has(stepId)) continue;
        if (Object.keys(affordances[stepId]?.guard ?? {}).every((key) => reachable.has(key))) {
          runnable.add(stepId);
          for (const written of affordances[stepId]?.effect?.writes ?? []) reachable.add(written);
          changed = true;
        }
      }
    }
    // A true deadlock: two steps each need state the other writes AND neither is
    // reachable from grounded state on its own.
    for (const stepId of steps) {
      if (runnable.has(stepId)) continue;
      const deps = stepDependencies(affordances, steps, stepId);
      for (const dep of deps) {
        if (
          !runnable.has(dep.affordanceId) &&
          stepId < dep.affordanceId && // report each pair once
          stepDependencies(affordances, steps, dep.affordanceId).some((d) => d.affordanceId === stepId)
        ) {
          findings.push({
            code: 'skill-step-cycle',
            severity: 'error',
            skill: skill.id,
            keys: [...new Set(dep.viaKeys)],
            message: `Skill “${skill.id}” has steps “${stepId}” and “${dep.affordanceId}” that each need state the other writes — a dependency cycle, so neither can go first.`,
            remedy: REMEDY_ACTION,
          });
        }
      }
    }
  }

  // --- 6/7. page reachability ------------------------------------------------
  const pageIds = Object.keys(spec.pages);
  const startPage = opts?.startPage ?? pageIds[0];
  const navTargets = new Set<string>();
  for (const aff of affList) if (aff.effect?.navigatesTo) navTargets.add(aff.effect.navigatesTo);
  for (const pageId of pageIds) {
    if (pageId !== startPage && !navTargets.has(pageId)) {
      findings.push({
        code: 'unreachable-page',
        severity: 'warning',
        page: pageId,
        message: `Page “${pageId}” is not the start page and no action navigates to it — nothing in the graph can reach it.`,
        remedy: REMEDY_PAGE,
      });
    }
    if (pageIds.length > 1) {
      const leaves = affList.some(
        (aff) => aff.on.includes(pageId) && aff.effect?.navigatesTo && aff.effect.navigatesTo !== pageId,
      );
      if (!leaves) {
        findings.push({
          code: 'dead-end-page',
          severity: 'info',
          page: pageId,
          message: `Page “${pageId}” has no action that navigates away — once here, the graph offers no way out.`,
          remedy: REMEDY_PAGE,
        });
      }
    }
  }

  // --- 8. unconsumed write: a declared write no guard ever reads --------------
  const readKeys = new Set<string>();
  for (const aff of affList) for (const key of Object.keys(aff.guard ?? {})) readKeys.add(key);
  for (const skill of Object.values(spec.skills)) {
    for (const key of Object.keys(skill.precondition ?? {})) readKeys.add(key);
  }
  for (const aff of affList) {
    const orphan = (aff.effect?.writes ?? []).filter((key) => !readKeys.has(key));
    if (orphan.length > 0) {
      findings.push({
        code: 'unconsumed-write',
        severity: 'info',
        affordance: aff.id,
        keys: orphan,
        message: `Action “${aff.id}” declares it writes ${list(orphan)}, but no guard anywhere reads ${orphan.length > 1 ? 'them' : 'it'} — the write does nothing for planning (the app UI may still use it).`,
        remedy: REMEDY_WRITE,
      });
    }
  }

  return findings;
}

const SEVERITY_RANK: Record<LintSeverity, number> = { error: 3, warning: 2, info: 1 };

/** A plain-text report of the findings, most severe first. Empty string when clean. */
export function formatFindings(findings: LintFinding[]): string {
  if (findings.length === 0) return '';
  const ordered = [...findings].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  return ordered
    .map((f) => {
      const where = f.affordance ?? f.skill ?? f.page ?? '';
      return `[${f.severity.toUpperCase()}] ${f.code}${where ? ` (${where})` : ''}\n  ${f.message}\n  → ${f.remedy}`;
    })
    .join('\n\n');
}

/**
 * Throw if the graph has stale-logic findings at or above `failOn` (default
 * 'error'). The opt-in CI gate: `expectNoStaleLogic(graph, { initialState })`
 * fails a commit that drifts the graph. Report-by-default stays the norm —
 * call lintGraph directly to inspect without failing.
 */
export function expectNoStaleLogic(
  graph: NavigationGraph,
  opts?: LintOptions & { failOn?: LintSeverity },
): void {
  const failOn = opts?.failOn ?? 'error';
  const threshold = SEVERITY_RANK[failOn];
  const findings = lintGraph(graph, opts);
  const failing = findings.filter((f) => SEVERITY_RANK[f.severity] >= threshold);
  if (failing.length > 0) {
    throw new Error(
      `hcifootprint: the navigation graph has ${failing.length} stale-logic finding(s) at or above ${failOn}:\n\n` +
        formatFindings(failing),
    );
  }
}
