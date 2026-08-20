---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1854](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1854)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1856](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1856)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1863](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1863)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1859](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1859)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1855](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1855)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1858](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1858)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1861](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1861)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1857](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1857)
