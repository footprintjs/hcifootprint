---
title: ActionBindingUpdate<Input>
---

# Interface: ActionBindingUpdate\<Input\>

Defined in: src/action/types.ts:98

Mutable committed facts for one stable connection identity.

## Extended by

- [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)

## Type Parameters

### Input

`Input`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: src/action/types.ts:101

#### Returns

`string` \| `undefined`

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: src/action/types.ts:102

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: src/action/types.ts:100

#### Returns

`boolean` \| `undefined`

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: src/action/types.ts:104

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: src/action/types.ts:99

#### Returns

`Input`

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: src/action/types.ts:103
