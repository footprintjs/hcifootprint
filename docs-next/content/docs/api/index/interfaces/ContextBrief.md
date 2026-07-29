---
title: ContextBrief
---

# Interface: ContextBrief

Defined in: [src/atom/types.ts:958](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L958)

Token-lean, prompt-ready session context. `text` is built from AUTHORED
strings and structural facts only — state values and payloads never enter
it (the two-string-class invariant extends to history).

## Properties

### frame

> **frame**: [`SkillFrame`](/api/index/interfaces/SkillFrame) \| `null`

Defined in: [src/atom/types.ts:961](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L961)

***

### node

> **node**: `string`

Defined in: [src/atom/types.ts:959](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L959)

***

### text

> **text**: `string`

Defined in: [src/atom/types.ts:962](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L962)

***

### version

> **version**: `number`

Defined in: [src/atom/types.ts:960](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L960)
