---
title: ActionOfferRef<Id>
---

# Interface: ActionOfferRef\<Id\>

Defined in: src/action/types.ts:29

Under which application facts was one exact binding exposed?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: src/action/types.ts:32

***

### kind

> `readonly` **kind**: `"action-offer"`

Defined in: src/action/types.ts:30

***

### offerId

> `readonly` **offerId**: `string`

Defined in: src/action/types.ts:31

***

### revision

> `readonly` **revision**: `number`

Defined in: src/action/types.ts:34

The committed binding-fact generation this offer describes.
