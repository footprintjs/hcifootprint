---
title: RedactedFields
---

# Interface: RedactedFields

Defined in: [src/atom/types.ts:510](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L510)

WHICH FIELDS TO HIDE INSIDE THE DATA A TRANSITION CARRIES — the redaction
`redactedKeys` never did.

`redactedKeys` governs STATE keys. These govern the values that ride the
record and the receipts: a fire's payload and a handler's return. Dot paths,
exactly footprintjs's `RedactionPolicy.fields` grammar (`'payment.token'`), and
a named field that is present is replaced by the literal `'[REDACTED]'` — a
marker, never a drop, so a reader can tell hidden from empty.

OPT-IN, AND YOU AIM IT. Two lists rather than one, because the two channels
have opposite duties. `produced` is data the app hands back and no human
decision rests on it. `payload` is what a person APPROVES — and this library
cannot tell the human from the model at that boundary (see below), so hiding a
field there hides it from the approval card too. Naming a field must therefore
be a separate, deliberate act per channel; one list would let "hide the token
the API returned" quietly blank the amount on somebody's confirm card.

THE AUDIENCES ARE NOT SEPARABLE HERE, said plainly. `confirmAsk()` returns ONE
receipts pack to ONE caller, and over Mode B / MCP that caller is the model,
which the library then instructs to show the human. There is no second channel
this library could send an unredacted card down, so there is no per-audience
redaction to offer: redact a field and it is gone for the model, for the person
reading the model's rendering, and for the journal export alike. An app that
draws its own approval card is unaffected — it passed the input in, so it still
holds it — which is the honest place to show a value the model must not see.

WHAT STAYS UNREDACTED, ON PURPOSE. The approval gate's own comparison. The ask
binds to a faithful detached copy the caller cannot reach (`bound-input.ts`) and
the gate compares the fire's payload against THAT — never against the rendered
receipts. So the enforced-consent gate keeps proving the real values while the
rendered copies carry markers, and hiding a field can never turn a mismatch
into a match. One consequence worth stating: an auditor holding an exported
journal can still recompute the comparison for every field they can see, and
for a hidden one the marker tells them exactly which field they cannot judge.

## Properties

### payload?

> `optional` **payload?**: `string`[]

Defined in: [src/atom/types.ts:518](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L518)

Paths inside the value a fire CARRIES. Governs every rendering of it at once
— `TransitionRecord.payload`, `ConfirmWillUse.input`, and
[AvailableEdge.holds](/api/index/interfaces/AvailableEdge#holds), which is that same value one turn EARLY —
because a field hidden from the log that still rides the approval card (or
the action row the model reads before it fires) is not hidden.

***

### produced?

> `optional` **produced?**: `string`[]

Defined in: [src/atom/types.ts:525](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L525)

Paths inside the value a handler RETURNS
([TransitionRecord.produced](/api/index/interfaces/TransitionRecord#produced)): the act → get-data-back channel, which
reaches the model through `producedFor()`, the settlement, and any export.
`captureProduced: false` remains the switch for "capture none of it".
