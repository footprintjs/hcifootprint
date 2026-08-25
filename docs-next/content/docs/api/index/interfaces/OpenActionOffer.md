---
title: OpenActionOffer<Id, F, P>
---

# Interface: OpenActionOffer\<Id, F, P\>

Defined in: [src/action/types.ts:543](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L543)

An offer waiting for its caller (for example, a rendered HITL form) to supply input.

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

Defined in: [src/action/types.ts:554](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L554)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:552](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L552)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"scalar"`\>

Defined in: [src/action/types.ts:550](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L550)

Immutable authored meaning and payload schema for an in-process consumer.

***

### inputMode

> `readonly` **inputMode**: `"open"`

Defined in: [src/action/types.ts:556](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L556)

***

### inputRequired

> `readonly` **inputRequired**: `true`

Defined in: [src/action/types.ts:558](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L558)

Open offers always require exactly one deliberate caller payload slot.

***

### inputValidation

> `readonly` **inputValidation**: `"disclosure"` \| `"not-declared"` \| `"active"`

Defined in: [src/action/types.ts:555](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L555)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:551](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L551)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, `P`\> & `object`

Defined in: [src/action/types.ts:548](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L548)

#### Type Declaration

##### input?

> `readonly` `optional` **input?**: `undefined`
