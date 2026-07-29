---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:221](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L221)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:232](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L232)

Child NODE paths (tools are not children — see AppMap.toolNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:238](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L238)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:237](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L237)

The node's OWN `when` (tool guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:225](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L225)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:239](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L239)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:226](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L226)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:234](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L234)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:230](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L230)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:228](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L228)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:223](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L223)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:235](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L235)
