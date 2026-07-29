---
title: GroundTruthOptions
---

# Interface: GroundTruthOptions

Defined in: [src/atom/types.ts:1107](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1107)

## Properties

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [src/atom/types.ts:1111](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1111)

Cap on rendered attempts (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1109](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1109)

Only include attempts made at or after this cursor version ("since your last turn").
