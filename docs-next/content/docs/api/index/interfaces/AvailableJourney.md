---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1904](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1904)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1906](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1906)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1913](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1913)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1909](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1909)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1905](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1905)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1908](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1908)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1911](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1911)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1907](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1907)
