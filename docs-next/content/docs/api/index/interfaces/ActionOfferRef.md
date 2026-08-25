---
title: ActionOfferRef<Id, P>
---

# Interface: ActionOfferRef\<Id, P\>

Defined in: [src/action/types.ts:37](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L37)

Under which application facts was one exact binding exposed?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### P

`P` *extends* [`Principal`](/api/index/type-aliases/Principal) = [`Principal`](/api/index/type-aliases/Principal)

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:43](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L43)

***

### input?

> `readonly` `optional` **input?**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>

Defined in: [src/action/types.ts:49](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L49)

Opaque identity for an input captured as part of this exact offer.

***

### kind

> `readonly` **kind**: `"action-offer"`

Defined in: [src/action/types.ts:41](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L41)

***

### offerId

> `readonly` **offerId**: `string`

Defined in: [src/action/types.ts:42](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L42)

***

### principal

> `readonly` **principal**: `P`

Defined in: [src/action/types.ts:45](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L45)

The reader authority under which this exact capability was exposed.

***

### revision

> `readonly` **revision**: `number`

Defined in: [src/action/types.ts:47](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L47)

The committed binding-fact generation this offer describes.
