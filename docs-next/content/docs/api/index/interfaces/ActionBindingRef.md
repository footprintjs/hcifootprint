---
title: ActionBindingRef<Id>
---

# Interface: ActionBindingRef\<Id\>

Defined in: [src/action/types.ts:19](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L19)

Where, and for which live instance, is the definition connected?

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### bindingId

> `readonly` **bindingId**: `string`

Defined in: [src/action/types.ts:21](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L21)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:22](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L22)

***

### instance?

> `readonly` `optional` **instance?**: `string`

Defined in: [src/action/types.ts:25](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L25)

Opaque application data. It is never encoded into or recovered from another id.

***

### kind

> `readonly` **kind**: `"action-binding"`

Defined in: [src/action/types.ts:20](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L20)

***

### node

> `readonly` **node**: `string`

Defined in: [src/action/types.ts:23](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L23)
