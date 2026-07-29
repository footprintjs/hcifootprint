---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1115](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1115)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1118](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1118)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1116](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1116)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1119](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1119)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1117](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1117)
