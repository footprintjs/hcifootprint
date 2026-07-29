---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:939](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L939)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:943](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L943)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:941](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L941)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
