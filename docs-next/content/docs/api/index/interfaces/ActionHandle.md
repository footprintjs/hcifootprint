---
title: ActionHandle
---

# Interface: ActionHandle

Defined in: [src/atom/types.ts:542](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L542)

The handle returned by registerAction — a single-action ActionGroup.

## Properties

### actionId

> `readonly` **actionId**: `string`

Defined in: [src/atom/types.ts:545](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L545)

***

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:543](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L543)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:544](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L544)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:549](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L549)

Say this action is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:547](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L547)

Grey out / re-enable this action.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:550](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L550)

#### Returns

`void`
