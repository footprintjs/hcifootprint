---
title: ActionInputSchemaContext<Id>
---

# Interface: ActionInputSchemaContext\<Id\>

Defined in: [src/action/types.ts:796](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L796)

Context handed to an application-owned synchronous schema validator.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:798](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L798)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:797](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L797)

***

### source

> `readonly` **source**: `"evidence"` \| `"bound"` \| `"caller"`

Defined in: [src/action/types.ts:801](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L801)

`'evidence'` (2.6.0): the value is a verified settlement's evidence,
 checked against its governed kind's catalog schema.
