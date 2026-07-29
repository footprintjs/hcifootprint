---
title: AvailableSkill
---

# Interface: AvailableSkill

Defined in: [src/atom/types.ts:563](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L563)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:565](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L565)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:572](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L572)

Whether the skill's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:568](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L568)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:564](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L564)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:567](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L567)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:570](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L570)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:566](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L566)
