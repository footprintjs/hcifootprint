---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:2402](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2402)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2410](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2410)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:2409](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2409)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:2404](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2404)

Settle THIS pending transition (precise attribution — preferred over FIFO).
