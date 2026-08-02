---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:809](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L809)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:811](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L811)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:818](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L818)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:814](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L814)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:810](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L810)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:813](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L813)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:816](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L816)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:812](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L812)
