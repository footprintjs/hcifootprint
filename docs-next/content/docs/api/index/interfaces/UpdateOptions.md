---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:899](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L899)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:907](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L907)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:906](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L906)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:901](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L901)

Settle THIS pending transition (precise attribution — preferred over FIFO).
