---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1826](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1826)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:1829](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1829)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1827](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1827)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1830](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1830)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1828](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1828)
