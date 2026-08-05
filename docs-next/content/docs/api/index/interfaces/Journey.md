---
title: Journey
---

# Interface: Journey

Defined in: [src/atom/types.ts:457](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L457)

One compiled journey: [JourneySpec](/api/index/interfaces/JourneySpec) with the id it is filed under.

## Extends

- [`JourneySpec`](/api/index/interfaces/JourneySpec)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L254)

AUTHORED planner-facing text (same string class as affordance descriptions).

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`description`](/api/index/interfaces/JourneySpec#description)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:458](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L458)

***

### precondition?

> `optional` **precondition?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:257](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L257)

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`precondition`](/api/index/interfaces/JourneySpec#precondition)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:256](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L256)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`steps`](/api/index/interfaces/JourneySpec#steps)
