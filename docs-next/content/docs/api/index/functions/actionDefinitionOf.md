---
title: actionDefinitionOf
---

# Function: actionDefinitionOf()

## Call Signature

> **actionDefinitionOf**\<`F`, `Id`, `Mode`\>(`value`): [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `Mode`\>

Defined in: [src/action/definition.ts:130](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L130)

Read the definition carried by a callable, including one branded by another package copy.

### Type Parameters

#### F

`F` *extends* (...`args`) => `any`

#### Id

`Id` *extends* `string`

#### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

### Parameters

#### value

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>

### Returns

[`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `Mode`\>

## Call Signature

> **actionDefinitionOf**(`value`): [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`string`, [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)\> \| `undefined`

Defined in: [src/action/definition.ts:135](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L135)

Read the definition carried by a callable, including one branded by another package copy.

### Parameters

#### value

`unknown`

### Returns

[`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`string`, [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)\> \| `undefined`
