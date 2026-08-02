---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:834](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L834)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:836](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L836)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:843](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L843)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:839](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L839)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:835](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L835)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:838](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L838)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:841](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L841)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:837](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L837)
