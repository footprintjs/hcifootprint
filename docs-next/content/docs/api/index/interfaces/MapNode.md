---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:189](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L189)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:200](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L200)

Child NODE paths (tools are not children — see AppMap.toolNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:206](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L206)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:205](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L205)

The node's OWN `when` (tool guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:193](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L193)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:207](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L207)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:194](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L194)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:202](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L202)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:198](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L198)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:196](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L196)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:191](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L191)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:203](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L203)
