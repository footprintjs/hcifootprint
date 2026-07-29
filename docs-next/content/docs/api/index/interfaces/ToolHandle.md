---
title: ToolHandle
---

# Interface: ToolHandle

Defined in: [src/atom/types.ts:399](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L399)

The handle returned by registerTool — a single-tool ToolGroup.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:400](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L400)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:401](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L401)

***

### toolId

> `readonly` **toolId**: `string`

Defined in: [src/atom/types.ts:402](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L402)

## Methods

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:404](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L404)

Grey out / re-enable this tool.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:405](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L405)

#### Returns

`void`
