---
title: ActionLateSettlement
---

# Interface: ActionLateSettlement

Defined in: [src/action/types.ts:621](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L621)

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

Defined in: [src/action/types.ts:623](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L623)

The status the late caller claimed — a quotation, not a verdict.

***

### payload?

> `readonly` `optional` **payload?**: `unknown`

Defined in: [src/action/types.ts:625](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L625)

The evidence or reason it carried, snapshotted; absent when it carried none.
