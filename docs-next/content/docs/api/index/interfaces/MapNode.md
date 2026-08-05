---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:311](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L311)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:322](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L322)

Child NODE paths (actions are not children — see NavigationGraph.actionNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:328](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L328)

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:327](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L327)

The node's OWN `when` (action guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:315](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L315)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:329](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L329)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:316](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L316)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:324](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L324)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:320](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L320)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:318](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L318)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:313](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L313)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:325](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L325)
