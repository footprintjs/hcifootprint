---
title: InputlessActionOffer<Id, F, P>
---

# Interface: InputlessActionOffer\<Id, F, P\>

Defined in: [src/action/types.ts:564](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L564)

An offer for a callable that takes no direct payload.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

### P

`P` *extends* [`Principal`](/api/index/type-aliases/Principal) = [`Principal`](/api/index/type-aliases/Principal)

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:575](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L575)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:573](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L573)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"inputless"`\>

Defined in: [src/action/types.ts:571](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L571)

Immutable authored meaning and payload schema for an in-process consumer.

***

### inputMode

> `readonly` **inputMode**: `"none"`

Defined in: [src/action/types.ts:577](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L577)

***

### inputValidation

> `readonly` **inputValidation**: `"disclosure"` \| `"not-declared"` \| `"active"`

Defined in: [src/action/types.ts:576](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L576)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:572](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L572)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, `P`\> & `object`

Defined in: [src/action/types.ts:569](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L569)

#### Type Declaration

##### input?

> `readonly` `optional` **input?**: `undefined`
