---
title: ActionInputSchemaContext<Id>
---

# Interface: ActionInputSchemaContext\<Id\>

Defined in: [src/action/types.ts:464](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L464)

Context handed to an application-owned synchronous schema validator.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:466](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L466)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:465](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L465)

***

### source

> `readonly` **source**: `"bound"` \| `"caller"`

Defined in: [src/action/types.ts:467](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L467)
