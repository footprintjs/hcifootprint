---
title: Cause
---

# Interface: Cause

Defined in: [src/atom/types.ts:44](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L44)

Why a transition exists.
- `fired`   — an affordance was fired through the driver (guard-checked).
- `stimulus`— the world moved without an offered edge (back button, server
              push, session expiry). Recorded, never silent.

## Properties

### affordanceId?

> `optional` **affordanceId?**: `string`

Defined in: [src/atom/types.ts:48](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L48)

Set when kind === 'fired'.

***

### does?

> `optional` **does?**: `string`

Defined in: [src/atom/types.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L73)

THE AUTHORED SENTENCE FOR THAT ACTION, FROZEN AT THIS MOMENT — the
affordance's own `does`, copied off the spec as this row was minted.

A NAME IS EVIDENCE CAPTURED AT ITS MOMENT, and this field is that law
written down. Every history render used to answer "is this a real action?"
by looking the id up in the spec AS IT STANDS WHEN YOU READ — which is a
different question, and it has a different answer the instant a component
unmounts. THE FIELD FAILURE: a compose pane mount-declares `send`, an agent
fires it, the pane unmounts; the merged spec drops the id, and
`groundTruth()` then called a genuinely-fired action *(an action this app
does not have)* while `contextBrief()` printed its description as ''. The
app authored it and the library forgot it.

PRESENCE-ONLY, and absence is a fact rather than a gap: this row's action
was NOT declared at the moment the row was made — which is exactly what a
refused fire of an id the graph never had should say.

IT COMES FROM THE SPEC AND NOWHERE ELSE. Never from a fire's arguments,
never from a payload, never from a caller's string: this is the authored
channel, and caller text entering it is the injection this library spends
its [RedactedFields](/api/index/interfaces/RedactedFields) and its `(an action this app does not have)`
constant refusing.

***

### inferred?

> `optional` **inferred?**: `boolean`

Defined in: [src/atom/types.ts:81](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L81)

True when the attribution was GUESSED by effect-signature inference (an
unattributed delta matched exactly one registered affordance's declared
writes) rather than observed. Honesty marker — never laundered as fact.

***

### kind

> **kind**: `"fired"` \| `"stimulus"`

Defined in: [src/atom/types.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L45)

***

### principal

> **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:46](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L46)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:75](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L75)

Set when kind === 'stimulus'.
