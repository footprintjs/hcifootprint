---
title: BoundActionOffer<Id, F, P>
---

# Interface: BoundActionOffer\<Id, F, P\>

Defined in: [src/action/types.ts:521](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L521)

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

Defined in: [src/action/types.ts:534](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L534)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:532](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L532)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"scalar"`\>

Defined in: [src/action/types.ts:530](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L530)

Immutable authored meaning and payload schema for an in-process consumer.

***

### input

> `readonly` **input**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>

Defined in: [src/action/types.ts:537](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L537)

***

### inputMode

> `readonly` **inputMode**: `"bound"`

Defined in: [src/action/types.ts:536](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L536)

***

### inputValidation

> `readonly` **inputValidation**: `"disclosure"` \| `"not-declared"` \| `"active"`

Defined in: [src/action/types.ts:535](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L535)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:531](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L531)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, `P`\> & `object`

Defined in: [src/action/types.ts:526](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L526)

#### Type Declaration

##### input

> `readonly` **input**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>
