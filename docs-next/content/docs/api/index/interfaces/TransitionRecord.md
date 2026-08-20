---
title: TransitionRecord
---

# Interface: TransitionRecord

Defined in: [src/atom/types.ts:1223](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1223)

One occurrence: a row in the interaction log. SETTLED (and stimulus/sync)
transitions join 1:1 to a CommitBundle by `id`; pending and
rejected/rolled-back rows exist only here — that asymmetry is deliberate
(a rejected effect never touched state, so it has no commit).

## Properties

### alreadyTrue?

> `optional` **alreadyTrue?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1382](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1382)

THE CONDITIONS THIS ACTION'S OWN VERIFY CONTRACT ALREADY MET, at the moment
it fired — present only on a fire whose declared effect the world already
held, and absent on every ordinary one.

An effect that is already true is not a pending one. When an action's
declarative verify contract covers every key it declares it writes and
already holds at fire time, the fire never waits for a state report that
nothing will send — it settles on its own handler and answers `alreadyTrue`.

ON THE ROW, not only on the result, and that is the deliberate half: a
press that legitimately did nothing is still something the record should be
able to show. It shows as an ordinary committed row carrying this marker —
never as a move that happened, because nothing was written and the commit
bundle under it is empty (footprint's deliberate-cursor-stop idiom).

WHY THE VERIFY CONTRACT AND NOT `effect.writes`. `writes` is key names only,
by the law stated on it: this library never learns the value an action would
set, and it does not read your handler to find out. The declarative
[VerifyContract](/api/index/type-aliases/VerifyContract) is the one declaration carrying VALUES, so it is the
one that can answer. An action declaring `writes` and no declarative verify
behaves exactly as it always did — nothing is guessed on its behalf.

The conditions are a COPY: the same shapes ride guard evidence elsewhere,
and a consumer annotating a row must never rewrite the trace.

***

### arrival?

> `optional` **arrival?**: `"observed"` \| `"claimed"`

Defined in: [src/atom/types.ts:1304](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1304)

WHERE THE CLAIM AND THE OBSERVATION MEET — present only on a fire whose edge
declared `effect.navigatesTo`, whichever gesture carries it, and absent
everywhere else.

Exactly two values, ever:
- `'claimed'` — stamped when the navigation claim is written, beside
  `toNodeClaimed`. It means the app SAID this action navigates and nothing
  has observed the app arrive. A fire under
  [SessionOptions.allowUnmaterializedFires](/api/index/interfaces/SessionOptions#allowunmaterializedfires) that nothing executed says
  this and can never say more: there is no action for an observation to
  corroborate, and the record's `materialized: false` is the other half.
- `'observed'` — a later [Session.sync](/api/index/classes/Session#sync) landed on the page this fire
  claimed. It means A MATCHING OBSERVATION LANDED. It is corroboration, not
  causal proof: the sync row that produced it still carries
  `unverifiedEdge: true`, because the cursor moved without passing a guard
  and nothing here can see the app's router.

WHAT IT NEVER SAYS. There is no third value for "did not arrive": a sync
somewhere else, or no sync at all, leaves `'claimed'` standing forever. A
later legitimate hop and a failed navigation are indistinguishable from
here, a session with no sync channel observes nothing by construction, and a
clock is not evidence — so silence is the honest answer and the field simply
stops moving. `toNodeClaimed` is never retroactively flipped, and the
settlement receipt taken at rest is never rewritten (the upgrade lands on the
live record and rides ALONGSIDE the receipt — see docs/design/answer-grammar.md).

***

### askId?

> `optional` **askId?**: `string`

Defined in: [src/atom/types.ts:1336](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1336)

Set when this fire was authorized by a high-effect confirm ask — the
[ConfirmRecord](/api/index/interfaces/ConfirmRecord) `askId` it closes. Makes the ask → decision → fire
chain auditable from the transition log alone (a committed high-effect
action can be traced back to the receipts a human approved). Absent on a
fire that never went through a confirm gate (e.g. a low-effect action, or
a human clicking the button directly with no ask outstanding).

***

### attribution

> **attribution**: [`Attribution`](/api/index/interfaces/Attribution)

Defined in: [src/atom/types.ts:1237](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1237)

WHICH RUNG FILED THIS ROW, AND WHAT THAT IS WORTH — on every transition, of
every kind, always. See [Attribution](/api/index/interfaces/Attribution).

Not part of `cause`, deliberately: `cause` says WHAT this row is (a fire, a
stimulus) and carries bytes consumers have read since 0.1. This says how the
library came to believe it, which is a different question with a different
answer — and on a stimulus nobody attributed the two honestly disagree
(`cause.principal: 'system'`, `attribution.principal: 'unknown'`).

***

### captured?

> `optional` **captured?**: [`ActionCapture`](/api/index/interfaces/ActionCapture)

Defined in: [src/atom/types.ts:1411](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1411)

D21 — THE CAPTURE ENVELOPE, present only on a fire of a `contextful()`
action: what was true the moment before it ran, how it came to rest, what
went wrong, and what its anchor saw while it was in flight.

DATA CHANNEL, ALWAYS. Nothing in here is ever composed into agent-facing
prose — not a brief, not a tool description, not a result sentence — which
is what makes it safe for it to describe a page the library does not
control. And nothing in here carries a value the app did not allowlist: key
NAMES and event TYPES are the default, and `include` is the only door out of
it (see `ContextfulOptions`).

`before` and `after`/`failure` are stamped by the fire itself, so a
settlement receipt carries them; `sensed` lands one turn later on the LIVE
record, exactly as an `arrival: 'observed'` upgrade does, because a receipt
taken at rest is never rewritten.

***

### cause

> **cause**: [`Cause`](/api/index/interfaces/Cause)

Defined in: [src/atom/types.ts:1226](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1226)

***

### cursorVersion

> **cursorVersion**: `number`

Defined in: [src/atom/types.ts:1327](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1327)

Cursor version when the transition was created.

***

### effectVerified?

> `optional` **effectVerified?**: `boolean` \| `"unobservable"`

Defined in: [src/atom/types.ts:1267](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1267)

Whether every DECLARED write key was present in the settled delta.
'unobservable' when the affordance declared no writes. This checks key
presence only — not values, extra writes, or navigation claims.

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1269](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1269)

Guard evidence captured at fire time (why this edge was passable).

***

### fromNode

> **fromNode**: `string`

Defined in: [src/atom/types.ts:1270](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1270)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:1316](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1316)

Guard keys that could NOT be evaluated at fire time because the session's
state view never contained them (L0/L1 — no state tap for those keys).
The fire proceeded — the app remains the enforcer — but the record says
honestly which conditions were taken on faith (D18 rung-killer fix).

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1225](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1225)

runtimeStageId — the join key into the footprintjs commit log.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:1260](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1260)

The repeats-container card this fire named (`FireOptions.instance`), when
it named one. Recorded because a receipt that says WHAT was pressed but
not WHICH ROW cannot answer "did we already cancel order #57?" — the
blindness the duplicate-execution corpus row turned on. Absent on a fire
that named no card, and on every non-fire row.

***

### materialized?

> `optional` **materialized?**: `false`

Defined in: [src/atom/types.ts:1355](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1355)

Present (false) only on an allowed unmaterialized fire (the
`allowUnmaterializedFires` tour): the fire invoked NOTHING — nothing was
bound to execute it — so every effect on this record is a claim, including
any navigation. The same honesty stance as `toNodeClaimed` and
`guardUnevaluated`: absence means normal, a stamped false means the
library is telling you what it could not do.

***

### observations?

> `optional` **observations?**: [`ExternalObservation`](/api/index/interfaces/ExternalObservation)[]

Defined in: [src/atom/types.ts:1249](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1249)

WHAT SOMEBODY ELSE SAW about this fire's effect — every
[Session.observeEffect](/api/index/classes/Session#observeeffect) report, in arrival order, appended and never
rewritten. Absent until one arrives; a fire nobody reported on has no key,
which is the honest shape of "nothing was said".

The FIRST report decides the settlement; later ones ride the live record
beside a receipt that is never rewritten (the `arrival: 'observed'`
precedent). Nothing here is proof the effect happened — it is proof a source
the app named reported that it did.

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/atom/types.ts:1346](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1346)

The served row this fire cited ([FireOptions.offerId](/api/index/interfaces/FireOptions#offerid)), when it cited
one. Recorded whether or not any freshness axis enforces, because it is a
fact about the fire: this occurrence was planned against that row, and the
join from here to `session.offerFor(offerId)` — and on to any
[StaleAcknowledgement](/api/index/interfaces/StaleAcknowledgement) naming the same offer — is what makes the chain
auditable from the transition log alone, exactly as `askId` does for the
confirm chain. Absent on a fire that cited nothing.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:1261](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1261)

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:1252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1252)

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:1325](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1325)

Data the fired handler RETURNED (search results, a looked-up record) —
sanitized + capped. This is the "act → get data back" channel: an action
that produces something the agent needs to pick from (a list of ids to
open next) hands it back here. It rides the DATA channel, so untrusted
content (user-generated names) is safe — it is never planner instructions.
Populated once the handler resolves (await the settlement to read it).

***

### repeated?

> `optional` **repeated?**: `object`

Defined in: [src/atom/types.ts:1390](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1390)

THIS FIRE WAS A KNOWING SECOND OCCURRENCE of a `mode: 'once'` action, let
through because a person acted on the screen after the first occurrence's
receipt. The same object rides `FireResult.repeated` (see there for the
fields' law); on the ROW so the trace shows the repeat was judged
legitimate, never that the gate missed it.

#### personActedSince

> **personActedSince**: `object`

##### personActedSince.basis

> **basis**: [`AttributionBasis`](/api/index/type-aliases/AttributionBasis)

##### personActedSince.transitionId

> **transitionId**: `string`

#### priorTransitionId

> **priorTransitionId**: `string`

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:1251](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1251)

Epoch milliseconds when the transition was created.

***

### toNode?

> `optional` **toNode?**: `string`

Defined in: [src/atom/types.ts:1271](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1271)

***

### toNodeClaimed?

> `optional` **toNodeClaimed?**: `boolean`

Defined in: [src/atom/types.ts:1276](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1276)

True when toNode came from the affordance's declared navigatesTo — a
CLAIM about the app, not an observation. sync() records observations.

***

### unverifiedEdge?

> `optional` **unverifiedEdge?**: `boolean`

Defined in: [src/atom/types.ts:1309](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1309)

True on sync()-recorded hops: the cursor moved without passing any guard.
Backward slices must treat the hop as inferred, not authorized.
