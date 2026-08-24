---
title: actionDefinitionOf
---

# Function: actionDefinitionOf()

## Call Signature

> **actionDefinitionOf**\<`F`, `Id`\>(`value`): [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`\>

Defined in: [src/action/definition.ts:101](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L101)

Read the definition carried by a callable, including one branded by another package copy.

### Type Parameters

#### F

`F` *extends* (...`args`) => `any`

#### Id

`Id` *extends* `string`

### Parameters

#### value

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

### Returns

[`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`\>

## Call Signature

> **actionDefinitionOf**(`value`): [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`string`\> \| `undefined`

Defined in: [src/action/definition.ts:105](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L105)

Read the definition carried by a callable, including one branded by another package copy.

### Parameters

#### value

`unknown`

### Returns

[`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`string`\> \| `undefined`
