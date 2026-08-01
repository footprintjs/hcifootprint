---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:1775](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1775)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:1779](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1779)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:1777](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1777)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
