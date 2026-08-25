---
title: ActionRuntime
---

# Interface: ActionRuntime

Defined in: [src/action/types.ts:780](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L780)

Framework-neutral store and execution port for connected actions.

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:781](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L781)

## Methods

### bindingFor()

> **bindingFor**(`binding`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

Defined in: [src/action/types.ts:822](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L822)

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

***

### bindings()

> **bindings**(`definition?`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

Defined in: [src/action/types.ts:821](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L821)

#### Parameters

##### definition?

[`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

***

### connect()

#### Call Signature

> **connect**\<`F`, `Id`, `Mode`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

Defined in: [src/action/types.ts:788](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L788)

Connect a scalar binding whose exact payload is owned by a required live
`options.input` reader.

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

###### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

##### Parameters

###### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>

###### options

`Mode` *extends* `"scalar"` ? [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\], `Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> & `object` : `never`

##### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

#### Call Signature

> **connect**\<`F`, `Id`, `Mode`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`, `Mode`\>

Defined in: [src/action/types.ts:804](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L804)

Connect without a bound input reader. Scalar definitions keep a required
direct payload door; inputless/host definitions forbid `options.input`.

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

###### Mode

`Mode` *extends* [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode) = [`ActionInvocationMode`](/api/index/type-aliases/ActionInvocationMode)

##### Parameters

###### definition

[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>

###### options

`Omit`\<[`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Mode` *extends* `"scalar"` ? `Parameters`\<`F`\>\[`0`\] : `undefined`, `Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>, `"input"`\> & `object`

##### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`, `Mode`\>

***

### forgetTransition()

> **forgetTransition**(`transition`): `boolean`

Defined in: [src/action/types.ts:827](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L827)

Release a fully settled transition from runtime history.

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

`boolean`

***

### forPrincipal()

> **forPrincipal**\<`P`\>(`principal`): [`PrincipalActionPort`](/api/index/interfaces/PrincipalActionPort)\<`P`\>

Defined in: [src/action/types.ts:783](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L783)

Bind offer generation and invocation to one explicit reader principal.

#### Type Parameters

##### P

`P` *extends* [`Principal`](/api/index/type-aliases/Principal)

#### Parameters

##### principal

`P`

#### Returns

[`PrincipalActionPort`](/api/index/interfaces/PrincipalActionPort)\<`P`\>

***

### transitionFor()

> **transitionFor**(`transition`): [`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`

Defined in: [src/action/types.ts:823](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L823)

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

[`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`
