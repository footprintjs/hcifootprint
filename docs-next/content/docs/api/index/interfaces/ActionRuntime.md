---
title: ActionRuntime
---

# Interface: ActionRuntime

Defined in: [src/action/types.ts:903](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L903)

Framework-neutral store and execution port for connected actions.

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:904](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L904)

## Methods

### bindingFor()

> **bindingFor**(`binding`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

Defined in: [src/action/types.ts:971](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L971)

#### Parameters

##### binding

[`ActionBindingRef`](/api/index/interfaces/ActionBindingRef)

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\> \| `undefined`

***

### bindings()

> **bindings**(`definition?`): [`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

Defined in: [src/action/types.ts:970](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L970)

#### Parameters

##### definition?

[`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

#### Returns

[`ActionBindingSnapshot`](/api/index/interfaces/ActionBindingSnapshot)\<`string`\>[]

***

### channelGaps()

> **channelGaps**(): readonly [`ChannelGap`](/api/index/interfaces/ChannelGap)[]

Defined in: [src/action/types.ts:920](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L920)

Every kind somebody needed served and nothing could, counted.

#### Returns

readonly [`ChannelGap`](/api/index/interfaces/ChannelGap)[]

***

### connect()

#### Call Signature

> **connect**\<`F`, `Id`, `Mode`\>(`definition`, `options`): [`ActionConnection`](/api/index/interfaces/ActionConnection)\<`F`, `Id`, `true`, `Mode`\>

Defined in: [src/action/types.ts:937](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L937)

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

Defined in: [src/action/types.ts:953](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L953)

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

### declareContext()

> **declareContext**(`declaration`): [`DeclaredContextHandle`](/api/index/interfaces/DeclaredContextHandle)

Defined in: [src/action/types.ts:989](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L989)

Declare outcome context — "what the person set with a control, still
standing" — folded by the library at settlement time: the newest
INVOKED verified value per key, minus any a verified release named. One
live context per id.

#### Parameters

##### declaration

[`DeclaredContextDeclaration`](/api/index/interfaces/DeclaredContextDeclaration)

#### Returns

[`DeclaredContextHandle`](/api/index/interfaces/DeclaredContextHandle)

***

### declareSurface()

> **declareSurface**(`declaration`): [`SurfaceHandle`](/api/index/interfaces/SurfaceHandle)

Defined in: [src/action/types.ts:910](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L910)

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

Defined in: [src/action/types.ts:976](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L976)

Release a fully settled transition from runtime history.

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

`boolean`

***

### forPrincipal()

> **forPrincipal**\<`P`\>(`principal`): [`PrincipalActionPort`](/api/index/interfaces/PrincipalActionPort)\<`P`\>

Defined in: [src/action/types.ts:932](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L932)

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

Defined in: [src/action/types.ts:907](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L907)

What this runtime can say about its own kind governance — mounted or
 not, the fingerprint, every kind seen, and the ungoverned remainder.

#### Returns

[`KindGovernanceReport`](/api/index/interfaces/KindGovernanceReport)

***

### openRequests()

> **openRequests**(): readonly [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)[]

Defined in: [src/action/types.ts:930](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L930)

Every request still open, oldest first — what a surface renders.

#### Returns

readonly [`InputRequestSnapshot`](/api/index/interfaces/InputRequestSnapshot)[]

***

### requestInput()

> **requestInput**(`input`): [`InputRequestHandle`](/api/index/interfaces/InputRequestHandle)

Defined in: [src/action/types.ts:923](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L923)

Ask a person for one value of a governed kind, from an offered list —
 the HITL request lifecycle, offered-set law included.

#### Parameters

##### input

###### from

[`Principal`](/api/index/type-aliases/Principal)

###### of

`string`

###### offered

readonly (`string` \| [`RequestChoice`](/api/index/interfaces/RequestChoice))[]

###### question

`string`

#### Returns

[`InputRequestHandle`](/api/index/interfaces/InputRequestHandle)

***

### surfacesFor()

> **surfacesFor**(`query`): readonly [`SurfaceDeclaration`](/api/index/interfaces/SurfaceDeclaration)[]

Defined in: [src/action/types.ts:916](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L916)

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

Defined in: [src/action/types.ts:972](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L972)

#### Parameters

##### transition

[`ActionTransitionRef`](/api/index/interfaces/ActionTransitionRef)

#### Returns

[`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot) \| `undefined`

***

### transitions()

> **transitions**(`query?`): readonly [`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot)[]

Defined in: [src/action/types.ts:982](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L982)

Every retained transition matching the query, OLDEST INVOCATION FIRST —
the order transitions were minted, which is the order a person or agent
asked for them (not the order they settled).

#### Parameters

##### query?

[`ActionTransitionQuery`](/api/index/interfaces/ActionTransitionQuery)

#### Returns

readonly [`ActionTransitionSnapshot`](/api/index/interfaces/ActionTransitionSnapshot)[]
