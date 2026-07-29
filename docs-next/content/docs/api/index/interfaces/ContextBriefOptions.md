---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1103](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1103)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1107](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1107)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1105](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1105)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
