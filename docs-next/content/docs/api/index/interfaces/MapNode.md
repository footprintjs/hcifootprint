---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:153](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L153)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:164](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L164)

Child NODE paths (tools are not children — see AppMap.toolNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:170](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L170)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:169](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L169)

The node's OWN `when` (tool guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:157](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L157)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:171](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L171)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:158](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L158)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:166](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L166)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:162](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L162)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:160](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L160)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:155](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L155)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:167](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L167)
