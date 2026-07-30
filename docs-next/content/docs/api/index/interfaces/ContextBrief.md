---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:1586](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1586)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:1589](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1589)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:1587](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1587)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:1590](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1590)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:1588](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1588)
