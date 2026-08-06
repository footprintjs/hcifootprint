---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1093](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1093)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1095](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1095)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1102](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1102)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1098](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1098)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1094](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1094)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1097](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1097)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1100](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1100)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1096](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1096)
