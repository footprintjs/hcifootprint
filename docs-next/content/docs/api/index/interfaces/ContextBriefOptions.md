---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:3379](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3379)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:3383](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3383)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:3381](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3381)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
