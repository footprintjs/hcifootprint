---
title: GroundTruthOptions
---

# Interface: GroundTruthOptions

Defined in: [src/atom/types.ts:3197](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3197)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [src/atom/types.ts:3206](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3206)

Cap on rendered attempts (default 20); older ones collapse into an omitted
count. The same number bounds the "awaiting the human" cards listed below
them — the other line an agent can mint at will — so one dial says how long
this block may get.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3199](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3199)

Only include attempts made at or after this cursor version ("since your last turn").
