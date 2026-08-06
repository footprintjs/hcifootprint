---
title: ConfirmWillUse
---

# Interface: ConfirmWillUse

Defined in: [src/atom/types.ts:1755](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1755)

WHAT THIS FIRE WILL SEND — the input on the ask card, so the human approves an
object and not just a verb.

The one RUNTIME value in the receipts pack, and it is here because sharpening
the gate required it: a human approved the affordance AND the input they were
shown, so the input has to be in the pack the serving layer relays to the
person. Allowed by the serve layer's own two-string-class rule — runtime values
ride structured DATA fields (serve/modes.ts), never authored prose.

NOT a digest. The gate recomputes the comparison from these values at fire
time, so there is one source of truth and nothing that can fall out of sync —
and an auditor holding an exported journal can recompute the same comparison.

A NEW EXPOSURE SURFACE, said plainly: the input now rides the receipts to the
model, to the human, and into the journal export. That is the point of it — a
receipt that hides the amount is worse than useless. An input carrying a secret
is therefore in the receipts pack by default: `redactedKeys` governs state keys
and never governed a payload, here or on `TransitionRecord.payload`.

WHAT TO DO ABOUT IT: [RedactedFields](/api/index/interfaces/RedactedFields), through
`SessionOptions.redactedFields.payload` — name the paths and they arrive as the
`'[REDACTED]'` marker here AND on the record, one list for every rendering of
the one value. Off unless asked, because the field a person must see to approve
is exactly the field a default could not be trusted to pick. The gate's own
comparison is untouched: it binds to the detached copy in `bound-input.ts`, not
to what is rendered here.

Bounded like every other captured value (depth/breadth/length caps). An input
too large to hold faithfully is still shown truncated — and the gate then
refuses to judge a match against it rather than comparing two truncations.

## Properties

### input?

> `optional` **input?**: `unknown`

Defined in: [src/atom/types.ts:1757](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1757)

The payload the confirmed fire will carry. Absent for an input-less action.

***

### instance?

> `optional` **instance?**: `string`

Defined in: [src/atom/types.ts:1759](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1759)

The row/instance the card is about (an order id), when the action takes one.
