---
title: ToolGroupHandle
---

# Interface: ToolGroupHandle

Defined in: [src/traverse/nav-session.ts:118](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L118)

The handle returned by registerToolGroup — the group's IDENTITY (see
ToolGroup). Hold it and call `unregister()` on unmount; `setEnabled(id, …)`
greys a tool out.

## Extends

- [`ToolGroup`](/api/index/interfaces/ToolGroup)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:517](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L517)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`id`](/api/index/interfaces/ToolGroup#id)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/traverse/nav-session.ts:120](https://github.com/footprintjs/hcifootprint/blob/main/src/traverse/nav-session.ts#L120)

Instance key, when this group registered one card of a repeats container.

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:519](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L519)

The node path this group is registered on (tree API); undefined for the flat API.

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`node`](/api/index/interfaces/ToolGroup#node)

## Methods

### setBusy()

> **setBusy**(`toolId`, `busy`): `void`

Defined in: [src/atom/types.ts:531](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L531)

Say that one tool in this group is WORKING RIGHT NOW, in your own words —
or hand `undefined` to stop saying it. See [AvailableEdge.busy](/api/index/interfaces/AvailableEdge#busy): the
label is yours, presence is the whole claim, and there is no boolean form.

Required, exactly like `setEnabled` beside it: this handle is MINTED by the
library and never implemented by a consumer, so every handle in existence
can say the third state rather than some of them.

#### Parameters

##### toolId

`string`

##### busy

`string` \| `undefined`

#### Returns

`void`

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`setBusy`](/api/index/interfaces/ToolGroup#setbusy)

***

### setEnabled()

> **setEnabled**(`toolId`, `enabled`): `void`

Defined in: [src/atom/types.ts:521](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L521)

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

Defined in: [src/atom/types.ts:533](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L533)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`

#### Inherited from

[`ToolGroup`](/api/index/interfaces/ToolGroup).[`unregister`](/api/index/interfaces/ToolGroup#unregister)
