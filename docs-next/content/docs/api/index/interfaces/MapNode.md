---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:216](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L216)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:227](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L227)

Child NODE paths (actions are not children — see NavigationGraph.actionNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:233](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L233)

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:232](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L232)

The node's OWN `when` (action guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:220](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L220)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:234](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L234)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:221](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L221)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:229](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L229)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:225](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L225)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:223](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L223)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:218](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L218)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:230](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L230)
