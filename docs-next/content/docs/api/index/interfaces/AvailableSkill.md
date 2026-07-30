---
title: AvailableSkill
---

# Interface: AvailableSkill

Defined in: [src/atom/types.ts:763](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L763)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:765](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L765)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:772](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L772)

Whether the skill's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:768](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L768)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:764](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L764)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:767](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L767)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:770](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L770)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:766](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L766)
