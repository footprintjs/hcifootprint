---
title: ConfirmRecord
---

# Interface: ConfirmRecord

Defined in: [src/atom/types.ts:991](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L991)

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

Defined in: [src/atom/types.ts:995](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L995)

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:994](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L994)

Links the ask → decision → fire rows of one high-effect gate.

***

### by?

> `optional` **by?**: `string`

Defined in: [src/atom/types.ts:1010](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1010)

Who answered — an operator id, an email, your host's label. Optional.

***

### kind

> **kind**: `"ask"` \| `"approved"` \| `"declined"`

Defined in: [src/atom/types.ts:992](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L992)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:998](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L998)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:1012](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1012)

Free-text note (length-capped). On a decline, typically why.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1001](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1001)

Who asked ('ask'), or the principal that recorded the decision.

***

### receipts?

> `optional` **receipts?**: [`ConfirmReceipts`](/api/index/interfaces/ConfirmReceipts)

Defined in: [src/atom/types.ts:1004](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1004)

The receipts that rode this ask (present on 'ask' rows).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:997](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L997)

Epoch milliseconds when the row was recorded.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1007](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1007)

The TransitionRecord.id of the fire this approval authorized.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:999](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L999)
