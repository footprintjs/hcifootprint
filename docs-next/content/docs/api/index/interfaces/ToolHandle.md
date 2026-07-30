---
title: ToolHandle
---

# Interface: ToolHandle

Defined in: [src/atom/types.ts:527](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L527)

The handle returned by registerTool — a single-tool ToolGroup.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:528](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L528)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:529](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L529)

***

### toolId

> `readonly` **toolId**: `string`

Defined in: [src/atom/types.ts:530](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L530)

## Methods

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:532](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L532)

Grey out / re-enable this tool.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:533](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L533)

#### Returns

`void`
