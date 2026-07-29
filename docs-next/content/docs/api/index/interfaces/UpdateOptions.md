---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:618](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L618)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:626](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L626)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:625](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L625)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:620](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L620)

Settle THIS pending transition (precise attribution — preferred over FIFO).
