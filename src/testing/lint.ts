/**
 * hcifootprint/testing/lint — pure static checks, in isolation.
 *
 * Import from here (not hcifootprint/testing) for guaranteed engine-free CI
 * lint and action-contract activation checks. This entry pulls in only pure
 * projections, never the Session/footprint engine.
 *
 * ```ts
 * import { lintGraph, checkActionContracts } from 'hcifootprint/testing/lint';
 * ```
 *
 * (The full hcifootprint/testing barrel re-exports these too, alongside the
 * driver — reach for it when you also want testApp.)
 */
export { lintGraph, formatFindings, expectNoStaleLogic } from './model/lint.js';
export type { LintFinding, LintOptions, LintCode, LintSeverity } from './model/lint.js';
export { checkGraph } from './model/check.js';
export type { GraphHealth, JourneyHealth, DriftType } from './model/check.js';
export { checkActionContracts } from '../action/contracts.js';
export type {
  ActionBindingCapability,
  ActionBindingContractRow,
  ActionBindingContractSnapshot,
  ActionContractDeclaration,
  ActionContractDisposition,
  ActionContractEnvironment,
  ActionContractKind,
  ActionContractReason,
  ActionContractReport,
  ActionContractResult,
  ActionContractRuntimeSnapshot,
  ActionEvidenceProducer,
  ActionEvidenceSnapshot,
  ActionEvidenceStage,
  InteractiveHostResolution,
} from '../action/contracts.js';
