---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:3220](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3220)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:3224](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3224)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3222](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3222)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
