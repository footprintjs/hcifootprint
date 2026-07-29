---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:959](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L959)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:963](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L963)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:961](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L961)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
