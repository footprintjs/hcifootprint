---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:1141](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1141)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:1149](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1149)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:1148](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1148)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:1143](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1143)

Settle THIS pending transition (precise attribution — preferred over FIFO).
