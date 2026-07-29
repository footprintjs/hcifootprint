---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1084](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1084)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1088](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1088)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1086](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1086)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
