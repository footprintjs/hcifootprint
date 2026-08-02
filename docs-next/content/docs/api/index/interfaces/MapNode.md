---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:250](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L250)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:261](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L261)

Child NODE paths (actions are not children — see NavigationGraph.actionNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:267](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L267)

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:266](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L266)

The node's OWN `when` (action guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:254](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L254)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:268](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L268)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:255](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L255)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:263](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L263)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:259](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L259)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:257](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L257)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:252](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L252)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:264](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L264)
