---
title: ActionBindingRuntime
---

# Interface: ActionBindingRuntime

Defined in: [src/action/types.ts:501](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L501)

Framework-neutral store and execution port for connected actions.

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:502](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L502)

## Methods

### available()

#### Call Signature

> **available**\<`F`, `Id`, `Mode`\>(`definition`): readonly [`ActionOfferFor`](/api/index/type-aliases/ActionOfferFor)\<[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>, `Id`, `Mode`\>[]

Defined in: [src/action/types.ts:575](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L575)

Enumerate exact retained offers for current executable bindings. Host-only,
disabled, insufficient-coverage, and unschematized open bindings are
withheld. Minting a bound offer executes and validates its input reader;
unchanged generations reuse the same offer and retained value.

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

##### Returns

readonly [`ActionOfferFor`](/api/index/type-aliases/ActionOfferFor)\<[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>, `Id`, `Mode`\>[]

#### Call Signature

> **available**\<`Ref`\>(`definition`): readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`Ref`\[`"definitionId"`\], (...`args`) => `any`\>[]

Defined in: [src/action/types.ts:582](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L582)

##### Type Parameters

###### Ref

`Ref` *extends* [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

##### Parameters

###### definition

`Ref`

##### Returns

readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`Ref`\[`"definitionId"`\], (...`args`) => `any`\>[]

#### Call Signature

> **available**\<`Id`\>(`definition`): readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`Id`, (...`args`) => `any`\>[]

Defined in: [src/action/types.ts:585](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L585)

##### Type Parameters

###### Id

`Id` *extends* `string`

##### Parameters

###### definition

`Id`

##### Returns

readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`Id`, (...`args`) => `any`\>[]

#### Call Signature

> **available**(): readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`string`, (...`args`) => `any`\>[]

Defined in: [src/action/types.ts:586](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L586)

##### Returns

readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`string`, (...`args`) => `any`\>[]

***

### bindingFor()

> **bindingFor**(`binding`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

Defined in: [src/action/types.ts:547](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L547)

#### Parameters

##### binding

`string` \| [`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

***

### bindings()

> **bindings**(`definition?`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

Defined in: [src/action/types.ts:546](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L546)

#### Parameters

##### definition?

`string` \| [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

***

### connect()

#### Call Signature

> **connect**\<`F`, `Id`, `Mode`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

Defined in: [src/action/types.ts:507](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L507)

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

Defined in: [src/action/types.ts:527](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L527)

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

`Mode` *extends* `"scalar"` ? [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`Parameters`\<`F`\>\[`0`\], `Awaited`\<`ReturnType`\<`F`\>\>, `Id`\> : `Omit`\<[`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)\<`undefined`, `Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>, `"input"`\> & `object`

##### Returns

[`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `false`, `Mode`\>

***

### forgetTransition()

> **forgetTransition**(`transition`): `boolean`

Defined in: [src/action/types.ts:591](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L591)

Release a fully settled transition from runtime history.

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

`boolean`

***

### invoke()

#### Call Signature

> **invoke**\<`F`, `Id`\>(`offer`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

Defined in: [src/action/types.ts:551](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L551)

Invoke the exact full offer previously returned by `available()`.

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

##### Parameters

###### offer

[`BoundActionOffer`](/api/index/interfaces/BoundActionOffer)\<`Id`, `F`\> \| [`InputlessActionOffer`](/api/index/interfaces/InputlessActionOffer)\<`Id`, `F`\>

##### Returns

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

#### Call Signature

> **invoke**\<`F`, `Id`\>(`offer`, `input`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

Defined in: [src/action/types.ts:562](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L562)

Invoke an exact retained open offer with one mandatory caller payload
slot. The payload is validated before the handler starts; rejection is a
structured `refused` invocation rather than an application failure.

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

##### Parameters

###### offer

[`OpenActionOffer`](/api/index/interfaces/OpenActionOffer)\<`Id`, `F`\>

###### input

`Parameters`\<`F`\>\[`0`\]

##### Returns

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`\>

***

### transitionFor()

> **transitionFor**(`transition`): [`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`

Defined in: [src/action/types.ts:587](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L587)

#### Parameters

##### transition

`string` \| [`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)\<`string`\>

#### Returns

[`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`
