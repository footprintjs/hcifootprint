---
title: ToolHandle
---

# Interface: ToolHandle

Defined in: [src/atom/types.ts:537](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L537)

The handle returned by registerTool — a single-tool ToolGroup.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:538](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L538)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:539](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L539)

***

### toolId

> `readonly` **toolId**: `string`

Defined in: [src/atom/types.ts:540](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L540)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:544](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L544)

Say this tool is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:542](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L542)

Grey out / re-enable this tool.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:545](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L545)

#### Returns

`void`
