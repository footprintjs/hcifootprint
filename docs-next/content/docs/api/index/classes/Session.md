---
title: Session
---

# Class: Session

Defined in: [src/traverse/session.ts:430](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L430)

## Extended by

- [`InteractionSession`](/api/index/classes/InteractionSession)

## Constructors

### Constructor

> **new Session**(`spec`, `opts`): `Session`

Defined in: [src/traverse/session.ts:772](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L772)

#### Parameters

##### spec

[`NavigationGraphSpec`](/api/index/interfaces/NavigationGraphSpec)

##### opts

[`SessionOptions`](/api/index/interfaces/SessionOptions)

#### Returns

`Session`

## Accessors

### graphId

#### Get Signature

> **get** **graphId**(): `string`

Defined in: [src/traverse/session.ts:841](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L841)

The compiled graph's id (namespaces MCP tool names).

##### Returns

`string`

***

### node

#### Get Signature

> **get** **node**(): `string`

Defined in: [src/traverse/session.ts:836](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L836)

##### Returns

`string`

***

### requiresHumanApproval

#### Get Signature

> **get** **requiresHumanApproval**(): `boolean`

Defined in: [src/traverse/session.ts:857](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L857)

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

Defined in: [src/traverse/session.ts:899](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L899)

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

Defined in: [src/traverse/session.ts:903](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L903)

##### Returns

`number`

***

### version

#### Get Signature

> **get** **version**(): `number`

Defined in: [src/traverse/session.ts:846](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L846)

The one CAS/sinceVersion cursor: total order over ALL world motion.

##### Returns

`number`

## Methods

### acknowledgeStale()

> **acknowledgeStale**(`actionId`, `keys?`): `object`

Defined in: [src/traverse/session.ts:5609](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5609)

I HAVE SEEN IT — the acknowledgement door, and the only one that takes a
caller's word for anything.

WHAT IT RECORDS AND WHAT IT DOES NOT CLAIM. It records that this caller
said, of this control, that it has dealt with these keys having moved. It
does not claim the caller read the value, understood the consequence, or
made a good decision — none of which this session can see. It stops the
library repeating a fact to somebody who has answered it, which is the
whole of the promise.

WHY THERE HAS TO BE A DOOR AT ALL. The alternative is to infer
acknowledgement from a look, and a look is exactly what the caller was
already doing on every turn the stamp was silently disarming itself. This
library never serves a value, so it cannot know a value was read; the only
honest acknowledgement is one somebody performs.

With no `keys`, everything outstanding for that control is answered. Named
keys clear only themselves, and a key nobody is carrying clears nothing —
`cleared` is what was actually being carried, never an echo of the request.

#### Parameters

##### actionId

`string`

##### keys?

readonly `string`[]

#### Returns

`object`

##### cleared

> **cleared**: `string`[]

***

### alwaysApprove()

> **alwaysApprove**(`affordanceId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:4923](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4923)

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

Defined in: [src/traverse/session.ts:4771](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4771)

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

Defined in: [src/traverse/session.ts:5114](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5114)

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

Defined in: [src/traverse/session.ts:1247](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1247)

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

***

### availableJourneys()

> **availableJourneys**(): `object`

Defined in: [src/traverse/session.ts:1730](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1730)

Journey-level disclosure for the planning LLM (descriptions + feasibility, no tool detail).

#### Returns

`object`

##### journeys

> **journeys**: [`AvailableJourney`](/api/index/interfaces/AvailableJourney)[]

##### node

> **node**: `string`

##### version

> **version**: `number`

***

### awaitingSettlement()

> **awaitingSettlement**(): `string`[]

Defined in: [src/traverse/session.ts:3358](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3358)

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

Defined in: [src/traverse/session.ts:3801](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3801)

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

### carriedStale()

> **carriedStale**(`actionId`): `string`[]

Defined in: [src/traverse/session.ts:5584](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5584)

WHAT THIS SESSION IS STILL CARRYING FOR ONE CONTROL — the key names it has
served as stale and nobody has acknowledged, oldest first.

A pure question: asking never adds, never clears, and never advances any
clock. The ledger is inspectable on purpose — a caller that is being told
something on every turn is owed a way to ask why, without that asking being
mistaken for an answer.

#### Parameters

##### actionId

`string`

#### Returns

`string`[]

***

### carryStale()

> **carryStale**(`actionId`, `keys`): `void`

Defined in: [src/traverse/session.ts:5568](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5568)

CARRY THESE UNTIL SOMEBODY ACKNOWLEDGES THEM — the record that a staleness
was SERVED on this control's row.

Called by the layer that actually hands the row over, with exactly the keys
that went onto it. Saying it is what creates the obligation to keep saying
it: a stamp computed and not served is carried by nobody, because nobody
can be asked to acknowledge a fact they were never told.

Idempotent, and order is FIRST-SERVED: telling a caller the same thing
twice does not make it two facts, and a key that has been outstanding for
four turns stays where it was rather than jumping to the end of the list
whenever it is re-served.

An app may call it too — a surface that showed the fact in its own words
has told the caller as much as this library's row would have.

#### Parameters

##### actionId

`string`

##### keys

readonly `string`[]

#### Returns

`void`

***

### commitJourney()

> **commitJourney**(`journeyId`, `opts?`): [`CommitJourneyResult`](/api/index/type-aliases/CommitJourneyResult)

Defined in: [src/traverse/session.ts:1762](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1762)

Commit to a journey: opens a frame so toMCPTools()/contextBrief() serve ONLY
that journey's currently-fireable steps plus escape tools — the token win
(journeys for planning, tools on commit). One frame at a time in v0.

Never-trap invariant: an agent commit whose entry step cannot materialise
right now is refused ENTRY_NOT_MATERIALIZED instead of opening a frame
that could never act (see the gate below).

#### Parameters

##### journeyId

`string`

##### opts?

###### expectedVersion?

`number`

###### source?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

[`CommitJourneyResult`](/api/index/type-aliases/CommitJourneyResult)

***

### commitLog()

> **commitLog**(): [`CommitBundle`](/api/index/interfaces/CommitBundle)[]

Defined in: [src/traverse/session.ts:4095](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4095)

The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition.

#### Returns

[`CommitBundle`](/api/index/interfaces/CommitBundle)[]

***

### confirmAsk()

> **confirmAsk**(`affordanceId`, `opts?`): `object`

Defined in: [src/traverse/session.ts:4524](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4524)

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

Defined in: [src/traverse/session.ts:5079](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5079)

The confirm journal (DEEP copies): every high-effect ask and how it was
answered — an auditable ask → decision → fire chain (join `transitionId`
back to the commit log, `askId` across the three rows). Export it to your
audit sink like gaps(); it grows for the session's life.

#### Returns

[`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

***

### contextBrief()

> **contextBrief**(`opts?`): [`ContextBrief`](/api/index/interfaces/ContextBrief)

Defined in: [src/traverse/session.ts:5629](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5629)

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

### decisions()

> **decisions**(): [`DecisionStatus`](/api/index/interfaces/DecisionStatus)[]

Defined in: [src/traverse/session.ts:3686](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3686)

EVERY DECISION IN THIS GRAPH THAT BELONGS TO A PERSON, and whether it has
been made — read at the moment you ask.

The sibling of [Session.asks](/api/index/classes/Session#asks): that one answers "is anything waiting
on a person?", this one answers "is anything a person's to DECIDE?". Two
different questions with two different next moves — wait for a card to be
answered, or present options and stop — so they are two lists and they share
no vocabulary. Nothing here mints an ask, an askId, a card or a receipt, and
nothing here ever will.

GRAPH-WIDE, like the ask book. A decision on another page still holds a
journey, so every declaring control has a row wherever it lives — the row is
about a declaration, not about where the cursor happens to be.

A LIVE READ. `made` is evaluated fresh against projected state on every
call, and `madeBy` is served only beside `made: true` and only from the
decisions book. Nothing is cached, nothing is timed, and nothing here fires:
`made: true` is a state reading, not a command.

No per-instance rows: the declaration is action-level and `doneWhen` reads
flat projected-state keys. An app modelling per-row decisions models them in
its own keys — a stated limit, not a roadmap promise.

#### Returns

[`DecisionStatus`](/api/index/interfaces/DecisionStatus)[]

***

### declareHolds()

> **declareHolds**(`affordanceId`, `read`): () => `void`

Defined in: [src/traverse/session.ts:1447](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1447)

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

Defined in: [src/traverse/session.ts:4800](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4800)

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

Defined in: [src/traverse/session.ts:4669](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4669)

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

Defined in: [src/traverse/session.ts:1709](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1709)

Why an affordance is (or is not) available right now — per-condition evidence.

#### Parameters

##### affordanceId

`string`

#### Returns

[`Explanation`](/api/index/interfaces/Explanation)

***

### fire()

> **fire**(`affordanceId`, `opts?`): [`FireResult`](/api/index/type-aliases/FireResult)

Defined in: [src/traverse/session.ts:2217](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2217)

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

> **frames**(): [`JourneyFrame`](/api/index/interfaces/JourneyFrame)[]

Defined in: [src/traverse/session.ts:1852](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1852)

Frame history: every closed frame (completed / cancelled / demoted), oldest first.

#### Returns

[`JourneyFrame`](/api/index/interfaces/JourneyFrame)[]

***

### gaps()

> **gaps**(): [`GapRecord`](/api/index/interfaces/GapRecord)[]

Defined in: [src/traverse/session.ts:4161](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4161)

The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline.

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)[]

***

### groundTruth()

> **groundTruth**(`opts?`): [`GroundTruth`](/api/index/interfaces/GroundTruth)

Defined in: [src/traverse/session.ts:5702](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5702)

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

### howToReach()

> **howToReach**(`pageId`): [`RouteStep`](/api/index/interfaces/RouteStep)[] \| `null`

Defined in: [src/traverse/session.ts:1876](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1876)

HOW DO I GET THERE — the fewest declared hops from where the cursor is to
`pageId`, each naming the action whose claim makes the hop.

`[]` when you are already there; `null` when nobody declares a route — the
honest absence, not "it cannot be reached", because an app may navigate in
ways it never declared.

DERIVED from `effect.navigatesTo`, which exists for other reasons. Pages
declare no edges to each other; an action's claim IS the edge, so there is
nothing to author and nothing that can drift.

A ROUTE IS NOT A PLAN, and not a permission. It reports declared hops in
fewest-hops order — arithmetic, not preference; a preferred order toward a
goal is a journey, which is declared. And it does not promise the hops are
open: a guard may be closed or a control greyed. Availability is answered
on the row of the action you are about to reach for, and is deliberately
NOT guessed here for pages you have not arrived at, because the state at a
page this session has never seen is a thing it cannot honestly speak to.

#### Parameters

##### pageId

`string`

#### Returns

[`RouteStep`](/api/index/interfaces/RouteStep)[] \| `null`

***

### journeyFrame()

> **journeyFrame**(): [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/traverse/session.ts:1847](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1847)

The open journey frame (snapshot), or null.

#### Returns

[`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

***

### journeyPlan()

> **journeyPlan**(`journeyId`): [`JourneyPlan`](/api/index/interfaces/JourneyPlan)

Defined in: [src/traverse/session.ts:1957](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1957)

The DERIVED intra-journey dependency DAG with live status. Dependencies are
computed, never authored: step B depends on step A when A's declared
effect.writes overlap B's guard keys — the guard×effect atoms already
encode the ordering, so it cannot drift from the graph.

#### Parameters

##### journeyId

`string`

#### Returns

[`JourneyPlan`](/api/index/interfaces/JourneyPlan)

***

### journeyStanding()

> **journeyStanding**(`journeyId`): [`JourneyStanding`](/api/index/interfaces/JourneyStanding)

Defined in: [src/traverse/session.ts:2067](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2067)

WHERE ONE JOURNEY STANDS — one settled word for the whole chain, and the
facts behind it.

The question a reader actually has between turns is not "what may I fire
next" (that is the plan's, and `whats_here`'s) but "whose turn is it, and is
this thing moving". Answering it from the plan alone means re-implementing
library law outside the library — which rows close which card, what a
relayed decline does NOT close, when a refusal is a failure and when it is
nothing of the kind — and two surfaces that re-derive it can disagree about
one chain, which reads to a model as "the human already answered".

A PURE FOLD over the plan, the ask book, the decisions book, retained
settlements and frame history. No state of its own, no cache, no timer, and
it never fires: computed fresh on every call, so the word is true about NOW
rather than about the last time somebody asked. Two calls in a row change
nothing and agree with each other.

The walk, stated as the walk it is:

1. An OPEN frame for this journey governs. Otherwise a latest-closed
   `'completed'` frame answers `'done'`; a cancelled or demoted one
   contributes history and never a verdict — abandonment is not completion
   and not failure — so the live plan is walked instead.
2. Walk the steps in chain order. The FIRST step that is not done is the
   GOVERNING step, and its hold names the standing: an open card
   (`'awaiting-human'`), the human's own no (`'declined'`), a decision that
   belongs to a person (`'with-the-human'`), a last attempt that came to
   rest badly (`'failed'`), an evaluated failing guard (`'blocked'`), else
   `'in-progress'`.
3. Every step done → `'done'`. A journey nobody has started walks arm 2 like
   any other, and `'in-progress'` with `stepsDone: 0` is the honest reading
   of "open, and nothing holds it" — the counts say plainly that nothing has
   fired.

`'failed'` IS NEVER MINTED FROM A PAUSE. Not from needs-confirm, not from a
relayed decline, not from any approval refusal, not from a guard, disabled
or materialization refusal. A refusal is not an execution: nothing ran, so
nothing failed. `'failed'` requires a fire that actually came to rest badly,
and the evidence carries a POINTER to it — the receipt itself stays
`did_it_work`'s to serve, once.

Throws on an id this graph does not have, exactly as
[Session.journeyPlan](/api/index/classes/Session#journeyplan) does and through that method's own refusal —
serving layers resolve names first.

#### Parameters

##### journeyId

`string`

#### Returns

[`JourneyStanding`](/api/index/interfaces/JourneyStanding)

***

### keysChangedSince()

> **keysChangedSince**(`sinceVersion?`): `string`[]

Defined in: [src/traverse/session.ts:5541](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5541)

THE STATE KEYS THIS SESSION HAS COMMITTED SINCE `sinceVersion` — names, in
first-changed order, each named once.

The same fact `contextBrief` narrates per transition ("user push changed:
claim.total"), answered as data so a caller can JOIN it to something. The
serving layer does exactly one thing with it: intersect it with an edge's
declared [Effect.reads](/api/index/interfaces/Effect#reads) and stamp the overlap as `staleReads`. Before
that join existed a reader was handed a changed key and a list of controls
and left to connect them by eye.

`sinceVersion` omitted means the whole session. The version filter is the
transition's own `cursorVersion`, the same comparison the brief makes, so
the two can never disagree about what "since" means.

NAMES ONLY, and no claim beyond presence: a key here was written, which is
not a statement that its value is different from the one you saw, that any
control is now wrong, or that anything should be re-read.

#### Parameters

##### sinceVersion?

`number`

#### Returns

`string`[]

***

### leaveJourney()

> **leaveJourney**(`opts?`): [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/traverse/session.ts:1828](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1828)

Close the open frame. Default reason: 'completed' if every step was
committed while the frame was open, else 'cancelled'. Returns the closed
frame, or null when none was open.

#### Parameters

##### opts?

###### reason?

`"completed"` \| `"cancelled"`

#### Returns

[`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

***

### on()

> **on**\<`N`\>(`event`, `listener`): () => `void`

Defined in: [src/traverse/session.ts:937](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L937)

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

Defined in: [src/traverse/session.ts:5084](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5084)

Live export hook: fires once per new confirm row. Sugar for `on('confirm', …)`.

#### Parameters

##### listener

(`record`) => `void`

#### Returns

() => `void`

***

### onGap()

> **onGap**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:4166](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4166)

Live export hook: fires once per new gap row. Sugar for `on('gap', …)`.

#### Parameters

##### listener

(`gap`) => `void`

#### Returns

() => `void`

***

### openAskFor()

> **openAskFor**(`affordanceId`, `opts?`): `string` \| `undefined`

Defined in: [src/traverse/session.ts:4630](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4630)

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

Defined in: [src/traverse/session.ts:3833](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3833)

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

Defined in: [src/traverse/session.ts:3734](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3734)

Fired transitions still awaiting their state report (oldest first).

#### Returns

[`PendingInfo`](/api/index/interfaces/PendingInfo)[]

***

### producedFor()

> **producedFor**(`transitionId`): `unknown`

Defined in: [src/traverse/session.ts:4126](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4126)

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

Defined in: [src/traverse/session.ts:4116](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4116)

runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup).

#### Returns

`ReadonlyMap`\<`string`, `string`[]\>

***

### registerHandlers()

> **registerHandlers**(`opts`): [`RegisteredHandlers`](/api/index/interfaces/RegisteredHandlers)

Defined in: [src/traverse/session.ts:1625](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1625)

Bind the app's existing handlers to declared actions on a FLAT graph (no
node tree). Takes a caller `group` string; the tree API
(InteractionSession.registerActions) is preferred where you have a node
path — it returns a handle so you never invent a group name.

#### Parameters

##### opts

[`RegisterHandlersOptions`](/api/index/interfaces/RegisterHandlersOptions)

#### Returns

[`RegisteredHandlers`](/api/index/interfaces/RegisteredHandlers)

***

### reject()

> **reject**(`transitionId`, `opts?`): [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/traverse/session.ts:4000](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4000)

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

Defined in: [src/traverse/session.ts:4141](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4141)

Report an ask that no available action or journey could serve (typically
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

Defined in: [src/traverse/session.ts:876](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L876)

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

Defined in: [src/traverse/session.ts:4961](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4961)

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

### revokeAsk()

> **revokeAsk**(`askId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:4849](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4849)

WITHDRAW A YES THE PERSON ALREADY GAVE, before anything spends it — the ask
book's third word. The ordinary human act of changing one's mind had no
door: `declineAsk` refuses an answered card (a decision is never
overwritten), so a withdrawal was caught only by the app's own rules and
was INVISIBLE on the served surface, which kept holding a yes the person
had taken back.

APPEND-ONLY, like everything in this journal: the `'approved'` row is
NEVER rewritten. The withdrawal is a NEW `'revoked'` row referencing the
askId — principal, timestamp, `by` — and the ask book carries the fact as
data ([AskStatus.revoked](/api/index/interfaces/AskStatus#revoked)) beside the answer it does not touch. A
fire that then presents the pointer refuses `APPROVAL_REVOKED`, through
every door the gate guards; the cure is a fresh ask.

THE BOUNDARIES, each a typed refusal rather than a throw:
- an UNANSWERED card refuses `REVOKE_UNANSWERED` — there is no yes to
  withdraw, and the right verb for answering no is [Session.declineAsk](/api/index/classes/Session#declineask);
- a DECLINED card refuses `ASK_ALREADY_ANSWERED` — the no already refuses
  every fire, and needs no withdrawal;
- a SPENT yes refuses `ASK_ALREADY_SPENT` — revoking cannot un-fire the
  past, and the honest record of what happened is the `'used'` row;
- a card already revoked refuses `ASK_ALREADY_ANSWERED` — the withdrawal
  is recorded once, never doubled.

ONLY THE HUMAN SIDE REVOKES, in either direction. Like its siblings this
door stamps `principal: 'user'`; unlike them it accepts an optional
`principal` CLAIM so an honest relay (a port built with `source: 'agent'`,
a scripted driver) can state what it is — and any claim other than
`'user'` is refused `WRONG_PRINCIPAL`. An agent must never be able to
withdraw a human's decision: honouring an agent's revoke would let it
cancel a yes it dislikes as surely as forging one it wants.

#### Parameters

##### askId

`string`

##### opts

###### by

`string`

###### note?

`string`

###### principal?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

[`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

***

### sense()

> **sense**(`affordanceId`, `declaration`): () => `void`

Defined in: [src/traverse/session.ts:2872](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2872)

SENSE-ONLY — declare that this action lives at that element, with no handler
to wrap. The L0 on-ramp, and the human-interleave path: an app whose button
does its own thing still gets its people into the record.

A TRUSTED click inside the anchor opens a record-only fire (the browser has
already run the app's code — a fire that also invoked would run one human
click twice) stamped `cause.inferred`, carrying the correlation rule on the
record. Nothing here performs anything, and nothing here reads a value.

Returns the release, token-identity like every other declaration pair in
this library. An id no affordance answers to is filed and simply reports
whatever refusal its own fire earns — a control can be handed over before
the action that declares it is mounted, and refusing at this door would only
shout at a mount race.

#### Parameters

##### affordanceId

`string`

##### declaration

[`SenseDeclaration`](/api/index/interfaces/SenseDeclaration)

#### Returns

() => `void`

***

### sensedTrail()

> **sensedTrail**(`transitionId`): readonly [`SensedEvent`](/api/index/interfaces/SensedEvent)[]

Defined in: [src/traverse/session.ts:2903](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2903)

The whole event trail behind one contextful fire — the door the record
points at when the trail was too long to ride inline.

ONE DOOR FOR BOTH SHAPES: an inline trail is answered off the record itself,
so a caller never has to branch on which shape it got (the record still SAYS
which, because a reader deserves to know whether they are holding everything
or a pointer to it). Copies, never the live arrays.

Throws for an id this session cannot answer for — the same stance
[Session.settlementOf](/api/index/classes/Session#settlementof) takes, and for the same reason: a silent `[]`
would read as "nothing happened" about an action that may have had three
hundred events.

#### Parameters

##### transitionId

`string`

#### Returns

readonly [`SensedEvent`](/api/index/interfaces/SensedEvent)[]

***

### settlementIfKnown()

> **settlementIfKnown**(`transitionId`): [`FireSettlement`](/api/index/interfaces/FireSettlement) \| `undefined`

Defined in: [src/traverse/session.ts:3337](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3337)

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

Defined in: [src/traverse/session.ts:3316](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3316)

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

### state()

> **state**(): `Record`\<`string`, `unknown`\>

Defined in: [src/traverse/session.ts:1239](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1239)

Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references).

#### Returns

`Record`\<`string`, `unknown`\>

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/traverse/session.ts:4037](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4037)

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

> **toMCPTools**(`opts?`): [`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)[]

Defined in: [src/traverse/session.ts:5496](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5496)

Per-edge MCP tool descriptors for the CURRENT slice. Regenerated per call
— never cached. With a journey frame open, serves ONLY the frame's
currently-fireable steps + escape tools (authored cancel/back roles and a
synthetic leave-journey) — the on-demand disclosure contract.

#### Parameters

##### opts?

###### lossySchemas?

`boolean`

#### Returns

[`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)[]

***

### transitions()

> **transitions**(): readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

Defined in: [src/traverse/session.ts:4105](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4105)

The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
bundles by TransitionRecord.id; pending and rejected/rolled-back rows
exist only here (their effects never touched state). Rows are snapshots —
live records are the ones returned by fire()/updateState()/reject().

#### Returns

readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

***

### tryJourneyPlan()

> **tryJourneyPlan**(`journeyId`): [`TryJourneyPlanResult`](/api/index/type-aliases/TryJourneyPlanResult)

Defined in: [src/traverse/session.ts:2014](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2014)

journeyPlan() for an id the caller did not author — a model's, a URL's, a
config file's — answering with a value instead of a throw. Same plan; the
failure arm is the UNKNOWN_JOURNEY shape commitJourney() already returns.

journeyPlan() keeps throwing, deliberately. Every caller inside the library
passes an id the spec itself just yielded, and there an unknown id is a bug
that should stop the program, not a branch someone forgets to write. This
is the door for ids that arrive from outside, where not-a-journey is an
ordinary answer.

Membership is Object.hasOwn rather than a truthiness lookup BECAUSE the ids
here are untrusted: `journeys['constructor']` is truthy on any plain object,
so a lookup would sail past the guard and fail downstream reading `.steps`
off Object's constructor — a TypeError where the caller asked for exactly
the honest "no such journey" this method exists to give.

#### Parameters

##### journeyId

`string`

#### Returns

[`TryJourneyPlanResult`](/api/index/type-aliases/TryJourneyPlanResult)

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/traverse/session.ts:1690](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1690)

Remove every live binding currently owned by `group` (component unmount).

#### Parameters

##### group

`string`

#### Returns

`string`[]

***

### updateState()

> **updateState**(`delta`, `opts?`): [`UpdateResult`](/api/index/type-aliases/UpdateResult)

Defined in: [src/traverse/session.ts:3435](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3435)

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

Defined in: [src/traverse/session.ts:926](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L926)

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

### whatUnblocks()

> **whatUnblocks**(`affordanceId`): [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/traverse/session.ts:1928](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1928)

WHAT WOULD FREE THIS ACTION — the actions whose declared writes touch a key
this one is waiting on, each with the specific keys.

The same rule `journeyPlan` runs over a journey's steps, widened to every
declared action: DERIVED, never authored. Both halves already exist for
other reasons (`writes` powers verification; `guard` and `enabledWhen`
power availability), so nothing new is declared and nothing can drift.

IT ANSWERS A QUESTION A GREYED CONTROL OTHERWISE CANNOT. `enabled: false`
says a control is off; this says what the app itself claims would change
that — so a reader stops re-firing a dead button to find out.

FOUR HONESTY LIMITS, each a test:
- **Only the conditions that did NOT hold.** The keys are evaluated against
  live state, never read off the declaration. A control is offered at all
  only once its guard HOLDS, so naming actions that write a satisfied
  condition's keys would answer with the actions that DESTROY the thing the
  control is standing on — "discard the draft", "log out" — and read as
  advice to fire them. Inverted, and inverted toward the highest-effect
  actions in the app. What is not holding it back is not an answer to what
  would free it.
- **A claim, not a promise.** `writes` is the app's claim that an action
  changes a key. This reports the claim; firing that action is not promised
  to free this one.
- **Silence over guessing.** An action nobody claims to write a key for
  returns `[]` — the honest "nothing here knows what would change it",
  never an invented suggestion. A condition the library could not evaluate
  is dropped by the same law: it is not evidence of a block.
- **Never a plan.** The list is unordered and unranked. Ordering intent is
  a journey, which is declared, not derived.

Scope is every declared action, not just this node's: the control that
frees a greyed button often lives on another page, and hiding a true
answer to keep the list short would be the wrong trade.

#### Parameters

##### affordanceId

`string`

#### Returns

[`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

***

### whenPageChanges()

> **whenPageChanges**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:1016](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1016)

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

Defined in: [src/traverse/session.ts:4110](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4110)

"Why does this state key hold its value?" — footprint backward slice, formatted.

#### Parameters

##### key

`string`

#### Returns

`string`
