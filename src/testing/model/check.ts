/**
 * checkGraph — the one-call health verdict.
 *
 * `lintGraph` returns a flat list of findings; `checkGraph` rolls them into a
 * single answer a consumer can act on without iterating: a boolean `ok`, counts,
 * findings grouped by the kind of drift a frontend dev recognises (control /
 * page / flow), a per-skill feasibility list, and a ready-to-print `summary`.
 * The whole health gate is one line:
 *
 *   const health = checkGraph(graph, { initialState });
 *   if (!health.ok) { console.error(health.summary); process.exit(1); }
 *
 * It is STATIC and pure (same engine-free module graph as lintGraph — no
 * Session, no footprint engine), so it runs in any CI step. It answers "does the
 * graph hang together?" — NOT "do the real handlers match?" That behavioral
 * question needs your handlers, so it lives in testApp (effectVerified). Keeping
 * them apart is deliberate: a one-call auto-driver cannot know the mid-flow state
 * a real flow sets up, so it would raise false alarms.
 */
import { lintGraph } from './lint.js';
import type { LintFinding, LintOptions } from './lint.js';
import type { NavigationGraph } from '../../tree/types.js';

/** The human-recognisable drift buckets a finding falls into. */
export type DriftType = 'control' | 'page' | 'flow' | 'note';

export interface SkillHealth {
  id: string;
  /** No error-severity finding blocks this skill from completing. */
  feasible: boolean;
  /** State keys that block it (from the flow findings), when not feasible. */
  blockedOn: string[];
}

export interface GraphHealth {
  /** True when there are no error-severity findings — the release-readiness signal. */
  ok: boolean;
  errors: number;
  warnings: number;
  /** The full lint output (errors, warnings, and advisory notes). */
  findings: LintFinding[];
  /** Findings grouped by drift type — control (buttons/inputs), page, flow, note. */
  byType: Record<DriftType, LintFinding[]>;
  /** Per-skill feasibility rollup. */
  skills: SkillHealth[];
  /** Pages nothing can navigate to. */
  unreachablePages: string[];
  /** A ready-to-print, plain-language report. Empty-ish (a ✓ line) when healthy. */
  summary: string;
}

const TYPE_OF: Record<string, DriftType> = {
  'dangling-guard-key': 'control',
  'unsatisfiable-guard': 'control',
  'unreachable-page': 'page',
  'dead-end-page': 'page',
  'uncompletable-skill': 'flow',
  'skill-step-order': 'flow',
  'skill-step-cycle': 'flow',
  'unconsumed-write': 'note',
};

const TYPE_LABEL: Record<DriftType, string> = {
  control: 'Control drift (buttons / inputs)',
  page: 'Page drift',
  flow: 'Flow drift (skills)',
  note: 'Advisory notes',
};

/** One-call health check: lint + group by drift type + per-skill rollup + a printable summary. */
export function checkGraph(graph: NavigationGraph, opts?: LintOptions): GraphHealth {
  const findings = lintGraph(graph, opts);

  const byType: Record<DriftType, LintFinding[]> = { control: [], page: [], flow: [], note: [] };
  for (const finding of findings) byType[TYPE_OF[finding.code] ?? 'note'].push(finding);

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;

  const skills: SkillHealth[] = Object.values(graph.spec.skills).map((skill) => {
    const blocking = findings.filter((f) => f.skill === skill.id && f.severity === 'error');
    return {
      id: skill.id,
      feasible: blocking.length === 0,
      blockedOn: [...new Set(blocking.flatMap((f) => f.keys ?? []))],
    };
  });

  const unreachablePages = findings
    .filter((f) => f.code === 'unreachable-page' && f.page)
    .map((f) => f.page as string);

  const ok = errors === 0;
  return {
    ok,
    errors,
    warnings,
    findings,
    byType,
    skills,
    unreachablePages,
    summary: formatHealth(graph.id, findings, byType, errors, warnings),
  };
}

const DRIFT_ORDER: DriftType[] = ['control', 'page', 'flow'];

function formatHealth(
  graphId: string,
  findings: LintFinding[],
  byType: Record<DriftType, LintFinding[]>,
  errors: number,
  warnings: number,
): string {
  const notes = byType.note.length;
  const lines: string[] = [`Graph health — ${graphId}`];
  if (errors === 0 && warnings === 0) {
    lines.push(`  ✓ healthy — no drift  (${notes} advisory note${notes === 1 ? '' : 's'})`);
    return lines.join('\n');
  }
  lines.push(`  ✗ ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`);
  for (const type of DRIFT_ORDER) {
    const group = byType[type].filter((f) => f.severity !== 'info');
    if (group.length === 0) continue;
    lines.push('', `  ▸ ${TYPE_LABEL[type]}`);
    for (const f of group) {
      const where = f.affordance ?? f.skill ?? f.page ?? '';
      lines.push(`     • [${f.severity.toUpperCase()}] ${where}`, `       ${f.message}`, `       → ${f.remedy}`);
    }
  }
  return lines.join('\n');
}
