---
title: defineAction
---

# Function: defineAction()

> **defineAction**\<`Id`, `F`\>(`definitionId`, `contract`, `implementation`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

Defined in: [src/action/definition.ts:134](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L134)

Declare an application action once while keeping it an ordinary callable.
Reachability, instances, enabledness, and hosts are deliberately absent: they
belong to each live Action Binding, not to this one definition.

## Type Parameters

### Id

`Id` *extends* `string`

### F

`F` *extends* (...`args`) => `any`

## Parameters

### definitionId

`Id`

### contract

[`ActionDefinitionContract`](/api/index/type-aliases/ActionDefinitionContract)

### implementation

`F`

## Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>
