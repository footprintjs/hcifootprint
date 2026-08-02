---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1072](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1072)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1080](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1080)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1079](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1079)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1074](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1074)

Settle THIS pending transition (precise attribution — preferred over FIFO).
