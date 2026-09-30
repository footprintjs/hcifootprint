---
title: actionDefinitionOf
---

# Function: actionDefinitionOf()

## Call Signature

> **actionDefinitionOf**\<`F`, `Id`, `Mode`\>(`value`): [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `Mode`\>

Defined in: [src/action/definition.ts:143](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L143)

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

Defined in: [src/action/definition.ts:148](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L148)

Read the definition carried by a callable, including one branded by another package copy.

### Parameters

#### value

`unknown`

### Returns

[`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`string`, [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)\> \| `undefined`
