---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1895](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1895)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:1898](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1898)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1896](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1896)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1899](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1899)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1897](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1897)
