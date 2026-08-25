---
title: ActionInputSchemaContext<Id>
---

# Interface: ActionInputSchemaContext\<Id\>

Defined in: [src/action/types.ts:713](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L713)

Context handed to an application-owned synchronous schema validator.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:715](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L715)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:714](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L714)

***

### source

> `readonly` **source**: `"bound"` \| `"caller"`

Defined in: [src/action/types.ts:716](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L716)
