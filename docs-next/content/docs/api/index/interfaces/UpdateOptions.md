---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:2301](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2301)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2309](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2309)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:2308](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2308)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:2303](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2303)

Settle THIS pending transition (precise attribution — preferred over FIFO).
