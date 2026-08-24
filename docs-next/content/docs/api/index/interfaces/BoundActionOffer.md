---
title: BoundActionOffer<Id, F>
---

# Interface: BoundActionOffer\<Id, F\>

Defined in: [src/action/types.ts:302](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L302)

An offer whose invocation payload was captured from its live binding.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:314](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L314)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:312](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L312)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"scalar"`\>

Defined in: [src/action/types.ts:310](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L310)

Immutable authored meaning and payload schema for an in-process consumer.

***

### input

> `readonly` **input**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>

Defined in: [src/action/types.ts:317](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L317)

***

### inputMode

> `readonly` **inputMode**: `"bound"`

Defined in: [src/action/types.ts:316](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L316)

***

### inputValidation

> `readonly` **inputValidation**: [`ActionInputValidationDisposition`](/api/index/type-aliases/ActionInputValidationDisposition)

Defined in: [src/action/types.ts:315](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L315)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:311](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L311)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`\> & `object`

Defined in: [src/action/types.ts:306](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L306)

#### Type Declaration

##### input

> `readonly` **input**: [`ActionInputRef`](/api/index/interfaces/ActionInputRef)\<`"bound"`\>
