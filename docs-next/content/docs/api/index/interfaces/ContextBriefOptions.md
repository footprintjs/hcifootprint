---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1760](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1760)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1764](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1764)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1762](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1762)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
