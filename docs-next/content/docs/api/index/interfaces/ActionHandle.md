---
title: ActionHandle
---

# Interface: ActionHandle

Defined in: [src/atom/types.ts:517](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L517)

The handle returned by registerAction — a single-action ActionGroup.

## Properties

### actionId

> `readonly` **actionId**: `string`

Defined in: [src/atom/types.ts:520](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L520)

***

### id

> `readonly` **id**: `string`

Defined in: [src/atom/types.ts:518](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L518)

***

### node?

> `readonly` `optional` **node?**: `string`

Defined in: [src/atom/types.ts:519](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L519)

## Methods

### setBusy()

> **setBusy**(`busy`): `void`

Defined in: [src/atom/types.ts:524](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L524)

Say this action is working right now, in your own words — `undefined` stops saying it.

#### Parameters

##### busy

`string` \| `undefined`

#### Returns

`void`

***

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [src/atom/types.ts:522](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L522)

Grey out / re-enable this action.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### unregister()

> **unregister**(): `void`

Defined in: [src/atom/types.ts:525](https://github.com/footprintjs/hcifootprint/blob/main/src/atom/types.ts#L525)

#### Returns

`void`
