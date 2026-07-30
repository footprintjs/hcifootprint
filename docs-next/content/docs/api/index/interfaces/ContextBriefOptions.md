---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1427](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1427)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1431](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1431)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1429](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1429)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
