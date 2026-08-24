---
title: ActionOfferRef<Id>
---

# Interface: ActionOfferRef\<Id\>

Defined in: [src/action/types.ts:29](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L29)

Under which application facts was one exact binding exposed?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:32](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L32)

***

### kind

> `readonly` **kind**: `"action-offer"`

Defined in: [src/action/types.ts:30](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L30)

***

### offerId

> `readonly` **offerId**: `string`

Defined in: [src/action/types.ts:31](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L31)

***

### revision

> `readonly` **revision**: `number`

Defined in: [src/action/types.ts:34](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L34)

The committed binding-fact generation this offer describes.
