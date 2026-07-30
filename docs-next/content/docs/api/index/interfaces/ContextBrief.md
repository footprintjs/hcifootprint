---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1439](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1439)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1442](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1442)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1440](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1440)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1443](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1443)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1441](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1441)
