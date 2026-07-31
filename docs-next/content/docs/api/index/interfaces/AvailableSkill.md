---
title: AvailableSkill
---

# Interface: AvailableSkill

Defined in: [src/atom/types.ts:829](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L829)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:831](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L831)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:838](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L838)

Whether the skill's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:834](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L834)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:830](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L830)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:833](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L833)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:836](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L836)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:832](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L832)
