---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1372](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1372)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1375](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1375)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1373](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1373)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1376](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1376)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1374](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1374)
