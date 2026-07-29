---
title: ConfirmRecord
---

# Interface: ConfirmRecord

Defined in: [src/atom/types.ts:861](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L861)

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

Defined in: [src/atom/types.ts:865](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L865)

***

### askId

> **askId**: `string`

Defined in: [src/atom/types.ts:864](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L864)

Links the ask → decision → fire rows of one high-effect gate.

***

### by?

> `optional` **by?**: `string`

Defined in: [src/atom/types.ts:880](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L880)

Who answered — an operator id, an email, your host's label. Optional.

***

### kind

> **kind**: `"ask"` \| `"approved"` \| `"declined"`

Defined in: [src/atom/types.ts:862](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L862)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:868](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L868)

***

### note?

> `optional` **note?**: `string`

Defined in: [src/atom/types.ts:882](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L882)

Free-text note (length-capped). On a decline, typically why.

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:871](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L871)

Who asked ('ask'), or the principal that recorded the decision.

***

### receipts?

> `optional` **receipts?**: [`ConfirmReceipts`](/api/index/interfaces/ConfirmReceipts)

Defined in: [src/atom/types.ts:874](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L874)

The receipts that rode this ask (present on 'ask' rows).

***

### timestamp

> **timestamp**: `number`

Defined in: [src/atom/types.ts:867](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L867)

Epoch milliseconds when the row was recorded.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:877](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L877)

The TransitionRecord.id of the fire this approval authorized.

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:869](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L869)
