---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1900](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1900)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1902](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1902)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1909](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1909)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1905](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1905)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1901](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1901)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1904](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1904)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1907](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1907)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1903](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1903)
