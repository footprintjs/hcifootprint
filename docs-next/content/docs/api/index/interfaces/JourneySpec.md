---
title: JourneySpec
---

# Interface: JourneySpec

Defined in: [src/atom/types.ts:537](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L537)

A journey in the COMPILED vocabulary, before its id is attached — the shape
that lands in [NavigationGraphSpec.journeys](/api/index/interfaces/NavigationGraphSpec#journeys) as a [Journey](/api/index/interfaces/Journey).

Not to be confused with `JourneyDef` (tree/types.ts), which is the AUTHORING
shape: authors write `does`/`when`, the compiler emits `description`/
`precondition`. Two vocabularies, two names, one thing — the dual identity
this whole layer is built on (navigation in, journey graph out).

## Extended by

- [`Journey`](/api/index/interfaces/Journey)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:539](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L539)

AUTHORED planner-facing text (same string class as affordance descriptions).

***

### precondition?

> `optional` **precondition?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:542](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L542)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:541](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L541)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.
