---
title: TransitionRecord
---

# Interface: TransitionRecord

Defined in: [src/atom/types.ts:468](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L468)

One occurrence: a row in the interaction log. SETTLED (and stimulus/sync)
transitions join 1:1 to a CommitBundle by `id`; pending and
rejected/rolled-back rows exist only here — that asymmetry is deliberate
(a rejected effect never touched state, so it has no commit).

## Properties

### askId?

> `optional` **askId?**: `string`

Defined in: [src/atom/types.ts:522](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L522)

Set when this fire was authorized by a high-effect confirm ask — the
[ConfirmRecord](/api/index/interfaces/ConfirmRecord) `askId` it closes. Makes the ask → decision → fire
chain auditable from the transition log alone (a committed high-effect
action can be traced back to the receipts a human approved). Absent on a
fire that never went through a confirm gate (e.g. a low-effect action, or
a human clicking the button directly with no ask outstanding).

***

### cause

> **cause**: [`Cause`](/api/index/interfaces/Cause)

Defined in: [src/atom/types.ts:471](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L471)

***

### cursorVersion

> **cursorVersion**: `number`

Defined in: [src/atom/types.ts:513](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L513)

Cursor version when the transition was created.

***

### effectVerified?

> `optional` **effectVerified?**: `boolean` \| `"unobservable"`

Defined in: [src/atom/types.ts:481](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L481)

Whether every DECLARED write key was present in the settled delta.
'unobservable' when the affordance declared no writes. This checks key
presence only — not values, extra writes, or navigation claims.

***

### evidence?

> `optional` **evidence?**: `FilterCondition`[]

Defined in: [src/atom/types.ts:483](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L483)

Guard evidence captured at fire time (why this edge was passable).

***

### fromNode

> **fromNode**: `string`

Defined in: [src/atom/types.ts:484](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L484)

***

### guardUnevaluated?

> `optional` **guardUnevaluated?**: `string`[]

Defined in: [src/atom/types.ts:502](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L502)

Guard keys that could NOT be evaluated at fire time because the session's
state view never contained them (L0/L1 — no state tap for those keys).
The fire proceeded — the app remains the enforcer — but the record says
honestly which conditions were taken on faith (D18 rung-killer fix).

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:470](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L470)

runtimeStageId — the join key into the footprintjs commit log.

***

### materialized?

> `optional` **materialized?**: `false`

Defined in: [src/atom/types.ts:531](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L531)

Present (false) only on an allowed unmaterialized fire (the
`allowUnmaterializedFires` tour): the fire invoked NOTHING — nothing was
bound to execute it — so every effect on this record is a claim, including
any navigation. The same honesty stance as `toNodeClaimed` and
`guardUnevaluated`: absence means normal, a stamped false means the
library is telling you what it could not do.

***

### outcome

> **outcome**: [`Settlement`](/api/index/type-aliases/Settlement)

Defined in: [src/atom/types.ts:475](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L475)

***

### payload?

> `optional` **payload?**: `unknown`

Defined in: [src/atom/types.ts:474](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L474)

***

### produced?

> `optional` **produced?**: `unknown`

Defined in: [src/atom/types.ts:511](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L511)

Data the fired handler RETURNED (search results, a looked-up record) —
sanitized + capped. This is the "act → get data back" channel: an action
that produces something the agent needs to pick from (a list of ids to
open next) hands it back here. It rides the DATA channel, so untrusted
content (user-generated names) is safe — it is never planner instructions.
Populated once the handler resolves (await the settlement to read it).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:473](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L473)

Epoch milliseconds when the transition was created.

***

### toNode?

> `optional` **toNode?**: `string`

Defined in: [src/atom/types.ts:485](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L485)

***

### toNodeClaimed?

> `optional` **toNodeClaimed?**: `boolean`

Defined in: [src/atom/types.ts:490](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L490)

True when toNode came from the affordance's declared navigatesTo — a
CLAIM about the app, not an observation. sync() records observations.

***

### unverifiedEdge?

> `optional` **unverifiedEdge?**: `boolean`

Defined in: [src/atom/types.ts:495](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L495)

True on sync()-recorded hops: the cursor moved without passing any guard.
Backward slices must treat the hop as inferred, not authorized.
