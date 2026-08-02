---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1757](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1757)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1761](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1761)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1759](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1759)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
