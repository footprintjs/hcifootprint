---
title: GroundTruthOptions
---

# Interface: GroundTruthOptions

Defined in: [src/atom/types.ts:1126](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1126)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [src/atom/types.ts:1130](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1130)

Cap on rendered attempts (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1128](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1128)

Only include attempts made at or after this cursor version ("since your last turn").
