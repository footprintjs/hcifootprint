---
title: ToolHandle
---

# Interface: ToolHandle

Defined in: [src/atom/types.ts:330](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L330)

The handle returned by registerTool — a single-tool ToolGroup.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:331](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L331)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:332](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L332)

***

### toolId

> `readonly` **toolId**: `string`

Defined in: [src/atom/types.ts:333](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L333)

## Methods

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:335](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L335)

Grey out / re-enable this tool.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:336](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L336)

#### Returns

`void`
