---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:2251](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2251)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:2254](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2254)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:2252](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2252)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:2255](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2255)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:2253](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L2253)
