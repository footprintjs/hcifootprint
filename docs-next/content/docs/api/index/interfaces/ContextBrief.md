---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:2234](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2234)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:2237](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2237)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:2235](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2235)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:2238](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2238)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:2236](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2236)
