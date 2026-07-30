---
title: GroundTruthOptions
---

# Interface: GroundTruthOptions

Defined in: [src/atom/types.ts:1597](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1597)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [src/atom/types.ts:1606](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1606)

Cap on rendered attempts (default 20); older ones collapse into an omitted
count. The same number bounds the "awaiting the human" cards listed below
them — the other line an agent can mint at will — so one dial says how long
this block may get.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1599](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1599)

Only include attempts made at or after this cursor version ("since your last turn").
