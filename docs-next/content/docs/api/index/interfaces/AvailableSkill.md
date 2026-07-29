---
title: AvailableSkill
---

# Interface: AvailableSkill

Defined in: [src/atom/types.ts:469](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L469)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:471](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L471)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:478](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L478)

Whether the skill's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:474](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L474)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:470](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L470)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:473](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L473)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:476](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L476)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:472](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L472)
