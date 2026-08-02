---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1014](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1014)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1016](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1016)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1023](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1023)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1019](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1019)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1015](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1015)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1018](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1018)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1021](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1021)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1017](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1017)
