---
title: BoundActionOffer<Id, F, P>
---

# Interface: BoundActionOffer\<Id, F, P\>

Defined in: [src/action/types.ts:582](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L582)

An offer whose invocation payload was captured from its live binding.

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

Defined in: [src/action/types.ts:595](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L595)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:593](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L593)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"scalar"`\>

Defined in: [src/action/types.ts:591](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L591)

Immutable authored meaning and payload schema for an in-process consumer.

***

### input

> `readonly` **input**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>

Defined in: [src/action/types.ts:598](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L598)

***

### inputMode

> `readonly` **inputMode**: `"bound"`

Defined in: [src/action/types.ts:597](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L597)

***

### inputValidation

> `readonly` **inputValidation**: `"disclosure"` \| `"not-declared"` \| `"active"`

Defined in: [src/action/types.ts:596](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L596)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:592](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L592)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, `P`\> & `object`

Defined in: [src/action/types.ts:587](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L587)

#### Type Declaration

##### input

> `readonly` **input**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>
