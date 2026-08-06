---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:391](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L391)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:402](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L402)

Child NODE paths (actions are not children — see NavigationGraph.actionNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:408](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L408)

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:407](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L407)

The node's OWN `when` (action guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:395](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L395)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:409](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L409)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:396](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L396)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:404](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L404)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:400](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L400)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:398](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L398)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:393](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L393)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:405](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L405)
