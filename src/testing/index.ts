/**
 * hcifootprint/testing — a headless workflow tester for your navigation graph.
 *
 * The graph is a second artifact you maintain alongside the real app, so it
 * drifts as the app changes. This subpath catches that drift before production,
 * in two layers:
 *
 *   lintGraph(graph)   — STATIC. No app, no run, no test code. The cheap CI
 *                        gate: flags stale logic provable from the graph alone
 *                        (a control gated on state nothing produces, a guard
 *                        that can never be true, a skill that can never finish,
 *                        a page nothing can reach).
 *
 *   testApp(graph)     — DYNAMIC. "Playwright for your interaction logic, minus
 *                        the browser." Write mock handlers, drive the REAL
 *                        session as a user or as the agent, and let the honesty
 *                        markers (effectVerified) surface behavioral drift — a
 *                        handler no longer doing what the graph declares.
 *
 * Zero new dependencies; tree-shakeable; imports the real Session (never a
 * parallel simulation) and never the MCP SDK. Honest boundary: this tests
 * interaction LOGIC above the binding — not pixels, not the DOM. It complements
 * Playwright; it does not replace it.
 *
 * ```ts
 * import { testApp, lintGraph } from 'hcifootprint/testing';
 * ```
 */
export { lintGraph, formatFindings, expectNoStaleLogic } from './model/lint.js';
export type { LintFinding, LintOptions, LintCode, LintSeverity } from './model/lint.js';
export { checkGraph } from './model/check.js';
export type { GraphHealth, SkillHealth, DriftType } from './model/check.js';
export { testApp } from './harness.js';
export type {
  TestApp,
  TestAppOptions,
  TestClock,
  DriftReport,
  Resolver,
  ResolverContext,
  ResolverOutcome,
} from './harness.js';
