---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:3186](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3186)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:3189](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3189)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:3187](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3187)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:3190](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3190)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:3188](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3188)
