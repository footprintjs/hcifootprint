---
title: ActionTransitionRef<Id>
---

# Interface: ActionTransitionRef\<Id\>

Defined in: src/action/types.ts:38

Which particular invocation of one exact binding occurred?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: src/action/types.ts:41

***

### kind

> `readonly` **kind**: `"action-transition"`

Defined in: src/action/types.ts:39

***

### offer?

> `readonly` `optional` **offer?**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`\>

Defined in: src/action/types.ts:42

***

### transitionId

> `readonly` **transitionId**: `string`

Defined in: src/action/types.ts:40
