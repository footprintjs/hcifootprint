---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1067](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1067)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1075](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1075)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1074](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1074)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1069](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1069)

Settle THIS pending transition (precise attribution — preferred over FIFO).
