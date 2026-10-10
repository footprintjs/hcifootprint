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
// `toMCPTools()` returns this footprintjs type. Record types have one public
// owner: import `CommitBundle` from `foottrace` to name `commitLog()`'s rows.
export type { MCPToolDescription } from 'footprintjs';
// Versioned Action Binding Protocol: one callable definition, many live
// bindings, and structured identities for every join. This is the deliberate
// v2 surface; the independent graph/session registration API remains supported.
export {
  actionDefinitionOf,
  defineAction,
  isDefinedAction,
} from './action/definition.js';
export type { DefineActionOptions } from './action/definition.js';
export {
  ActionInputValidationError,
  connectAction,
  createActionRuntime,
} from './action/connection.js';
export { assertBindingCoverage, isBindingCoverage } from './action/coverage.js';
export {
  composeActionInvocation,
  resolveActionHost,
} from './action/host-adapter.js';
export type {
  ActionAttachment,
  ActionBindingRef,
  ActionRuntime,
  ActionRuntimeOptions,
  ActionBindingSnapshot,
  ActionBindingUpdate,
  ActionAbandonmentAuthority,
  ActionInputRef,
  ActionInputSchemaAdapter,
  ActionInputSchemaContext,
  ActionInputSchemaResult,
  ActionConnection,
  ActionContractActivation,
  ActionDefinitionContract,
  ActionDefinitionRecord,
  ActionDefinitionRef,
  ActionGuardContract,
  ActionEffectSettlement,
  ActionEffectSettlementInput,
  ActionInvocation,
  ActionInvocationInput,
  ActionInvocationMode,
  ActionObservedInvocation,
  ActionInvocationSettlement,
  ActionInvoke,
  ActionLifecycle,
  ActionOffer,
  ActionOfferFor,
  BoundActionOffer,
  InputlessActionOffer,
  OpenActionOffer,
  PrincipalActionPort,
  ActionProgress,
  ActionProgressDeclaration,
  ActionProgressObservation,
  ActionProgressSnapshot,
  ActionOfferRef,
  ActionLateSettlement,
  ActionTransitionSnapshot,
  ActionTransitionRef,
  ActionTransitionQuery,
  ActionHistoryPolicy,
  ActionEvidenceDeclaration,
  ActionReturnOutcome,
  ActionSettlementCapability,
  ActionSettleContract,
  BindingCoverage,
  BindingProjection,
  ConnectActionOptions,
  DefinedAction,
  HumanReporting,
  ReadonlyActionDefinitionContract,
} from './action/types.js';
export type {
  ActionHostAdapter,
  ActionHostContext,
  ActionHostListener,
  ActionHostResolution,
  ActionHostTargetResolution,
  ActionHostUnresolvedReason,
  ActionInvocationMiddleware,
  ResolvedActionHost,
  ResolvedActionHostTarget,
  UnresolvedActionHost,
  UnresolvedActionHostTarget,
} from './action/host-adapter.js';
// The same rule applied to a type this package's own signatures ACCEPT.
// `WhereFilter` is the shape of every `when:` and `enabledWhen:` an app
// authors, half of the exported `VerifyContract`, and the declared type of
// `JourneyDef.precondition` — so a consumer writing a helper that builds or
// takes a guard had to import it from footprintjs, a dependency they never
// chose and whose version they do not control.
export type { WhereFilter } from 'footprintjs';
export { Session } from './traverse/session.js';
export type {
  RegisteredHandlers,
  RegisterHandlersOptions,
} from './traverse/session.js';
// D21 — contextful actions: one wrapper at registration, and BOTH doors into an
// action (the agent's fire, the app's own call) land in the same capture
// envelope. `contextful.sense(anchor)` is the same idea with no handler to wrap.
// Its DOM surface is structural (contextful/anchor-port.ts), so importing this
// on a server touches no global.
export { contextful } from './contextful/contextful.js';
export { ERROR_MESSAGE } from './contextful/types.js';
export type {
  ActionCapture,
  ActionExpectation,
  CaptureAfter,
  CaptureBefore,
  CaptureFailure,
  ContextfulOptions,
  DirectPrincipal,
  GuardRead,
  SenseDeclaration,
  SensedChange,
  SensedEffect,
  SensedEvent,
  SensedSummary,
  SensedTrail,
} from './contextful/types.js';
export type {
  AnchorDocument,
  AnchorElement,
  AnchorSource,
  AnchorView,
} from './contextful/anchor-port.js';
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
export type {
  RouteObjectLike,
  ReactRouterOptions,
} from './graph/sources/from-react-router.js';
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
// THE OFFICIAL VOCABULARY (1.10.0), the Map & Walker names: `defineJourneyMap`
// is a PERMANENT reference-equal alias of `buildNavigationGraph`, and
// `JourneyMap` of `NavigationGraph` — both names ship forever, neither is a
// rename. There is no `Walker` export on purpose: the walker is the session, not
// an object you construct. tree/appmap.ts carries the sentence itself and the
// three movers (a pointer, never a second copy to drift).
export { defineJourneyMap } from './tree/appmap.js';
export type { JourneyMap } from './tree/appmap.js';
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
export type {
  SessionEventName,
  SessionEvents,
  ActionGroup,
  ActionHandle,
} from './atom/types.js';
export { PresenceIndex } from './presence/presence.js';
export type { PresenceHandle } from './presence/presence.js';
export { ActionRegistry } from './registry/registry.js';
export type {
  ActionHandler,
  BindingRegistration,
  Registration,
} from './registry/registry.js';
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
  ActorKind,
  Actuation,
  Affordance,
  ApprovalResult,
  AskStatus,
  Attribution,
  AttributionBasis,
  AttributionCertainty,
  AttributionPolicy,
  AvailableEdge,
  AvailableJourney,
  AvailableSlice,
  BeginWorkOptions,
  Binding,
  BlockedBecause,
  CanonicalRole,
  Cause,
  CommitJourneyResult,
  ConcurrencyPolicy,
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
  EffectPolicy,
  EffectStatus,
  ElementLocator,
  Explanation,
  ExternalObservation,
  FireOptions,
  FireResult,
  FireSettlement,
  FrameStatus,
  FreshnessMovement,
  FreshnessPolicy,
  FreshnessResponse,
  GapReason,
  GapRecord,
  GroundTruth,
  GroundTruthOptions,
  HumanApprovalPolicy,
  HumanDecides,
  Observability,
  ObserveEffectOptions,
  ObserveEffectResult,
  OfferRecord,
  OfferRef,
  ReportGapOptions,
  Page,
  PageDef,
  PendingInfo,
  Principal,
  PrincipalPolicy,
  PrincipalPort,
  RedactedFields,
  SessionOptions,
  Settlement,
  StaleAcknowledgement,
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

export { beginWalk } from './action/walk.js';
export type {
  ActionPlanManifest,
  ActionPlanRow,
  ActionPlanRowStatus,
  ActionPlanStep,
  ActionWalk,
  ActionWalkInterruption,
  ActionWalkRef,
} from './action/walk.js';

export { declareKinds } from './action/kinds.js';
export type {
  DeclaredKindCatalog,
  KindCatalog,
  KindDeclaration,
  KindGovernanceReport,
  KindRecord,
} from './action/kinds.js';

export type {
  ChannelGap,
  SurfaceDeclaration,
  SurfaceHandle,
  SurfaceQuery,
} from './action/channels.js';

export { REQUEST_LIFECYCLE } from './action/request.js';
export type {
  InputRequestHandle,
  InputRequestRef,
  InputRequestSnapshot,
  InputRequestState,
  RequestChoice,
} from './action/request.js';
export { declareLifecycle } from './action/lifecycle.js';
export type {
  DeclaredContextDeclaration,
  DeclaredContextEntry,
  DeclaredContextFold,
  DeclaredContextHandle,
  DeclaredContextSkip,
} from './action/declared-context.js';
export type { Lifecycle, LifecycleChart, LifecycleEdge } from './action/lifecycle.js';
