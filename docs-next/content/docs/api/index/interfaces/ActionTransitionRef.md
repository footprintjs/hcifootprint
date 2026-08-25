---
title: ActionTransitionRef<Id>
---

# Interface: ActionTransitionRef\<Id\>

Defined in: [src/action/types.ts:71](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L71)

Which particular invocation of one exact binding occurred?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:74](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L74)

***

### input?

> `readonly` `optional` **input?**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"` \| `"caller"`\>

Defined in: [src/action/types.ts:79](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L79)

The exact payload receipt used by this invocation, when it had one.

***

### kind

> `readonly` **kind**: `"action-transition"`

Defined in: [src/action/types.ts:72](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L72)

***

### offer?

> `readonly` `optional` **offer?**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, [`Principal`](/api/index/type-aliases/Principal)\>

Defined in: [src/action/types.ts:77](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L77)

***

### principal

> `readonly` **principal**: [`Principal`](/api/index/type-aliases/Principal)

Defined in: [src/action/types.ts:76](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L76)

Who requested this invocation, or `unknown` for an unscoped/direct occurrence.

***

### transitionId

> `readonly` **transitionId**: `string`

Defined in: [src/action/types.ts:73](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L73)
