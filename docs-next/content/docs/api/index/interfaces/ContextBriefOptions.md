---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:973](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L973)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:977](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L977)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:975](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L975)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
