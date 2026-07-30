---
title: AvailableSkill
---

# Interface: AvailableSkill

Defined in: [src/atom/types.ts:617](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L617)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:619](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L619)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:626](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L626)

Whether the skill's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:622](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L622)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:618](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L618)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:621](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L621)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:624](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L624)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:620](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L620)
