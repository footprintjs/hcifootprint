---
title: AvailableSkill
---

# Interface: AvailableSkill

Defined in: [src/atom/types.ts:676](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L676)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:678](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L678)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:685](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L685)

Whether the skill's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:681](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L681)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:677](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L677)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:680](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L680)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:683](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L683)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:679](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L679)
