---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:3375](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3375)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:3379](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3379)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3377](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3377)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
