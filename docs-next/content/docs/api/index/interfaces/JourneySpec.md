---
title: JourneySpec
---

# Interface: JourneySpec

Defined in: [src/atom/types.ts:252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L252)

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

Defined in: [src/atom/types.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L254)

AUTHORED planner-facing text (same string class as affordance descriptions).

***

### precondition?

> `optional` **precondition?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:257](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L257)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:256](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L256)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.
