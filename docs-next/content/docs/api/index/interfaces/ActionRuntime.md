---
title: ActionRuntime
---

# Interface: ActionRuntime

Defined in: [src/action/types.ts:788](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L788)

Framework-neutral store and execution port for connected actions.

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:789](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L789)

## Methods

### bindingFor()

> **bindingFor**(`binding`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

Defined in: [src/action/types.ts:846](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L846)

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

***

### bindings()

> **bindings**(`definition?`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

Defined in: [src/action/types.ts:845](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L845)

#### Parameters

##### definition?

[`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

***

### channelGaps()

> **channelGaps**(): readonly [`ChannelGap`](/api/index/interfaces/ChannelGap)[]

Defined in: [src/action/types.ts:805](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L805)

Every kind somebody needed served and nothing could, counted.

#### Returns

readonly [`ChannelGap`](/api/index/interfaces/ChannelGap)[]

***

### connect()

#### Call Signature

> **connect**\<`F`, `Id`, `Mode`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

Defined in: [src/action/types.ts:812](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L812)

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

Defined in: [src/action/types.ts:828](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L828)

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

### declareSurface()

> **declareSurface**(`declaration`): [`SurfaceHandle`](/api/index/interfaces/SurfaceHandle)

Defined in: [src/action/types.ts:795](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L795)

Declare what one frontend surface can serve — collects and shows, by
 kind, governed by the mounted catalog. One live surface per id.

#### Parameters

##### declaration

[`SurfaceDeclaration`](/api/index/interfaces/SurfaceDeclaration)

#### Returns

[`SurfaceHandle`](/api/index/interfaces/SurfaceHandle)

***

### forgetTransition()

> **forgetTransition**(`transition`): `boolean`

Defined in: [src/action/types.ts:851](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L851)

Release a fully settled transition from runtime history.

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

`boolean`

***

### forPrincipal()

> **forPrincipal**\<`P`\>(`principal`): [`PrincipalActionPort`](/api/index/interfaces/PrincipalActionPort)\<`P`\>

Defined in: [src/action/types.ts:807](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L807)

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

### kindGovernance()

> **kindGovernance**(): [`KindGovernanceReport`](/api/index/interfaces/KindGovernanceReport)

Defined in: [src/action/types.ts:792](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L792)

What this runtime can say about its own kind governance — mounted or
 not, the fingerprint, every kind seen, and the ungoverned remainder.

#### Returns

[`KindGovernanceReport`](/api/index/interfaces/KindGovernanceReport)

***

### surfacesFor()

> **surfacesFor**(`query`): readonly [`SurfaceDeclaration`](/api/index/interfaces/SurfaceDeclaration)[]

Defined in: [src/action/types.ts:801](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L801)

Who can collect this kind, or show it — and a MISS is recorded, not
 just returned empty: the degradation record is the backlog written by
 actual usage.

#### Parameters

##### query

[`SurfaceQuery`](/api/index/type-aliases/SurfaceQuery)

#### Returns

readonly [`SurfaceDeclaration`](/api/index/interfaces/SurfaceDeclaration)[]

***

### transitionFor()

> **transitionFor**(`transition`): [`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`

Defined in: [src/action/types.ts:847](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L847)

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

[`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`
