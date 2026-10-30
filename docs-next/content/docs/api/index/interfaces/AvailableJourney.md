---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1902](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1902)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1904](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1904)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1911](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1911)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1907](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1907)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1903](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1903)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1906](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1906)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1909](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1909)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1905](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1905)
