---
title: StaleAcknowledgement
---

# Interface: StaleAcknowledgement

Defined in: [src/atom/types.ts:1483](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1483)

A PROTOCOL STEP THE CALLER PERFORMED — the append-only row
`session.acknowledgeStale()` writes, and the only thing a `'require-ack'`
fire may cite.

WHAT IT PROVES AND WHAT IT DOES NOT. It proves that a caller, at this state
version, named this action (and optionally these keys) through this door. It
is NOT evidence that a model read a value, understood a consequence, weighed a
risk, or decided well — none of which is visible from here, and none of which
this library will ever claim on somebody's behalf. The library never serves a
value, so it can never conclude a value was understood. An acknowledgement is
an ACT, recorded because acts are all this layer can witness.

INVALIDATED WHEN THE WORLD MOVES AGAIN. The row stamps the state version it
was made at; once `session.stateVersion` moves past it, it authorizes nothing
and a fire citing it is refused `ACKNOWLEDGEMENT_STALE`. The row itself is
never deleted or edited — it stays in `session.acknowledgements()` as what it
always was, a thing somebody did at a moment. (The same stance
`HumanApprovalPolicy.refuseWhenWorldMoved` takes on a human's yes, and the
same comparison.)

## Properties

### acknowledgedAtStateVersion

> **acknowledgedAtStateVersion**: `number`

Defined in: [src/atom/types.ts:1505](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1505)

The state version this was made at. Moves past it and this row stops authorizing.

***

### acknowledgementId

> **acknowledgementId**: `string`

Defined in: [src/atom/types.ts:1485](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1485)

This row's id. Cite it as [FireOptions.acknowledgementId](/api/index/interfaces/FireOptions#acknowledgementid).

***

### actionId

> **actionId**: `string`

Defined in: [src/atom/types.ts:1487](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1487)

The action it is about.

***

### keys

> **keys**: `string`[]

Defined in: [src/atom/types.ts:1503](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1503)

The keys the caller NAMED. Empty means they named none, which this door
reads as "everything outstanding for this control" — so an empty list covers
whatever a later fire is refused over, and a named list covers exactly its
own names. What the caller said, not what happened to be on the ledger:
`cleared` is the bookkeeping answer and it is reported separately.

***

### offerId?

> `optional` **offerId?**: `string`

Defined in: [src/atom/types.ts:1489](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1489)

The offer it answers, when the caller named one — a join, never a requirement.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1495](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1495)

Who performed the step. Defaults to `'agent'`, never `'user'` — the same law
[FireOptions.source](/api/index/interfaces/FireOptions#source) keeps, because filing a machine's act under a
person is the one mistake a ledger must not make on its own.

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:1507](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1507)

Epoch ms.
