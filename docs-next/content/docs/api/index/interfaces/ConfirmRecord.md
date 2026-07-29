---
title: ConfirmRecord
---

# Interface: ConfirmRecord

Defined in: [src/atom/types.ts:847](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L847)

One row of the confirm journal: the auditable trail of high-effect asks and
how they were answered. A needs-confirm ask lands an `'ask'` row (carrying
its receipts); the human's answer lands `'approved'` (the confirmed fire,
linked by `transitionId`) or `'declined'`. The three rows of one gate share
an `askId`.

Kept SEPARATE from the gap ledger by design: a gated action is not unmet
demand — the capability exists, it awaited consent — so mixing the two would
poison the "what to build next" triage signal the gap ledger feeds. Rows are
token-lean and injection-safe (ids + structural facts; the only free text,
`note`, is length-capped, and `receipts` carries authored strings only).

## Properties

### affordanceId

> **affordanceId**: `string`

Defined in: [src/atom/types.ts:851](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L851)

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:850](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L850)

Links the ask → decision → fire rows of one high-effect gate.

***

### by?

> `optional` **by?**: `string`

Defined in: [src/atom/types.ts:866](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L866)

Who answered — an operator id, an email, your host's label. Optional.

***

### kind

> **kind**: `"ask"` \| `"approved"` \| `"declined"`

Defined in: [src/atom/types.ts:848](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L848)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:854](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L854)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:868](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L868)

Free-text note (length-capped). On a decline, typically why.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:857](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L857)

Who asked ('ask'), or the principal that recorded the decision.

***

### receipts?

> `optional` **receipts?**: [`ConfirmReceipts`](/api/index/interfaces/ConfirmReceipts)

Defined in: [src/atom/types.ts:860](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L860)

The receipts that rode this ask (present on 'ask' rows).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:853](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L853)

Epoch milliseconds when the row was recorded.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:863](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L863)

The TransitionRecord.id of the fire this approval authorized.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:855](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L855)
