---
title: ActionDefinitionRecord<Id, Mode>
---

# Interface: ActionDefinitionRecord\<Id, Mode\>

Defined in: [src/action/types.ts:295](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L295)

The immutable metadata carried under the callable definition's Symbol.for brand.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

## Properties

### contract

> `readonly` **contract**: [`ReadonlyActionDefinitionContract`](/api/index/type-aliases/ReadonlyActionDefinitionContract) & `object`

Defined in: [src/action/types.ts:300](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L300)

#### Type Declaration

##### invocation

> `readonly` **invocation**: `Mode`

***

### ref

> `readonly` **ref**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:299](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L299)
