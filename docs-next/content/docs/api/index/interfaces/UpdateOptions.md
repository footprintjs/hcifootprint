---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:2429](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2429)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:2437](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2437)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:2436](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2436)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:2431](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2431)

Settle THIS pending transition (precise attribution — preferred over FIFO).
