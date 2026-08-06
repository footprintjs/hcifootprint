---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1334](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1334)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1342](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1342)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1341](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1341)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1336](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1336)

Settle THIS pending transition (precise attribution — preferred over FIFO).
