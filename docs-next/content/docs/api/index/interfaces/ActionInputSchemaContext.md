---
title: ActionInputSchemaContext<Id>
---

# Interface: ActionInputSchemaContext\<Id\>

Defined in: [src/action/types.ts:785](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L785)

Context handed to an application-owned synchronous schema validator.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

## Properties

### binding

> `readonly` **binding**: [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`Id`\>

Defined in: [src/action/types.ts:787](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L787)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:786](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L786)

***

### source

> `readonly` **source**: `"evidence"` \| `"bound"` \| `"caller"`

Defined in: [src/action/types.ts:790](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L790)

`'evidence'` (2.6.0): the value is a verified settlement's evidence,
 checked against its governed kind's catalog schema.
