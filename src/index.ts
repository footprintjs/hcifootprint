/**
 * hcifootprint — turn a web app's interaction surface into a typed,
 * traversable skill graph an LLM can plan over.
 *
 * The frontend sibling of footprintjs (backend flowcharts) and agentfootprint
 * (self-explaining agents): one self-explaining trace substrate underneath.
 *
 * ```ts
 * import { skillGraph } from 'hcifootprint';
 *
 * const app = skillGraph('shop')
 *   .page('catalog', { route: '/products' })
 *   .affordance('add-to-cart', {
 *     on: 'catalog',
 *     description: 'Add a product to the cart',
 *     binding: { kind: 'element', locator: { role: 'button', name: 'Add to cart' } },
 *     guard: { authenticated: { eq: true } },
 *     effect: { writes: ['cart'] },
 *   })
 *   .build();
 *
 * const session = app.createSession({ node: 'catalog', state: { authenticated: false } });
 * session.available();                       // → guard-passing edges = the LLM's action space
 * session.fire('add-to-cart', { source: 'agent' });
 * session.sync('cart');                      // reconcile external navigation, first-class
 * session.why('cart');                       // footprint backward slice over the session
 * session.toMCPTools();                      // per-edge MCP descriptors for the current slice
 * ```
 */
export { skillGraph, SkillGraphBuilder, SkillGraphValidationError } from './graph/builder.js';
export type { SkillGraph } from './graph/builder.js';
export { Session } from './traverse/session.js';
export type { RegisteredTools, RegisterToolsOptions } from './traverse/session.js';
// D18 — the navigation graph: appMap() authoring, NavSession runtime, presence sensor
export { appMap } from './tree/appmap.js';
export type {
  AppMap,
  AppMapDef,
  MapNode,
  ModalDef,
  NodeDef,
  NodeKind,
  PageNodeDef,
  SkillDef2,
  ToolDef,
} from './tree/types.js';
export { NavSession } from './traverse/nav-session.js';
export type { MountHandle, MountOptions, MountToolDef, NavSessionOptions } from './traverse/nav-session.js';
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
  ContextBrief,
  ContextBriefOptions,
  DependencyEdge,
  Effect,
  ElementLocator,
  Explanation,
  FireOptions,
  FireResult,
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
  UpdateOptions,
  UpdateResult,
} from './atom/types.js';
