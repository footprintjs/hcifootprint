---
title: WorkRow
---

# Interface: WorkRow

Defined in: [src/atom/types.ts:1178](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1178)

One piece of work the app has open RIGHT NOW ([Session.openWork](/api/index/classes/Session#openwork)) — the
sibling of [PendingInfo](/api/index/interfaces/PendingInfo) (fires awaiting the app's state report) and
[AskStatus](/api/index/interfaces/AskStatus) (cards awaiting a person).

THE HOLE IT FILLS. A fire can come to rest while the app is still working: an
upload that reports its delta and keeps uploading, a handler that hands off to
a background job, a save whose spinner outlives its receipt. Every list this
library had answered "nothing is live" about that — `pending()` had settled it,
`awaitingSettlement()` had dropped the latch — and a confident emptiness is
the one answer this library keeps closing. This row is the app saying so, in
the imperative voice it already has around its own async work.

IT IS THE APP'S CLAIM, and it is served as one. Nothing here verifies that
work is really running, nothing measures it, and nothing ends it: the row is
open until the app closes it.

## Properties

### affordanceId?

> `optional` **affordanceId?**: `string`

Defined in: [src/atom/types.ts:1194](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1194)

The action that fire was about, when the row is bound.

***

### label?

> `optional` **label?**: `string`

Defined in: [src/atom/types.ts:1187](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1187)

The app's own words for this work, when it gave any — DATA, and only data.
It is never rendered into an authored sentence, into `groundTruth()`, or
into the facts block: a runtime string in the one block a model is told to
trust above its own account is an instruction carrying the app's authority.
Capped like every other app string that crosses (200 characters).

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1207](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1207)

Who the bound fire was charged to. `'system'` on an UNBOUND row — not a
guess about who is working, but the honest floor: nobody said, and work
never runs silently.

***

### startedAt

> **startedAt**: `number`

Defined in: [src/atom/types.ts:1201](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1201)

When the app opened the row, on the session's clock — DATA, for a caller
that wants to sort or render it. NOTHING IN THIS LIBRARY RENDERS A DURATION
FROM IT, and nothing expires a row because of it: a clock is never evidence,
and how long something has taken is neither done nor failed.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1192](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1192)

The fire this work is bound to. ABSENT MEANS UNBOUND — nothing said which
fire it belongs to, and nothing guessed one.

***

### workId

> **workId**: `string`

Defined in: [src/atom/types.ts:1179](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1179)
