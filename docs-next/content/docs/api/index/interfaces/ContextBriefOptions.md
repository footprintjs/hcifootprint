---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:2222](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2222)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:2226](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2226)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:2224](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2224)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
