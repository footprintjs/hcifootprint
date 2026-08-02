---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:2129](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2129)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:2132](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2132)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:2130](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2130)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:2133](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2133)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:2131](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2131)
