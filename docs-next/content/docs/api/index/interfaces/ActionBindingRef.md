---
title: ActionBindingRef<Id>
---

# Interface: ActionBindingRef\<Id\>

Defined in: [src/action/types.ts:27](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L27)

Where, and for which live instance, is the definition connected?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### bindingId

> `readonly` **bindingId**: `string`

Defined in: [src/action/types.ts:29](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L29)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:30](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L30)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:33](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L33)

Opaque application data. It is never encoded into or recovered from another id.

***

### kind

> `readonly` **kind**: `"action-binding"`

Defined in: [src/action/types.ts:28](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L28)

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/types.ts:31](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L31)
