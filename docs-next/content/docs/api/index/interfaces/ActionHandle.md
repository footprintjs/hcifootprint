---
title: ActionHandle
---

# Interface: ActionHandle

Defined in: [src/atom/types.ts:709](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L709)

The handle returned by registerAction — a single-action ActionGroup.

## Properties

### actionId

> `readonly` **actionId**: `string`

Defined in: [src/atom/types.ts:712](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L712)

***

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:710](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L710)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:711](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L711)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:716](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L716)

Say this action is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:714](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L714)

Grey out / re-enable this action.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:717](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L717)

#### Returns

`void`
