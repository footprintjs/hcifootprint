---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1883](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1883)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1887](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1887)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1885](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1885)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
