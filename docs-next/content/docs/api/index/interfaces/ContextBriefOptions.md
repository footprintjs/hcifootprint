---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1574](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1574)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1578](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1578)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1576](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1576)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
