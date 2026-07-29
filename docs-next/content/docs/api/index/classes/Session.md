---
title: Session
---

# Class: Session

Defined in: [src/traverse/session.ts:152](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L152)

## Extended by

- [`InteractionSession`](/api/index/classes/InteractionSession)

## Constructors

### Constructor

> **new Session**(`spec`, `opts`): `Session`

Defined in: [src/traverse/session.ts:237](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L237)

#### Parameters

##### spec

[`SkillGraphSpec`](/api/index/interfaces/SkillGraphSpec)

##### opts

[`SessionOptions`](/api/index/interfaces/SessionOptions)

#### Returns

`Session`

## Accessors

### graphId

#### Get Signature

> **get** **graphId**(): `string`

Defined in: [src/traverse/session.ts:279](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L279)

The compiled graph's id (namespaces MCP tool names).

##### Returns

`string`

***

### node

#### Get Signature

> **get** **node**(): `string`

Defined in: [src/traverse/session.ts:274](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L274)

##### Returns

`string`

***

### stateVersion

#### Get Signature

> **get** **stateVersion**(): `number`

Defined in: [src/traverse/session.ts:294](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L294)

D18 version split — `version` stays the single total-order cursor; these
two say WHAT moved. A scrolling list must never staleness-fail a plan the
way a closing modal must; consumers watching for re-render/replan can
subscribe to the axis they care about.

##### Returns

`number`

***

### structureVersion

#### Get Signature

> **get** **structureVersion**(): `number`

Defined in: [src/traverse/session.ts:298](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L298)

##### Returns

`number`

***

### version

#### Get Signature

> **get** **version**(): `number`

Defined in: [src/traverse/session.ts:284](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L284)

The one CAS/sinceVersion cursor: total order over ALL world motion.

##### Returns

`number`

## Methods

### available()

> **available**(): [`AvailableSlice`](/api/index/interfaces/AvailableSlice)

Defined in: [src/traverse/session.ts:423](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L423)

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

***

### availableSkills()

> **availableSkills**(): `object`

Defined in: [src/traverse/session.ts:537](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L537)

Skill-level disclosure for the planning LLM (descriptions + feasibility, no tool detail).

#### Returns

`object`

##### node

> **node**: `string`

##### skills

> **skills**: [`AvailableSkill`](/api/index/interfaces/AvailableSkill)[]

##### version

> **version**: `number`

***

### commitLog()

> **commitLog**(): `CommitBundle`[]

Defined in: [src/traverse/session.ts:1380](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1380)

The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition.

#### Returns

`CommitBundle`[]

***

### commitSkill()

> **commitSkill**(`skillId`, `opts?`): [`CommitSkillResult`](/api/index/type-aliases/CommitSkillResult)

Defined in: [src/traverse/session.ts:569](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L569)

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

***

### confirmAsk()

> **confirmAsk**(`affordanceId`, `opts?`): `object`

Defined in: [src/traverse/session.ts:1654](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1654)

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

***

### confirms()

> **confirms**(): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

Defined in: [src/traverse/session.ts:1708](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1708)

The confirm journal (DEEP copies): every high-effect ask and how it was
answered — an auditable ask → decision → fire chain (join `transitionId`
back to the commit log, `askId` across the three rows). Export it to your
audit sink like gaps(); it grows for the session's life.

#### Returns

[`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

***

### contextBrief()

> **contextBrief**(`opts?`): [`ContextBrief`](/api/index/interfaces/ContextBrief)

Defined in: [src/traverse/session.ts:1815](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1815)

Token-lean, prompt-ready session context for the next chat turn: current
position, the open frame, and who did what since `sinceVersion` (the
agent's last look). Built from AUTHORED strings and structural facts only
— state values and payloads never enter the text.

#### Parameters

##### opts?

[`ContextBriefOptions`](/api/index/interfaces/ContextBriefOptions)

#### Returns

[`ContextBrief`](/api/index/interfaces/ContextBrief)

***

### declineConfirm()

> **declineConfirm**(`affordanceId`, `opts?`): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/traverse/session.ts:1681](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1681)

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

***

### explain()

> **explain**(`affordanceId`): [`Explanation`](/api/index/interfaces/Explanation)

Defined in: [src/traverse/session.ts:516](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L516)

Why an affordance is (or is not) available right now — per-condition evidence.

#### Parameters

##### affordanceId

`string`

#### Returns

[`Explanation`](/api/index/interfaces/Explanation)

***

### fire()

> **fire**(`affordanceId`, `opts?`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: [src/traverse/session.ts:744](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L744)

Returned transition records are LIVE views — settlement updates them in
place. `effectStatus` is the opposite: a reading taken at return time, and
because the handler is always deferred it can never say 'performed' here.
`whenSettled` carries the later truth, once, as a snapshot.

`opts` is optional at RUNTIME and required in TypeScript: a JS caller's
`fire('page.tool')` is answered instead of crashing on `opts.source`,
while a typed caller is still made to name the principal. An omitted
source reads as 'agent' — never 'user', which would file a machine's
action in the ledger under a human and disarm the never-trap gate below.

#### Parameters

##### affordanceId

`string`

##### opts?

[`FireOptions`](/api/index/interfaces/FireOptions) = `UNATTRIBUTED_FIRE`

#### Returns

[`FireResult`](/api/index/type-aliases/FireResult)

***

### frames()

> **frames**(): [`SkillFrame`](/api/index/interfaces/SkillFrame)[]

Defined in: [src/traverse/session.ts:659](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L659)

Frame history: every closed frame (completed / cancelled / demoted), oldest first.

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame)[]

***

### gaps()

> **gaps**(): [`GapRecord`](/api/index/interfaces/GapRecord)[]

Defined in: [src/traverse/session.ts:1443](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1443)

The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline.

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)[]

***

### leaveSkill()

> **leaveSkill**(`opts?`): [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/traverse/session.ts:635](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L635)

Close the open frame. Default reason: 'completed' if every step was
committed while the frame was open, else 'cancelled'. Returns the closed
frame, or null when none was open.

#### Parameters

##### opts?

###### reason?

`"completed"` \| `"cancelled"`

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

***

### on()

> **on**\<`N`\>(`event`, `listener`): () => `void`

Defined in: [src/traverse/session.ts:324](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L324)

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

***

### onConfirm()

> **onConfirm**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:1713](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1713)

Live export hook: fires once per new confirm row. Sugar for `on('confirm', …)`.

#### Parameters

##### listener

(`record`) => `void`

#### Returns

() => `void`

***

### onGap()

> **onGap**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:1448](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1448)

Live export hook: fires once per new gap row. Sugar for `on('gap', …)`.

#### Parameters

##### listener

(`gap`) => `void`

#### Returns

() => `void`

***

### pending()

> **pending**(): [`PendingInfo`](/api/index/interfaces/PendingInfo)[]

Defined in: [src/traverse/session.ts:1290](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1290)

Fired transitions still awaiting their state report (oldest first).

#### Returns

[`PendingInfo`](/api/index/interfaces/PendingInfo)[]

***

### producedFor()

> **producedFor**(`transitionId`): `unknown`

Defined in: [src/traverse/session.ts:1411](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1411)

Data the given transition's handler RETURNED (search results, a looked-up
record) — a fresh snapshot, safe to serialize into a tool result. Available
once the handler has resolved, so read it AFTER awaiting the settlement.
Returns undefined when the handler returned nothing (or capture is off).

#### Parameters

##### transitionId

`string`

#### Returns

`unknown`

***

### readsByStep()

> **readsByStep**(): `ReadonlyMap`\<`string`, `string`[]\>

Defined in: [src/traverse/session.ts:1401](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1401)

runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup).

#### Returns

`ReadonlyMap`\<`string`, `string`[]\>

***

### registerTools()

> **registerTools**(`opts`): [`RegisteredTools`](/api/index/interfaces/RegisteredTools)

Defined in: [src/traverse/session.ts:489](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L489)

Register handlers on the FLAT graph (skillGraph — no node tree). Takes a
caller `group` string; the tree API (InteractionSession.registerToolGroup)
is preferred where you have a node path — it returns a handle so you never
invent a group name.

#### Parameters

##### opts

[`RegisterToolsOptions`](/api/index/interfaces/RegisterToolsOptions)

#### Returns

[`RegisteredTools`](/api/index/interfaces/RegisteredTools)

***

### reject()

> **reject**(`transitionId`, `opts?`): [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/traverse/session.ts:1305](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1305)

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

***

### reportGap()

> **reportGap**(`opts`): [`GapRecord`](/api/index/interfaces/GapRecord)

Defined in: [src/traverse/session.ts:1426](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1426)

Report an ask that no available action or skill could serve (typically
called by the agent's report_gap tool before it apologizes). The row is
token-lean by design: the ask plus NAME lists, never descriptions.

#### Parameters

##### opts

[`ReportGapOptions`](/api/index/interfaces/ReportGapOptions)

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)

***

### skillFrame()

> **skillFrame**(): [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/traverse/session.ts:654](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L654)

The open skill frame (snapshot), or null.

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

***

### skillPlan()

> **skillPlan**(`skillId`): [`SkillPlan`](/api/index/interfaces/SkillPlan)

Defined in: [src/traverse/session.ts:669](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L669)

The DERIVED intra-skill dependency DAG with live status. Dependencies are
computed, never authored: step B depends on step A when A's declared
effect.writes overlap B's guard keys — the guard×effect atoms already
encode the ordering, so it cannot drift from the graph.

#### Parameters

##### skillId

`string`

#### Returns

[`SkillPlan`](/api/index/interfaces/SkillPlan)

***

### state()

> **state**(): `Record`\<`string`, `unknown`\>

Defined in: [src/traverse/session.ts:415](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L415)

Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references).

#### Returns

`Record`\<`string`, `unknown`\>

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/traverse/session.ts:1342](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1342)

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

***

### toMCPTools()

> **toMCPTools**(`opts?`): `MCPToolDescription`[]

Defined in: [src/traverse/session.ts:1802](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1802)

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

***

### transitions()

> **transitions**(): readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

Defined in: [src/traverse/session.ts:1390](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1390)

The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
bundles by TransitionRecord.id; pending and rejected/rolled-back rows
exist only here (their effects never touched state). Rows are snapshots —
live records are the ones returned by fire()/updateState()/reject().

#### Returns

readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

***

### trySkillPlan()

> **trySkillPlan**(`skillId`): [`TrySkillPlanResult`](/api/index/type-aliases/TrySkillPlanResult)

Defined in: [src/traverse/session.ts:721](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L721)

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

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/traverse/session.ts:509](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L509)

Remove every live binding currently owned by `group` (component unmount).

#### Parameters

##### group

`string`

#### Returns

`string`[]

***

### updateState()

> **updateState**(`delta`, `opts?`): [`UpdateResult`](/api/index/type-aliases/UpdateResult)

Defined in: [src/traverse/session.ts:1136](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1136)

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

***

### why()

> **why**(`key`): `string`

Defined in: [src/traverse/session.ts:1395](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1395)

"Why does this state key hold its value?" — footprint backward slice, formatted.

#### Parameters

##### key

`string`

#### Returns

`string`
