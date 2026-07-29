/**
 * hcifootprint — turn a web app's interaction surface into a typed,
 * traversable skill graph an LLM can plan over.
 *
 * The frontend sibling of footprintjs (backend flowcharts) and agentfootprint
 * (self-explaining agents): one self-explaining trace substrate underneath.
 *
 * ```ts
 * import { buildNavigationGraph } from 'hcifootprint';
 *
 * const graph = buildNavigationGraph('shop', {
 *   pages: {
 *     catalog: {
 *       tools: {
 *         'add-to-cart': { does: 'Add the open dress to the cart', when: { authenticated: { eq: true } }, writes: ['cart'] },
 *       },
 *     },
 *   },
 *   skills: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart'] } },
 * });
 *
 * const session = graph.createSession({ node: 'catalog', state: { authenticated: true } });
 * session.available();                        // → guard-passing edges = the LLM's action space
 * session.registerToolGroup('catalog', { handlers: { 'add-to-cart': (i) => shop.add(i) } });
 * session.fire('catalog.add-to-cart', { source: 'agent' });  // → settlement: 'awaiting-state'
 * session.updateState({ cart: 1 });           // your store tap settles the pending write
 * session.why('cart');                        // footprint backward slice over the session
 *
 * // v1 skillGraph() — the fluent builder — remains as legacy sugar.
 * ```
 */
export { skillGraph, SkillGraphBuilder, SkillGraphValidationError } from './graph/builder.js';
export type { SkillGraph } from './graph/builder.js';
// Authored routes, read back: URL path → page id, for the caller who owns sync()
export { matchRoute } from './graph/route-match.js';
export type { RoutedPages } from './graph/route-match.js';
export { Session } from './traverse/session.js';
export type { RegisteredTools, RegisterToolsOptions } from './traverse/session.js';
// Growable graph sources — the descriptions the app already owns become graph
// input: fromRoutes seeds pages (the spine), fromJourneys seeds skills (the
// overlay). Leaf modules: importing one never drags session machinery.
export { fromRoutes } from './graph/sources/from-routes.js';
export { fromJourneys } from './graph/sources/from-journeys.js';
export type { GraphSource, JourneysSource, RoutesSource } from './graph/sources/types.js';
// The navigation graph: buildNavigationGraph() authoring, InteractionSession runtime
export { buildNavigationGraph } from './tree/appmap.js';
export type {
  NavigationGraph,
  NavigationGraphDef,
  NodePathsOf,
  MapNode,
  ModalDef,
  NodeDef,
  NodeKind,
  PageNodeDef,
  SkillDef2,
  ToolDef,
} from './tree/types.js';
export { InteractionSession } from './traverse/nav-session.js';
export type {
  RegisterToolGroupOptions,
  ToolGroupHandle,
  RegisteredToolDef,
  InteractionSessionOptions,
} from './traverse/nav-session.js';
// Registration + event handle types
export type { SessionEventName, SessionEvents, ToolGroup, ToolHandle } from './atom/types.js';
export { PresenceIndex } from './presence/presence.js';
export type { PresenceHandle } from './presence/presence.js';
export { ToolRegistry } from './registry/registry.js';
export type { Registration, ToolHandler } from './registry/registry.js';
export { edgesToMCPTools, leaveSkillTool } from './serve/mcp.js';
// D18 serving modes — Mode B: skills as fixed tools, disclosure in results
export { skillsAsTools } from './serve/modes.js';
export type {
  DoActionArgs,
  ServeResult,
  SkillCallArgs,
  SkillToolsOptions,
  SkillToolsPort,
} from './serve/modes.js';
export type {
  ActivationLevel,
  Actuation,
  Affordance,
  AffordanceDef,
  AvailableEdge,
  AvailableSkill,
  AvailableSlice,
  Binding,
  CanonicalRole,
  Cause,
  CommitSkillResult,
  ConfirmReceipts,
  ConfirmRecord,
  ConfirmTrailStep,
  ConfirmWillDo,
  ContextBrief,
  ContextBriefOptions,
  DependencyEdge,
  Effect,
  EffectStatus,
  ElementLocator,
  Explanation,
  FireOptions,
  FireResult,
  FireSettlement,
  FrameStatus,
  GapReason,
  GapRecord,
  ReportGapOptions,
  Page,
  PageDef,
  PendingInfo,
  Principal,
  SessionOptions,
  Settlement,
  Skill,
  SkillDef,
  SkillFrame,
  SkillGraphSpec,
  SkillPlan,
  SkillPlanStep,
  StepStatus,
  StimulusKind,
  SyncResult,
  TransitionRecord,
  TrySkillPlanResult,
  UpdateOptions,
  UpdateResult,
} from './atom/types.js';
