---
title: GroundTruthOptions
---

# Interface: GroundTruthOptions

Defined in: [src/atom/types.ts:1116](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1116)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [src/atom/types.ts:1120](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1120)

Cap on rendered attempts (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1118](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1118)

Only include attempts made at or after this cursor version ("since your last turn").
