---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1052](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1052)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1060](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1060)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1059](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1059)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1054](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1054)

Settle THIS pending transition (precise attribution — preferred over FIFO).
