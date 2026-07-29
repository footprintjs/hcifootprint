---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:611](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L611)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:619](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L619)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:618](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L618)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:613](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L613)

Settle THIS pending transition (precise attribution — preferred over FIFO).
