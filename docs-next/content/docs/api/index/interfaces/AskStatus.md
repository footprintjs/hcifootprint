---
title: AskStatus
---

# Interface: AskStatus

Defined in: [src/atom/types.ts:1618](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1618)

One high-effect ask and what became of it — the rows [Session.asks](/api/index/classes/Session#asks)
serves, read at the moment you ask.

The READ side of the confirm journal, and it exists because deriving these
three fates from [ConfirmRecord](/api/index/interfaces/ConfirmRecord) rows means re-implementing library law
outside the library (which rows close which, what a `relayed` decline does
NOT close, when a yes is spent). A serving layer that re-derived it could
disagree with the gate about the same card, and a disagreement here reads to a
model as "the human already answered".

Structural facts only: no receipts, no input, no `by`. This is the answer to
"is anything waiting on a person?", not a second channel for the card.

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:1621](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1621)

The action the card is about.

***

### answer?

> `optional` **answer?**: `"approved"` \| `"declined"`

Defined in: [src/atom/types.ts:1629](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1629)

Absent means STILL OPEN — nobody has answered. An agent's relayed decline
under [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) leaves it absent, because
that report closes nothing.

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:1619](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1619)

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:1623](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1623)

Which row/instance the card is about, when the action takes one.

***

### spent?

> `optional` **spent?**: `boolean`

Defined in: [src/atom/types.ts:1631](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1631)

True once a fire has spent this approval. One yes authorizes one fire.

***

### stale?

> `optional` **stale?**: `true`

Defined in: [src/atom/types.ts:1642](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1642)

The human's yes is recorded and unspent, and the app's own
[HumanApprovalPolicy](/api/index/interfaces/HumanApprovalPolicy) will no longer let a fire cross on it — it ran
out, or the state moved since they looked. READ AT ANSWER TIME, from the same
function the gate uses, so this row and the refusal can never disagree.

Absent means nothing is known against the approval — including on every
session that declares no policy, where a yes never goes stale. The cure is a
fresh ask, and it is the only one: a decision is never overwritten.
