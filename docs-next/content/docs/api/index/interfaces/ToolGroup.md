---
title: ToolGroup
---

# Interface: ToolGroup

Defined in: [src/atom/types.ts:441](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L441)

The handle returned by registerToolGroup — the group's IDENTITY. You never
name a group with a string (two components would collide and you'd have to
invent unique names); registration hands you this handle and you act through
it. `id` is a generated opaque token, exposed only for telemetry/warnings.

## Extended by

- [`ToolGroupHandle`](/api/index/interfaces/ToolGroupHandle)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:443](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L443)

Generated identity of this registration (for telemetry/debug — not caller-supplied).

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:445](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L445)

The node path this group is registered on (tree API); undefined for the flat API.

## Methods

### setEnabled()

> **setEnabled**(`toolId`, `enabled`): `void`

Defined in: [src/atom/types.ts:447](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L447)

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

Defined in: [src/atom/types.ts:449](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L449)

Remove this group's registrations (call on unmount). Idempotent.

#### Returns

`void`
