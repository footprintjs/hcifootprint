---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1787](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1787)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1790](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1790)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1788](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1788)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1791](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1791)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1789](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1789)
