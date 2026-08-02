/**
 * TYPE-LEVEL proof of the ONE-WORD contract. This file is NOT run — it must
 * COMPILE, and `npm run typecheck` is the gate.
 *
 * At 1.0 the old vocabulary is DELETED rather than aliased, so the proof runs
 * the other way round from a deprecation: every check below asserts that a name
 * or a key is GONE. `@ts-expect-error` is the assertion — it FAILS the build if
 * the line it guards ever compiles again, so an alias quietly reintroduced (or
 * a dual-accept key added back "for compatibility") cannot pass unnoticed.
 *
 * The definition literal at the bottom is the other half: the surviving keys are
 * `actions:` and `journeys:`, and the typed-node-path guardrail stays armed (a
 * typo is still a compile error).
 */
import { buildNavigationGraph } from '../src/index.js';
import type {
  ActionDef,
  ActionGroup,
  ActionGroupHandle,
  ActionHandle,
  ActionHandler,
  AvailableJourney,
  CommitJourneyResult,
  Journey,
  JourneyCallArgs,
  JourneyDef,
  JourneyFrame,
  JourneyPlan,
  JourneyPlanStep,
  JourneySpec,
  JourneyToolsOptions,
  JourneyToolsPort,
  JourneyToolsPortWithSettlement,
  NavigationGraphDef,
  NavigationGraphSpec,
  RegisterActionGroupOptions,
  RegisteredActionDef,
  RegisteredHandlers,
  RegisterHandlersOptions,
  TryJourneyPlanResult,
} from '../src/index.js';
import type { JourneyHealth } from '../src/testing/index.js';

/** Every surviving name, named once — an import that stops resolving is a failure. */
type SurfaceCheck = [
  ActionDef,
  ActionGroup,
  ActionGroupHandle,
  ActionHandle,
  ActionHandler,
  AvailableJourney,
  CommitJourneyResult,
  Journey,
  JourneyCallArgs,
  JourneyDef,
  JourneyFrame,
  JourneyHealth,
  JourneyPlan,
  JourneyPlanStep,
  JourneySpec,
  JourneyToolsOptions,
  JourneyToolsPort,
  JourneyToolsPortWithSettlement,
  NavigationGraphDef,
  NavigationGraphSpec,
  RegisterActionGroupOptions,
  RegisteredActionDef,
  RegisteredHandlers,
  RegisterHandlersOptions,
  TryJourneyPlanResult,
];
declare const _surface: SurfaceCheck;
void _surface;

// -- the deleted names are GONE, not aliased ---------------------------------
// Each line names one word this library used to publish. A `@ts-expect-error`
// that stops erroring is itself an error, so re-adding any of them fails here.

// @ts-expect-error `skillGraph` (the v1 fluent builder) is deleted at 1.0
import type { skillGraph as _skillGraph } from '../src/index.js';
// @ts-expect-error `SkillGraphBuilder` is deleted at 1.0
import type { SkillGraphBuilder as _SkillGraphBuilder } from '../src/index.js';
// @ts-expect-error `SkillGraph` is deleted — the compiled graph is `NavigationGraph`
import type { SkillGraph as _SkillGraph } from '../src/index.js';
// @ts-expect-error `SkillGraphValidationError` is now `GraphValidationError`
import type { SkillGraphValidationError as _SkillGraphValidationError } from '../src/index.js';
// @ts-expect-error `SkillGraphSpec` is now `NavigationGraphSpec`
import type { SkillGraphSpec as _SkillGraphSpec } from '../src/index.js';
// @ts-expect-error `SkillDef2` (number-suffixed) is now `JourneyDef`
import type { SkillDef2 as _SkillDef2 } from '../src/index.js';
// @ts-expect-error `SkillDef` is now `JourneySpec`
import type { SkillDef as _SkillDef } from '../src/index.js';
// @ts-expect-error `Skill` is now `Journey`
import type { Skill as _Skill } from '../src/index.js';
// @ts-expect-error `AvailableSkill` is now `AvailableJourney`
import type { AvailableSkill as _AvailableSkill } from '../src/index.js';
// @ts-expect-error `SkillPlan` is now `JourneyPlan`
import type { SkillPlan as _SkillPlan } from '../src/index.js';
// @ts-expect-error `SkillPlanStep` is now `JourneyPlanStep`
import type { SkillPlanStep as _SkillPlanStep } from '../src/index.js';
// @ts-expect-error `SkillFrame` is now `JourneyFrame`
import type { SkillFrame as _SkillFrame } from '../src/index.js';
// @ts-expect-error `CommitSkillResult` is now `CommitJourneyResult`
import type { CommitSkillResult as _CommitSkillResult } from '../src/index.js';
// @ts-expect-error `TrySkillPlanResult` is now `TryJourneyPlanResult`
import type { TrySkillPlanResult as _TrySkillPlanResult } from '../src/index.js';
// @ts-expect-error `SkillCallArgs` is now `JourneyCallArgs`
import type { SkillCallArgs as _SkillCallArgs } from '../src/index.js';
// @ts-expect-error `SkillToolsOptions` is now `JourneyToolsOptions`
import type { SkillToolsOptions as _SkillToolsOptions } from '../src/index.js';
// @ts-expect-error `SkillToolsPort` is now `JourneyToolsPort`
import type { SkillToolsPort as _SkillToolsPort } from '../src/index.js';
// @ts-expect-error `SkillToolsPortWithSettlement` is now `JourneyToolsPortWithSettlement`
import type { SkillToolsPortWithSettlement as _SkillToolsPortSettled } from '../src/index.js';
// @ts-expect-error `skillsAsTools` is now `serveToAgent`
import type { skillsAsTools as _skillsAsTools } from '../src/index.js';
// @ts-expect-error `leaveSkillTool` is now `leaveJourneyTool`
import type { leaveSkillTool as _leaveSkillTool } from '../src/index.js';
// @ts-expect-error `ToolDef` is now `ActionDef` — you author ACTIONS
import type { ToolDef as _ToolDef } from '../src/index.js';
// @ts-expect-error `ToolHandler` is now `ActionHandler`
import type { ToolHandler as _ToolHandler } from '../src/index.js';
// @ts-expect-error `ToolGroup` is now `ActionGroup`
import type { ToolGroup as _ToolGroup } from '../src/index.js';
// @ts-expect-error `ToolHandle` is now `ActionHandle`
import type { ToolHandle as _ToolHandle } from '../src/index.js';
// @ts-expect-error `ToolGroupHandle` is now `ActionGroupHandle`
import type { ToolGroupHandle as _ToolGroupHandle } from '../src/index.js';
// @ts-expect-error `ToolRegistry` is now `ActionRegistry`
import type { ToolRegistry as _ToolRegistry } from '../src/index.js';
// @ts-expect-error `RegisteredToolDef` is now `RegisteredActionDef`
import type { RegisteredToolDef as _RegisteredToolDef } from '../src/index.js';
// @ts-expect-error `RegisterToolGroupOptions` is now `RegisterActionGroupOptions`
import type { RegisterToolGroupOptions as _RegisterToolGroupOptions } from '../src/index.js';
// @ts-expect-error `RegisterToolsOptions` is now `RegisterHandlersOptions`
import type { RegisterToolsOptions as _RegisterToolsOptions } from '../src/index.js';
// @ts-expect-error `RegisteredTools` is now `RegisteredHandlers`
import type { RegisteredTools as _RegisteredTools } from '../src/index.js';
// @ts-expect-error `SkillHealth` is now `JourneyHealth`
import type { SkillHealth as _SkillHealth } from '../src/testing/index.js';

// -- the surviving definition keys -------------------------------------------
const words = {
  pages: {
    catalog: {
      actions: { 'add-to-cart': { does: 'Add' } },
      areas: { rail: { actions: { 'set-color': { does: 'Filter' } } } },
    },
  },
  actions: { help: { does: 'Open help', on: 'catalog' } },
  journeys: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
} satisfies NavigationGraphDef;

// The renamed keys do not typecheck — a definition written in the old words is
// a COMPILE error, which is where a rename should be caught.
const renamedNodeKey = {
  // @ts-expect-error `tools:` was renamed to `actions:`
  pages: { catalog: { tools: { 'add-to-cart': { does: 'Add' } } } },
} satisfies NavigationGraphDef;
const renamedRootActions = {
  pages: { catalog: {} },
  // @ts-expect-error `tools:` was renamed to `actions:`
  tools: { help: { does: 'Open help', on: 'catalog' } },
} satisfies NavigationGraphDef;
const renamedRootJourneys = {
  pages: { catalog: {} },
  // @ts-expect-error `skills:` was renamed to `journeys:`
  skills: { purchase: { does: 'Buy a dress', steps: ['add-to-cart'] } },
} satisfies NavigationGraphDef;
void [renamedNodeKey, renamedRootActions, renamedRootJourneys];

const session = buildNavigationGraph('shop', words).createSession();

// The typed-node-path guardrail stays armed: real paths compile, and a typo is
// a COMPILE error, not a silent runtime no-op.
session.registerActions('catalog.rail');
// @ts-expect-error 'catalog.rai' is not a declared node path
session.registerActions('catalog.rai');

// The renamed mount key is refused by the compiler too.
// @ts-expect-error `tools:` was renamed to `actions:`
session.registerActions('catalog', { tools: { extra: { does: 'Extra' } } });

// And the deleted registration methods are gone.
// @ts-expect-error `registerToolGroup` is now `registerActions`
session.registerToolGroup('catalog');
// @ts-expect-error `registerTool` is now `registerAction`
session.registerTool('catalog', 'x', { does: 'X', handler: () => undefined });
// @ts-expect-error `registerTools` is now `registerHandlers`
session.registerTools({ group: 'g', handlers: {} });
// @ts-expect-error `commitSkill` is now `commitJourney`
session.commitSkill('purchase');
// @ts-expect-error `skillPlan` is now `journeyPlan`
session.skillPlan('purchase');
// @ts-expect-error `trySkillPlan` is now `tryJourneyPlan`
session.trySkillPlan('purchase');
// @ts-expect-error `skillFrame` is now `journeyFrame`
session.skillFrame();
// @ts-expect-error `leaveSkill` is now `leaveJourney`
session.leaveSkill();
// @ts-expect-error `availableSkills` is now `availableJourneys`
session.availableSkills();
