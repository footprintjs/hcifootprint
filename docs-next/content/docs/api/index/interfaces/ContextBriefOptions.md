---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1814](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1814)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1818](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1818)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1816](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1816)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
