---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1772](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1772)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1775](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1775)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1773](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1773)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1776](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1776)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1774](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1774)
