---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:3232](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3232)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:3235](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3235)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:3233](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3233)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:3236](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3236)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:3234](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3234)
