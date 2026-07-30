---
title: ToolGroup
---

# Interface: ToolGroup

Defined in: [src/atom/types.ts:500](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L500)

The handle returned by registerToolGroup — the group's IDENTITY. You never
name a group with a string (two components would collide and you'd have to
invent unique names); registration hands you this handle and you act through
it. `id` is a generated opaque token, exposed only for telemetry/warnings.

## Extended by

- [`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:502](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L502)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:504](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L504)

The node path this group is registered on (tree API); undefined for the flat API.

## Methods

### setEnabled()

> **setEnabled**(`toolId`, `enabled`): `void`

Defined in: [src/atom/types.ts:506](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L506)

Grey out / re-enable one tool in this group (a disabled button).

#### Parameters

##### toolId

`string`

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:508](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L508)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`
