---
title: ToolHandle
---

# Interface: ToolHandle

Defined in: [src/atom/types.ts:453](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L453)

The handle returned by registerTool — a single-tool ToolGroup.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:454](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L454)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:455](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L455)

***

### toolId

> `readonly` **toolId**: `string`

Defined in: [src/atom/types.ts:456](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L456)

## Methods

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:458](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L458)

Grey out / re-enable this tool.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:459](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L459)

#### Returns

`void`
