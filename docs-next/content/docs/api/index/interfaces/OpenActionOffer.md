---
title: OpenActionOffer<Id, F>
---

# Interface: OpenActionOffer\<Id, F\>

Defined in: [src/action/types.ts:323](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L323)

An offer waiting for its caller (for example, a rendered HITL form) to supply input.

## Type Parameters

### Id

`Id` *extends* `string` = `string`

### F

`F` *extends* (...`args`) => `any` = (...`args`) => `any`

## Properties

### contractActivation

> `readonly` **contractActivation**: [`ActionContractActivation`](/api/index/type-aliases/ActionContractActivation)

Defined in: [src/action/types.ts:333](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L333)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:331](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L331)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"scalar"`\>

Defined in: [src/action/types.ts:329](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L329)

Immutable authored meaning and payload schema for an in-process consumer.

***

### inputMode

> `readonly` **inputMode**: `"open"`

Defined in: [src/action/types.ts:335](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L335)

***

### inputRequired

> `readonly` **inputRequired**: `true`

Defined in: [src/action/types.ts:337](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L337)

Open offers always require exactly one deliberate caller payload slot.

***

### inputValidation

> `readonly` **inputValidation**: [`ActionInputValidationDisposition`](/api/index/type-aliases/ActionInputValidationDisposition)

Defined in: [src/action/types.ts:334](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L334)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:330](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L330)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`\> & `object`

Defined in: [src/action/types.ts:327](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L327)

#### Type Declaration

##### input?

> `readonly` `optional` **input?**: `undefined`
