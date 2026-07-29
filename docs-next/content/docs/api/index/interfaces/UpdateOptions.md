---
title: UpdateOptions
---

# Interface: UpdateOptions

Defined in: [src/atom/types.ts:729](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L729)

## Properties

### principal?

> `optional` **principal?**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/atom/types.ts:737](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L737)

***

### stimulus?

> `optional` **stimulus?**: [`StimulusKind`](/api/index/type-aliases/StimulusKind)

Defined in: [src/atom/types.ts:736](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L736)

Mark the delta as world-initiated. When set, the delta is NEVER
attributed to a pending fired transition — explicit attribution wins.

***

### transitionId?

> `optional` **transitionId?**: `string`

Defined in: [src/atom/types.ts:731](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L731)

Settle THIS pending transition (precise attribution — preferred over FIFO).
