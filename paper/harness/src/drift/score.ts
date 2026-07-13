/**
 * The drift scorer — runs every mutant through the harness's layers in CI
 * order (cheapest first) and records EVERY layer that catches it, not just
 * the first: compile (buildNavigationGraph's enforcement spine) → static
 * (checkGraph finding-set diff vs the clean baseline) → behavioral
 * (report() drift/gaps + journey assertion throws).
 *
 * Precision comes from the baseline: an unmutated shop must produce zero
 * errors/warnings, a clean report, and a green journey — any alarm there is
 * a false positive. Recall = caught mutants / non-expected-miss mutants.
 */
import { checkGraph } from 'hcifootprint/testing';
import { testApp } from 'hcifootprint/testing';
import type { LintFinding } from 'hcifootprint/testing';
import { compileShop, initialState, journey, shopResolvers, shopSpec } from './shop.js';
import type { ShopState } from './shop.js';
import { MUTANTS } from './mutations.js';
import type { ExpectedLayer, Mutant } from './mutations.js';

export interface LayerMatrix {
  compile: boolean;
  /** Highest NEW finding severity beyond baseline ('error' | 'warning' | 'info' | null). */
  static: 'error' | 'warning' | 'info' | null;
  /** report().effectDrift or new gap rows. */
  behavioralReport: boolean;
  /** The journey threw (rejected fire or failed assertion). */
  behavioralJourney: boolean;
}

export interface MutantResult {
  id: string;
  family: Mutant['family'];
  story: string;
  expectedLayer: ExpectedLayer;
  layers: LayerMatrix;
  /** First layer that caught it in CI order, or 'missed'. */
  caughtBy: 'compile' | 'static' | 'static-advisory' | 'behavioral-report' | 'behavioral-journey' | 'missed';
  matchedPrediction: boolean;
  detail: string;
}

export interface DriftScore {
  baselineClean: boolean;
  baselineDetail: string;
  results: MutantResult[];
  /** Catchable = every mutant not preregistered as expected-miss. */
  recall: number;
  /** Expected-misses that stayed missed (boundary confirmed). */
  boundaryConfirmed: number;
  predictionAccuracy: number;
}

const findingKey = (f: LintFinding): string =>
  [f.code, f.severity, f.affordance ?? '', f.skill ?? '', f.page ?? '', (f.keys ?? []).join('+')].join('|');

function newFindings(base: LintFinding[], now: LintFinding[]): LintFinding[] {
  const seen = new Set(base.map(findingKey));
  return now.filter((f) => !seen.has(findingKey(f)));
}

async function runJourneyLayer(
  spec: ReturnType<typeof shopSpec>,
  resolvers: ReturnType<typeof shopResolvers>,
): Promise<{ report: boolean; journeyThrew: boolean; detail: string }> {
  const graph = compileShop(spec);
  const app = testApp<ShopState>(graph, {
    initialState: { ...initialState },
    resolvers,
    node: 'home',
    onWarn: () => {},
  });
  let journeyThrew = false;
  let detail = '';
  try {
    await journey(app);
  } catch (error) {
    journeyThrew = true;
    detail = String(error).slice(0, 200);
  }
  const report = app.report();
  const drifted = report.effectDrift.length > 0 || report.gaps.length > 0;
  if (drifted) {
    detail =
      `effectDrift: [${report.effectDrift.map((d) => d.affordanceId).join(', ')}] ` +
      `gaps: ${report.gaps.length}` +
      (detail ? ` · journey: ${detail}` : '');
  }
  return { report: drifted, journeyThrew, detail };
}

export async function scoreDrift(mutants: Mutant[] = MUTANTS): Promise<DriftScore> {
  // ── baseline: the unmutated shop must be silent on every layer ────────────
  const baseGraph = compileShop(shopSpec());
  const baseHealth = checkGraph(baseGraph, { initialState, startPage: 'home' });
  const baseErrors = baseHealth.findings.filter((f) => f.severity !== 'info');
  const baseRun = await runJourneyLayer(shopSpec(), shopResolvers());
  const baselineClean = baseErrors.length === 0 && !baseRun.report && !baseRun.journeyThrew;
  const baselineDetail =
    `static: ${baseHealth.errors} errors / ${baseHealth.warnings} warnings ` +
    `(+${baseHealth.findings.length - baseErrors.length} advisory notes) · ` +
    `report drift: ${baseRun.report} · journey threw: ${baseRun.journeyThrew}`;

  const results: MutantResult[] = [];
  for (const mutant of mutants) {
    const spec = structuredClone(shopSpec());
    mutant.mutateSpec?.(spec);
    const resolvers = shopResolvers();
    mutant.mutateResolvers?.(resolvers);

    const layers: LayerMatrix = { compile: false, static: null, behavioralReport: false, behavioralJourney: false };
    let detail = '';

    // Layer 1 — compile (the build-time enforcement spine).
    let graph: ReturnType<typeof compileShop> | undefined;
    try {
      graph = compileShop(spec);
    } catch (error) {
      layers.compile = true;
      detail = String(error).slice(0, 200);
    }

    // Layer 2 — static lint diff vs baseline.
    if (graph) {
      const fresh = newFindings(baseHealth.findings, checkGraph(graph, { initialState, startPage: 'home' }).findings);
      if (fresh.length > 0) {
        layers.static = fresh.some((f) => f.severity === 'error')
          ? 'error'
          : fresh.some((f) => f.severity === 'warning')
            ? 'warning'
            : 'info';
        detail = fresh.map((f) => `${f.code}: ${f.message}`).join(' · ').slice(0, 300);
      }

      // Layer 3 — behavioral: real session, mock app, canonical journey.
      const run = await runJourneyLayer(spec, resolvers);
      layers.behavioralReport = run.report;
      layers.behavioralJourney = run.journeyThrew;
      if (run.detail && !detail) detail = run.detail;
    }

    const caughtBy: MutantResult['caughtBy'] = layers.compile
      ? 'compile'
      : layers.static === 'error' || layers.static === 'warning'
        ? 'static'
        : layers.static === 'info'
          ? 'static-advisory'
          : layers.behavioralReport
            ? 'behavioral-report'
            : layers.behavioralJourney
              ? 'behavioral-journey'
              : 'missed';

    results.push({
      id: mutant.id,
      family: mutant.family,
      story: mutant.story,
      expectedLayer: mutant.expectedLayer,
      layers,
      caughtBy,
      matchedPrediction:
        mutant.expectedLayer === 'expected-miss' ? caughtBy === 'missed' : caughtBy === mutant.expectedLayer,
      detail,
    });
  }

  const catchable = results.filter((r) => r.expectedLayer !== 'expected-miss');
  const misses = results.filter((r) => r.expectedLayer === 'expected-miss');
  return {
    baselineClean,
    baselineDetail,
    results,
    recall: catchable.length ? catchable.filter((r) => r.caughtBy !== 'missed').length / catchable.length : 0,
    boundaryConfirmed: misses.filter((r) => r.caughtBy === 'missed').length,
    predictionAccuracy: results.length ? results.filter((r) => r.matchedPrediction).length / results.length : 0,
  };
}

export function driftTable(score: DriftScore): string {
  const expectedMisses = score.results.filter((r) => r.expectedLayer === 'expected-miss').length;
  const rows = score.results.map(
    (r) =>
      `| ${r.id} | ${r.family} | ${r.expectedLayer} | ${r.caughtBy} | ${r.matchedPrediction ? '✓' : '✗'} |`,
  );
  return [
    `baseline clean: **${score.baselineClean}** (${score.baselineDetail})`,
    '',
    '| mutant | family | predicted layer | caught by | prediction |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    `**recall on catchable mutants: ${(score.recall * 100).toFixed(0)}%** · ` +
      `preregistered boundary misses confirmed: ${score.boundaryConfirmed}/${expectedMisses} · ` +
      `layer-prediction accuracy: ${(score.predictionAccuracy * 100).toFixed(0)}%`,
  ].join('\n');
}
