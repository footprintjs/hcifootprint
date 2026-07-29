---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1093](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1093)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1097](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1097)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1095](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1095)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
