---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:903](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L903)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:905](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L905)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:912](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L912)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:908](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L908)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:904](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L904)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:907](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L907)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:910](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L910)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:906](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L906)
