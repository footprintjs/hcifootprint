---
title: ActionBindingUpdate<Input>
---

# Interface: ActionBindingUpdate\<Input\>

Defined in: [src/action/types.ts:335](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L335)

Mutable committed facts for one stable connection identity.

## Extended by

- [`ConnectActionOptions`](/api/index/interfaces/ConnectActionOptions)

## Type Parameters

### Input

`Input`

## Properties

### busy?

> `readonly` `optional` **busy?**: () => `string` \| `undefined`

Defined in: [src/action/types.ts:344](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L344)

#### Returns

`string` \| `undefined`

***

### coverage?

> `readonly` `optional` **coverage?**: [`BindingCoverage`](/api/index/type-aliases/BindingCoverage)

Defined in: [src/action/types.ts:345](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L345)

***

### enabled?

> `readonly` `optional` **enabled?**: () => `boolean` \| `undefined`

Defined in: [src/action/types.ts:343](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L343)

#### Returns

`boolean` \| `undefined`

***

### humanReporting?

> `readonly` `optional` **humanReporting?**: [`HumanReporting`](/api/index/type-aliases/HumanReporting)

Defined in: [src/action/types.ts:347](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L347)

***

### input?

> `readonly` `optional` **input?**: () => `Input`

Defined in: [src/action/types.ts:342](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L342)

Live value reader. Direct connection invocation reads it at invocation;
a principal port's `offers()` reads and retains it while minting an exact
bound offer.
The definition-side payload shape is `inputSchema`.

#### Returns

`Input`

***

### locators?

> `readonly` `optional` **locators?**: readonly [`Binding`](/api/index/type-aliases/Binding)[]

Defined in: [src/action/types.ts:346](https://github.com/footprintjs/hcifootprint/blob/main/src/action/types.ts#L346)
