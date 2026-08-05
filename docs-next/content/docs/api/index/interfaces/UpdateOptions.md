---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1317](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1317)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1325](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1325)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1324](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1324)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1319](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1319)

Settle THIS pending transition (precise attribution — preferred over FIFO).
