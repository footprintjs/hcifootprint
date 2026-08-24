---
title: InputlessActionOffer<Id, F>
---

# Interface: InputlessActionOffer\<Id, F\>

Defined in: [src/action/types.ts:343](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L343)

An offer for a callable that takes no direct payload.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:353](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L353)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:351](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L351)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"inputless"`\>

Defined in: [src/action/types.ts:349](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L349)

Immutable authored meaning and payload schema for an in-process consumer.

***

### inputMode

> `readonly` **inputMode**: `"none"`

Defined in: [src/action/types.ts:355](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L355)

***

### inputValidation

> `readonly` **inputValidation**: [`ActionInputValidationDisposition`](/api/index/type-aliases/ActionInputValidationDisposition)

Defined in: [src/action/types.ts:354](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L354)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:350](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L350)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`\> & `object`

Defined in: [src/action/types.ts:347](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L347)

#### Type Declaration

##### input?

> `readonly` `optional` **input?**: `undefined`
