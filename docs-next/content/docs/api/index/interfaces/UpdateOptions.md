---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:2255](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2255)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2263](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2263)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:2262](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2262)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:2257](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2257)

Settle THIS pending transition (precise attribution — preferred over FIFO).
