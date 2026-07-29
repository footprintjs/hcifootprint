---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1105](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1105)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1108](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1108)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1106](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1106)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1109](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1109)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1107](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1107)
