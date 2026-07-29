---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:170](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L170)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:181](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L181)

Child NODE paths (tools are not children — see AppMap.toolNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:187](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L187)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:186](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L186)

The node's OWN `when` (tool guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:174](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L174)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:188](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L188)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:175](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L175)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:183](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L183)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:179](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L179)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:177](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L177)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:172](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L172)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:184](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L184)
