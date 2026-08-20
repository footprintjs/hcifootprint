---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:432](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L432)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:443](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L443)

Child NODE paths (actions are not children — see NavigationGraph.actionNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:449](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L449)

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:448](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L448)

The node's OWN `when` (action guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:436](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L436)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:450](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L450)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:437](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L437)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:445](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L445)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:441](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L441)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:439](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L439)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:434](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L434)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:446](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L446)
