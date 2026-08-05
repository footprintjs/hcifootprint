---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1076](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1076)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1078](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1078)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1085](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1085)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1081](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1081)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1077](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1077)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1080](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1080)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1083](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1083)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1079](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1079)
