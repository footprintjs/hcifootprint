---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:2239](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2239)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:2243](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2243)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:2241](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2241)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
