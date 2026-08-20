---
title: JourneyDef
---

# Interface: JourneyDef

Defined in: [src/tree/types.ts:325](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L325)

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

Defined in: [src/tree/types.ts:326](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L326)

***

### steps

> **steps**: (`string` \| \{ `step`: `string`; \})[]

Defined in: [src/tree/types.ts:343](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L343)

Steps by qualified path ('checkout.confirm-order.place-order') or
unambiguous suffix ('place-order').

THE OBJECT ELEMENT FORM — `{ step: 'place-order' }` — compiles identically
to the bare string and carries NOTHING beyond `step` in this release. It
exists because per-step conditional metadata has to have exactly ONE
authoring carrier: two features orbit it (a per-edge guard is designed and
parked), and deciding the carrier once means the next one lands as a new
optional field on a shape that already exists rather than as a second shape
competing with this one.

`humanDecides` is deliberately NOT one of them: ownership is a fact about
the CONTROL, declared on `ActionDef` and inherited by every journey that
names it.

***

### when?

> `optional` **when?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:344](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L344)
