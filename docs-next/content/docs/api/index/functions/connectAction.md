---
title: connectAction
---

# Function: connectAction()

## Call Signature

> **connectAction**\<`F`, `Id`\>(`runtime`, `definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`\>

Defined in: src/action/connection.ts:94

Connect one stable live binding of an already-declared callable action.

### Type Parameters

#### F

`F` *extends* (...`args`) => `any`

#### Id

`Id` *extends* `string`

### Parameters

#### runtime

[`ActionBindingRuntime`](/api/index/interfaces/ActionBindingRuntime)

#### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

#### options

`Parameters`\<`F`\> *extends* \[\] ? `never` : [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\]\> & `object`

### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`\>

## Call Signature

> **connectAction**\<`F`, `Id`\>(`runtime`, `definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`\>

Defined in: src/action/connection.ts:106

Connect one stable live binding of an already-declared callable action.

### Type Parameters

#### F

`F` *extends* (...`args`) => `any`

#### Id

`Id` *extends* `string`

### Parameters

#### runtime

[`ActionBindingRuntime`](/api/index/interfaces/ActionBindingRuntime)

#### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

#### options

`Parameters`\<`F`\> *extends* \[\] ? `Omit`\<[`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`undefined`\>, `"input"`\> & `object` : [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\]\>

### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`\>
