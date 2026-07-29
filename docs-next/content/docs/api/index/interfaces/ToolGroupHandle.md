---
title: ToolGroupHandle
---

# Interface: ToolGroupHandle

Defined in: [src/traverse/nav-session.ts:91](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L91)

The handle returned by registerToolGroup — the group's IDENTITY (see
ToolGroup). Hold it and call `unregister()` on unmount; `setEnabled(id, …)`
greys a tool out.

## Extends

- [`ToolGroup`](/api/index/interfaces/ToolGroup)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:389](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L389)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`id`](/api/index/interfaces/ToolGroup#id)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/traverse/nav-session.ts:93](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L93)

Instance key, when this group registered one card of a repeats container.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:391](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L391)

The node path this group is registered on (tree API); undefined for the flat API.

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`node`](/api/index/interfaces/ToolGroup#node)

## Methods

### setEnabled()

> **setEnabled**(`toolId`, `enabled`): `void`

Defined in: [src/atom/types.ts:393](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L393)

Grey out / re-enable one tool in this group (a disabled button).

#### Parameters

##### toolId

`string`

##### enabled

`boolean`

#### Returns

`void`

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`setEnabled`](/api/index/interfaces/ToolGroup#setenabled)

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:395](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L395)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`unregister`](/api/index/interfaces/ToolGroup#unregister)
