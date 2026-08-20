---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:2433](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2433)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2441](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2441)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:2440](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2440)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:2435](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2435)

Settle THIS pending transition (precise attribution — preferred over FIFO).
