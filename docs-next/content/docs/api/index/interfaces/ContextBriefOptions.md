---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:3174](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3174)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:3178](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3178)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3176](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3176)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
