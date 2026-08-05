---
title: SensedChange
---

# Interface: SensedChange

Defined in: [src/contextful/types.ts:125](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L125)

One change the anchor's observer saw, reduced to its name-class.

## Properties

### at

> **at**: `number`

Defined in: [src/contextful/types.ts:131](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L131)

***

### attribute?

> `optional` **attribute?**: `string`

Defined in: [src/contextful/types.ts:128](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L128)

The attribute that changed, for `kind: 'attribute'`. A NAME; never its value.

***

### kind

> **kind**: `"added"` \| `"removed"` \| `"attribute"` \| `"text"`

Defined in: [src/contextful/types.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L126)

***

### targetRole?

> `optional` **targetRole?**: `string`

Defined in: [src/contextful/types.ts:129](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L129)

***

### targetTag?

> `optional` **targetTag?**: `string`

Defined in: [src/contextful/types.ts:130](https://github.com/footprintjs/hcifootprint/blob/main/src/contextful/types.ts#L130)
