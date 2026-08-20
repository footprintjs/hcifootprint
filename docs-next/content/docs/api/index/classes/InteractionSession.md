---
title: InteractionSession<Paths>
---

# Class: InteractionSession\<Paths\>

Defined in: [src/traverse/nav-session.ts:152](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L152)

## Extends

- [`Session`](/api/index/classes/Session)

## Type Parameters

### Paths

`Paths` *extends* `string` = `string`

## Constructors

### Constructor

> **new InteractionSession**\<`Paths`\>(`map`, `opts?`, `liveSources?`): `InteractionSession`\<`Paths`\>

Defined in: [src/traverse/nav-session.ts:194](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L194)

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

Defined in: [src/traverse/nav-session.ts:740](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L740)

##### Returns

`string`

***

### focusHistory

#### Get Signature

> **get** **focusHistory**(): readonly `FocusMove`[]

Defined in: [src/traverse/nav-session.ts:988](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L988)

The focus moves of this session, oldest first.

Read-only and complete: this is evidence, so it is not filtered by whether
the cursor actually changed. See FocusMove.moved.

##### Returns

readonly `FocusMove`[]

***

### graphId

#### Get Signature

> **get** **graphId**(): `string`

Defined in: [src/traverse/session.ts:1034](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1034)

The compiled graph's id (namespaces MCP tool names).

##### Returns

`string`

#### Inherited from

[`Session`](/api/index/classes/Session).[`graphId`](/api/index/classes/Session#graphid)

***

### lookingAt

#### Get Signature

> **get** **lookingAt**(): `string` \| `null`

Defined in: [src/traverse/nav-session.ts:1315](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L1315)

The deeper place, for whoever is SERVING rather than printing: the observed
focus when it is below the page, and null when the page is the whole
answer. `whats_here` carries it as `lookingAt`, beside `youAreOn`.

##### Returns

`string` \| `null`

#### Overrides

[`Session`](/api/index/classes/Session).[`lookingAt`](/api/index/classes/Session#lookingat)

***

### node

#### Get Signature

> **get** **node**(): `string`

Defined in: [src/traverse/session.ts:1029](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1029)

##### Returns

`string`

#### Inherited from

[`Session`](/api/index/classes/Session).[`node`](/api/index/classes/Session#node)

***

### requiresHumanApproval

#### Get Signature

> **get** **requiresHumanApproval**(): `boolean`

Defined in: [src/traverse/session.ts:1050](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1050)

Whether this session ENFORCES human approval on high-effect agent fires
(SessionOptions.requireHumanApproval). Read by the serving layer so the
instruction text it hands a model says what is actually true of this session
— a tool description promising a gate that is off would be the same class of
lie this option exists to remove.

##### Returns

`boolean`

#### Inherited from

[`Session`](/api/index/classes/Session).[`requiresHumanApproval`](/api/index/classes/Session#requireshumanapproval)

***

### stateVersion

#### Get Signature

> **get** **stateVersion**(): `number`

Defined in: [src/traverse/session.ts:1092](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1092)

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

Defined in: [src/traverse/session.ts:1096](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1096)

##### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`structureVersion`](/api/index/classes/Session#structureversion)

***

### version

#### Get Signature

> **get** **version**(): `number`

Defined in: [src/traverse/session.ts:1039](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1039)

The one CAS/sinceVersion cursor: total order over ALL world motion.

##### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`version`](/api/index/classes/Session#version)

## Methods

### acknowledgements()

> **acknowledgements**(): [`StaleAcknowledgement`](/api/index/interfaces/StaleAcknowledgement)[]

Defined in: [src/traverse/session.ts:7339](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7339)

EVERY PROTOCOL STEP THIS SESSION HAS RECORDED, oldest first — append-only,
as copies.

Rows are never edited and never rewritten. One the world has moved past
stops AUTHORIZING a fire and stays here as what it always was: a thing
somebody did at a moment, at a state version this list still names.

BOUNDED, and the bound is answerable. The list holds the most recent
`maxAcknowledgements` (default 500); older receipts are dropped, counted
([Session.acknowledgementsDropped](/api/index/classes/Session#acknowledgementsdropped)) and warned about once. A fire that
cites a dropped one is told `why: 'evicted'` — this library's own limit,
never the caller's mistake.

#### Returns

[`StaleAcknowledgement`](/api/index/interfaces/StaleAcknowledgement)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`acknowledgements`](/api/index/classes/Session#acknowledgements)

***

### acknowledgementsDropped()

> **acknowledgementsDropped**(): `number`

Defined in: [src/traverse/session.ts:7353](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7353)

HOW MANY RECEIPTS THIS SESSION HAS DROPPED to stay inside
`maxAcknowledgements`.

The bound made visible, exactly as [Session.offersDropped](/api/index/classes/Session#offersdropped) is: nonzero
here is the reason an `ACKNOWLEDGEMENT_REQUIRED` refusal said `'evicted'`
about a step the caller really did perform, and the reason
[Session.acknowledgements](/api/index/classes/Session#acknowledgements) is shorter than the history it looks like.
The fix is a bigger cap, not anything the caller did.

#### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`acknowledgementsDropped`](/api/index/classes/Session#acknowledgementsdropped)

***

### acknowledgementsRetention()

> **acknowledgementsRetention**(): `LedgerRetention`

Defined in: [src/traverse/session.ts:7363](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7363)

THE ACKNOWLEDGEMENT LEDGER'S RETENTION WINDOW, counted (1.13.0) — what is
still answerable, not only how much is gone: `firstRetained`..`lastRetained`
of `minted`, with everything earlier evicted-but-countable. The window is
what lets a reader align a citation against the bound instead of guessing.

#### Returns

`LedgerRetention`

#### Inherited from

[`Session`](/api/index/classes/Session).[`acknowledgementsRetention`](/api/index/classes/Session#acknowledgementsretention)

***

### acknowledgeStale()

> **acknowledgeStale**(`actionId`, `keys?`, `opts?`): `object`

Defined in: [src/traverse/session.ts:7285](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7285)

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

AND IT IS NOW A ROW SOMEBODY CAN CITE. Every call appends a
[StaleAcknowledgement](/api/index/interfaces/StaleAcknowledgement) to `session.acknowledgements()` and hands back
its `acknowledgementId` — the pointer a `'require-ack'` fire presents
([FireOptions.acknowledgementId](/api/index/interfaces/FireOptions#acknowledgementid)). `cleared` means exactly what it
always meant; the id is new beside it.

A ROW IS WRITTEN EVEN WHEN NOTHING WAS CARRIED, and that is deliberate. The
carried ledger is about stamps this session SERVED; a freshness policy can
refuse over a key that was never served on a row (a fire made without
looking, an axis the row does not disclose). Writing the row only when
bookkeeping happened to be outstanding would make the protocol step
unperformable exactly where it is required.

```ts
const { acknowledgementId } = session.acknowledgeStale('ledger.settle', ['claim.total'], { offerId });
session.fire('ledger.settle', { source: 'agent', offerId, acknowledgementId });
```

APPEND-ONLY, AND BOUNDED — [SessionOptions.maxAcknowledgements](/api/index/interfaces/SessionOptions#maxacknowledgements),
default 500, oldest dropped first. The `ACKNOWLEDGEMENT_REQUIRED` →
acknowledge → refire loop writes one row per turn, so an unbounded trail is
a session-lifetime leak on exactly the protocol this feature asks callers to
run. Bounding a RECEIPT ledger owes three things, and all three are paid:
evictions are counted ([Session.acknowledgementsDropped](/api/index/classes/Session#acknowledgementsdropped)), the
integrator is warned once, and a fire citing a dropped receipt is refused
`ACKNOWLEDGEMENT_REQUIRED` with `why: 'evicted'` — a step this caller really
did perform, dropped by this library's own limit, and never reported as a
pointer they made up. Nothing is ever edited or retracted: the cap drops the
oldest rows whole, and a retained row says exactly what it always said.

SAY IT AGAIN, BECAUSE THE NAME INVITES THE BIGGER CLAIM: this records that a
protocol step was PERFORMED. It is not evidence that anything was
understood, and no field on the row says otherwise.

#### Parameters

##### actionId

`string`

##### keys?

readonly `string`[]

##### opts?

###### by?

[`Principal`](/api/index/type-aliases/Principal)

Who performed it. Defaults to `'agent'`, never `'user'`: filing a
machine's act under a person is the one mistake a ledger must not make
on its own — the same law [Session.fire](/api/index/classes/Session#fire) keeps.

###### offerId?

`string`

The offer being answered — a join, and the row a `'require-ack'` fire will cite.

#### Returns

`object`

##### acknowledgementId

> **acknowledgementId**: `string`

##### cleared

> **cleared**: `string`[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`acknowledgeStale`](/api/index/classes/Session#acknowledgestale)

***

### alwaysApprove()

> **alwaysApprove**(`affordanceId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:6464](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6464)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`alwaysApprove`](/api/index/classes/Session#alwaysapprove)

***

### approveAsk()

> **approveAsk**(`askId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:6300](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6300)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`approveAsk`](/api/index/classes/Session#approveask)

***

### asAgent()

> **asAgent**(): [`PrincipalPort`](/api/index/interfaces/PrincipalPort)

Defined in: [src/traverse/session.ts:2663](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2663)

THIS SESSION'S DOORS, WITH THE PRINCIPAL ALREADY ON THEM.

```ts
const agent = session.asAgent();
agent.fire('checkout.place-order');   // no `source` to forget, or to get wrong
```

The problem it removes is small and constant: provenance was an argument on
every call, and an argument on every call is an argument that gets omitted
(a JS caller's `fire(id)` files a machine's action under this library's
default) or copied (one relay's `source: 'user'` pasted into the line that
fires for the model). Said once, at the boundary where the caller's identity
is actually known, it cannot drift call by call.

IT IS THE SAME ASSERTION, NOT A STRONGER ONE. A port fire stamps
`attribution.basis: 'caller-asserted'`, exactly as `fire({ source })` does —
the same caller making the same claim with less repetition. Recording
ergonomics as evidence would be laundering convenience into proof, which is
the one thing this release exists to stop.

WHAT IS DELIBERATELY NOT ON IT: every human-side authority door
(`approveAsk`, `alwaysApprove`, `revokeAsk`, `declineConfirm`) and
`updateState` (see [PrincipalPort](/api/index/interfaces/PrincipalPort)). `fire({ source })` stays fully
supported and is not deprecated; this is a second door onto the same law,
not a replacement for it.

#### Returns

[`PrincipalPort`](/api/index/interfaces/PrincipalPort)

#### Inherited from

[`Session`](/api/index/classes/Session).[`asAgent`](/api/index/classes/Session#asagent)

***

### asHuman()

> **asHuman**(): [`PrincipalPort`](/api/index/interfaces/PrincipalPort)

Defined in: [src/traverse/session.ts:2668](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2668)

The same door, speaking as a person. Files its acts under `'user'`.

#### Returns

[`PrincipalPort`](/api/index/interfaces/PrincipalPort)

#### Inherited from

[`Session`](/api/index/classes/Session).[`asHuman`](/api/index/classes/Session#ashuman)

***

### asks()

> **asks**(): [`AskStatus`](/api/index/interfaces/AskStatus)[]

Defined in: [src/traverse/session.ts:6664](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6664)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`asks`](/api/index/classes/Session#asks)

***

### asSystem()

> **asSystem**(): [`PrincipalPort`](/api/index/interfaces/PrincipalPort)

Defined in: [src/traverse/session.ts:2673](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2673)

The same door, speaking as the app itself.

#### Returns

[`PrincipalPort`](/api/index/interfaces/PrincipalPort)

#### Inherited from

[`Session`](/api/index/classes/Session).[`asSystem`](/api/index/classes/Session#assystem)

***

### available()

> **available**(): [`AvailableSlice`](/api/index/interfaces/AvailableSlice)

Defined in: [src/traverse/nav-session.ts:933](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L933)

#### Returns

[`AvailableSlice`](/api/index/interfaces/AvailableSlice)

#### Overrides

[`Session`](/api/index/classes/Session).[`available`](/api/index/classes/Session#available)

***

### availableJourneys()

> **availableJourneys**(): `object`

Defined in: [src/traverse/session.ts:2099](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2099)

Journey-level disclosure for the planning LLM (descriptions + feasibility, no tool detail).

#### Returns

`object`

##### journeys

> **journeys**: [`AvailableJourney`](/api/index/interfaces/AvailableJourney)[]

##### node

> **node**: `string`

##### version

> **version**: `number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`availableJourneys`](/api/index/classes/Session#availablejourneys)

***

### awaitingSettlement()

> **awaitingSettlement**(): `string`[]

Defined in: [src/traverse/session.ts:4523](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4523)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`awaitingSettlement`](/api/index/classes/Session#awaitingsettlement)

***

### beginWork()

> **beginWork**(`label?`, `opts?`): [`WorkHandle`](/api/index/interfaces/WorkHandle)

Defined in: [src/traverse/session.ts:5254](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5254)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`beginWork`](/api/index/classes/Session#beginwork)

***

### carriedStale()

> **carriedStale**(`actionId`): `string`[]

Defined in: [src/traverse/session.ts:7226](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7226)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`carriedStale`](/api/index/classes/Session#carriedstale)

***

### carryStale()

> **carryStale**(`actionId`, `keys`): `void`

Defined in: [src/traverse/session.ts:7210](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7210)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`carryStale`](/api/index/classes/Session#carrystale)

***

### commitJourney()

> **commitJourney**(`journeyId`, `opts?`): [`CommitJourneyResult`](/api/index/type-aliases/CommitJourneyResult)

Defined in: [src/traverse/session.ts:2137](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2137)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`commitJourney`](/api/index/classes/Session#commitjourney)

***

### commitLog()

> **commitLog**(): [`CommitBundle`](/api/index/interfaces/CommitBundle)[]

Defined in: [src/traverse/session.ts:5586](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5586)

The footprintjs commit log: one bundle per SETTLED/stimulus/sync transition.

#### Returns

[`CommitBundle`](/api/index/interfaces/CommitBundle)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`commitLog`](/api/index/classes/Session#commitlog)

***

### confirmAsk()

> **confirmAsk**(`affordanceId`, `opts?`): `object`

Defined in: [src/traverse/session.ts:6032](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6032)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`confirmAsk`](/api/index/classes/Session#confirmask)

***

### confirms()

> **confirms**(): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)[]

Defined in: [src/traverse/session.ts:6629](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6629)

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

Defined in: [src/traverse/nav-session.ts:1325](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L1325)

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

### decisions()

> **decisions**(): [`DecisionStatus`](/api/index/interfaces/DecisionStatus)[]

Defined in: [src/traverse/session.ts:5138](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5138)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`decisions`](/api/index/classes/Session#decisions)

***

### declareHolds()

> **declareHolds**(`affordanceId`, `read`): () => `void`

Defined in: [src/traverse/session.ts:1790](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1790)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`declareHolds`](/api/index/classes/Session#declareholds)

***

### declineAsk()

> **declineAsk**(`askId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:6332](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6332)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`declineAsk`](/api/index/classes/Session#declineask)

***

### declineConfirm()

> **declineConfirm**(`affordanceId`, `opts?`): [`ConfirmRecord`](/api/index/interfaces/ConfirmRecord)

Defined in: [src/traverse/session.ts:6196](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6196)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`declineConfirm`](/api/index/classes/Session#declineconfirm)

***

### detachSources()

> **detachSources**(): `void`

Defined in: [src/traverse/nav-session.ts:227](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L227)

Release every live-source binding this session's graph attached (the
counterpart of `sources: [fromLiveStore(...)]`). Idempotent: the ledger is
drained on the first call. A source whose detach throws is isolated with a
warning — consumer store code must never break the session (recorder rule).

#### Returns

`void`

***

### explain()

> **explain**(`affordanceId`): [`Explanation`](/api/index/interfaces/Explanation)

Defined in: [src/traverse/session.ts:2078](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2078)

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

Defined in: [src/traverse/nav-session.ts:992](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L992)

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

#### Overrides

[`Session`](/api/index/classes/Session).[`fire`](/api/index/classes/Session#fire)

***

### frames()

> **frames**(): [`JourneyFrame`](/api/index/interfaces/JourneyFrame)[]

Defined in: [src/traverse/session.ts:2258](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2258)

Frame history: every closed frame (completed / cancelled / demoted), oldest first.

#### Returns

[`JourneyFrame`](/api/index/interfaces/JourneyFrame)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`frames`](/api/index/classes/Session#frames)

***

### gaps()

> **gaps**(): [`GapRecord`](/api/index/interfaces/GapRecord)[]

Defined in: [src/traverse/session.ts:5656](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5656)

The unmet-demand ledger (DEEP copies) — export it to your analytics/triage pipeline.

#### Returns

[`GapRecord`](/api/index/interfaces/GapRecord)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`gaps`](/api/index/classes/Session#gaps)

***

### groundTruth()

> **groundTruth**(`opts?`): [`GroundTruth`](/api/index/interfaces/GroundTruth)

Defined in: [src/traverse/session.ts:7510](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7510)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`groundTruth`](/api/index/classes/Session#groundtruth)

***

### howToReach()

> **howToReach**(`pageId`): [`RouteStep`](/api/index/interfaces/RouteStep)[] \| `null`

Defined in: [src/traverse/session.ts:2282](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2282)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`howToReach`](/api/index/classes/Session#howtoreach)

***

### journeyFrame()

> **journeyFrame**(): [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/traverse/session.ts:2253](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2253)

The open journey frame (snapshot), or null.

#### Returns

[`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

#### Inherited from

[`Session`](/api/index/classes/Session).[`journeyFrame`](/api/index/classes/Session#journeyframe)

***

### journeyPlan()

> **journeyPlan**(`journeyId`): [`JourneyPlan`](/api/index/interfaces/JourneyPlan)

Defined in: [src/traverse/session.ts:2363](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2363)

The DERIVED intra-journey dependency DAG with live status. Dependencies are
computed, never authored: step B depends on step A when A's declared
effect.writes overlap B's guard keys — the guard×effect atoms already
encode the ordering, so it cannot drift from the graph.

#### Parameters

##### journeyId

`string`

#### Returns

[`JourneyPlan`](/api/index/interfaces/JourneyPlan)

#### Inherited from

[`Session`](/api/index/classes/Session).[`journeyPlan`](/api/index/classes/Session#journeyplan)

***

### journeyStanding()

> **journeyStanding**(`journeyId`): [`JourneyStanding`](/api/index/interfaces/JourneyStanding)

Defined in: [src/traverse/session.ts:2486](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2486)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`journeyStanding`](/api/index/classes/Session#journeystanding)

***

### keysChangedSince()

> **keysChangedSince**(`sinceVersion?`, `opts?`): `string`[]

Defined in: [src/traverse/session.ts:7171](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7171)

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

---

`opts.for` — ANSWER IT FOR ONE CALLER, AND YOUR OWN WRITE IS NOT NEWS.

Omit it and this is the session's own answer: every key this session
committed in that window, whoever moved it, byte for byte what it has always
been. It is the honest answer to "what has this session committed", and a
caller joining the log to something else still wants exactly that.

Name a principal and the question changes to the one a SERVED ROW is asking:
*has this key moved under you?* A key is stale to a caller when it moved
since that caller last acted on it. A caller's own committed write is the
caller acting, so it is not a disturbance to itself — and anybody else's
write to that same key, afterwards, is.

WHY THIS IS NOT A COSMETIC FILTER. Before 1.7.0 the stamp built on this
lived for one turn, so a self-write was one line of noise and then gone.
Carried until answered, it became a loop with no exit: the agent's fire
clears the control's ledger, the fire's own commit re-arms it on the next
look, and the only act that clears it re-arms it again. Measured, off a real
campaign: a control served with `staleWrites` naming keys its own last fire
had written, every turn, and fired four times against a change it had made
itself.

WHAT IT IS BOUNDED BY, so it can never quietly grow into "trust the agent":
an ACT, at a VERSION. Only a committed motion this session filed under that
principal un-marks a key, and only until the next motion filed under anybody
else. There is no identity here that outlives one commit.

AND WHAT IT STILL DOES NOT SAY: no principal is served, on this list or on
any row built from it. WHO moved a key stays where it always was — on the
transition record, beside the [Attribution](/api/index/interfaces/Attribution) that grades how the
library came to believe it.

#### Parameters

##### sinceVersion?

`number`

##### opts?

###### for?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

`string`[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`keysChangedSince`](/api/index/classes/Session#keyschangedsince)

***

### leaveJourney()

> **leaveJourney**(`opts?`): [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/traverse/session.ts:2230](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2230)

Close the open frame. Default reason: 'completed' if every step was
committed while the frame was open, else 'cancelled'. Returns the closed
frame, or null when none was open.

#### Parameters

##### opts?

###### reason?

`"completed"` \| `"cancelled"`

#### Returns

[`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

#### Inherited from

[`Session`](/api/index/classes/Session).[`leaveJourney`](/api/index/classes/Session#leavejourney)

***

### observationsOf()

> **observationsOf**(`transitionId`): [`ExternalObservation`](/api/index/interfaces/ExternalObservation)[]

Defined in: [src/traverse/session.ts:4659](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4659)

EVERY EXTERNAL REPORT ABOUT ONE FIRE, oldest first — copies, so a reader
cannot rewrite the trail. Empty for a fire nobody reported on, and for an id
this session does not know: this is a question, and asking it refuses
nothing.

#### Parameters

##### transitionId

`string`

#### Returns

[`ExternalObservation`](/api/index/interfaces/ExternalObservation)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`observationsOf`](/api/index/classes/Session#observationsof)

***

### observeEffect()

> **observeEffect**(`transitionId`, `report`): [`ObserveEffectResult`](/api/index/type-aliases/ObserveEffectResult)

Defined in: [src/traverse/session.ts:4566](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4566)

SOMETHING THIS CLIENT CANNOT SEE HAS REPORTED — the external-observation
door, and the other half of `observability: 'external'`.

A payment clears at a processor, a job finishes on a queue, a letter is
posted. The browser sees none of it, so before this door the honest answer
for such a fire was 'unobservable' forever — the library declining to guess,
and an app holding the answer with nowhere to put it. Now it can hand it in.

WHAT IS RECORDED IS THE REPORT, NEVER THE FACT. The row says a source the
app named said this happened, with a REFERENCE to evidence this library
never fetches, dereferences or interprets. Nothing here is proof the effect
occurred, and no sentence anywhere in this library will say it is.

```ts
const fired = session.fire('checkout.pay', { source: 'agent' });
// …the webhook arrives, minutes later…
session.observeEffect(fired.transition.id, {
  source: 'stripe-webhook',
  status: 'performed',
  evidenceRef: 'evt_1P2x…',
});
```

FIRST REPORT SETTLES, EVERY REPORT IS KEPT. The first one answers the fire's
open question (`whenSettled`, `settlementOf`) exactly as a state report or a
handler completing would; a later one — a reversal, a second source — is
APPENDED to [TransitionRecord.observations](/api/index/interfaces/TransitionRecord#observations) and `settled: false` says
the receipt it did not rewrite. That is the append-only law this library
keeps everywhere: a record taken at rest is never edited, and new facts are
new rows beside it.

IT DOES NOT MOVE STATE. The delta is `updateState`'s job and this door
writes none: an effect nobody here can see is exactly the effect whose state
consequences this library has no business inventing. So a settled fire's
`effectVerified` stays honestly `'unobservable'` — no report exists to check
the declared writes against, and that has not changed because somebody said
the work was done.

#### Parameters

##### transitionId

`string`

##### report

[`ObserveEffectOptions`](/api/index/interfaces/ObserveEffectOptions)

#### Returns

[`ObserveEffectResult`](/api/index/type-aliases/ObserveEffectResult)

#### Inherited from

[`Session`](/api/index/classes/Session).[`observeEffect`](/api/index/classes/Session#observeeffect)

***

### observeFocus()

> **observeFocus**(`path`, `opts?`): `void`

Defined in: [src/traverse/nav-session.ts:1283](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L1283)

THE OBSERVATION DOOR: report which tab, area or modal on THIS page the
reader is looking at, without moving the walker.

Sync pages; observe the deeper place. `sync()` moves the walker and decides
what is served; `observeFocus()` says which tab or area the reader is in.
Declare containers, and report the deepest one on screen.

Position has three tiers and only two doors owned it before this one: the
PAGE (`sync`), and STATE (`updateState`, which is not position at all).
Everything between them — which tab is open, which panel is on screen —
had no reporter, because [focus](/api/index/classes/InteractionSession#focus) moved only on `sync()` and `fire()`.
A person clicking a tab fires nothing, so the one case that matters most
(a human and an agent looking at the same screen) could never be reported.

What it does, and what it deliberately does not:

- it sets [focus](/api/index/classes/InteractionSession#focus) and [lookingAt](/api/index/classes/InteractionSession#lookingat), so the facts block gains
  `Focus: run-detail.why.` and every served answer carries `lookingAt`;
- it records a FocusMove with the principal you name, so who moved
  the reader is on the record exactly as it is for a fire or a sync;
- it does NOT move the cursor, mint a transition, bump the version, or
  change one byte of what `available()` serves. The page stays
  authoritative for serving, which is the whole reason this is not a sync.

It refuses BY NAME rather than guessing: a path this map does not declare,
and a path that belongs to another page (sync that page first). Both are
app-wiring mistakes, and both are the kind that would otherwise show up as
a session quietly describing the wrong screen.

Observing the PAGE itself is how you say the reader is back at page level
with no container open. A container the page is not currently showing (a
closed modal, a tab whose sibling is shown) is accepted and then honestly
walked home by [focus](/api/index/classes/InteractionSession#focus)'s ancestor fallback — being told the reader is
somewhere the app also says is hidden resolves to the nearest place that is
really there.

```ts
function onTabChange(tab: 'why' | 'timeline') {
  session.show(`run-detail.${tab}`);                              // VISIBLE
  session.observeFocus(`run-detail.${tab}`, { principal: 'user' }); // WHERE THE READER IS
}
```

#### Parameters

##### path

`Paths`

##### opts?

###### principal?

[`Principal`](/api/index/type-aliases/Principal)

#### Returns

`void`

***

### offerFor()

> **offerFor**(`offerId`): [`OfferRecord`](/api/index/interfaces/OfferRecord) \| `undefined`

Defined in: [src/traverse/session.ts:7385](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7385)

#### Parameters

##### offerId

`string`

#### Returns

[`OfferRecord`](/api/index/interfaces/OfferRecord) \| `undefined`

#### Inherited from

[`Session`](/api/index/classes/Session).[`offerFor`](/api/index/classes/Session#offerfor)

***

### offers()

> **offers**(): [`OfferRecord`](/api/index/interfaces/OfferRecord)[]

Defined in: [src/traverse/session.ts:7390](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7390)

Every offer this session still holds, oldest first, as copies.

#### Returns

[`OfferRecord`](/api/index/interfaces/OfferRecord)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`offers`](/api/index/classes/Session#offers)

***

### offersDropped()

> **offersDropped**(): `number`

Defined in: [src/traverse/session.ts:7403](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7403)

HOW MANY OFFERS THIS SESSION HAS DROPPED to stay inside `maxOffers`.

The bound made visible. A citation can expire, so the number that says how
often that has happened is a fact a caller is owed rather than an internal
detail: nonzero here is the reason a `OFFER_NOT_ON_RECORD` refusal said
`'evicted'`, and the fix is a bigger `maxOffers` rather than anything the
caller did wrong.

#### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`offersDropped`](/api/index/classes/Session#offersdropped)

***

### offersRetention()

> **offersRetention**(): `LedgerRetention`

Defined in: [src/traverse/session.ts:7414](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7414)

THE OFFER LEDGER'S RETENTION WINDOW, counted (1.13.0) — the same window
[Session.acknowledgementsRetention](/api/index/classes/Session#acknowledgementsretention) states for receipts. Nonzero
`dropped` with a stated `firstRetained` is how a reader knows an
`OFFER_NOT_ON_RECORD why:'evicted'` refusal points BEFORE the window, not
at a citation that never existed.

#### Returns

`LedgerRetention`

#### Inherited from

[`Session`](/api/index/classes/Session).[`offersRetention`](/api/index/classes/Session#offersretention)

***

### offerStanding()

> **offerStanding**(`offerId`): `OfferStanding`

Defined in: [src/traverse/session.ts:7381](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7381)

WHAT BECAME OF AN OFFER ID (1.13.0): `'retained'` (answerable now),
`'evicted'` (this session really minted it; the cap dropped it — see
[Session.offersRetention](/api/index/classes/Session#offersretention)), or `'unknown'` (never minted here).
The three-way answer the OFFER_NOT_ON_RECORD refusal has always used,
now askable without firing anything.

#### Parameters

##### offerId

`string`

#### Returns

`OfferStanding`

#### Inherited from

[`Session`](/api/index/classes/Session).[`offerStanding`](/api/index/classes/Session#offerstanding)

***

### on()

> **on**\<`N`\>(`event`, `listener`): () => `void`

Defined in: [src/traverse/session.ts:1130](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1130)

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

Defined in: [src/traverse/session.ts:6634](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6634)

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

Defined in: [src/traverse/session.ts:5661](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5661)

Live export hook: fires once per new gap row. Sugar for `on('gap', …)`.

#### Parameters

##### listener

(`gap`) => `void`

#### Returns

() => `void`

#### Inherited from

[`Session`](/api/index/classes/Session).[`onGap`](/api/index/classes/Session#ongap)

***

### openAskFor()

> **openAskFor**(`affordanceId`, `opts?`): `string` \| `undefined`

Defined in: [src/traverse/session.ts:6148](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6148)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`openAskFor`](/api/index/classes/Session#openaskfor)

***

### openWork()

> **openWork**(): [`WorkRow`](/api/index/interfaces/WorkRow)[]

Defined in: [src/traverse/session.ts:5286](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5286)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`openWork`](/api/index/classes/Session#openwork)

***

### pending()

> **pending**(): [`PendingInfo`](/api/index/interfaces/PendingInfo)[]

Defined in: [src/traverse/session.ts:5187](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5187)

Fired transitions still awaiting their state report (oldest first).

#### Returns

[`PendingInfo`](/api/index/interfaces/PendingInfo)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`pending`](/api/index/classes/Session#pending)

***

### producedFor()

> **producedFor**(`transitionId`): `unknown`

Defined in: [src/traverse/session.ts:5621](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5621)

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

Defined in: [src/traverse/session.ts:5611](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5611)

runtimeStageId → tracked read keys (feed to causalChain's keysRead lookup).

#### Returns

`ReadonlyMap`\<`string`, `string`[]\>

#### Inherited from

[`Session`](/api/index/classes/Session).[`readsByStep`](/api/index/classes/Session#readsbystep)

***

### registerAction()

> **registerAction**(`path`, `actionId`, `def`): [`ActionHandle`](/api/index/interfaces/ActionHandle)

Defined in: [src/traverse/nav-session.ts:405](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L405)

Register ONE action on a node (convenience over registerActions). `def`
either binds an existing declared action (`{ handler }`) or declares a new
leaf here (`{ does, handler }`). Returns a single-action handle.

#### Parameters

##### path

`Paths`

##### actionId

`string`

##### def

[`RegisteredActionDef`](/api/index/interfaces/RegisteredActionDef) & `object`

#### Returns

[`ActionHandle`](/api/index/interfaces/ActionHandle)

***

### registerActions()

> **registerActions**(`path`, `opts?`): [`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

Defined in: [src/traverse/nav-session.ts:273](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L273)

Register a component's handlers/actions ON a node when it renders. You never
name a group — this RETURNS an ActionGroupHandle that is the identity (with a
generated `id`). Hold it in a ref; call `handle.unregister()` on unmount.
`handle.setEnabled(actionId, false)` greys one action out (a disabled button).

#### Parameters

##### path

`Paths`

##### opts?

[`RegisterActionGroupOptions`](/api/index/interfaces/RegisterActionGroupOptions)

#### Returns

[`ActionGroupHandle`](/api/index/interfaces/ActionGroupHandle)

***

### registerHandlers()

> **registerHandlers**(`opts`): [`RegisteredHandlers`](/api/index/interfaces/RegisteredHandlers)

Defined in: [src/traverse/session.ts:1982](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1982)

Bind the app's existing handlers to declared actions on a FLAT graph (no
node tree). Takes a caller `group` string; the tree API
(InteractionSession.registerActions) is preferred where you have a node
path — it returns a handle so you never invent a group name.

#### Parameters

##### opts

[`RegisterHandlersOptions`](/api/index/interfaces/RegisterHandlersOptions)

#### Returns

[`RegisteredHandlers`](/api/index/interfaces/RegisteredHandlers)

#### Inherited from

[`Session`](/api/index/classes/Session).[`registerHandlers`](/api/index/classes/Session#registerhandlers)

***

### reject()

> **reject**(`transitionId`, `opts?`): [`TransitionRecord`](/api/index/interfaces/TransitionRecord)

Defined in: [src/traverse/session.ts:5464](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5464)

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

Defined in: [src/traverse/session.ts:5636](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5636)

Report an ask that no available action or journey could serve (typically
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

### requiresHumanApprovalFrom()

> **requiresHumanApprovalFrom**(`principal`): `boolean`

Defined in: [src/traverse/session.ts:1069](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1069)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`requiresHumanApprovalFrom`](/api/index/classes/Session#requireshumanapprovalfrom)

***

### revokeAlwaysApprove()

> **revokeAlwaysApprove**(`affordanceId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:6509](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6509)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`revokeAlwaysApprove`](/api/index/classes/Session#revokealwaysapprove)

***

### revokeAsk()

> **revokeAsk**(`askId`, `opts`): [`ApprovalResult`](/api/index/type-aliases/ApprovalResult)

Defined in: [src/traverse/session.ts:6387](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L6387)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`revokeAsk`](/api/index/classes/Session#revokeask)

***

### sense()

> **sense**(`affordanceId`, `declaration`): () => `void`

Defined in: [src/traverse/session.ts:3941](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3941)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`sense`](/api/index/classes/Session#sense)

***

### sensedTrail()

> **sensedTrail**(`transitionId`): readonly [`SensedEvent`](/api/index/interfaces/SensedEvent)[]

Defined in: [src/traverse/session.ts:3973](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L3973)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`sensedTrail`](/api/index/classes/Session#sensedtrail)

***

### sensedTrailsDropped()

> **sensedTrailsDropped**(): `number`

Defined in: [src/traverse/session.ts:4005](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4005)

HOW MANY OVERSIZED TRAILS the TRAILS\_RETAINED cap has evicted
(1.13.0) — the bound made visible, exactly as [Session.offersDropped](/api/index/classes/Session#offersdropped)
and [Session.acknowledgementsDropped](/api/index/classes/Session#acknowledgementsdropped) are. Nonzero here is why
[Session.sensedTrail](/api/index/classes/Session#sensedtrail) said 'evicted' about a fire that really sensed.

#### Returns

`number`

#### Inherited from

[`Session`](/api/index/classes/Session).[`sensedTrailsDropped`](/api/index/classes/Session#sensedtrailsdropped)

***

### settlementIfKnown()

> **settlementIfKnown**(`transitionId`): [`FireSettlement`](/api/index/interfaces/FireSettlement) \| `undefined`

Defined in: [src/traverse/session.ts:4502](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4502)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`settlementIfKnown`](/api/index/classes/Session#settlementifknown)

***

### settlementOf()

> **settlementOf**(`transitionId`): `Promise`\<[`FireSettlement`](/api/index/interfaces/FireSettlement)\>

Defined in: [src/traverse/session.ts:4478](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4478)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`settlementOf`](/api/index/classes/Session#settlementof)

***

### setVisible()

> **setVisible**(`path`, `visible`): `void`

Defined in: [src/traverse/nav-session.ts:705](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L705)

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

Defined in: [src/traverse/nav-session.ts:712](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L712)

Show a node; for a tab this also hides its tab siblings (at most one shown).

#### Parameters

##### path

`Paths`

#### Returns

`void`

***

### state()

> **state**(): `Record`\<`string`, `unknown`\>

Defined in: [src/traverse/session.ts:1470](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1470)

Detached snapshot of the projected state (live state is immutable-after-swap; never hand out references).

#### Returns

`Record`\<`string`, `unknown`\>

#### Inherited from

[`Session`](/api/index/classes/Session).[`state`](/api/index/classes/Session#state)

***

### sync()

> **sync**(`observedNode`, `opts?`): [`SyncResult`](/api/index/type-aliases/SyncResult)

Defined in: [src/traverse/nav-session.ts:1190](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L1190)

Sync pages; observe the deeper place. `sync()` moves the walker and decides
what is served; `observeFocus()` says which tab or area the reader is in.
Declare containers, and report the deepest one on screen.

This is the WALKER's door: the cursor moved, so what is served moves with
it. Actions are offered from the PAGE node, which is why a container path
cannot be a cursor — an agent standing on a tab would be served nothing.

Hand it one anyway and this does the safe thing rather than the literal
one: the page that owns the container is synced (never an off-graph cursor
over a name the map knows) and a one-time warning names the door that
actually reports the tab. The old behaviour — a silent off-graph cursor and
a session serving nothing — is the failure this arm exists to end.

```ts
function onTabChange(tab: 'why' | 'timeline') {
  session.show(`run-detail.${tab}`);          // which tab is VISIBLE
  session.observeFocus(`run-detail.${tab}`);  // where the READER is
}
```

An UNDECLARED path is still runtime input from the world and still honest:
the cursor follows reality off-graph, as it always has.

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

> **toMCPTools**(`opts?`): [`MCPToolDescription`](/api/index/interfaces/MCPToolDescription)[]

Defined in: [src/traverse/session.ts:7088](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L7088)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`toMCPTools`](/api/index/classes/Session#tomcptools)

***

### transitions()

> **transitions**(): readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

Defined in: [src/traverse/session.ts:5596](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5596)

The interaction log. Settled/stimulus/sync rows join 1:1 to commitLog()
bundles by TransitionRecord.id; pending and rejected/rolled-back rows
exist only here (their effects never touched state). Rows are snapshots —
live records are the ones returned by fire()/updateState()/reject().

#### Returns

readonly [`TransitionRecord`](/api/index/interfaces/TransitionRecord)[]

#### Inherited from

[`Session`](/api/index/classes/Session).[`transitions`](/api/index/classes/Session#transitions)

***

### tryJourneyPlan()

> **tryJourneyPlan**(`journeyId`): [`TryJourneyPlanResult`](/api/index/type-aliases/TryJourneyPlanResult)

Defined in: [src/traverse/session.ts:2429](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2429)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`tryJourneyPlan`](/api/index/classes/Session#tryjourneyplan)

***

### unregisterGroup()

> **unregisterGroup**(`group`): `string`[]

Defined in: [src/traverse/session.ts:2059](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2059)

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

Defined in: [src/traverse/session.ts:4737](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L4737)

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

### warn()

> **warn**(`message`): `void`

Defined in: [src/traverse/session.ts:1119](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1119)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`warn`](/api/index/classes/Session#warn)

***

### whatUnblocks()

> **whatUnblocks**(`affordanceId`): [`DependencyEdge`](/api/index/interfaces/DependencyEdge)[]

Defined in: [src/traverse/session.ts:2334](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L2334)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`whatUnblocks`](/api/index/classes/Session#whatunblocks)

***

### whenPageChanges()

> **whenPageChanges**(`listener`): () => `void`

Defined in: [src/traverse/session.ts:1230](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L1230)

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

#### Inherited from

[`Session`](/api/index/classes/Session).[`whenPageChanges`](/api/index/classes/Session#whenpagechanges)

***

### why()

> **why**(`key`): `string`

Defined in: [src/traverse/session.ts:5601](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/session.ts#L5601)

"Why does this state key hold its value?" — footprint backward slice, formatted.

#### Parameters

##### key

`string`

#### Returns

`string`

#### Inherited from

[`Session`](/api/index/classes/Session).[`why`](/api/index/classes/Session#why)
