---
title: ActionHandle
---

# Interface: ActionHandle

Defined in: [src/atom/types.ts:586](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L586)

The handle returned by registerAction — a single-action ActionGroup.

## Properties

### actionId

> `readonly` **actionId**: `string`

Defined in: [src/atom/types.ts:589](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L589)

***

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:587](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L587)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:588](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L588)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:593](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L593)

Say this action is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:591](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L591)

Grey out / re-enable this action.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:594](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L594)

#### Returns

`void`
