---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:986](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L986)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:994](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L994)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:993](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L993)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:988](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L988)

Settle THIS pending transition (precise attribution — preferred over FIFO).
