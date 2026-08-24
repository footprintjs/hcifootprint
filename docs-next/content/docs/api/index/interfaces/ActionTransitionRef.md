---
title: ActionTransitionRef<Id>
---

# Interface: ActionTransitionRef\<Id\>

Defined in: [src/action/types.ts:55](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L55)

Which particular invocation of one exact binding occurred?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:58](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L58)

***

### input?

> `readonly` `optional` **input?**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<[`ActionInputSource`](/api/index/type-aliases/ActionInputSource)\>

Defined in: [src/action/types.ts:61](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L61)

The exact payload receipt used by this invocation, when it had one.

***

### kind

> `readonly` **kind**: `"action-transition"`

Defined in: [src/action/types.ts:56](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L56)

***

### offer?

> `readonly` `optional` **offer?**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`\>

Defined in: [src/action/types.ts:59](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L59)

***

### transitionId

> `readonly` **transitionId**: `string`

Defined in: [src/action/types.ts:57](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L57)
