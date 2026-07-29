---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:738](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L738)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:746](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L746)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:745](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L745)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:740](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L740)

Settle THIS pending transition (precise attribution — preferred over FIFO).
