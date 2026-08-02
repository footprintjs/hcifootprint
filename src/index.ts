/**
 * hcifootprint — turn a web app's interaction surface into a typed,
 * traversable journey graph an LLM can plan over.
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
 *       actions: {
 *         'add-to-cart': { does: 'Add the open dress to the cart', when: { authenticated: { eq: true } }, writes: ['cart'] },
 *       },
 *     },
 *   },
 *   journeys: { purchase: { does: 'Buy a dress end to end', steps: ['add-to-cart'] } },
 * });
 *
 * const session = graph.createSession({ node: 'catalog', state: { authenticated: true } });
 * session.available();                        // → guard-passing edges = the LLM's action space
 * session.registerActions('catalog', { handlers: { 'add-to-cart': (i) => shop.add(i) } });
 * session.fire('catalog.add-to-cart', { source: 'agent' });  // → settlement: 'awaiting-state'
 * session.updateState({ cart: 1 });           // your store tap settles the pending write
 * session.why('cart');                        // footprint backward slice over the session
 * ```
 *
 * TWO WORDS, EACH WITH ONE JOB. You author ACTIONS (`actions:`) and name
 * JOURNEYS (`journeys:`); "tool" is what is SERVED to a model, which is why
 * `toMCPTools`, `edgesToMCPTools` and `MCPToolDescription` keep the word.
 */
// Every authoring refusal, from every graph door — owned by graph/guards.ts,
// which is what the compiler and every source factory throw through.
export { GraphValidationError } from './graph/guards.js';
// Authored routes, read back: URL path → page id, for the caller who owns sync()
export { matchRoute } from './graph/route-match.js';
export type { RoutedPages } from './graph/route-match.js';
/** One declared hop in a route — what `Session.howToReach` answers with. */
export type { RouteStep } from './graph/reach.js';
// Types this package's own signatures RETURN, re-exported so naming a return
// value never requires importing from a dependency. `commitLog()` hands back
// `CommitBundle[]` and `toMCPTools()` hands back `MCPToolDescription[]`; both
// are footprintjs types, and a consumer should not have to know that to write
// down what they were given.
export type { CommitBundle } from 'footprintjs/advanced';
export type { MCPToolDescription } from 'footprintjs';
// The same rule applied to a type this package's own signatures ACCEPT.
// `WhereFilter` is the shape of every `when:` and `enabledWhen:` an app
// authors, half of the exported `VerifyContract`, and the declared type of
// `JourneyDef.precondition` — so a consumer writing a helper that builds or
// takes a guard had to import it from footprintjs, a dependency they never
// chose and whose version they do not control.
export type { WhereFilter } from 'footprintjs';
export { Session } from './traverse/session.js';
export type { RegisteredHandlers, RegisterHandlersOptions } from './traverse/session.js';
// The marker a redacted field is replaced by — exported so a consumer (and a
// test) can assert "this was hidden" without hard-coding the string.
export { REDACTED } from './traverse/redact-fields.js';
// Growable graph sources — the descriptions the app already owns become graph
// input: fromRoutes seeds pages (the spine), fromReactRouter seeds the same
// spine from a nested route TREE, fromJourneys seeds journeys (the overlay),
// fromLiveStore attaches live actions (last, bind-only). Leaf modules:
// importing one never drags session machinery — and fromReactRouter imports
// nothing from any router, so it needs no subpath of its own.
export { fromRoutes } from './graph/sources/from-routes.js';
export { fromReactRouter } from './graph/sources/from-react-router.js';
export type { RouteObjectLike, ReactRouterOptions } from './graph/sources/from-react-router.js';
export { fromJourneys } from './graph/sources/from-journeys.js';
export { fromLiveStore } from './graph/sources/from-live-store.js';
export type {
  GraphSource,
  JourneysSource,
  LiveAction,
  LiveActionStore,
  LiveBindingPort,
  LiveSource,
  RoutesSource,
} from './graph/sources/types.js';
// The navigation graph: buildNavigationGraph() authoring, InteractionSession runtime
export { buildNavigationGraph } from './tree/appmap.js';
export type {
  NavigationGraph,
  NavigationGraphDef,
  NodePathsOf,
  JourneyDef,
  MapNode,
  ModalDef,
  NodeDef,
  NodeKind,
  PageNodeDef,
  ActionDef,
} from './tree/types.js';
export { InteractionSession } from './traverse/nav-session.js';
export type {
  RegisterActionGroupOptions,
  ActionGroupHandle,
  RegisteredActionDef,
  InteractionSessionOptions,
} from './traverse/nav-session.js';
// Registration + event handle types
export type { SessionEventName, SessionEvents, ActionGroup, ActionHandle } from './atom/types.js';
export { PresenceIndex } from './presence/presence.js';
export type { PresenceHandle } from './presence/presence.js';
export { ActionRegistry } from './registry/registry.js';
export type { Registration, ActionHandler } from './registry/registry.js';
export { edgesToMCPTools, leaveJourneyTool } from './serve/mcp.js';
// Serving mode — journeys as fixed tools, disclosure in results
export { serveToAgent } from './serve/modes.js';
export type {
  DoActionArgs,
  ServeResult,
  JourneyCallArgs,
  JourneyToolsOptions,
  JourneyToolsPort,
  JourneyToolsPortWithSettlement,
} from './serve/modes.js';
export type {
  ActivationLevel,
  Actuation,
  Affordance,
  ApprovalResult,
  AskStatus,
  AvailableEdge,
  AvailableJourney,
  AvailableSlice,
  BeginWorkOptions,
  Binding,
  BlockedBecause,
  CanonicalRole,
  Cause,
  CommitJourneyResult,
  ConfirmReceipts,
  ConfirmRecord,
  ConfirmTrailStep,
  ConfirmWillDo,
  ConfirmWillUse,
  ContextBrief,
  ContextBriefOptions,
  DecisionStatus,
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
  GroundTruth,
  GroundTruthOptions,
  HumanApprovalPolicy,
  HumanDecides,
  ReportGapOptions,
  Page,
  PageDef,
  PendingInfo,
  Principal,
  RedactedFields,
  SessionOptions,
  Settlement,
  Journey,
  JourneySpec,
  JourneyFrame,
  NavigationGraphSpec,
  JourneyPlan,
  JourneyPlanStep,
  JourneyStanding,
  StepStatus,
  StimulusKind,
  SyncResult,
  TransitionRecord,
  TryJourneyPlanResult,
  UpdateOptions,
  UpdateResult,
  VerifyContract,
  VerifyFailure,
  WorkHandle,
  WorkRow,
} from './atom/types.js';
