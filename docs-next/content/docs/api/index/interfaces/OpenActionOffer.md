---
title: OpenActionOffer<Id, F, P>
---

# Interface: OpenActionOffer\<Id, F, P\>

Defined in: [src/action/types.ts:604](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L604)

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

Defined in: [src/action/types.ts:615](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L615)

Whether enforceable clauses were active or carried only for disclosure.

***

### coverage

> `readonly` **coverage**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:613](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L613)

***

### definition

> `readonly` **definition**: [`ActionDefinitionRecord`](/api/index/interfaces/ActionDefinitionRecord)\<`Id`, `"scalar"`\>

Defined in: [src/action/types.ts:611](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L611)

Immutable authored meaning and payload schema for an in-process consumer.

***

### inputMode

> `readonly` **inputMode**: `"open"`

Defined in: [src/action/types.ts:617](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L617)

***

### inputRequired

> `readonly` **inputRequired**: `true`

Defined in: [src/action/types.ts:619](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L619)

Open offers always require exactly one deliberate caller payload slot.

***

### inputValidation

> `readonly` **inputValidation**: `"disclosure"` \| `"not-declared"` \| `"active"`

Defined in: [src/action/types.ts:616](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L616)

***

### locators

> `readonly` **locators**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:612](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L612)

***

### ref

> `readonly` **ref**: [`ActionOfferRef`](/api/index/interfaces/ActionOfferRef)\<`Id`, `P`\> & `object`

Defined in: [src/action/types.ts:609](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L609)

#### Type Declaration

##### input?

> `readonly` `optional` **input?**: `undefined`
