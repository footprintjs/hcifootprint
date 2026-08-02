---
title: Journey
---

# Interface: Journey

Defined in: [src/atom/types.ts:265](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L265)

One compiled journey: [JourneySpec](/api/index/interfaces/JourneySpec) with the id it is filed under.

## Extends

- [`JourneySpec`](/api/index/interfaces/JourneySpec)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:197](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L197)

AUTHORED planner-facing text (same string class as affordance descriptions).

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`description`](/api/index/interfaces/JourneySpec#description)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:266](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L266)

***

### precondition?

> `optional` **precondition?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:200](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L200)

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`precondition`](/api/index/interfaces/JourneySpec#precondition)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:199](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L199)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`steps`](/api/index/interfaces/JourneySpec#steps)
