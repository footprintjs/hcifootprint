/**
 * hcifootprint/testing/lint — the STATIC linter, in isolation.
 *
 * Import from here (not hcifootprint/testing) for a guaranteed engine-free CI
 * lint: this entry pulls in ONLY the pure model (compiled-graph types + the
 * guard helpers), never the Session/footprint engine. So a plain `node` or
 * `tsx` lint script — no bundler, no tree-shaking — still loads nothing heavy.
 *
 * ```ts
 * import { lintGraph, expectNoStaleLogic } from 'hcifootprint/testing/lint';
 * ```
 *
 * (The full hcifootprint/testing barrel re-exports these too, alongside the
 * driver — reach for it when you also want testApp.)
 */
export { lintGraph, formatFindings, expectNoStaleLogic } from './model/lint.js';
export type { LintFinding, LintOptions, LintCode, LintSeverity } from './model/lint.js';
export { checkGraph } from './model/check.js';
export type { GraphHealth, SkillHealth, DriftType } from './model/check.js';
