---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:297](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L297)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:308](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L308)

Child NODE paths (actions are not children — see NavigationGraph.actionNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:314](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L314)

***

### guard?

> `optional` **guard?**: [`WhereFilter`](/api/index/type-aliases/WhereFilter)\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:313](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L313)

The node's OWN `when` (action guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L301)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:315](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L315)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:302](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L302)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:310](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L310)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:306](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L306)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:304](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L304)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L299)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:311](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L311)
