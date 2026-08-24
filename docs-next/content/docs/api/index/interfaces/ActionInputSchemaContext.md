---
title: ActionInputSchemaContext<Id>
---

# Interface: ActionInputSchemaContext\<Id\>

Defined in: [src/action/types.ts:690](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L690)

Context handed to an application-owned synchronous schema validator.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:692](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L692)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:691](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L691)

***

### source

> `readonly` **source**: `"bound"` \| `"caller"`

Defined in: [src/action/types.ts:693](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L693)
