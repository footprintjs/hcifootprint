---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1360](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1360)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1364](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1364)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1362](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1362)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
