---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1252)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1260](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1260)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1259](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1259)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1254](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1254)

Settle THIS pending transition (precise attribution — preferred over FIFO).
