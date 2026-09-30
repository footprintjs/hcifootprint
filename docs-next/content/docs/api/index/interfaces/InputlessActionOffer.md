---
title: InputlessActionOffer<Id, F, P>
---

# Interface: InputlessActionOffer\<Id, F, P\>

Defined in: [src/action/types.ts:625](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L625)

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

Defined in: [src/action/types.ts:636](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L636)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:634](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L634)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"inputless"`\>

Defined in: [src/action/types.ts:632](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L632)

Immutable authored meaning and payload schema for an in-process consumer.

***

### inputMode

> `readonly` **inputMode**: `"none"`

Defined in: [src/action/types.ts:638](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L638)

***

### inputValidation

> `readonly` **inputValidation**: `"disclosure"` \| `"not-declared"` \| `"active"`

Defined in: [src/action/types.ts:637](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L637)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:633](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L633)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, `P`\> & `object`

Defined in: [src/action/types.ts:630](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L630)

#### Type Declaration

##### input?

> `readonly` `optional` **input?**: `undefined`
