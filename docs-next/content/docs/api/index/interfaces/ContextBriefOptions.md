---
title: ContextBriefOptions
---

# Interface: ContextBriefOptions

Defined in: [src/atom/types.ts:946](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L946)

## Properties

### maxTransitions?

> `optional` **maxTransitions?**: `number`

Defined in: [src/atom/types.ts:950](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L950)

Cap on rendered transitions (default 20); older ones collapse into an omitted count.

***

### sinceVersion?

> `optional` **sinceVersion?**: `number`

Defined in: [src/atom/types.ts:948](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L948)

Only include transitions created at or after this cursor version (the "since your last turn" cursor).
