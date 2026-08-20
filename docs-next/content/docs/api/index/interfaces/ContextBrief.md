---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:3359](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3359)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:3362](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3362)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:3360](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3360)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:3363](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3363)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:3361](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L3361)
