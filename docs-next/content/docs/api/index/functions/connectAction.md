---
title: connectAction
---

# Function: connectAction()

## Call Signature

> **connectAction**\<`F`, `Id`, `Mode`\>(`runtime`, `definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

Defined in: [src/action/connection.ts:126](https://github.com/footprintjs/hcifootprint/blob/main/src/action/connection.ts#L126)

Connect one stable live binding of an already-declared callable action.

### Type Parameters

#### F

`F` *extends* (...`args`) => `any`

#### Id

`Id` *extends* `string`

#### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

### Parameters

#### runtime

[`ActionRuntime`](/api/index/interfaces/ActionRuntime)

Isolated owner of bindings, offers, and transitions.

#### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>

Exact callable returned by `defineAction()`.

#### options

`Mode` *extends* `"scalar"` ? [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\], `Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> & `object` : `never`

Always requires `node`. The overload returning an
input-reader connection is scalar-only and requires `input: () => payload`;
inputless and host definitions forbid that reader.

### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

## Call Signature

> **connectAction**\<`F`, `Id`, `Mode`\>(`runtime`, `definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`, `Mode`\>

Defined in: [src/action/connection.ts:139](https://github.com/footprintjs/hcifootprint/blob/main/src/action/connection.ts#L139)

Connect one stable live binding of an already-declared callable action.

### Type Parameters

#### F

`F` *extends* (...`args`) => `any`

#### Id

`Id` *extends* `string`

#### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

### Parameters

#### runtime

[`ActionRuntime`](/api/index/interfaces/ActionRuntime)

Isolated owner of bindings, offers, and transitions.

#### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>

Exact callable returned by `defineAction()`.

#### options

`Omit`\<[`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Mode` *extends* `"scalar"` ? `Parameters`\<`F`\>\[`0`\] : `undefined`, `Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>, `"input"`\> & `object`

Always requires `node`. The overload returning an
input-reader connection is scalar-only and requires `input: () => payload`;
inputless and host definitions forbid that reader.

### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`, `Mode`\>
