---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:3347](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3347)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:3351](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3351)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3349](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3349)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
