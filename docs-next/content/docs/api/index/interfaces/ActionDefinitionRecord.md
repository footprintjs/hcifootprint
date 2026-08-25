---
title: ActionDefinitionRecord<Id, Mode>
---

# Interface: ActionDefinitionRecord\<Id, Mode\>

Defined in: [src/action/types.ts:247](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L247)

The immutable metadata carried under the callable definition's Symbol.for brand.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

## Properties

### contract

> `readonly` **contract**: [`ReadonlyActionDefinitionContract`](/api/index/type-aliases/ReadonlyActionDefinitionContract) & `object`

Defined in: [src/action/types.ts:252](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L252)

#### Type Declaration

##### invocation

> `readonly` **invocation**: `Mode`

***

### ref

> `readonly` **ref**: [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`Id`\>

Defined in: [src/action/types.ts:251](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L251)
