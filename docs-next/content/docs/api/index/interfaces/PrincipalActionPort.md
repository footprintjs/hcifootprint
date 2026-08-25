---
title: PrincipalActionPort<P>
---

# Interface: PrincipalActionPort\<P\>

Defined in: [src/action/types.ts:754](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L754)

Principal-scoped offer and invocation authority. The principal belongs to
the reader, never to a live binding: one control may be offered to a person
while being withheld from an agent.

## Type Parameters

### P

`P` *extends* [`Principal`](/api/index/type-aliases/Principal) = [`Principal`](/api/index/type-aliases/Principal)

## Properties

### principal

> `readonly` **principal**: `P`

Defined in: [src/action/types.ts:755](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L755)

## Methods

### invoke()

#### Call Signature

> **invoke**\<`F`, `Id`\>(`offer`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`, `"mutation"`\>

Defined in: [src/action/types.ts:757](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L757)

Invoke an exact retained bound or inputless offer minted for this principal.

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

##### Parameters

###### offer

[`BoundActionOffer`](/api/index/interfaces/BoundActionOffer)\<`Id`, `F`, `P`\> \| [`InputlessActionOffer`](/api/index/interfaces/InputlessActionOffer)\<`Id`, `F`, `P`\>

##### Returns

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`, `"mutation"`\>

#### Call Signature

> **invoke**\<`F`, `Id`\>(`offer`, `input`): [`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`, `"mutation"`\>

Defined in: [src/action/types.ts:761](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L761)

Invoke an exact retained open offer with its one required caller payload.

##### Type Parameters

###### F

`F` *extends* (...`args`) => `any`

###### Id

`Id` *extends* `string` = `string`

##### Parameters

###### offer

[`OpenActionOffer`](/api/index/interfaces/OpenActionOffer)\<`Id`, `F`, `P`\>

###### input

`Parameters`\<`F`\>\[`0`\]

##### Returns

[`ActionInvocation`](/api/index/interfaces/ActionInvocation)\<`Awaited`\<`ReturnType`\<`F`\>\>, `Id`, `"mutation"`\>

***

### offers()

#### Call Signature

> **offers**\<`F`, `Id`, `Mode`\>(`definition`): readonly [`ActionOfferFor`](/api/index/type-aliases/ActionOfferFor)\<[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>, `Id`, `Mode`, `P`\>[]

Defined in: [src/action/types.ts:766](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L766)

Enumerate exact retained offers this principal is permitted to invoke.

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

readonly [`ActionOfferFor`](/api/index/type-aliases/ActionOfferFor)\<[`DefinedAction`](/api/index/type-aliases/DefinedAction)\<`F`, `Id`, `Mode`\>, `Id`, `Mode`, `P`\>[]

#### Call Signature

> **offers**\<`Ref`\>(`definition`): readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`Ref`\[`"definitionId"`\], (...`args`) => `any`, `P`\>[]

Defined in: [src/action/types.ts:773](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L773)

##### Type Parameters

###### Ref

`Ref` *extends* [`ActionDefinitionRef`](/api/index/interfaces/ActionDefinitionRef)\<`string`\>

##### Parameters

###### definition

`Ref`

##### Returns

readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`Ref`\[`"definitionId"`\], (...`args`) => `any`, `P`\>[]

#### Call Signature

> **offers**(): readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`string`, (...`args`) => `any`, `P`\>[]

Defined in: [src/action/types.ts:776](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L776)

##### Returns

readonly [`ActionOffer`](/api/index/type-aliases/ActionOffer)\<`string`, (...`args`) => `any`, `P`\>[]
