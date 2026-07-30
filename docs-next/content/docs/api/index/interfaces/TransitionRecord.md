---
title: TransitionRecord
---

# Interface: TransitionRecord

Defined in: [src/atom/types.ts:542](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L542)

One occurrence: a row in the interaction log. SETTLED (and stimulus/sync)
transitions join 1:1 to a CommitBundle by `id`; pending and
rejected/rolled-back rows exist only here — that asymmetry is deliberate
(a rejected effect never touched state, so it has no commit).

## Properties

### arrival?

> `optional` **arrival?**: `"claimed"` \| `"observed"`

Defined in: [src/atom/types.ts:592](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L592)

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

Defined in: [src/atom/types.ts:624](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L624)

Set when this fire was authorized by a high-effect confirm ask — the
[ConfirmRecord](/api/index/interfaces/ConfirmRecord) `askId` it closes. Makes the ask → decision → fire
chain auditable from the transition log alone (a committed high-effect
action can be traced back to the receipts a human approved). Absent on a
fire that never went through a confirm gate (e.g. a low-effect action, or
a human clicking the button directly with no ask outstanding).

***

### cause

> **cause**: [`Cause`](/api/index/interfaces/Cause)

Defined in: [src/atom/types.ts:545](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L545)

***

### cursorVersion

> **cursorVersion**: `number`

Defined in: [src/atom/types.ts:615](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L615)

Cursor version when the transition was created.

***

### effectVerified?

> `optional` **effectVerified?**: `boolean` \| `"unobservable"`

Defined in: [src/atom/types.ts:555](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L555)

Whether every DECLARED write key was present in the settled delta.
'unobservable' when the affordance declared no writes. This checks key
presence only — not values, extra writes, or navigation claims.

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:557](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L557)

Guard evidence captured at fire time (why this edge was passable).

***

### fromNode

> **fromNode**: `string`

Defined in: [src/atom/types.ts:558](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L558)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:604](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L604)

Guard keys that could NOT be evaluated at fire time because the session's
state view never contained them (L0/L1 — no state tap for those keys).
The fire proceeded — the app remains the enforcer — but the record says
honestly which conditions were taken on faith (D18 rung-killer fix).

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:544](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L544)

runtimeStageId — the join key into the footprintjs commit log.

***

### materialized?

> `optional` **materialized?**: `false`

Defined in: [src/atom/types.ts:633](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L633)

Present (false) only on an allowed unmaterialized fire (the
`allowUnmaterializedFires` tour): the fire invoked NOTHING — nothing was
bound to execute it — so every effect on this record is a claim, including
any navigation. The same honesty stance as `toNodeClaimed` and
`guardUnevaluated`: absence means normal, a stamped false means the
library is telling you what it could not do.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:549](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L549)

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:548](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L548)

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:613](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L613)

Data the fired handler RETURNED (search results, a looked-up record) —
sanitized + capped. This is the "act → get data back" channel: an action
that produces something the agent needs to pick from (a list of ids to
open next) hands it back here. It rides the DATA channel, so untrusted
content (user-generated names) is safe — it is never planner instructions.
Populated once the handler resolves (await the settlement to read it).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:547](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L547)

Epoch milliseconds when the transition was created.

***

### toNode?

> `optional` **toNode?**: `string`

Defined in: [src/atom/types.ts:559](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L559)

***

### toNodeClaimed?

> `optional` **toNodeClaimed?**: `boolean`

Defined in: [src/atom/types.ts:564](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L564)

True when toNode came from the affordance's declared navigatesTo — a
CLAIM about the app, not an observation. sync() records observations.

***

### unverifiedEdge?

> `optional` **unverifiedEdge?**: `boolean`

Defined in: [src/atom/types.ts:597](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L597)

True on sync()-recorded hops: the cursor moved without passing any guard.
Backward slices must treat the hop as inferred, not authorized.
