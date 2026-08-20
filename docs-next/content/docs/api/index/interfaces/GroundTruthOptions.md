---
title: GroundTruthOptions
---

# Interface: GroundTruthOptions

Defined in: [src/atom/types.ts:3243](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3243)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [src/atom/types.ts:3252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3252)

Cap on rendered attempts (default 20); older ones collapse into an omitted
count. The same number bounds the "awaiting the human" cards listed below
them — the other line an agent can mint at will — so one dial says how long
this block may get.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3245](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3245)

Only include attempts made at or after this cursor version ("since your last turn").
