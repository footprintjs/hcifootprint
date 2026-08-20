---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:3390](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3390)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:3393](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3393)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:3391](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3391)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:3394](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3394)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:3392](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3392)
