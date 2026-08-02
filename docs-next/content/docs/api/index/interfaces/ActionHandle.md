---
title: ActionHandle
---

# Interface: ActionHandle

Defined in: [src/atom/types.ts:677](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L677)

The handle returned by registerAction — a single-action ActionGroup.

## Properties

### actionId

> `readonly` **actionId**: `string`

Defined in: [src/atom/types.ts:680](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L680)

***

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:678](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L678)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:679](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L679)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:684](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L684)

Say this action is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:682](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L682)

Grey out / re-enable this action.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:685](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L685)

#### Returns

`void`
