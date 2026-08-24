---
title: defineAction
---

# Function: defineAction()

## Call Signature

> **defineAction**\<`Id`, `F`\>(`definitionId`, `contract`, `implementation`, ...`invalidArity`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"inputless"`\>

Defined in: [src/action/definition.ts:173](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L173)

Declare an application action once while keeping it an ordinary callable.
Reachability, instances, enabledness, and hosts are deliberately absent: they
belong to each live Action Binding, not to this one definition.

### Type Parameters

#### Id

`Id` *extends* `string`

#### F

`F` *extends* (...`args`) => `any`

### Parameters

#### definitionId

`Id`

Stable capability name inside a runtime generation.

#### contract

`Omit`\<[`ActionDefinitionContract`](/api/index/type-aliases/ActionDefinitionContract), `"invocation"` \| `"inputSchema"`\> & `object`

Must explicitly declare `invocation`: `inputless` permits
only `inputSchema: 'none'`, `scalar` accepts an object input schema, and
`host` forbids a broker input schema.

#### implementation

`F`

Exact application callable; direct JavaScript behavior
is preserved.

#### invalidArity

...`unknown` *extends* `ThisParameterType`\<`F`\> ? `Parameters`\<`F`\> *extends* \[\] ? \[\] : \[`never`\] : \[`never`\]

Type-only compile-time arity guard; callers never supply
this argument.

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"inputless"`\>

## Call Signature

> **defineAction**\<`Id`, `F`\>(`definitionId`, `contract`, `implementation`, ...`invalidArity`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"scalar"`\>

Defined in: [src/action/definition.ts:189](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L189)

Declare an application action once while keeping it an ordinary callable.
Reachability, instances, enabledness, and hosts are deliberately absent: they
belong to each live Action Binding, not to this one definition.

### Type Parameters

#### Id

`Id` *extends* `string`

#### F

`F` *extends* (...`args`) => `any`

### Parameters

#### definitionId

`Id`

Stable capability name inside a runtime generation.

#### contract

`Omit`\<[`ActionDefinitionContract`](/api/index/type-aliases/ActionDefinitionContract), `"invocation"` \| `"inputSchema"`\> & `object`

Must explicitly declare `invocation`: `inputless` permits
only `inputSchema: 'none'`, `scalar` accepts an object input schema, and
`host` forbids a broker input schema.

#### implementation

`F`

Exact application callable; direct JavaScript behavior
is preserved.

#### invalidArity

...`unknown` *extends* `ThisParameterType`\<`F`\> ? `Parameters`\<`F`\> *extends* \[\] ? \[`never`\] : `Parameters`\<`F`\> *extends* \[`unknown`\] \| \[`unknown`?\] ? \[\] : \[`never`\] : \[`never`\]

Type-only compile-time arity guard; callers never supply
this argument.

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"scalar"`\>

## Call Signature

> **defineAction**\<`Id`, `F`\>(`definitionId`, `contract`, `implementation`): [`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"host"`\>

Defined in: [src/action/definition.ts:207](https://github.com/footprintjs/hcifootprint/blob/main/src/action/definition.ts#L207)

Declare an application action once while keeping it an ordinary callable.
Reachability, instances, enabledness, and hosts are deliberately absent: they
belong to each live Action Binding, not to this one definition.

### Type Parameters

#### Id

`Id` *extends* `string`

#### F

`F` *extends* (...`args`) => `any`

### Parameters

#### definitionId

`Id`

Stable capability name inside a runtime generation.

#### contract

`Omit`\<[`ActionDefinitionContract`](/api/index/type-aliases/ActionDefinitionContract), `"invocation"` \| `"inputSchema"`\> & `object`

Must explicitly declare `invocation`: `inputless` permits
only `inputSchema: 'none'`, `scalar` accepts an object input schema, and
`host` forbids a broker input schema.

#### implementation

`F`

Exact application callable; direct JavaScript behavior
is preserved.

### Returns

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `"host"`\>
