---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:2117](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2117)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:2121](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2121)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:2119](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2119)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
