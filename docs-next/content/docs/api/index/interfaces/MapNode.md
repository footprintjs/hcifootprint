---
title: MapNode
---

# Interface: MapNode

Defined in: [src/tree/types.ts:190](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L190)

## Properties

### children

> **children**: `string`[]

Defined in: [src/tree/types.ts:201](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L201)

Child NODE paths (tools are not children — see AppMap.toolNodes).

***

### description?

> `optional` **description?**: `string`

Defined in: [src/tree/types.ts:207](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L207)

***

### guard?

> `optional` **guard?**: `WhereFilter`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/tree/types.ts:206](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L206)

The node's OWN `when` (tool guards already carry the composed chain).

***

### id

> **id**: `string`

Defined in: [src/tree/types.ts:194](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L194)

Last path segment.

***

### instances?

> `optional` **instances?**: (`state`) => `string`[]

Defined in: [src/tree/types.ts:208](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L208)

#### Parameters

##### state

`Record`\<`string`, `unknown`\>

#### Returns

`string`[]

***

### kind

> **kind**: [`NodeKind`](/api/index/type-aliases/NodeKind)

Defined in: [src/tree/types.ts:195](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L195)

***

### overlay

> **overlay**: `boolean`

Defined in: [src/tree/types.ts:203](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L203)

True for a blocking modal (kind 'modal' with blocks !== false).

***

### page

> **page**: `string`

Defined in: [src/tree/types.ts:199](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L199)

Owning page id (== path's first segment).

***

### parent

> **parent**: `string` \| `null`

Defined in: [src/tree/types.ts:197](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L197)

Parent path; null for pages.

***

### path

> **path**: `string`

Defined in: [src/tree/types.ts:192](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L192)

Dot path — the node's identity ('checkout.confirm-order').

***

### repeats

> **repeats**: `boolean`

Defined in: [src/tree/types.ts:204](https://github.com/footprintjs/hcifootprint/blob/main/src/tree/types.ts#L204)
