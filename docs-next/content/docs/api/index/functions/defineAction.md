---
title: defineAction
---

# Function: defineAction()

## Call Signature

> **defineAction**\<`Id`, `Stages`, `Output`\>(`definitionId`, `options`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<() => `Output`, `Id`, `"inputless"`\>

Defined in: [src/action/definition.ts:280](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L280)

### Type Parameters

#### Id

`Id` *extends* `string`

#### Stages

`Stages` *extends* readonly `string`[]

#### Output

`Output`

### Parameters

#### definitionId

`Id`

#### options

[`DefineActionOptions`](/api/index/type-aliases/DefineActionOptions)\<`"inputless"`, `true`, () => `Output`, `Id`, `Stages`\>

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<() => `Output`, `Id`, `"inputless"`\>

## Call Signature

> **defineAction**\<`Id`, `Stages`, `Input`, `Output`, `F`\>(`definitionId`, `options`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<(`input`) => `ReturnType`\<`F`\>, `Id`, `"scalar"`\>

Defined in: [src/action/definition.ts:288](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L288)

### Type Parameters

#### Id

`Id` *extends* `string`

#### Stages

`Stages` *extends* readonly `string`[]

#### Input

`Input`

#### Output

`Output`

#### F

`F` *extends* (`input`, `lifecycle?`) => `Output`

### Parameters

#### definitionId

`Id`

#### options

[`DefineActionOptions`](/api/index/type-aliases/DefineActionOptions)\<`"scalar"`, `true`, `F`, `Id`, `Stages`, `Input`, `Output`\>

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<(`input`) => `ReturnType`\<`F`\>, `Id`, `"scalar"`\>

## Call Signature

> **defineAction**\<`Id`, `F`\>(`definitionId`, `options`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"inputless"`\>

Defined in: [src/action/definition.ts:301](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L301)

### Type Parameters

#### Id

`Id` *extends* `string`

#### F

`F` *extends* (...`args`) => `any`

### Parameters

#### definitionId

`Id`

#### options

[`DefineActionOptions`](/api/index/type-aliases/DefineActionOptions)\<`"inputless"`, `false`, `F`, `Id`\>

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"inputless"`\>

## Call Signature

> **defineAction**\<`Id`, `F`\>(`definitionId`, `options`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"scalar"`\>

Defined in: [src/action/definition.ts:308](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L308)

### Type Parameters

#### Id

`Id` *extends* `string`

#### F

`F` *extends* (...`args`) => `any`

### Parameters

#### definitionId

`Id`

#### options

[`DefineActionOptions`](/api/index/type-aliases/DefineActionOptions)\<`"scalar"`, `false`, `F`, `Id`\>

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"scalar"`\>

## Call Signature

> **defineAction**\<`Id`, `F`\>(`definitionId`, `options`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"host"`\>

Defined in: [src/action/definition.ts:315](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L315)

### Type Parameters

#### Id

`Id` *extends* `string`

#### F

`F` *extends* (...`args`) => `any`

### Parameters

#### definitionId

`Id`

#### options

[`DefineActionOptions`](/api/index/type-aliases/DefineActionOptions)\<`"host"`, `false`, `F`, `Id`\>

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"host"`\>
