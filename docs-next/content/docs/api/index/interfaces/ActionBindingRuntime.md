---
title: ActionBindingRuntime
---

# Interface: ActionBindingRuntime

Defined in: src/action/types.ts:310

Framework-neutral store and execution port for connected actions.

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: src/action/types.ts:311

## Methods

### available()

#### Call Signature

> **available**\<`Ref`\>(`definition`): readonly [`ActionOffer`](/api/index/interfaces/ActionOffer)\<`Ref`\[`"definitionId"`\]\>[]

Defined in: src/action/types.ts:338

##### Type Parameters

###### Ref

`Ref` *extends* [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

##### Parameters

###### definition

`Ref`

##### Returns

readonly [`ActionOffer`](/api/index/interfaces/ActionOffer)\<`Ref`\[`"definitionId"`\]\>[]

#### Call Signature

> **available**\<`Id`\>(`definition`): readonly [`ActionOffer`](/api/index/interfaces/ActionOffer)\<`Id`\>[]

Defined in: src/action/types.ts:341

##### Type Parameters

###### Id

`Id` *extends* `string`

##### Parameters

###### definition

`Id`

##### Returns

readonly [`ActionOffer`](/api/index/interfaces/ActionOffer)\<`Id`\>[]

#### Call Signature

> **available**(): readonly [`ActionOffer`](/api/index/interfaces/ActionOffer)\<`string`\>[]

Defined in: src/action/types.ts:342

##### Returns

readonly [`ActionOffer`](/api/index/interfaces/ActionOffer)\<`string`\>[]

***

### bindingFor()

> **bindingFor**(`binding`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

Defined in: src/action/types.ts:335

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

***

### bindings()

> **bindings**(`definition?`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

Defined in: src/action/types.ts:334

#### Parameters

##### definition?

`string` \| [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

***

### connect()

#### Call Signature

> **connect**\<`F`, `Id`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`\>

Defined in: src/action/types.ts:312

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

##### Parameters

###### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

###### options

`Parameters`\<`F`\> *extends* \[\] ? `never` : [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\]\> & `object`

##### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`\>

#### Call Signature

> **connect**\<`F`, `Id`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`\>

Defined in: src/action/types.ts:323

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

##### Parameters

###### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`\>

###### options

`Parameters`\<`F`\> *extends* \[\] ? `Omit`\<[`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`undefined`\>, `"input"`\> & `object` : [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\]\>

##### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`\>

***

### forgetTransition()

> **forgetTransition**(`transition`): `boolean`

Defined in: src/action/types.ts:347

Release a fully settled transition from runtime history.

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

`boolean`

***

### transitionFor()

> **transitionFor**(`transition`): [`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`

Defined in: src/action/types.ts:343

#### Parameters

##### transition

`string` \| [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`string`\>

#### Returns

[`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`
