---
title: ActionLateSettlement
---

# Interface: ActionLateSettlement

Defined in: [src/action/types.ts:682](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L682)

A settlement that arrived after this transition's terminal was already
decided — kept and marked late, never adopted and never silently dropped.

First terminal wins, and the terminal never reopens. But the losing
evidence is still a FACT: a `verified` that arrived after an `abandoned`
is exactly the record an operator needs when deciding whether the
abandonment deadline is too aggressive. `claimed` is what the late caller
SAID — recorded as a claim, deliberately not validated as if it had been
accepted, because validation is a property of settlement and this was
never one.

## Properties

### claimed

> `readonly` **claimed**: `string`

Defined in: [src/action/types.ts:684](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L684)

The status the late caller claimed — a quotation, not a verdict.

***

### payload?

> `readonly` `optional` **payload?**: `unknown`

Defined in: [src/action/types.ts:686](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L686)

The evidence or reason it carried, snapshotted; absent when it carried none.
