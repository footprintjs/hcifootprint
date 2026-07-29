---
title: ToolGroupHandle
---

# Interface: ToolGroupHandle

Defined in: [src/traverse/nav-session.ts:90](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L90)

The handle returned by registerToolGroup — the group's IDENTITY (see
ToolGroup). Hold it and call `unregister()` on unmount; `setEnabled(id, …)`
greys a tool out.

## Extends

- [`ToolGroup`](/api/index/interfaces/ToolGroup)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:320](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L320)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`id`](/api/index/interfaces/ToolGroup#id)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/traverse/nav-session.ts:92](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L92)

Instance key, when this group registered one card of a repeats container.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:322](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L322)

The node path this group is registered on (tree API); undefined for the flat API.

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`node`](/api/index/interfaces/ToolGroup#node)

## Methods

### setEnabled()

> **setEnabled**(`toolId`, `enabled`): `void`

Defined in: [src/atom/types.ts:324](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L324)

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

Defined in: [src/atom/types.ts:326](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L326)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`unregister`](/api/index/interfaces/ToolGroup#unregister)
