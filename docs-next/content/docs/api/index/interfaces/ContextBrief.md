---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1769](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1769)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`JourneyFrame`](/api/index/interfaces/JourneyFrame) \| `null`

Defined in: [src/atom/types.ts:1772](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1772)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1770](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1770)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1773](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1773)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1771](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1771)
