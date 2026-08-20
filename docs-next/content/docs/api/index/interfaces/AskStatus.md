---
title: AskStatus
---

# Interface: AskStatus

Defined in: [src/atom/types.ts:3071](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3071)

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

Defined in: [src/atom/types.ts:3074](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3074)

The action the card is about.

***

### answer?

> `optional` **answer?**: `"approved"` \| `"declined"`

Defined in: [src/atom/types.ts:3090](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3090)

Absent means STILL OPEN — nobody has answered. An agent's relayed decline
under [SessionOptions.requireHumanApproval](/api/index/interfaces/SessionOptions#requirehumanapproval) leaves it absent, because
that report closes nothing.

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:3072](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3072)

***

### does?

> `optional` **does?**: `string`

Defined in: [src/atom/types.ts:3082](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3082)

What the app said that action does, frozen when the card was assembled —
see [Cause.does](/api/index/interfaces/Cause#does). A card outlives the render that raised it (a person
is slower than a re-render), so the ask carries its own name rather than
asking a spec that may have moved. Absent when the card was raised about an
id the graph did not have.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:3084](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3084)

Which row/instance the card is about, when the action takes one.

***

### revoked?

> `optional` **revoked?**: `true`

Defined in: [src/atom/types.ts:3113](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3113)

THE ASK BOOK'S THIRD WORD: the human gave this yes and took it back before
anything spent it ([Session.revokeAsk](/api/index/classes/Session#revokeask)). `answer` stays `'approved'`
— the receipt taken at rest is never rewritten — and this marker beside it
is the withdrawal, as data. A fire presenting the card refuses
`APPROVAL_REVOKED`; the cure is a fresh ask. Never present beside
`spent: true`: revoking a spent yes is refused, because it cannot un-fire
the past.

***

### spent?

> `optional` **spent?**: `boolean`

Defined in: [src/atom/types.ts:3092](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3092)

True once a fire has spent this approval. One yes authorizes one fire.

***

### stale?

> `optional` **stale?**: `true`

Defined in: [src/atom/types.ts:3103](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3103)

The human's yes is recorded and unspent, and the app's own
[HumanApprovalPolicy](/api/index/interfaces/HumanApprovalPolicy) will no longer let a fire cross on it — it ran
out, or the state moved since they looked. READ AT ANSWER TIME, from the same
function the gate uses, so this row and the refusal can never disagree.

Absent means nothing is known against the approval — including on every
session that declares no policy, where a yes never goes stale. The cure is a
fresh ask, and it is the only one: a decision is never overwritten.
