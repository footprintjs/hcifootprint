---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:3378](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3378)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:3382](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3382)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3380](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3380)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
