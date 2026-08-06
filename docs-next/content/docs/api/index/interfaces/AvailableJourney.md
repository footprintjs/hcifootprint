---
title: AvailableJourney
---

# Interface: AvailableJourney

Defined in: [src/atom/types.ts:1827](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1827)

## Properties

### description

> **description**: `string`

Defined in: [src/atom/types.ts:1829](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1829)

***

### entryAvailable

> **entryAvailable**: `boolean`

Defined in: [src/atom/types.ts:1836](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1836)

Whether the journey's first step is available right now (on-node + guard).

***

### evidence

> **evidence**: `FilterCondition`[]

Defined in: [src/atom/types.ts:1832](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1832)

***

### id

> **id**: `string`

Defined in: [src/atom/types.ts:1828](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1828)

***

### preconditionPassed

> **preconditionPassed**: `boolean`

Defined in: [src/atom/types.ts:1831](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1831)

***

### preconditionUnevaluable?

> `optional` **preconditionUnevaluable?**: `string`[]

Defined in: [src/atom/types.ts:1834](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1834)

Precondition keys absent from the state view — feasibility unknown, said so.

***

### steps

> **steps**: `string`[]

Defined in: [src/atom/types.ts:1830](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1830)
