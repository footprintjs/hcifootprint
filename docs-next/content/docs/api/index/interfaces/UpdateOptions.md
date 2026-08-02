---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1047](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1047)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1055](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1055)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1054](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1054)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1049](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1049)

Settle THIS pending transition (precise attribution — preferred over FIFO).
