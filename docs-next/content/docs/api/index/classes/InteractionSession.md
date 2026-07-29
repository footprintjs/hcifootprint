---
title: InteractionSession<Paths>
---

# Class: InteractionSession\<Paths\>

Defined in: [src/traverse/nav-session.ts:100](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L100)

## Extends

- [`Session`](/api/index/classes/Session)

## Type Parameters

### Paths

`Paths` *extends* `string` = `string`

## Constructors

### Constructor

> **new InteractionSession**\<`Paths`\>(`map`, `opts?`, `liveSources?`): `InteractionSession`\<`Paths`\>

Defined in: [src/traverse/nav-session.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L124)

#### Parameters

##### map

[`NavigationGraph`](/api/index/interfaces/NavigationGraph)

##### opts?

[`InteractionSessionOptions`](/api/index/interfaces/InteractionSessionOptions)

##### liveSources?

readonly [`LiveSource`](/api/index/interfaces/LiveSource)[]

Live graph sources to attach to THIS session (createSession passes the graph's).

#### Returns

`InteractionSession`\<`Paths`\>

#### Overrides

[`Session`](/api/index/classes/Session).[`constructor`](/api/index/classes/Session#constructor)

## Accessors

### focus

#### Get Signature

> **get** **focus**(): `string`

Defined in: [src/traverse/nav-session.ts:443](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L443)

##### Returns

`string`

***

### graphId

#### Get Signature

> **get** **graphId**(): `string`

Defined in: [src/traverse/session.ts:276](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L276)

The compiled graph's id (namespaces MCP tool names).

##### Returns

`string`

#### Inherited from

[`Session`](/api/index/classes/Session).[`graphId`](/api/index/classes/Session#graphid)

***

### node

#### Get Signature

> **get** **node**(): `string`

Defined in: [src/traverse/session.ts:271](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L271)

##### Returns

`string`

#### Inherited from

[`Session`](/api/index/classes/Session).[`node`](/api/index/classes/Session#node)

***

### stateVersion

#### Get Signature

> **get** **stateVersion**(): `number`

Defined in: [src/traverse/session.ts:291](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L291)

D18 version split — `version` stays the single total-order cursor; these
two say WHAT moved. A scrolling list must never staleness-fail a plan the
way a closing modal must; consumers watching for re-render/replan can
subscribe to the axis they care about.

##### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`stateVersion`](/api/index/classes/Session#stateversion)

***

### structureVersion

#### Get Signature

> **get** **structureVersion**(): `number`

Defined in: [src/traverse/session.ts:295](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L295)

##### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`structureVersion`](/api/index/classes/Session#structureversion)

***

### version

#### Get Signature

> **get** **version**(): `number`

Defined in: [src/traverse/session.ts:281](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L281)

The one CAS/sinceVersion cursor: total order over ALL world motion.

##### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`version`](/api/index/classes/Session#version)

## Methods

### available()

> **available**(): [`AvailableSlice`](/api/index/interfaces/AvailableSlice)

Defined in: [src/traverse/nav-session.ts:602](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L602)

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

#### Overrides

[`Session`](/api/index/classes/Session).[`available`](/api/index/classes/Session#available)

***

### availableSkills()

> **availableSkills**(): `object`

Defined in: [src/traverse/session.ts:534](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L534)

Skill-level disclosure for the planning LLM (descriptions + feasibility, no tool detail).

#### Returns

`object`

##### node

> **node**: `string`

##### skills

> **skills**: [`AvailableSkill`](/api/index/interfaces/AvailableSkill)[]

##### version

> **version**: `number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`availableSkills`](/api/index/classes/Session#availableskills)

***

### commitLog()

> **commitLog**(): `CommitBundle`[]

Defined in: [src/traverse/session.ts:1377](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1377)

The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition.

#### Returns

`CommitBundle`[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`commitLog`](/api/index/classes/Session#commitlog)

***

### commitSkill()

> **commitSkill**(`skillId`, `opts?`): [`CommitSkillResult`](/api/index/type-aliases/CommitSkillResult)

Defined in: [src/traverse/session.ts:566](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L566)

Commit to a skill: opens a frame so toMCPTools()/contextBrief() serve ONLY
that skill's currently-fireable steps plus escape tools — the token win
(skills for planning, tools on commit). One frame at a time in v0.

Never-trap invariant: an agent commit whose entry step cannot materialise
right now is refused ENTRY_NOT_MATERIALIZED instead of opening a frame
that could never act (see the gate below).

#### Parameters

##### skillId

`string`

##### opts?

###### expectedVersion?

`number`

###### source?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

[`CommitSkillResult`](/api/index/type-aliases/CommitSkillResult)

#### Inherited from

[`Session`](/api/index/classes/Session).[`commitSkill`](/api/index/classes/Session#commitskill)

***

### confirmAsk()

> **confirmAsk**(`affordanceId`, `opts?`): `object`

Defined in: [src/traverse/session.ts:1580](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1580)

Record a high-effect confirm ask and assemble its RECEIPTS from what the
session already knows — the guard evidence that made the edge fireable, the
declared (honesty-tagged) effect, the current position, and a compact tail
of the fire journal. No new capture: this is a pure read over live state.

A serving layer calls this the moment it decides to gate a high-effect edge
on human consent, then relays the returned receipts to the person. The
returned `askId` is the chain key: the confirmed fire closes it as
'approved' automatically (linked by transitionId), or [declineConfirm](/api/index/classes/Session#declineconfirm)
closes it as 'declined'. Asking twice for the same edge while an ask is
still open SUPERSEDES it (the human is still deciding) — one open ask per
affordance. Never throws: an unknown affordance yields a minimal receipt
(a serving layer relies on this mid-turn).

#### Parameters

##### affordanceId

`string`

##### opts?

###### source?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

`object`

##### askId

> **askId**: `string`

##### receipts

> **receipts**: [`ConfirmReceipts`](/api/index/interfaces/ConfirmReceipts)

#### Inherited from

[`Session`](/api/index/classes/Session).[`confirmAsk`](/api/index/classes/Session#confirmask)

***

### confirms()

> **confirms**(): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

Defined in: [src/traverse/session.ts:1634](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1634)

The confirm journal (DEEP copies): every high-effect ask and how it was
answered — an auditable ask → decision → fire chain (join `transitionId`
back to the commit log, `askId` across the three rows). Export it to your
audit sink like gaps(); it grows for the session's life.

#### Returns

[`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`confirms`](/api/index/classes/Session#confirms)

***

### contextBrief()

> **contextBrief**(`opts?`): [`ContextBrief`](/api/index/interfaces/ContextBrief)

Defined in: [src/traverse/nav-session.ts:743](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L743)

Token-lean, prompt-ready session context for the next chat turn: current
position, the open frame, and who did what since `sinceVersion` (the
agent's last look). Built from AUTHORED strings and structural facts only
— state values and payloads never enter the text.

#### Parameters

##### opts?

[`ContextBriefOptions`](/api/index/interfaces/ContextBriefOptions)

#### Returns

[`ContextBrief`](/api/index/interfaces/ContextBrief)

#### Overrides

[`Session`](/api/index/classes/Session).[`contextBrief`](/api/index/classes/Session#contextbrief)

***

### declineConfirm()

> **declineConfirm**(`affordanceId`, `opts?`): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/traverse/session.ts:1607](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1607)

Close a high-effect ask as DECLINED — the human said no. Records the
decision so the chain closes honestly instead of the ask dangling forever
(the v1 reality: a declined action was simply never re-called, an invisible
event). Closes the open ask for `affordanceId` when one exists; with none
open (a pre-emptive decline) it mints a standalone decline row — a refusal
is worth recording either way. Returns the row (a deep copy).

#### Parameters

##### affordanceId

`string`

##### opts?

###### by?

`string`

###### note?

`string`

###### principal?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

[`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

#### Inherited from

[`Session`](/api/index/classes/Session).[`declineConfirm`](/api/index/classes/Session#declineconfirm)

***

### detachSources()

> **detachSources**(): `void`

Defined in: [src/traverse/nav-session.ts:155](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L155)

Release every live-source binding this session's graph attached (the
counterpart of `sources: [fromLiveStore(...)]`). Idempotent: the ledger is
drained on the first call. A source whose detach throws is isolated with a
warning — consumer store code must never break the session (recorder rule).

#### Returns

`void`

***

### explain()

> **explain**(`affordanceId`): [`Explanation`](/api/index/interfaces/Explanation)

Defined in: [src/traverse/session.ts:513](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L513)

Why an affordance is (or is not) available right now — per-condition evidence.

#### Parameters

##### affordanceId

`string`

#### Returns

[`Explanation`](/api/index/interfaces/Explanation)

#### Inherited from

[`Session`](/api/index/classes/Session).[`explain`](/api/index/classes/Session#explain)

***

### fire()

> **fire**(`affordanceId`, `opts?`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: [src/traverse/nav-session.ts:637](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L637)

The tree gates (visibility, overlay masking, instance keys, mounting) run
BEFORE the base fire, so the same runtime-optional/type-required contract
has to hold here too — otherwise `session.fire('page.tool')` from JS would
still crash in this override, one frame before the one it was fixed in.

#### Parameters

##### affordanceId

`string`

##### opts?

[`FireOptions`](/api/index/interfaces/FireOptions) = `UNATTRIBUTED_FIRE`

#### Returns

[`FireResult`](/api/index/type-aliases/FireResult)

#### Overrides

[`Session`](/api/index/classes/Session).[`fire`](/api/index/classes/Session#fire)

***

### frames()

> **frames**(): [`SkillFrame`](/api/index/interfaces/SkillFrame)[]

Defined in: [src/traverse/session.ts:656](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L656)

Frame history: every closed frame (completed / cancelled / demoted), oldest first.

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`frames`](/api/index/classes/Session#frames)

***

### gaps()

> **gaps**(): [`GapRecord`](/api/index/interfaces/GapRecord)[]

Defined in: [src/traverse/session.ts:1440](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1440)

The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline.

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`gaps`](/api/index/classes/Session#gaps)

***

### leaveSkill()

> **leaveSkill**(`opts?`): [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/traverse/session.ts:632](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L632)

Close the open frame. Default reason: 'completed' if every step was
committed while the frame was open, else 'cancelled'. Returns the closed
frame, or null when none was open.

#### Parameters

##### opts?

###### reason?

`"completed"` \| `"cancelled"`

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

#### Inherited from

[`Session`](/api/index/classes/Session).[`leaveSkill`](/api/index/classes/Session#leaveskill)

***

### on()

> **on**\<`N`\>(`event`, `listener`): () => `void`

Defined in: [src/traverse/session.ts:321](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L321)

Subscribe to a session event. Returns an unsubscribe function.

#### Type Parameters

##### N

`N` *extends* keyof [`SessionEvents`](/api/index/interfaces/SessionEvents)

#### Parameters

##### event

`N`

##### listener

(`payload`) => `void`

#### Returns

() => `void`

#### Inherited from

[`Session`](/api/index/classes/Session).[`on`](/api/index/classes/Session#on)

***

### onConfirm()

> **onConfirm**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:1639](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1639)

Live export hook: fires once per new confirm row. Sugar for `on('confirm', …)`.

#### Parameters

##### listener

(`record`) => `void`

#### Returns

() => `void`

#### Inherited from

[`Session`](/api/index/classes/Session).[`onConfirm`](/api/index/classes/Session#onconfirm)

***

### onGap()

> **onGap**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:1445](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1445)

Live export hook: fires once per new gap row. Sugar for `on('gap', …)`.

#### Parameters

##### listener

(`gap`) => `void`

#### Returns

() => `void`

#### Inherited from

[`Session`](/api/index/classes/Session).[`onGap`](/api/index/classes/Session#ongap)

***

### pending()

> **pending**(): [`PendingInfo`](/api/index/interfaces/PendingInfo)[]

Defined in: [src/traverse/session.ts:1287](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1287)

Fired transitions still awaiting their state report (oldest first).

#### Returns

[`PendingInfo`](/api/index/interfaces/PendingInfo)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`pending`](/api/index/classes/Session#pending)

***

### producedFor()

> **producedFor**(`transitionId`): `unknown`

Defined in: [src/traverse/session.ts:1408](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1408)

Data the given transition's handler RETURNED (search results, a looked-up
record) — a fresh snapshot, safe to serialize into a tool result. Available
once the handler has resolved, so read it AFTER awaiting the settlement.
Returns undefined when the handler returned nothing (or capture is off).

#### Parameters

##### transitionId

`string`

#### Returns

`unknown`

#### Inherited from

[`Session`](/api/index/classes/Session).[`producedFor`](/api/index/classes/Session#producedfor)

***

### readsByStep()

> **readsByStep**(): `ReadonlyMap`\<`string`, `string`[]\>

Defined in: [src/traverse/session.ts:1398](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1398)

runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup).

#### Returns

`ReadonlyMap`\<`string`, `string`[]\>

#### Inherited from

[`Session`](/api/index/classes/Session).[`readsByStep`](/api/index/classes/Session#readsbystep)

***

### registerTool()

> **registerTool**(`path`, `toolId`, `def`): [`ToolHandle`](/api/index/interfaces/ToolHandle)

Defined in: [src/traverse/nav-session.ts:275](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L275)

Register ONE tool on a node (convenience over registerToolGroup). `def`
either binds an existing declared tool (`{ handler }`) or declares a new
leaf here (`{ does, handler }`). Returns a single-tool handle.

#### Parameters

##### path

`Paths`

##### toolId

`string`

##### def

[`RegisteredToolDef`](/api/index/interfaces/RegisteredToolDef) & `object`

#### Returns

[`ToolHandle`](/api/index/interfaces/ToolHandle)

***

### registerToolGroup()

> **registerToolGroup**(`path`, `opts?`): [`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

Defined in: [src/traverse/nav-session.ts:195](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L195)

Register a component's handlers/tools ON a node when it renders. You never
name a group — this RETURNS a ToolGroupHandle that is the identity (with a
generated `id`). Hold it in a ref; call `handle.unregister()` on unmount.
`handle.setEnabled(toolId, false)` greys one tool out (a disabled button).

#### Parameters

##### path

`Paths`

##### opts?

[`RegisterToolGroupOptions`](/api/index/interfaces/RegisterToolGroupOptions)

#### Returns

[`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

***

### registerTools()

> **registerTools**(`opts`): [`RegisteredTools`](/api/index/interfaces/RegisteredTools)

Defined in: [src/traverse/session.ts:486](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L486)

Register handlers on the FLAT graph (skillGraph — no node tree). Takes a
caller `group` string; the tree API (InteractionSession.registerToolGroup)
is preferred where you have a node path — it returns a handle so you never
invent a group name.

#### Parameters

##### opts

[`RegisterToolsOptions`](/api/index/interfaces/RegisterToolsOptions)

#### Returns

[`RegisteredTools`](/api/index/interfaces/RegisteredTools)

#### Inherited from

[`Session`](/api/index/classes/Session).[`registerTools`](/api/index/classes/Session#registertools)

***

### reject()

> **reject**(`transitionId`, `opts?`): [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/traverse/session.ts:1302](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1302)

The app rejected/rolled back a transition's effect (optimistic UI).
Works on a PENDING transition (effect never landed → no bundle) and on an
already-SETTLED one (server rejected after the optimistic report): the
record flips to rolled-back and the app's compensating delta should follow
via updateState — the commit log keeps both writes, honestly.

#### Parameters

##### transitionId

`string`

##### opts?

###### outcome?

`"rejected"` \| `"rolled-back"` \| `"superseded"`

#### Returns

[`TransitionRecord`](/api/index/interfaces/TransitionRecord)

#### Inherited from

[`Session`](/api/index/classes/Session).[`reject`](/api/index/classes/Session#reject)

***

### reportGap()

> **reportGap**(`opts`): [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/traverse/session.ts:1423](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1423)

Report an ask that no available action or skill could serve (typically
called by the agent's report_gap tool before it apologizes). The row is
token-lean by design: the ask plus NAME lists, never descriptions.

#### Parameters

##### opts

[`ReportGapOptions`](/api/index/interfaces/ReportGapOptions)

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)

#### Inherited from

[`Session`](/api/index/classes/Session).[`reportGap`](/api/index/classes/Session#reportgap)

***

### setVisible()

> **setVisible**(`path`, `visible`): `void`

Defined in: [src/traverse/nav-session.ts:409](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L409)

#### Parameters

##### path

`Paths`

##### visible

`boolean`

#### Returns

`void`

***

### show()

> **show**(`path`): `void`

Defined in: [src/traverse/nav-session.ts:416](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L416)

Show a node; for a tab this also hides its tab siblings (at most one shown).

#### Parameters

##### path

`Paths`

#### Returns

`void`

***

### skillFrame()

> **skillFrame**(): [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/traverse/session.ts:651](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L651)

The open skill frame (snapshot), or null.

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

#### Inherited from

[`Session`](/api/index/classes/Session).[`skillFrame`](/api/index/classes/Session#skillframe)

***

### skillPlan()

> **skillPlan**(`skillId`): [`SkillPlan`](/api/index/interfaces/SkillPlan)

Defined in: [src/traverse/session.ts:666](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L666)

The DERIVED intra-skill dependency DAG with live status. Dependencies are
computed, never authored: step B depends on step A when A's declared
effect.writes overlap B's guard keys — the guard×effect atoms already
encode the ordering, so it cannot drift from the graph.

#### Parameters

##### skillId

`string`

#### Returns

[`SkillPlan`](/api/index/interfaces/SkillPlan)

#### Inherited from

[`Session`](/api/index/classes/Session).[`skillPlan`](/api/index/classes/Session#skillplan)

***

### state()

> **state**(): `Record`\<`string`, `unknown`\>

Defined in: [src/traverse/session.ts:412](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L412)

Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references).

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`Session`](/api/index/classes/Session).[`state`](/api/index/classes/Session#state)

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/traverse/nav-session.ts:724](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L724)

The observed node is runtime input from the world, so an unauthored page
is NOT an error: the cursor follows reality (off-graph), available()
honestly serves zero edges there, and the hop is still recorded.

#### Parameters

##### observedNode

`string`

##### opts?

###### principal?

[`Principal`](/api/index/type-aliases/Principal)

###### stimulus?

[`StimulusKind`](/api/index/type-aliases/StimulusKind)

#### Returns

[`SyncResult`](/api/index/type-aliases/SyncResult)

#### Overrides

[`Session`](/api/index/classes/Session).[`sync`](/api/index/classes/Session#sync)

***

### toMCPTools()

> **toMCPTools**(`opts?`): `MCPToolDescription`[]

Defined in: [src/traverse/session.ts:1728](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1728)

Per-edge MCP tool descriptors for the CURRENT slice. Regenerated per call
— never cached. With a skill frame open, serves ONLY the frame's
currently-fireable steps + escape tools (authored cancel/back roles and a
synthetic leave-skill) — the on-demand disclosure contract.

#### Parameters

##### opts?

###### lossySchemas?

`boolean`

#### Returns

`MCPToolDescription`[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`toMCPTools`](/api/index/classes/Session#tomcptools)

***

### transitions()

> **transitions**(): readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

Defined in: [src/traverse/session.ts:1387](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1387)

The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
bundles by TransitionRecord.id; pending and rejected/rolled-back rows
exist only here (their effects never touched state). Rows are snapshots —
live records are the ones returned by fire()/updateState()/reject().

#### Returns

readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`transitions`](/api/index/classes/Session#transitions)

***

### trySkillPlan()

> **trySkillPlan**(`skillId`): [`TrySkillPlanResult`](/api/index/type-aliases/TrySkillPlanResult)

Defined in: [src/traverse/session.ts:718](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L718)

skillPlan() for an id the caller did not author — a model's, a URL's, a
config file's — answering with a value instead of a throw. Same plan; the
failure arm is the UNKNOWN_SKILL shape commitSkill() already returns.

skillPlan() keeps throwing, deliberately. Every caller inside the library
passes an id the spec itself just yielded, and there an unknown id is a bug
that should stop the program, not a branch someone forgets to write. This
is the door for ids that arrive from outside, where not-a-skill is an
ordinary answer.

Membership is Object.hasOwn rather than a truthiness lookup BECAUSE the ids
here are untrusted: `skills['constructor']` is truthy on any plain object,
so a lookup would sail past the guard and fail downstream reading `.steps`
off Object's constructor — a TypeError where the caller asked for exactly
the honest "no such skill" this method exists to give.

#### Parameters

##### skillId

`string`

#### Returns

[`TrySkillPlanResult`](/api/index/type-aliases/TrySkillPlanResult)

#### Inherited from

[`Session`](/api/index/classes/Session).[`trySkillPlan`](/api/index/classes/Session#tryskillplan)

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/traverse/session.ts:506](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L506)

Remove every live binding currently owned by `group` (component unmount).

#### Parameters

##### group

`string`

#### Returns

`string`[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`unregisterGroup`](/api/index/classes/Session#unregistergroup)

***

### updateState()

> **updateState**(`delta`, `opts?`): [`UpdateResult`](/api/index/type-aliases/UpdateResult)

Defined in: [src/traverse/session.ts:1133](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1133)

Report a projected-state delta from the app (router/store tap).

Attribution, in priority order:
1. `opts.transitionId` — settles that pending transition precisely (preferred).
2. `opts.stimulus`/`opts.principal` set — recorded as a stimulus transition,
   NEVER attributed to a pending fire (explicit attribution wins; a server
   push must not hijack a pending action's provenance).
3. Otherwise: FIFO to the oldest pending fired transition. With several
   pendings and out-of-order app handlers this can mis-attribute — pass
   transitionId from your tap when you can; effectVerified=false is the
   designed detector for key mismatches.
4. No pendings, no hints: recorded as a `stimulus:'unknown'` transition —
   state never moves silently.

Undefined-valued entries are dropped from the report before anything else
(uniformly — new and existing keys): a report cannot store undefined, and
a declared write reported as undefined counts as missing
(`effectVerified: false`).

#### Parameters

##### delta

`Record`\<`string`, `unknown`\>

##### opts?

[`UpdateOptions`](/api/index/interfaces/UpdateOptions)

#### Returns

[`UpdateResult`](/api/index/type-aliases/UpdateResult)

#### Inherited from

[`Session`](/api/index/classes/Session).[`updateState`](/api/index/classes/Session#updatestate)

***

### why()

> **why**(`key`): `string`

Defined in: [src/traverse/session.ts:1392](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1392)

"Why does this state key hold its value?" — footprint backward slice, formatted.

#### Parameters

##### key

`string`

#### Returns

`string`

#### Inherited from

[`Session`](/api/index/classes/Session).[`why`](/api/index/classes/Session#why)
