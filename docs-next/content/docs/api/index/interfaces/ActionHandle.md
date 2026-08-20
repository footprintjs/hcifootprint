---
title: ActionHandle
---

# Interface: ActionHandle

Defined in: [src/atom/types.ts:1206](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1206)

The handle returned by registerAction — a single-action ActionGroup.

## Properties

### actionId

> `readonly` **actionId**: `string`

Defined in: [src/atom/types.ts:1209](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1209)

***

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:1207](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1207)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:1208](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1208)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:1213](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1213)

Say this action is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:1211](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1211)

Grey out / re-enable this action.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:1214](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L1214)

#### Returns

`void`
