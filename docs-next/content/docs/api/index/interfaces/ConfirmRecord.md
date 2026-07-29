---
title: ConfirmRecord
---

# Interface: ConfirmRecord

Defined in: [src/atom/types.ts:827](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L827)

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

Defined in: [src/atom/types.ts:831](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L831)

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:830](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L830)

Links the ask → decision → fire rows of one high-effect gate.

***

### by?

> `optional` **by?**: `string`

Defined in: [src/atom/types.ts:846](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L846)

Who answered — an operator id, an email, your host's label. Optional.

***

### kind

> **kind**: `"ask"` \| `"approved"` \| `"declined"`

Defined in: [src/atom/types.ts:828](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L828)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:834](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L834)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:848](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L848)

Free-text note (length-capped). On a decline, typically why.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:837](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L837)

Who asked ('ask'), or the principal that recorded the decision.

***

### receipts?

> `optional` **receipts?**: [`ConfirmReceipts`](/api/index/interfaces/ConfirmReceipts)

Defined in: [src/atom/types.ts:840](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L840)

The receipts that rode this ask (present on 'ask' rows).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:833](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L833)

Epoch milliseconds when the row was recorded.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:843](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L843)

The TransitionRecord.id of the fire this approval authorized.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:835](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L835)
