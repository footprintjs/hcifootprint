---
title: JourneyDef
---

# Interface: JourneyDef

Defined in: [src/tree/types.ts:124](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L124)

A named multi-step flow, in the navigation graph's authoring vocabulary.

Named for the person WRITING it: a journey is the path someone takes through
the app ("sign up", "buy a dress end to end"). What the agent reads is the
COMPILED journey — `does` becomes its description, `when` its precondition,
suffix steps resolve to qualified ids — which is the dual identity this
whole authoring layer is built on (navigation in, journey graph out). The two
vocabularies keep separate names on purpose: the compiled shape is
[Journey](/api/index/interfaces/Journey) (`JourneySpec` before its id is attached).
An app that already keeps a journey list feeds it in with `fromJourneys()`.

## Properties

### does

> **does**: `string`

Defined in: [src/tree/types.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L125)

***

### steps

> **steps**: `string`[]

Defined in: [src/tree/types.ts:127](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L127)

Steps by qualified path ('checkout.confirm-order.place-order') or unambiguous suffix ('place-order').

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:128](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L128)
