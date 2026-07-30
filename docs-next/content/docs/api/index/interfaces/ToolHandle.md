---
title: ToolHandle
---

# Interface: ToolHandle

Defined in: [src/atom/types.ts:512](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L512)

The handle returned by registerTool — a single-tool ToolGroup.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:513](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L513)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:514](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L514)

***

### toolId

> `readonly` **toolId**: `string`

Defined in: [src/atom/types.ts:515](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L515)

## Methods

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:517](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L517)

Grey out / re-enable this tool.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:518](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L518)

#### Returns

`void`
