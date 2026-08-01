---
title: Session
---

# Class: Session

Defined in: [src/traverse/session.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L301)

## Extended by

- [`InteractionSession`](/api/index/classes/InteractionSession)

## Constructors

### Constructor

> **new Session**(`spec`, `opts`): `Session`

Defined in: [src/traverse/session.ts:541](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L541)

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

Defined in: [src/traverse/session.ts:603](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L603)

The compiled graph's id (namespaces MCP tool names).

##### Returns

`string`

***

### node

#### Get Signature

> **get** **node**(): `string`

Defined in: [src/traverse/session.ts:598](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L598)

##### Returns

`string`

***

### requiresHumanApproval

#### Get Signature

> **get** **requiresHumanApproval**(): `boolean`

Defined in: [src/traverse/session.ts:619](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L619)

Whether this session ENFORCES human approval on high-effect agent fires
(SessionOptions.requireHumanApproval). Read by the serving layer so the
instruction text it hands a model says what is actually true of this session
— a tool description promising a gate that is off would be the same class of
lie this option exists to remove.

##### Returns

`boolean`

***

### stateVersion

#### Get Signature

> **get** **stateVersion**(): `number`

Defined in: [src/traverse/session.ts:661](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L661)

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

Defined in: [src/traverse/session.ts:665](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L665)

##### Returns

`number`

***

### version

#### Get Signature

> **get** **version**(): `number`

Defined in: [src/traverse/session.ts:608](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L608)

The one CAS/sinceVersion cursor: total order over ALL world motion.

##### Returns

`number`

## Methods

### alwaysApprove()

> **alwaysApprove**(`affordanceId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:3511](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3511)

RECORD A DURABLE ALWAYS ALLOW — a scoped standing policy, not an approval of
one action. Every fire it authorizes lands its own `'used'` row, so the
journal shows how many times the standing yes was exercised. That visible
count is the auditable price of a durable grant, and it is not optional.

SCOPED TO THE ACTION (plus an optional instance) and deliberately NOT to the
input — a grant that required identical inputs would be indistinguishable
from a single ALLOW and therefore useless. Tell the human the truth in those
words: "always allow Add to cart — any item, for the next hour." A reader who
assumes ALWAYS ALLOW inherits ALLOW's input binding has been misled by us.

A durable grant with no off switch is a permanent hole, so
[Session.revokeAlwaysApprove](/api/index/classes/Session#revokealwaysapprove) ships with it rather than after it.

#### Parameters

##### affordanceId

`string`

##### opts

###### by

`string`

###### expiresInMs?

`number`

###### instance?

`string`

###### note?

`string`

#### Returns

[`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

***

### approveAsk()

> **approveAsk**(`askId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:3451](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3451)

RECORD THE HUMAN'S ALLOW — wire your Approve button to this.

Writes an `'approved'` row with `principal: 'user'` BEFORE any fire, and the
fire that spends it must present its `askId`. That ordering is the whole
change: the row named 'approved' used to be minted by the very fire it
claimed to authorize, stamped with that fire's own principal.

SINGLE-USE, on purpose: one yes authorizes one action. A second fire under the
same askId refuses APPROVAL_SPENT, and the spend lands its own `'used'` row —
so an auditor can count approvals against executions.

NO `principal` PARAMETER, and that is the unforgeable shape rather than an
omission: this door stamps `'user'` unconditionally, so there is no argument
to lie with. Its twin [Session.declineAsk](/api/index/classes/Session#declineask) has the same shape for the
same reason — a fabricated NO is a forgery too. It authorizes nothing, but it
puts a human decision in the auditable journal and takes the question off the
person's screen, and neither of those may be reachable by asking politely.
([Session.declineConfirm](/api/index/classes/Session#declineconfirm) does take a `principal`, and under
enforcement it therefore closes nothing at all.)

`by` is REQUIRED: an approval whose decider is unknown is exactly the
claim-as-fact this closes. It is a string YOUR host supplies — the library
proves a human-principal row exists, never that a particular person
authenticated.

#### Parameters

##### askId

`string`

##### opts

###### by

`string`

###### note?

`string`

#### Returns

[`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

***

### asks()

> **asks**(): [`AskStatus`](/api/index/interfaces/AskStatus)[]

Defined in: [src/traverse/session.ts:3693](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3693)

THE ASK BOOK — every high-effect ask this session is holding, and what
became of each (copies, oldest first).

The read that answers "is anything waiting on a person?". A paused ask is
not a transition and never joins [Session.pending](/api/index/classes/Session#pending) or
[Session.awaitingSettlement](/api/index/classes/Session#awaitingsettlement), so before this door a caller asking
about a paused action was answered by the two lists that structurally could
not contain it — and an empty list reads as *nothing is happening*, which
is the confident emptiness this library keeps closing.

NOT named `openAsks`: under [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval)
answered cards STAY in the book (an approval must be spendable once, a
decline refusable for the session's life), so a name promising only open
ones would be wrong on its own rows. Read `answer` for the fate — absent
means the person has not decided.

A LIVE READ, and callers must keep it that way: ask it at answer time, never
once at construction. The whole value of the arm it feeds is that the fate
it reports is the fate right now.

Structural facts only ([AskStatus](/api/index/interfaces/AskStatus)) — the receipts stay on the ask.
[Session.confirms](/api/index/classes/Session#confirms) remains the auditable journal; this is the
derivation the library owes its own serving layer, because deriving these
fates from journal rows means re-implementing the gate's law beside the gate.

#### Returns

[`AskStatus`](/api/index/interfaces/AskStatus)[]

***

### available()

> **available**(): [`AvailableSlice`](/api/index/interfaces/AvailableSlice)

Defined in: [src/traverse/session.ts:967](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L967)

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

***

### availableSkills()

> **availableSkills**(): `object`

Defined in: [src/traverse/session.ts:1301](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1301)

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

### awaitingSettlement()

> **awaitingSettlement**(): `string`[]

Defined in: [src/traverse/session.ts:2195](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2195)

The fires whose settlement question is still OPEN — every id
[Session.settlementOf](/api/index/classes/Session#settlementof) has an answer coming for, in fire order.

NOT the same list as [Session.pending](/api/index/classes/Session#pending), and the difference is the
reason this door exists. `pending()` names fires awaiting the app's STATE
report, which a fire declaring no writes NEVER joins — it still has a
handler running and a settlement coming. So every pending fire is awaiting
a settlement, and not every fire awaiting a settlement is pending. Asked
"what is still live?", `pending()` alone answers "nothing" about an action
that is at that moment running.

Ids, not rows: a runtimeStageId already carries the affordance that made it
(`catalog.go-checkout#0`), so nothing has to be looked up — or guessed —
to say which action is still out there.

#### Returns

`string`[]

***

### beginWork()

> **beginWork**(`label?`, `opts?`): [`WorkHandle`](/api/index/interfaces/WorkHandle)

Defined in: [src/traverse/session.ts:2504](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2504)

SAY THE APP IS WORKING ON SOMETHING, and get back the handle that closes it.

The imperative sibling of [AvailableEdge.busy](/api/index/interfaces/AvailableEdge#busy). `busy` is a fact about
a CONTROL — the spinner in the button, standing until the app changes it.
This is a fact about a PIECE OF WORK: it opens where the work starts, closes
where the work ends, and while it is open the readers can say so about the
FIRE it belongs to. A fire can come to rest while the app is still working
(the delta is reported, the upload continues), and before this ledger every
list answered "nothing is live" about exactly that.

```ts
const work = session.beginWork('Uploading the photo');
try {
  await upload(file);
} finally {
  work.done();
}
```

WHERE IT LANDS IS DECIDED AT CALL TIME, and never revisited — three homes:

1. `{ transitionId }` — the exact fire, and EXPLICIT WINS, the same order
   [Session.updateState](/api/index/classes/Session#updatestate) keeps. An id this session does not know as a
   fire binds to nothing (see below).
2. Inside a handler's synchronous portion — the fire whose handler is
   running, read from the same call window `updateState()` reads. No id to
   pass, no correlation to get wrong.
3. Neither — an UNBOUND row at principal `'system'`, plus one dev warning.
   Work never runs silently: the row is still opened and still served, it
   simply does not claim a fire nothing named. The warning exists so an app
   cannot believe unbound work is bound.

TWO CAVEATS ABOUT HOME 2, and both are the window's shape rather than a bug:

- **Call it before the first `await`.** The window is open for the handler's
  SYNCHRONOUS portion only. Past an await the handler is no longer "the call
  we are inside of" — another fire may be mid-flight — so a later call is
  unbound rather than bound to a record that is merely the most recent. (A
  handler that must open work late passes `{ transitionId }`.)
- **App code around `fire()` is outside the window.** Calling `fire()` and
  then `beginWork()` on the next line is home 3: the handler is deferred, so
  nothing is running yet. Bind it with the `transitionId` the fire result
  just handed you.

NOTHING ABOUT THIS IS A GATE OR A CLOCK. Opening work refuses no fire,
changes no served row, and does not bump the session version (a plan made
before it is not stale — nothing an agent can act on changed). No timer
expires a row, and a row that outlives everyone's patience keeps saying the
one true thing: the app said it was working and has not said otherwise.

#### Parameters

##### label?

`string`

##### opts?

[`BeginWorkOptions`](/api/index/interfaces/BeginWorkOptions)

#### Returns

[`WorkHandle`](/api/index/interfaces/WorkHandle)

***

### commitLog()

> **commitLog**(): `CommitBundle`[]

Defined in: [src/traverse/session.ts:2790](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2790)

The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition.

#### Returns

`CommitBundle`[]

***

### commitSkill()

> **commitSkill**(`skillId`, `opts?`): [`CommitSkillResult`](/api/index/type-aliases/CommitSkillResult)

Defined in: [src/traverse/session.ts:1333](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1333)

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

Defined in: [src/traverse/session.ts:3212](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3212)

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

###### input?

`unknown`

What the confirmed fire will SEND — recorded on the receipts as
`willUse.input`, so the human approves an object and not just a verb.
Optional: an ask told nothing shows nothing, and under enforcement a fire
carrying an input the card never showed is refused.

DETACHED THE MOMENT IT ARRIVES (bound-input.ts): keep your reference and
change it after the yes, and the fire is refused APPROVAL_MISMATCH rather
than compared against itself.

###### instance?

`string`

Which row/instance the card is about (an order id).

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

Defined in: [src/traverse/session.ts:3658](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3658)

The confirm journal (DEEP copies): every high-effect ask and how it was
answered — an auditable ask → decision → fire chain (join `transitionId`
back to the commit log, `askId` across the three rows). Export it to your
audit sink like gaps(); it grows for the session's life.

#### Returns

[`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

***

### contextBrief()

> **contextBrief**(`opts?`): [`ContextBrief`](/api/index/interfaces/ContextBrief)

Defined in: [src/traverse/session.ts:4022](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4022)

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

### declareHolds()

> **declareHolds**(`affordanceId`, `read`): () => `void`

Defined in: [src/traverse/session.ts:1070](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1070)

Hand over a reader for what one control HOLDS — the per-element
DECLARATION door, and the one the sensor forwards `ControlDeclaration.value`
into. Returns the release, token-identity like every other declaration pair
in this library: it drops the reader it was handed and nothing else, so
attach → attach → detach nets to the surviving declaration rather than to
silence.

PRECEDENCE, stated once: this door OUTRANKS the registration-time `holds:`
reader for the same action. A declaration is the more specific statement —
it is about the element on screen, not about the tool — which is the same
rank order the sensor's own two evidence levels keep.

An id no affordance answers to is filed and simply never served. Not a
refusal, and deliberately not a warning: a control can be handed over before
the tool that declares it is mounted, and shouting at a mount race would
teach nothing true.

A READING, NOT A BINDING — see [AvailableEdge.holds](/api/index/interfaces/AvailableEdge#holds). Nothing here
changes what a fire sends; the fire reads its own payload at act time. And
the reader must BE a read: it runs once per served row, on a path every
refused fire also walks.

#### Parameters

##### affordanceId

`string`

##### read

() => `unknown`

#### Returns

() => `void`

***

### declineAsk()

> **declineAsk**(`askId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:3480](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3480)

RECORD THE HUMAN'S NO for one ask — the unambiguous twin of
[Session.approveAsk](/api/index/classes/Session#approveask), keyed by askId because several asks for the same
action can be open at once under enforcement.

Terminal and permanent: a fire naming this askId refuses APPROVAL_DECLINED for
the session's life, and `approveAsk` on it returns ASK_ALREADY_ANSWERED.
Nothing here ever deletes a row — a re-ask after a no mints a NEW askId, so
an agent grinding a person toward yes leaves a countable trail.

#### Parameters

##### askId

`string`

##### opts

###### by

`string`

###### note?

`string`

#### Returns

[`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

***

### declineConfirm()

> **declineConfirm**(`affordanceId`, `opts?`): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/traverse/session.ts:3349](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3349)

Close a high-effect ask as DECLINED — the human said no. Records the
decision so the chain closes honestly instead of the ask dangling forever
(the v1 reality: a declined action was simply never re-called, an invisible
event). Closes the open ask for `affordanceId` when one exists; with none
open (a pre-emptive decline) it mints a standalone decline row — a refusal
is worth recording either way. Returns the row (a deep copy).

UNDER `requireHumanApproval` IT CLOSES NOTHING, whatever `principal` says.
The row is marked `relayed`, the card stays open, and the person still gets
asked. `principal` is an argument, and an argument is a claim: a caller that
could close a card by saying `'user'` could bury the question before the
human ever saw it. A human's no goes through
[Session.declineAsk](/api/index/classes/Session#declineask)(askId, { by }) — keyed to the card they answered,
with no principal argument to lie with.

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

Defined in: [src/traverse/session.ts:1280](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1280)

Why an affordance is (or is not) available right now — per-condition evidence.

#### Parameters

##### affordanceId

`string`

#### Returns

[`Explanation`](/api/index/interfaces/Explanation)

***

### fire()

> **fire**(`affordanceId`, `opts?`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: [src/traverse/session.ts:1524](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1524)

Returned transition records are LIVE views — settlement updates them in
place. `effectStatus` is the opposite: a reading taken at return time, and
because the handler is always deferred it can never say 'performed' here.
`whenSettled` carries the later truth, once, as a snapshot.

`opts` is optional at RUNTIME and required in TypeScript: a JS caller's
`fire('page.tool')` is answered instead of crashing on `opts.source`,
while a typed caller is still made to name the principal. An omitted
source reads as 'agent' — never 'user', which would file a machine's
action in the ledger under a human and disarm the never-trap gate below.

THE CONFIRM BOUNDARY, stated here because this is the signature an
integrator reads. There is no `confirm` field on [FireOptions](/api/index/interfaces/FireOptions) and
there never will be: a boolean the caller controls is not evidence, so the
door has no slot for one. `confirm` is a MODE B TOOL ARGUMENT
(serve/modes.ts), which means a fire arriving here directly is not gated by
`confirm` at any layer — the app's own code owns its session, and 'user' /
'system' / `invoke: false` are the app reporting motion that really
happened.

What [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) adds is keyed on the
PRINCIPAL rather than the door, so an AGENT-sourced high-effect fire is held
wherever it comes from — the Mode B port, the MCP server, the testing
harness, or this method called directly — and the proof it must present is
[FireOptions.askId](/api/index/interfaces/FireOptions#askid), a pointer to a row a human-side door recorded.
See THE APPROVAL GATE below.

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

Defined in: [src/traverse/session.ts:1423](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1423)

Frame history: every closed frame (completed / cancelled / demoted), oldest first.

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame)[]

***

### gaps()

> **gaps**(): [`GapRecord`](/api/index/interfaces/GapRecord)[]

Defined in: [src/traverse/session.ts:2856](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2856)

The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline.

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)[]

***

### groundTruth()

> **groundTruth**(`opts?`): [`GroundTruth`](/api/index/interfaces/GroundTruth)

Defined in: [src/traverse/session.ts:4094](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4094)

What this session ACTUALLY did, in words a model is told outrank the
conversation: where it is, every attempt and how each came to rest, what a
human is still deciding, and what the app has not answered yet.

The sibling of [Session.contextBrief](/api/index/classes/Session#contextbrief), and separate from it on
purpose. The brief serves position + options + narrative, and the field
exposed a structural hole in that: a REFUSED fire is a gap-ledger row, not
a transition, so failed attempts never appeared in it. With the failures
invisible and nothing else grounding it, a model narrated an entire flow
— "name set, recipe selected" — having called zero tools. Its own prose had
become its context. This block merges BOTH ledgers so a refusal is as
visible as a success, and states the anti-narration sentence outright when
nothing has happened at all.

Facts only. Options are whats_here's job, values and payloads belong to the
data channel, and nothing here interprets: one line per occurrence.

#### Parameters

##### opts?

[`GroundTruthOptions`](/api/index/interfaces/GroundTruthOptions)

#### Returns

[`GroundTruth`](/api/index/interfaces/GroundTruth)

***

### leaveSkill()

> **leaveSkill**(`opts?`): [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/traverse/session.ts:1399](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1399)

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

Defined in: [src/traverse/session.ts:699](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L699)

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

Defined in: [src/traverse/session.ts:3663](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3663)

Live export hook: fires once per new confirm row. Sugar for `on('confirm', …)`.

#### Parameters

##### listener

(`record`) => `void`

#### Returns

() => `void`

***

### onGap()

> **onGap**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:2861](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2861)

Live export hook: fires once per new gap row. Sugar for `on('gap', …)`.

#### Parameters

##### listener

(`gap`) => `void`

#### Returns

() => `void`

***

### openAskFor()

> **openAskFor**(`affordanceId`, `opts?`): `string` \| `undefined`

Defined in: [src/traverse/session.ts:3315](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3315)

The id of the ask this session is holding for exactly this action and input —
the pointer a caller passes as [FireOptions.askId](/api/index/interfaces/FireOptions#askid), or hands to
[Session.approveAsk](/api/index/classes/Session#approveask).

It exists so the serving layer never has to re-derive the library's own
identity rules (which values compare, which decline): normalization happens
once, here, and the port and the gate can therefore never disagree about
which card a fire belongs to. Under enforcement it matches on the input and
instance; in the default mode it answers with the open ask for the action. A
pure read — nothing is minted, nothing is recorded.

PREFERENCE ORDER, and it exists so a refusal can still teach: a usable
approval first, then a card the human has not answered, then an ALREADY
ANSWERED one. Presenting a spent or declined pointer looks odd until you see
what it buys — the gate answers APPROVAL_SPENT or APPROVAL_DECLINED instead
of the blank "nobody approved this", so the caller learns that the yes was
used, or that the person said no, rather than being sent to ask again.

#### Parameters

##### affordanceId

`string`

##### opts?

###### input?

`unknown`

###### instance?

`string`

#### Returns

`string` \| `undefined`

***

### openWork()

> **openWork**(): [`WorkRow`](/api/index/interfaces/WorkRow)[]

Defined in: [src/traverse/session.ts:2536](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2536)

Work the app has open RIGHT NOW, oldest first — the third "what is still
live?" door, beside [Session.pending](/api/index/classes/Session#pending) (fires awaiting the app's state
report) and [Session.awaitingSettlement](/api/index/classes/Session#awaitingsettlement) (fires that can still be
asked about), and the cousin of [Session.asks](/api/index/classes/Session#asks) (cards awaiting a
person).

OPEN ONLY, which is what the name promises: a closed row leaves this list
the moment `done()` runs and never comes back. Copies, so a caller holding
one cannot edit the ledger.

Every row here is the APP'S CLAIM about itself. Nothing in this library
checks that work is running, measures it, or ends it.

#### Returns

[`WorkRow`](/api/index/interfaces/WorkRow)[]

***

### pending()

> **pending**(): [`PendingInfo`](/api/index/interfaces/PendingInfo)[]

Defined in: [src/traverse/session.ts:2441](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2441)

Fired transitions still awaiting their state report (oldest first).

#### Returns

[`PendingInfo`](/api/index/interfaces/PendingInfo)[]

***

### producedFor()

> **producedFor**(`transitionId`): `unknown`

Defined in: [src/traverse/session.ts:2821](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2821)

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

Defined in: [src/traverse/session.ts:2811](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2811)

runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup).

#### Returns

`ReadonlyMap`\<`string`, `string`[]\>

***

### registerTools()

> **registerTools**(`opts`): [`RegisteredTools`](/api/index/interfaces/RegisteredTools)

Defined in: [src/traverse/session.ts:1246](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1246)

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

Defined in: [src/traverse/session.ts:2695](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2695)

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

Defined in: [src/traverse/session.ts:2836](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2836)

Report an ask that no available action or skill could serve (typically
called by the agent's report_gap tool before it apologizes). The row is
token-lean by design: the ask plus NAME lists, never descriptions.

#### Parameters

##### opts

[`ReportGapOptions`](/api/index/interfaces/ReportGapOptions)

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)

***

### requiresHumanApprovalFrom()

> **requiresHumanApprovalFrom**(`principal`): `boolean`

Defined in: [src/traverse/session.ts:638](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L638)

Whether a high-effect fire STAMPED WITH THIS PRINCIPAL has to present a
recorded human approval — the question a serving layer must actually ask
before it promises a model that this app enforces one.

The gate keys on the principal, not the door (fire(), THE APPROVAL GATE): the
app-self-report tier — `'user'`, `'system'`, and the record-only sensor —
passes, because that motion really happened. So `requiresHumanApproval` alone
is the wrong question for a PORT: a port that stamps `'user'` serves a model
whose fires this session never gates, and a tool description promising the
gate would be a lie told in the library's own voice.

Here rather than re-derived at the port, so the rule lives in one place: the
thing that answers "is this fire gated?" is the thing that gates it.

#### Parameters

##### principal

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

`boolean`

***

### revokeAlwaysApprove()

> **revokeAlwaysApprove**(`affordanceId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:3549](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3549)

WITHDRAW a standing grant. It stops authorizing immediately, and each grant
withdrawn lands its own `'revoked'` row carrying that grant's id.

Omitting `instance` revokes EVERY grant for the action, instance-scoped ones
included. Revocation over-reaches on purpose: the failure mode of a too-broad
revoke is one extra trip past the human, and the failure mode of a too-narrow
one is a hole the person believed they had closed.

#### Parameters

##### affordanceId

`string`

##### opts

###### by

`string`

###### instance?

`string`

###### note?

`string`

#### Returns

[`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

***

### settlementIfKnown()

> **settlementIfKnown**(`transitionId`): [`FireSettlement`](/api/index/interfaces/FireSettlement) \| `undefined`

Defined in: [src/traverse/session.ts:2174](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2174)

The same answer WITHOUT waiting: the settlement if this fire has already
come to rest, `undefined` while its question is still open. Refuses an
unknown id exactly as [Session.settlementOf](/api/index/classes/Session#settlementof) does — one law, two
doors.

This is the door a SYNCHRONOUS caller needs (Mode B's `did_it_work` tool
answers a model inside one tool call and must never block it). `undefined`
means "no settlement yet", never a guessed outcome — the caller reports
still-pending, which is the truth at that instant.

#### Parameters

##### transitionId

`string`

#### Returns

[`FireSettlement`](/api/index/interfaces/FireSettlement) \| `undefined`

***

### settlementOf()

> **settlementOf**(`transitionId`): `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Defined in: [src/traverse/session.ts:2153](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2153)

How a fire came to rest — asked at ANY time by anyone holding its
transitionId. `fire()` hands ITS caller `whenSettled`; this is the same
answer for everyone else, and it is the hole the field report named: a
promise cannot cross a wire, so a remote agent (or the relay in front of
it) held the id and had no way to learn the truth.

- Still open → that fire's own latch promise. Same law as `whenSettled`:
  one answer, first settlement wins, never rejects.
- Already at rest → resolves immediately with a detached copy.
- NEVER REPORTED (a fire whose app report never arrives) → the promise
  honestly stays open, exactly as `whenSettled` does. There is no timeout
  arm on purpose: [FireSettlement](/api/index/interfaces/FireSettlement) excludes 'pending' by
  construction, so a timed-out answer could only be a guessed
  'unobservable'. When you need an answer that cannot wait, ask the
  non-blocking doors — [Session.pending](/api/index/classes/Session#pending), [Session.settlementIfKnown](/api/index/classes/Session#settlementifknown), or Mode B's `did_it_work` tool.
- Unknown id, or a stimulus/sync/structure-swap row → THROWS
  synchronously. A promise that could never resolve is precisely the
  failure this method exists to prevent: a mistyped id that waits under
  someone's ceiling and then reports a fabricated outcome.

#### Parameters

##### transitionId

`string`

#### Returns

`Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

***

### skillFrame()

> **skillFrame**(): [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/traverse/session.ts:1418](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1418)

The open skill frame (snapshot), or null.

#### Returns

[`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

***

### skillPlan()

> **skillPlan**(`skillId`): [`SkillPlan`](/api/index/interfaces/SkillPlan)

Defined in: [src/traverse/session.ts:1433](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1433)

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

Defined in: [src/traverse/session.ts:959](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L959)

Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references).

#### Returns

`Record`\<`string`, `unknown`\>

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/traverse/session.ts:2732](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2732)

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

Defined in: [src/traverse/session.ts:4009](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4009)

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

Defined in: [src/traverse/session.ts:2800](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2800)

The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
bundles by TransitionRecord.id; pending and rejected/rolled-back rows
exist only here (their effects never touched state). Rows are snapshots —
live records are the ones returned by fire()/updateState()/reject().

#### Returns

readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

***

### trySkillPlan()

> **trySkillPlan**(`skillId`): [`TrySkillPlanResult`](/api/index/type-aliases/TrySkillPlanResult)

Defined in: [src/traverse/session.ts:1485](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1485)

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

Defined in: [src/traverse/session.ts:1266](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1266)

Remove every live binding currently owned by `group` (component unmount).

#### Parameters

##### group

`string`

#### Returns

`string`[]

***

### updateState()

> **updateState**(`delta`, `opts?`): [`UpdateResult`](/api/index/type-aliases/UpdateResult)

Defined in: [src/traverse/session.ts:2271](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2271)

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

### warn()

> **warn**(`message`): `void`

Defined in: [src/traverse/session.ts:688](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L688)

The session's dev-warning sink (SessionOptions.onWarn, console.warn by
default) — the seam subclass layers already warn through.

PUBLIC because the serving layer is a separate module by design: it consumes
only this surface, and a warning it could not route through the host's own
sink is a warning a host that captures `onWarn` would never see. It says
nothing about state, so nothing can be forged with it.

#### Parameters

##### message

`string`

#### Returns

`void`

***

### whenPageChanges()

> **whenPageChanges**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:773](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L773)

Run something every time the app REPORTS that it is on a different page —
after the hop is recorded, the version has moved and observers have seen it.

FIRES ON [Session.sync](/api/index/classes/Session#sync) ONLY, and only when the reported node differs
from where the cursor was. Not on a claimed navigation: that moves the cursor
on the app's word, before the app's own handler has run, so anything read
there would describe the page the app has not left yet. Not on a structure
change either — the cursor did not move, and that flush is usually a listener
here seeing its own mount come back around.

The door a LIVE SOURCE needs and `on('transition')` cannot be: the transition
event fires BEFORE the version bump, and its listeners are documented passive
(they never change what the session does), while the whole point here is a
reaction that DOES — re-reading an action store and mounting or releasing
bindings. So this is its own surface, and the two contracts stay true.

ONE SYNC IS THE LIBRARY'S OWN: when a fire that moved the cursor on a claim
is rolled back by its handler failing, the session walks the cursor home with
a `sync(fromNode, { principal: 'system' })`. That is a position report like
any other — the cursor really is back — so this fires for it too, and a live
source re-reads the page it is actually on.

Listeners run in registration order and are ISOLATED (a throw is caught and
warned, never aborting the hop). A listener that moves the cursor again does
not recurse into this broadcast; the move is remembered and the pass runs
again, so no listener is left holding a page the session has left. Returns
the unsubscribe.

#### Parameters

##### listener

() => `void`

#### Returns

() => `void`

***

### why()

> **why**(`key`): `string`

Defined in: [src/traverse/session.ts:2805](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2805)

"Why does this state key hold its value?" — footprint backward slice, formatted.

#### Parameters

##### key

`string`

#### Returns

`string`
