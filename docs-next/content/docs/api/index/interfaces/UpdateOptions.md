---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:840](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L840)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:848](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L848)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:847](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L847)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:842](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L842)

Settle THIS pending transition (precise attribution — preferred over FIFO).
