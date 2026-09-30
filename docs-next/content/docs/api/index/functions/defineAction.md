---
title: defineAction
---

# Function: defineAction()

## Call Signature

> **defineAction**\<`Id`, `Stages`, `Output`\>(`definitionId`, `options`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<() => `Output`, `Id`, `"inputless"`\>

Defined in: [src/action/definition.ts:288](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L288)

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

Defined in: [src/action/definition.ts:296](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L296)

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

Defined in: [src/action/definition.ts:309](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L309)

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

Defined in: [src/action/definition.ts:316](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L316)

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

Defined in: [src/action/definition.ts:323](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L323)

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
