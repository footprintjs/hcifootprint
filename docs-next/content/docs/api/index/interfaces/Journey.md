---
title: Journey
---

# Interface: Journey

Defined in: [src/atom/types.ts:840](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L840)

One compiled journey: [JourneySpec](/api/index/interfaces/JourneySpec) with the id it is filed under.

## Extends

- [`JourneySpec`](/api/index/interfaces/JourneySpec)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:539](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L539)

AUTHORED planner-facing text (same string class as affordance descriptions).

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`description`](/api/index/interfaces/JourneySpec#description)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:841](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L841)

***

### precondition?

> `optional` **precondition?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/atom/types.ts:542](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L542)

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`precondition`](/api/index/interfaces/JourneySpec#precondition)

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:541](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L541)

Affordance ids, in canonical order. v0: linear; step-DAG is roadmap.

#### Inherited from

[`JourneySpec`](/api/index/interfaces/JourneySpec).[`steps`](/api/index/interfaces/JourneySpec#steps)
